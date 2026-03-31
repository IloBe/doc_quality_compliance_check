"""Bridge run endpoints for production-grade compliance execution."""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.session_auth import AuthenticatedUser, require_roles
from ...models.compliance import ProductDomainInfo
from ...models.orm import AuditEventORM, BridgeHumanReviewORM, FindingORM
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
    automatic_recommendation: str
    human_review_required: bool
    human_review_status: str
    requirements_version: str
    requirements_signature: str
    requirements_catalog: list[dict]
    regulatory_update: RegulatoryUpdateStatus


class BridgeRegulatoryAlertResponse(BaseModel):
    """Regulatory alert response for popup notifications."""

    document_id: str
    regulatory_update: RegulatoryUpdateStatus


class BridgeHumanReviewRequest(BaseModel):
    """Human decision request for a specific bridge run."""

    document_id: str = Field(min_length=3)
    decision: str = Field(pattern="^(approved|rejected)$")
    reason: str = Field(min_length=5, max_length=4000)
    next_task_type: str | None = Field(default=None, pattern="^(rerun_bridge|manual_follow_up)$")
    next_task_assignee: str | None = Field(default=None, max_length=255)
    next_task_instructions: str | None = Field(default=None, max_length=4000)
    assignee_notified: bool = True


class BridgeHumanReviewResponse(BaseModel):
    """Stored human decision record for bridge run reproducibility."""

    review_id: str
    run_id: str
    document_id: str
    decision: str
    reason: str
    reviewer_email: str
    reviewer_roles: list[str]
    reviewed_at: datetime
    next_task_type: str | None = None
    next_task_assignee: str | None = None
    next_task_instructions: str | None = None
    assignee_notified: bool


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


def _find_bridge_run_completed_event(db: Session, run_id: str, document_id: str) -> AuditEventORM | None:
    return (
        db.query(AuditEventORM)
        .filter(
            AuditEventORM.event_type == "bridge.run.completed",
            AuditEventORM.subject_type == "document",
            AuditEventORM.subject_id == document_id,
            AuditEventORM.correlation_id == run_id,
        )
        .order_by(AuditEventORM.event_time.desc())
        .first()
    )


def _review_to_response(review: BridgeHumanReviewORM) -> BridgeHumanReviewResponse:
    return BridgeHumanReviewResponse(
        review_id=review.review_id,
        run_id=review.run_id,
        document_id=review.document_id,
        decision=review.decision,
        reason=review.reason,
        reviewer_email=review.reviewer_email,
        reviewer_roles=list(review.reviewer_roles or []),
        reviewed_at=_coerce_utc(review.reviewed_at) or _now_utc(),
        next_task_type=review.next_task_type,
        next_task_assignee=review.next_task_assignee,
        next_task_instructions=review.next_task_instructions,
        assignee_notified=bool(review.assignee_notified),
    )


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

    db.add(
        AuditEventORM(
            event_id=str(uuid.uuid4()),
            tenant_id="default",
            org_id=None,
            project_id=None,
            event_time=_now_utc(),
            event_type="bridge.run.recommendation",
            actor_type="system",
            actor_id="bridge",
            subject_type="document",
            subject_id=request.document_id,
            trace_id=None,
            correlation_id=run_id,
            payload={
                "run_id": run_id,
                "framework": "eu_ai_act",
                "automatic_recommendation": "approved" if approved else "rejected",
                "requires_human_review": True,
                "requirements_signature": requirements_signature,
                "requirements_version": requirements_version,
                "compliance_score": compliance_result.compliance_score,
                "compliance_checks": [
                    {"topic": req.title, "result": "passed" if req.met else "failed"}
                    for req in compliance_result.requirements
                ],
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
        automatic_recommendation="approved" if approved else "rejected",
        human_review_required=True,
        human_review_status="pending",
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


@router.get("/runs/{run_id}/human-review", response_model=BridgeHumanReviewResponse)
async def get_bridge_human_review(
    run_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeHumanReviewResponse:
    """Return persisted human bridge review decision for a run."""
    review = (
        db.query(BridgeHumanReviewORM)
        .filter(BridgeHumanReviewORM.run_id == run_id)
        .order_by(BridgeHumanReviewORM.reviewed_at.desc())
        .first()
    )
    if review is None:
        raise HTTPException(status_code=404, detail=f"No human review found for run: {run_id}")
    return _review_to_response(review)


@router.post("/runs/{run_id}/human-review", response_model=BridgeHumanReviewResponse)
async def submit_bridge_human_review(
    request: BridgeHumanReviewRequest,
    run_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeHumanReviewResponse:
    """Persist mandatory human approval/rejection for a bridge run with reason and next task proposal."""
    run_event = _find_bridge_run_completed_event(db, run_id=run_id, document_id=request.document_id)
    if run_event is None:
        raise HTTPException(status_code=404, detail=f"Bridge run not found for run_id={run_id}, document_id={request.document_id}")

    existing = db.query(BridgeHumanReviewORM).filter(BridgeHumanReviewORM.run_id == run_id).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Human review already submitted for run: {run_id}")

    decision = request.decision.strip().lower()
    reason = request.reason.strip()
    next_task_type = request.next_task_type.strip().lower() if request.next_task_type else None
    next_task_assignee = request.next_task_assignee.strip() if request.next_task_assignee else None
    next_task_instructions = request.next_task_instructions.strip() if request.next_task_instructions else None

    if decision == "rejected" and not next_task_type:
        raise HTTPException(status_code=422, detail="next_task_type is required when decision is rejected")
    if decision == "approved" and next_task_type:
        raise HTTPException(status_code=422, detail="next_task_type must be omitted when decision is approved")
    if next_task_type == "manual_follow_up" and not next_task_assignee:
        raise HTTPException(status_code=422, detail="next_task_assignee is required for manual_follow_up tasks")

    reviewed_at = _now_utc()
    review = BridgeHumanReviewORM(
        review_id=str(uuid.uuid4()),
        run_id=run_id,
        document_id=request.document_id,
        decision=decision,
        reason=reason,
        reviewer_email=user.email,
        reviewer_roles=list(user.roles),
        reviewed_at=reviewed_at,
        next_task_type=next_task_type,
        next_task_assignee=next_task_assignee,
        next_task_instructions=next_task_instructions,
        assignee_notified=bool(request.assignee_notified if decision == "rejected" else False),
    )
    db.add(review)

    db.add(
        AuditEventORM(
            event_id=str(uuid.uuid4()),
            tenant_id="default",
            org_id=user.org,
            project_id=None,
            event_time=reviewed_at,
            event_type="bridge.run.approved" if decision == "approved" else "bridge.run.rejected",
            actor_type="user",
            actor_id=user.email,
            subject_type="document",
            subject_id=request.document_id,
            trace_id=None,
            correlation_id=run_id,
            payload={
                "run_id": run_id,
                "human_review": {
                    "decision": decision,
                    "reason": reason,
                    "reviewer_roles": list(user.roles),
                    "reviewed_at": reviewed_at.isoformat(),
                },
                "next_task": {
                    "type": next_task_type,
                    "assignee": next_task_assignee,
                    "instructions": next_task_instructions,
                    "assignee_notified": bool(request.assignee_notified if decision == "rejected" else False),
                },
            },
        )
    )

    if decision == "rejected" and next_task_type:
        db.add(
            AuditEventORM(
                event_id=str(uuid.uuid4()),
                tenant_id="default",
                org_id=user.org,
                project_id=None,
                event_time=reviewed_at,
                event_type="bridge.run.next_task.proposed",
                actor_type="user",
                actor_id=user.email,
                subject_type="document",
                subject_id=request.document_id,
                trace_id=None,
                correlation_id=run_id,
                payload={
                    "run_id": run_id,
                    "task_type": next_task_type,
                    "assignee": next_task_assignee,
                    "instructions": next_task_instructions,
                    "assignee_notified": bool(request.assignee_notified),
                },
            )
        )

    db.commit()
    db.refresh(review)
    return _review_to_response(review)
