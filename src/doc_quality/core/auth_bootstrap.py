"""Bootstrap authentication account helpers.

This module centralizes configured bootstrap identities used for local/dev login
and startup self-check diagnostics.
"""
from __future__ import annotations

from dataclasses import dataclass

from .config import Settings, get_settings
from .session_auth import parse_mvp_roles


@dataclass(frozen=True)
class BootstrapAccountConfig:
    """Configured bootstrap account metadata.

    The password field is required for authentication checks but must never be
    included in externally exposed diagnostic responses or logs.
    """

    email: str
    password: str
    roles: list[str]
    org: str | None


def configured_bootstrap_accounts(settings: Settings | None = None) -> dict[str, BootstrapAccountConfig]:
    """Return configured bootstrap accounts keyed by normalized email."""
    active_settings = settings or get_settings()

    mvp_email = active_settings.auth_mvp_email.lower().strip()
    admin_email = active_settings.auth_admin_email.lower().strip()

    accounts: dict[str, BootstrapAccountConfig] = {
        mvp_email: BootstrapAccountConfig(
            email=mvp_email,
            password=active_settings.auth_mvp_password,
            roles=parse_mvp_roles(active_settings.auth_mvp_roles),
            org=active_settings.auth_mvp_org,
        )
    }

    if admin_email and admin_email != mvp_email:
        accounts[admin_email] = BootstrapAccountConfig(
            email=admin_email,
            password=active_settings.auth_admin_password,
            roles=parse_mvp_roles(active_settings.auth_admin_roles),
            org=active_settings.auth_admin_org,
        )

    return accounts


def resolve_bootstrap_account(email: str, settings: Settings | None = None) -> BootstrapAccountConfig | None:
    """Resolve one bootstrap account by email."""
    normalized = email.lower().strip()
    return configured_bootstrap_accounts(settings).get(normalized)


def bootstrap_accounts_public_view(settings: Settings | None = None) -> list[dict[str, object]]:
    """Return safe bootstrap account metadata for diagnostics.

    Security: password values are explicitly excluded.
    """
    rows: list[dict[str, object]] = []
    for account in configured_bootstrap_accounts(settings).values():
        rows.append({
            "email": account.email,
            "roles": list(account.roles),
            "org": account.org,
        })

    rows.sort(key=lambda item: str(item["email"]))
    return rows
