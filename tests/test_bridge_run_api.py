"""Tests for bridge EU AI Act compliance run endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
import os
import uuid

from fastapi.testclient import TestClient

from src.doc_quality.api.main import app
from src.doc_quality.core.database import get_db
from src.doc_quality.models.orm import AuditEventORM, BridgeHumanReviewORM, SkillDocumentORM


def _client_with_db(test_db_session) -> TestClient:
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_bridge_run_eu_ai_act_returns_results_and_persists_audit(client, test_db_session) -> None:
    doc = SkillDocumentORM(
        document_id="DOC-BRIDGE-1",
        filename="qmm.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="Risk Management System logging transparency human oversight technical documentation",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    response = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": "DOC-BRIDGE-1",
            "domain_info": {
                "domain": "medical devices",
                "description": "AI diagnostic support tool",
                "uses_ai_ml": True,
                "intended_use": "assist diagnosis",
                "target_market": "EU",
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["document_id"] == "DOC-BRIDGE-1"
    assert payload["framework"] == "eu_ai_act"
    assert isinstance(payload["requirements"], list)
    assert len(payload["requirements"]) > 0
    assert payload["requirements_signature"]
    assert payload["human_review_required"] is True
    assert payload["human_review_status"] == "pending"
    assert payload["regulatory_update"]["requires_document_update"] is False

    events = test_db_session.query(AuditEventORM).filter(AuditEventORM.subject_id == "DOC-BRIDGE-1").all()
    assert any(e.event_type == "bridge.run.completed" for e in events)
    assert not any(e.event_type == "bridge.run.approved" for e in events)


def test_bridge_alert_flags_requirement_drift_since_last_approved_run(client, test_db_session) -> None:
    doc_id = "DOC-BRIDGE-2"
    doc = SkillDocumentORM(
        document_id=doc_id,
        filename="risk.md",
        content_type="text/markdown",
        document_type="risk_assessment",
        extracted_text="risk management data governance technical documentation",
        source="skills_extract",
    )
    test_db_session.add(doc)

    old_approved = AuditEventORM(
        event_id=str(uuid.uuid4()),
        tenant_id="default",
        org_id=None,
        project_id=None,
        event_time=datetime.now(timezone.utc),
        event_type="bridge.run.approved",
        actor_type="system",
        actor_id="bridge",
        subject_type="document",
        subject_id=doc_id,
        trace_id=None,
        correlation_id="legacy-run",
        payload={
            "run_id": "legacy-run",
            "framework": "eu_ai_act",
            "requirements_signature": "legacy-signature-v0",
            "requirements_version": "eu_ai_act:legacy",
            "compliance_score": 0.91,
        },
    )
    test_db_session.add(old_approved)
    test_db_session.commit()

    response = client.get(f"/api/v1/bridge/alerts/eu-ai-act/{doc_id}")
    assert response.status_code == 200
    payload = response.json()

    assert payload["document_id"] == doc_id
    assert payload["regulatory_update"]["has_changed_since_last_approved_run"] is True
    assert payload["regulatory_update"]["requires_document_update"] is True
    assert payload["regulatory_update"]["last_approved_requirements_signature"] == "legacy-signature-v0"


def test_bridge_human_review_approval_is_persisted_and_auditable(client, test_db_session) -> None:
    doc_id = "DOC-BRIDGE-3"
    doc = SkillDocumentORM(
        document_id=doc_id,
        filename="quality.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="quality management controls logging oversight",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    run = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": doc_id,
            "domain_info": {
                "domain": "medical devices",
                "description": "AI quality assistant",
                "uses_ai_ml": True,
                "intended_use": "quality workflow",
                "target_market": "EU",
            },
        },
    )
    assert run.status_code == 200
    run_id = run.json()["run_id"]

    review = client.post(
        f"/api/v1/bridge/runs/{run_id}/human-review",
        json={
            "document_id": doc_id,
            "decision": "approved",
            "reason": "Evidence package and controls are acceptable for release.",
        },
    )
    assert review.status_code == 200
    review_payload = review.json()
    assert review_payload["run_id"] == run_id
    assert review_payload["document_id"] == doc_id
    assert review_payload["decision"] == "approved"
    assert review_payload["reason"]
    assert review_payload["reviewer_email"]
    assert review_payload["reviewed_at"]

    stored = test_db_session.query(BridgeHumanReviewORM).filter(BridgeHumanReviewORM.run_id == run_id).first()
    assert stored is not None
    assert stored.decision == "approved"

    events = test_db_session.query(AuditEventORM).filter(AuditEventORM.correlation_id == run_id).all()
    assert any(e.event_type == "bridge.run.approved" and e.actor_type == "user" for e in events)


def test_bridge_human_review_rejection_requires_next_task_and_stores_assignment(client, test_db_session) -> None:
    doc_id = "DOC-BRIDGE-4"
    doc = SkillDocumentORM(
        document_id=doc_id,
        filename="risk.md",
        content_type="text/markdown",
        document_type="risk_assessment",
        extracted_text="high risk safety controls human oversight",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    run = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": doc_id,
            "domain_info": {
                "domain": "medical devices",
                "description": "AI triage",
                "uses_ai_ml": True,
                "intended_use": "triage support",
                "target_market": "EU",
            },
        },
    )
    assert run.status_code == 200
    run_id = run.json()["run_id"]

    invalid_rejection = client.post(
        f"/api/v1/bridge/runs/{run_id}/human-review",
        json={
            "document_id": doc_id,
            "decision": "rejected",
            "reason": "High-risk oversight evidence is incomplete.",
        },
    )
    assert invalid_rejection.status_code == 422

    rejection = client.post(
        f"/api/v1/bridge/runs/{run_id}/human-review",
        json={
            "document_id": doc_id,
            "decision": "rejected",
            "reason": "High-risk oversight evidence is incomplete.",
            "next_task_type": "manual_follow_up",
            "next_task_assignee": "sven.riskmanager@qm.local",
            "next_task_instructions": "Update hazard controls and re-run checks.",
            "assignee_notified": True,
        },
    )
    assert rejection.status_code == 200
    payload = rejection.json()
    assert payload["decision"] == "rejected"
    assert payload["next_task_type"] == "manual_follow_up"
    assert payload["next_task_assignee"] == "sven.riskmanager@qm.local"
    assert payload["assignee_notified"] is True

    events = test_db_session.query(AuditEventORM).filter(AuditEventORM.correlation_id == run_id).all()
    assert any(e.event_type == "bridge.run.rejected" for e in events)
    assert any(e.event_type == "bridge.run.next_task.proposed" for e in events)


def test_bridge_human_review_can_be_fetched_after_submission(client, test_db_session) -> None:
    doc_id = "DOC-BRIDGE-5"
    doc = SkillDocumentORM(
        document_id=doc_id,
        filename="controls.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="quality controls and oversight",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    run = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": doc_id,
            "domain_info": {
                "domain": "quality management",
                "description": "AI quality control",
                "uses_ai_ml": True,
                "intended_use": "control verification",
                "target_market": "EU",
            },
        },
    )
    assert run.status_code == 200
    run_id = run.json()["run_id"]

    submission = client.post(
        f"/api/v1/bridge/runs/{run_id}/human-review",
        json={
            "document_id": doc_id,
            "decision": "approved",
            "reason": "Review confirms sufficient evidence and oversight controls.",
        },
    )
    assert submission.status_code == 200

    fetched = client.get(f"/api/v1/bridge/runs/{run_id}/human-review")
    assert fetched.status_code == 200
    payload = fetched.json()
    assert payload["run_id"] == run_id
    assert payload["document_id"] == doc_id
    assert payload["decision"] == "approved"
    assert payload["reviewer_email"]


def test_bridge_human_review_rejects_duplicate_submission_for_same_run(client, test_db_session) -> None:
    doc_id = "DOC-BRIDGE-6"
    doc = SkillDocumentORM(
        document_id=doc_id,
        filename="oversight.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="oversight traceability post-market monitoring logging",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    run = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": doc_id,
            "domain_info": {
                "domain": "medical devices",
                "description": "AI oversight assistant",
                "uses_ai_ml": True,
                "intended_use": "quality review",
                "target_market": "EU",
            },
        },
    )
    assert run.status_code == 200
    run_id = run.json()["run_id"]

    first_review = client.post(
        f"/api/v1/bridge/runs/{run_id}/human-review",
        json={
            "document_id": doc_id,
            "decision": "approved",
            "reason": "Initial human approval recorded.",
        },
    )
    assert first_review.status_code == 200

    duplicate_review = client.post(
        f"/api/v1/bridge/runs/{run_id}/human-review",
        json={
            "document_id": doc_id,
            "decision": "rejected",
            "reason": "Conflicting second decision should be blocked.",
            "next_task_type": "manual_follow_up",
            "next_task_assignee": "sven.riskmanager@qm.local",
        },
    )
    assert duplicate_review.status_code == 409
    assert "already submitted" in duplicate_review.json()["error"]["message"].lower()

    stored_reviews = test_db_session.query(BridgeHumanReviewORM).filter(BridgeHumanReviewORM.run_id == run_id).all()
    assert len(stored_reviews) == 1
    assert stored_reviews[0].decision == "approved"

    review_events = test_db_session.query(AuditEventORM).filter(AuditEventORM.correlation_id == run_id).all()
    assert len([event for event in review_events if event.event_type in {"bridge.run.approved", "bridge.run.rejected"}]) == 1


def test_bridge_human_review_rejects_approved_decision_with_follow_up_task(client, test_db_session) -> None:
    doc_id = "DOC-BRIDGE-7"
    doc = SkillDocumentORM(
        document_id=doc_id,
        filename="evidence.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="technical documentation transparency human oversight evidence",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    run = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": doc_id,
            "domain_info": {
                "domain": "medical devices",
                "description": "AI compliance helper",
                "uses_ai_ml": True,
                "intended_use": "review support",
                "target_market": "EU",
            },
        },
    )
    assert run.status_code == 200
    run_id = run.json()["run_id"]

    invalid_review = client.post(
        f"/api/v1/bridge/runs/{run_id}/human-review",
        json={
            "document_id": doc_id,
            "decision": "approved",
            "reason": "Approval should not also create a follow-up task.",
            "next_task_type": "manual_follow_up",
            "next_task_assignee": "sven.riskmanager@qm.local",
        },
    )
    assert invalid_review.status_code == 422
    assert "must be omitted when decision is approved" in invalid_review.json()["error"]["message"].lower()


def test_bridge_agents_reload_returns_runtime_snapshot_and_audit_event(client, test_db_session) -> None:
    response = client.post("/api/v1/bridge/agents/reload")
    assert response.status_code == 200

    payload = response.json()
    assert payload["reload_id"]
    assert payload["requirements_version"]
    assert payload["requirements_signature"]
    assert isinstance(payload["agents"], list)
    assert len(payload["agents"]) >= 1
    assert all(agent["source"] == "backend" for agent in payload["agents"])

    events = (
        test_db_session.query(AuditEventORM)
        .filter(AuditEventORM.event_type == "bridge.agents.reload.requested")
        .all()
    )
    assert len(events) == 1
    assert events[0].correlation_id == payload["reload_id"]


def test_bridge_human_review_multi_client_contention_allows_only_one_terminal_decision(test_db_session) -> None:
    reviewer_a = _client_with_db(test_db_session)
    reviewer_b = _client_with_db(test_db_session)
    try:
        for reviewer in (reviewer_a, reviewer_b):
            login = reviewer.post(
                "/api/v1/auth/login",
                json={
                    "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                    "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
                },
            )
            assert login.status_code == 200

        doc_id = "DOC-BRIDGE-8"
        doc = SkillDocumentORM(
            document_id=doc_id,
            filename="contention.md",
            content_type="text/markdown",
            document_type="sop",
            extracted_text="human review contention sequence for same run",
            source="skills_extract",
        )
        test_db_session.add(doc)
        test_db_session.commit()

        run = reviewer_a.post(
            "/api/v1/bridge/run/eu-ai-act",
            json={
                "document_id": doc_id,
                "domain_info": {
                    "domain": "medical devices",
                    "description": "concurrent reviewer scenario",
                    "uses_ai_ml": True,
                    "intended_use": "compliance workflow",
                    "target_market": "EU",
                },
            },
        )
        assert run.status_code == 200
        run_id = run.json()["run_id"]

        decision_a = reviewer_a.post(
            f"/api/v1/bridge/runs/{run_id}/human-review",
            json={
                "document_id": doc_id,
                "decision": "approved",
                "reason": "Reviewer A approves first.",
            },
        )
        assert decision_a.status_code == 200

        decision_b = reviewer_b.post(
            f"/api/v1/bridge/runs/{run_id}/human-review",
            json={
                "document_id": doc_id,
                "decision": "rejected",
                "reason": "Reviewer B arrives late with conflicting decision.",
                "next_task_type": "manual_follow_up",
                "next_task_assignee": "late.reviewer@qm.local",
            },
        )
        assert decision_b.status_code == 409
        assert "already submitted" in decision_b.json()["error"]["message"].lower()

        stored_reviews = test_db_session.query(BridgeHumanReviewORM).filter(BridgeHumanReviewORM.run_id == run_id).all()
        assert len(stored_reviews) == 1
        assert stored_reviews[0].decision == "approved"

        review_events = test_db_session.query(AuditEventORM).filter(AuditEventORM.correlation_id == run_id).all()
        assert len([event for event in review_events if event.event_type in {"bridge.run.approved", "bridge.run.rejected"}]) == 1
    finally:
        app.dependency_overrides.clear()


def test_bridge_human_review_three_reviewers_only_first_decision_wins(test_db_session) -> None:
    reviewer_a = _client_with_db(test_db_session)
    reviewer_b = _client_with_db(test_db_session)
    reviewer_c = _client_with_db(test_db_session)
    try:
        for reviewer in (reviewer_a, reviewer_b, reviewer_c):
            login = reviewer.post(
                "/api/v1/auth/login",
                json={
                    "email": os.environ.get("AUTH_MVP_EMAIL", "mvp-user@example.invalid"),
                    "password": os.environ.get("AUTH_MVP_PASSWORD", "CHANGE_ME_BEFORE_USE"),
                },
            )
            assert login.status_code == 200

        doc_id = "DOC-BRIDGE-9"
        doc = SkillDocumentORM(
            document_id=doc_id,
            filename="three-reviewers.md",
            content_type="text/markdown",
            document_type="sop",
            extracted_text="three reviewer contention scenario",
            source="skills_extract",
        )
        test_db_session.add(doc)
        test_db_session.commit()

        run = reviewer_a.post(
            "/api/v1/bridge/run/eu-ai-act",
            json={
                "document_id": doc_id,
                "domain_info": {
                    "domain": "medical devices",
                    "description": "three-reviewer contention",
                    "uses_ai_ml": True,
                    "intended_use": "compliance workflow",
                    "target_market": "EU",
                },
            },
        )
        assert run.status_code == 200
        run_id = run.json()["run_id"]

        first = reviewer_a.post(
            f"/api/v1/bridge/runs/{run_id}/human-review",
            json={
                "document_id": doc_id,
                "decision": "approved",
                "reason": "First reviewer approval.",
            },
        )
        assert first.status_code == 200

        second = reviewer_b.post(
            f"/api/v1/bridge/runs/{run_id}/human-review",
            json={
                "document_id": doc_id,
                "decision": "rejected",
                "reason": "Second reviewer conflict.",
                "next_task_type": "manual_follow_up",
                "next_task_assignee": "reviewer2@qm.local",
            },
        )
        third = reviewer_c.post(
            f"/api/v1/bridge/runs/{run_id}/human-review",
            json={
                "document_id": doc_id,
                "decision": "rejected",
                "reason": "Third reviewer conflict.",
                "next_task_type": "manual_follow_up",
                "next_task_assignee": "reviewer3@qm.local",
            },
        )

        assert second.status_code == 409
        assert third.status_code == 409
        assert "already submitted" in second.json()["error"]["message"].lower()
        assert "already submitted" in third.json()["error"]["message"].lower()

        stored_reviews = test_db_session.query(BridgeHumanReviewORM).filter(BridgeHumanReviewORM.run_id == run_id).all()
        assert len(stored_reviews) == 1
        assert stored_reviews[0].decision == "approved"

        review_events = test_db_session.query(AuditEventORM).filter(AuditEventORM.correlation_id == run_id).all()
        assert len([event for event in review_events if event.event_type in {"bridge.run.approved", "bridge.run.rejected"}]) == 1
    finally:
        app.dependency_overrides.clear()
