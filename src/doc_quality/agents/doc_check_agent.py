"""AI agent for document analysis using Anthropic Claude."""
from pathlib import Path
from typing import Optional

from ..core.logging_config import get_logger
from ..models.document import DocumentAnalysisResult, DocumentType
from ..services.document_analyzer import analyze_document

logger = get_logger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_doc_check_prompt() -> str:
    """Load doc check agent prompt from versioned file.
    
    Prompt file: prompts/doc_check_agent_v1.txt
    Version: v1
    Change rationale: Externalize inline prompt to enable version control,
                      easier A/B testing, and audit trail of prompt changes.
    """
    prompt_file = _PROMPTS_DIR / "doc_check_agent_v1.txt"
    if not prompt_file.exists():
        raise RuntimeError(f"Prompt file not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


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
            # Load prompt template and format with document-specific values
            prompt_template = _load_doc_check_prompt()
            prompt = prompt_template.format(
                document_type=base_result.document_type.value,
                issues=base_result.issues,
                content=content[:2000]
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
