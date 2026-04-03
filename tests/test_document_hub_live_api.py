"""Integration-style API test for Document Hub live core backend path.

Covers:
- document upload
- document list retrieval
- lock acquire/release lifecycle
"""

from io import BytesIO


def test_document_hub_live_core_path_upload_list_lock_release(client) -> None:
    # 1) Upload document (backend persistence path)
    file_content = b"# Architecture\n\nDocument Hub core path test document."
    upload = client.post(
        "/api/v1/documents/upload",
        files={"file": ("hub-core.md", BytesIO(file_content), "text/markdown")},
    )

    assert upload.status_code == 200
    upload_payload = upload.json()
    document_id = upload_payload["document_id"]
    assert document_id

    # 2) List documents and verify uploaded document appears
    listed = client.get("/api/v1/documents")
    assert listed.status_code == 200
    docs = listed.json()["documents"]
    assert any(doc["document_id"] == document_id for doc in docs)

    # 3) Acquire lock and verify lock owner in lock state + list response
    acquire = client.post(
        f"/api/v1/documents/{document_id}/lock/acquire",
        json={"actor_id": "doc-hub-user@example.invalid", "ttl_minutes": 30},
    )
    assert acquire.status_code == 200
    assert acquire.json()["locked_by"] == "doc-hub-user@example.invalid"

    lock_state = client.get(f"/api/v1/documents/{document_id}/lock")
    assert lock_state.status_code == 200
    assert lock_state.json()["locked_by"] == "doc-hub-user@example.invalid"

    listed_with_lock = client.get("/api/v1/documents")
    assert listed_with_lock.status_code == 200
    docs_with_lock = listed_with_lock.json()["documents"]
    uploaded_row = next(doc for doc in docs_with_lock if doc["document_id"] == document_id)
    assert uploaded_row["locked_by"] == "doc-hub-user@example.invalid"

    # 4) Release lock and verify unlocked state
    release = client.post(
        f"/api/v1/documents/{document_id}/lock/release",
        json={"actor_id": "doc-hub-user@example.invalid"},
    )
    assert release.status_code == 200
    assert release.json()["locked_by"] is None

    lock_state_after_release = client.get(f"/api/v1/documents/{document_id}/lock")
    assert lock_state_after_release.status_code == 200
    assert lock_state_after_release.json()["locked_by"] is None
