"""API tests for document lock lifecycle."""


def _create_document(client) -> str:
    response = client.post(
        "/api/v1/documents/analyze",
        json={
            "content": "# SOP\n\nLock test document.",
            "filename": "lock-test.md",
            "doc_type": "sop",
        },
    )
    assert response.status_code == 200
    return response.json()["document_id"]


def test_document_lock_acquire_and_release(client) -> None:
    document_id = _create_document(client)

    acquire = client.post(
        f"/api/v1/documents/{document_id}/lock/acquire",
        json={"actor_id": "Maria (QM Lead)", "ttl_minutes": 30},
    )
    assert acquire.status_code == 200
    assert acquire.json()["locked_by"] == "Maria (QM Lead)"

    state = client.get(f"/api/v1/documents/{document_id}/lock")
    assert state.status_code == 200
    assert state.json()["locked_by"] == "Maria (QM Lead)"

    release = client.post(
        f"/api/v1/documents/{document_id}/lock/release",
        json={"actor_id": "Maria (QM Lead)"},
    )
    assert release.status_code == 200
    assert release.json()["locked_by"] is None


def test_document_lock_conflict_and_owner_enforcement(client) -> None:
    document_id = _create_document(client)

    acquire_first = client.post(
        f"/api/v1/documents/{document_id}/lock/acquire",
        json={"actor_id": "Owner A", "ttl_minutes": 30},
    )
    assert acquire_first.status_code == 200

    acquire_conflict = client.post(
        f"/api/v1/documents/{document_id}/lock/acquire",
        json={"actor_id": "Owner B", "ttl_minutes": 30},
    )
    assert acquire_conflict.status_code == 409
    assert acquire_conflict.json()["error"]["message"].startswith("Document is already locked")

    release_wrong_owner = client.post(
        f"/api/v1/documents/{document_id}/lock/release",
        json={"actor_id": "Owner B"},
    )
    assert release_wrong_owner.status_code == 403
    assert release_wrong_owner.json()["error"]["message"].startswith("Only current lock owner")
