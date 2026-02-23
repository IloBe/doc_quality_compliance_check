"""Research agent wrapping the Perplexity research service."""
from typing import Optional

from ..core.config import get_settings
from ..core.logging_config import get_logger
from ..models.research import ResearchRequest, ResearchResult
from ..services.research_service import research_regulations

logger = get_logger(__name__)


class ResearchAgent:
    """Agentic wrapper for Perplexity-powered regulatory research.

    Provides a high-level interface for researching applicable regulations
    for a given product domain, used both by the API layer and programmatically
    by the compliance checker to enrich its results.

    When no Perplexity API key is configured the agent transparently falls
    back to a static regulation map so the application always returns a result.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        settings = get_settings()
        self._api_key = api_key if api_key is not None else settings.perplexity_api_key
        self._model = model or settings.perplexity_model
        self._api_base_url = settings.perplexity_api_base_url
        if self._api_key:
            logger.info("research_agent_initialized", model=self._model, provider="perplexity")
        else:
            logger.info("research_agent_initialized", model="static_fallback", provider="static")

    async def research(self, request: ResearchRequest) -> ResearchResult:
        """Run a regulatory research query and return structured results."""
        return await research_regulations(
            request=request,
            api_key=self._api_key,
            model=self._model,
            api_base_url=self._api_base_url,
        )
