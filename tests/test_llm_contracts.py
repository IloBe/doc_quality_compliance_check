from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from doc_quality_orchestrator.config import OrchestratorSettings
from doc_quality_orchestrator.flows.document_review_flow import DocumentReviewFlow, ModelValidatorReport
from doc_quality_orchestrator.models import ModelResponse, WorkflowRunRequest


_FIXTURES_DIR = Path(__file__).with_name("fixtures")


class RecordingSkillsApi:
    def __init__(self) -> None:
        self.events: list[dict[str, object]] = []

    async def log_event(self, payload: dict[str, object]) -> None:
        self.events.append(payload)


class RecordingAdapter:
    def __init__(self, response: ModelResponse) -> None:
        self.provider_id = "fake-provider"
        self.response = response
        self.calls: list[dict[str, object]] = []

    async def generate(self, *, messages, options):  # type: ignore[no-untyped-def]
        self.calls.append({"messages": messages, "options": options})
        return self.response


def _load_fixture(name: str) -> dict[str, object]:
    return json.loads((_FIXTURES_DIR / name).read_text(encoding="utf-8"))


def _make_flow() -> DocumentReviewFlow:
    flow = DocumentReviewFlow(
        OrchestratorSettings(
            backend_base_url="http://backend/api/v1",
            anthropic_api_key="test-key",
            model_validator_enabled=True,
            model_validator_max_tokens=321,
        )
    )
    flow.run_id = "run-contract-1"
    flow.trace_id = "trace-contract-1"
    flow.skills_api = RecordingSkillsApi()
    return flow


def _make_request() -> WorkflowRunRequest:
    return WorkflowRunRequest(
        workflow_id="generate_audit_package",
        provider="anthropic",
        input_payload={"document_id": "DOC-123"},
    )


def test_model_validator_report_valid_fixture_matches_schema() -> None:
    payload = _load_fixture("model_validator_report_valid.json")

    report = ModelValidatorReport.model_validate(payload)

    assert report.decision == "pass"
    assert report.issues == []
    assert set(report.checks) == {
        "final_verdict_consistency",
        "unsupported_language_scan",
        "evidence_signal_present",
    }


def test_model_validator_report_invalid_fixture_fails_schema_validation() -> None:
    payload = _load_fixture("model_validator_report_invalid_missing_checks.json")

    with pytest.raises(ValidationError):
        ModelValidatorReport.model_validate(payload)


def test_model_validator_prompt_renders_without_unfilled_placeholders() -> None:
    flow = _make_flow()
    prompt = flow._load_validator_prompt("model_validator_stage_v1")

    rendered = prompt.format(
        workflow_id="generate_audit_package",
        run_id="run-contract-1",
        trace_id="trace-contract-1",
        document_id="DOC-123",
        verified_pass="true",
        required_checks="- final_verdict_consistency\n- unsupported_language_scan",
        raw_output="VERIFIED: PASS\nEvidence: citation-1",
    )

    assert "{workflow_id}" not in rendered
    assert "{raw_output}" not in rendered
    assert "generate_audit_package" in rendered
    assert "DOC-123" in rendered
    assert "VERIFIED: PASS" in rendered
    assert "- final_verdict_consistency" in rendered


@pytest.mark.asyncio
async def test_model_validator_stage_uses_deterministic_schema_bound_options() -> None:
    flow = _make_flow()
    adapter = RecordingAdapter(
        ModelResponse(
            content="",
            json=_load_fixture("model_validator_report_valid.json"),
            model_id="validator-contract-1",
            provider_id="fake-provider",
        )
    )

    result = await flow._run_model_validator_stage(
        adapter=adapter,
        request=_make_request(),
        raw_output="VERIFIED: PASS\nEvidence: section 4.2",
        verified_pass=True,
        document_id="DOC-123",
    )

    assert result.stage_status == "completed"
    assert len(adapter.calls) == 1
    call = adapter.calls[0]
    options = call["options"]
    messages = call["messages"]

    assert options.temperature == 0.0
    assert options.max_tokens == 321
    assert options.response_schema == ModelValidatorReport.model_json_schema()
    assert messages[0].content == "Return JSON only and follow the response schema exactly."
    assert "You are the post-crew validation stage" in messages[1].content
    assert "DOC-123" in messages[1].content
    assert "VERIFIED: PASS" in messages[1].content
