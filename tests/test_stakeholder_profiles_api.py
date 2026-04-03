"""Tests for persistent stakeholder profile admin APIs."""
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


def test_stakeholder_profiles_seed_and_list(client) -> None:
    response = client.get("/api/v1/admin/stakeholder-profiles")
    assert response.status_code == 200
    payload = response.json()

    assert "items" in payload
    ids = {item["profile_id"] for item in payload["items"]}
    assert "qm_lead" in ids
    assert "service" in ids


def test_stakeholder_profile_upsert_persists(client) -> None:
    update = client.put(
        "/api/v1/admin/stakeholder-profiles/qm_lead",
        json={
            "title": "QM Lead",
            "description": "Updated governance owner description",
            "permissions": ["doc.edit", "bridge.run", "audit.write"],
            "is_active": True,
        },
    )
    assert update.status_code == 200
    body = update.json()
    assert body["profile_id"] == "qm_lead"
    assert body["description"] == "Updated governance owner description"
    assert body["permissions"] == ["doc.edit", "bridge.run", "audit.write"]

    list_response = client.get("/api/v1/admin/stakeholder-profiles")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    qm_lead = next(item for item in items if item["profile_id"] == "qm_lead")
    assert qm_lead["description"] == "Updated governance owner description"


def test_viewer_role_cannot_access_stakeholder_admin_api(test_db_session, monkeypatch) -> None:
    test_client = _create_authenticated_client_with_roles(test_db_session, monkeypatch, "viewer")
    try:
        response = test_client.get("/api/v1/admin/stakeholder-profiles")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_stakeholder_assignment_add_list_delete(client) -> None:
    add_response = client.post(
        "/api/v1/admin/stakeholder-profiles/qm_lead/employees",
        json={"employee_name": "Alice Example"},
    )
    assert add_response.status_code == 200
    add_payload = add_response.json()
    assert add_payload["profile_id"] == "qm_lead"
    assert add_payload["employee_name"] == "Alice Example"

    list_response = client.get("/api/v1/admin/stakeholder-profiles/qm_lead/employees")
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert any(item["employee_name"] == "Alice Example" for item in list_payload["items"])

    assignment_id = add_payload["assignment_id"]
    delete_response = client.delete(f"/api/v1/admin/stakeholder-profiles/qm_lead/employees/{assignment_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["success"] is True

    list_response_after = client.get("/api/v1/admin/stakeholder-profiles/qm_lead/employees")
    assert list_response_after.status_code == 200
    list_payload_after = list_response_after.json()
    assert all(item["assignment_id"] != assignment_id for item in list_payload_after["items"])


def test_stakeholder_assignment_add_is_case_insensitive_and_delete_is_idempotent(client) -> None:
    first = client.post(
        "/api/v1/admin/stakeholder-profiles/qm_lead/employees",
        json={"employee_name": "Alice Example"},
    )
    assert first.status_code == 200
    first_payload = first.json()

    second = client.post(
        "/api/v1/admin/stakeholder-profiles/qm_lead/employees",
        json={"employee_name": "  alice   example  "},
    )
    assert second.status_code == 200
    second_payload = second.json()
    assert second_payload["assignment_id"] == first_payload["assignment_id"]

    list_response = client.get("/api/v1/admin/stakeholder-profiles/qm_lead/employees")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert len([item for item in items if item["employee_name"].casefold() == "alice example"]) == 1

    delete_first = client.delete(f"/api/v1/admin/stakeholder-profiles/qm_lead/employees/{first_payload['assignment_id']}")
    assert delete_first.status_code == 200
    assert delete_first.json()["success"] is True

    delete_second = client.delete(f"/api/v1/admin/stakeholder-profiles/qm_lead/employees/{first_payload['assignment_id']}")
    assert delete_second.status_code == 200
    assert delete_second.json()["success"] is True


def test_auditor_can_read_stakeholders_but_cannot_mutate_assignments(test_db_session, monkeypatch) -> None:
    test_client = _create_authenticated_client_with_roles(test_db_session, monkeypatch, "auditor")
    try:
        read_profiles = test_client.get("/api/v1/admin/stakeholder-profiles")
        assert read_profiles.status_code == 200

        read_assignments = test_client.get("/api/v1/admin/stakeholder-profiles/qm_lead/employees")
        assert read_assignments.status_code == 200

        add_assignment = test_client.post(
            "/api/v1/admin/stakeholder-profiles/qm_lead/employees",
            json={"employee_name": "Read Only Auditor"},
        )
        assert add_assignment.status_code == 403

        update_profile = test_client.put(
            "/api/v1/admin/stakeholder-profiles/qm_lead",
            json={
                "title": "QM Lead",
                "description": "Attempted mutation by auditor",
                "permissions": ["doc.edit"],
                "is_active": True,
            },
        )
        assert update_profile.status_code == 403
    finally:
        app.dependency_overrides.clear()
