"""Service layer for admin governance policy/control snapshots."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import uuid
from typing import Final

from sqlalchemy.orm import Session

from ..core.logging_config import get_logger
from ..models.compliance import ProductDomainInfo
from ..models.governance import (
    GovernanceControlCreateRequest,
    GovernanceControlListResponse,
    GovernanceControl,
    GovernanceMetric,
    GovernancePolicy,
    GovernanceSnapshotResponse,
)
from ..models.orm import GovernanceControlORM

logger = get_logger(__name__)


# Deterministic seed data while backend persistence is introduced incrementally.
_GOVERNANCE_METRIC_SEEDS: Final[tuple[dict[str, object], ...]] = (
    {"id": "coverage", "label": "Control coverage", "value": 92, "unit": "%", "status": "compliant"},
    {"id": "evidence-freshness", "label": "Evidence freshness", "value": 81, "unit": "%", "status": "warning"},
    {"id": "open-actions", "label": "Open remediation actions", "value": 4, "status": "warning"},
    {"id": "critical-gaps", "label": "Critical control gaps", "value": 0, "status": "compliant"},
)

_GOVERNANCE_POLICY_SEEDS: Final[tuple[dict[str, object], ...]] = (
    {
        "id": "policy-access-control",
        "title": "Access Control and Role Governance",
        "version": "v1.8",
        "owner": "Security Governance Board",
        "review_cadence": "Quarterly",
        "next_review_date": "2026-07-15",
        "status": "compliant",
    },
    {
        "id": "policy-ai-quality",
        "title": "AI Quality and Hallucination Management",
        "version": "v1.4",
        "owner": "QM Lead Office",
        "review_cadence": "Monthly",
        "next_review_date": "2026-06-05",
        "status": "warning",
    },
    {
        "id": "policy-audit-traceability",
        "title": "Audit Traceability and Evidence Retention",
        "version": "v2.1",
        "owner": "Compliance Operations",
        "review_cadence": "Quarterly",
        "next_review_date": "2026-08-01",
        "status": "compliant",
    },
    {
        "id": "policy-incident-response",
        "title": "Incident Response and Escalation",
        "version": "v0.9",
        "owner": "Platform Reliability Team",
        "review_cadence": "Monthly",
        "next_review_date": "2026-05-28",
        "status": "draft",
    },
)

_GOVERNANCE_CONTROL_SEEDS: Final[tuple[dict[str, object], ...]] = (
    {
        "id": "ctrl-auth-session",
        "name": "Session authentication hardening",
        "framework_id": "iso_27001",
        "framework": "ISO/IEC 27001 A.5",
        "control_type": "norm",
        "activation_mode": "baseline",
        "domain_tags": [],
        "market_tags": ["eu"],
        "objective": "Restrict unauthorized access to protected admin operations.",
        "implementation": "HTTP-only signed session cookie with server-side token hashing and lockout controls.",
        "evidence": "auth session API tests plus security review notes",
        "status": "compliant",
        "is_active": True,
    },
    {
        "id": "ctrl-hitl-approval",
        "name": "Human-in-the-loop approval gate",
        "framework_id": "eu_ai_act",
        "framework": "EU AI Act Art. 14",
        "control_type": "directive",
        "activation_mode": "baseline",
        "domain_tags": [],
        "market_tags": ["eu"],
        "objective": "Require accountable human review before regulated release decisions.",
        "implementation": "HITL workflow and reviewer attribution persisted with immutable audit events.",
        "evidence": "HITL review records plus audit timeline events",
        "status": "compliant",
        "is_active": True,
    },
    {
        "id": "ctrl-observability-quality",
        "name": "Model quality telemetry controls",
        "framework_id": "iso_9001",
        "framework": "ISO 9001 plus internal AI SOP",
        "control_type": "sop",
        "activation_mode": "baseline",
        "domain_tags": [],
        "market_tags": ["eu"],
        "objective": "Detect and react to quality regressions before policy breach.",
        "implementation": "Observability KPIs, prompt-output trace inspection, and hallucination counters.",
        "evidence": "Admin observability snapshots and weekly QA summary",
        "status": "warning",
        "is_active": True,
    },
    {
        "id": "ctrl-keys-secrets",
        "name": "Secrets and key management segregation",
        "framework_id": "gdpr",
        "framework": "GDPR Art. 32 and NIS2",
        "control_type": "policy",
        "activation_mode": "baseline",
        "domain_tags": [],
        "market_tags": ["eu"],
        "objective": "Reduce systemic blast radius of credential compromise.",
        "implementation": "Separate runtime secrets for session signing, service access, and database credentials.",
        "evidence": "Environment configuration baseline and penetration checklist",
        "status": "draft",
        "is_active": True,
    },
    {
        "id": "ctrl-mdr-clinical-evaluation",
        "name": "Clinical evaluation and safety evidence",
        "framework_id": "mdr_eu_medical_devices",
        "framework": "MDR EU Medical Devices",
        "control_type": "directive",
        "activation_mode": "context",
        "domain_tags": ["medical", "medicine", "clinical", "medtech"],
        "market_tags": ["eu"],
        "objective": "Ensure clinical evidence supports intended medical use and safety claims.",
        "implementation": "Require clinical evaluation plan, residual risk acceptance, and traceable verification artifacts.",
        "evidence": "Clinical evaluation summary plus verification evidence register",
        "status": "compliant",
        "is_active": True,
    },
    {
        "id": "ctrl-iso-13485-qms",
        "name": "Medical device QMS documentation",
        "framework_id": "iso_13485",
        "framework": "ISO/IEC 13485",
        "control_type": "norm",
        "activation_mode": "context",
        "domain_tags": ["medical", "medicine", "clinical", "medtech"],
        "market_tags": ["eu"],
        "objective": "Maintain controlled medical-device lifecycle records and quality procedures.",
        "implementation": "Enforce document control, change control, and DHF-style evidence completeness checks.",
        "evidence": "Controlled procedures index and lifecycle trace matrix",
        "status": "compliant",
        "is_active": True,
    },
    {
        "id": "ctrl-iso-14971-risk",
        "name": "Medical risk management discipline",
        "framework_id": "iso_14971",
        "framework": "ISO/IEC 14971",
        "control_type": "norm",
        "activation_mode": "context",
        "domain_tags": ["medical", "medicine", "clinical", "medtech"],
        "market_tags": ["eu"],
        "objective": "Identify hazards, assess residual risk, and enforce risk-control effectiveness evidence.",
        "implementation": "Risk register checkpoints block approval when mitigation evidence is missing.",
        "evidence": "Risk register export and mitigation effectiveness review",
        "status": "compliant",
        "is_active": True,
    },
    {
        "id": "ctrl-iec-62304-sdlc",
        "name": "Medical software lifecycle controls",
        "framework_id": "iec_62304",
        "framework": "IEC 62304",
        "control_type": "norm",
        "activation_mode": "context",
        "domain_tags": ["medical", "medicine", "clinical", "medtech"],
        "market_tags": ["eu"],
        "objective": "Ensure software lifecycle process evidence for medical software changes.",
        "implementation": "Require release traceability from requirement to verification and post-market follow-up.",
        "evidence": "Lifecycle traceability report and release verification pack",
        "status": "warning",
        "is_active": True,
    },
    {
        "id": "ctrl-hipaa-us-health",
        "name": "US PHI safeguard policy",
        "framework_id": "hipaa",
        "framework": "HIPAA",
        "control_type": "policy",
        "activation_mode": "context",
        "domain_tags": ["medical", "medicine", "clinical", "medtech"],
        "market_tags": ["us"],
        "objective": "Protect PHI handling obligations in US healthcare operations.",
        "implementation": "Apply minimum-necessary access policy and PHI incident response controls.",
        "evidence": "PHI safeguarding policy and incident drill logs",
        "status": "draft",
        "is_active": True,
    },
)


def _build_metrics() -> list[GovernanceMetric]:
    return [GovernanceMetric.model_validate(seed) for seed in _GOVERNANCE_METRIC_SEEDS]


def _build_policies() -> list[GovernancePolicy]:
    return [GovernancePolicy.model_validate(seed) for seed in _GOVERNANCE_POLICY_SEEDS]


def _build_controls() -> list[GovernanceControl]:
    return [GovernanceControl.model_validate(seed) for seed in _GOVERNANCE_CONTROL_SEEDS]


def _normalize_tags(values: list[str] | tuple[str, ...] | None) -> list[str]:
    cleaned: list[str] = []
    for value in values or []:
        normalized = value.strip().lower()
        if normalized and normalized not in cleaned:
            cleaned.append(normalized)
    return cleaned


def _ensure_default_governance_controls(db: Session) -> None:
    existing_ids = {
        str(item[0])
        for item in db.query(GovernanceControlORM.control_id).all()
    }

    missing = [seed for seed in _GOVERNANCE_CONTROL_SEEDS if str(seed["id"]) not in existing_ids]
    if not missing:
        return

    for seed in missing:
        db.add(
            GovernanceControlORM(
                control_id=str(seed["id"]),
                name=str(seed["name"]),
                framework_id=str(seed["framework_id"]),
                framework_label=str(seed["framework"]),
                control_type=str(seed["control_type"]),
                activation_mode=str(seed["activation_mode"]),
                domain_tags=list(seed.get("domain_tags", [])),
                market_tags=list(seed.get("market_tags", [])),
                objective=str(seed["objective"]),
                implementation=str(seed["implementation"]),
                evidence=str(seed["evidence"]),
                status=str(seed["status"]),
                is_active=bool(seed.get("is_active", True)),
                created_by="system.seed",
                updated_by="system.seed",
            )
        )

    db.commit()


def _orm_control_to_model(record: GovernanceControlORM) -> GovernanceControl:
    return GovernanceControl(
        id=record.control_id,
        name=record.name,
        framework=record.framework_label,
        framework_id=record.framework_id,
        control_type=record.control_type,
        activation_mode=record.activation_mode,
        domain_tags=_normalize_tags(record.domain_tags or []),
        market_tags=_normalize_tags(record.market_tags or []),
        objective=record.objective,
        implementation=record.implementation,
        evidence=record.evidence,
        status=record.status,
        is_active=bool(record.is_active),
    )


def _actor_fingerprint(actor_email: str) -> str:
    """Return a stable pseudonymous identifier for structured logs.

    Avoids writing raw actor emails to logs while preserving traceability.
    """
    normalized = actor_email.strip().lower().encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()[:12]


def get_governance_snapshot(db: Session, *, actor_email: str) -> GovernanceSnapshotResponse:
    """Return admin governance policy/control snapshot.

    Args:
        db: Active database session. Reserved for future persisted governance records.
        actor_email: Authenticated actor used for structured audit logs.
    """
    _ensure_default_governance_controls(db)

    controls = (
        db.query(GovernanceControlORM)
        .filter(GovernanceControlORM.is_active.is_(True))
        .order_by(GovernanceControlORM.framework_id.asc(), GovernanceControlORM.name.asc())
        .all()
    )

    snapshot = GovernanceSnapshotResponse(
        metrics=_build_metrics(),
        policies=_build_policies(),
        controls=[_orm_control_to_model(record) for record in controls],
        updated_at=datetime.now(timezone.utc),
    )
    logger.info(
        "admin_governance_snapshot_returned",
        actor_id=_actor_fingerprint(actor_email),
        metrics=len(snapshot.metrics),
        policies=len(snapshot.policies),
        controls=len(snapshot.controls),
    )
    return snapshot


def list_governance_controls(
    db: Session,
    *,
    actor_email: str,
    include_inactive: bool,
) -> GovernanceControlListResponse:
    """Return governance control catalog from persistent storage."""
    _ensure_default_governance_controls(db)

    query = db.query(GovernanceControlORM)
    if not include_inactive:
        query = query.filter(GovernanceControlORM.is_active.is_(True))

    records = query.order_by(GovernanceControlORM.framework_id.asc(), GovernanceControlORM.name.asc()).all()
    controls = [_orm_control_to_model(record) for record in records]

    logger.info(
        "admin_governance_controls_listed",
        actor_id=_actor_fingerprint(actor_email),
        include_inactive=include_inactive,
        count=len(controls),
    )
    return GovernanceControlListResponse(items=controls, updated_at=datetime.now(timezone.utc))


def create_governance_control(
    db: Session,
    *,
    actor_email: str,
    request: GovernanceControlCreateRequest,
) -> GovernanceControl:
    """Create one governance control item in the persistent catalog."""
    _ensure_default_governance_controls(db)

    control_id = f"ctrl-{uuid.uuid4().hex[:12]}"
    record = GovernanceControlORM(
        control_id=control_id,
        name=request.name.strip(),
        framework_id=request.framework_id.strip().lower(),
        framework_label=request.framework.strip(),
        control_type=request.control_type,
        activation_mode=request.activation_mode,
        domain_tags=_normalize_tags(request.domain_tags),
        market_tags=_normalize_tags(request.market_tags),
        objective=request.objective.strip(),
        implementation=request.implementation.strip(),
        evidence=request.evidence.strip(),
        status=request.status,
        is_active=bool(request.is_active),
        created_by=actor_email,
        updated_by=actor_email,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info(
        "admin_governance_control_created",
        actor_id=_actor_fingerprint(actor_email),
        control_id=record.control_id,
        framework_id=record.framework_id,
    )
    return _orm_control_to_model(record)


def list_applicable_governance_controls_for_bridge(
    db: Session,
    *,
    domain_info: ProductDomainInfo,
    checked_frameworks: list[str],
) -> list[GovernanceControl]:
    """Return active controls applicable to a bridge run context."""
    _ensure_default_governance_controls(db)

    controls = (
        db.query(GovernanceControlORM)
        .filter(GovernanceControlORM.is_active.is_(True))
        .order_by(GovernanceControlORM.framework_id.asc(), GovernanceControlORM.name.asc())
        .all()
    )

    domain_context = f"{domain_info.domain} {domain_info.description} {domain_info.intended_use or ''}".lower()
    market_context = (domain_info.target_market or "").lower()
    framework_keys = {item.strip().lower() for item in checked_frameworks}

    selected: list[GovernanceControl] = []
    for record in controls:
        framework_match = record.framework_id.lower() in framework_keys
        if not framework_match:
            continue

        domains = _normalize_tags(record.domain_tags or [])
        markets = _normalize_tags(record.market_tags or [])

        domain_ok = True
        if domains:
            domain_ok = any(tag in domain_context for tag in domains)

        market_ok = True
        if markets:
            market_ok = any(tag in market_context for tag in markets)

        if domain_ok and market_ok:
            selected.append(_orm_control_to_model(record))

    return selected
