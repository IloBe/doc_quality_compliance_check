"""Adapter registry for the orchestrator service."""
from typing import Any

from ..config import OrchestratorSettings
from ..privacy_controls import (
    DataPrivacyClass,
    ModelCapabilityRegistry,
    PrivacyPolicyEngine,
    StepContract,
)
from .anthropic_adapter import AnthropicAdapter
from .base import ModelAdapter
from .nemotron_adapter import NemotronAdapter
from .openai_compatible_adapter import OpenAICompatibleAdapter


def resolve_provider(
    requested_provider: str,
    settings: OrchestratorSettings,
    *,
    input_payload: dict[str, Any] | None = None,
    data_privacy_class: DataPrivacyClass | None = None,
    step_contract: StepContract | None = None,
) -> str:
    """Resolve effective provider based on policy and capability constraints."""
    policy_engine = PrivacyPolicyEngine()
    capabilities = ModelCapabilityRegistry.default()
    effective_step_contract = step_contract or StepContract(
        step_name="provider_summary",
        business_purpose="workflow_model_summary",
    )
    decision = policy_engine.evaluate(
        input_payload=input_payload,
        requested_privacy_class=data_privacy_class,
        onprem_first_for_personal_data=settings.onprem_first_for_personal_data,
        allow_external_fallback_for_scrubbed=settings.allow_external_fallback_for_scrubbed,
    )
    return capabilities.resolve_provider(
        requested_provider=requested_provider,
        onprem_provider=settings.onprem_provider,
        step_contract=effective_step_contract,
        decision=decision,
    )


def get_adapter(
    provider: str,
    settings: OrchestratorSettings,
    *,
    input_payload: dict[str, Any] | None = None,
    data_privacy_class: DataPrivacyClass | None = None,
    step_contract: StepContract | None = None,
) -> ModelAdapter:
    """Return a configured provider adapter by id."""
    provider = resolve_provider(
        provider,
        settings,
        input_payload=input_payload,
        data_privacy_class=data_privacy_class,
        step_contract=step_contract,
    )

    if provider == "anthropic":
        return AnthropicAdapter(model_id=settings.anthropic_model)
    if provider == "openai_compatible":
        return OpenAICompatibleAdapter(
            model_id=settings.nemotron_model,
            endpoint=settings.nemotron_base_url or None,
        )
    if provider == "nemotron":
        return NemotronAdapter(
            model_id=settings.nemotron_model,
            endpoint=settings.nemotron_base_url or None,
            api_key=settings.nemotron_api_key or None,
        )
    raise ValueError(f"Unsupported provider: {provider}")
