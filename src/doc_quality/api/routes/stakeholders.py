"""Admin routes for persistent stakeholder profile governance."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.session_auth import AuthenticatedUser, require_roles
from ...models.stakeholder import (
    StakeholderEmployeeAssignmentListResponse,
    StakeholderEmployeeAssignmentRecord,
    StakeholderEmployeeAssignmentRequest,
    StakeholderProfileListResponse,
    StakeholderProfileRecord,
    StakeholderProfileUpsertRequest,
)
from ...services.stakeholder_service import (
    add_stakeholder_assignment,
    delete_stakeholder_assignment,
    list_stakeholder_assignments,
    list_stakeholder_profiles,
    upsert_stakeholder_profile,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_STAKEHOLDER_READ_ROLES = ("qm_lead", "auditor", "riskmanager", "architect")
_STAKEHOLDER_WRITE_ROLES = ("qm_lead", "riskmanager")


@router.get("/stakeholder-profiles", response_model=StakeholderProfileListResponse)
async def get_stakeholder_profiles(
    include_inactive: bool = Query(default=True),
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_roles(*_STAKEHOLDER_READ_ROLES)),
) -> StakeholderProfileListResponse:
    """List stakeholder role templates and their permission sets."""
    return list_stakeholder_profiles(db, include_inactive=include_inactive)


@router.put("/stakeholder-profiles/{profile_id}", response_model=StakeholderProfileRecord)
async def put_stakeholder_profile(
    request: StakeholderProfileUpsertRequest,
    profile_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles(*_STAKEHOLDER_WRITE_ROLES)),
) -> StakeholderProfileRecord:
    """Create or update one stakeholder profile."""
    try:
        return upsert_stakeholder_profile(
            db,
            profile_id=profile_id,
            request=request,
            actor_email=user.email,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc


@router.get("/stakeholder-profiles/{profile_id}/employees", response_model=StakeholderEmployeeAssignmentListResponse)
async def get_stakeholder_profile_employees(
    profile_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_roles(*_STAKEHOLDER_READ_ROLES)),
) -> StakeholderEmployeeAssignmentListResponse:
    """List employee assignments for one stakeholder role profile."""
    try:
        return list_stakeholder_assignments(db, profile_id=profile_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc


@router.post("/stakeholder-profiles/{profile_id}/employees", response_model=StakeholderEmployeeAssignmentRecord)
async def post_stakeholder_profile_employee(
    request: StakeholderEmployeeAssignmentRequest,
    profile_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles(*_STAKEHOLDER_WRITE_ROLES)),
) -> StakeholderEmployeeAssignmentRecord:
    """Assign one employee name to a stakeholder role profile."""
    try:
        return add_stakeholder_assignment(
            db,
            profile_id=profile_id,
            request=request,
            actor_email=user.email,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc


@router.delete("/stakeholder-profiles/{profile_id}/employees/{assignment_id}")
async def delete_stakeholder_profile_employee(
    profile_id: str = Path(min_length=1, max_length=64),
    assignment_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_roles(*_STAKEHOLDER_WRITE_ROLES)),
) -> dict[str, bool]:
    """Remove one employee assignment from a stakeholder role profile."""
    try:
        delete_stakeholder_assignment(
            db,
            profile_id=profile_id,
            assignment_id=assignment_id,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return {"success": True}
