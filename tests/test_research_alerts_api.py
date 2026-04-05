"""API tests for persisted compliance alert archive routes."""
from __future__ import annotations

from src.doc_quality.models.orm import AuditEventORM


def test_research_alert_archive_returns_persisted_demo_rows(client, test_db_session) -> None:
    response = client.get("/api/v1/research/alerts?limit=10")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 5
    frameworks = {item["framework"] for item in payload["items"]}
    assert {"EU AI Act", "GDPR", "HIPAA"}.issubset(frameworks)
    assert all(item["payload_snapshot"]["is_demo"] is True for item in payload["items"])

    rows = (
        test_db_session.query(AuditEventORM)
        .filter(AuditEventORM.event_type == "research.compliance_alert.detected")
        .all()
    )
    assert len(rows) == 5
    assert rows[0].subject_type == "compliance_alert"


def test_research_alert_archive_supports_framework_filter(client, test_db_session) -> None:
    response = client.get("/api/v1/research/alerts?framework=GDPR&limit=10")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 2
    assert all(item["framework"] == "GDPR" for item in payload["items"])
    assert all(item["provider"] == "perplexity_demo_seed" for item in payload["items"])


def test_research_alert_archive_supports_severity_filter(client, test_db_session) -> None:
    response = client.get("/api/v1/research/alerts?severity=warning&limit=10")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 2
    assert all(item["severity"] == "warning" for item in payload["items"])


def test_research_alert_archive_supports_date_range_filter(client, test_db_session) -> None:
    response = client.get("/api/v1/research/alerts?start_date=2026-04-04&end_date=2026-04-05&limit=10")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 3
    assert all(item["framework"] in {"EU AI Act", "GDPR", "HIPAA"} for item in payload["items"])
