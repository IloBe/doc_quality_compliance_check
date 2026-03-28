"""Tests for standardized API error envelope."""
from __future__ import annotations

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.api.routes import auth as auth_routes


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
