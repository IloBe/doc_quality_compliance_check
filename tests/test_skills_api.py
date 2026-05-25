"""Focused tests for the explicit backend Skills API."""
from __future__ import annotations

import base64

from src.doc_quality.models.orm import AuditEventORM, FindingORM


def test_analyze_persists_document_and_get_document(client, sample_arc42_content: str) -> None:
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "architecture.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200
    document_id = analyze_response.json()["document_id"]

    get_response = client.post("/api/v1/skills/get_document", json={"document_id": document_id})
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["document_id"] == document_id
    assert payload["filename"] == "architecture.md"
    assert payload["document_type"] == "arc42"
    assert payload["extracted_text"] is None
    assert "Introduction and Goals" in (payload.get("extracted_text_preview") or "")
    assert payload["extracted_text_chars"] > 0

    full_get_response = client.post(
        "/api/v1/skills/get_document",
        json={"document_id": document_id, "include_extracted_text": True},
    )
    assert full_get_response.status_code == 200
    full_payload = full_get_response.json()
    assert "Introduction and Goals" in (full_payload.get("extracted_text") or "")


def test_search_documents_returns_persisted_documents(client, sample_arc42_content: str) -> None:
    client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "system-architecture.md", "doc_type": "arc42"},
    )

    search_response = client.post(
        "/api/v1/skills/search_documents",
        json={"query": "architecture", "limit": 5},
    )
    assert search_response.status_code == 200
    results = search_response.json()["results"]
    assert len(results) >= 1
    assert any(item["filename"] == "system-architecture.md" for item in results)
    assert all("extracted_text" not in item for item in results)


def test_extract_text_can_store_and_return_document(client) -> None:
    content = "# Notes\n\nImportant compliance note."
    payload = {
        "filename": "notes.md",
        "content_base64": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "content_type": "text/markdown",
        "store_document": True,
    }
    extract_response = client.post("/api/v1/skills/extract_text", json=payload)
    assert extract_response.status_code == 200
    data = extract_response.json()
    assert data["filename"] == "notes.md"
    assert "Important compliance note" in data["extracted_text"]
    assert data["document_id"] is not None

    get_response = client.post("/api/v1/skills/get_document", json={"document_id": data["document_id"]})
    assert get_response.status_code == 200
    assert get_response.json()["filename"] == "notes.md"


def test_write_finding_requires_persisted_document(client, sample_arc42_content: str) -> None:
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "findings.md", "doc_type": "arc42"},
    )
    document_id = analyze_response.json()["document_id"]

    finding_response = client.post(
        "/api/v1/skills/write_finding",
        json={
            "document_id": document_id,
            "finding_type": "compliance_gap",
            "title": "Missing control evidence",
            "description": "The document lacks explicit control evidence for audit logging.",
            "severity": "high",
            "evidence": {"section": "Concepts"},
        },
    )
    assert finding_response.status_code == 200
    payload = finding_response.json()
    assert payload["document_id"] == document_id
    assert payload["severity"] == "high"
    assert payload["evidence"]["section"] == "Concepts"


def test_log_event_persists_audit_record(client) -> None:
    event_response = client.post(
        "/api/v1/skills/log_event",
        json={
            "event_type": "workflow_run_completed",
            "actor_type": "agent",
            "actor_id": "orchestrator",
            "subject_type": "workflow",
            "subject_id": "run-123",
            "trace_id": "trace-123",
            "correlation_id": "corr-123",
            "payload": {"status": "successful"},
        },
    )
    assert event_response.status_code == 200
    payload = event_response.json()
    assert payload["event_type"] == "workflow_run_completed"
    assert payload["trace_id"] == "trace-123"
    assert payload["payload"]["status"] == "successful"


def test_extract_text_stored_document_persists_privacy_violation_artifacts(client, test_db_session) -> None:
    content = (
        "Patient complaint for chest x-ray in Stockholm hospital with address and age details. "
        "GDPR violation and security violation in LLM GenAI processing, mitigation had no success and happened again."
    )
    payload = {
        "filename": "privacy-notes.md",
        "content_base64": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "content_type": "text/markdown",
        "store_document": True,
        "document_type": "risk_assessment",
    }

    extract_response = client.post("/api/v1/skills/extract_text", json=payload)
    assert extract_response.status_code == 200
    document_id = extract_response.json()["document_id"]
    assert document_id is not None

    finding = (
        test_db_session.query(FindingORM)
        .filter(
            FindingORM.document_id == document_id,
            FindingORM.finding_type == "data_privacy_violation",
        )
        .first()
    )
    assert finding is not None
    assert finding.severity == "high"

    events = (
        test_db_session.query(AuditEventORM)
        .filter(
            AuditEventORM.subject_id == document_id,
            AuditEventORM.event_type == "document.privacy_violation.detected",
        )
        .all()
    )
    assert len(events) >= 1
