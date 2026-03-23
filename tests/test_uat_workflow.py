"""User-acceptance style backend workflow tests."""

from __future__ import annotations

from src.doc_quality.models.orm import AuditEventORM
from src.doc_quality.models.review import ModificationRequest, ReviewStatus
from src.doc_quality.services.hitl_workflow import create_review, list_reviews_for_document, update_review_status


def test_uat_arc42_review_lifecycle(client, test_db_session, sample_arc42_content: str) -> None:
    """UAT scenario: analyze doc, raise review, approve after updates."""
    analyze_response = client.post(
        "/api/v1/documents/analyze",
        json={"content": sample_arc42_content, "filename": "uat-arc42.md", "doc_type": "arc42"},
    )
    assert analyze_response.status_code == 200
    document_id = analyze_response.json()["document_id"]

    review = create_review(
        document_id=document_id,
        reviewer_name="Senior Architect",
        reviewer_role="architecture",
        modifications=[
            ModificationRequest(
                location="Quality Requirements",
                description="Missing measurable quality scenarios",
                importance="major",
                risk_if_not_done="Release decision may be made without objective quality evidence.",
            )
        ],
        comments="Needs clearer acceptance criteria.",
        db=test_db_session,
    )
    assert review.status == ReviewStatus.MODIFICATIONS_NEEDED

    updated = update_review_status(review.review_id, ReviewStatus.PASSED, db=test_db_session)
    assert updated is not None
    assert updated.status == ReviewStatus.PASSED

    reviews = list_reviews_for_document(document_id, db=test_db_session)
    assert len(reviews) == 1
    assert reviews[0].reviewer_name == "Senior Architect"


def test_uat_audit_trail_contains_provenance(client, test_db_session) -> None:
    """UAT scenario: audit events store tenant/org/project provenance fields."""
    response = client.post(
        "/api/v1/skills/log_event",
        json={
            "event_type": "uat_event",
            "actor_type": "user",
            "actor_id": "qa-user",
            "subject_type": "workflow",
            "subject_id": "run-uat-1",
            "tenant_id": "tenant-uat",
            "org_id": "org-medtech",
            "project_id": "proj-compliance",
            "trace_id": "trace-uat-1",
            "payload": {"phase": "uat"},
        },
    )
    assert response.status_code == 200

    rows = test_db_session.query(AuditEventORM).filter(
        AuditEventORM.tenant_id == "tenant-uat",
        AuditEventORM.subject_id == "run-uat-1",
    ).all()

    assert len(rows) == 1
    row = rows[0]
    assert row.org_id == "org-medtech"
    assert row.project_id == "proj-compliance"
    assert row.trace_id == "trace-uat-1"


def test_uat_regulation_lookup_and_compliance_check(client) -> None:
    """UAT scenario: user asks for regulations and runs compliance check."""
    domain_payload = {
        "domain": "medical devices",
        "description": "Clinical decision support software.",
        "uses_ai_ml": True,
        "target_market": "EU",
    }

    regs_response = client.post("/api/v1/compliance/applicable-regulations", json=domain_payload)
    assert regs_response.status_code == 200
    regulations = regs_response.json()
    assert len(regulations) >= 1

    compliance_response = client.post(
        "/api/v1/compliance/check/eu-ai-act",
        json={
            "document_content": "AI risk controls and post-market monitoring are defined.",
            "document_id": "doc-uat-1",
            "domain_info": domain_payload,
        },
    )
    assert compliance_response.status_code == 200
    payload = compliance_response.json()
    assert payload["document_id"] == "doc-uat-1"
    assert "compliance_score" in payload
