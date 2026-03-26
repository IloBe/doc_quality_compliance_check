"""API routes for backend-owned session authentication."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
from ...core.passwords import hash_password, verify_password
from ...core.session_auth import (
    AuthenticatedUser,
    clear_session_cookie,
    create_server_session,
    parse_mvp_roles,
    require_session_user,
    revoke_server_session,
    set_session_cookie,
)
from ...models.orm import AppUserORM, AuditEventORM, PasswordRecoveryTokenORM, UserSessionORM

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    """Email/password login request for MVP."""

    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


class AuthUserResponse(BaseModel):
    """Authenticated user returned by auth endpoints."""

    email: str
    roles: list[str]
    org: str | None = None


class LoginResponse(BaseModel):
    """Login response payload."""

    user: AuthUserResponse
    expires_at: datetime


class LogoutResponse(BaseModel):
    """Logout response payload."""

    success: bool


class RecoveryRequestPayload(BaseModel):
    """Request payload for password recovery initiation."""

    email: str = Field(min_length=3)


class RecoveryRequestResponse(BaseModel):
    """Generic password recovery response."""

    success: bool
    message: str
    debug_token: str | None = None
    reset_url: str | None = None


class RecoveryVerifyPayload(BaseModel):
    """Request payload for recovery token verification."""

    token: str = Field(min_length=16)


class RecoveryVerifyResponse(BaseModel):
    """Token verification result."""

    valid: bool
    message: str


class RecoveryResetPayload(BaseModel):
    """Request payload for password reset completion."""

    token: str = Field(min_length=16)
    new_password: str = Field(min_length=10)


class RecoveryResetResponse(BaseModel):
    """Password reset response payload."""

    success: bool
    message: str


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hash_recovery_token(raw_token: str, secret_key: str) -> str:
    payload = f"{raw_token}:{secret_key}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _log_audit_event(
    db: Session,
    *,
    event_type: str,
    actor_type: str,
    actor_id: str,
    subject_type: str,
    subject_id: str,
    payload: dict,
) -> None:
    event = AuditEventORM(
        event_id=secrets.token_urlsafe(24),
        tenant_id="default",
        org_id=None,
        project_id=None,
        event_time=_now_utc(),
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        subject_type=subject_type,
        subject_id=subject_id,
        trace_id=None,
        correlation_id=None,
        payload=payload,
    )
    db.add(event)


def _provision_mvp_user_if_enabled(db: Session, email: str) -> AppUserORM | None:
    settings = get_settings()
    if not settings.auth_auto_provision_mvp_user:
        return None

    if email.lower() != settings.auth_mvp_email.lower():
        return None

    existing = db.query(AppUserORM).filter(AppUserORM.email == email.lower()).first()
    if existing is not None:
        return existing

    row = AppUserORM(
        user_id=secrets.token_urlsafe(24),
        email=email.lower(),
        password_hash=hash_password(settings.auth_mvp_password),
        roles=parse_mvp_roles(settings.auth_mvp_roles),
        org=settings.auth_mvp_org,
        is_active=True,
        is_locked=False,
    )
    db.add(row)
    db.commit()
    return row


def _is_recovery_rate_limited(db: Session, email: str, ip: str | None) -> bool:
    settings = get_settings()
    now = _now_utc()
    window_start = now - timedelta(minutes=settings.auth_recovery_rate_limit_window_minutes)

    per_email = (
        db.query(PasswordRecoveryTokenORM)
        .filter(
            PasswordRecoveryTokenORM.user_email == email,
            PasswordRecoveryTokenORM.requested_at >= window_start,
        )
        .count()
    )
    if per_email >= settings.auth_recovery_rate_limit_count:
        return True

    if ip:
        per_ip = (
            db.query(PasswordRecoveryTokenORM)
            .filter(
                PasswordRecoveryTokenORM.requested_ip == ip,
                PasswordRecoveryTokenORM.requested_at >= window_start,
            )
            .count()
        )
        if per_ip >= settings.auth_recovery_rate_limit_count:
            return True

    return False


def _find_valid_recovery_token(db: Session, raw_token: str) -> PasswordRecoveryTokenORM | None:
    settings = get_settings()
    token_hash = _hash_recovery_token(raw_token, settings.secret_key)
    row = db.query(PasswordRecoveryTokenORM).filter(PasswordRecoveryTokenORM.token_hash == token_hash).first()
    if row is None:
        return None

    now = _now_utc()
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if row.used_at is not None:
        return None

    if expires_at <= now:
        return None

    return row


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    """Validate credentials and issue server session cookie."""
    settings = get_settings()
    email = request.email.lower()

    user = db.query(AppUserORM).filter(AppUserORM.email == email).first()
    if user is None:
        user = _provision_mvp_user_if_enabled(db, email)

    if user is not None and user.is_active and not user.is_locked:
        valid_password = verify_password(request.password, user.password_hash)
        if not valid_password and email == settings.auth_mvp_email.lower() and request.password == settings.auth_mvp_password:
            # One-time bridge for existing MVP env-password users.
            user.password_hash = hash_password(request.password)
            db.commit()
            valid_password = True

        if not valid_password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        roles = list(user.roles or [])
        org = user.org
    else:
        # Backward-compatible fallback when app_users row does not exist yet.
        if email != settings.auth_mvp_email.lower() or request.password != settings.auth_mvp_password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        roles = parse_mvp_roles(settings.auth_mvp_roles)
        org = settings.auth_mvp_org

    token = create_server_session(db, user_email=email, roles=roles, org=org)
    set_session_cookie(response, token)

    _log_audit_event(
        db,
        event_type="auth.login_success",
        actor_type="user",
        actor_id=email,
        subject_type="session",
        subject_id=token.session_id,
        payload={"roles": roles},
    )
    db.commit()

    return LoginResponse(
        user=AuthUserResponse(email=email, roles=roles, org=org),
        expires_at=token.expires_at,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    db: Session = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias="dq_session"),
) -> LogoutResponse:
    """Revoke session and clear auth cookie."""
    revoke_server_session(db, session_cookie)
    clear_session_cookie(response)
    return LogoutResponse(success=True)


@router.get("/me", response_model=AuthUserResponse)
async def me(user: AuthenticatedUser = Depends(require_session_user)) -> AuthUserResponse:
    """Return current authenticated user from server session."""
    return AuthUserResponse(email=user.email, roles=user.roles, org=user.org)


@router.post("/recovery/request", response_model=RecoveryRequestResponse, status_code=status.HTTP_202_ACCEPTED)
async def recovery_request(
    payload: RecoveryRequestPayload,
    request: Request,
    db: Session = Depends(get_db),
) -> RecoveryRequestResponse:
    """Request password recovery token with generic anti-enumeration response."""
    settings = get_settings()
    email = payload.email.lower().strip()
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    generic = RecoveryRequestResponse(
        success=True,
        message="If the account exists, a recovery link has been generated.",
    )

    user = db.query(AppUserORM).filter(AppUserORM.email == email).first()
    if user is None:
        user = _provision_mvp_user_if_enabled(db, email)

    if user is None or not user.is_active or user.is_locked:
        _log_audit_event(
            db,
            event_type="auth.recovery.request_ignored",
            actor_type="anonymous",
            actor_id=client_ip or "unknown",
            subject_type="user",
            subject_id=email,
            payload={"reason": "unknown_or_inactive_user"},
        )
        db.commit()
        return generic

    if _is_recovery_rate_limited(db, email=email, ip=client_ip):
        _log_audit_event(
            db,
            event_type="auth.recovery.rate_limited",
            actor_type="anonymous",
            actor_id=client_ip or "unknown",
            subject_type="user",
            subject_id=email,
            payload={"window_minutes": settings.auth_recovery_rate_limit_window_minutes},
        )
        db.commit()
        return generic

    raw_token = secrets.token_urlsafe(48)
    token_hash = _hash_recovery_token(raw_token, settings.secret_key)
    expires_at = _now_utc() + timedelta(minutes=settings.auth_recovery_ttl_minutes)

    row = PasswordRecoveryTokenORM(
        token_id=secrets.token_urlsafe(24),
        user_email=email,
        token_hash=token_hash,
        requested_ip=client_ip,
        requested_user_agent=user_agent,
        expires_at=expires_at,
        used_at=None,
        attempt_count=0,
    )
    db.add(row)

    _log_audit_event(
        db,
        event_type="auth.recovery.requested",
        actor_type="user",
        actor_id=email,
        subject_type="recovery_token",
        subject_id=row.token_id,
        payload={"expires_at": expires_at.isoformat()},
    )
    db.commit()

    if settings.environment == "development" and settings.auth_recovery_debug_expose_token:
        generic.debug_token = raw_token
        generic.reset_url = f"http://localhost:3000/reset-access?token={raw_token}"

    return generic


@router.post("/recovery/verify", response_model=RecoveryVerifyResponse)
async def recovery_verify(payload: RecoveryVerifyPayload, db: Session = Depends(get_db)) -> RecoveryVerifyResponse:
    """Verify whether a recovery token is currently valid."""
    row = _find_valid_recovery_token(db, payload.token)
    if row is None:
        return RecoveryVerifyResponse(valid=False, message="Recovery token is invalid or expired")

    return RecoveryVerifyResponse(valid=True, message="Recovery token is valid")


@router.post("/recovery/reset", response_model=RecoveryResetResponse)
async def recovery_reset(payload: RecoveryResetPayload, db: Session = Depends(get_db)) -> RecoveryResetResponse:
    """Reset password using a valid recovery token and revoke active sessions."""
    if len(payload.new_password.strip()) < 10:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password is too short")

    row = _find_valid_recovery_token(db, payload.token)
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recovery token is invalid or expired")

    user = db.query(AppUserORM).filter(AppUserORM.email == row.user_email).first()
    if user is None or not user.is_active or user.is_locked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recovery token is invalid or expired")

    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must differ from current password")

    user.password_hash = hash_password(payload.new_password)
    row.used_at = _now_utc()

    active_sessions = (
        db.query(UserSessionORM)
        .filter(UserSessionORM.user_email == user.email, UserSessionORM.is_revoked.is_(False))
        .all()
    )
    for session in active_sessions:
        session.is_revoked = True

    _log_audit_event(
        db,
        event_type="auth.recovery.password_reset",
        actor_type="user",
        actor_id=user.email,
        subject_type="user",
        subject_id=user.email,
        payload={"revoked_sessions": len(active_sessions)},
    )
    db.commit()

    return RecoveryResetResponse(success=True, message="Password has been reset. Please sign in with your new password.")
