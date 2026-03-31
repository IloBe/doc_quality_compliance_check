"""Tests for governance-focused audit trail endpoints."""
from __future__ import annotations


def test_audit_trail_events_returns_logged_event(client) -> None:
    log_response = client.post(
        "/api/v1/skills/log_event",
        json={
            "event_type": "bridge.run.approved",
            "actor_type": "user",
            "actor_id": "maria.mueller@qm.local",
            "subject_type": "hitl_review",
            "subject_id": "review-1001",
            "trace_id": "trace-audit-1",
            "correlation_id": "corr-audit-1",
            "payload": {"verdict": "approved", "risk_level": "high"},
        },
    )
    assert log_response.status_code == 200

    list_response = client.get("/api/v1/audit-trail/events?window_hours=24&limit=50")
    assert list_response.status_code == 200
    payload = list_response.json()
    assert "items" in payload
    assert any(
        item.get("event_type") == "bridge.run.approved"
        and item.get("subject_type") == "hitl_review"
        and item.get("subject_id") == "review-1001"
        for item in payload["items"]
    )


def test_audit_trail_events_supports_filters(client) -> None:
    client.post(
        "/api/v1/skills/log_event",
        json={
            "event_type": "auth.login_success",
            "actor_type": "user",
            "actor_id": "auditor.one@qm.local",
            "subject_type": "session",
            "subject_id": "sess-1",
            "payload": {},
        },
    )
    client.post(
        "/api/v1/skills/log_event",
        json={
            "event_type": "bridge.run.completed",
            "actor_type": "agent",
            "actor_id": "orchestrator",
            "subject_type": "workflow",
            "subject_id": "wf-22",
            "payload": {},
        },
    )

    filtered = client.get("/api/v1/audit-trail/events?window_hours=24&event_type=bridge.run&limit=20")
    assert filtered.status_code == 200
    items = filtered.json().get("items", [])
    assert items
    assert all("bridge.run" in (item.get("event_type") or "") for item in items)


def test_audit_trail_event_detail_returns_selected_row_data(client) -> None:
    log_response = client.post(
        "/api/v1/skills/log_event",
        json={
            "event_type": "bridge.run.completed",
            "actor_type": "agent",
            "actor_id": "orchestrator",
            "subject_type": "workflow",
            "subject_id": "wf-9001",
            "payload": {"status": "done", "findings": 3},
        },
    )
    assert log_response.status_code == 200
    event_id = log_response.json().get("event_id")
    assert event_id

    detail_response = client.get(f"/api/v1/audit-trail/events/{event_id}")
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["event_id"] == event_id
    assert detail["subject_id"] == "wf-9001"
    assert detail["payload"].get("findings") == 3


def test_audit_trail_schedule_returns_default_record(client) -> None:
    response = client.get("/api/v1/audit-trail/schedule")
    assert response.status_code == 200
    payload = response.json()
    assert payload["tenant_id"] == "default_tenant"
    assert "schedule_id" in payload
    assert payload["internal_audit_date"] is None
    assert payload["external_audit_date"] is None


def test_audit_trail_schedule_upsert_persists_values(client) -> None:
    put_response = client.put(
        "/api/v1/audit-trail/schedule",
        json={
            "internal_audit_date": "2026-04-28T00:00:00Z",
            "external_audit_date": "2026-05-15T00:00:00Z",
            "external_notified_body": "TUV SUD",
            "tenant_id": "default_tenant",
        },
    )
    assert put_response.status_code == 200
    saved = put_response.json()
    assert saved["external_notified_body"] == "TUV SUD"
    assert saved["internal_audit_date"].startswith("2026-04-28")
    assert saved["external_audit_date"].startswith("2026-05-15")

    get_response = client.get("/api/v1/audit-trail/schedule")
    assert get_response.status_code == 200
    current = get_response.json()
    assert current["external_notified_body"] == "TUV SUD"
    assert current["internal_audit_date"].startswith("2026-04-28")
    assert current["external_audit_date"].startswith("2026-05-15")
