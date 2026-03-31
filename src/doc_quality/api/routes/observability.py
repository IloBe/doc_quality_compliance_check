"""Observability endpoints for quality telemetry and evaluation summaries."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.session_auth import require_roles
from ...models.quality import (
    LlmPromptOutputListResponse,
    QualityObservationRecord,
    QualityObservationRequest,
    QualitySummaryResponse,
    WorkflowComponentBreakdownResponse,
)
from ...services.quality_service import (
    create_quality_observation,
    get_workflow_component_breakdown,
    get_quality_summary,
    get_recent_llm_prompt_output_pairs,
)

router = APIRouter(prefix="/observability", tags=["observability"])


@router.post("/quality-observations", response_model=QualityObservationRecord)
async def log_quality_observation(
    request: QualityObservationRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> QualityObservationRecord:
    """Persist one quality telemetry observation and emit metrics."""
    return create_quality_observation(db, request)


@router.get("/quality-summary", response_model=QualitySummaryResponse)
async def quality_summary(
    window_hours: int = Query(default=24, ge=1, le=24 * 90),
    source_component: str | None = Query(default=None),
    aspect: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> QualitySummaryResponse:
    """Return aggregated quality/evaluation metrics for operations and governance."""
    return get_quality_summary(
        db,
        window_hours=window_hours,
        source_component=source_component,
        aspect=aspect,
    )


@router.get("/llm-traces", response_model=LlmPromptOutputListResponse)
async def llm_prompt_output_traces(
    limit: int = Query(default=20, ge=1, le=100),
    window_hours: int = Query(default=24, ge=1, le=24 * 90),
    source_component: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> LlmPromptOutputListResponse:
    """Return recent GenAI prompt/output pairs captured in observability payloads."""
    return get_recent_llm_prompt_output_pairs(
        db,
        limit=limit,
        window_hours=window_hours,
        source_component=source_component,
    )


@router.get("/workflow-components", response_model=WorkflowComponentBreakdownResponse)
async def workflow_component_breakdown(
    window_hours: int = Query(default=24, ge=1, le=24 * 90),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> WorkflowComponentBreakdownResponse:
    """Return component-level workflow telemetry breakdown for dashboard visibility."""
    return get_workflow_component_breakdown(db, window_hours=window_hours)
