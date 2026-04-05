"""API tests for template listing and retrieval routes."""
from __future__ import annotations


def test_templates_list_route_returns_template_metadata(client) -> None:
    response = client.get("/api/v1/templates/")

    assert response.status_code == 200
    payload = response.json()
    assert "templates" in payload
    assert len(payload["templates"]) >= 10
    assert any(item["id"] == "business_goals" and item["active"] is True for item in payload["templates"])
    assert any(item["id"] == "test_strategy" and item["active"] is False for item in payload["templates"])


def test_templates_index_route_returns_plaintext_markdown(client) -> None:
    response = client.get("/api/v1/templates/index")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "# Document Templates Index" in response.text
    assert "Active Templates" in response.text
    assert "business_goals" in response.text


def test_get_active_template_route_returns_shipped_template_content(client) -> None:
    response = client.get("/api/v1/templates/business_goals")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "# Business and Product Goals" in response.text
    assert "Executive Summary" in response.text


def test_get_inactive_template_route_returns_placeholder_content(client) -> None:
    response = client.get("/api/v1/templates/test_strategy")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "inactive" in response.text.lower()
    assert "Test Strategy" in response.text


def test_get_unknown_template_route_returns_404(client) -> None:
    response = client.get("/api/v1/templates/not-a-real-template")

    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"].lower()