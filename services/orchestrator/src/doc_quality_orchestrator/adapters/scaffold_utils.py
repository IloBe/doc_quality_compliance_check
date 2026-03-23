"""Utilities for deterministic scaffold adapters."""
from __future__ import annotations

from typing import Any

from ..models import GenerateOptions, ModelMessage


def build_scaffold_json_response(
    messages: list[ModelMessage],
    options: GenerateOptions,
) -> dict[str, Any] | None:
    """Return a schema-shaped deterministic JSON response when possible."""
    schema = options.response_schema or {}
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        return None

    prompt_text = "\n".join(message.content for message in messages)
    property_names = set(properties.keys())
    if {"decision", "summary", "issues", "checks"}.issubset(property_names):
        verified_pass = "VERIFIED: PASS" in prompt_text and "VERIFIED: FAIL" not in prompt_text
        return {
            "decision": "pass" if verified_pass else "fail",
            "summary": (
                "Scaffold validator accepted the crew output because the final verifier passed."
                if verified_pass
                else "Scaffold validator detected a failed or missing final verifier result in the crew output."
            ),
            "issues": [] if verified_pass else ["crew_verifier_did_not_pass"],
            "checks": [
                "final_verdict_consistency",
                "unsupported_language_scan",
                "evidence_signal_present",
            ],
        }

    if "summary" in property_names:
        return {"summary": prompt_text[:280]}

    return None