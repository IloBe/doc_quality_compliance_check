"""API tests for document lock lifecycle."""

from datetime import datetime, timedelta, timezone

from src.doc_quality.models.orm import DocumentLockORM


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


def test_acquire_lock_returns_404_for_unknown_document(client) -> None:
    response = client.post(
        "/api/v1/documents/doc-not-found/lock/acquire",
        json={"actor_id": "Owner A", "ttl_minutes": 30},
    )

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Document not found"


def test_release_lock_without_existing_lock_returns_ok(client) -> None:
    document_id = _create_document(client)

    response = client.post(
        f"/api/v1/documents/{document_id}/lock/release",
        json={"actor_id": "Owner A"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["locked_by"] is None
    assert payload["message"] == "Lock already released"


def test_get_lock_state_clears_expired_lock_and_returns_unlocked(client, test_db_session) -> None:
    document_id = _create_document(client)

    expired_lock = DocumentLockORM(
        document_id=document_id,
        locked_by="Expired Owner",
        locked_at=datetime.now(timezone.utc) - timedelta(minutes=20),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    test_db_session.add(expired_lock)
    test_db_session.commit()

    state = client.get(f"/api/v1/documents/{document_id}/lock")
    assert state.status_code == 200
    payload = state.json()
    assert payload["locked_by"] is None
    assert payload["expires_at"] is None

    persisted_lock = (
        test_db_session.query(DocumentLockORM)
        .filter(DocumentLockORM.document_id == document_id)
        .first()
    )
    assert persisted_lock is None

    listed = client.get("/api/v1/documents")
    assert listed.status_code == 200
    listed_payload = listed.json()["documents"]
    doc_row = next(doc for doc in listed_payload if doc["document_id"] == document_id)
    assert doc_row["locked_by"] is None
