"""Tests for backend-owned session authentication endpoints."""
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


def test_login_issues_session_cookie(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "change-me"),
            },
        )
        assert response.status_code == 200
        assert "dq_session" in response.cookies
    finally:
        app.dependency_overrides.clear()


def test_me_returns_user_after_login(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "change-me"),
            },
        )
        assert login.status_code == 200

        me = client.get("/api/v1/auth/me")
        assert me.status_code == 200
        payload = me.json()
        assert payload["email"] == os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")
        assert isinstance(payload["roles"], list)
    finally:
        app.dependency_overrides.clear()


def test_logout_clears_session(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "change-me"),
            },
        )
        assert login.status_code == 200

        logout = client.post("/api/v1/auth/logout")
        assert logout.status_code == 200

        me = client.get("/api/v1/auth/me")
        assert me.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_login_rejects_invalid_password(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "demo@quality-station.ai", "password": "bad-password"},
        )
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_rbac_denies_insufficient_role_for_report_generation(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("AUTH_MVP_ROLES", "viewer")

    client = _client_with_db(test_db_session)
    try:
        login = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "change-me"),
            },
        )
        assert login.status_code == 200

        response = client.post(
            "/api/v1/reports/generate",
            json={
                "document_id": "doc-rbac-1",
                "report_type": "document_analysis",
                "report_format": "json",
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
