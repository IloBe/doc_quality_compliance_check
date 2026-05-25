"""Unit tests for step policy contract validation and bridge defaults."""

from src.doc_quality.models.compliance import (
    DataPrivacyClass,
    InferenceLocation,
    StepPolicyContract,
)
from src.doc_quality.services.policy_contract_service import (
    PolicyContractValidationError,
    build_default_step_policy_contract,
    validate_step_policy_contract,
)


def test_validate_step_policy_contract_rejects_invalid_personal_data_route() -> None:
    contract = {
        "step_id": "bridge_step_1",
        "step_name": "bridge_inspection",
        "sensitivity_class": DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
        "policy_rule_id": "policy.bridge.invalid_route.v1",
        "decision_reason": "This route is intentionally invalid for test coverage.",
        "selected_inference_location": InferenceLocation.EXTERNAL_FALLBACK,
        "allowed_tools": ["document_read"],
    }

    try:
        validate_step_policy_contract(contract)
        raise AssertionError("Expected PolicyContractValidationError")
    except PolicyContractValidationError as exc:
        assert "on_prem" in str(exc).lower() or "on-prem" in str(exc).lower()
        assert len(exc.action_points) >= 1


def test_build_default_step_policy_contract_for_local_step() -> None:
    contract = build_default_step_policy_contract(
        step_id="bridge_step_1",
        step_name="bridge_inspection",
        processed_locally=True,
        allowed_tools=["document_read", "audit_event_write"],
    )

    assert isinstance(contract, StepPolicyContract)
    assert contract.sensitivity_class == DataPrivacyClass.PERSONAL_DATA_POSSIBLE
    assert contract.selected_inference_location == InferenceLocation.ON_PREM
    assert contract.policy_rule_id == "policy.bridge.on_prem_required.v1"


def test_validate_step_policy_contract_normalizes_allowed_tools() -> None:
    contract = {
        "step_id": "bridge_step_2",
        "step_name": "bridge_compliance",
        "sensitivity_class": DataPrivacyClass.NON_PERSONAL,
        "policy_rule_id": "policy.bridge.non_personal.v1",
        "decision_reason": "Non-personal compliance summary route.",
        "selected_inference_location": InferenceLocation.EXTERNAL_FALLBACK,
        "allowed_tools": ["document_read", "document_read", "  ", "compliance_rules"],
    }

    try:
        validate_step_policy_contract(contract)
        raise AssertionError("Expected duplicate tool validation error")
    except PolicyContractValidationError:
        pass
