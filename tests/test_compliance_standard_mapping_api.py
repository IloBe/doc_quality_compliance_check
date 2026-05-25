"""API tests for compliance standard-mapping request routes."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from src.doc_quality.models.orm import AuditEventORM


def test_create_standard_mapping_request_persists_record(client) -> None:
    response = client.post(
        "/api/v1/compliance/standard-mapping-requests",
        json={
            "standard_name": "IEC 62304",
            "sop_reference": "SOP-ARCH-001",
            "business_justification": "Need a traceable mapping between software lifecycle obligations and our governed SOP set.",
            "requester_email": "QM.LEAD@EXAMPLE.COM",
            "tenant_id": "tenant-quality",
            "project_id": "proj-mapping",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["request_id"].startswith("SMR-")
    assert payload["status"] == "submitted"
    assert payload["standard_name"] == "IEC 62304"
    assert payload["sop_reference"] == "SOP-ARCH-001"
    assert payload["requester_email"] == "qm.lead@example.com"
    assert payload["tenant_id"] == "tenant-quality"
    assert payload["project_id"] == "proj-mapping"


def test_list_standard_mapping_requests_returns_created_rows(client) -> None:
    created = client.post(
        "/api/v1/compliance/standard-mapping-requests",
        json={
            "standard_name": "ISO 14971",
            "sop_reference": "SOP-RISK-002",
            "business_justification": "Risk-management mapping must be requested and tracked for audit-ready governance evidence.",
            "requester_email": "risk.manager@example.com",
            "tenant_id": "tenant-quality",
            "project_id": "proj-risk",
        },
    )
    assert created.status_code == 200
    created_payload = created.json()

    response = client.get("/api/v1/compliance/standard-mapping-requests?limit=10")

    assert response.status_code == 200
    payload = response.json()
    assert "items" in payload
    assert any(item["request_id"] == created_payload["request_id"] for item in payload["items"])

    created_row = next(item for item in payload["items"] if item["request_id"] == created_payload["request_id"])
    assert created_row["standard_name"] == "ISO 14971"
    assert created_row["sop_reference"] == "SOP-RISK-002"
    assert created_row["tenant_id"] == "tenant-quality"
    assert created_row["project_id"] == "proj-risk"


def test_list_standard_mapping_requests_respects_limit_and_desc_order(client, test_db_session) -> None:
    now = datetime.now(timezone.utc)
    rows = [
        AuditEventORM(
            event_id="evt-smr-order-1",
            tenant_id="tenant-quality",
            org_id="ORG-1",
            project_id="proj-old",
            event_time=now - timedelta(minutes=30),
            event_type="compliance.standard_mapping.requested",
            actor_type="user",
            actor_id="one@example.com",
            subject_type="compliance_standard_mapping",
            subject_id="SMR-OLD",
            trace_id=None,
            correlation_id=None,
            payload={
                "status": "submitted",
                "standard_name": "ISO OLD",
                "sop_reference": "SOP-OLD",
                "business_justification": "old",
                "requester_email": "one@example.com",
                "tenant_id": "tenant-quality",
                "project_id": "proj-old",
            },
            created_at=now - timedelta(minutes=30),
        ),
        AuditEventORM(
            event_id="evt-smr-order-2",
            tenant_id="tenant-quality",
            org_id="ORG-1",
            project_id="proj-mid",
            event_time=now - timedelta(minutes=20),
            event_type="compliance.standard_mapping.requested",
            actor_type="user",
            actor_id="two@example.com",
            subject_type="compliance_standard_mapping",
            subject_id="SMR-MID",
            trace_id=None,
            correlation_id=None,
            payload={
                "status": "submitted",
                "standard_name": "ISO MID",
                "sop_reference": "SOP-MID",
                "business_justification": "mid",
                "requester_email": "two@example.com",
                "tenant_id": "tenant-quality",
                "project_id": "proj-mid",
            },
            created_at=now - timedelta(minutes=20),
        ),
        AuditEventORM(
            event_id="evt-smr-order-3",
            tenant_id="tenant-quality",
            org_id="ORG-1",
            project_id="proj-new",
            event_time=now - timedelta(minutes=10),
            event_type="compliance.standard_mapping.requested",
            actor_type="user",
            actor_id="three@example.com",
            subject_type="compliance_standard_mapping",
            subject_id="SMR-NEW",
            trace_id=None,
            correlation_id=None,
            payload={
                "status": "submitted",
                "standard_name": "ISO NEW",
                "sop_reference": "SOP-NEW",
                "business_justification": "new",
                "requester_email": "three@example.com",
                "tenant_id": "tenant-quality",
                "project_id": "proj-new",
            },
            created_at=now - timedelta(minutes=10),
        ),
    ]
    test_db_session.add_all(rows)
    test_db_session.commit()

    response = client.get("/api/v1/compliance/standard-mapping-requests?limit=2")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 2
    assert items[0]["request_id"] == "SMR-NEW"
    assert items[1]["request_id"] == "SMR-MID"


def test_list_standard_mapping_requests_clamps_non_positive_limit_to_one(client, test_db_session) -> None:
    now = datetime.now(timezone.utc)
    row = AuditEventORM(
        event_id="evt-smr-limit-clamp",
        tenant_id="tenant-quality",
        org_id="ORG-1",
        project_id="proj-limit",
        event_time=now,
        event_type="compliance.standard_mapping.requested",
        actor_type="user",
        actor_id="limit@example.com",
        subject_type="compliance_standard_mapping",
        subject_id="SMR-LIMIT",
        trace_id=None,
        correlation_id=None,
        payload={
            "status": "submitted",
            "standard_name": "ISO LIMIT",
            "sop_reference": "SOP-LIMIT",
            "business_justification": "limit",
            "requester_email": "limit@example.com",
            "tenant_id": "tenant-quality",
            "project_id": "proj-limit",
        },
        created_at=now,
    )
    test_db_session.add(row)
    test_db_session.commit()

    response = client.get("/api/v1/compliance/standard-mapping-requests?limit=0")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["request_id"] == "SMR-LIMIT"


def test_list_standard_mapping_requests_response_contract(client) -> None:
    response = client.get("/api/v1/compliance/standard-mapping-requests?limit=5")
    assert response.status_code == 200

    payload = response.json()
    assert set(payload.keys()) == {"items"}

    if payload["items"]:
        row = payload["items"][0]
        # list view must NOT expose the full business_justification
        assert "business_justification" not in row
        # but must expose the preview fields
        assert set(row.keys()) == {
            "request_id",
            "status",
            "submitted_at",
            "standard_name",
            "sop_reference",
            "justification_preview",
            "justification_chars",
            "requester_email",
            "tenant_id",
            "project_id",
        }


def test_list_standard_mapping_requests_justification_preview(client) -> None:
    """List items carry a ≤280-char preview; full text stays in the create response."""
    long_justification = "A" * 500 + " detailed analysis of regulatory mapping obligations."
    create_resp = client.post(
        "/api/v1/compliance/standard-mapping-requests",
        json={
            "standard_name": "ISO 27001",
            "sop_reference": "SOP-SEC-001",
            "business_justification": long_justification,
            "requester_email": "preview.test@example.com",
            "tenant_id": "tenant-quality",
        },
    )
    assert create_resp.status_code == 200
    # create response must return full justification
    assert create_resp.json()["business_justification"] == long_justification

    list_resp = client.get("/api/v1/compliance/standard-mapping-requests?limit=5")
    assert list_resp.status_code == 200
    items = list_resp.json()["items"]
    matching = [i for i in items if i["standard_name"] == "ISO 27001"]
    assert matching, "created record not found in list"

    row = matching[0]
    assert "business_justification" not in row
    assert len(row["justification_preview"]) <= 280 + len("...")
    assert row["justification_chars"] == len(long_justification)


def test_standard_mapping_request_audit_event_contains_ai_runtime(client, test_db_session) -> None:
    response = client.post(
        "/api/v1/compliance/standard-mapping-requests",
        json={
            "standard_name": "ISO 9001",
            "sop_reference": "SOP-QMS-001",
            "business_justification": "Need traceable quality-management standard mapping for evidence and recurring external audits.",
            "requester_email": "runtime.audit@example.com",
            "tenant_id": "tenant-quality",
        },
    )
    assert response.status_code == 200
    request_id = response.json()["request_id"]

    row = (
        test_db_session.query(AuditEventORM)
        .filter(
            AuditEventORM.event_type == "compliance.standard_mapping.requested",
            AuditEventORM.subject_id == request_id,
        )
        .first()
    )
    assert row is not None
    payload = row.payload or {}
    assert payload.get("ai_runtime", {}).get("model_id") == "llama3.1:8b"