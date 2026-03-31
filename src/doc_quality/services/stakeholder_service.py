"""Services for persistent stakeholder profile governance."""
from __future__ import annotations

from typing import Any
import uuid

from sqlalchemy.orm import Session

from ..core.security import sanitize_text
from ..models.orm import StakeholderEmployeeAssignmentORM, StakeholderProfileORM
from ..models.stakeholder import (
    StakeholderEmployeeAssignmentListResponse,
    StakeholderEmployeeAssignmentRecord,
    StakeholderEmployeeAssignmentRequest,
    StakeholderProfileListResponse,
    StakeholderProfileRecord,
    StakeholderProfileUpsertRequest,
)

_DEFAULT_STAKEHOLDER_PROFILES: list[dict[str, Any]] = [
    {
        "profile_id": "qm_lead",
        "title": "QM Lead",
        "description": "Owns quality governance decisions and final approval readiness.",
        "permissions": ["doc.edit", "bridge.run", "export.create", "review.approve", "audit.write"],
    },
    {
        "profile_id": "auditor",
        "title": "Auditor",
        "description": "Performs independent audit checks and evidence validation.",
        "permissions": ["bridge.run", "export.create", "review.approve", "audit.write"],
    },
    {
        "profile_id": "riskmanager",
        "title": "Risk Manager",
        "description": "Maintains risk controls and release-governance acceptance criteria.",
        "permissions": ["doc.edit", "bridge.run", "export.create", "review.approve", "audit.write"],
    },
    {
        "profile_id": "architect",
        "title": "Architect",
        "description": "Owns architecture artifacts and technical compliance alignment.",
        "permissions": ["doc.edit", "export.create", "audit.write"],
    },
    {
        "profile_id": "service",
        "title": "Service Client",
        "description": "Machine profile for backend skills and observability data ingestion.",
        "permissions": ["doc.edit", "bridge.run", "export.create", "review.approve", "audit.write"],
    },
]


def _to_record(row: StakeholderProfileORM) -> StakeholderProfileRecord:
    return StakeholderProfileRecord(
        profile_id=row.profile_id,
        title=row.title,
        description=row.description,
        permissions=list(row.permissions or []),
        is_active=row.is_active,
        created_by=row.created_by,
        updated_by=row.updated_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_assignment_record(row: StakeholderEmployeeAssignmentORM) -> StakeholderEmployeeAssignmentRecord:
    return StakeholderEmployeeAssignmentRecord(
        assignment_id=row.assignment_id,
        profile_id=row.profile_id,
        employee_name=row.employee_name,
        created_by=row.created_by,
        created_at=row.created_at,
    )


def _normalize_permissions(values: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in values:
        value = sanitize_text(raw).strip().lower()
        if not value or value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return normalized


def ensure_default_stakeholder_profiles(db: Session) -> None:
    """Seed default profiles only when table is empty."""
    if db.query(StakeholderProfileORM).count() > 0:
        return

    for item in _DEFAULT_STAKEHOLDER_PROFILES:
        db.add(
            StakeholderProfileORM(
                profile_id=item["profile_id"],
                title=item["title"],
                description=item["description"],
                permissions=item["permissions"],
                is_active=True,
                created_by="system",
                updated_by="system",
            )
        )
    db.commit()


def list_stakeholder_profiles(db: Session, *, include_inactive: bool = True) -> StakeholderProfileListResponse:
    """Return stakeholder profiles with optional inactive filtering."""
    ensure_default_stakeholder_profiles(db)

    query = db.query(StakeholderProfileORM)
    if not include_inactive:
        query = query.filter(StakeholderProfileORM.is_active.is_(True))

    rows = query.order_by(StakeholderProfileORM.profile_id.asc()).all()
    return StakeholderProfileListResponse(items=[_to_record(row) for row in rows])


def upsert_stakeholder_profile(
    db: Session,
    *,
    profile_id: str,
    request: StakeholderProfileUpsertRequest,
    actor_email: str,
) -> StakeholderProfileRecord:
    """Create or update one stakeholder profile."""
    sanitized_profile_id = sanitize_text(profile_id).strip().lower()
    if not sanitized_profile_id:
        raise ValueError("profile_id cannot be empty")

    row = db.query(StakeholderProfileORM).filter(StakeholderProfileORM.profile_id == sanitized_profile_id).first()
    if row is None:
        row = StakeholderProfileORM(
            profile_id=sanitized_profile_id,
            created_by=sanitize_text(actor_email),
        )
        db.add(row)

    row.title = sanitize_text(request.title).strip()
    row.description = sanitize_text(request.description).strip()
    row.permissions = _normalize_permissions(request.permissions)
    row.is_active = request.is_active
    row.updated_by = sanitize_text(actor_email)

    db.commit()
    db.refresh(row)
    return _to_record(row)


def list_stakeholder_assignments(db: Session, *, profile_id: str) -> StakeholderEmployeeAssignmentListResponse:
    """Return all employee assignments for one stakeholder role profile."""
    sanitized_profile_id = sanitize_text(profile_id).strip().lower()
    if not sanitized_profile_id:
        raise ValueError("profile_id cannot be empty")

    ensure_default_stakeholder_profiles(db)
    profile = db.query(StakeholderProfileORM).filter(StakeholderProfileORM.profile_id == sanitized_profile_id).first()
    if profile is None:
        raise ValueError("stakeholder profile not found")

    rows = (
        db.query(StakeholderEmployeeAssignmentORM)
        .filter(StakeholderEmployeeAssignmentORM.profile_id == sanitized_profile_id)
        .order_by(StakeholderEmployeeAssignmentORM.employee_name.asc())
        .all()
    )
    return StakeholderEmployeeAssignmentListResponse(items=[_to_assignment_record(row) for row in rows])


def add_stakeholder_assignment(
    db: Session,
    *,
    profile_id: str,
    request: StakeholderEmployeeAssignmentRequest,
    actor_email: str,
) -> StakeholderEmployeeAssignmentRecord:
    """Create one employee assignment for a stakeholder role profile."""
    sanitized_profile_id = sanitize_text(profile_id).strip().lower()
    if not sanitized_profile_id:
        raise ValueError("profile_id cannot be empty")

    employee_name = sanitize_text(request.employee_name).strip()
    if not employee_name:
        raise ValueError("employee_name cannot be empty")

    ensure_default_stakeholder_profiles(db)
    profile = db.query(StakeholderProfileORM).filter(StakeholderProfileORM.profile_id == sanitized_profile_id).first()
    if profile is None:
        raise ValueError("stakeholder profile not found")

    existing = (
        db.query(StakeholderEmployeeAssignmentORM)
        .filter(
            StakeholderEmployeeAssignmentORM.profile_id == sanitized_profile_id,
            StakeholderEmployeeAssignmentORM.employee_name == employee_name,
        )
        .first()
    )
    if existing is not None:
        return _to_assignment_record(existing)

    row = StakeholderEmployeeAssignmentORM(
        assignment_id=str(uuid.uuid4()),
        profile_id=sanitized_profile_id,
        employee_name=employee_name,
        created_by=sanitize_text(actor_email),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_assignment_record(row)


def delete_stakeholder_assignment(
    db: Session,
    *,
    profile_id: str,
    assignment_id: str,
) -> None:
    """Delete one employee assignment for a stakeholder role profile."""
    sanitized_profile_id = sanitize_text(profile_id).strip().lower()
    sanitized_assignment_id = sanitize_text(assignment_id).strip()
    if not sanitized_profile_id or not sanitized_assignment_id:
        raise ValueError("profile_id and assignment_id are required")

    row = (
        db.query(StakeholderEmployeeAssignmentORM)
        .filter(
            StakeholderEmployeeAssignmentORM.profile_id == sanitized_profile_id,
            StakeholderEmployeeAssignmentORM.assignment_id == sanitized_assignment_id,
        )
        .first()
    )
    if row is None:
        raise ValueError("stakeholder assignment not found")

    db.delete(row)
    db.commit()
