"""API tests for document retrieval and summary routes."""
from __future__ import annotations

from sqlalchemy import text

from src.doc_quality.models.orm import AuditEventORM, FindingORM


def test_get_document_by_id_returns_expected_payload(client, sample_arc42_content: str) -> None:
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "read-target.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200

    created = analyze_response.json()
    document_id = created["document_id"]

    response = client.get(f"/api/v1/documents/{document_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["document_id"] == document_id
    assert payload["filename"] == "read-target.md"
    assert payload["document_type"] == "arc42"
    assert "status" in payload
    assert "overall_score" in payload


def test_get_document_summary_returns_expected_fields(client, sample_arc42_content: str) -> None:
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "summary-target.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200

    document_id = analyze_response.json()["document_id"]

    response = client.get(f"/api/v1/documents/{document_id}/summary")

    assert response.status_code == 200
    payload = response.json()
    assert payload["document_id"] == document_id
    assert payload["filename"] == "summary-target.md"
    assert payload["document_type"] == "arc42"
    assert "locked_by" in payload
    assert "updated_at" in payload


def test_get_document_summary_returns_404_for_unknown_document(client) -> None:
    response = client.get("/api/v1/documents/doc-does-not-exist/summary")

    assert response.status_code == 404
    assert "Document not found" in response.json()["error"]["message"]


def test_get_document_by_id_returns_404_for_unknown_document(client) -> None:
    response = client.get("/api/v1/documents/doc-does-not-exist")

    assert response.status_code == 404
    assert "Document not found" in response.json()["error"]["message"]


def test_documents_analyze_persists_privacy_violation_artifacts(client, test_db_session) -> None:
    privacy_content = (
        "Patient chest x-ray complaint from Stockholm hospital includes address and age/sex context. "
        "GDPR violation with security violation in LLM GenAI processing, mitigation had no success and happened again."
    )

    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={
            "content": privacy_content,
            "filename": "analyze-privacy.md",
            "doc_type": "risk_assessment",
        },
    )
    assert analyze_response.status_code == 200
    document_id = analyze_response.json()["document_id"]

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

    event = (
        test_db_session.query(AuditEventORM)
        .filter(
            AuditEventORM.subject_id == document_id,
            AuditEventORM.event_type == "document.privacy_violation.detected",
        )
        .first()
    )
    assert event is not None


def test_documents_list_recovers_when_lock_table_missing(client, sample_arc42_content: str, test_db_session) -> None:
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "list-lock-fallback.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200

    test_db_session.execute(text("DROP TABLE document_locks"))
    test_db_session.commit()

    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload.get("documents"), list)
    assert any(item["filename"] == "list-lock-fallback.md" for item in payload["documents"])


def test_analyze_reuses_document_id_for_same_filename(client, sample_arc42_content: str) -> None:
    first = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "canonical-same-file.md", "doc_type": "arc42"},
    )
    assert first.status_code == 200
    first_id = first.json()["document_id"]

    second = client.post(
        "/api/v1/documents/analyze",
        json={"content": f"{sample_arc42_content}\nupdated", "filename": "canonical-same-file.md", "doc_type": "arc42"},
    )
    assert second.status_code == 200
    second_id = second.json()["document_id"]

    assert second_id == first_id


def test_document_list_returns_single_card_for_same_filename(client, sample_arc42_content: str) -> None:
    first = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "single-card.md", "doc_type": "arc42"},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/documents/analyze",
        json={"content": f"{sample_arc42_content}\nnew revision", "filename": "single-card.md", "doc_type": "arc42"},
    )
    assert second.status_code == 200

    listing = client.get("/api/v1/documents")
    assert listing.status_code == 200
    payload = listing.json()
    cards = [item for item in payload["documents"] if item["filename"] == "single-card.md"]
    assert len(cards) == 1