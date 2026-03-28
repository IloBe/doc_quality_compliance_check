"""Authorization boundary tests for protected API endpoints."""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.database import get_db


def _client_with_db(test_db_session) -> TestClient:
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_protected_routes_require_authentication(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/reports/generate",
            json={"document_id": "doc-1", "report_type": "document_analysis", "report_format": "json"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "authentication_required"
    finally:
        app.dependency_overrides.clear()


def test_viewer_role_is_denied_on_admin_actions(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("AUTH_MVP_ROLES", "viewer")

    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
            },
        )
        assert login.status_code == 200

        compliance = client.post(
            "/api/v1/compliance/applicable-regulations",
            json={"domain": "healthcare", "description": "medical documentation", "target_market": "EU"},
        )
        assert compliance.status_code == 403

        research = client.post(
            "/api/v1/research/regulations",
            json={"domain": "medical", "description": "test", "target_market": "EU"},
        )
        assert research.status_code == 403

        report = client.post(
            "/api/v1/reports/generate",
            json={"document_id": "doc-1", "report_type": "document_analysis", "report_format": "json"},
        )
        assert report.status_code == 403
        assert report.json()["error"]["code"] == "forbidden"
    finally:
        app.dependency_overrides.clear()


def test_service_client_allowed_only_on_explicit_machine_endpoints(test_db_session) -> None:
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        service_client = TestClient(app, headers={"X-API-Key": os.environ.get("SECRET_KEY", "test-api-key")})

        allowed = service_client.post("/api/v1/skills/search_documents", json={"query": "arc42"})
        assert allowed.status_code == 200

        denied = service_client.post(
            "/api/v1/reports/generate",
            json={"document_id": "doc-1", "report_type": "document_analysis", "report_format": "json"},
        )
        assert denied.status_code == 403
    finally:
        app.dependency_overrides.clear()
