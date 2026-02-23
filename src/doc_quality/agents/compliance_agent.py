"""AI agent for compliance checking using Anthropic Claude."""
from typing import Optional

from ..core.logging_config import get_logger
from ..models.compliance import ComplianceCheckResult, ComplianceFramework, ProductDomainInfo
from ..services.compliance_checker import check_eu_ai_act_compliance, get_applicable_regulations

logger = get_logger(__name__)


class ComplianceCheckAgent:
    """Agentic compliance checker that applies regulatory frameworks to documents."""

    def __init__(
        self, api_key: Optional[str] = None, model: str = "claude-3-5-sonnet-20241022"
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._client = None
        if api_key:
            try:
                import anthropic  # noqa: PLC0415

                self._client = anthropic.Anthropic(api_key=api_key)
                logger.info("compliance_agent_initialized", model=model)
            except ImportError:
                logger.warning("anthropic_not_installed")

    def check_compliance(
        self,
        document_content: str,
        domain_info: ProductDomainInfo,
        document_id: str,
        frameworks: Optional[list[ComplianceFramework]] = None,
    ) -> list[ComplianceCheckResult]:
        """Run compliance checks for all applicable frameworks."""
        if frameworks is None:
            frameworks = get_applicable_regulations(domain_info)

        results: list[ComplianceCheckResult] = []

        # Always check EU AI Act first (primary framework)
        if ComplianceFramework.EU_AI_ACT in frameworks:
            eu_result = check_eu_ai_act_compliance(document_content, domain_info, document_id)
            results.append(eu_result)

        logger.info(
            "compliance_checks_complete",
            document_id=document_id,
            frameworks_checked=len(results),
        )
        return results
