"""Tests for server-managed canonical risk template defaults."""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.database import get_db


def _client_with_db(test_db_session) -> TestClient:
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
            "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
        },
    )
    assert login.status_code == 200
    return client


def test_ensure_default_rmf_template_creates_canonical_server_managed_record(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        response = client.put(
            "/api/v1/risk-templates/defaults/RMF",
            json={
                "product": "AI-Diagnostics-Core",
                "created_by": "risk.manager@example.com",
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["template_type"] == "RMF"
        assert payload["template_title"] == "Default RMF Template"
        assert payload["metadata"]["is_default"] is True
        assert payload["metadata"]["managed_by"] == "server"
        assert len(payload["rows"]) == 12
        assert payload["rows"][0]["row_data"]["risk_category"] == "Riskmanagement-Process"
    finally:
        app.dependency_overrides.clear()


def test_get_default_risk_template_returns_existing_canonical_record_without_mutation(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        ensured = client.put(
            "/api/v1/risk-templates/defaults/RMF",
            json={
                "product": "AI-Diagnostics-Core",
                "created_by": "risk.manager@example.com",
            },
        )
        assert ensured.status_code == 200
        ensured_payload = ensured.json()

        fetched = client.get(
            "/api/v1/risk-templates/defaults/RMF?product=AI-Diagnostics-Core"
        )
        assert fetched.status_code == 200
        fetched_payload = fetched.json()

        assert fetched_payload["template_id"] == ensured_payload["template_id"]
        assert fetched_payload["updated_at"] == ensured_payload["updated_at"]
        assert fetched_payload["metadata"]["is_default"] is True
    finally:
        app.dependency_overrides.clear()


def test_get_default_risk_template_returns_404_when_missing(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        response = client.get(
            "/api/v1/risk-templates/defaults/FMEA?product=Unknown-Product"
        )
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_ensure_default_fmea_template_is_idempotent_and_refreshes_rows(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        first = client.put(
            "/api/v1/risk-templates/defaults/FMEA",
            json={
                "product": "AI-Diagnostics-Core",
                "created_by": "risk.manager@example.com",
            },
        )
        assert first.status_code == 200
        first_payload = first.json()

        second = client.put(
            "/api/v1/risk-templates/defaults/FMEA",
            json={
                "product": "AI-Diagnostics-Core",
                "created_by": "architect@example.com",
            },
        )
        assert second.status_code == 200
        second_payload = second.json()

        assert second_payload["template_id"] == first_payload["template_id"]
        assert second_payload["created_by"] == "architect@example.com"
        assert second_payload["metadata"]["is_default"] is True
        assert second_payload["rows"][0]["row_data"]["root_cause"] != ""
        assert second_payload["rows"][0]["row_data"]["post_rpn"] == 4
    finally:
        app.dependency_overrides.clear()


def test_list_risk_templates_excludes_defaults_unless_requested(test_db_session) -> None:
    client = _client_with_db(test_db_session)
    try:
        ensured = client.put(
            "/api/v1/risk-templates/defaults/RMF",
            json={
                "product": "AI-Diagnostics-Core",
                "created_by": "risk.manager@example.com",
            },
        )
        assert ensured.status_code == 200

        created = client.post(
            "/api/v1/risk-templates",
            json={
                "template_type": "RMF",
                "template_title": "Working RMF Copy",
                "product": "AI-Diagnostics-Core",
                "created_by": "risk.manager@example.com",
                "rows": [],
            },
        )
        assert created.status_code == 201

        default_hidden = client.get("/api/v1/risk-templates?template_type=RMF&product=AI-Diagnostics-Core")
        assert default_hidden.status_code == 200
        hidden_payload = default_hidden.json()
        assert hidden_payload["total"] == 1
        assert hidden_payload["items"][0]["template_title"] == "Working RMF Copy"

        include_defaults = client.get(
            "/api/v1/risk-templates?template_type=RMF&product=AI-Diagnostics-Core&include_defaults=true"
        )
        assert include_defaults.status_code == 200
        visible_payload = include_defaults.json()
        assert visible_payload["total"] == 2
        titles = {item["template_title"] for item in visible_payload["items"]}
        assert titles == {"Default RMF Template", "Working RMF Copy"}
    finally:
        app.dependency_overrides.clear()