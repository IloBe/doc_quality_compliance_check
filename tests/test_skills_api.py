"""Focused tests for the explicit backend Skills API."""
from __future__ import annotations

import base64

from src.doc_quality.models.orm import AuditEventORM, FindingORM, SkillDocumentORM


_CONTENT_HEADERS = {"X-Access-Purpose": "quality_review"}


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
        headers=_CONTENT_HEADERS,
    )
    assert full_get_response.status_code == 200
    full_payload = full_get_response.json()
    assert "Introduction and Goals" in (full_payload.get("extracted_text") or "")


def test_get_document_blocks_risky_extracted_text(client) -> None:
    content = (
        "This copyrighted trademark manual should be copied verbatim and redistributed without permission. "
        "Do not modify the source text.")
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": content, "filename": "risky-brief.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200
    document_id = analyze_response.json()["document_id"]

    blocked_response = client.post(
        "/api/v1/skills/get_document",
        json={"document_id": document_id, "include_extracted_text": True},
        headers=_CONTENT_HEADERS,
    )
    assert blocked_response.status_code == 422
    error = blocked_response.json()["error"]
    assert error["reason"] == "skills_output_ip_risk_blocked"
    assert error["output_ip_risk"]["risk_level"] == "high"
    assert error["action_points"]


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
    extract_response = client.post("/api/v1/skills/extract_text", json=payload, headers=_CONTENT_HEADERS)
    assert extract_response.status_code == 200
    data = extract_response.json()
    assert data["filename"] == "notes.md"
    assert "Important compliance note" in data["extracted_text"]
    assert data["document_id"] is not None

    get_response = client.post("/api/v1/skills/get_document", json={"document_id": data["document_id"]})
    assert get_response.status_code == 200
    assert get_response.json()["filename"] == "notes.md"


def test_extract_text_blocks_risky_output_ip_content(client) -> None:
    content = (
        "This copyrighted trademark section should be copied verbatim and reused without permission in the final export. "
        "The source text must remain unchanged.")
    payload = {
        "filename": "risky-export.md",
        "content_base64": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "content_type": "text/markdown",
        "store_document": False,
    }

    extract_response = client.post("/api/v1/skills/extract_text", json=payload, headers=_CONTENT_HEADERS)
    assert extract_response.status_code == 422
    error = extract_response.json()["error"]
    assert error["reason"] == "skills_output_ip_risk_blocked"
    assert error["output_ip_risk"]["risk_level"] == "high"
    assert error["action_points"]


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

    extract_response = client.post("/api/v1/skills/extract_text", json=payload, headers=_CONTENT_HEADERS)
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


def test_document_queries_are_scoped_to_default_tenant(client, sample_arc42_content: str, test_db_session) -> None:
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "tenant-scope.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200
    document_id = analyze_response.json()["document_id"]

    record = test_db_session.query(SkillDocumentORM).filter(SkillDocumentORM.document_id == document_id).one()
    record.tenant_id = "foreign_tenant"
    test_db_session.commit()

    search_response = client.post(
        "/api/v1/skills/search_documents",
        json={"query": "tenant-scope", "limit": 5},
    )
    assert search_response.status_code == 200
    assert all(item["document_id"] != document_id for item in search_response.json()["results"])

    get_response = client.post("/api/v1/skills/get_document", json={"document_id": document_id})
    assert get_response.status_code == 404


def test_extract_text_blocks_sensitive_secret_or_trade_secret_output(client) -> None:
    content = "Contains proprietary trade secret process and token sk-sensitive-1234567890."
    payload = {
        "filename": "sensitive-output.md",
        "content_base64": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "content_type": "text/markdown",
        "store_document": False,
    }

    response = client.post("/api/v1/skills/extract_text", json=payload, headers=_CONTENT_HEADERS)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["reason"] == "skills_sensitive_output_blocked"
    assert error["action_points"]


def test_get_document_blocks_sensitive_secret_or_trade_secret_output(client) -> None:
    content = "Do not share: internal trade secret routing and credential sk-sensitive-abcdef123456."
    extract_response = client.post(
        "/api/v1/skills/extract_text",
        json={
            "filename": "sensitive-document.md",
            "content_base64": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "content_type": "text/markdown",
            "store_document": True,
            "document_type": "arc42",
        },
        headers=_CONTENT_HEADERS,
    )
    # Extract response is expected to be blocked, but document can still be stored in persistence path.
    assert extract_response.status_code == 422

    search_response = client.post(
        "/api/v1/skills/search_documents",
        json={"query": "sensitive-document", "limit": 5},
    )
    assert search_response.status_code == 200
    document_ids = [item["document_id"] for item in search_response.json()["results"]]
    assert document_ids

    get_response = client.post(
        "/api/v1/skills/get_document",
        json={"document_id": document_ids[0], "include_extracted_text": True},
        headers=_CONTENT_HEADERS,
    )
    assert get_response.status_code == 422
    error = get_response.json()["error"]
    assert error["reason"] == "skills_sensitive_output_blocked"


def test_get_document_include_text_requires_access_purpose(client, sample_arc42_content: str) -> None:
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "skills-purpose-required.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200
    document_id = analyze_response.json()["document_id"]

    response = client.post(
        "/api/v1/skills/get_document",
        json={"document_id": document_id, "include_extracted_text": True},
    )
    assert response.status_code == 403
    assert response.json()["error"]["reason"] == "purpose_based_access_denied"


def test_extract_text_requires_access_purpose(client) -> None:
    payload = {
        "filename": "skills-purpose-extract.md",
        "content_base64": base64.b64encode(b"Plain extraction content").decode("ascii"),
        "content_type": "text/markdown",
        "store_document": False,
    }

    response = client.post("/api/v1/skills/extract_text", json=payload)
    assert response.status_code == 403
    assert response.json()["error"]["reason"] == "purpose_based_access_denied"
