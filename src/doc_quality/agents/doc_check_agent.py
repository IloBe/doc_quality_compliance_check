"""AI agent for document analysis using Anthropic Claude."""
from typing import Optional

from ..core.logging_config import get_logger
from ..models.document import DocumentAnalysisResult, DocumentType
from ..services.document_analyzer import analyze_document

logger = get_logger(__name__)


class DocumentCheckAgent:
    """Agentic document checker that uses LLM reasoning to evaluate documents.

    In the current implementation, this wraps the rule-based analyzer.
    When an Anthropic API key is configured, it enriches results with
    LLM-based analysis.
    """

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
                logger.info("document_check_agent_initialized", model=model)
            except ImportError:
                logger.warning("anthropic_not_installed")

    def analyze(
        self,
        content: str,
        filename: str,
        doc_type: Optional[DocumentType] = None,
    ) -> DocumentAnalysisResult:
        """Analyze document content and return structured result."""
        # Step 1: Rule-based analysis
        result = analyze_document(content, filename, doc_type)

        # Step 2: LLM enrichment (if configured)
        if self._client and content:
            result = self._enrich_with_llm(content, result)

        return result

    def _enrich_with_llm(
        self, content: str, base_result: DocumentAnalysisResult
    ) -> DocumentAnalysisResult:
        """Enrich rule-based result with LLM analysis (requires API key)."""
        try:
            prompt = (
                f"You are a technical documentation quality checker.\n"
                f"Document type: {base_result.document_type.value}\n"
                f"Current issues found: {base_result.issues}\n"
                f"Please review the following document excerpt and add any additional "
                f"quality issues not already identified. Respond with a JSON list of strings.\n\n"
                f"Document (first 2000 chars):\n{content[:2000]}"
            )
            message = self._client.messages.create(
                model=self._model,
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            additional = message.content[0].text if message.content else ""
            if additional:
                base_result.recommendations.append(f"LLM Analysis: {additional[:500]}")
        except Exception as exc:  # noqa: BLE001
            logger.warning("llm_enrichment_failed", error=str(exc))
        return base_result
