"""Governance-focused audit trail read endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.purpose_access import ACCESS_PURPOSE_HEADER, DEBUG_TRACE_ALLOWED_PURPOSES, enforce_sensitive_access_purpose
from ...core.session_auth import AuthenticatedUser, require_roles
from ...models.skills import AuditEventListResponse, AuditEventRecord, AuditEventSummaryListResponse, AuditScheduleRecord, UpsertAuditScheduleRequest
from ...services.skills_service import get_audit_event_by_id, get_audit_schedule, is_audit_event_debug_trace, list_audit_events, upsert_audit_schedule

router = APIRouter(prefix="/audit-trail", tags=["audit-trail"])

_ELEVATED_DEBUG_TRACE_ROLES = {"app_admin", "qm_lead", "architect", "riskmanager"}


def _can_access_debug_trace(user: AuthenticatedUser) -> bool:
    return any(role in _ELEVATED_DEBUG_TRACE_ROLES for role in user.roles)


@router.get("/events", response_model=AuditEventSummaryListResponse)
async def get_audit_trail_events(
    window_hours: int = Query(default=24 * 30, ge=1, le=24 * 365),
    limit: int = Query(default=200, ge=1, le=1000),
    event_type: str | None = Query(default=None),
    actor_id: str | None = Query(default=None),
    subject_type: str | None = Query(default=None),
    subject_id: str | None = Query(default=None),
    include_debug_trace: bool = Query(default=False),
    access_purpose: str | None = Header(default=None, alias=ACCESS_PURPOSE_HEADER),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("app_admin", "qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditEventSummaryListResponse:
    """Return payload-safe audit-event summaries for governance and compliance review.

    Full ``payload`` blobs are omitted from list items.  Use
    ``GET /audit-trail/events/{event_id}`` to access the full payload for a
    specific event.
    """
    if include_debug_trace and not _can_access_debug_trace(user):
        raise HTTPException(
            status_code=403,
            detail={
                "reason": "debug_trace_access_denied",
                "message": "Access to debug-trace audit summaries requires elevated privileges.",
                "action_points": [
                    "Retry without include_debug_trace to access standard audit summaries.",
                    "Request elevated reviewer access for incident-response debug traces.",
                ],
            },
        )
    if include_debug_trace:
        enforce_sensitive_access_purpose(
            access_purpose=access_purpose,
            allowed_purposes=DEBUG_TRACE_ALLOWED_PURPOSES,
            resource_label="audit_trail.events.debug_trace",
        )
    return list_audit_events(
        db,
        window_hours=window_hours,
        limit=limit,
        event_type=event_type,
        actor_id=actor_id,
        subject_type=subject_type,
        subject_id=subject_id,
        include_debug_trace=include_debug_trace,
    )


@router.get("/events/{event_id}", response_model=AuditEventRecord)
async def get_audit_trail_event_detail(
    event_id: str = Path(min_length=1, max_length=64),
    access_purpose: str | None = Header(default=None, alias=ACCESS_PURPOSE_HEADER),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("app_admin", "qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditEventRecord:
    """Return full details for one audit event by id."""
    result = get_audit_event_by_id(db, event_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Audit event not found: {event_id}")
    if is_audit_event_debug_trace(db, event_id) and not _can_access_debug_trace(user):
        raise HTTPException(
            status_code=403,
            detail={
                "reason": "debug_trace_access_denied",
                "message": "Access to debug-trace audit payloads requires elevated privileges.",
                "action_points": [
                    "Use audit event summaries for standard compliance review.",
                    "Request elevated reviewer access if debug trace evidence is required.",
                    "Escalate to app administrator for controlled incident triage.",
                ],
            },
        )
    if is_audit_event_debug_trace(db, event_id):
        enforce_sensitive_access_purpose(
            access_purpose=access_purpose,
            allowed_purposes=DEBUG_TRACE_ALLOWED_PURPOSES,
            resource_label="audit_trail.event_detail.debug_trace",
        )
    return result


@router.get("/schedule", response_model=AuditScheduleRecord)
async def get_audit_trail_schedule(
    tenant_id: str = Query(default="default_tenant"),
    org_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("app_admin", "qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditScheduleRecord:
    """Return persistent internal/external audit planning schedule."""
    return get_audit_schedule(db, tenant_id=tenant_id, org_id=org_id, project_id=project_id)


@router.put("/schedule", response_model=AuditScheduleRecord)
async def put_audit_trail_schedule(
    request: UpsertAuditScheduleRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("app_admin", "qm_lead", "auditor", "riskmanager", "architect")),
) -> AuditScheduleRecord:
    """Create/update persistent internal/external audit planning schedule."""
    return upsert_audit_schedule(db, request=request, updated_by=user.email)
