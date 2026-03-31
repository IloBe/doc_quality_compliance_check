"""Services for quality telemetry persistence and aggregation."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from statistics import mean
import uuid

from sqlalchemy.orm import Session

from ..core.observability import observe_quality_observation
from ..core.security import sanitize_text
from ..models.orm import QualityObservationORM
from ..models.quality import (
    LlmPromptOutputListResponse,
    LlmPromptOutputPair,
    QualityAspectSummary,
    QualityObservationRecord,
    QualityObservationRequest,
    QualitySummaryResponse,
    WorkflowComponentBreakdownResponse,
    WorkflowComponentSummary,
)


def _to_record(record: QualityObservationORM) -> QualityObservationRecord:
    return QualityObservationRecord(
        observation_id=record.observation_id,
        event_time=record.event_time,
        source_component=record.source_component,
        aspect=record.aspect,
        outcome=record.outcome,
        score=record.score,
        latency_ms=record.latency_ms,
        error_type=record.error_type,
        hallucination_flag=record.hallucination_flag,
        evaluation_dataset=record.evaluation_dataset,
        evaluation_metric=record.evaluation_metric,
        subject_type=record.subject_type,
        subject_id=record.subject_id,
        trace_id=record.trace_id,
        correlation_id=record.correlation_id,
        payload=record.payload or {},
        created_at=record.created_at,
    )


def create_quality_observation(db: Session, request: QualityObservationRequest) -> QualityObservationRecord:
    """Persist and emit metrics for one quality observation."""
    record = QualityObservationORM(
        observation_id=str(uuid.uuid4()),
        source_component=sanitize_text(request.source_component),
        aspect=request.aspect,
        outcome=request.outcome,
        score=request.score,
        latency_ms=request.latency_ms,
        error_type=sanitize_text(request.error_type) if request.error_type else None,
        hallucination_flag=request.hallucination_flag,
        evaluation_dataset=sanitize_text(request.evaluation_dataset) if request.evaluation_dataset else None,
        evaluation_metric=sanitize_text(request.evaluation_metric) if request.evaluation_metric else None,
        subject_type=sanitize_text(request.subject_type) if request.subject_type else None,
        subject_id=sanitize_text(request.subject_id) if request.subject_id else None,
        trace_id=sanitize_text(request.trace_id) if request.trace_id else None,
        correlation_id=sanitize_text(request.correlation_id) if request.correlation_id else None,
        payload=request.payload,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    observe_quality_observation(
        aspect=record.aspect,
        outcome=record.outcome,
        source_component=record.source_component,
        score=record.score,
        hallucination_flag=record.hallucination_flag,
        evaluation_dataset=record.evaluation_dataset,
    )

    return _to_record(record)


def get_quality_summary(
    db: Session,
    *,
    window_hours: int = 24,
    source_component: str | None = None,
    aspect: str | None = None,
) -> QualitySummaryResponse:
    """Return aggregated quality telemetry over a window."""
    window_end = datetime.now(timezone.utc)
    window_start = window_end - timedelta(hours=window_hours)

    query = db.query(QualityObservationORM).filter(
        QualityObservationORM.event_time >= window_start,
        QualityObservationORM.event_time <= window_end,
    )
    if source_component:
        query = query.filter(QualityObservationORM.source_component == sanitize_text(source_component))
    if aspect:
        query = query.filter(QualityObservationORM.aspect == sanitize_text(aspect))

    rows = query.order_by(QualityObservationORM.event_time.asc()).all()

    aspects: dict[str, list[QualityObservationORM]] = {}
    scores: list[float] = []
    latencies: list[float] = []
    hallucination_reports = 0
    error_observations = 0
    evaluation_observations = 0

    for row in rows:
        aspects.setdefault(row.aspect, []).append(row)

        if row.score is not None:
            scores.append(row.score)
        if row.latency_ms is not None:
            latencies.append(row.latency_ms)
        if row.hallucination_flag:
            hallucination_reports += 1
        if row.aspect == "error" or row.outcome == "fail" or row.error_type:
            error_observations += 1
        if row.aspect == "evaluation" or row.evaluation_dataset:
            evaluation_observations += 1

    aspect_summaries: list[QualityAspectSummary] = []
    valid_aspects = {"performance", "accuracy", "error", "hallucination", "evaluation"}

    for aspect_name, aspect_rows in aspects.items():
        if aspect_name not in valid_aspects:
            continue

        aspect_scores = [item.score for item in aspect_rows if item.score is not None]
        aspect_latencies = [item.latency_ms for item in aspect_rows if item.latency_ms is not None]
        outcome_counts = {"pass": 0, "warn": 0, "fail": 0, "info": 0}
        for item in aspect_rows:
            if item.outcome in outcome_counts:
                outcome_counts[item.outcome] += 1

        aspect_summaries.append(
            QualityAspectSummary(
                aspect=aspect_name,
                total=len(aspect_rows),
                pass_count=outcome_counts["pass"],
                warn_count=outcome_counts["warn"],
                fail_count=outcome_counts["fail"],
                info_count=outcome_counts["info"],
                average_score=round(mean(aspect_scores), 4) if aspect_scores else None,
                average_latency_ms=round(mean(aspect_latencies), 2) if aspect_latencies else None,
            )
        )

    p95_latency_ms: float | None = None
    if latencies:
        ordered = sorted(latencies)
        index = min(len(ordered) - 1, max(0, int(round(0.95 * (len(ordered) - 1)))))
        p95_latency_ms = round(ordered[index], 2)

    return QualitySummaryResponse(
        window_start=window_start,
        window_end=window_end,
        total_observations=len(rows),
        hallucination_reports=hallucination_reports,
        error_observations=error_observations,
        evaluation_observations=evaluation_observations,
        average_score=round(mean(scores), 4) if scores else None,
        p95_latency_ms=p95_latency_ms,
        aspects=sorted(aspect_summaries, key=lambda item: item.aspect),
    )


def get_recent_llm_prompt_output_pairs(
    db: Session,
    *,
    limit: int = 20,
    window_hours: int = 24,
    source_component: str | None = None,
) -> LlmPromptOutputListResponse:
    """Return recent prompt/output pairs captured in quality telemetry payloads."""
    lookup_limit = max(100, limit * 10)

    window_end = datetime.now(timezone.utc)
    window_start = window_end - timedelta(hours=window_hours)

    query = db.query(QualityObservationORM).filter(
        QualityObservationORM.event_time >= window_start,
        QualityObservationORM.event_time <= window_end,
    ).order_by(QualityObservationORM.event_time.desc())
    if source_component:
        query = query.filter(QualityObservationORM.source_component == sanitize_text(source_component))

    candidates = query.limit(lookup_limit).all()

    items: list[LlmPromptOutputPair] = []
    for row in candidates:
        payload = row.payload or {}
        if not isinstance(payload, dict):
            continue

        prompt = payload.get("llm_prompt") or payload.get("prompt")
        output = payload.get("llm_output") or payload.get("output") or payload.get("answer")
        if not isinstance(prompt, str) or not isinstance(output, str):
            continue

        rich_payload = {
            key: value
            for key, value in payload.items()
            if key not in {"llm_prompt", "llm_output", "prompt", "output", "answer", "provider", "model_used"}
        }

        items.append(
            LlmPromptOutputPair(
                event_time=row.event_time,
                source_component=row.source_component,
                provider=payload.get("provider") if isinstance(payload.get("provider"), str) else None,
                model_used=payload.get("model_used") if isinstance(payload.get("model_used"), str) else None,
                prompt=prompt,
                output=output,
                trace_id=row.trace_id,
                correlation_id=row.correlation_id,
                subject_type=row.subject_type,
                subject_id=row.subject_id,
                rich_payload=rich_payload,
            )
        )

        if len(items) >= limit:
            break

    return LlmPromptOutputListResponse(items=items)


def get_workflow_component_breakdown(
    db: Session,
    *,
    window_hours: int = 24,
) -> WorkflowComponentBreakdownResponse:
    """Return component-level workflow breakdown for observability dashboards."""
    window_end = datetime.now(timezone.utc)
    window_start = window_end - timedelta(hours=window_hours)

    rows = (
        db.query(QualityObservationORM)
        .filter(
            QualityObservationORM.event_time >= window_start,
            QualityObservationORM.event_time <= window_end,
        )
        .order_by(QualityObservationORM.event_time.asc())
        .all()
    )

    bucket: dict[str, list[QualityObservationORM]] = {}
    for row in rows:
        bucket.setdefault(row.source_component, []).append(row)

    components: list[WorkflowComponentSummary] = []
    for component_name, component_rows in bucket.items():
        outcome_counts = {"pass": 0, "warn": 0, "fail": 0, "info": 0}
        latencies = [item.latency_ms for item in component_rows if item.latency_ms is not None]
        for item in component_rows:
            if item.outcome in outcome_counts:
                outcome_counts[item.outcome] += 1

        components.append(
            WorkflowComponentSummary(
                source_component=component_name,
                total=len(component_rows),
                pass_count=outcome_counts["pass"],
                warn_count=outcome_counts["warn"],
                fail_count=outcome_counts["fail"],
                info_count=outcome_counts["info"],
                average_latency_ms=round(mean(latencies), 2) if latencies else None,
                latest_event_time=component_rows[-1].event_time if component_rows else None,
            )
        )

    components.sort(key=lambda item: (-item.total, item.source_component))

    return WorkflowComponentBreakdownResponse(
        window_start=window_start,
        window_end=window_end,
        total_observations=len(rows),
        components=components,
    )
