"""Tests for observability and quality telemetry endpoints."""
from __future__ import annotations

from src.doc_quality.models.orm import QualityObservationORM


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


def test_llm_traces_returns_prompt_output_pairs(client, test_db_session) -> None:
    secret_value = "sk-test-12345"
    create_response = client.post(
        "/api/v1/observability/quality-observations",
        json={
            "source_component": "research_agent",
            "aspect": "evaluation",
            "outcome": "info",
            "payload": {
                "llm_prompt": f"Which EU regulations apply to this medical AI use case? API key {secret_value}",
                "llm_output": f"EU AI Act and MDR are applicable with specific obligations. Token {secret_value}",
                "provider": "perplexity",
                "model_used": "sonar-pro",
                "request_id": "req-123",
                "trace_id": "trace-redaction-check",
            },
        },
    )
    assert create_response.status_code == 200

    stored = (
        test_db_session.query(QualityObservationORM)
        .filter(QualityObservationORM.source_component == "research_agent")
        .order_by(QualityObservationORM.created_at.desc())
        .first()
    )
    assert stored is not None
    assert stored.payload.get("redacted_at_write") is True
    assert secret_value not in str(stored.payload)
    assert stored.payload.get("__privacy_meta__", {}).get("retention_class") == "operational"

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
    assert any(item.get("rich_payload") == {} for item in payload["items"])
    assert any("request_id" in item.get("rich_payload_keys", []) for item in payload["items"])

    full_response = client.get("/api/v1/observability/llm-traces?limit=10&window_hours=24&include_content=true")
    assert full_response.status_code == 200
    full_payload = full_response.json()
    assert any(
        item.get("source_component") == "research_agent"
        and item.get("prompt_truncated") is False
        and item.get("output_truncated") is False
        and item.get("prompt_chars", 0) >= len(item.get("prompt", ""))
        and item.get("output_chars", 0) >= len(item.get("output", ""))
        for item in full_payload["items"]
    )
    assert all(secret_value not in item.get("prompt", "") for item in full_payload["items"])
    assert all(secret_value not in item.get("output", "") for item in full_payload["items"])


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


def test_llm_traces_include_debug_trace_requires_access_purpose(client) -> None:
    response = client.get("/api/v1/observability/llm-traces?limit=10&window_hours=24&include_debug_trace=true")
    assert response.status_code == 403
    payload = response.json()["error"]
    assert payload["reason"] == "purpose_based_access_denied"


def test_llm_traces_include_debug_trace_allows_approved_access_purpose(client) -> None:
    response = client.get(
        "/api/v1/observability/llm-traces?limit=10&window_hours=24&include_debug_trace=true",
        headers={"X-Access-Purpose": "incident_response"},
    )
    assert response.status_code == 200


def test_llm_traces_include_debug_trace_rejects_invalid_purpose_format(client) -> None:
    response = client.get(
        "/api/v1/observability/llm-traces?limit=10&window_hours=24&include_debug_trace=true",
        headers={"X-Access-Purpose": "Invalid Purpose"},
    )
    assert response.status_code == 403
    error = response.json()["error"]
    assert error["reason"] == "purpose_based_access_denied"
    assert "invalid_purpose_format" in (error.get("details") or [])


def test_llm_traces_include_debug_trace_rejects_unapproved_purpose(client) -> None:
    response = client.get(
        "/api/v1/observability/llm-traces?limit=10&window_hours=24&include_debug_trace=true",
        headers={"X-Access-Purpose": "quality_review"},
    )
    assert response.status_code == 403
    error = response.json()["error"]
    assert error["reason"] == "purpose_based_access_denied"
    assert any(str(item).startswith("allowed_purposes:") for item in (error.get("details") or []))
