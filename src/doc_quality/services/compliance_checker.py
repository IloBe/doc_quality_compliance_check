"""Compliance checker service for EU AI Act and other regulations."""
import hashlib
import json
import uuid
from collections.abc import Callable

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

ISO_9001_REQUIREMENTS: list[dict] = [
    {
        "id": "ISO9001-7.5",
        "title": "Documented Information Control",
        "mandatory": True,
        "description": "Maintain and control documented information (ISO 9001:2015 Clause 7.5).",
        "key_terms": ["document", "version", "approval", "review", "change control"],
    },
    {
        "id": "ISO9001-6.1",
        "title": "Risk and Opportunity Actions",
        "mandatory": True,
        "description": "Plan actions to address risks/opportunities (ISO 9001:2015 Clause 6.1).",
        "key_terms": ["risk", "mitigation", "control", "opportunity"],
    },
]

ISO_27001_REQUIREMENTS: list[dict] = [
    {
        "id": "ISO27001-A.8.15",
        "title": "Logging",
        "mandatory": True,
        "description": "Implement event logging and monitoring (ISO/IEC 27001:2022 A.8.15).",
        "key_terms": ["logging", "audit", "event", "trace", "monitoring"],
    },
    {
        "id": "ISO27001-A.5.36",
        "title": "Compliance with Policies",
        "mandatory": True,
        "description": "Ensure controls align with internal security policies (ISO/IEC 27001:2022 A.5.36).",
        "key_terms": ["policy", "compliance", "procedure", "governance"],
    },
]

GDPR_REQUIREMENTS: list[dict] = [
    {
        "id": "GDPR-ART-5",
        "title": "Data Processing Principles",
        "mandatory": True,
        "description": "Document lawful, fair, and transparent processing principles (GDPR Art. 5).",
        "key_terms": ["gdpr", "personal data", "lawful", "purpose limitation", "data minimization"],
    },
    {
        "id": "GDPR-ART-32",
        "title": "Security of Processing",
        "mandatory": True,
        "description": "Define technical/organizational security controls for personal data (GDPR Art. 32).",
        "key_terms": ["encryption", "security", "access control", "confidentiality", "integrity"],
    },
]

BSI_GRUNDSCHUTZ_REQUIREMENTS: list[dict] = [
    {
        "id": "BSI-GS-ORP",
        "title": "Information Security Organization",
        "mandatory": True,
        "description": "Establish baseline security organization and governance per BSI IT-Grundschutz.",
        "key_terms": ["grundschutz", "security organization", "isms", "governance", "roles"],
    },
    {
        "id": "BSI-GS-CONOPS",
        "title": "Operational Security Controls",
        "mandatory": True,
        "description": "Provide operational controls for secure operation and incident handling.",
        "key_terms": ["incident", "hardening", "operations", "backup", "monitoring"],
    },
]

ISO_13485_REQUIREMENTS: list[dict] = [
    {
        "id": "ISO13485-4.2",
        "title": "Medical Device QMS Documentation",
        "mandatory": True,
        "description": "Maintain documented QMS processes for medical device lifecycle (ISO 13485:2016 4.2).",
        "key_terms": ["iso 13485", "qms", "medical device", "documented process", "quality manual"],
    },
    {
        "id": "ISO13485-7.3",
        "title": "Design and Development Controls",
        "mandatory": True,
        "description": "Define design/development planning and controls for medical device software.",
        "key_terms": ["design control", "verification", "validation", "development plan", "traceability"],
    },
]

ISO_14971_REQUIREMENTS: list[dict] = [
    {
        "id": "ISO14971-4",
        "title": "Risk Management Process",
        "mandatory": True,
        "description": "Establish and maintain a documented risk management process (ISO 14971:2019 Clause 4).",
        "key_terms": ["iso 14971", "risk management", "hazard", "risk analysis", "residual risk"],
    },
    {
        "id": "ISO14971-10",
        "title": "Production and Post-Production",
        "mandatory": True,
        "description": "Capture post-market information and production feedback into risk control.",
        "key_terms": ["post-market", "complaint", "field data", "production", "surveillance"],
    },
]

IEC_62304_REQUIREMENTS: list[dict] = [
    {
        "id": "IEC62304-5",
        "title": "Software Development Process",
        "mandatory": True,
        "description": "Define software development lifecycle activities and deliverables (IEC 62304).",
        "key_terms": ["iec 62304", "software lifecycle", "software development", "architecture", "unit test"],
    },
    {
        "id": "IEC62304-9",
        "title": "Software Problem Resolution",
        "mandatory": True,
        "description": "Implement software problem resolution and corrective action workflow.",
        "key_terms": ["problem resolution", "bug", "corrective action", "ticket", "defect"],
    },
]

IVDR_REQUIREMENTS: list[dict] = [
    {
        "id": "IVDR-ANNEX-II",
        "title": "IVDR Technical Documentation",
        "mandatory": True,
        "description": "Maintain technical documentation for in-vitro diagnostic devices (IVDR Annex II).",
        "key_terms": ["ivdr", "in vitro", "diagnostic", "annex ii", "technical documentation"],
    },
    {
        "id": "IVDR-PMS",
        "title": "Post-Market Performance Follow-up",
        "mandatory": True,
        "description": "Define post-market performance follow-up obligations for IVD devices.",
        "key_terms": ["post-market", "performance", "follow-up", "ivd", "surveillance"],
    },
]

DORA_REQUIREMENTS: list[dict] = [
    {
        "id": "DORA-ICT-RISK",
        "title": "ICT Risk Management",
        "mandatory": True,
        "description": "Document ICT risk management controls and governance per DORA.",
        "key_terms": ["dora", "ict risk", "resilience", "financial entity", "governance"],
    },
    {
        "id": "DORA-INCIDENT",
        "title": "Incident Reporting",
        "mandatory": True,
        "description": "Define major ICT incident handling and reporting process.",
        "key_terms": ["incident reporting", "major ict incident", "notification", "response", "recovery"],
    },
]

MIFID_II_REQUIREMENTS: list[dict] = [
    {
        "id": "MIFIDII-GOV",
        "title": "Product Governance",
        "mandatory": True,
        "description": "Document product governance controls and client suitability obligations under MiFID II.",
        "key_terms": ["mifid", "product governance", "suitability", "investor protection", "target market"],
    },
    {
        "id": "MIFIDII-RECORDS",
        "title": "Record Keeping",
        "mandatory": True,
        "description": "Maintain records for advisory/investment decisions and communications.",
        "key_terms": ["record keeping", "communication", "trade", "advice", "retention"],
    },
]

PSD2_REQUIREMENTS: list[dict] = [
    {
        "id": "PSD2-SCA",
        "title": "Strong Customer Authentication",
        "mandatory": True,
        "description": "Define strong customer authentication controls for payment operations.",
        "key_terms": ["psd2", "sca", "strong customer authentication", "payment", "authentication"],
    },
    {
        "id": "PSD2-OPEN-API",
        "title": "Secure Open Banking Interfaces",
        "mandatory": True,
        "description": "Provide secure API and consent handling controls for payment initiation/account info.",
        "key_terms": ["open banking", "api", "consent", "payment initiation", "account information"],
    },
]

AGG_REQUIREMENTS: list[dict] = [
    {
        "id": "AGG-NONDISCRIMINATION",
        "title": "Non-discrimination Controls",
        "mandatory": True,
        "description": "Document safeguards to prevent unlawful discrimination in HR decision processes.",
        "key_terms": ["agg", "non-discrimination", "equal treatment", "bias", "protected characteristics"],
    },
    {
        "id": "AGG-REMEDIATION",
        "title": "Complaint and Remediation Process",
        "mandatory": True,
        "description": "Provide complaint handling and remediation process for discrimination claims.",
        "key_terms": ["complaint", "remediation", "investigation", "appeal", "grievance"],
    },
]

NIS2_REQUIREMENTS: list[dict] = [
    {
        "id": "NIS2-RISK",
        "title": "Cybersecurity Risk Measures",
        "mandatory": True,
        "description": "Define risk-management measures for network and information systems under NIS2.",
        "key_terms": ["nis2", "cybersecurity", "risk management", "essential services", "incident"],
    },
    {
        "id": "NIS2-REPORTING",
        "title": "Incident Reporting Duties",
        "mandatory": True,
        "description": "Define significant incident reporting workflow and timelines for competent authorities.",
        "key_terms": ["incident reporting", "authority", "timeline", "major incident", "notification"],
    },
]

CRA_REQUIREMENTS: list[dict] = [
    {
        "id": "CRA-SECURE-BY-DESIGN",
        "title": "Secure-by-Design Product Controls",
        "mandatory": True,
        "description": "Document secure-by-design and vulnerability handling controls under the EU CRA.",
        "key_terms": ["cra", "cyber resilience", "secure by design", "vulnerability", "security update"],
    },
    {
        "id": "CRA-SBOM",
        "title": "Component and Vulnerability Transparency",
        "mandatory": True,
        "description": "Maintain component and known-vulnerability transparency for digital products.",
        "key_terms": ["sbom", "software bill of materials", "component", "vulnerability disclosure", "dependency"],
    },
]

HIPAA_REQUIREMENTS: list[dict] = [
    {
        "id": "HIPAA-SECURITY-RULE",
        "title": "Administrative/Technical Safeguards",
        "mandatory": True,
        "description": "Define HIPAA Security Rule safeguards for ePHI confidentiality and integrity.",
        "key_terms": ["hipaa", "ephi", "security rule", "access control", "audit controls"],
    },
    {
        "id": "HIPAA-PRIVACY-RULE",
        "title": "Privacy Rule Compliance",
        "mandatory": True,
        "description": "Document permitted uses/disclosures and minimum necessary controls for PHI.",
        "key_terms": ["privacy rule", "phi", "minimum necessary", "disclosure", "consent"],
    },
]

BSI_TR_03185_REQUIREMENTS: list[dict] = [
    {
        "id": "BSI-TR03185-SDLC-1",
        "title": "Secure SDLC Governance",
        "mandatory": True,
        "description": "Document secure software lifecycle governance per BSI TR-03185 guidance.",
        "key_terms": ["secure", "sdlc", "lifecycle", "development", "threat"],
    },
    {
        "id": "BSI-TR03185-SDLC-2",
        "title": "Verification and Release Controls",
        "mandatory": True,
        "description": "Define verification gates and secure release controls aligned with TR-03185.",
        "key_terms": ["verification", "testing", "release", "approval", "hardening"],
    },
]

MDR_REQUIREMENTS: list[dict] = [
    {
        "id": "MDR-ANNEX-IX-QMS",
        "title": "MDR QMS Evidence",
        "mandatory": True,
        "description": "Provide QMS and technical documentation references for MDR 2017/745 Annex IX.",
        "key_terms": ["mdr", "medical", "device", "clinical", "annex"],
    },
    {
        "id": "MDR-GSPR",
        "title": "General Safety and Performance Requirements",
        "mandatory": True,
        "description": "Demonstrate linkage to applicable safety/performance controls for regulated medical products.",
        "key_terms": ["safety", "performance", "risk", "clinical", "post-market"],
    },
]

DOMAIN_REGULATION_MAP: dict[str, list[ComplianceFramework]] = {
    "medical": [
        ComplianceFramework.EU_AI_ACT,
        ComplianceFramework.MDR,
        ComplianceFramework.GDPR,
        ComplianceFramework.CRA,
        ComplianceFramework.NIS2,
        ComplianceFramework.ISO_9001,
        ComplianceFramework.ISO_13485,
        ComplianceFramework.ISO_14971,
        ComplianceFramework.IEC_62304,
    ],
    "finance": [
        ComplianceFramework.EU_AI_ACT,
        ComplianceFramework.GDPR,
        ComplianceFramework.CRA,
        ComplianceFramework.NIS2,
        ComplianceFramework.DORA,
        ComplianceFramework.MIFID_II,
        ComplianceFramework.PSD2,
        ComplianceFramework.ISO_27001,
    ],
    "hr": [ComplianceFramework.EU_AI_ACT, ComplianceFramework.GDPR, ComplianceFramework.AGG],
    "general": [
        ComplianceFramework.EU_AI_ACT,
        ComplianceFramework.GDPR,
        ComplianceFramework.CRA,
        ComplianceFramework.ISO_27001,
        ComplianceFramework.BSI_GRUNDSCHUTZ,
    ],
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
    if _is_medical_domain(domain_info):
        return DOMAIN_REGULATION_MAP["medical"]
    if _is_finance_domain(domain_info):
        return DOMAIN_REGULATION_MAP["finance"]
    if _is_hr_domain(domain_info):
        return DOMAIN_REGULATION_MAP["hr"]
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


def _is_medical_domain(domain_info: ProductDomainInfo) -> bool:
    domain_text = f"{domain_info.domain} {domain_info.description} {domain_info.intended_use or ''}".lower()
    return any(token in domain_text for token in ["medical", "medicine", "medtech", "diagnostic", "clinical", "mdr"])


def _is_ivd_domain(domain_info: ProductDomainInfo) -> bool:
    domain_text = f"{domain_info.domain} {domain_info.description} {domain_info.intended_use or ''}".lower()
    return any(token in domain_text for token in ["ivdr", "ivd", "in vitro", "in-vitro"])


def _is_finance_domain(domain_info: ProductDomainInfo) -> bool:
    domain_text = f"{domain_info.domain} {domain_info.description} {domain_info.intended_use or ''}".lower()
    return any(token in domain_text for token in ["finance", "financial", "bank", "payment", "investment", "trading"])


def _is_hr_domain(domain_info: ProductDomainInfo) -> bool:
    domain_text = f"{domain_info.domain} {domain_info.description} {domain_info.intended_use or ''}".lower()
    return any(token in domain_text for token in ["hr", "human resources", "hiring", "recruit", "employment"])


def _is_critical_infrastructure_domain(domain_info: ProductDomainInfo) -> bool:
    domain_text = f"{domain_info.domain} {domain_info.description} {domain_info.intended_use or ''}".lower()
    return any(
        token in domain_text
        for token in ["critical infrastructure", "essential services", "energy", "transport", "water", "health infrastructure"]
    )


def _is_us_market(domain_info: ProductDomainInfo) -> bool:
    target_market = (domain_info.target_market or "").lower()
    return any(token in target_market for token in ["us", "usa", "united states", "north america", "global"])


def _build_requirement_result(
    *,
    document_id: str,
    framework: ComplianceFramework,
    requirements_data: list[dict],
    content_lower: str,
    summary_prefix: str,
) -> ComplianceCheckResult:
    requirements: list[ComplianceRequirement] = []
    mandatory_gaps: list[str] = []
    optional_gaps: list[str] = []

    for req_data in requirements_data:
        terms = [str(term).lower() for term in req_data.get("key_terms", []) if str(term).strip()]
        met = any(term in content_lower for term in terms)
        gap = None if met else f"{req_data['title']}: {req_data['description']}"

        req = ComplianceRequirement(
            requirement_id=req_data["id"],
            framework=framework,
            title=req_data["title"],
            description=req_data["description"],
            mandatory=bool(req_data.get("mandatory", True)),
            met=met,
            gap_description=gap,
        )
        requirements.append(req)

        if not met:
            if bool(req_data.get("mandatory", True)):
                mandatory_gaps.append(gap or req_data["title"])
            else:
                optional_gaps.append(gap or req_data["title"])

    met_count = sum(1 for item in requirements if item.met)
    score = (met_count / len(requirements)) if requirements else 1.0
    summary = (
        f"{summary_prefix}. Score: {score:.0%}. "
        f"Mandatory gaps: {len(mandatory_gaps)}. Optional gaps: {len(optional_gaps)}."
    )

    return ComplianceCheckResult(
        document_id=document_id,
        framework=framework,
        requirements=requirements,
        mandatory_gaps=mandatory_gaps,
        optional_gaps=optional_gaps,
        compliance_score=round(score, 2),
        summary=summary,
    )


def check_iso_9001_compliance(document_content: str, document_id: str) -> ComplianceCheckResult:
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.ISO_9001,
        requirements_data=ISO_9001_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="ISO 9001 compliance check complete",
    )


def check_iso_27001_compliance(document_content: str, document_id: str) -> ComplianceCheckResult:
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.ISO_27001,
        requirements_data=ISO_27001_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="ISO/IEC 27001 compliance check complete",
    )


def check_gdpr_compliance(document_content: str, document_id: str) -> ComplianceCheckResult:
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.GDPR,
        requirements_data=GDPR_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="GDPR baseline compliance check complete",
    )


def check_bsi_grundschutz_compliance(document_content: str, document_id: str) -> ComplianceCheckResult:
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.BSI_GRUNDSCHUTZ,
        requirements_data=BSI_GRUNDSCHUTZ_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="BSI Grundschutz baseline check complete",
    )


def check_bsi_tr_03185_compliance(document_content: str, document_id: str) -> ComplianceCheckResult:
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.BSI_TR_03185,
        requirements_data=BSI_TR_03185_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="BSI TR-03185 secure SDLC check complete",
    )


def check_mdr_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_medical_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.MDR,
        requirements_data=MDR_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="MDR compliance check complete",
    )


def check_iso_13485_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_medical_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.ISO_13485,
        requirements_data=ISO_13485_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="ISO 13485 medical device QMS check complete",
    )


def check_iso_14971_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_medical_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.ISO_14971,
        requirements_data=ISO_14971_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="ISO 14971 risk management check complete",
    )


def check_iec_62304_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_medical_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.IEC_62304,
        requirements_data=IEC_62304_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="IEC 62304 software lifecycle check complete",
    )


def check_ivdr_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_ivd_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.IVDR,
        requirements_data=IVDR_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="IVDR compliance check complete",
    )


def check_dora_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_finance_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.DORA,
        requirements_data=DORA_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="DORA operational resilience check complete",
    )


def check_mifid_ii_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_finance_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.MIFID_II,
        requirements_data=MIFID_II_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="MiFID II governance check complete",
    )


def check_psd2_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_finance_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.PSD2,
        requirements_data=PSD2_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="PSD2 payment security check complete",
    )


def check_agg_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not _is_hr_domain(domain_info):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.AGG,
        requirements_data=AGG_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="AGG equal-treatment check complete",
    )


def check_nis2_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not (_is_critical_infrastructure_domain(domain_info) or _is_finance_domain(domain_info) or _is_medical_domain(domain_info)):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.NIS2,
        requirements_data=NIS2_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="NIS2 cybersecurity obligations check complete",
    )


def check_cra_compliance(document_content: str, document_id: str) -> ComplianceCheckResult:
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.CRA,
        requirements_data=CRA_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="Cyber Resilience Act baseline check complete",
    )


def check_hipaa_compliance_if_applicable(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> ComplianceCheckResult | None:
    if not (_is_medical_domain(domain_info) and _is_us_market(domain_info)):
        return None
    return _build_requirement_result(
        document_id=document_id,
        framework=ComplianceFramework.HIPAA,
        requirements_data=HIPAA_REQUIREMENTS,
        content_lower=document_content.lower(),
        summary_prefix="HIPAA safeguards check complete",
    )


def get_bridge_framework_catalog(domain_info: ProductDomainInfo) -> list[dict]:
    """Return enabled bridge frameworks for the current run context."""
    catalog: list[dict] = [
        {"framework": ComplianceFramework.EU_AI_ACT.value, "mandatory": True},
        {"framework": ComplianceFramework.GDPR.value, "mandatory": True},
        {"framework": ComplianceFramework.CRA.value, "mandatory": True},
        {"framework": ComplianceFramework.ISO_9001.value, "mandatory": True},
        {"framework": ComplianceFramework.ISO_27001.value, "mandatory": True},
        {"framework": ComplianceFramework.BSI_GRUNDSCHUTZ.value, "mandatory": True},
        {"framework": ComplianceFramework.BSI_TR_03185.value, "mandatory": True},
    ]
    if _is_medical_domain(domain_info):
        catalog.append({"framework": ComplianceFramework.MDR.value, "mandatory": True})
        catalog.append({"framework": ComplianceFramework.ISO_13485.value, "mandatory": True})
        catalog.append({"framework": ComplianceFramework.ISO_14971.value, "mandatory": True})
        catalog.append({"framework": ComplianceFramework.IEC_62304.value, "mandatory": True})
    if _is_ivd_domain(domain_info):
        catalog.append({"framework": ComplianceFramework.IVDR.value, "mandatory": True})
    if _is_finance_domain(domain_info):
        catalog.append({"framework": ComplianceFramework.DORA.value, "mandatory": True})
        catalog.append({"framework": ComplianceFramework.MIFID_II.value, "mandatory": True})
        catalog.append({"framework": ComplianceFramework.PSD2.value, "mandatory": True})
    if _is_hr_domain(domain_info):
        catalog.append({"framework": ComplianceFramework.AGG.value, "mandatory": True})
    if _is_critical_infrastructure_domain(domain_info) or _is_finance_domain(domain_info) or _is_medical_domain(domain_info):
        catalog.append({"framework": ComplianceFramework.NIS2.value, "mandatory": True})
    if _is_medical_domain(domain_info) and _is_us_market(domain_info):
        catalog.append({"framework": ComplianceFramework.HIPAA.value, "mandatory": True})
    return catalog


def run_bridge_compliance_checks(
    document_content: str,
    domain_info: ProductDomainInfo,
    document_id: str,
) -> list[ComplianceCheckResult]:
    """Run framework-agnostic bridge checks with extensible strategy list."""
    strategies: list[Callable[[], ComplianceCheckResult | None]] = [
        lambda: check_eu_ai_act_compliance(document_content, domain_info, document_id),
        lambda: check_gdpr_compliance(document_content, document_id),
        lambda: check_cra_compliance(document_content, document_id),
        lambda: check_iso_9001_compliance(document_content, document_id),
        lambda: check_iso_27001_compliance(document_content, document_id),
        lambda: check_bsi_grundschutz_compliance(document_content, document_id),
        lambda: check_bsi_tr_03185_compliance(document_content, document_id),
        lambda: check_mdr_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_iso_13485_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_iso_14971_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_iec_62304_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_ivdr_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_dora_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_mifid_ii_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_psd2_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_agg_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_nis2_compliance_if_applicable(document_content, domain_info, document_id),
        lambda: check_hipaa_compliance_if_applicable(document_content, domain_info, document_id),
    ]

    results = [result for result in (strategy() for strategy in strategies) if result is not None]
    return results
