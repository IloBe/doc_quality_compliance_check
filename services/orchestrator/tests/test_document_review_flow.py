from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

from doc_quality_orchestrator.config import OrchestratorSettings
from doc_quality_orchestrator.flows.document_review_flow import DocumentReviewFlow
from doc_quality_orchestrator.models import ModelResponse, WorkflowRunRequest


class FakeSkillsApi:
    def __init__(self) -> None:
        self.events: list[dict[str, object]] = []

    async def log_event(self, payload: dict[str, object]) -> None:
        self.events.append(payload)


class FakeAdapter:
    def __init__(self, response: ModelResponse | Exception) -> None:
        self.provider_id = "fake-provider"
        self._response = response
        self.calls: list[dict[str, object]] = []

    async def generate(self, *, messages, options):  # type: ignore[no-untyped-def]
        self.calls.append({"messages": messages, "options": options})
        if isinstance(self._response, Exception):
            raise self._response
        return self._response


def make_flow() -> DocumentReviewFlow:
    settings = OrchestratorSettings(
        backend_base_url="http://backend/api/v1",
        anthropic_api_key="test-key",
        model_validator_enabled=True,
    )
    flow = DocumentReviewFlow(settings)
    flow.run_id = "run-123"
    flow.trace_id = "trace-456"
    flow.skills_api = FakeSkillsApi()
    return flow


def make_request() -> WorkflowRunRequest:
    return WorkflowRunRequest(
        workflow_id="generate_audit_package",
        provider="anthropic",
        input_payload={"document_id": "doc-9"},
    )


def test_extract_model_validator_report_accepts_dict_payload() -> None:
    report = DocumentReviewFlow._extract_model_validator_report(
        {
            "decision": "review",
            "summary": "Needs human verification",
            "issues": ["missing citation"],
            "checks": ["evidence_signal_present"],
        },
        "",
    )

    assert report.decision == "review"
    assert report.issues == ["missing citation"]


def test_extract_model_validator_report_rejects_invalid_decision() -> None:
    with pytest.raises(ValidationError):
        DocumentReviewFlow._extract_model_validator_report(
            {"decision": "maybe", "summary": "invalid", "issues": [], "checks": []},
            "",
        )


@pytest.mark.asyncio
async def test_run_model_validator_stage_returns_completed_for_valid_structured_output() -> None:
    flow = make_flow()
    adapter = FakeAdapter(
        ModelResponse(
            content="",
            json={
                "decision": "pass",
                "summary": "Output is consistent",
                "issues": [],
                "checks": ["final_verdict_consistency"],
            },
            model_id="validator-1",
            provider_id="fake-provider",
        )
    )

    result = await flow._run_model_validator_stage(
        adapter=adapter,
        request=make_request(),
        raw_output="VERIFIED: PASS",
        verified_pass=True,
        document_id="doc-9",
    )

    assert result.stage_status == "completed"
    assert result.report is not None
    assert result.report.decision == "pass"
    assert result.provider_id == "fake-provider"
    assert result.model_id == "validator-1"
    assert len(adapter.calls) == 1
    skills_api = flow.skills_api
    assert isinstance(skills_api, FakeSkillsApi)
    assert [event["event_type"] for event in skills_api.events] == [
        "model_validator_stage_started",
        "model_validator_stage_completed",
    ]


@pytest.mark.asyncio
async def test_run_model_validator_stage_skips_invalid_json_response() -> None:
    flow = make_flow()
    adapter = FakeAdapter(
        ModelResponse(
            content=json.dumps(
                {
                    "decision": "pass",
                    "summary": "Looks fine",
                    "issues": "not-a-list",
                    "checks": [],
                }
            ),
            json=None,
            model_id="validator-1",
            provider_id="fake-provider",
        )
    )

    result = await flow._run_model_validator_stage(
        adapter=adapter,
        request=make_request(),
        raw_output="VERIFIED: PASS",
        verified_pass=True,
        document_id="doc-9",
    )

    assert result.stage_status == "skipped"
    assert result.reason is not None
    assert result.reason.startswith("invalid_response:")
    skills_api = flow.skills_api
    assert isinstance(skills_api, FakeSkillsApi)
    assert [event["event_type"] for event in skills_api.events] == [
        "model_validator_stage_started",
        "model_validator_stage_skipped",
    ]


@pytest.mark.asyncio
async def test_run_model_validator_stage_skips_when_output_empty() -> None:
    flow = make_flow()
    adapter = FakeAdapter(
        ModelResponse(
            content="{}",
            json={},
            model_id="validator-1",
            provider_id="fake-provider",
        )
    )

    result = await flow._run_model_validator_stage(
        adapter=adapter,
        request=make_request(),
        raw_output="   ",
        verified_pass=False,
        document_id="doc-9",
    )

    assert result.stage_status == "skipped"
    assert result.reason == "empty_crew_output"
    skills_api = flow.skills_api
    assert isinstance(skills_api, FakeSkillsApi)
    assert skills_api.events == []


def test_resolve_routing_mode_forced_crewai_falls_back_when_disabled() -> None:
    settings = OrchestratorSettings(crewai_workflow_enabled=False)
    flow = DocumentReviewFlow(settings)

    request = WorkflowRunRequest(
        workflow_id="generate_audit_package",
        provider="anthropic",
        routing_mode="crewai_workflow",
    )

    assert flow._resolve_routing_mode(request) == "single_agent_wrapper"
