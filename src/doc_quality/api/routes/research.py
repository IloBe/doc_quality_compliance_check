"""API routes for Perplexity-powered regulatory research."""
from fastapi import APIRouter

from ...core.security import sanitize_text
from ...models.research import ResearchRequest, ResearchResult
from ...agents.research_agent import ResearchAgent

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/regulations", response_model=ResearchResult)
async def research_regulations(request: ResearchRequest) -> ResearchResult:
    """Research applicable EU/German regulations for a given product domain.

    Uses Perplexity Sonar (when ``PERPLEXITY_API_KEY`` is set) or a static
    regulation map as fallback.  Results include cited sources and a list of
    extracted regulation names for use in compliance checks.
    """
    # Sanitize free-form text inputs
    sanitized = ResearchRequest(
        domain=sanitize_text(request.domain),
        description=sanitize_text(request.description),
        target_market=sanitize_text(request.target_market),
        custom_query=sanitize_text(request.custom_query) if request.custom_query else None,
    )
    agent = ResearchAgent()
    return await agent.research(sanitized)
