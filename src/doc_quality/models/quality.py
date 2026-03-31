"""Pydantic models for observability quality telemetry."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

QualityAspect = Literal["performance", "accuracy", "error", "hallucination", "evaluation"]
QualityOutcome = Literal["pass", "warn", "fail", "info"]


class QualityObservationRequest(BaseModel):
    """Request payload for a quality observation event."""

    source_component: str = Field(min_length=1, max_length=100)
    aspect: QualityAspect
    outcome: QualityOutcome = "info"
    score: float | None = Field(default=None, ge=0.0, le=1.0)
    latency_ms: float | None = Field(default=None, ge=0.0)
    error_type: str | None = Field(default=None, max_length=100)
    hallucination_flag: bool = False
    evaluation_dataset: str | None = Field(default=None, max_length=100)
    evaluation_metric: str | None = Field(default=None, max_length=100)
    subject_type: str | None = Field(default=None, max_length=50)
    subject_id: str | None = Field(default=None, max_length=100)
    trace_id: str | None = Field(default=None, max_length=64)
    correlation_id: str | None = Field(default=None, max_length=64)
    payload: dict[str, Any] = Field(default_factory=dict)


class QualityObservationRecord(BaseModel):
    """Persisted quality observation."""

    observation_id: str
    event_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source_component: str
    aspect: QualityAspect
    outcome: QualityOutcome
    score: float | None = None
    latency_ms: float | None = None
    error_type: str | None = None
    hallucination_flag: bool = False
    evaluation_dataset: str | None = None
    evaluation_metric: str | None = None
    subject_type: str | None = None
    subject_id: str | None = None
    trace_id: str | None = None
    correlation_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class QualityAspectSummary(BaseModel):
    """Aggregated quality stats by aspect."""

    aspect: QualityAspect
    total: int
    pass_count: int
    warn_count: int
    fail_count: int
    info_count: int
    average_score: float | None = None
    average_latency_ms: float | None = None


class QualitySummaryResponse(BaseModel):
    """Windowed quality telemetry summary for monitoring and evaluation."""

    window_start: datetime
    window_end: datetime
    total_observations: int
    hallucination_reports: int
    error_observations: int
    evaluation_observations: int
    average_score: float | None = None
    p95_latency_ms: float | None = None
    aspects: list[QualityAspectSummary] = Field(default_factory=list)


class WorkflowComponentSummary(BaseModel):
    """Aggregated workflow telemetry by emitting source component."""

    source_component: str
    total: int
    pass_count: int
    warn_count: int
    fail_count: int
    info_count: int
    average_latency_ms: float | None = None
    latest_event_time: datetime | None = None


class WorkflowComponentBreakdownResponse(BaseModel):
    """Windowed component-level breakdown for workflow observability."""

    window_start: datetime
    window_end: datetime
    total_observations: int
    components: list[WorkflowComponentSummary] = Field(default_factory=list)


class LlmPromptOutputPair(BaseModel):
    """One prompt/output pair captured from a GenAI interaction."""

    event_time: datetime
    source_component: str
    provider: str | None = None
    model_used: str | None = None
    prompt: str
    output: str
    trace_id: str | None = None
    correlation_id: str | None = None
    subject_type: str | None = None
    subject_id: str | None = None
    rich_payload: dict[str, Any] = Field(default_factory=dict)


class LlmPromptOutputListResponse(BaseModel):
    """Collection response for recent GenAI prompt/output traces."""

    items: list[LlmPromptOutputPair] = Field(default_factory=list)
