"""Bridge privacy-violation detection and sandbox step planning.

This module keeps privacy-specific bridge logic isolated from API routing and
framework compliance scoring. It provides deterministic, testable helpers for:
- modeling per-agent local sandbox execution metadata,
- detecting explicit LLM/GenAI privacy-violation signals in document text,
- producing user-readable mitigation proposals for bridge UI presentation.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from ..core.logging_config import get_logger

logger = get_logger(__name__)


class BridgeAgentId(str, Enum):
    """Canonical bridge agent identifiers used by backend and UI."""

    INSPECTION = "inspection"
    COMPLIANCE = "compliance"
    RESEARCH = "research"
    QUALITY_GATE = "quality_gate"


@dataclass(frozen=True)
class SandboxStepResult:
    """Execution metadata for one bridge step running in a local sandbox model."""

    step_id: str
    agent_id: BridgeAgentId
    sandbox_id: str
    model_provider: str
    model_id: str
    sandbox_mode: str
    egress_policy: str
    processed_locally: bool


@dataclass(frozen=True)
class MitigationProposal:
    """Single mitigation proposal rendered in UI and persisted in bridge evidence."""

    proposal_id: str
    title: str
    details: str
    implementation_status: str = "proposed"
    implementation_note: str | None = None


@dataclass(frozen=True)
class PrivacyViolationAssessment:
    """Bridge privacy-violation decision payload."""

    violation_detected: bool
    violation_summary: str
    matched_signals: list[str]
    proposals: list[MitigationProposal]


_VIOLATION_SIGNAL_PATTERNS: dict[str, tuple[str, ...]] = {
    "medical_context": ("patient", "x-ray", "chest", "hospital", "diagnostic"),
    "direct_identifier": ("address", "male", "age", "stockholm", "sweden"),
    "privacy_violation_claim": ("gdpr", "violation", "security violation"),
    "genai_processing_claim": ("llm", "genai", "model", "prompt", "output"),
    "failed_mitigation_repeat": ("no success", "happened again", "recurred", "follow-up"),
}


def build_local_sandbox_plan(*, model_provider: str, model_id: str) -> list[SandboxStepResult]:
    """Return one isolated local sandbox plan item per bridge agent step.

    The first implementation target uses strict local processing metadata for all
    bridge agents. Each step receives a stable, dedicated sandbox identifier.
    """
    provider = model_provider.strip().lower() or "ollama"
    resolved_model = model_id.strip() or "llama3.1:8b"

    steps = [
        SandboxStepResult(
            step_id="bridge_step_1",
            agent_id=BridgeAgentId.INSPECTION,
            sandbox_id="bridge-inspection-sandbox",
            model_provider=provider,
            model_id=resolved_model,
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=provider == "ollama",
        ),
        SandboxStepResult(
            step_id="bridge_step_2",
            agent_id=BridgeAgentId.COMPLIANCE,
            sandbox_id="bridge-compliance-sandbox",
            model_provider=provider,
            model_id=resolved_model,
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=provider == "ollama",
        ),
        SandboxStepResult(
            step_id="bridge_step_3",
            agent_id=BridgeAgentId.RESEARCH,
            sandbox_id="bridge-research-sandbox",
            model_provider=provider,
            model_id=resolved_model,
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=provider == "ollama",
        ),
        SandboxStepResult(
            step_id="bridge_step_4",
            agent_id=BridgeAgentId.QUALITY_GATE,
            sandbox_id="bridge-quality-gate-sandbox",
            model_provider=provider,
            model_id=resolved_model,
            sandbox_mode="local_isolated",
            egress_policy="deny_external",
            processed_locally=provider == "ollama",
        ),
    ]

    logger.info(
        "bridge_local_sandbox_plan_created",
        provider=provider,
        model_id=resolved_model,
        steps=len(steps),
    )
    return steps


def assess_privacy_violation(document_content: str) -> PrivacyViolationAssessment:
    """Detect explicit bridge privacy-violation patterns and return mitigations.

    Detection is intentionally deterministic and conservative for auditability.
    """
    text = (document_content or "").lower()
    matched_signals: list[str] = []

    for signal_name, terms in _VIOLATION_SIGNAL_PATTERNS.items():
        if any(term in text for term in terms):
            matched_signals.append(signal_name)

    violation_detected = len(matched_signals) >= 3

    if not violation_detected:
        return PrivacyViolationAssessment(
            violation_detected=False,
            violation_summary="No explicit GDPR/GenAI privacy-violation pattern detected by bridge heuristics.",
            matched_signals=matched_signals,
            proposals=[],
        )

    proposals = [
        MitigationProposal(
            proposal_id="dp-001",
            title="Apply deterministic PHI/PII redaction before model invocation",
            details="Mask names, addresses, age/sex markers, and hospital identifiers before any LLM/GenAI step.",
            implementation_status="proposed",
            implementation_note="Planned: enforce pre-inference redaction stage across all sensitive bridge paths.",
        ),
        MitigationProposal(
            proposal_id="dp-002",
            title="Enforce local-only sandbox execution for all bridge agent steps",
            details="Run inspection, compliance, research, and quality-gate agents in separate local sandboxes with external egress denied.",
            implementation_status="implemented",
            implementation_note="Implemented: bridge runtime enforces local ollama-only execution with deny_external egress checks.",
        ),
        MitigationProposal(
            proposal_id="dp-003",
            title="Block persistence of raw prompt/output containing sensitive health context",
            details="Store only redacted, schema-validated artifacts and retain full traces only in short-lived restricted stores.",
            implementation_status="proposed",
            implementation_note="Planned: stricter persistence minimization and retention-tier controls for prompt/output artifacts.",
        ),
        MitigationProposal(
            proposal_id="dp-004",
            title="Require human approval for repeated-risk incidents",
            details="Automatically route bridge runs with repeated mitigation failure to mandatory reviewer rejection/approval workflow.",
            implementation_status="implemented",
            implementation_note="Implemented: bridge runs require mandatory human HITL approval/rejection workflow with auditable decisions.",
        ),
    ]

    return PrivacyViolationAssessment(
        violation_detected=True,
        violation_summary="Explicit GDPR and LLM/GenAI security-violation indicators detected in bridge document context.",
        matched_signals=matched_signals,
        proposals=proposals,
    )
