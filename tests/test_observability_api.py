"""Tests for observability and quality telemetry endpoints."""
from __future__ import annotations


def test_quality_observation_persists_and_summarizes(client) -> None:
    create_response = client.post(
        "/api/v1/observability/quality-observations",
        json={
            "source_component": "document_analyzer",
            "aspect": "accuracy",
            "outcome": "pass",
            "score": 0.93,
            "latency_ms": 128.4,
            "hallucination_flag": False,
            "evaluation_dataset": "arc42_smoke_v1",
            "evaluation_metric": "f1",
            "subject_type": "document",
            "subject_id": "doc-1",
            "trace_id": "trace-abc",
            "correlation_id": "corr-abc",
            "payload": {"notes": "manual_review_confirmed"},
        },
    )
    assert create_response.status_code == 200
    payload = create_response.json()
    assert payload["aspect"] == "accuracy"
    assert payload["outcome"] == "pass"
    assert payload["score"] == 0.93
    assert payload["evaluation_dataset"] == "arc42_smoke_v1"

    summary_response = client.get("/api/v1/observability/quality-summary?window_hours=24")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["total_observations"] >= 1
    assert summary["average_score"] is not None
    assert any(item["aspect"] == "accuracy" for item in summary["aspects"])


def test_metrics_endpoint_exposes_observability_metrics(client) -> None:
    response = client.get("/metrics")
    assert response.status_code == 200
    assert (
        "dq_http_requests_total" in response.text
        or "Metrics backend unavailable" in response.text
    )


def test_llm_traces_returns_prompt_output_pairs(client) -> None:
    create_response = client.post(
        "/api/v1/observability/quality-observations",
        json={
            "source_component": "research_agent",
            "aspect": "evaluation",
            "outcome": "info",
            "payload": {
                "llm_prompt": "Which EU regulations apply to this medical AI use case?",
                "llm_output": "EU AI Act and MDR are applicable with specific obligations.",
                "provider": "perplexity",
                "model_used": "sonar-pro",
            },
        },
    )
    assert create_response.status_code == 200

    traces_response = client.get("/api/v1/observability/llm-traces?limit=10&window_hours=24")
    assert traces_response.status_code == 200
    payload = traces_response.json()
    assert "items" in payload
    assert any(
        item.get("source_component") == "research_agent"
        and "medical AI use case" in item.get("prompt", "")
        and "EU AI Act" in item.get("output", "")
        for item in payload["items"]
    )
    assert any("rich_payload" in item for item in payload["items"])


def test_workflow_component_breakdown_returns_component_rows(client) -> None:
    for source_component in ["research_agent", "document_analyzer"]:
        create_response = client.post(
            "/api/v1/observability/quality-observations",
            json={
                "source_component": source_component,
                "aspect": "performance",
                "outcome": "pass",
                "latency_ms": 42.0,
                "payload": {"step": "test_observation"},
            },
        )
        assert create_response.status_code == 200

    breakdown_response = client.get("/api/v1/observability/workflow-components?window_hours=24")
    assert breakdown_response.status_code == 200
    breakdown = breakdown_response.json()
    assert breakdown["total_observations"] >= 2
    assert any(item["source_component"] == "research_agent" for item in breakdown["components"])
    assert any(item["source_component"] == "document_analyzer" for item in breakdown["components"])
