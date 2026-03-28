"""Rate-limit and login-throttle tests."""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.database import get_db
from src.doc_quality.core.rate_limit import api_global_limiter, auth_login_throttle


def _client_with_db(test_db_session) -> TestClient:
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_global_rate_limit_returns_429_with_retry_after(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("GLOBAL_RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("GLOBAL_RATE_LIMIT_REQUESTS", "2")
    monkeypatch.setenv("GLOBAL_RATE_LIMIT_WINDOW_SECONDS", "60")
    api_global_limiter.clear()

    client = _client_with_db(test_db_session)
    try:
        email = os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid")

        first = client.post("/api/v1/auth/recovery/request", json={"email": email})
        second = client.post("/api/v1/auth/recovery/request", json={"email": email})
        third = client.post("/api/v1/auth/recovery/request", json={"email": email})

        assert first.status_code == 202
        assert second.status_code in {202, 429}
        assert third.status_code == 429
        assert "Retry-After" in third.headers
        assert third.json()["error"]["code"] == "rate_limited"
    finally:
        app.dependency_overrides.clear()
        api_global_limiter.clear()


def test_login_lockout_after_repeated_failed_attempts(test_db_session, monkeypatch) -> None:
    monkeypatch.setenv("AUTH_LOGIN_RATE_LIMIT_COUNT", "2")
    monkeypatch.setenv("AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS", "600")
    monkeypatch.setenv("AUTH_LOGIN_LOCKOUT_SECONDS", "60")
    auth_login_throttle.clear_all()

    client = _client_with_db(test_db_session)
    try:
        email = os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid")

        first = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong-1"})
        second = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong-2"})
        third = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong-3"})

        assert first.status_code == 401
        assert second.status_code == 429
        assert third.status_code == 429
        assert "Retry-After" in second.headers
        assert second.json()["error"]["code"] == "rate_limited"
    finally:
        app.dependency_overrides.clear()
        auth_login_throttle.clear_all()
