from __future__ import annotations

from doc_quality_orchestrator.adapters.registry import get_adapter, resolve_provider
from doc_quality_orchestrator.config import OrchestratorSettings


def test_resolve_provider_prefers_onprem_for_document_payload() -> None:
    settings = OrchestratorSettings(
        onprem_first_for_personal_data=True,
        onprem_provider="nemotron",
    )

    effective = resolve_provider(
        "anthropic",
        settings,
        input_payload={"document_id": "DOC-123"},
    )

    assert effective == "nemotron"


def test_resolve_provider_keeps_requested_provider_when_no_sensitive_signals() -> None:
    settings = OrchestratorSettings(
        onprem_first_for_personal_data=True,
        onprem_provider="nemotron",
    )

    effective = resolve_provider(
        "anthropic",
        settings,
        input_payload={"health": "ok"},
    )

    assert effective == "anthropic"


def test_get_adapter_uses_effective_provider_after_policy_resolution() -> None:
    settings = OrchestratorSettings(
        onprem_first_for_personal_data=True,
        onprem_provider="nemotron",
    )

    adapter = get_adapter(
        "anthropic",
        settings,
        input_payload={"content": "x" * 80},
    )

    assert adapter.provider_id == "nemotron"


def test_policy_can_be_disabled() -> None:
    settings = OrchestratorSettings(
        onprem_first_for_personal_data=False,
        onprem_provider="nemotron",
    )

    effective = resolve_provider(
        "anthropic",
        settings,
        input_payload={"document_id": "DOC-123"},
    )

    assert effective == "anthropic"
