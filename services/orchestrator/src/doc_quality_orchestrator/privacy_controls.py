"""Privacy controls for policy-driven provider routing and sandboxed model execution.

This module centralizes privacy-sensitive orchestration concerns:
- step contracts with explicit purpose/sensitivity metadata,
- policy decisions aligned with privacy classes,
- model capability registry lookup,
- sandboxed execution wrapper for model calls.
"""
from __future__ import annotations

import asyncio
import re
from enum import Enum
from typing import Any

import structlog
from pydantic import BaseModel, Field

from .models import GenerateOptions, ModelMessage, ModelResponse

logger = structlog.get_logger(__name__)
_KNOWN_EXTERNAL_PROVIDERS = {"anthropic", "openai_compatible"}

_EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_NUMERIC_IDENTIFIER_PATTERN = re.compile(r"\b\d{8,}\b")
_SPECIAL_CATEGORY_SIGNAL_KEYS = {
    "ethnicity",
    "racial",
    "political",
    "religion",
    "philosophical",
    "trade_union",
    "genetic",
    "biometric",
    "health_data",
    "sex_life",
    "sexual_orientation",
}
_PERSONAL_DATA_SIGNAL_KEYS = {
    "document_id",
    "document",
    "documents",
    "content",
    "text",
    "context",
    "description",
    "email",
    "name",
    "stakeholder",
    "reviewer",
    "address",
    "passport",
    "driver_license",
    "ssn",
    "account_number",
}


class DataPrivacyClass(str, Enum):
    """Privacy class used by routing and guardrails."""

    PERSONAL_DATA_POSSIBLE = "personal_data_possible"
    NON_PERSONAL = "non_personal"
    SCRUBBED_FALLBACK = "scrubbed_fallback"


class ModelZone(str, Enum):
    """Execution zone constraints for a step contract."""

    ON_PREM_ONLY = "on_prem_only"
    ON_PREM_PREFERRED = "on_prem_preferred"
    EXTERNAL_FALLBACK_ALLOWED = "external_fallback_allowed"


class StepContract(BaseModel):
    """Contract defining one isolated model-processing step.

    The contract enforces explicit purpose and sensitivity metadata so the
    orchestrator can make policy decisions before model invocation.
    """

    step_name: str
    business_purpose: str
    sensitivity_class: DataPrivacyClass = DataPrivacyClass.NON_PERSONAL
    model_zone: ModelZone = ModelZone.ON_PREM_PREFERRED
    max_tokens: int | None = None
    timeout_seconds: float = 60.0


class PolicyDecision(BaseModel):
    """Result of privacy policy evaluation for a step."""

    data_privacy_class: DataPrivacyClass
    model_zone: ModelZone
    allowed_external_fallback: bool
    contains_special_category_data: bool = False
    signals: list[str] = Field(default_factory=list)
    reason: str


class ModelCapability(BaseModel):
    """Capability metadata for provider selection."""

    provider_id: str
    deployment_zone: str
    step_types: list[str] = Field(default_factory=list)
    sensitivity_classes: list[DataPrivacyClass] = Field(default_factory=list)
    approved: bool = True


class SandboxPolicyViolation(RuntimeError):
    """Raised when policy rules prevent model execution."""


class SandboxExecutionError(RuntimeError):
    """Raised when a sandboxed model execution fails."""


class PrivacyPolicyEngine:
    """Evaluate privacy controls for step-level model execution."""

    @staticmethod
    def infer_privacy_class(input_payload: dict[str, Any] | None) -> tuple[DataPrivacyClass, list[str], bool]:
        """Infer the most conservative privacy class from payload signals."""
        if not input_payload:
            return DataPrivacyClass.NON_PERSONAL, [], False

        signals: list[str] = []
        contains_special_category = False
        lowered_keys = {str(key).lower() for key in input_payload.keys()}

        if lowered_keys.intersection(_PERSONAL_DATA_SIGNAL_KEYS):
            signals.append("personal_data_key")
        if lowered_keys.intersection(_SPECIAL_CATEGORY_SIGNAL_KEYS):
            signals.append("special_category_key")
            contains_special_category = True

        for value in input_payload.values():
            if isinstance(value, str):
                if _EMAIL_PATTERN.search(value):
                    signals.append("email_pattern")
                if _NUMERIC_IDENTIFIER_PATTERN.search(value):
                    signals.append("numeric_identifier_pattern")
                if len(value.strip()) >= 256:
                    signals.append("large_text_payload")

        if contains_special_category:
            return DataPrivacyClass.PERSONAL_DATA_POSSIBLE, sorted(set(signals)), True
        if signals:
            return DataPrivacyClass.PERSONAL_DATA_POSSIBLE, sorted(set(signals)), False
        return DataPrivacyClass.NON_PERSONAL, [], False

    def evaluate(
        self,
        *,
        input_payload: dict[str, Any] | None,
        requested_privacy_class: DataPrivacyClass | None,
        onprem_first_for_personal_data: bool,
        allow_external_fallback_for_scrubbed: bool,
    ) -> PolicyDecision:
        """Return step-level policy decision for model execution."""
        inferred_class, signals, contains_special = self.infer_privacy_class(input_payload)
        effective_class = requested_privacy_class or inferred_class

        if effective_class == DataPrivacyClass.PERSONAL_DATA_POSSIBLE and onprem_first_for_personal_data:
            return PolicyDecision(
                data_privacy_class=effective_class,
                model_zone=ModelZone.ON_PREM_ONLY,
                allowed_external_fallback=False,
                contains_special_category_data=contains_special,
                signals=signals,
                reason="personal-data-bearing payload requires on-prem execution",
            )

        if effective_class == DataPrivacyClass.SCRUBBED_FALLBACK:
            return PolicyDecision(
                data_privacy_class=effective_class,
                model_zone=ModelZone.EXTERNAL_FALLBACK_ALLOWED,
                allowed_external_fallback=allow_external_fallback_for_scrubbed,
                contains_special_category_data=contains_special,
                signals=signals,
                reason="scrubbed payload allows controlled fallback",
            )

        return PolicyDecision(
            data_privacy_class=effective_class,
            model_zone=ModelZone.ON_PREM_PREFERRED,
            allowed_external_fallback=allow_external_fallback_for_scrubbed,
            contains_special_category_data=contains_special,
            signals=signals,
            reason="no high-risk personal-data indicators detected",
        )


class ModelCapabilityRegistry:
    """Registry-backed provider selection for step contracts."""

    def __init__(self, capabilities: list[ModelCapability]) -> None:
        self._capabilities = {item.provider_id: item for item in capabilities}

    @classmethod
    def default(cls) -> ModelCapabilityRegistry:
        """Return default capabilities for built-in adapters."""
        return cls(
            capabilities=[
                ModelCapability(
                    provider_id="nemotron",
                    deployment_zone="on_prem",
                    step_types=["workflow_routing", "provider_summary", "model_validator_stage"],
                    sensitivity_classes=[
                        DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
                        DataPrivacyClass.NON_PERSONAL,
                        DataPrivacyClass.SCRUBBED_FALLBACK,
                    ],
                ),
                ModelCapability(
                    provider_id="anthropic",
                    deployment_zone="external",
                    step_types=["workflow_routing", "provider_summary", "model_validator_stage"],
                    sensitivity_classes=[
                        DataPrivacyClass.NON_PERSONAL,
                        DataPrivacyClass.SCRUBBED_FALLBACK,
                    ],
                ),
                ModelCapability(
                    provider_id="openai_compatible",
                    deployment_zone="external",
                    step_types=["workflow_routing", "provider_summary", "model_validator_stage"],
                    sensitivity_classes=[
                        DataPrivacyClass.NON_PERSONAL,
                        DataPrivacyClass.SCRUBBED_FALLBACK,
                    ],
                ),
            ]
        )

    def resolve_provider(
        self,
        *,
        requested_provider: str,
        onprem_provider: str,
        step_contract: StepContract,
        decision: PolicyDecision,
    ) -> str:
        """Resolve the effective provider for a contract under a policy decision."""
        onprem_capability = self._capabilities.get(onprem_provider)
        if decision.model_zone == ModelZone.ON_PREM_ONLY:
            if onprem_capability is None or not onprem_capability.approved:
                raise SandboxPolicyViolation("on-prem provider is not approved in capability registry")
            return onprem_provider

        requested_capability = self._capabilities.get(requested_provider)
        if requested_capability is None or not requested_capability.approved:
            raise SandboxPolicyViolation(f"requested provider '{requested_provider}' is not approved")

        if step_contract.step_name not in requested_capability.step_types:
            logger.warning(
                "step_not_in_provider_capability",
                step_name=step_contract.step_name,
                provider=requested_provider,
            )
            return onprem_provider

        if decision.data_privacy_class not in requested_capability.sensitivity_classes:
            if decision.allowed_external_fallback:
                return requested_provider
            return onprem_provider

        if requested_capability.deployment_zone == "external":
            if decision.model_zone == ModelZone.ON_PREM_ONLY:
                return onprem_provider
            if (
                decision.model_zone == ModelZone.EXTERNAL_FALLBACK_ALLOWED
                and not decision.allowed_external_fallback
            ):
                return onprem_provider
            return requested_provider

        return requested_provider


class SandboxExecutor:
    """Execute model calls with policy checks and timeout isolation."""

    async def execute_model_step(
        self,
        *,
        adapter: Any,
        messages: list[ModelMessage],
        options: GenerateOptions,
        step_contract: StepContract,
        decision: PolicyDecision,
    ) -> ModelResponse:
        """Execute a model call within a logical sandbox boundary.

        This sandbox enforces policy and timeout isolation for each step.
        """
        if (
            decision.model_zone == ModelZone.ON_PREM_ONLY
            and adapter.provider_id in _KNOWN_EXTERNAL_PROVIDERS
        ):
            raise SandboxPolicyViolation(
                "policy requires on-prem execution but selected adapter is external"
            )

        try:
            return await asyncio.wait_for(
                adapter.generate(messages=messages, options=options),
                timeout=step_contract.timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise SandboxExecutionError(
                f"sandbox timeout exceeded for step '{step_contract.step_name}'"
            ) from exc
        except SandboxPolicyViolation:
            raise
        except Exception as exc:  # pragma: no cover
            raise SandboxExecutionError(
                f"sandbox execution failed for step '{step_contract.step_name}': {exc}"
            ) from exc
