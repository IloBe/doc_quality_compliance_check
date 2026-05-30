"""Integration tests for authenticated API workflows."""

from __future__ import annotations

import base64

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.config import get_settings
from src.doc_quality.core.database import get_db


def _make_ascii_base64_payload(size_bytes: int) -> str:
    """Build deterministic base64 payload with exact decoded byte size."""
    return base64.b64encode(("x" * size_bytes).encode("utf-8")).decode("ascii")


def test_protected_route_rejects_invalid_api_key(test_db_session) -> None:
    """Protected endpoints must reject wrong credentials."""

    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/skills/search_documents",
            headers={"X-API-Key": "wrong-key"},
            json={"query": "arc42"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["message"] == "Authentication required"
    finally:
        app.dependency_overrides.clear()


def test_health_route_is_public() -> None:
    """Health endpoint must stay publicly accessible."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_end_to_end_document_to_finding_to_audit(client, sample_arc42_content: str) -> None:
    """Document analysis, finding creation, and audit logging should work together."""
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "integration-arc42.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200
    document_id = analyze_response.json()["document_id"]

    search_response = client.post(
        "/api/v1/skills/search_documents",
        json={"query": "integration-arc42", "limit": 5},
    )
    assert search_response.status_code == 200
    assert any(item["document_id"] == document_id for item in search_response.json()["results"])

    finding_response = client.post(
        "/api/v1/skills/write_finding",
        json={
            "document_id": document_id,
            "finding_type": "traceability",
            "title": "Add explicit quality scenario mapping",
            "description": "The document should map quality requirements to concrete scenarios.",
            "severity": "medium",
            "evidence": {"section": "Quality Requirements"},
        },
    )
    assert finding_response.status_code == 200
    assert finding_response.json()["document_id"] == document_id

    event_response = client.post(
        "/api/v1/skills/log_event",
        json={
            "event_type": "integration_flow_completed",
            "actor_type": "agent",
            "actor_id": "pytest",
            "subject_type": "document",
            "subject_id": document_id,
            "trace_id": "trace-integration-1",
            "correlation_id": "corr-integration-1",
            "tenant_id": "tenant-integration",
            "org_id": "org-qa",
            "project_id": "proj-doc-quality",
            "payload": {"status": "ok"},
        },
    )
    assert event_response.status_code == 200
    payload = event_response.json()
    assert payload["tenant_id"] == "tenant-integration"
    assert payload["trace_id"] == "trace-integration-1"


def test_extract_text_allows_payload_below_size_limit(client) -> None:
    """Skills extract endpoint should accept content just below configured limit."""
    max_file_size_mb = get_settings().max_file_size_mb
    max_bytes = max_file_size_mb * 1024 * 1024
    near_limit_base64 = _make_ascii_base64_payload(max_bytes - 1)

    response = client.post(
        "/api/v1/skills/extract_text",
        headers={"X-Access-Purpose": "quality_review"},
        json={
            "filename": "near-limit.txt",
            "content_base64": near_limit_base64,
            "content_type": "text/plain",
            "store_document": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["filename"] == "near-limit.txt"


def test_extract_text_allows_payload_at_exact_size_limit(client) -> None:
    """Skills extract endpoint should accept payload exactly at configured limit."""
    max_file_size_mb = get_settings().max_file_size_mb
    max_bytes = max_file_size_mb * 1024 * 1024
    exact_limit_base64 = _make_ascii_base64_payload(max_bytes)

    response = client.post(
        "/api/v1/skills/extract_text",
        headers={"X-Access-Purpose": "quality_review"},
        json={
            "filename": "exact-limit.txt",
            "content_base64": exact_limit_base64,
            "content_type": "text/plain",
            "store_document": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["filename"] == "exact-limit.txt"


def test_extract_text_enforces_size_limit(client) -> None:
    """Skills extract endpoint should reject payload above configured file-size limit."""
    max_file_size_mb = get_settings().max_file_size_mb
    max_bytes = max_file_size_mb * 1024 * 1024
    oversized_base64 = _make_ascii_base64_payload(max_bytes + 1)

    response = client.post(
        "/api/v1/skills/extract_text",
        json={
            "filename": "too-large.txt",
            "content_base64": oversized_base64,
            "content_type": "text/plain",
            "store_document": False,
        },
    )

    assert response.status_code == 400
    assert "exceeds limit" in response.json()["error"]["message"].lower()


def test_report_generation_after_analysis(client, sample_arc42_content: str) -> None:
    """Report generation should succeed for an analyzed document id."""
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "reportable.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200

    document_id = analyze_response.json()["document_id"]
    report_response = client.post(
        "/api/v1/reports/generate",
        json={
            "document_id": document_id,
            "report_type": "document_analysis",
            "report_format": "json",
            "reviewer_name": "QA Engineer",
        },
    )

    assert report_response.status_code == 200
    report_payload = report_response.json()
    assert report_payload["document_id"] == document_id
    assert report_payload["report_format"] == "json"
