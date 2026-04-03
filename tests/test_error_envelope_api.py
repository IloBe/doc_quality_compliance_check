"""Tests for standardized API error envelope."""
from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from src.doc_quality.api.main import app
from src.doc_quality.api.routes import auth as auth_routes
from src.doc_quality.core.database import get_db
from src.doc_quality.models.orm import SkillDocumentORM


def test_404_uses_standard_error_envelope() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "not_found"
    assert isinstance(payload["error"]["message"], str)


def test_422_uses_standard_error_envelope() -> None:
    client = TestClient(app)
    response = client.post("/api/v1/auth/login", json={"email": "a"})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "validation_error"
    assert payload["error"]["message"] == "Request validation failed"


def test_500_uses_standard_error_envelope(monkeypatch) -> None:
    def _boom(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(auth_routes, "_find_valid_recovery_token", _boom)

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post("/api/v1/auth/recovery/verify", json={"token": "x" * 16})
    assert response.status_code == 500
    payload = response.json()
    assert payload["error"]["code"] == "internal_error"
    assert payload["error"]["message"] == "Internal server error"


def test_database_operational_error_uses_database_unavailable_envelope() -> None:
    class FailingQuery:
        def filter(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("db down"))

    class FailingSession:
        def query(self, *args, **kwargs):
            return FailingQuery()

        def close(self) -> None:
            return None

    def override_get_db():
        yield FailingSession()

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "mvp-user@example.invalid",
                "password": "CHANGE_ME_BEFORE_USE",
                "remember_me": False,
            },
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"]["code"] == "database_unavailable"
    assert payload["error"]["message"] == "Database unavailable. Start PostgreSQL and retry."


def test_405_uses_standard_error_envelope() -> None:
    client = TestClient(app)
    response = client.post("/health")

    assert response.status_code == 405
    payload = response.json()
    assert payload["error"]["code"] == "method_not_allowed"
    assert isinstance(payload["error"]["message"], str)


def test_conflict_http_exception_with_detail_dict_preserves_envelope_shape(client, test_db_session) -> None:
    doc = SkillDocumentORM(
        document_id="DOC-ERR-ENVELOPE-1",
        filename="doc.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="envelope conflict test",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    first = client.post(
        "/api/v1/documents/DOC-ERR-ENVELOPE-1/lock/acquire",
        json={"actor_id": "alice@example.invalid", "ttl_minutes": 30},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/documents/DOC-ERR-ENVELOPE-1/lock/acquire",
        json={"actor_id": "bob@example.invalid", "ttl_minutes": 30},
    )
    assert second.status_code == 409

    payload = second.json()
    assert payload["error"]["code"] == "conflict"
    assert isinstance(payload["error"]["message"], str)
    assert payload["error"]["locked_by"] == "alice@example.invalid"
