"""Tests for bridge EU AI Act compliance run endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from src.doc_quality.models.orm import AuditEventORM, BridgeHumanReviewORM, SkillDocumentORM


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
