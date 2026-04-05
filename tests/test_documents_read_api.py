"""API tests for document retrieval and summary routes."""
from __future__ import annotations


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