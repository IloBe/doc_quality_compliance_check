"""Tests for backend-owned session authentication endpoints."""
from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.config import get_settings
from src.doc_quality.core.database import get_db


def _client_with_db(test_db_session) -> TestClient:
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def _parse_api_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def test_login_issues_session_cookie(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
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
                "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
            },
        )
        assert login.status_code == 200

        me = client.get("/api/v1/auth/me")
        assert me.status_code == 200
        payload = me.json()
        assert payload["email"] == os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid")
        assert isinstance(payload["roles"], list)
    finally:
        app.dependency_overrides.clear()


def test_logout_clears_session(test_db_session) -> None:
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
            json={"email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"), "password": "bad-password"},
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
                "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
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


def test_login_without_remember_me_uses_short_ttl(test_db_session) -> None:
    settings = get_settings()
    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
                "remember_me": False,
            },
        )
        assert response.status_code == 200

        expires_at = _parse_api_datetime(response.json()["expires_at"])
        remaining_minutes = (expires_at - datetime.now(timezone.utc)).total_seconds() / 60.0
        assert settings.session_ttl_short_minutes - 2 <= remaining_minutes <= settings.session_ttl_short_minutes + 2
    finally:
        app.dependency_overrides.clear()


def test_login_with_remember_me_uses_persistent_ttl(test_db_session) -> None:
    settings = get_settings()
    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
                "remember_me": True,
            },
        )
        assert response.status_code == 200

        expires_at = _parse_api_datetime(response.json()["expires_at"])
        remaining_minutes = (expires_at - datetime.now(timezone.utc)).total_seconds() / 60.0
        assert settings.session_ttl_remember_me_minutes - 2 <= remaining_minutes <= settings.session_ttl_remember_me_minutes + 2
    finally:
        app.dependency_overrides.clear()
