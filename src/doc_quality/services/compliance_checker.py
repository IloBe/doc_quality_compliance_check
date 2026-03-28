"""Compliance checker service for EU AI Act and other regulations."""
import hashlib
import json
import uuid

from ..core.logging_config import get_logger
from ..models.compliance import (
    AIActRole,
    ComplianceCheckResult,
    ComplianceFramework,
    ComplianceRequirement,
    ProductDomainInfo,
    RiskLevel,
)

logger = get_logger(__name__)

# EU AI Act high-risk use cases (Annex III categories)
EU_AI_ACT_HIGH_RISK_CATEGORIES: list[str] = [
    "biometric identification",
    "critical infrastructure",
    "education",
    "employment",
    "essential private services",
    "law enforcement",
    "migration and border control",
    "administration of justice",
    "medical devices",
    "safety components of products",
]

EU_AI_ACT_REQUIREMENTS: list[dict] = [
    {
        "id": "EUAIA-1",
        "title": "Risk Management System",
        "mandatory": True,
        "description": "Establish, implement, document and maintain a risk management system (Art. 9)",
    },
    {
        "id": "EUAIA-2",
        "title": "Data and Data Governance",
        "mandatory": True,
        "description": "Training, validation and testing datasets must meet quality criteria (Art. 10)",
    },
    {
        "id": "EUAIA-3",
        "title": "Technical Documentation",
        "mandatory": True,
        "description": "Draw up technical documentation before placing AI system on market (Art. 11 + Annex IV)",
    },
    {
        "id": "EUAIA-4",
        "title": "Record-Keeping / Logging",
        "mandatory": True,
        "description": "High-risk AI systems shall be designed with automatic logging capabilities (Art. 12)",
    },
    {
        "id": "EUAIA-5",
        "title": "Transparency and User Information",
        "mandatory": True,
        "description": "Ensure sufficient transparency to enable deployers to interpret output (Art. 13)",
    },
    {
        "id": "EUAIA-6",
        "title": "Human Oversight",
        "mandatory": True,
        "description": "Design AI systems to be effectively overseen by humans (Art. 14)",
    },
    {
        "id": "EUAIA-7",
        "title": "Accuracy, Robustness and Cybersecurity",
        "mandatory": True,
        "description": "High-risk AI systems shall be resilient to errors and attacks (Art. 15)",
    },
    {
        "id": "EUAIA-8",
        "title": "Conformity Assessment",
        "mandatory": True,
        "description": "Undertake a conformity assessment before placing on market (Art. 43)",
    },
    {
        "id": "EUAIA-9",
        "title": "Register in EU database",
        "mandatory": False,
        "description": "Register high-risk AI systems in EU database before placing on market (Art. 49)",
    },
]

DOMAIN_REGULATION_MAP: dict[str, list[ComplianceFramework]] = {
    "medical": [ComplianceFramework.EU_AI_ACT, ComplianceFramework.MDR, ComplianceFramework.ISO_9001],
    "finance": [ComplianceFramework.EU_AI_ACT, ComplianceFramework.GDPR],
    "hr": [ComplianceFramework.EU_AI_ACT, ComplianceFramework.GDPR],
    "general": [ComplianceFramework.EU_AI_ACT, ComplianceFramework.GDPR, ComplianceFramework.ISO_27001],
}


def get_eu_ai_act_requirements_catalog() -> list[dict]:
    """Return canonical EU AI Act requirement catalog used by checker logic."""
    return [
        {
            "id": req["id"],
            "title": req["title"],
            "description": req["description"],
            "mandatory": req["mandatory"],
        }
        for req in EU_AI_ACT_REQUIREMENTS
    ]


def get_eu_ai_act_requirements_signature() -> str:
    """Return stable SHA-256 fingerprint of current EU AI Act requirement catalog."""
    canonical = json.dumps(get_eu_ai_act_requirements_catalog(), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def get_eu_ai_act_requirements_version() -> str:
    """Return short version identifier derived from requirement catalog fingerprint."""
    return f"eu_ai_act:{get_eu_ai_act_requirements_signature()[:12]}"


def determine_ai_act_risk_level(domain_info: ProductDomainInfo) -> RiskLevel:
    """Determine EU AI Act risk level based on product domain and use."""
    description_lower = (
        domain_info.description + " " + (domain_info.intended_use or "")
    ).lower()

    for category in EU_AI_ACT_HIGH_RISK_CATEGORIES:
        if category in description_lower or category in domain_info.domain.lower():
            return RiskLevel.HIGH

    if domain_info.uses_ai_ml:
        return RiskLevel.LIMITED

    return RiskLevel.LOW


def determine_ai_act_role(domain_info: ProductDomainInfo) -> AIActRole:
    """Determine whether the organisation is provider, deployer or both."""
    description_lower = domain_info.description.lower()
    if "develop" in description_lower or "train" in description_lower or "build" in description_lower:
        if "deploy" in description_lower or "use" in description_lower:
            return AIActRole.BOTH
        return AIActRole.PROVIDER
    if "deploy" in description_lower or "integrate" in description_lower:
        return AIActRole.DEPLOYER
    return AIActRole.DEPLOYER  # Default assumption


def get_applicable_regulations(domain_info: ProductDomainInfo) -> list[ComplianceFramework]:
    """Return list of applicable regulations sorted by priority."""
    domain_lower = domain_info.domain.lower()
    for key, frameworks in DOMAIN_REGULATION_MAP.items():
        if key in domain_lower:
            return frameworks
    return DOMAIN_REGULATION_MAP["general"]


def check_eu_ai_act_compliance(
    document_content: str, domain_info: ProductDomainInfo, document_id: str
) -> ComplianceCheckResult:
    """Run EU AI Act compliance check against document content."""
    logger.info("checking_eu_ai_act_compliance", document_id=document_id)

    risk_level = determine_ai_act_risk_level(domain_info)
    ai_role = determine_ai_act_role(domain_info)
    content_lower = document_content.lower()

    requirements: list[ComplianceRequirement] = []
    mandatory_gaps: list[str] = []
    optional_gaps: list[str] = []

    for req_data in EU_AI_ACT_REQUIREMENTS:
        # Simple heuristic: check if key terms are present in document
        key_terms = req_data["title"].lower().split()
        met = any(term in content_lower for term in key_terms if len(term) > 4)
        gap = None if met else f"{req_data['title']}: {req_data['description']}"

        req = ComplianceRequirement(
            requirement_id=req_data["id"],
            framework=ComplianceFramework.EU_AI_ACT,
            title=req_data["title"],
            description=req_data["description"],
            mandatory=req_data["mandatory"],
            met=met,
            gap_description=gap,
        )
        requirements.append(req)

        if not met:
            if req_data["mandatory"] and risk_level == RiskLevel.HIGH:
                mandatory_gaps.append(gap or req_data["title"])
            else:
                optional_gaps.append(gap or req_data["title"])

    met_count = sum(1 for r in requirements if r.met)
    score = met_count / len(requirements) if requirements else 0.0

    summary = (
        f"EU AI Act compliance check complete. Risk level: {risk_level.value}. "
        f"Role: {ai_role.value}. Score: {score:.0%}. "
        f"Mandatory gaps: {len(mandatory_gaps)}. Optional gaps: {len(optional_gaps)}."
    )

    logger.info(
        "eu_ai_act_check_complete",
        document_id=document_id,
        risk_level=risk_level,
        score=score,
        mandatory_gaps=len(mandatory_gaps),
    )

    return ComplianceCheckResult(
        document_id=document_id,
        framework=ComplianceFramework.EU_AI_ACT,
        risk_level=risk_level,
        ai_act_role=ai_role,
        requirements=requirements,
        mandatory_gaps=mandatory_gaps,
        optional_gaps=optional_gaps,
        compliance_score=round(score, 2),
        summary=summary,
    )
