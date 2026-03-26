"""Backend-owned session authentication utilities and FastAPI dependencies."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
from typing import Callable

from fastapi import Cookie, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .security import require_api_auth
from ..models.orm import UserSessionORM


@dataclass
class AuthenticatedUser:
    """Authenticated user context extracted from a server session."""

    email: str
    roles: list[str]
    org: str | None
    session_id: str


@dataclass
class SessionTokens:
    """Raw session token + metadata returned at login time."""

    session_id: str
    raw_token: str
    expires_at: datetime


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hash_session_token(raw_token: str, secret_key: str) -> str:
    payload = f"{raw_token}:{secret_key}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _constant_time_equals(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)


def _cookie_name() -> str:
    return get_settings().session_cookie_name


def parse_mvp_roles(raw_roles: str) -> list[str]:
    """Parse comma-separated roles from configuration."""
    roles = [role.strip() for role in raw_roles.split(",") if role.strip()]
    return roles or ["user"]


def create_server_session(db: Session, user_email: str, roles: list[str], org: str | None) -> SessionTokens:
    """Create and persist a new server-side session."""
    settings = get_settings()
    session_id = secrets.token_urlsafe(24)
    raw_token = secrets.token_urlsafe(48)
    token_hash = _hash_session_token(raw_token, settings.secret_key)
    expires_at = _now_utc() + timedelta(minutes=settings.session_ttl_minutes)

    row = UserSessionORM(
        session_id=session_id,
        session_token_hash=token_hash,
        user_email=user_email,
        user_roles=roles,
        user_org=org,
        is_revoked=False,
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()

    return SessionTokens(session_id=session_id, raw_token=raw_token, expires_at=expires_at)


def revoke_server_session(db: Session, raw_cookie_value: str | None) -> None:
    """Revoke current session if it exists."""
    if not raw_cookie_value:
        return

    settings = get_settings()
    token_hash = _hash_session_token(raw_cookie_value, settings.secret_key)
    row = db.query(UserSessionORM).filter(UserSessionORM.session_token_hash == token_hash).first()
    if row is None:
        return

    row.is_revoked = True
    db.commit()


def resolve_user_from_cookie(db: Session, raw_cookie_value: str | None) -> AuthenticatedUser | None:
    """Resolve an authenticated user context from cookie value."""
    if not raw_cookie_value:
        return None

    settings = get_settings()
    token_hash = _hash_session_token(raw_cookie_value, settings.secret_key)
    row = db.query(UserSessionORM).filter(UserSessionORM.session_token_hash == token_hash).first()
    if row is None:
        return None

    if row.is_revoked:
        return None

    now = _now_utc()
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        return None

    row.last_seen_at = now
    db.commit()

    return AuthenticatedUser(
        email=row.user_email,
        roles=list(row.user_roles or []),
        org=row.user_org,
        session_id=row.session_id,
    )


def set_session_cookie(response: Response, token: SessionTokens) -> None:
    """Attach the server session cookie to response."""
    settings = get_settings()
    response.set_cookie(
        key=_cookie_name(),
        value=token.raw_token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_minutes * 60,
        expires=token.expires_at,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Delete the server session cookie from response."""
    settings = get_settings()
    response.delete_cookie(
        key=_cookie_name(),
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


def require_authenticated_user(
    db: Session = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias="dq_session"),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> AuthenticatedUser:
    """Enforce auth: prefer server cookie, allow API key/bearer fallback for service clients."""
    user = resolve_user_from_cookie(db, session_cookie)
    if user is not None:
        return user

    # Service-to-service fallback (keeps existing API key based tests and orchestrator calls functional).
    try:
        require_api_auth(x_api_key=x_api_key, authorization=authorization)
        return AuthenticatedUser(
            email="service-client",
            roles=["service"],
            org=None,
            session_id="api-key",
        )
    except HTTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        ) from exc


def require_session_user(
    db: Session = Depends(get_db),
    session_cookie: str | None = Cookie(default=None, alias="dq_session"),
) -> AuthenticatedUser:
    """Require browser session cookie only (no API key fallback)."""
    user = resolve_user_from_cookie(db, session_cookie)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


def require_roles(*allowed_roles: str) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    """Return a dependency that enforces at least one required role.

    Notes:
    - `service` role bypasses role checks for service-to-service workflows.
    - Intended for endpoint-level authorization in addition to authentication.
    """

    normalized = {role.strip().lower() for role in allowed_roles if role.strip()}

    def _dependency(user: AuthenticatedUser = Depends(require_authenticated_user)) -> AuthenticatedUser:
        user_roles = {role.strip().lower() for role in user.roles}
        if "service" in user_roles:
            return user

        if normalized.intersection(user_roles):
            return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient role permissions",
        )

    return _dependency
