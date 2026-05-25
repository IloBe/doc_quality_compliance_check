"""Bridge mitigation recommendation builder.

This module transforms failed bridge control checks into actionable mitigation
recommendations. It intentionally avoids echoing requirement findings verbatim,
so quality-gate output stays focused on remediation actions.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Sequence


class BridgeRequirementLike(Protocol):
    """Minimal failed-requirement shape needed for mitigation mapping."""

    requirement_id: str
    framework: str
    title: str
    passed: bool
    gap_description: str | None


@dataclass(frozen=True)
class BridgeMitigationRecommendation:
    """Single quality-gate recommendation derived from failed controls."""

    topic: str
    proposal: str


_CATEGORY_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "data_protection",
        (
            "privacy",
            "personal data",
            "sensitive",
            "phi",
            "pii",
            "redact",
            "minimiz",
            "retention",
            "gdpr",
        ),
    ),
    (
        "access_control",
        (
            "access",
            "authentication",
            "authorization",
            "identity",
            "least privilege",
            "rbac",
            "credential",
            "account",
        ),
    ),
    (
        "monitoring_response",
        (
            "incident",
            "logging",
            "monitor",
            "alert",
            "detection",
            "trace",
            "forensic",
            "response",
        ),
    ),
    (
        "risk_management",
        (
            "risk",
            "hazard",
            "threat",
            "assessment",
            "mitigation",
            "residual",
        ),
    ),
    (
        "lifecycle_validation",
        (
            "validation",
            "verification",
            "testing",
            "lifecycle",
            "change",
            "release",
            "clinical",
            "evaluation",
        ),
    ),
    (
        "documentation_governance",
        (
            "document",
            "evidence",
            "procedure",
            "policy",
            "sop",
            "training",
            "governance",
            "oversight",
        ),
    ),
)

_CATEGORY_TEMPLATES: dict[str, tuple[str, str]] = {
    "data_protection": (
        "Close data-protection control gaps",
        "Implement data minimization, deterministic redaction, and retention-bound storage controls. "
        "Attach updated data-flow mapping, redaction test evidence, and approver sign-off.",
    ),
    "access_control": (
        "Harden access-control enforcement",
        "Implement least-privilege access policy updates, enforce strong authentication, and verify access revocation workflows. "
        "Attach access matrix, test execution evidence, and owner approval.",
    ),
    "monitoring_response": (
        "Strengthen monitoring and incident response",
        "Add structured logging, alert thresholds, and incident-response playbooks for bridge-critical paths. "
        "Attach log samples, alert test evidence, and incident drill results.",
    ),
    "risk_management": (
        "Update risk-treatment controls",
        "Re-assess identified risks, define treatment owners/due dates, and verify residual-risk acceptance through formal review. "
        "Attach risk register updates and governance approval evidence.",
    ),
    "lifecycle_validation": (
        "Reinforce lifecycle validation evidence",
        "Execute targeted verification and validation for affected components before rerun. "
        "Attach test protocol, execution results, and release readiness decision.",
    ),
    "documentation_governance": (
        "Close governance and evidence traceability gaps",
        "Update SOP/policy artifacts and map each control to concrete implementation evidence. "
        "Attach revised documents, traceability matrix, and review records.",
    ),
    "general_control": (
        "Implement corrective actions for failed controls",
        "Create a corrective-action plan with owner, due date, and verification criteria for each failed control before the next bridge run.",
    ),
}


def _classify_requirement(text: str) -> str:
    lower = text.lower()
    for category, keywords in _CATEGORY_RULES:
        if any(keyword in lower for keyword in keywords):
            return category
    return "general_control"


def _format_references(references: Sequence[str]) -> str:
    ordered = sorted(set(references))
    if len(ordered) <= 4:
        return ", ".join(ordered)
    return f"{', '.join(ordered[:4])} (+{len(ordered) - 4} more)"


def build_bridge_mitigation_recommendations(
    requirements: Sequence[BridgeRequirementLike],
    *,
    limit: int = 6,
) -> list[BridgeMitigationRecommendation]:
    """Build actionable mitigation recommendations from failed bridge requirements."""
    failed_requirements = [item for item in requirements if item.passed is False]
    if not failed_requirements:
        return []

    buckets: dict[str, list[str]] = {}
    for requirement in failed_requirements:
        details = f"{requirement.title or ''} {requirement.gap_description or ''}".strip()
        category = _classify_requirement(details)
        reference = f"{requirement.requirement_id} ({requirement.framework})"
        buckets.setdefault(category, []).append(reference)

    recommendations: list[BridgeMitigationRecommendation] = []
    for category in _CATEGORY_TEMPLATES:
        references = buckets.get(category)
        if not references:
            continue
        topic, baseline_action = _CATEGORY_TEMPLATES[category]
        proposal = f"{baseline_action} Affected controls: {_format_references(references)}."
        recommendations.append(BridgeMitigationRecommendation(topic=topic, proposal=proposal))
        if len(recommendations) >= limit:
            break

    return recommendations