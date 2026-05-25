from __future__ import annotations

from pathlib import Path

import pytest

from doc_quality_orchestrator.crews import review_flow


def test_compose_guardrails_validates_structured_intake_output() -> None:
    guardrail = review_flow._compose_guardrails(
        [
            "json_object",
            "required_keys:document_id,filename,document_type,scope_confirmed",
            "schema:intake_output_json",
        ],
        review_flow._OUTPUT_MODEL_REGISTRY,
    )

    ok, payload = guardrail(
        '{"document_id":"doc-1","filename":"policy.pdf","document_type":"policy",'
        '"content_type":"application/pdf","scope_confirmed":true}'
    )

    assert ok is True
    assert payload == {
        "document_id": "doc-1",
        "filename": "policy.pdf",
        "document_type": "policy",
        "content_type": "application/pdf",
        "scope_confirmed": True,
    }


def test_compose_guardrails_rejects_missing_required_keys() -> None:
    guardrail = review_flow._compose_guardrails(
        ["json_object", "required_keys:document_id,filename"],
        review_flow._OUTPUT_MODEL_REGISTRY,
    )

    ok, message = guardrail('{"document_id":"doc-1"}')

    assert ok is False
    assert "missing keys ['filename']" in message


@pytest.mark.parametrize(
    ("value", "expected_ok"),
    [("VERIFIED: PASS", True), ("VERIFIED: FAIL — evidence missing", True), ("PASS", False)],
)
def test_verification_result_guardrail_accepts_only_expected_format(
    value: str,
    expected_ok: bool,
) -> None:
    ok, _ = review_flow._guardrail_verification_result(value)

    assert ok is expected_ok


def test_resolve_guardrail_spec_rejects_unknown_schema() -> None:
    with pytest.raises(RuntimeError, match="Unknown schema guardrail model"):
        review_flow._resolve_guardrail_spec("schema:unknown_model", review_flow._OUTPUT_MODEL_REGISTRY)


def test_build_task_with_config_falls_back_when_task_config_not_supported(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    class FakeTask:
        def __init__(self, *args, **kwargs):
            if "config" in kwargs:
                raise TypeError("config unsupported")
            captured["args"] = args
            captured["kwargs"] = kwargs

    monkeypatch.setattr(review_flow, "Task", FakeTask)

    task = review_flow._build_task_with_config(
        {
            "name": "intake",
            "description": "Collect intake data",
            "expected_output": "JSON object",
            "agent": "intake_agent",
            "output_json": "intake_output_json",
            "guardrails": ["json_object"],
        },
        agent="agent-instance",
        tool_registry={},
        task_registry={},
    )

    assert isinstance(task, FakeTask)
    assert captured["kwargs"]["description"] == "Collect intake data"
    assert captured["kwargs"]["expected_output"] == "JSON object"
    assert captured["kwargs"]["agent"] == "agent-instance"
    assert captured["kwargs"]["output_json"] is review_flow.IntakeTaskOutput
    assert callable(captured["kwargs"]["guardrail"])
    assert "name" not in captured["kwargs"]


def test_build_task_with_config_creates_output_directory(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    captured: dict[str, object] = {}

    class FakeTask:
        def __init__(self, *args, **kwargs):
            captured["kwargs"] = kwargs

    monkeypatch.setattr(review_flow, "Task", FakeTask)

    output_path = tmp_path / "nested" / "audit" / "result.json"

    review_flow._build_task_with_config(
        {
            "description": "Write result",
            "expected_output": "JSON object",
            "agent": "synthesis_agent",
            "output_file": str(output_path),
            "create_directory": True,
        },
        agent="agent-instance",
        tool_registry={},
        task_registry={},
    )

    assert output_path.parent.exists()
    assert captured["kwargs"]["output_file"] == str(output_path)
