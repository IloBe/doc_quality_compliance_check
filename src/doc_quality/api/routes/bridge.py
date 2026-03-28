"""Bridge run endpoints for production-grade compliance execution."""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.session_auth import require_roles
from ...models.compliance import ProductDomainInfo
from ...models.orm import AuditEventORM, FindingORM
from ...services.compliance_checker import (
    check_eu_ai_act_compliance,
    get_eu_ai_act_requirements_catalog,
    get_eu_ai_act_requirements_signature,
    get_eu_ai_act_requirements_version,
)
from ...services.skills_service import get_document

router = APIRouter(prefix="/bridge", tags=["bridge"])


class BridgeRunRequest(BaseModel):
    """Bridge compliance run request payload."""

    document_id: str = Field(min_length=3)
    domain_info: ProductDomainInfo


class RequirementResult(BaseModel):
    """Single requirement result returned by bridge run."""

    requirement_id: str
    title: str
    mandatory: bool
    passed: bool
    gap_description: str | None = None


class RegulatoryUpdateStatus(BaseModel):
    """Regulatory drift status vs last approved run."""

    current_requirements_version: str
    current_requirements_signature: str
    last_approved_requirements_signature: str | None = None
    last_approved_run_at: datetime | None = None
    has_changed_since_last_approved_run: bool = False
    requires_document_update: bool = False
    message: str


class BridgeRunResponse(BaseModel):
    """Bridge run execution result payload."""

    run_id: str
    document_id: str
    framework: str
    compliance_score: float
    summary: str
    requirements: list[RequirementResult]
    mandatory_gaps: list[str]
    optional_gaps: list[str]
    approved: bool
    requirements_version: str
    requirements_signature: str
    requirements_catalog: list[dict]
    regulatory_update: RegulatoryUpdateStatus


class BridgeRegulatoryAlertResponse(BaseModel):
    """Regulatory alert response for popup notifications."""

    document_id: str
    regulatory_update: RegulatoryUpdateStatus


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _latest_approved_bridge_event(db: Session, document_id: str) -> AuditEventORM | None:
    events = (
        db.query(AuditEventORM)
        .filter(
            AuditEventORM.subject_type == "document",
            AuditEventORM.subject_id == document_id,
            AuditEventORM.event_type == "bridge.run.approved",
        )
        .order_by(AuditEventORM.event_time.desc())
        .all()
    )
    return events[0] if events else None


def _build_regulatory_update_status(db: Session, document_id: str) -> RegulatoryUpdateStatus:
    current_signature = get_eu_ai_act_requirements_signature()
    current_version = get_eu_ai_act_requirements_version()
    approved_event = _latest_approved_bridge_event(db, document_id)

    previous_signature: str | None = None
    previous_time: datetime | None = None
    if approved_event is not None:
        payload = approved_event.payload or {}
        previous_signature = payload.get("requirements_signature")
        previous_time = _coerce_utc(approved_event.event_time)

    has_changed = bool(previous_signature and previous_signature != current_signature)
    requires_update = has_changed

    if requires_update:
        message = (
            "EU AI Act requirement set changed after the last approved bridge run. "
            "Re-validation is required and document updates may be necessary."
        )
    else:
        message = "No EU AI Act requirement drift detected against the last approved bridge run."

    return RegulatoryUpdateStatus(
        current_requirements_version=current_version,
        current_requirements_signature=current_signature,
        last_approved_requirements_signature=previous_signature,
        last_approved_run_at=previous_time,
        has_changed_since_last_approved_run=has_changed,
        requires_document_update=requires_update,
        message=message,
    )


@router.post("/run/eu-ai-act", response_model=BridgeRunResponse)
async def run_bridge_eu_ai_act(
    request: BridgeRunRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeRunResponse:
    """Execute an EU AI Act bridge compliance run for a document and persist audit/finding evidence."""
    document = get_document(db, request.document_id)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {request.document_id}")

    run_id = str(uuid.uuid4())
    compliance_result = check_eu_ai_act_compliance(
        document.extracted_text,
        request.domain_info,
        request.document_id,
    )

    requirements_signature = get_eu_ai_act_requirements_signature()
    requirements_version = get_eu_ai_act_requirements_version()

    requirements_payload: list[RequirementResult] = []
    for req in compliance_result.requirements:
        passed = bool(req.met)
        requirements_payload.append(
            RequirementResult(
                requirement_id=req.requirement_id,
                title=req.title,
                mandatory=req.mandatory,
                passed=passed,
                gap_description=req.gap_description,
            )
        )

        severity = "high" if req.mandatory and not passed else ("medium" if not passed else "low")
        finding = FindingORM(
            finding_id=str(uuid.uuid4()),
            document_id=request.document_id,
            finding_type="bridge_compliance_requirement",
            title=f"{req.requirement_id} {req.title}",
            description=req.gap_description or "Requirement check passed",
            severity=severity,
            evidence={
                "framework": "EU AI Act",
                "requirement_id": req.requirement_id,
                "mandatory": req.mandatory,
                "passed": passed,
                "status": "passed" if passed else "failed",
                "run_id": run_id,
                "requirements_signature": requirements_signature,
                "requirements_version": requirements_version,
            },
        )
        db.add(finding)

    approved = len(compliance_result.mandatory_gaps) == 0

    db.add(
        AuditEventORM(
            event_id=str(uuid.uuid4()),
            tenant_id="default",
            org_id=None,
            project_id=None,
            event_time=_now_utc(),
            event_type="bridge.run.completed",
            actor_type="system",
            actor_id="bridge",
            subject_type="document",
            subject_id=request.document_id,
            trace_id=None,
            correlation_id=run_id,
            payload={
                "run_id": run_id,
                "framework": "eu_ai_act",
                "compliance_score": compliance_result.compliance_score,
                "approved": approved,
                "requirements_signature": requirements_signature,
                "requirements_version": requirements_version,
            },
        )
    )

    if approved:
        db.add(
            AuditEventORM(
                event_id=str(uuid.uuid4()),
                tenant_id="default",
                org_id=None,
                project_id=None,
                event_time=_now_utc(),
                event_type="bridge.run.approved",
                actor_type="system",
                actor_id="bridge",
                subject_type="document",
                subject_id=request.document_id,
                trace_id=None,
                correlation_id=run_id,
                payload={
                    "run_id": run_id,
                    "framework": "eu_ai_act",
                    "requirements_signature": requirements_signature,
                    "requirements_version": requirements_version,
                    "compliance_score": compliance_result.compliance_score,
                },
            )
        )

    db.commit()

    regulatory_update = _build_regulatory_update_status(db, request.document_id)

    return BridgeRunResponse(
        run_id=run_id,
        document_id=request.document_id,
        framework="eu_ai_act",
        compliance_score=compliance_result.compliance_score,
        summary=compliance_result.summary,
        requirements=requirements_payload,
        mandatory_gaps=compliance_result.mandatory_gaps,
        optional_gaps=compliance_result.optional_gaps,
        approved=approved,
        requirements_version=requirements_version,
        requirements_signature=requirements_signature,
        requirements_catalog=get_eu_ai_act_requirements_catalog(),
        regulatory_update=regulatory_update,
    )


@router.get("/alerts/eu-ai-act/{document_id}", response_model=BridgeRegulatoryAlertResponse)
async def get_bridge_eu_ai_act_alert(
    document_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeRegulatoryAlertResponse:
    """Return EU AI Act requirement drift alert for a specific document."""
    document = get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")

    return BridgeRegulatoryAlertResponse(
        document_id=document_id,
        regulatory_update=_build_regulatory_update_status(db, document_id),
    )
