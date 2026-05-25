"""Tests for standardized API error envelope."""
from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from src.doc_quality.api.main import app
from src.doc_quality.api.main import _build_error_payload
from src.doc_quality.api.routes import bridge as bridge_routes
from src.doc_quality.api.routes import auth as auth_routes
from src.doc_quality.core.database import get_db
from src.doc_quality.models.compliance import DataPrivacyClass, InferenceLocation, StepPolicyContract
from src.doc_quality.models.orm import ModelPolicyConfigORM, SkillDocumentORM
from src.doc_quality.services.model_policy_service import PolicyMetadataPersistenceError
from src.doc_quality.services.policy_contract_service import PolicyContractValidationError, PolicyContractViolationError


def test_404_uses_standard_error_envelope() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "not_found"
    assert isinstance(payload["error"]["message"], str)


def test_422_uses_standard_error_envelope() -> None:
    client = TestClient(app)
    response = client.post("/api/v1/auth/login", json={"email": "a"})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "validation_error"
    assert payload["error"]["message"] == "Request validation failed"


def test_500_uses_standard_error_envelope(monkeypatch) -> None:
    def _boom(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(auth_routes, "_find_valid_recovery_token", _boom)

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post("/api/v1/auth/recovery/verify", json={"token": "x" * 16})
    assert response.status_code == 500
    payload = response.json()
    assert payload["error"]["code"] == "internal_error"
    assert payload["error"]["message"] == "Internal server error"


def test_database_operational_error_uses_database_unavailable_envelope() -> None:
    class FailingQuery:
        def filter(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("db down"))

    class FailingSession:
        def query(self, *args, **kwargs):
            return FailingQuery()

        def close(self) -> None:
            return None

    def override_get_db():
        yield FailingSession()

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "mvp-user@example.invalid",
                "password": "CHANGE_ME_BEFORE_USE",
                "remember_me": False,
            },
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"]["code"] == "database_unavailable"
    assert payload["error"]["message"] == "Database unavailable. Start PostgreSQL and retry."


def test_405_uses_standard_error_envelope() -> None:
    client = TestClient(app)
    response = client.post("/health")

    assert response.status_code == 405
    payload = response.json()
    assert payload["error"]["code"] == "method_not_allowed"
    assert isinstance(payload["error"]["message"], str)


def test_conflict_http_exception_with_detail_dict_preserves_envelope_shape(client, test_db_session) -> None:
    doc = SkillDocumentORM(
        document_id="DOC-ERR-ENVELOPE-1",
        filename="doc.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="envelope conflict test",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    first = client.post(
        "/api/v1/documents/DOC-ERR-ENVELOPE-1/lock/acquire",
        json={"actor_id": "alice@example.invalid", "ttl_minutes": 30},
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/documents/DOC-ERR-ENVELOPE-1/lock/acquire",
        json={"actor_id": "bob@example.invalid", "ttl_minutes": 30},
    )
    assert second.status_code == 409

    payload = second.json()
    assert payload["error"]["code"] == "conflict"
    assert isinstance(payload["error"]["message"], str)
    assert payload["error"]["locked_by"] == "alice@example.invalid"


def test_error_payload_filters_untrusted_detail_keys() -> None:
    payload = _build_error_payload(
        400,
        {
            "message": "Request failed",
            "locked_by": "reviewer@example.invalid",
            "internal_debug": "stack details",
            "secret_token": "abc123",
        },
    )

    assert payload["message"] == "Request failed"
    assert payload["locked_by"] == "reviewer@example.invalid"
    assert "internal_debug" not in payload
    assert "secret_token" not in payload


def test_bridge_policy_validation_error_includes_stable_error_fields(client, test_db_session, monkeypatch) -> None:
    doc = SkillDocumentORM(
        document_id="DOC-ERR-BRIDGE-PSC-1",
        filename="policy-invalid.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="policy validation envelope test",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    def _raise_policy_error(*, sandbox_steps):
        raise PolicyContractViolationError(
            "step policy contract missing required metadata",
            action_points=[
                "Ensure sensitivity_class is set for each step.",
                "Ensure policy_rule_id uses policy namespace.",
            ],
        )

    monkeypatch.setattr(bridge_routes, "build_and_validate_step_policy_contracts", _raise_policy_error)

    response = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": "DOC-ERR-BRIDGE-PSC-1",
            "domain_info": {
                "domain": "medical devices",
                "description": "AI diagnostic support tool",
                "uses_ai_ml": True,
                "intended_use": "assist diagnosis",
                "target_market": "EU",
            },
        },
    )

    assert response.status_code == 422
    payload = response.json()["error"]
    assert payload["code"] == "validation_error"
    assert payload["error_code"] == "validation_error"
    assert payload["reason"] == "bridge_step_policy_invalid"
    assert isinstance(payload["action_points"], list)
    assert len(payload["action_points"]) >= 1
    assert isinstance(payload["correlation_id"], str)
    assert payload["correlation_id"]


def test_bridge_policy_metadata_persistence_error_uses_stable_envelope(client, test_db_session, monkeypatch) -> None:
    doc = SkillDocumentORM(
        document_id="DOC-ERR-BRIDGE-PSC-3",
        filename="metadata-persistence-failed.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="metadata persistence envelope test",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.commit()

    def _raise_metadata_persistence(*, db, run_id, document_id, actor_email, actor_org, active_model, step_policy_contracts):
        raise PolicyMetadataPersistenceError(
            "Could not persist deny-path bridge policy evidence.",
            action_points=["Retry once database write path is healthy."],
        )

    monkeypatch.setattr(bridge_routes, "_enforce_fail_closed_step_routing", _raise_metadata_persistence)

    response = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": "DOC-ERR-BRIDGE-PSC-3",
            "domain_info": {
                "domain": "medical devices",
                "description": "AI diagnostic support tool",
                "uses_ai_ml": True,
                "intended_use": "assist diagnosis",
                "target_market": "EU",
            },
        },
    )

    assert response.status_code == 500
    payload = response.json()["error"]
    assert payload["code"] == "internal_error"
    assert payload["error_code"] == "internal_error"
    assert payload["reason"] == "bridge_policy_metadata_persistence_failed"
    assert isinstance(payload["action_points"], list)
    assert len(payload["action_points"]) >= 1
    assert isinstance(payload["correlation_id"], str)
    assert payload["correlation_id"]


def test_bridge_policy_routing_denied_includes_stable_error_fields(client, test_db_session, monkeypatch) -> None:
    doc = SkillDocumentORM(
        document_id="DOC-ERR-BRIDGE-PSC-2",
        filename="routing-denied.md",
        content_type="text/markdown",
        document_type="sop",
        extracted_text="routing denied envelope test",
        source="skills_extract",
    )
    test_db_session.add(doc)
    test_db_session.merge(
        ModelPolicyConfigORM(
            config_id="default",
            default_model_id="claude-3-5-sonnet-20241022",
            items=[
                {
                    "model_id": "claude-3-5-sonnet-20241022",
                    "display_name": "Anthropic claude-3-5-sonnet-20241022",
                    "provider": "anthropic",
                    "enabled": True,
                    "priority": 1,
                    "params": {},
                }
            ],
            updated_by="test-suite",
        )
    )
    test_db_session.commit()

    base_settings = bridge_routes.get_settings()

    def _settings_override():
        settings = base_settings.model_copy(deep=True)
        settings.bridge_local_only_enforced = False
        settings.bridge_egress_policy = "allow_controlled"
        return settings

    def _force_personal_contracts(*, sandbox_steps):
        return [
            StepPolicyContract(
                step_id="bridge_step_1",
                step_name="bridge_inspection",
                sensitivity_class=DataPrivacyClass.PERSONAL_DATA_POSSIBLE,
                policy_rule_id="policy.bridge.on_prem_required.v1",
                decision_reason="Sensitive context requires on-prem path.",
                selected_inference_location=InferenceLocation.ON_PREM,
                allowed_tools=["document_read"],
            )
        ]

    monkeypatch.setattr(bridge_routes, "get_settings", _settings_override)
    monkeypatch.setattr(bridge_routes, "_build_and_validate_step_policy_contracts", _force_personal_contracts)

    response = client.post(
        "/api/v1/bridge/run/eu-ai-act",
        json={
            "document_id": "DOC-ERR-BRIDGE-PSC-2",
            "domain_info": {
                "domain": "medical devices",
                "description": "AI diagnostic support tool",
                "uses_ai_ml": True,
                "intended_use": "assist diagnosis",
                "target_market": "EU",
            },
        },
    )

    assert response.status_code == 422
    payload = response.json()["error"]
    assert payload["code"] == "validation_error"
    assert payload["error_code"] == "validation_error"
    assert payload["reason"] == "bridge_policy_routing_denied"
    assert isinstance(payload["action_points"], list)
    assert len(payload["action_points"]) >= 1
    assert isinstance(payload["correlation_id"], str)
    assert payload["correlation_id"]
