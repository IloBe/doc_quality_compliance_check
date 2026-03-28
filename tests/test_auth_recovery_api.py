"""Tests for password recovery flow endpoints."""
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


def test_recovery_request_returns_generic_success_without_debug_token_by_default(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/auth/recovery/request",
            json={"email": os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")},
        )
        assert response.status_code == 202
        payload = response.json()
        assert payload["success"] is True
        assert "If the account exists" in payload["message"]
        assert payload.get("debug_token") is None
        assert payload.get("reset_url") is None
    finally:
        app.dependency_overrides.clear()


def test_recovery_request_can_expose_debug_token_only_when_explicitly_enabled(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN", "true")

    client = _client_with_db(test_db_session)
    try:
        response = client.post(
            "/api/v1/auth/recovery/request",
            json={"email": os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")},
        )
        assert response.status_code == 202
        payload = response.json()
        assert payload.get("debug_token")
        assert payload.get("reset_url")
    finally:
        app.dependency_overrides.clear()


def test_recovery_verify_accepts_valid_debug_token_when_enabled(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN", "true")

    client = _client_with_db(test_db_session)
    try:
        request_response = client.post(
            "/api/v1/auth/recovery/request",
            json={"email": os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")},
        )
        assert request_response.status_code == 202
        token = request_response.json().get("debug_token")
        assert token

        verify_response = client.post("/api/v1/auth/recovery/verify", json={"token": token})
        assert verify_response.status_code == 200
        assert verify_response.json()["valid"] is True
    finally:
        app.dependency_overrides.clear()


def test_recovery_reset_updates_password_and_revokes_old_password(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN", "true")

    client = _client_with_db(test_db_session)
    try:
        email = os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")
        old_password = os.environ.get("AUTH_MVP_PASSWORD", "change-me")
        new_password = "Change-Me-Now-123!"

        request_response = client.post("/api/v1/auth/recovery/request", json={"email": email})
        assert request_response.status_code == 202
        token = request_response.json().get("debug_token")
        assert token

        reset_response = client.post(
            "/api/v1/auth/recovery/reset",
            json={"token": token, "new_password": new_password},
        )
        assert reset_response.status_code == 200
        assert reset_response.json()["success"] is True

        old_login = client.post("/api/v1/auth/login", json={"email": email, "password": old_password})
        assert old_login.status_code == 401

        new_login = client.post("/api/v1/auth/login", json={"email": email, "password": new_password})
        assert new_login.status_code == 200
    finally:
        app.dependency_overrides.clear()
