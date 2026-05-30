"""Purpose-based authorization guardrails for sensitive access surfaces."""
from __future__ import annotations

import re
from typing import Iterable

from fastapi import HTTPException


ACCESS_PURPOSE_HEADER = "X-Access-Purpose"

DEBUG_TRACE_ALLOWED_PURPOSES = frozenset(
    {
        "incident_response",
        "security_investigation",
        "regulatory_audit",
    }
)

EXPORT_ALLOWED_PURPOSES = frozenset(
    {
        "regulatory_audit",
        "quality_review",
        "legal_disclosure",
    }
)

CONTENT_READ_ALLOWED_PURPOSES = frozenset(
    {
        "regulatory_audit",
        "quality_review",
        "incident_response",
        "legal_disclosure",
    }
)

_PURPOSE_PATTERN = re.compile(r"^[a-z][a-z0-9_:-]{2,63}$")


def _normalize_access_purpose(raw_value: str | None) -> str | None:
    if raw_value is None:
        return None
    normalized = raw_value.strip().lower()
    if not normalized:
        return None
    return normalized


def enforce_sensitive_access_purpose(
    *,
    access_purpose: str | None,
    allowed_purposes: Iterable[str],
    resource_label: str,
) -> str:
    """Enforce explicit and policy-approved access purpose for sensitive surfaces."""
    normalized = _normalize_access_purpose(access_purpose)
    if normalized is None:
        raise HTTPException(
            status_code=403,
            detail={
                "reason": "purpose_based_access_denied",
                "message": "Sensitive access requires an explicit approved access purpose.",
                "action_points": [
                    f"Provide the {ACCESS_PURPOSE_HEADER} header with an approved purpose.",
                    "Use a least-privilege purpose aligned with the requested operation.",
                    "Escalate to governance if no approved purpose is applicable.",
                ],
                "details": [
                    f"resource:{resource_label}",
                    "missing_access_purpose",
                ],
            },
        )

    if _PURPOSE_PATTERN.match(normalized) is None:
        raise HTTPException(
            status_code=403,
            detail={
                "reason": "purpose_based_access_denied",
                "message": "The declared access purpose format is invalid.",
                "action_points": [
                    f"Provide {ACCESS_PURPOSE_HEADER} as a lowercase policy token (for example: incident_response).",
                    "Use only policy-approved purpose tokens.",
                ],
                "details": [
                    f"resource:{resource_label}",
                    f"purpose:{normalized}",
                    "invalid_purpose_format",
                ],
            },
        )

    allowed = {item.strip().lower() for item in allowed_purposes if item and item.strip()}
    if normalized not in allowed:
        raise HTTPException(
            status_code=403,
            detail={
                "reason": "purpose_based_access_denied",
                "message": "The declared access purpose is not approved for this sensitive operation.",
                "action_points": [
                    "Use one of the approved purposes for this endpoint.",
                    "Retry using least-privilege purpose selection.",
                    "Escalate for policy review when a new purpose token is required.",
                ],
                "details": [
                    f"resource:{resource_label}",
                    f"purpose:{normalized}",
                    f"allowed_purposes:{','.join(sorted(allowed))}",
                ],
            },
        )

    return normalized