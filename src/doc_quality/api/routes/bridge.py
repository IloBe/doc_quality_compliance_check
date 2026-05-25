"""Bridge run endpoints for production-grade compliance execution."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import uuid
from typing import Any

from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
from ...core.session_auth import AuthenticatedUser, require_roles
from ...models.compliance import ProductDomainInfo
from ...models.model_policy import ActiveModelInfo
from ...models.orm import AuditEventORM, BridgeHumanReviewORM, FindingORM
from ...services.model_policy_service import resolve_active_model
from ...services.governance_service import list_applicable_governance_controls_for_bridge
from ...services.compliance_checker import (
    check_eu_ai_act_compliance,
    get_bridge_framework_catalog,
    get_eu_ai_act_requirements_catalog,
    get_eu_ai_act_requirements_signature,
    get_eu_ai_act_requirements_version,
    run_bridge_compliance_checks,
)
from ...services.bridge_privacy_service import (
    assess_privacy_violation,
    build_local_sandbox_plan,
)
from ...services.bridge_mitigation_service import build_bridge_mitigation_recommendations
from ...services.bridge_orchestrator_service import (
    BridgeRuntimeTopologyAssessment,
    build_runtime_topology_assessment,
)
from ...services.skills_service import get_document
from ...services.skills_service import (
    WORKFLOW_STATUS_APPROVED,
    WORKFLOW_STATUS_IN_REVIEW,
    WORKFLOW_STATUS_REWORK_AFTER_REVIEW,
    set_document_workflow_status,
)

router = APIRouter(prefix="/bridge", tags=["bridge"])


class BridgeRunRequest(BaseModel):
    """Bridge compliance run request payload."""

    document_id: str = Field(min_length=3)
    domain_info: ProductDomainInfo


class RequirementResult(BaseModel):
    """Single requirement result returned by bridge run."""

    requirement_id: str
    framework: str = "eu_ai_act"
    title: str
    mandatory: bool
    passed: bool
    gap_description: str | None = None


class RegulatoryUpdateStatus(BaseModel):
    """Regulatory drift status vs last approved run."""

    current_requirements_version: str
    current_requirements_signature: str
    last_approved_requirements_signature: str | None = None
    last_approved_run_at: datetime | None = None
    has_changed_since_last_approved_run: bool = False
    requires_document_update: bool = False
    message: str


class BridgeSandboxStepResultResponse(BaseModel):
    """Execution metadata for one isolated bridge agent sandbox step."""

    step_id: str
    agent_id: str
    sandbox_id: str
    model_provider: str
    model_id: str
    sandbox_mode: str
    egress_policy: str
    processed_locally: bool


class BridgeMitigationProposalResponse(BaseModel):
    """User-facing mitigation proposal generated during bridge run."""

    proposal_id: str
    title: str
    details: str
    implementation_status: str = "proposed"
    implementation_note: str | None = None


class BridgePrivacyViolationResponse(BaseModel):
    """Bridge privacy-violation assessment and mitigation payload."""

    detected: bool
    summary: str
    matched_signals: list[str] = Field(default_factory=list)
    proposals: list[BridgeMitigationProposalResponse] = Field(default_factory=list)


class BridgeMitigationRecommendationResponse(BaseModel):
    """Actionable quality-gate mitigation recommendation for failed controls."""

    topic: str
    proposal: str


class BridgeAgentRuntimeTopologyResponse(BaseModel):
    """Observed runtime topology evidence for one bridge agent container."""

    agent_id: str
    sandbox_id: str
    orchestrator_managed: bool
    container_name: str
    container_id: str | None = None
    deployed: bool
    running: bool
    health_status: str
    network_id: str | None = None
    proof_source: str


class BridgeRuntimeTopologyResponse(BaseModel):
    """Workflow-orchestrator-backed topology proof for the full bridge run."""

    checked_at: datetime
    orchestrator_name: str
    orchestrator_mode: str
    topology_source: str
    explicitly_proven: bool
    isolated_deployments: bool
    all_agents_healthy: bool
    agents: list[BridgeAgentRuntimeTopologyResponse] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)


class BridgeRunResponse(BaseModel):
    """Bridge run execution result payload."""

    run_id: str
    document_id: str
    active_model: ActiveModelInfo
    framework: str
    compliance_score: float
    summary: str
    requirements: list[RequirementResult]
    mandatory_gaps: list[str]
    optional_gaps: list[str]
    approved: bool
    automatic_recommendation: str
    human_review_required: bool
    human_review_status: str
    requirements_version: str
    requirements_signature: str
    requirements_catalog: list[dict]
    checked_frameworks: list[str] = Field(default_factory=list)
    governance_controls: list[dict] = Field(default_factory=list)
    mitigation_recommendations: list[BridgeMitigationRecommendationResponse] = Field(default_factory=list)
    sandbox_steps: list[BridgeSandboxStepResultResponse] = Field(default_factory=list)
    runtime_topology: BridgeRuntimeTopologyResponse | None = None
    privacy_violation: BridgePrivacyViolationResponse
    regulatory_update: RegulatoryUpdateStatus


class BridgeRegulatoryAlertResponse(BaseModel):
    """Regulatory alert response for popup notifications."""

    document_id: str
    active_model: ActiveModelInfo
    regulatory_update: RegulatoryUpdateStatus


class BridgeHumanReviewRequest(BaseModel):
    """Human decision request for a specific bridge run."""

    document_id: str = Field(min_length=3)
    decision: str = Field(pattern="^(approved|rejected)$")
    reason: str = Field(min_length=5, max_length=4000)
    next_task_type: str | None = Field(default=None, pattern="^(rerun_bridge|manual_follow_up)$")
    next_task_assignee: str | None = Field(default=None, max_length=255)
    next_task_instructions: str | None = Field(default=None, max_length=4000)
    assignee_notified: bool = True


class BridgeHumanReviewResponse(BaseModel):
    """Stored human decision record for bridge run reproducibility."""

    review_id: str
    run_id: str
    document_id: str
    decision: str
    reason: str
    reviewer_email: str
    reviewer_roles: list[str]
    reviewed_at: datetime
    next_task_type: str | None = None
    next_task_assignee: str | None = None
    next_task_instructions: str | None = None
    assignee_notified: bool


class BridgeAgentStatus(BaseModel):
    """Single bridge agent readiness status."""

    agent_id: str
    label: str
    status: str
    source: str


class BridgeAgentsReloadResponse(BaseModel):
    """Response payload for bridge agent reload operation."""

    reload_id: str
    reloaded_at: datetime
    requirements_version: str
    requirements_signature: str
    agents: list[BridgeAgentStatus]
    message: str


class BridgeAgentModelSelfCheckResponse(BaseModel):
    """Local-model readiness status for one bridge agent step."""

    agent_id: str
    model_provider: str
    model_id: str
    processed_locally: bool
    is_local_ollama: bool


class BridgeDatabaseSelfCheckResponse(BaseModel):
    """Bridge-critical database readiness and migration-drift details."""

    database_dialect: str
    required_tables: list[str] = Field(default_factory=list)
    missing_tables: list[str] = Field(default_factory=list)
    missing_columns: dict[str, list[str]] = Field(default_factory=dict)
    expected_migration_head: str | None = None
    current_migration_revision: str | None = None
    migration_drift_detected: bool = False
    migration_drift_reason: str | None = None


class BridgeRuntimeSelfCheckResponse(BaseModel):
    """Startup-readiness report used to allow/deny bridge runs."""

    checked_at: datetime
    status: str
    bridge_run_allowed: bool
    database: BridgeDatabaseSelfCheckResponse
    agent_models: list[BridgeAgentModelSelfCheckResponse] = Field(default_factory=list)
    topology: BridgeRuntimeTopologyResponse | None = None
    issues: list[str] = Field(default_factory=list)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _latest_approved_bridge_event(db: Session, document_id: str) -> AuditEventORM | None:
    events = (
        db.query(AuditEventORM)
        .filter(
            AuditEventORM.subject_type == "document",
            AuditEventORM.subject_id == document_id,
            AuditEventORM.event_type == "bridge.run.approved",
        )
        .order_by(AuditEventORM.event_time.desc())
        .all()
    )
    return events[0] if events else None


def _find_bridge_run_completed_event(db: Session, run_id: str, document_id: str) -> AuditEventORM | None:
    return (
        db.query(AuditEventORM)
        .filter(
            AuditEventORM.event_type == "bridge.run.completed",
            AuditEventORM.subject_type == "document",
            AuditEventORM.subject_id == document_id,
            AuditEventORM.correlation_id == run_id,
        )
        .order_by(AuditEventORM.event_time.desc())
        .first()
    )


def _review_to_response(review: BridgeHumanReviewORM) -> BridgeHumanReviewResponse:
    return BridgeHumanReviewResponse(
        review_id=review.review_id,
        run_id=review.run_id,
        document_id=review.document_id,
        decision=review.decision,
        reason=review.reason,
        reviewer_email=review.reviewer_email,
        reviewer_roles=list(review.reviewer_roles or []),
        reviewed_at=_coerce_utc(review.reviewed_at) or _now_utc(),
        next_task_type=review.next_task_type,
        next_task_assignee=review.next_task_assignee,
        next_task_instructions=review.next_task_instructions,
        assignee_notified=bool(review.assignee_notified),
    )


def _current_bridge_agents_status() -> list[BridgeAgentStatus]:
    """Return current bridge agent readiness snapshot."""
    return [
        BridgeAgentStatus(agent_id="inspection", label="Inspection Agent", status="ready", source="backend"),
        BridgeAgentStatus(agent_id="compliance", label="Compliance Agent", status="ready", source="backend"),
        BridgeAgentStatus(agent_id="research", label="Research Agent", status="ready", source="backend"),
        BridgeAgentStatus(agent_id="quality_gate", label="Quality Gate", status="ready", source="backend"),
    ]


_REQUIRED_BRIDGE_TABLES: dict[str, list[str]] = {
    "hitl_reviews": ["review_id", "document_id", "status"],
    "skill_documents": ["document_id", "filename", "workflow_status"],
    "document_locks": ["document_id", "locked_by", "locked_at", "expires_at"],
    "skill_findings": ["finding_id", "document_id"],
    "audit_events": ["event_id", "event_type"],
    "user_sessions": ["session_id", "session_token_hash", "user_email"],
    "quality_observations": ["observation_id", "aspect", "outcome", "source_component"],
    "governance_controls": ["control_id", "framework_id", "activation_mode", "is_active"],
    "model_policy_configs": ["config_id", "default_model_id", "items", "updated_at"],
    "stakeholder_profiles": ["profile_id", "title", "permissions", "is_active"],
    "stakeholder_employee_assignments": ["assignment_id", "profile_id", "employee_name"],
}


def _load_expected_migration_head() -> tuple[str | None, str | None]:
    """Return expected Alembic head and optional warning message."""
    try:
        repo_root = Path(__file__).resolve().parents[4]
        alembic_ini = repo_root / "migrations" / "alembic.ini"
        config = AlembicConfig(str(alembic_ini))
        script = ScriptDirectory.from_config(config)
        return script.get_current_head(), None
    except Exception as exc:  # defensive fallback for startup environments
        return None, f"unable to resolve alembic head: {type(exc).__name__}"


def _build_bridge_runtime_self_check(
    *,
    db: Session,
    active_model: ActiveModelInfo,
    sandbox_steps: list,
) -> BridgeRuntimeSelfCheckResponse:
    """Compute bridge runtime readiness for migration drift and local model policy."""
    issues: list[str] = []

    db_bind = db.get_bind()
    db_dialect = db_bind.dialect.name if db_bind is not None else "unknown"
    inspector = inspect(db_bind)

    missing_tables: list[str] = []
    missing_columns: dict[str, list[str]] = {}
    for table_name, required_columns in _REQUIRED_BRIDGE_TABLES.items():
        if not inspector.has_table(table_name):
            missing_tables.append(table_name)
            continue

        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        table_missing_columns = [column for column in required_columns if column not in existing_columns]
        if table_missing_columns:
            missing_columns[table_name] = table_missing_columns

    if missing_tables:
        issues.append(f"missing required tables: {', '.join(sorted(missing_tables))}")
    if missing_columns:
        details = "; ".join(
            f"{table} -> {', '.join(columns)}" for table, columns in sorted(missing_columns.items())
        )
        issues.append(f"missing required columns: {details}")

    expected_head, head_warning = _load_expected_migration_head()
    current_revision: str | None = None
    migration_drift_reason: str | None = None
    migration_drift_detected = False

    if db_dialect == "sqlite":
        migration_drift_reason = "migration drift check skipped for sqlite runtime"
    else:
        if not inspector.has_table("alembic_version"):
            migration_drift_detected = True
            migration_drift_reason = "alembic_version table is missing"
        else:
            row = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar()
            current_revision = str(row) if row else None
            if expected_head and current_revision and current_revision != expected_head:
                migration_drift_detected = True
                migration_drift_reason = (
                    f"database revision {current_revision} differs from code head {expected_head}"
                )
            elif expected_head and not current_revision:
                migration_drift_detected = True
                migration_drift_reason = "database has no current alembic revision"

    if migration_drift_detected:
        issues.append(f"migration drift detected: {migration_drift_reason}")
    if head_warning and not migration_drift_reason:
        migration_drift_reason = head_warning

    agent_checks: list[BridgeAgentModelSelfCheckResponse] = []
    for step in sandbox_steps:
        provider = (step.model_provider or "").strip().lower()
        is_local_ollama = provider == "ollama" and bool(step.processed_locally)
        if not is_local_ollama:
            issues.append(
                f"agent {step.agent_id.value} is not running as local ollama (provider={provider or 'unknown'})"
            )
        agent_checks.append(
            BridgeAgentModelSelfCheckResponse(
                agent_id=step.agent_id.value,
                model_provider=provider or "unknown",
                model_id=step.model_id,
                processed_locally=bool(step.processed_locally),
                is_local_ollama=is_local_ollama,
            )
        )

    settings = get_settings()
    topology_assessment = build_runtime_topology_assessment(
        settings=settings,
        sandbox_steps=sandbox_steps,
    )
    if settings.bridge_topology_proof_required and not topology_assessment.explicitly_proven:
        issues.append(
            "bridge runtime topology proof failed: expected 4 orchestrated containerized sandboxes "
            "(inspection/compliance/research/quality_gate) with explicit runtime evidence"
        )
    issues.extend(topology_assessment.issues)

    database_check = BridgeDatabaseSelfCheckResponse(
        database_dialect=db_dialect,
        required_tables=sorted(_REQUIRED_BRIDGE_TABLES.keys()),
        missing_tables=sorted(missing_tables),
        missing_columns=missing_columns,
        expected_migration_head=expected_head,
        current_migration_revision=current_revision,
        migration_drift_detected=migration_drift_detected,
        migration_drift_reason=migration_drift_reason,
    )

    ready = len(issues) == 0
    return BridgeRuntimeSelfCheckResponse(
        checked_at=_now_utc(),
        status="ready" if ready else "blocked",
        bridge_run_allowed=ready,
        database=database_check,
        agent_models=agent_checks,
        topology=_to_runtime_topology_response(topology_assessment),
        issues=issues,
    )


def _to_runtime_topology_response(assessment: BridgeRuntimeTopologyAssessment) -> BridgeRuntimeTopologyResponse:
    """Convert service-layer runtime topology assessment to API response model."""
    return BridgeRuntimeTopologyResponse(
        checked_at=assessment.checked_at,
        orchestrator_name=assessment.orchestrator_name,
        orchestrator_mode=assessment.orchestrator_mode,
        topology_source=assessment.topology_source,
        explicitly_proven=assessment.explicitly_proven,
        isolated_deployments=assessment.isolated_deployments,
        all_agents_healthy=assessment.all_agents_healthy,
        agents=[
            BridgeAgentRuntimeTopologyResponse(
                agent_id=item.agent_id,
                sandbox_id=item.sandbox_id,
                orchestrator_managed=item.orchestrator_managed,
                container_name=item.container_name,
                container_id=item.container_id,
                deployed=item.deployed,
                running=item.running,
                health_status=item.health_status,
                network_id=item.network_id,
                proof_source=item.proof_source,
            )
            for item in assessment.agents
        ],
        issues=list(assessment.issues),
    )


def _enforce_local_sandbox_policy(
    *,
    active_model: ActiveModelInfo,
    sandbox_steps: list,
) -> None:
    """Fail fast when bridge runtime is not local-only under strict policy."""
    settings = get_settings()
    if not settings.bridge_local_only_enforced:
        return

    provider = (active_model.provider or "").strip().lower()
    if provider != "ollama":
        raise HTTPException(
            status_code=422,
            detail=(
                "Bridge local-only sandbox policy violation: configured model provider is not local. "
                "Set active model provider to ollama for container/VM-isolated local execution."
            ),
        )

    for step in sandbox_steps:
        if not step.processed_locally:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Bridge local-only sandbox policy violation: at least one step is not processed locally."
                ),
            )
        if settings.bridge_egress_policy == "deny_external" and step.egress_policy != "deny_external":
            raise HTTPException(
                status_code=422,
                detail=(
                    "Bridge local-only sandbox policy violation: egress policy is not deny_external for all steps."
                ),
            )


def _build_regulatory_update_status(db: Session, document_id: str) -> RegulatoryUpdateStatus:
    current_signature = get_eu_ai_act_requirements_signature()
    current_version = get_eu_ai_act_requirements_version()
    approved_event = _latest_approved_bridge_event(db, document_id)

    previous_signature: str | None = None
    previous_time: datetime | None = None
    if approved_event is not None:
        payload = approved_event.payload or {}
        previous_signature = payload.get("requirements_signature")
        previous_time = _coerce_utc(approved_event.event_time)

    has_changed = bool(previous_signature and previous_signature != current_signature)
    requires_update = has_changed

    if requires_update:
        message = (
            "EU AI Act requirement set changed after the last approved bridge run. "
            "Re-validation is required and document updates may be necessary."
        )
    else:
        message = "No EU AI Act requirement drift detected against the last approved bridge run."

    return RegulatoryUpdateStatus(
        current_requirements_version=current_version,
        current_requirements_signature=current_signature,
        last_approved_requirements_signature=previous_signature,
        last_approved_run_at=previous_time,
        has_changed_since_last_approved_run=has_changed,
        requires_document_update=requires_update,
        message=message,
    )


def _resolve_model_sampling_params(active_model: ActiveModelInfo) -> dict[str, Any]:
    """Return model sampling parameters with deterministic defaults."""
    raw_params = active_model.params
    params: dict[str, Any]
    if hasattr(raw_params, "model_dump"):
        params = raw_params.model_dump(mode="json")
    elif isinstance(raw_params, dict):
        params = raw_params
    else:
        params = {}

    def _read_float(key: str, default: float) -> float:
        value = params.get(key, default)
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _read_int(key: str, default: int) -> int:
        value = params.get(key, default)
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    return {
        "temperature": _read_float("temperature", 0.2),
        "top_p": _read_float("top_p", 0.9),
        "top_k": _read_int("top_k", 40),
    }


@router.post("/run/eu-ai-act", response_model=BridgeRunResponse)
async def run_bridge_eu_ai_act(
    request: BridgeRunRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeRunResponse:
    """Execute bridge compliance checks (EU AI Act + mapped standards) and persist audit/finding evidence."""
    document = get_document(db, request.document_id, include_extracted_text=True)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {request.document_id}")

    run_id = str(uuid.uuid4())
    active_model = resolve_active_model(db)
    sandbox_steps = build_local_sandbox_plan(
        model_provider=active_model.provider,
        model_id=active_model.model_id,
    )
    _enforce_local_sandbox_policy(active_model=active_model, sandbox_steps=sandbox_steps)
    runtime_check = _build_bridge_runtime_self_check(
        db=db,
        active_model=active_model,
        sandbox_steps=sandbox_steps,
    )
    if not runtime_check.bridge_run_allowed:
        action_points = [
            "Status: blocked (bridge runtime not ready)",
            "Open /api/v1/bridge/runtime/self-check to inspect readiness details.",
            "Run .\\py313_venv\\Scripts\\python.exe init_postgres.py to resolve migration/table drift.",
            "Ensure active model provider is ollama for all bridge agent steps.",
            "Ensure orchestrator topology proof confirms one healthy containerized sandbox per bridge agent.",
        ]
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Bridge runtime self-check failed. Bridge status is BLOCKED until readiness checks pass.",
                "details": [*action_points, *runtime_check.issues],
                "reason": "bridge_runtime_not_ready",
            },
        )

    privacy_assessment = assess_privacy_violation(document.extracted_text)

    local_processing_enforced = all(step.processed_locally for step in sandbox_steps)
    if not local_processing_enforced:
        # Force explicit violation state when local-only execution is not guaranteed.
        privacy_signals = sorted(set([*privacy_assessment.matched_signals, "local_model_enforcement_failed"]))
        privacy_proposals = [
            BridgeMitigationProposalResponse(
                proposal_id="dp-local-001",
                title="Enforce local provider for every bridge agent sandbox",
                details="Configure bridge runtime policy to deny non-local providers for inspection, compliance, research, and quality-gate steps.",
                implementation_status="implemented",
                implementation_note="Implemented: runtime guard blocks bridge execution when provider is not local ollama.",
            ),
            *[
                BridgeMitigationProposalResponse(
                    proposal_id=item.proposal_id,
                    title=item.title,
                    details=item.details,
                    implementation_status=item.implementation_status,
                    implementation_note=item.implementation_note,
                )
                for item in privacy_assessment.proposals
            ],
        ]
        privacy_result = BridgePrivacyViolationResponse(
            detected=True,
            summary="Bridge run violated local-only sandbox policy for sensitive processing.",
            matched_signals=privacy_signals,
            proposals=privacy_proposals,
        )
    else:
        privacy_result = BridgePrivacyViolationResponse(
            detected=privacy_assessment.violation_detected,
            summary=privacy_assessment.violation_summary,
            matched_signals=privacy_assessment.matched_signals,
            proposals=[
                BridgeMitigationProposalResponse(
                    proposal_id=item.proposal_id,
                    title=item.title,
                    details=item.details,
                    implementation_status=item.implementation_status,
                    implementation_note=item.implementation_note,
                )
                for item in privacy_assessment.proposals
            ],
        )

    check_results = run_bridge_compliance_checks(
        document.extracted_text,
        request.domain_info,
        request.document_id,
    )

    # Keep legacy EU AI Act compatibility fields while aggregating all enabled frameworks.
    compliance_result = check_eu_ai_act_compliance(
        document.extracted_text,
        request.domain_info,
        request.document_id,
    )

    requirements_signature = get_eu_ai_act_requirements_signature()
    requirements_version = get_eu_ai_act_requirements_version()

    requirements_payload: list[RequirementResult] = []
    all_requirements = [req for result in check_results for req in result.requirements]
    aggregated_mandatory_gaps = [gap for result in check_results for gap in result.mandatory_gaps]
    aggregated_optional_gaps = [gap for result in check_results for gap in result.optional_gaps]
    approved = len(aggregated_mandatory_gaps) == 0 and not privacy_result.detected
    total_requirements = len(all_requirements)
    total_met = sum(1 for req in all_requirements if req.met)
    aggregated_score = round((total_met / total_requirements), 2) if total_requirements else 1.0
    checked_frameworks = [result.framework.value for result in check_results]
    applicable_controls = list_applicable_governance_controls_for_bridge(
        db,
        domain_info=request.domain_info,
        checked_frameworks=checked_frameworks,
    )

    for req in all_requirements:
        passed = bool(req.met)
        requirements_payload.append(
            RequirementResult(
                requirement_id=req.requirement_id,
                framework=req.framework.value,
                title=req.title,
                mandatory=req.mandatory,
                passed=passed,
                gap_description=req.gap_description,
            )
        )

        severity = "high" if req.mandatory and not passed else ("medium" if not passed else "low")
        finding = FindingORM(
            finding_id=str(uuid.uuid4()),
            document_id=request.document_id,
            finding_type="bridge_compliance_requirement",
            title=f"{req.requirement_id} {req.title}",
            description=req.gap_description or "Requirement check passed",
            severity=severity,
            evidence={
                "framework": "EU AI Act",
                "framework_id": req.framework.value,
                "requirement_id": req.requirement_id,
                "mandatory": req.mandatory,
                "passed": passed,
                "status": "passed" if passed else "failed",
                "run_id": run_id,
                "requirements_signature": requirements_signature,
                "requirements_version": requirements_version,
            },
        )
        db.add(finding)

    mitigation_recommendations = build_bridge_mitigation_recommendations(requirements_payload)
    model_sampling_params = _resolve_model_sampling_params(active_model)
    controls_taken_into_account = [
        {
            "framework": req.framework.value,
            "requirement_id": req.requirement_id,
            "topic": req.title,
            "mandatory": bool(req.mandatory),
            "result": "passed" if req.met else "failed",
        }
        for req in all_requirements
    ]
    found_issues = [
        {
            "framework": req.framework,
            "requirement_id": req.requirement_id,
            "topic": req.title,
            "description": req.gap_description or "Requirement not satisfied.",
        }
        for req in requirements_payload
        if req.passed is False
    ]
    if privacy_result.detected:
        found_issues.append(
            {
                "framework": "privacy",
                "requirement_id": "PRIVACY-VIOLATION",
                "topic": "Bridge privacy violation",
                "description": privacy_result.summary,
            }
        )

    proposed_mitigations = [
        {
            "topic": item.topic,
            "proposal": item.proposal,
            "source": "control_violation",
        }
        for item in mitigation_recommendations
    ] + [
        {
            "topic": proposal.title,
            "proposal": proposal.details,
            "source": "privacy_violation",
        }
        for proposal in privacy_result.proposals
    ]
    if not found_issues:
        proposed_mitigations.append(
            {
                "topic": "Run passed",
                "proposal": "No control violations or privacy issues were found. Bridge run passed successfully.",
                "source": "success",
            }
        )

    reproducibility_audit_payload = {
        "run_initiated_by": {
            "email": user.email,
            "roles": list(user.roles),
            "org": user.org,
            "session_id": user.session_id,
        },
        "document": {
            "document_id": request.document_id,
            "document_name": document.filename,
        },
        "workflow_run_at": _now_utc().strftime("%Y-%m-%d %H:%M"),
        "agent_models": [
            {
                "step_id": item.step_id,
                "agent_id": item.agent_id.value,
                "model_provider": item.model_provider,
                "model_id": item.model_id,
                "model_params": {
                    "temperature": model_sampling_params["temperature"],
                    "top_p": model_sampling_params["top_p"],
                    "top_k": model_sampling_params["top_k"],
                },
                "processed_locally": item.processed_locally,
            }
            for item in sandbox_steps
        ],
        "runtime_topology": (
            runtime_check.topology.model_dump(mode="json")
            if runtime_check.topology is not None
            else None
        ),
        "run_result": {
            "automatic_recommendation": "approved" if approved else "rejected",
            "controls_taken_into_account": controls_taken_into_account,
            "found_issues": found_issues,
            "proposed_mitigations": proposed_mitigations,
            "status_summary": (
                "passed with success"
                if not found_issues
                else "issues found with proposed mitigations"
            ),
        },
    }

    db.add(
        AuditEventORM(
            event_id=str(uuid.uuid4()),
            tenant_id="default",
            org_id=user.org,
            project_id=None,
            event_time=_now_utc(),
            event_type="bridge.run.completed",
            actor_type="user",
            actor_id=user.email,
            subject_type="document",
            subject_id=request.document_id,
            trace_id=None,
            correlation_id=run_id,
            payload={
                "run_id": run_id,
                "framework": "multi_framework",
                "checked_frameworks": checked_frameworks,
                "compliance_score": aggregated_score,
                "approved": approved,
                "requirements_signature": requirements_signature,
                "requirements_version": requirements_version,
                "ai_runtime": active_model.model_dump(mode="json"),
                "sandbox_steps": [
                    {
                        "step_id": item.step_id,
                        "agent_id": item.agent_id.value,
                        "sandbox_id": item.sandbox_id,
                        "model_provider": item.model_provider,
                        "model_id": item.model_id,
                        "sandbox_mode": item.sandbox_mode,
                        "egress_policy": item.egress_policy,
                        "processed_locally": item.processed_locally,
                    }
                    for item in sandbox_steps
                ],
                "privacy_violation": privacy_result.model_dump(mode="json"),
                "runtime_topology": (
                    runtime_check.topology.model_dump(mode="json")
                    if runtime_check.topology is not None
                    else None
                ),
                "reproducibility_audit": reproducibility_audit_payload,
            },
        )
    )

    db.add(
        AuditEventORM(
            event_id=str(uuid.uuid4()),
            tenant_id="default",
            org_id=user.org,
            project_id=None,
            event_time=_now_utc(),
            event_type="bridge.run.recommendation",
            actor_type="user",
            actor_id=user.email,
            subject_type="document",
            subject_id=request.document_id,
            trace_id=None,
            correlation_id=run_id,
            payload={
                "run_id": run_id,
                "framework": "multi_framework",
                "automatic_recommendation": "approved" if approved else "rejected",
                "requires_human_review": True,
                "requirements_signature": requirements_signature,
                "requirements_version": requirements_version,
                "compliance_score": aggregated_score,
                "checked_frameworks": checked_frameworks,
                "ai_runtime": active_model.model_dump(mode="json"),
                "sandbox_steps": [
                    {
                        "step_id": item.step_id,
                        "agent_id": item.agent_id.value,
                        "sandbox_id": item.sandbox_id,
                        "model_provider": item.model_provider,
                        "model_id": item.model_id,
                        "sandbox_mode": item.sandbox_mode,
                        "egress_policy": item.egress_policy,
                        "processed_locally": item.processed_locally,
                    }
                    for item in sandbox_steps
                ],
                "privacy_violation": privacy_result.model_dump(mode="json"),
                "runtime_topology": (
                    runtime_check.topology.model_dump(mode="json")
                    if runtime_check.topology is not None
                    else None
                ),
                "compliance_checks": [
                    {
                        "framework": req.framework.value,
                        "topic": req.title,
                        "result": "passed" if req.met else "failed",
                    }
                    for req in all_requirements
                ],
                "mitigation_recommendations": [item.__dict__ for item in mitigation_recommendations],
                "reproducibility_audit": reproducibility_audit_payload,
            },
        )
    )

    if privacy_result.detected:
        db.add(
            FindingORM(
                finding_id=str(uuid.uuid4()),
                document_id=request.document_id,
                finding_type="bridge_data_privacy_violation",
                title="Bridge privacy violation detected",
                description=privacy_result.summary,
                severity="high",
                evidence={
                    "run_id": run_id,
                    "signals": privacy_result.matched_signals,
                    "proposals": [proposal.model_dump(mode="json") for proposal in privacy_result.proposals],
                },
            )
        )

        db.add(
            AuditEventORM(
                event_id=str(uuid.uuid4()),
                tenant_id="default",
                org_id=None,
                project_id=None,
                event_time=_now_utc(),
                event_type="bridge.run.privacy_violation.detected",
                actor_type="system",
                actor_id="bridge",
                subject_type="document",
                subject_id=request.document_id,
                trace_id=None,
                correlation_id=run_id,
                payload={
                    "run_id": run_id,
                    "summary": privacy_result.summary,
                    "signals": privacy_result.matched_signals,
                    "proposals": [proposal.model_dump(mode="json") for proposal in privacy_result.proposals],
                },
            )
        )

    # A completed bridge run requires mandatory human review; mark document as in-review.
    set_document_workflow_status(db, request.document_id, WORKFLOW_STATUS_IN_REVIEW)

    db.commit()

    regulatory_update = _build_regulatory_update_status(db, request.document_id)

    return BridgeRunResponse(
        run_id=run_id,
        document_id=request.document_id,
        active_model=active_model,
        framework="eu_ai_act",
        compliance_score=aggregated_score,
        summary=(
            f"Bridge multi-framework check complete. "
            f"Frameworks: {', '.join(checked_frameworks)}. "
            f"Mandatory gaps: {len(aggregated_mandatory_gaps)}. Optional gaps: {len(aggregated_optional_gaps)}. "
            f"Privacy violation detected: {'yes' if privacy_result.detected else 'no'}."
        ),
        requirements=requirements_payload,
        mandatory_gaps=aggregated_mandatory_gaps,
        optional_gaps=aggregated_optional_gaps,
        approved=approved,
        automatic_recommendation="approved" if approved else "rejected",
        human_review_required=True,
        human_review_status="pending",
        requirements_version=requirements_version,
        requirements_signature=requirements_signature,
        requirements_catalog=(
            [
                {
                    "framework": "eu_ai_act",
                    "requirements": get_eu_ai_act_requirements_catalog(),
                }
            ]
            + get_bridge_framework_catalog(request.domain_info)
        ),
        checked_frameworks=checked_frameworks,
        governance_controls=[
            {
                "id": control.id,
                "name": control.name,
                "framework": control.framework,
                "framework_id": control.framework_id,
                "control_type": control.control_type,
                "activation_mode": control.activation_mode,
                "domain_tags": control.domain_tags,
                "market_tags": control.market_tags,
                "status": control.status,
                "objective": control.objective,
                "implementation": control.implementation,
                "evidence": control.evidence,
            }
            for control in applicable_controls
        ],
        mitigation_recommendations=[
            BridgeMitigationRecommendationResponse(topic=item.topic, proposal=item.proposal)
            for item in mitigation_recommendations
        ],
        sandbox_steps=[
            BridgeSandboxStepResultResponse(
                step_id=item.step_id,
                agent_id=item.agent_id.value,
                sandbox_id=item.sandbox_id,
                model_provider=item.model_provider,
                model_id=item.model_id,
                sandbox_mode=item.sandbox_mode,
                egress_policy=item.egress_policy,
                processed_locally=item.processed_locally,
            )
            for item in sandbox_steps
        ],
        runtime_topology=runtime_check.topology,
        privacy_violation=privacy_result,
        regulatory_update=regulatory_update,
    )


@router.get("/runtime/self-check", response_model=BridgeRuntimeSelfCheckResponse)
async def get_bridge_runtime_self_check(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeRuntimeSelfCheckResponse:
    """Return startup/runtime readiness details required before bridge execution."""
    active_model = resolve_active_model(db)
    sandbox_steps = build_local_sandbox_plan(
        model_provider=active_model.provider,
        model_id=active_model.model_id,
    )
    return _build_bridge_runtime_self_check(
        db=db,
        active_model=active_model,
        sandbox_steps=sandbox_steps,
    )


@router.get("/runtime/topology", response_model=BridgeRuntimeTopologyResponse)
async def get_bridge_runtime_topology(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeRuntimeTopologyResponse:
    """Return explicit runtime topology proof for bridge orchestrator and agent containers."""
    active_model = resolve_active_model(db)
    sandbox_steps = build_local_sandbox_plan(
        model_provider=active_model.provider,
        model_id=active_model.model_id,
    )
    assessment = build_runtime_topology_assessment(settings=get_settings(), sandbox_steps=sandbox_steps)
    return _to_runtime_topology_response(assessment)


@router.get("/alerts/eu-ai-act/{document_id}", response_model=BridgeRegulatoryAlertResponse)
async def get_bridge_eu_ai_act_alert(
    document_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeRegulatoryAlertResponse:
    """Return EU AI Act requirement drift alert for a specific document."""
    document = get_document(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")

    return BridgeRegulatoryAlertResponse(
        document_id=document_id,
        active_model=resolve_active_model(db),
        regulatory_update=_build_regulatory_update_status(db, document_id),
    )


@router.get("/runs/{run_id}/human-review", response_model=BridgeHumanReviewResponse)
async def get_bridge_human_review(
    run_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeHumanReviewResponse:
    """Return persisted human bridge review decision for a run."""
    review = (
        db.query(BridgeHumanReviewORM)
        .filter(BridgeHumanReviewORM.run_id == run_id)
        .order_by(BridgeHumanReviewORM.reviewed_at.desc())
        .first()
    )
    if review is None:
        raise HTTPException(status_code=404, detail=f"No human review found for run: {run_id}")
    return _review_to_response(review)


@router.post("/agents/reload", response_model=BridgeAgentsReloadResponse)
async def reload_bridge_agents(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeAgentsReloadResponse:
    """Reload and return bridge agent runtime readiness for operational verification."""
    reload_id = str(uuid.uuid4())
    reloaded_at = _now_utc()
    requirements_version = get_eu_ai_act_requirements_version()
    requirements_signature = get_eu_ai_act_requirements_signature()
    agents = _current_bridge_agents_status()

    db.add(
        AuditEventORM(
            event_id=str(uuid.uuid4()),
            tenant_id="default",
            org_id=user.org,
            project_id=None,
            event_time=reloaded_at,
            event_type="bridge.agents.reload.requested",
            actor_type="user",
            actor_id=user.email,
            subject_type="bridge_runtime",
            subject_id="agents",
            trace_id=None,
            correlation_id=reload_id,
            payload={
                "reload_id": reload_id,
                "requirements_version": requirements_version,
                "requirements_signature": requirements_signature,
                "agents": [agent.model_dump() for agent in agents],
            },
        )
    )
    db.commit()

    return BridgeAgentsReloadResponse(
        reload_id=reload_id,
        reloaded_at=reloaded_at,
        requirements_version=requirements_version,
        requirements_signature=requirements_signature,
        agents=agents,
        message="Bridge agents reloaded and runtime readiness snapshot captured.",
    )


@router.post("/runs/{run_id}/human-review", response_model=BridgeHumanReviewResponse)
async def submit_bridge_human_review(
    request: BridgeHumanReviewRequest,
    run_id: str = Path(min_length=1, max_length=64),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect")),
) -> BridgeHumanReviewResponse:
    """Persist mandatory human approval/rejection for a bridge run with reason and next task proposal."""
    run_event = _find_bridge_run_completed_event(db, run_id=run_id, document_id=request.document_id)
    if run_event is None:
        raise HTTPException(status_code=404, detail=f"Bridge run not found for run_id={run_id}, document_id={request.document_id}")

    existing = db.query(BridgeHumanReviewORM).filter(BridgeHumanReviewORM.run_id == run_id).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Human review already submitted for run: {run_id}")

    decision = request.decision.strip().lower()
    reason = request.reason.strip()
    next_task_type = request.next_task_type.strip().lower() if request.next_task_type else None
    next_task_assignee = request.next_task_assignee.strip() if request.next_task_assignee else None
    next_task_instructions = request.next_task_instructions.strip() if request.next_task_instructions else None

    if decision == "rejected" and not next_task_type:
        raise HTTPException(status_code=422, detail="next_task_type is required when decision is rejected")
    if decision == "approved" and next_task_type:
        raise HTTPException(status_code=422, detail="next_task_type must be omitted when decision is approved")
    if next_task_type == "manual_follow_up" and not next_task_assignee:
        raise HTTPException(status_code=422, detail="next_task_assignee is required for manual_follow_up tasks")

    reviewed_at = _now_utc()
    review = BridgeHumanReviewORM(
        review_id=str(uuid.uuid4()),
        run_id=run_id,
        document_id=request.document_id,
        decision=decision,
        reason=reason,
        reviewer_email=user.email,
        reviewer_roles=list(user.roles),
        reviewed_at=reviewed_at,
        next_task_type=next_task_type,
        next_task_assignee=next_task_assignee,
        next_task_instructions=next_task_instructions,
        assignee_notified=bool(request.assignee_notified if decision == "rejected" else False),
    )
    db.add(review)

    db.add(
        AuditEventORM(
            event_id=str(uuid.uuid4()),
            tenant_id="default",
            org_id=user.org,
            project_id=None,
            event_time=reviewed_at,
            event_type="bridge.run.approved" if decision == "approved" else "bridge.run.rejected",
            actor_type="user",
            actor_id=user.email,
            subject_type="document",
            subject_id=request.document_id,
            trace_id=None,
            correlation_id=run_id,
            payload={
                "run_id": run_id,
                "human_review": {
                    "decision": decision,
                    "reason": reason,
                    "reviewer_roles": list(user.roles),
                    "reviewed_at": reviewed_at.isoformat(),
                },
                "next_task": {
                    "type": next_task_type,
                    "assignee": next_task_assignee,
                    "instructions": next_task_instructions,
                    "assignee_notified": bool(request.assignee_notified if decision == "rejected" else False),
                },
            },
        )
    )

    if decision == "rejected" and next_task_type:
        db.add(
            AuditEventORM(
                event_id=str(uuid.uuid4()),
                tenant_id="default",
                org_id=user.org,
                project_id=None,
                event_time=reviewed_at,
                event_type="bridge.run.next_task.proposed",
                actor_type="user",
                actor_id=user.email,
                subject_type="document",
                subject_id=request.document_id,
                trace_id=None,
                correlation_id=run_id,
                payload={
                    "run_id": run_id,
                    "task_type": next_task_type,
                    "assignee": next_task_assignee,
                    "instructions": next_task_instructions,
                    "assignee_notified": bool(request.assignee_notified),
                },
            )
        )

    if decision == "approved":
        set_document_workflow_status(db, request.document_id, WORKFLOW_STATUS_APPROVED)
    else:
        set_document_workflow_status(db, request.document_id, WORKFLOW_STATUS_REWORK_AFTER_REVIEW)

    db.commit()
    db.refresh(review)
    return _review_to_response(review)
