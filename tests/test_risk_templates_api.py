"""Route-level tests for risk template CRUD, CSV export, and AI suggestions."""
from __future__ import annotations

import csv
import io

from src.doc_quality.models.orm import RiskTemplateORM, RiskTemplateRowORM


def _create_risk_template(client, *, template_type: str = "RMF", rows: list[dict] | None = None) -> dict:
    payload = {
        "template_type": template_type,
        "template_title": f"{template_type} Working Template",
        "product": "AI-Diagnostics-Core",
        "created_by": "risk.manager@example.com",
        "rationale": "QA route test fixture",
        "rows": rows or [{"nr": 1, "activity": "Initial activity", "status": "Open"}],
    }
    response = client.post("/api/v1/risk-templates", json=payload)
    assert response.status_code == 201
    return response.json()


def test_get_risk_template_by_id_returns_full_payload(client) -> None:
    created = _create_risk_template(
        client,
        rows=[
            {
                "nr": 1,
                "risk_category": "Software",
                "activity": "Architecture review",
                "status": "Open",
            }
        ],
    )
    template_id = created["template_id"]

    response = client.get(f"/api/v1/risk-templates/{template_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["template_id"] == template_id
    assert payload["template_type"] == "RMF"
    assert payload["template_title"] == "RMF Working Template"
    assert len(payload["rows"]) == 1
    assert payload["rows"][0]["row_order"] == 0
    assert payload["rows"][0]["row_data"]["risk_category"] == "Software"


def test_update_risk_template_replaces_metadata_and_rows(client, test_db_session) -> None:
    created = _create_risk_template(
        client,
        rows=[
            {"nr": 1, "activity": "Old row 1", "status": "Open"},
            {"nr": 2, "activity": "Old row 2", "status": "Open"},
        ],
    )
    template_id = created["template_id"]

    update_response = client.put(
        f"/api/v1/risk-templates/{template_id}",
        json={
            "template_title": "RMF Updated Title",
            "product": "AI-Diagnostics-Next",
            "status": "Approved",
            "rows": [
                {
                    "nr": 1,
                    "risk_category": "Clinical",
                    "activity": "Updated control verification",
                    "status": "Mitigated",
                }
            ],
        },
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["template_title"] == "RMF Updated Title"
    assert updated["product"] == "AI-Diagnostics-Next"
    assert updated["status"] == "Approved"
    assert len(updated["rows"]) == 1
    assert updated["rows"][0]["row_data"]["activity"] == "Updated control verification"

    persisted_rows = (
        test_db_session.query(RiskTemplateRowORM)
        .filter(RiskTemplateRowORM.template_id == template_id)
        .order_by(RiskTemplateRowORM.row_order)
        .all()
    )
    assert len(persisted_rows) == 1
    assert persisted_rows[0].row_data["activity"] == "Updated control verification"


def test_delete_risk_template_removes_template_and_rows(client, test_db_session) -> None:
    created = _create_risk_template(
        client,
        rows=[
            {"nr": 1, "activity": "Delete row 1", "status": "Open"},
            {"nr": 2, "activity": "Delete row 2", "status": "Open"},
        ],
    )
    template_id = created["template_id"]

    delete_response = client.delete(f"/api/v1/risk-templates/{template_id}")
    assert delete_response.status_code == 204

    get_deleted = client.get(f"/api/v1/risk-templates/{template_id}")
    assert get_deleted.status_code == 404

    assert (
        test_db_session.query(RiskTemplateORM)
        .filter(RiskTemplateORM.template_id == template_id)
        .first()
        is None
    )
    assert (
        test_db_session.query(RiskTemplateRowORM)
        .filter(RiskTemplateRowORM.template_id == template_id)
        .count()
        == 0
    )


def test_export_risk_template_csv_returns_file_with_recomputed_fmea_rpn(client) -> None:
    created = _create_risk_template(
        client,
        template_type="FMEA",
        rows=[
            {
                "nr": 1,
                "system_element": "Inference Engine",
                "root_cause": "Threshold drift",
                "failure_mode": "False negative",
                "hazard_impact": "Delayed triage",
                "effect": "Late treatment",
                "severity": 4,
                "probability": 2,
                "rpn": 1,
                "mitigation": "Secondary check",
                "verification": "Clinical validation",
                "post_severity": 3,
                "post_probability": 2,
                "post_rpn": 1,
                "residual_risk": "Medium",
                "status": "Open",
                "post_effect_risk": "Reduced",
                "new_risks": "None",
                "notes": "QA export test",
            }
        ],
    )
    template_id = created["template_id"]

    response = client.get(f"/api/v1/risk-templates/{template_id}/export/csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=\"FMEA_Working_Template_FMEA.csv\"" in response.headers["content-disposition"]

    decoded = response.content.decode("utf-8-sig")
    csv_rows = list(csv.reader(io.StringIO(decoded)))

    # Meta rows + blank row + table header at index 4.
    assert csv_rows[0][0] == "Template: FMEA Working Template"
    assert csv_rows[4][8] == "RPN (S×P)"
    assert csv_rows[5][8] == "8"
    assert csv_rows[5][13] == "6"


def test_ai_suggest_risk_row_returns_rule_based_defaults_without_api_key(client, monkeypatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")

    response = client.post(
        "/api/v1/risk-templates/ai-suggest",
        json={
            "template_type": "FMEA",
            "partial_row": {"failure_mode": "False positive escalation"},
            "context": "AI triage service for emergency intake",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["degraded_to_defaults"] is True
    assert payload["model_used"] == "defaults"
    assert payload["suggestions"]["severity"] == 3
    assert payload["suggestions"]["probability"] == 2
    assert payload["suggestions"]["residual_risk"] == "Medium"
