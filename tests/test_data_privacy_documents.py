from __future__ import annotations

from pathlib import Path

from doc_quality_orchestrator.adapters.registry import resolve_provider
from doc_quality_orchestrator.config import OrchestratorSettings
from doc_quality_orchestrator.privacy_controls import DataPrivacyClass, PrivacyPolicyEngine


_DOCS_DIR = Path(__file__).resolve().parents[1] / "docs" / "test_documents"


def _read_document(name: str) -> str:
    return (_DOCS_DIR / name).read_text(encoding="utf-8")


def test_data_privacy_happy_document_has_no_personal_data_signals() -> None:
    content = _read_document("06_data_privacy_happy.md")
    engine = PrivacyPolicyEngine()

    inferred_class, signals, contains_special_category = engine.infer_privacy_class(
        {"summary": content}
    )

    assert inferred_class == DataPrivacyClass.NON_PERSONAL
    assert signals == []
    assert contains_special_category is False
    assert content.startswith("# Standard Operating Procedure")
    assert "## 1. Purpose" in content
    assert "## 2. Scope" in content
    assert "@" not in content
    assert "example.invalid" not in content


def test_data_privacy_failure_document_triggers_onprem_only_routing() -> None:
    content = _read_document("06_data_privacy_failure.md")
    engine = PrivacyPolicyEngine()
    settings = OrchestratorSettings(
        onprem_first_for_personal_data=True,
        onprem_provider="nemotron",
    )

    decision = engine.evaluate(
        input_payload={"summary": content},
        requested_privacy_class=None,
        onprem_first_for_personal_data=settings.onprem_first_for_personal_data,
        allow_external_fallback_for_scrubbed=settings.allow_external_fallback_for_scrubbed,
    )
    effective_provider = resolve_provider(
        "anthropic",
        settings,
        input_payload={"summary": content},
    )

    assert decision.data_privacy_class == DataPrivacyClass.PERSONAL_DATA_POSSIBLE
    assert decision.model_zone.value == "on_prem_only"
    assert decision.allowed_external_fallback is False
    assert effective_provider == "nemotron"
    assert content.startswith("# Standard Operating Procedure")
    assert "## 1. Purpose" in content
    assert "## 2. Scope" in content
    assert "example.invalid" in content
    assert "TEST-PII-001" in content
