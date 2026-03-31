"""Governance-focused audit trail read endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.session_auth import AuthenticatedUser, require_roles
from ...models.skills import AuditEventListResponse, AuditEventRecord, AuditScheduleRecord, UpsertAuditScheduleRequest
from ...services.skills_service import get_audit_event_by_id, get_audit_schedule, list_audit_events, upsert_audit_schedule

router = APIRouter(prefix="/audit-trail", tags=["audit-trail"])


@router.get("/events", response_model=AuditEventListResponse)
async def get_audit_trail_events(
    window_hours: int = Query(default=24 * 30, ge=1, le=24 * 365),
    limit: int = Query(default=200, ge=1, le=1000),
    event_type: str | None = Query(default=None),
    actor_id: str | None = Query(default=None),
    subject_type: str | None = Query(default=None),
    subject_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditEventListResponse:
    """Return audit-event timeline entries for governance and compliance review."""
    return list_audit_events(
        db,
        window_hours=window_hours,
        limit=limit,
        event_type=event_type,
        actor_id=actor_id,
        subject_type=subject_type,
        subject_id=subject_id,
    )


@router.get("/events/{event_id}", response_model=AuditEventRecord)
async def get_audit_trail_event_detail(
    event_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditEventRecord:
    """Return full details for one audit event by id."""
    result = get_audit_event_by_id(db, event_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Audit event not found: {event_id}")
    return result


@router.get("/schedule", response_model=AuditScheduleRecord)
async def get_audit_trail_schedule(
    tenant_id: str = Query(default="default_tenant"),
    org_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditScheduleRecord:
    """Return persistent internal/external audit planning schedule."""
    return get_audit_schedule(db, tenant_id=tenant_id, org_id=org_id, project_id=project_id)


@router.put("/schedule", response_model=AuditScheduleRecord)
async def put_audit_trail_schedule(
    request: UpsertAuditScheduleRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditScheduleRecord:
    """Create/update persistent internal/external audit planning schedule."""
    return upsert_audit_schedule(db, request=request, updated_by=user.email)
