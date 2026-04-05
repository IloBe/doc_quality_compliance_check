"""Unit tests for the compliance checker service."""
import pytest
from src.doc_quality.models.compliance import (
    AIActRole,
    ComplianceFramework,
    ProductDomainInfo,
    RiskLevel,
)
from src.doc_quality.services.compliance_checker import (
    check_eu_ai_act_compliance,
    determine_ai_act_risk_level,
    determine_ai_act_role,
    get_applicable_regulations,
)


@pytest.fixture
def medical_domain() -> ProductDomainInfo:
    return ProductDomainInfo(
        domain="medical devices",
        description="AI-powered diagnostic system for radiology",
        uses_ai_ml=True,
        intended_use="Detect anomalies in medical images",
    )


@pytest.fixture
def general_domain() -> ProductDomainInfo:
    return ProductDomainInfo(
        domain="general software",
        description="Document management system",
        uses_ai_ml=False,
    )


def test_high_risk_medical_domain(medical_domain):
    assert determine_ai_act_risk_level(medical_domain) == RiskLevel.HIGH


def test_low_risk_general_domain(general_domain):
    assert determine_ai_act_risk_level(general_domain) == RiskLevel.LOW


def test_provider_role_detection():
    domain = ProductDomainInfo(
        domain="AI tools",
        description="We develop and train AI models for customers",
        uses_ai_ml=True,
    )
    assert determine_ai_act_role(domain) == AIActRole.PROVIDER


def test_applicable_regulations_medical(medical_domain):
    regs = get_applicable_regulations(medical_domain)
    assert ComplianceFramework.EU_AI_ACT in regs
    assert ComplianceFramework.MDR in regs
    assert ComplianceFramework.GDPR in regs
    assert ComplianceFramework.ISO_13485 in regs
    assert ComplianceFramework.ISO_14971 in regs
    assert ComplianceFramework.IEC_62304 in regs


def test_applicable_regulations_finance_includes_finance_directives():
    finance_domain = ProductDomainInfo(
        domain="financial services",
        description="AI support for payments and investment workflows",
        uses_ai_ml=True,
    )
    regs = get_applicable_regulations(finance_domain)
    assert ComplianceFramework.EU_AI_ACT in regs
    assert ComplianceFramework.GDPR in regs
    assert ComplianceFramework.DORA in regs
    assert ComplianceFramework.MIFID_II in regs
    assert ComplianceFramework.PSD2 in regs


def test_eu_ai_act_check_returns_result(medical_domain):
    content = """
    Risk management system: documented.
    Technical documentation: included.
    Human oversight: enabled via dashboard.
    Logging and transparency: implemented.
    """
    result = check_eu_ai_act_compliance(content, medical_domain, "doc-1")
    assert result.framework == ComplianceFramework.EU_AI_ACT
    assert result.risk_level == RiskLevel.HIGH
    assert 0.0 <= result.compliance_score <= 1.0
    assert result.summary != ""


def test_eu_ai_act_check_low_compliance(medical_domain):
    result = check_eu_ai_act_compliance("No relevant content here.", medical_domain, "doc-2")
    assert result.compliance_score < 0.5
