"""Tests for admin governance snapshot API."""
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


def test_governance_snapshot_returns_expected_sections(client) -> None:
    response = client.get("/api/v1/admin/governance/snapshot")
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload.get("metrics"), list)
    assert isinstance(payload.get("policies"), list)
    assert isinstance(payload.get("controls"), list)
    assert isinstance(payload.get("updated_at"), str)

    metric_ids = {item["id"] for item in payload["metrics"]}
    assert "coverage" in metric_ids

    policy_ids = {item["id"] for item in payload["policies"]}
    assert "policy-access-control" in policy_ids

    control_ids = {item["id"] for item in payload["controls"]}
    assert "ctrl-auth-session" in control_ids


def test_governance_snapshot_sets_no_store_cache_headers(client) -> None:
    response = client.get("/api/v1/admin/governance/snapshot")
    assert response.status_code == 200
    assert response.headers.get("Cache-Control") == "no-store"
    assert response.headers.get("Pragma") == "no-cache"


def test_governance_controls_endpoint_lists_items(client) -> None:
    response = client.get("/api/v1/admin/governance/controls")
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload.get("items"), list)
    assert isinstance(payload.get("updated_at"), str)
    assert any(item["id"] == "ctrl-auth-session" for item in payload["items"])


def test_governance_controls_create_and_snapshot_visibility(client) -> None:
    create_response = client.post(
        "/api/v1/admin/governance/controls",
        json={
            "name": "Bridge secure logging policy",
            "framework_id": "eu_ai_act",
            "framework": "EU AI Act Art. 12",
            "control_type": "policy",
            "activation_mode": "baseline",
            "domain_tags": ["medical"],
            "market_tags": ["eu"],
            "objective": "Ensure tamper-evident structured logging.",
            "implementation": "Persist step-level execution and access logs with integrity controls.",
            "evidence": "Audit trail tests",
            "status": "draft",
            "is_active": True,
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["name"] == "Bridge secure logging policy"
    assert created["framework_id"] == "eu_ai_act"

    controls_response = client.get("/api/v1/admin/governance/controls")
    assert controls_response.status_code == 200
    items = controls_response.json()["items"]
    assert any(item["id"] == created["id"] for item in items)

    snapshot_response = client.get("/api/v1/admin/governance/snapshot")
    assert snapshot_response.status_code == 200
    controls = snapshot_response.json()["controls"]
    assert any(item["id"] == created["id"] for item in controls)


def test_governance_snapshot_returns_fresh_objects_per_request(client) -> None:
    first = client.get("/api/v1/admin/governance/snapshot")
    assert first.status_code == 200
    first_payload = first.json()
    first_payload["metrics"][0]["label"] = "tampered-client-value"

    second = client.get("/api/v1/admin/governance/snapshot")
    assert second.status_code == 200
    second_payload = second.json()
    assert second_payload["metrics"][0]["label"] == "Control coverage"


def test_viewer_cannot_access_governance_snapshot(test_db_session, monkeypatch) -> None:
    test_client = _create_authenticated_client_with_roles(test_db_session, monkeypatch, "viewer")
    try:
        response = test_client.get("/api/v1/admin/governance/snapshot")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_viewer_cannot_create_governance_control(test_db_session, monkeypatch) -> None:
    test_client = _create_authenticated_client_with_roles(test_db_session, monkeypatch, "viewer")
    try:
        response = test_client.post(
            "/api/v1/admin/governance/controls",
            json={
                "name": "Viewer disallowed control",
                "framework_id": "gdpr",
                "framework": "GDPR Art. 5",
                "objective": "Should not be persisted",
                "implementation": "Should not be persisted",
                "evidence": "none",
                "status": "draft",
                "is_active": True,
            },
        )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
