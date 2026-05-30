"""Payload privacy guardrails for audit and telemetry persistence.

This module provides deterministic redaction-at-write controls and retention-class
metadata tagging for JSON payloads persisted in audit and telemetry stores.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any


_SECRET_KEY_PATTERN = re.compile(
    r"password|passphrase|secret|token|api[_-]?key|authorization|credential|private[_-]?key|cookie|session",
    re.IGNORECASE,
)

_SECRET_VALUE_PATTERNS = [
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"sk-[A-Za-z0-9]{12,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._\-]{16,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
]

_TRADE_SECRET_TERMS = [
    "trade secret",
    "proprietary",
    "confidential algorithm",
    "source code",
    "internal-only",
    "do not distribute",
]

_TEXT_BEARING_FIELD_PATTERN = re.compile(
    r"prompt|output|content|text|answer|details|description|note|evidence",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class PrivacyGuardResult:
    """Result of payload guarding for persistence boundaries."""

    payload: dict[str, Any]
    retention_class: str
    redaction_applied: bool
    reason_codes: list[str]


@dataclass(frozen=True)
class SensitiveOutputExposureAssessment:
    """Assessment for sensitive response-surface output exposure risk."""

    blocked: bool
    risk_level: str
    matched_signals: list[str]
    summary: str


def _classify_retention_class(*, event_type: str, channel: str) -> str:
    normalized = (event_type or "").strip().lower()
    if "debug" in normalized or "trace" in normalized:
        return "debug_trace"
    if normalized.startswith(("health.", "metrics.", "telemetry.")):
        return "operational"
    if channel == "telemetry":
        return "operational"
    return "evidence"


def _string_looks_secret(value: str) -> bool:
    return any(pattern.search(value) for pattern in _SECRET_VALUE_PATTERNS)


def _string_looks_trade_secret(value: str) -> bool:
    lowered = value.lower()
    return any(term in lowered for term in _TRADE_SECRET_TERMS)


def assess_sensitive_output_exposure(value: str) -> SensitiveOutputExposureAssessment:
    """Assess whether raw response content should be blocked for sensitive exposure risk."""
    normalized = (value or "").strip()
    if not normalized:
        return SensitiveOutputExposureAssessment(
            blocked=False,
            risk_level="low",
            matched_signals=[],
            summary="No content provided.",
        )

    matched_signals: list[str] = []
    if _string_looks_secret(normalized):
        matched_signals.append("secret_value")
    if _string_looks_trade_secret(normalized):
        matched_signals.append("trade_secret_signal")

    if not matched_signals:
        return SensitiveOutputExposureAssessment(
            blocked=False,
            risk_level="low",
            matched_signals=[],
            summary="No secret or trade-secret signals detected.",
        )

    risk_level = "high" if "secret_value" in matched_signals else "medium"
    return SensitiveOutputExposureAssessment(
        blocked=True,
        risk_level=risk_level,
        matched_signals=matched_signals,
        summary="Detected sensitive secret/trade-secret signals in response content.",
    )


def _sanitize_value(
    value: Any,
    *,
    field_name: str,
    reason_codes: set[str],
) -> Any:
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for key, nested in value.items():
            key_name = str(key)
            if _SECRET_KEY_PATTERN.search(key_name):
                reason_codes.add("secret_key_name")
                sanitized[key_name] = "[REDACTED_SECRET]"
                continue
            sanitized[key_name] = _sanitize_value(
                nested,
                field_name=key_name,
                reason_codes=reason_codes,
            )
        return sanitized

    if isinstance(value, list):
        return [
            _sanitize_value(item, field_name=field_name, reason_codes=reason_codes)
            for item in value
        ]

    if isinstance(value, tuple):
        return tuple(
            _sanitize_value(item, field_name=field_name, reason_codes=reason_codes)
            for item in value
        )

    if isinstance(value, str):
        if _string_looks_secret(value):
            reason_codes.add("secret_value")
            return "[REDACTED_SECRET]"

        if _TEXT_BEARING_FIELD_PATTERN.search(field_name) and _string_looks_trade_secret(value):
            reason_codes.add("trade_secret_signal")
            return "[REDACTED_TRADE_SECRET]"

    return value


def guard_payload_for_persistence(*, event_type: str, payload: Any, channel: str) -> PrivacyGuardResult:
    """Return payload with persistence guardrails and metadata applied.

    Args:
        event_type: Audit or telemetry event type for retention-class routing.
        payload: Arbitrary JSON-like payload to sanitize.
        channel: One of "audit" or "telemetry".
    """
    retention_class = _classify_retention_class(event_type=event_type, channel=channel)

    source_payload: dict[str, Any]
    if isinstance(payload, dict):
        source_payload = payload
    elif payload is None:
        source_payload = {}
    else:
        source_payload = {"value": payload}

    reason_codes: set[str] = set()
    sanitized = _sanitize_value(source_payload, field_name="payload", reason_codes=reason_codes)

    redaction_applied = bool(reason_codes)
    sanitized["__privacy_meta__"] = {
        "retention_class": retention_class,
        "redaction_applied": redaction_applied,
        "reason_codes": sorted(reason_codes),
    }

    return PrivacyGuardResult(
        payload=sanitized,
        retention_class=retention_class,
        redaction_applied=redaction_applied,
        reason_codes=sorted(reason_codes),
    )
