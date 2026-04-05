"""API routes for Perplexity-powered regulatory research."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.observability import get_trace_id_hex
from ...core.session_auth import require_roles
from ...core.security import sanitize_text
from ...models.compliance_alerts import ComplianceAlertListResponse
from ...models.quality import QualityObservationRequest
from ...models.research import ResearchRequest, ResearchResult
from ...agents.research_agent import ResearchAgent
from ...services.compliance_alert_service import list_compliance_alerts
from ...services.quality_service import create_quality_observation

router = APIRouter(prefix="/research", tags=["research"])


@router.get("/alerts", response_model=ComplianceAlertListResponse)
async def get_compliance_alert_archive(
    framework: str | None = Query(default=None, description="Optional framework filter, e.g. GDPR"),
    severity: str | None = Query(default=None, description="Optional severity filter, e.g. info or warning"),
    start_date: str | None = Query(default=None, description="Optional inclusive start date (YYYY-MM-DD or ISO-8601)"),
    end_date: str | None = Query(default=None, description="Optional inclusive end date (YYYY-MM-DD or ISO-8601)"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> ComplianceAlertListResponse:
    """Return persisted compliance alerts suitable for archive and audit views."""
    framework_filter = sanitize_text(framework) if framework else None
    severity_filter = sanitize_text(severity) if severity else None
    start_date_filter = sanitize_text(start_date) if start_date else None
    end_date_filter = sanitize_text(end_date) if end_date else None
    items = list_compliance_alerts(
        db,
        framework=framework_filter,
        severity=severity_filter,
        start_date=start_date_filter,
        end_date=end_date_filter,
        limit=limit,
    )
    return ComplianceAlertListResponse(items=items)


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
