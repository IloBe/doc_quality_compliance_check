"""Tests for password recovery flow endpoints."""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.database import get_db
from src.doc_quality.models.orm import PasswordRecoveryTokenORM, UserSessionORM


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


def test_recovery_reset_revokes_active_session_cookie_and_marks_sessions_revoked(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN", "true")

    client = _client_with_db(test_db_session)
    try:
        email = os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")
        old_password = os.environ.get("AUTH_MVP_PASSWORD", "change-me")
        new_password = "Reset-Session-Now-123!"

        login = client.post("/api/v1/auth/login", json={"email": email, "password": old_password})
        assert login.status_code == 200

        request_response = client.post("/api/v1/auth/recovery/request", json={"email": email})
        assert request_response.status_code == 202
        token = request_response.json().get("debug_token")
        assert token

        reset_response = client.post("/api/v1/auth/recovery/reset", json={"token": token, "new_password": new_password})
        assert reset_response.status_code == 200

        me = client.get("/api/v1/auth/me")
        assert me.status_code == 401

        sessions = test_db_session.query(UserSessionORM).filter(UserSessionORM.user_email == email).all()
        assert sessions
        assert all(session.is_revoked is True for session in sessions)

        fresh_login = client.post("/api/v1/auth/login", json={"email": email, "password": new_password})
        assert fresh_login.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_recovery_token_cannot_be_reused_after_successful_reset(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN", "true")

    client = _client_with_db(test_db_session)
    try:
        email = os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")

        request_response = client.post("/api/v1/auth/recovery/request", json={"email": email})
        assert request_response.status_code == 202
        token = request_response.json().get("debug_token")
        assert token

        first_reset = client.post(
            "/api/v1/auth/recovery/reset",
            json={"token": token, "new_password": "First-Reuse-Blocked-123!"},
        )
        assert first_reset.status_code == 200

        second_reset = client.post(
            "/api/v1/auth/recovery/reset",
            json={"token": token, "new_password": "Second-Reuse-Blocked-123!"},
        )
        assert second_reset.status_code == 400
        assert "invalid or expired" in second_reset.json()["error"]["message"].lower()

        stored_token = test_db_session.query(PasswordRecoveryTokenORM).one()
        assert stored_token.used_at is not None
    finally:
        app.dependency_overrides.clear()


def test_recovery_reset_revokes_all_parallel_sessions_across_multiple_clients(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN", "true")

    client_a = _client_with_db(test_db_session)
    client_b = _client_with_db(test_db_session)
    recovery_client = _client_with_db(test_db_session)
    try:
        email = os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")
        old_password = os.environ.get("AUTH_MVP_PASSWORD", "change-me")
        new_password = "Parallel-Sessions-Revoked-123!"

        login_a = client_a.post("/api/v1/auth/login", json={"email": email, "password": old_password})
        login_b = client_b.post("/api/v1/auth/login", json={"email": email, "password": old_password})
        assert login_a.status_code == 200
        assert login_b.status_code == 200

        me_a_before = client_a.get("/api/v1/auth/me")
        me_b_before = client_b.get("/api/v1/auth/me")
        assert me_a_before.status_code == 200
        assert me_b_before.status_code == 200

        request_response = recovery_client.post("/api/v1/auth/recovery/request", json={"email": email})
        assert request_response.status_code == 202
        token = request_response.json().get("debug_token")
        assert token

        reset_response = recovery_client.post(
            "/api/v1/auth/recovery/reset",
            json={"token": token, "new_password": new_password},
        )
        assert reset_response.status_code == 200

        me_a_after = client_a.get("/api/v1/auth/me")
        me_b_after = client_b.get("/api/v1/auth/me")
        assert me_a_after.status_code == 401
        assert me_b_after.status_code == 401
        assert me_a_after.json()["error"]["message"] == "Authentication required"
        assert me_b_after.json()["error"]["message"] == "Authentication required"

        sessions = test_db_session.query(UserSessionORM).filter(UserSessionORM.user_email == email).all()
        assert len(sessions) >= 2
        assert all(session.is_revoked is True for session in sessions)

        relogin = client_a.post("/api/v1/auth/login", json={"email": email, "password": new_password})
        assert relogin.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_recovery_reset_revokes_three_active_sessions_and_blocks_old_cookies(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN", "true")

    client_a = _client_with_db(test_db_session)
    client_b = _client_with_db(test_db_session)
    client_c = _client_with_db(test_db_session)
    recovery_client = _client_with_db(test_db_session)
    try:
        email = os.environ.get("AUTH_MVP_EMAIL", "demo@quality-station.ai")
        old_password = os.environ.get("AUTH_MVP_PASSWORD", "change-me")
        new_password = "Three-Sessions-Revoked-123!"

        for client in (client_a, client_b, client_c):
            login = client.post("/api/v1/auth/login", json={"email": email, "password": old_password})
            assert login.status_code == 200

        for client in (client_a, client_b, client_c):
            before = client.get("/api/v1/auth/me")
            assert before.status_code == 200

        request_response = recovery_client.post("/api/v1/auth/recovery/request", json={"email": email})
        assert request_response.status_code == 202
        token = request_response.json().get("debug_token")
        assert token

        reset_response = recovery_client.post(
            "/api/v1/auth/recovery/reset",
            json={"token": token, "new_password": new_password},
        )
        assert reset_response.status_code == 200

        for client in (client_a, client_b, client_c):
            after = client.get("/api/v1/auth/me")
            assert after.status_code == 401
            assert after.json()["error"]["message"] == "Authentication required"

        sessions = test_db_session.query(UserSessionORM).filter(UserSessionORM.user_email == email).all()
        assert len(sessions) >= 3
        assert all(session.is_revoked is True for session in sessions)

        relogin = client_a.post("/api/v1/auth/login", json={"email": email, "password": new_password})
        assert relogin.status_code == 200
    finally:
        app.dependency_overrides.clear()
