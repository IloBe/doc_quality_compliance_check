from __future__ import annotations

import asyncio

import pytest

from doc_quality_orchestrator.models import GenerateOptions, ModelCapabilities, ModelMessage, ModelResponse
from doc_quality_orchestrator.privacy_controls import (
    DataPrivacyClass,
    ModelCapabilityRegistry,
    ModelZone,
    PolicyDecision,
    PrivacyPolicyEngine,
    SandboxExecutionError,
    SandboxExecutor,
    SandboxPolicyViolation,
    StepContract,
)


class _SlowAdapter:
    provider_id = "nemotron"
    capabilities = ModelCapabilities()

    async def generate(self, messages, options):  # type: ignore[no-untyped-def]
        await asyncio.sleep(0.05)
        return ModelResponse(
            content="ok",
            json={"summary": "ok"},
            model_id="m1",
            provider_id=self.provider_id,
        )


class _ExternalAdapter:
    provider_id = "anthropic"
    capabilities = ModelCapabilities()

    async def generate(self, messages, options):  # type: ignore[no-untyped-def]
        return ModelResponse(
            content="ok",
            json={"summary": "ok"},
            model_id="m2",
            provider_id=self.provider_id,
        )


def test_privacy_policy_infers_personal_data_from_email_pattern() -> None:
    engine = PrivacyPolicyEngine()

    decision = engine.evaluate(
        input_payload={"description": "Contact jane.doe@example.com for review."},
        requested_privacy_class=None,
        onprem_first_for_personal_data=True,
        allow_external_fallback_for_scrubbed=True,
    )

    assert decision.data_privacy_class == DataPrivacyClass.PERSONAL_DATA_POSSIBLE
    assert decision.model_zone == ModelZone.ON_PREM_ONLY


def test_capability_registry_prefers_onprem_for_personal_data() -> None:
    registry = ModelCapabilityRegistry.default()
    decision = PolicyDecision(
        data_privacy_class=DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
        model_zone=ModelZone.ON_PREM_ONLY,
        allowed_external_fallback=False,
        reason="personal data",
    )
    contract = StepContract(
        step_name="provider_summary",
        business_purpose="summary",
        sensitivity_class=DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
    )

    effective = registry.resolve_provider(
        requested_provider="anthropic",
        onprem_provider="nemotron",
        step_contract=contract,
        decision=decision,
    )

    assert effective == "nemotron"


@pytest.mark.asyncio
async def test_sandbox_blocks_external_adapter_for_onprem_only_policy() -> None:
    executor = SandboxExecutor()
    adapter = _ExternalAdapter()
    decision = PolicyDecision(
        data_privacy_class=DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
        model_zone=ModelZone.ON_PREM_ONLY,
        allowed_external_fallback=False,
        reason="personal data",
    )
    contract = StepContract(
        step_name="provider_summary",
        business_purpose="summary",
        sensitivity_class=DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
        timeout_seconds=1.0,
    )

    with pytest.raises(SandboxPolicyViolation):
        await executor.execute_model_step(
            adapter=adapter,
            messages=[ModelMessage(role="user", content="hello")],
            options=GenerateOptions(response_schema={"type": "object"}),
            step_contract=contract,
            decision=decision,
        )


@pytest.mark.asyncio
async def test_sandbox_enforces_timeout() -> None:
    executor = SandboxExecutor()
    adapter = _SlowAdapter()
    decision = PolicyDecision(
        data_privacy_class=DataPrivacyClass.NON_PERSONAL,
        model_zone=ModelZone.ON_PREM_PREFERRED,
        allowed_external_fallback=True,
        reason="non personal",
    )
    contract = StepContract(
        step_name="provider_summary",
        business_purpose="summary",
        timeout_seconds=0.01,
    )

    with pytest.raises(SandboxExecutionError):
        await executor.execute_model_step(
            adapter=adapter,
            messages=[ModelMessage(role="user", content="hello")],
            options=GenerateOptions(response_schema={"type": "object"}),
            step_contract=contract,
            decision=decision,
        )
