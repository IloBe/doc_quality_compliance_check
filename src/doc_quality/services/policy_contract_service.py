"""Policy contract helpers for privacy-aware model step enforcement.

This service keeps policy-contract validation separate from route handlers and
bridge execution plumbing to preserve single-responsibility boundaries.
"""
from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from ..models.compliance import (
    DataPrivacyClass,
    InferenceLocation,
    StepPolicyContract,
)


class PolicyContractValidationError(ValueError):
    """Raised when a step policy contract is invalid or unsafe."""

    def __init__(
        self,
        message: str,
        *,
        action_points: list[str] | None = None,
        reason: str = "bridge_step_policy_invalid",
    ) -> None:
        super().__init__(message)
        self.action_points = action_points or []
        self.reason = reason


class PolicyContractViolationError(PolicyContractValidationError):
    """Raised when mandatory policy-contract metadata violates PSC rules."""


def validate_step_policy_contract(contract: StepPolicyContract | Mapping[str, Any]) -> StepPolicyContract:
    """Validate and normalize one step policy contract payload.

    Args:
        contract: Typed step policy contract or mapping payload.

    Returns:
        A validated ``StepPolicyContract`` instance.

    Raises:
        PolicyContractValidationError: if validation fails.
    """
    try:
        validated = (
            contract
            if isinstance(contract, StepPolicyContract)
            else StepPolicyContract.model_validate(dict(contract))
        )
    except Exception as exc:
        detail = str(exc) or "Step policy contract is invalid."
        raise PolicyContractViolationError(
            detail,
            action_points=[
                "Review required policy metadata fields for this workflow step.",
                "Ensure sensitivity_class, policy_rule_id, and selected_inference_location are set.",
            ],
        ) from exc

    if not validated.policy_rule_id.startswith("policy."):
        raise PolicyContractViolationError(
            "policy_rule_id must start with 'policy.'",
            action_points=[
                "Update policy_rule_id to use the canonical policy namespace.",
            ],
        )

    if (
        validated.sensitivity_class == DataPrivacyClass.PERSONAL_DATA_POSSIBLE
        and validated.selected_inference_location != InferenceLocation.ON_PREM
    ):
        raise PolicyContractViolationError(
            "personal_data_possible steps must be routed on-prem.",
            action_points=[
                "Select on-prem model execution for this step.",
                "Do not route personal-data-possible steps to external fallback.",
            ],
        )

    return validated


def build_default_step_policy_contract(
    *,
    step_id: str,
    step_name: str,
    processed_locally: bool,
    allowed_tools: Sequence[str] | None = None,
) -> StepPolicyContract:
    """Build a default bridge step policy contract from sandbox execution metadata."""
    if processed_locally:
        contract = StepPolicyContract(
            step_id=step_id,
            step_name=step_name,
            sensitivity_class=DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
            policy_rule_id="policy.bridge.on_prem_required.v1",
            decision_reason="Bridge step processes sensitive context and must stay on-prem.",
            selected_inference_location=InferenceLocation.ON_PREM,
            allowed_tools=list(allowed_tools or []),
        )
    else:
        contract = StepPolicyContract(
            step_id=step_id,
            step_name=step_name,
            sensitivity_class=DataPrivacyClass.SCRUBBED_FALLBACK,
            policy_rule_id="policy.bridge.scrubbed_fallback.v1",
            decision_reason="External fallback is allowed only for scrubbed bridge step payloads.",
            selected_inference_location=InferenceLocation.EXTERNAL_FALLBACK,
            allowed_tools=list(allowed_tools or []),
        )

    return validate_step_policy_contract(contract)
