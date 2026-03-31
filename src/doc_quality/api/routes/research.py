"""API routes for Perplexity-powered regulatory research."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.observability import get_trace_id_hex
from ...core.session_auth import require_roles
from ...core.security import sanitize_text
from ...models.quality import QualityObservationRequest
from ...models.research import ResearchRequest, ResearchResult
from ...agents.research_agent import ResearchAgent
from ...services.quality_service import create_quality_observation

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/regulations", response_model=ResearchResult)
async def research_regulations(
    request: ResearchRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> ResearchResult:
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
    result = await agent.research(sanitized)

    if result.provider == "perplexity":
        payload = {
            "llm_prompt": result.query,
            "llm_output": result.answer,
            "provider": result.provider,
            "model_used": result.model_used,
            "citations_count": len(result.citations),
            "frameworks": result.applicable_frameworks,
        }
        create_quality_observation(
            db,
            QualityObservationRequest(
                source_component="research_agent",
                aspect="evaluation",
                outcome="info",
                subject_type="research",
                subject_id=sanitized.domain,
                trace_id=get_trace_id_hex(),
                payload=payload,
            ),
        )

    return result
