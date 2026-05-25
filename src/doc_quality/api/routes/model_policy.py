"""Admin routes for model-priority and generation parameter governance."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.session_auth import AuthenticatedUser, require_roles
from ...models.model_policy import ActiveModelResponse, ModelPolicyRecord, ModelPolicyUpdateRequest
from ...services.model_policy_service import get_active_model_response, get_model_policy, update_model_policy

router = APIRouter(prefix="/admin/model-policy", tags=["admin"])

_READ_ROLES = ("qm_lead", "auditor", "riskmanager", "architect", "app_admin")
_WRITE_ROLES = ("app_admin", "qm_lead", "riskmanager")


@router.get("", response_model=ModelPolicyRecord)
async def get_admin_model_policy(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_roles(*_READ_ROLES)),
) -> ModelPolicyRecord:
    """Return persisted model-priority policy used by compliance workflows."""
    return get_model_policy(db)


@router.put("", response_model=ModelPolicyRecord)
async def put_admin_model_policy(
    request: ModelPolicyUpdateRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles(*_WRITE_ROLES)),
) -> ModelPolicyRecord:
    """Update model priorities and generation parameters for active runtime selection."""
    return update_model_policy(db, request=request, actor_email=user.email)


@router.get("/active", response_model=ActiveModelResponse)
async def get_active_model_status(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_roles(*_READ_ROLES, allow_service=True)),
) -> ActiveModelResponse:
    """Return currently active model metadata for visible user disclosure UI."""
    return get_active_model_response(db)
