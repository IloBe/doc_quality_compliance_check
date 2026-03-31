"""Tracing and metrics helpers for production observability."""
from __future__ import annotations

import re
import importlib
from typing import Any
from uuid import uuid4

import structlog
from fastapi.responses import Response

CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"


class _NoOpMetric:
    def labels(self, **_: str) -> "_NoOpMetric":
        return self

    def inc(self, amount: float = 1.0) -> None:
        _ = amount

    def observe(self, value: float) -> None:
        _ = value

from .config import Settings

logger = structlog.get_logger(__name__)

try:
    prometheus_client = importlib.import_module("prometheus_client")
    Counter = prometheus_client.Counter
    Histogram = prometheus_client.Histogram
    CONTENT_TYPE_LATEST = prometheus_client.CONTENT_TYPE_LATEST
    generate_latest = prometheus_client.generate_latest
except Exception:  # pragma: no cover - optional dependency fallback
    Counter = None
    Histogram = None

    def generate_latest() -> bytes:
        return b"# Metrics backend unavailable\n"


try:
    trace = importlib.import_module("opentelemetry.trace")
    OTLPSpanExporter = importlib.import_module(
        "opentelemetry.exporter.otlp.proto.http.trace_exporter"
    ).OTLPSpanExporter
    Resource = importlib.import_module("opentelemetry.sdk.resources").Resource
    TracerProvider = importlib.import_module("opentelemetry.sdk.trace").TracerProvider
    trace_export_module = importlib.import_module("opentelemetry.sdk.trace.export")
    BatchSpanProcessor = trace_export_module.BatchSpanProcessor
    ConsoleSpanExporter = trace_export_module.ConsoleSpanExporter
    TraceIdRatioBased = importlib.import_module("opentelemetry.sdk.trace.sampling").TraceIdRatioBased
except ImportError:  # pragma: no cover - guarded by dependencies
    trace = None
    OTLPSpanExporter = None
    Resource = None
    TracerProvider = None
    BatchSpanProcessor = None
    ConsoleSpanExporter = None
    TraceIdRatioBased = None

_OBSERVABILITY_CONFIGURED = False

_UUID_RE = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b")
_INT_RE = re.compile(r"/\d+(?=/|$)")

if Counter is None or Histogram is None:
    HTTP_REQUESTS_TOTAL = _NoOpMetric()
    HTTP_REQUEST_DURATION_SECONDS = _NoOpMetric()
    AI_QUALITY_OBSERVATIONS_TOTAL = _NoOpMetric()
    AI_QUALITY_SCORE = _NoOpMetric()
    AI_HALLUCINATION_TOTAL = _NoOpMetric()
    AI_EVALUATION_TOTAL = _NoOpMetric()
else:
    HTTP_REQUESTS_TOTAL = Counter(
        "dq_http_requests_total",
        "HTTP requests processed by the API",
        ["method", "path", "status"],
    )
    HTTP_REQUEST_DURATION_SECONDS = Histogram(
        "dq_http_request_duration_seconds",
        "API request duration in seconds",
        ["method", "path"],
        buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    )
    AI_QUALITY_OBSERVATIONS_TOTAL = Counter(
        "dq_ai_quality_observations_total",
        "Quality observations emitted by backend/orchestrator",
        ["aspect", "outcome", "source_component"],
    )
    AI_QUALITY_SCORE = Histogram(
        "dq_ai_quality_score",
        "Quality score distribution for AI-assisted outputs",
        ["aspect", "source_component"],
        buckets=(0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0),
    )
    AI_HALLUCINATION_TOTAL = Counter(
        "dq_ai_hallucination_reports_total",
        "Hallucination observations reported by evaluators",
        ["source_component"],
    )
    AI_EVALUATION_TOTAL = Counter(
        "dq_ai_evaluations_total",
        "Evaluation observations by dataset and outcome",
        ["dataset", "outcome", "source_component"],
    )


def configure_observability(settings: Settings) -> None:
    """Configure tracing provider once per process."""
    global _OBSERVABILITY_CONFIGURED
    if _OBSERVABILITY_CONFIGURED:
        return

    if not settings.tracing_enabled:
        logger.info("tracing_disabled")
        _OBSERVABILITY_CONFIGURED = True
        return

    if trace is None or TracerProvider is None:
        logger.warning("tracing_dependencies_unavailable")
        _OBSERVABILITY_CONFIGURED = True
        return

    resource = Resource.create({"service.name": settings.telemetry_service_name})
    sampler = TraceIdRatioBased(settings.tracing_sampling_ratio)
    provider = TracerProvider(resource=resource, sampler=sampler)

    exporter_mode = settings.tracing_exporter
    if exporter_mode == "console" and ConsoleSpanExporter is not None:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    elif exporter_mode == "otlp" and OTLPSpanExporter is not None:
        if settings.tracing_otlp_endpoint.strip():
            provider.add_span_processor(
                BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.tracing_otlp_endpoint.strip()))
            )
        else:
            logger.warning("tracing_otlp_endpoint_missing")
    else:
        logger.info("tracing_exporter_none")

    trace.set_tracer_provider(provider)
    _OBSERVABILITY_CONFIGURED = True
    logger.info(
        "observability_configured",
        tracing_enabled=settings.tracing_enabled,
        tracing_exporter=settings.tracing_exporter,
        metrics_enabled=settings.metrics_enabled,
        service_name=settings.telemetry_service_name,
    )


def normalize_path(path: str) -> str:
    """Reduce high-cardinality path values for metrics labels."""
    normalized = _UUID_RE.sub("{id}", path)
    normalized = _INT_RE.sub("/{id}", normalized)
    return normalized


def new_request_id() -> str:
    """Generate a request id suitable for log correlation."""
    return uuid4().hex


def build_metrics_response() -> Response:
    """Return Prometheus metrics payload."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


def observe_http_request(method: str, path: str, status: int, duration_seconds: float) -> None:
    """Record request-level HTTP metrics."""
    normalized_path = normalize_path(path)
    HTTP_REQUESTS_TOTAL.labels(method=method, path=normalized_path, status=str(status)).inc()
    HTTP_REQUEST_DURATION_SECONDS.labels(method=method, path=normalized_path).observe(duration_seconds)


def observe_quality_observation(
    *,
    aspect: str,
    outcome: str,
    source_component: str,
    score: float | None,
    hallucination_flag: bool,
    evaluation_dataset: str | None,
) -> None:
    """Record quality telemetry metrics from evaluation observations."""
    AI_QUALITY_OBSERVATIONS_TOTAL.labels(
        aspect=aspect,
        outcome=outcome,
        source_component=source_component,
    ).inc()

    if score is not None:
        AI_QUALITY_SCORE.labels(aspect=aspect, source_component=source_component).observe(score)

    if hallucination_flag:
        AI_HALLUCINATION_TOTAL.labels(source_component=source_component).inc()

    if aspect == "evaluation":
        dataset = (evaluation_dataset or "unspecified").strip() or "unspecified"
        AI_EVALUATION_TOTAL.labels(
            dataset=dataset,
            outcome=outcome,
            source_component=source_component,
        ).inc()


def get_trace_id_hex() -> str | None:
    """Return current trace id in canonical hex form."""
    if trace is None:
        return None
    span = trace.get_current_span()
    context = span.get_span_context()
    if context is None or not context.is_valid:
        return None
    return format(context.trace_id, "032x")


def get_tracer(name: str) -> Any:
    """Return OpenTelemetry tracer or fallback no-op provider tracer."""
    if trace is None:
        return None
    return trace.get_tracer(name)
