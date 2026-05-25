"""Admin routes for compliance controls and governance policy snapshots."""
from __future__ import annotations

import hashlib

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.logging_config import get_logger
from ...core.session_auth import AuthenticatedUser, require_roles
from ...models.governance import (
    GovernanceControl,
    GovernanceControlCreateRequest,
    GovernanceControlListResponse,
    GovernanceSnapshotResponse,
)
from ...services.governance_service import (
    create_governance_control,
    get_governance_snapshot,
    list_governance_controls,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/admin/governance", tags=["admin"])

_READ_ROLES = ("qm_lead", "auditor", "riskmanager", "architect", "app_admin")
_WRITE_ROLES = ("qm_lead", "app_admin")


def _actor_fingerprint(actor_email: str) -> str:
    """Return stable pseudonymous actor id for logs without exposing raw email."""
    normalized = actor_email.strip().lower().encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()[:12]


@router.get("/snapshot", response_model=GovernanceSnapshotResponse)
async def get_admin_governance_snapshot(
    response: Response,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles(*_READ_ROLES)),
) -> GovernanceSnapshotResponse:
    """Return governance controls and policy snapshot for admin surfaces."""
    # Admin governance data should never be cached by intermediaries or browsers.
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"

    try:
        return get_governance_snapshot(db, actor_email=user.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive path for unexpected runtime failures
        logger.exception(
            "admin_governance_snapshot_failed",
            actor_id=_actor_fingerprint(user.email),
            error_type=type(exc).__name__,
        )
        raise HTTPException(status_code=500, detail="Failed to load governance snapshot") from exc


@router.get("/controls", response_model=GovernanceControlListResponse)
async def get_admin_governance_controls(
    response: Response,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles(*_READ_ROLES)),
) -> GovernanceControlListResponse:
    """Return governance control catalog for admin/QM governance workflows."""
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"

    try:
        return list_governance_controls(
            db,
            actor_email=user.email,
            include_inactive=include_inactive,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception(
            "admin_governance_controls_failed",
            actor_id=_actor_fingerprint(user.email),
            error_type=type(exc).__name__,
        )
        raise HTTPException(status_code=500, detail="Failed to load governance controls") from exc


@router.post("/controls", response_model=GovernanceControl)
async def create_admin_governance_control(
    request: GovernanceControlCreateRequest,
    response: Response,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles(*_WRITE_ROLES)),
) -> GovernanceControl:
    """Create a governance control item for the persistent catalog."""
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"

    try:
        return create_governance_control(
            db,
            actor_email=user.email,
            request=request,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception(
            "admin_governance_control_create_failed",
            actor_id=_actor_fingerprint(user.email),
            error_type=type(exc).__name__,
        )
        raise HTTPException(status_code=500, detail="Failed to create governance control") from exc
