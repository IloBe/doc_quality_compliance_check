"""API routes for compliance checking."""
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ...core.database import get_db
from ...core.session_auth import AuthenticatedUser, require_roles
from ...core.security import sanitize_text
from ...models.compliance import (
    ComplianceCheckResult,
    ComplianceFramework,
    ProductDomainInfo,
    StandardMappingRequestCreate,
    StandardMappingRequestListResponse,
    StandardMappingRequestRecord,
)
from ...models.orm import AuditEventORM
from ...services.compliance_checker import (
    check_eu_ai_act_compliance,
    get_applicable_regulations,
)

router = APIRouter(prefix="/compliance", tags=["compliance"])


class ComplianceCheckRequest(BaseModel):
    document_content: str
    document_id: str
    domain_info: ProductDomainInfo


@router.post("/check/eu-ai-act", response_model=ComplianceCheckResult)
async def check_eu_ai_act(
    request: ComplianceCheckRequest,
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> ComplianceCheckResult:
    """Check a document against EU AI Act requirements."""
    content = sanitize_text(request.document_content)
    return check_eu_ai_act_compliance(content, request.domain_info, request.document_id)


@router.post("/applicable-regulations", response_model=list[ComplianceFramework])
async def get_regulations(
    domain_info: ProductDomainInfo,
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> list[ComplianceFramework]:
    """Return list of applicable regulations for a given product domain."""
    return get_applicable_regulations(domain_info)


@router.post("/standard-mapping-requests", response_model=StandardMappingRequestRecord)
async def create_standard_mapping_request(
    request: StandardMappingRequestCreate,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> StandardMappingRequestRecord:
    """Create a new standard-mapping request and persist it in append-only audit storage."""
    now = datetime.now(timezone.utc)
    request_id = f"SMR-{uuid.uuid4().hex[:10].upper()}"

    clean_standard_name = sanitize_text(request.standard_name)
    clean_sop_reference = sanitize_text(request.sop_reference)
    clean_justification = sanitize_text(request.business_justification)
    clean_requester_email = sanitize_text(request.requester_email).lower()
    clean_tenant_id = sanitize_text(request.tenant_id)
    clean_project_id = sanitize_text(request.project_id) if request.project_id else None

    event = AuditEventORM(
        event_id=f"evt-{uuid.uuid4().hex[:24]}",
        tenant_id=clean_tenant_id,
        org_id=user.org,
        project_id=clean_project_id,
        event_time=now,
        event_type="compliance.standard_mapping.requested",
        actor_type="user",
        actor_id=user.email,
        subject_type="compliance_standard_mapping",
        subject_id=request_id,
        trace_id=None,
        correlation_id=user.session_id,
        payload={
            "status": "submitted",
            "standard_name": clean_standard_name,
            "sop_reference": clean_sop_reference,
            "business_justification": clean_justification,
            "requester_email": clean_requester_email,
            "tenant_id": clean_tenant_id,
            "project_id": clean_project_id,
        },
    )

    db.add(event)
    db.commit()

    return StandardMappingRequestRecord(
        request_id=request_id,
        status="submitted",
        submitted_at=now.isoformat(),
        standard_name=clean_standard_name,
        sop_reference=clean_sop_reference,
        business_justification=clean_justification,
        requester_email=clean_requester_email,
        tenant_id=clean_tenant_id,
        project_id=clean_project_id,
    )


@router.get("/standard-mapping-requests", response_model=StandardMappingRequestListResponse)
async def list_standard_mapping_requests(
    limit: int = 25,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> StandardMappingRequestListResponse:
    """List recent standard-mapping requests from persistent audit event storage."""
    bounded_limit = max(1, min(limit, 200))
    rows = (
        db.query(AuditEventORM)
        .filter(AuditEventORM.event_type == "compliance.standard_mapping.requested")
        .order_by(desc(AuditEventORM.event_time))
        .limit(bounded_limit)
        .all()
    )

    items: list[StandardMappingRequestRecord] = []
    for row in rows:
        payload = row.payload or {}
        items.append(
            StandardMappingRequestRecord(
                request_id=row.subject_id,
                status=str(payload.get("status") or "submitted"),
                submitted_at=row.event_time.isoformat(),
                standard_name=str(payload.get("standard_name") or ""),
                sop_reference=str(payload.get("sop_reference") or ""),
                business_justification=str(payload.get("business_justification") or ""),
                requester_email=str(payload.get("requester_email") or row.actor_id),
                tenant_id=str(payload.get("tenant_id") or row.tenant_id),
                project_id=(str(payload.get("project_id")) if payload.get("project_id") else None),
            )
        )

    return StandardMappingRequestListResponse(items=items)
