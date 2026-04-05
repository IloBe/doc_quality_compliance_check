from __future__ import annotations

import os

import pytest

from doc_quality_orchestrator.adapters.registry import get_adapter
from doc_quality_orchestrator.config import OrchestratorSettings
from doc_quality_orchestrator.flows.document_review_flow import ModelValidatorReport
from doc_quality_orchestrator.models import GenerateOptions, ModelMessage


_SUPPORTED_PROVIDERS = {"anthropic", "openai_compatible", "nemotron"}
_CURRENT_SCAFFOLD_PROVIDERS = {
    "anthropic": "Anthropic adapter is still scaffold-backed in this repo state.",
    "openai_compatible": "OpenAI-compatible adapter is still scaffold-backed in this repo state.",
    "nemotron": "Nemotron adapter is still scaffold-backed in this repo state.",
}


def _require_manual_approval() -> None:
    if os.getenv("RUN_LLM_INTEGRATION_TESTS") != "1":
        pytest.skip("Live LLM smoke tests are disabled. Set RUN_LLM_INTEGRATION_TESTS=1 after human approval.")
    if os.getenv("LLM_TEST_HUMAN_APPROVED") != "1":
        pytest.skip("Human approval flag missing. Set LLM_TEST_HUMAN_APPROVED=1 before any live-model smoke run.")


def _require_budget_guardrail() -> int:
    raw_budget = os.getenv("LLM_TEST_BUDGET_TOKENS", "")
    if not raw_budget:
        pytest.skip("LLM_TEST_BUDGET_TOKENS must be set explicitly for live smoke tests.")

    try:
        budget = int(raw_budget)
    except ValueError:
        pytest.skip("LLM_TEST_BUDGET_TOKENS must be an integer.")

    if budget < 1:
        pytest.skip("LLM_TEST_BUDGET_TOKENS must be positive.")
    if budget > 20000:
        pytest.skip("LLM_TEST_BUDGET_TOKENS exceeds the allowed smoke-test ceiling of 20000.")
    return budget


def _resolve_provider() -> str:
    provider = os.getenv("LLM_TEST_PROVIDER", "anthropic")
    if provider not in _SUPPORTED_PROVIDERS:
        pytest.skip(f"Unsupported LLM_TEST_PROVIDER={provider!r}.")
    if provider in _CURRENT_SCAFFOLD_PROVIDERS:
        pytest.skip(_CURRENT_SCAFFOLD_PROVIDERS[provider])
    return provider


@pytest.mark.llm_integration
@pytest.mark.asyncio
async def test_live_model_validator_smoke_manual_only() -> None:
    _require_manual_approval()
    budget = _require_budget_guardrail()
    provider = _resolve_provider()

    settings = OrchestratorSettings()
    adapter = get_adapter(provider, settings)

    response = await adapter.generate(
        messages=[
            ModelMessage(role="system", content="Return JSON only and follow the response schema exactly."),
            ModelMessage(
                role="user",
                content=(
                    "Return a compact validator report for this final output. "
                    "Crew result: VERIFIED: PASS with evidence citations from section 4.2."
                ),
            ),
        ],
        options=GenerateOptions(
            response_schema=ModelValidatorReport.model_json_schema(),
            temperature=0.0,
            max_tokens=min(budget, 400),
        ),
    )

    report = ModelValidatorReport.model_validate(response.json_payload)

    assert response.provider_id == provider
    assert response.model_id
    assert report.decision in {"pass", "review", "fail"}
    assert report.summary
