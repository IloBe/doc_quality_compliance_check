"""Tests for dashboard aggregation endpoints."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from src.doc_quality.models.orm import AuditEventORM, FindingORM, ReviewRecordORM, SkillDocumentORM


def test_dashboard_summary_returns_aggregated_metrics(client, test_db_session) -> None:
    now = datetime.now(timezone.utc)

    doc_open = SkillDocumentORM(
        document_id="DOC-OPEN-1",
        filename="risk-plan.md",
        content_type="text/markdown",
        document_type="rmf",
        extracted_text="Risk plan",
        source="skills_extract",
        created_at=now - timedelta(days=10),
        updated_at=now - timedelta(days=2),
    )
    doc_closed = SkillDocumentORM(
        document_id="DOC-CLOSED-1",
        filename="qms-manual.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="QMS",
        source="skills_extract",
        created_at=now - timedelta(days=20),
        updated_at=now - timedelta(days=5),
    )
    test_db_session.add_all([doc_open, doc_closed])

    review_open = ReviewRecordORM(
        review_id="REV-OPEN-1",
        document_id="DOC-OPEN-1",
        status="pending",
        reviewer_name="Alice",
        reviewer_role="qm_lead",
        review_date=now - timedelta(days=2),
        modifications_required=[],
        comments="needs updates",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2),
    )
    review_closed = ReviewRecordORM(
        review_id="REV-CLOSED-1",
        document_id="DOC-CLOSED-1",
        status="approved",
        reviewer_name="Bob",
        reviewer_role="auditor",
        review_date=now - timedelta(days=4),
        approval_date=now - timedelta(days=3),
        modifications_required=[],
        comments="approved",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=3),
    )
    test_db_session.add_all([review_open, review_closed])

    finding_pass = FindingORM(
        finding_id="FIND-PASS-1",
        document_id="DOC-CLOSED-1",
        finding_type="compliance_pass",
        title="EU AI Act Art. 12 logging is compliant",
        description="Compliant",
        severity="low",
        evidence={"standard": "EU AI Act", "article": "Art. 12", "passed": True, "risk_class": "High"},
        created_at=now - timedelta(days=3),
    )
    finding_fail = FindingORM(
        finding_id="FIND-FAIL-1",
        document_id="DOC-OPEN-1",
        finding_type="compliance_gap",
        title="ISO 27001 control gap",
        description="Missing control",
        severity="high",
        evidence={"standard": "ISO 27001", "article": "A.8.15", "passed": False, "risk_class": "Limited"},
        created_at=now - timedelta(days=1),
    )
    test_db_session.add_all([finding_pass, finding_fail])

    bridge_done = AuditEventORM(
        event_id="EV-BRIDGE-1",
        tenant_id="default",
        org_id=None,
        project_id=None,
        event_time=now - timedelta(days=1),
        event_type="bridge.run_done",
        actor_type="system",
        actor_id="bridge",
        subject_type="workflow",
        subject_id="RUN-1",
        trace_id=None,
        correlation_id=None,
        payload={"status": "done"},
        created_at=now - timedelta(days=1),
    )
    test_db_session.add(bridge_done)

    test_db_session.commit()

    response = client.get("/api/v1/dashboard/summary?timeframe=month")
    assert response.status_code == 200

    payload = response.json()
    assert payload["timeframe"] == "month"
    assert payload["kpis"]["open_documents"] == 1
    assert payload["kpis"]["closed_documents"] == 1
    assert payload["kpis"]["active_jobs"] == 1
    assert payload["kpis"]["closed_jobs"] == 1
    assert payload["kpis"]["bridge_runs_done"] == 1
    assert payload["kpis"]["compliance_pass_rate"] == 50
    assert len(payload["documents"]) == 2


def test_dashboard_summary_respects_timeframe_filter(client, test_db_session) -> None:
    now = datetime.now(timezone.utc)

    old_doc = SkillDocumentORM(
        document_id="DOC-OLD-1",
        filename="legacy.md",
        content_type="text/markdown",
        document_type="generic",
        extracted_text="legacy",
        source="skills_extract",
        created_at=now - timedelta(days=500),
        updated_at=now - timedelta(days=500),
    )
    test_db_session.add(old_doc)
    test_db_session.commit()

    response = client.get("/api/v1/dashboard/summary?timeframe=week")
    assert response.status_code == 200
    payload = response.json()
    assert payload["documents"] == []
    assert payload["kpis"]["open_documents"] == 0
    assert payload["kpis"]["closed_documents"] == 0


def test_dashboard_summary_response_contract_shape(client) -> None:
    response = client.get("/api/v1/dashboard/summary?timeframe=month")
    assert response.status_code == 200

    payload = response.json()
    assert set(payload.keys()) == {
        "timeframe",
        "window_start",
        "window_end",
        "kpis",
        "risk_distribution",
        "documents",
    }

    assert set(payload["kpis"].keys()) == {
        "open_documents",
        "closed_documents",
        "active_jobs",
        "closed_jobs",
        "avg_cycle_days",
        "compliance_pass_rate",
        "bridge_runs_done",
    }
    assert set(payload["risk_distribution"].keys()) == {"high", "limited", "minimal"}

    if payload["documents"]:
        doc_row = payload["documents"][0]
        assert set(doc_row.keys()) == {
            "document_id",
            "title",
            "risk_class",
            "cycle_days",
            "passed_checks",
            "failed_checks",
            "checks",
        }
        if doc_row["checks"]:
            check = doc_row["checks"][0]
            assert set(check.keys()) == {"standard", "article", "passed"}
