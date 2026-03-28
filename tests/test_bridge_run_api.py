"""Tests for bridge EU AI Act compliance run endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from src.doc_quality.models.orm import AuditEventORM, SkillDocumentORM


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
    assert payload["regulatory_update"]["requires_document_update"] is False

    events = test_db_session.query(AuditEventORM).filter(AuditEventORM.subject_id == "DOC-BRIDGE-1").all()
    assert any(e.event_type == "bridge.run.completed" for e in events)


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
