"""Tests for admin model policy and active runtime model endpoints."""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.database import get_db


def _create_authenticated_client_with_roles(test_db_session, monkeypatch, roles: str) -> TestClient:
    monkeypatch.setenv("AUTH_MVP_ROLES", roles)

    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    login = test_client.post(
        "/api/v1/auth/login",
        json={
            "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
            "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
        },
    )
    assert login.status_code == 200
    return test_client


def test_model_policy_active_defaults_to_local_llama(client) -> None:
    response = client.get("/api/v1/admin/model-policy/active")
    assert response.status_code == 200

    payload = response.json()
    assert payload["active_model"]["model_id"] == "llama3.1:8b"
    assert payload["active_model"]["provider"] == "ollama"
    assert payload["active_model"]["params"]["temperature"] == 0.2
    assert payload["active_model"]["params"]["top_p"] == 0.9
    assert payload["active_model"]["params"]["top_k"] == 40


def test_app_admin_can_update_model_policy_and_switch_active_model(test_db_session, monkeypatch) -> None:
    test_client = _create_authenticated_client_with_roles(test_db_session, monkeypatch, "app_admin")
    try:
        update = test_client.put(
            "/api/v1/admin/model-policy",
            json={
                "default_model_id": "qwen3:32b",
                "items": [
                    {
                        "model_id": "llama3.1:8b",
                        "display_name": "Llama 3.1 8B",
                        "provider": "ollama",
                        "enabled": True,
                        "priority": 2,
                        "params": {"temperature": 0.2, "top_p": 0.9, "top_k": 40},
                    },
                    {
                        "model_id": "qwen3:32b",
                        "display_name": "Qwen3 32B",
                        "provider": "ollama",
                        "enabled": True,
                        "priority": 1,
                        "params": {"temperature": 0.1, "top_p": 0.8, "top_k": 30},
                    },
                    {
                        "model_id": "claude-3-5-sonnet-20241022",
                        "display_name": "Anthropic Fallback",
                        "provider": "anthropic",
                        "enabled": True,
                        "priority": 50,
                        "params": {"temperature": 0.4, "top_p": 0.95, "top_k": 60},
                    },
                ],
            },
        )
        assert update.status_code == 200
        body = update.json()
        assert body["default_model_id"] == "qwen3:32b"

        active = test_client.get("/api/v1/admin/model-policy/active")
        assert active.status_code == 200
        active_body = active.json()
        assert active_body["active_model"]["model_id"] == "qwen3:32b"
        assert active_body["active_model"]["params"]["temperature"] == 0.1
    finally:
        app.dependency_overrides.clear()


def test_auditor_cannot_update_model_policy(test_db_session, monkeypatch) -> None:
    test_client = _create_authenticated_client_with_roles(test_db_session, monkeypatch, "auditor")
    try:
        response = test_client.put(
            "/api/v1/admin/model-policy",
            json={
                "default_model_id": "llama3.1:8b",
                "items": [
                    {
                        "model_id": "llama3.1:8b",
                        "display_name": "Llama 3.1 8B",
                        "provider": "ollama",
                        "enabled": True,
                        "priority": 1,
                        "params": {"temperature": 0.2, "top_p": 0.9, "top_k": 40},
                    }
                ],
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
