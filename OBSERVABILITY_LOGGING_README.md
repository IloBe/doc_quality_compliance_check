# Observability and Logging — Doc Quality Compliance Check

Complete observability and structured logging infrastructure for the Doc Quality Compliance Check system.

## Overview

The application implements a multi-layer observability strategy combining structured logging, request-level instrumentation, audit trail persistence, and abuse detection. All logs are designed for compliance audit trails and operational debugging.

---

## 1. Structured Logging Configuration

### 1.1 Framework: structlog

The application uses **structlog 25.5.0** for JSON-structured logging with optional console output.

**Location**: [core/logging_config.py](src/doc_quality/core/logging_config.py)

```python
def configure_logging(log_level: str = "INFO", log_format: str = "console") -> None:
    """Configure structured logging for the application."""
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if log_format == "json":
        processors = shared_processors + [structlog.processors.JSONRenderer()]
    else:
        processors = shared_processors + [structlog.dev.ConsoleRenderer()]

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

def get_logger(name: str) -> structlog.BoundLogger:
    """Return a named structured logger."""
    return structlog.get_logger(name)
```

### 1.2 Environment Variables

Configure logging behavior via `.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOG_LEVEL` | `INFO` | Log verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LOG_FORMAT` | `json` | Output format: `json` (production) or `console` (dev) |

**Example `.env`:**

```bash
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### 1.3 Bootstrap in Application Startup

All services bootstrap logging on startup:

**Backend API** ([src/doc_quality/api/main.py](src/doc_quality/api/main.py#L24-L30)):
```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: startup and shutdown tasks."""
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_format)
    logger.info("application_starting", version=settings.app_version, env=settings.environment)
    yield
    logger.info("application_stopping")
```

**Orchestrator Service** ([services/orchestrator/main.py](services/orchestrator/src/doc_quality_orchestrator/main.py#L40-L45)):
```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Log orchestrator startup/shutdown."""
    logger.info("orchestrator_starting", version=settings.app_version, env=settings.environment)
    yield
    logger.info("orchestrator_stopping")
```

---

## 2. Request-Level Logging

### 2.1 HTTP Request Middleware

FastAPI HTTP middleware logs all incoming requests with structured context:

**Location**: [src/doc_quality/api/main.py](src/doc_quality/api/main.py#L86-L100)

```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log HTTP requests with timing and status code."""
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000, 1),
    )
    return response
```

**Log Output (JSON format):**
```json
{
  "event": "http_request",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "status": 200,
  "duration_ms": 45.3,
  "timestamp": "2026-03-30T14:23:11Z"
}
```

### 2.2 Rate Limiting Signals

Rate limiting middleware emits separate log entries on throttle events:

- **Global API throttle**: `GLOBAL_RATE_LIMIT_ENABLED=true` (240 req/60s)
- **Login abuse protection**: 8 failed attempts → 10 min lockout
- **Recovery throttle**: 15 min window per email

---

## 3. Service-Level Logging

Every service uses `get_logger(__name__)` and logs key decision points.

### 3.1 HITL Workflow Service

**Location**: [src/doc_quality/services/hitl_workflow.py](src/doc_quality/services/hitl_workflow.py)

Logs review lifecycle events:

```python
from ..core.logging_config import get_logger
logger = get_logger(__name__)

# Review created
logger.info("review_created", review_id=str(orm_record.review_id), document_id=document_id, status=status)

# Review not found
logger.warning("review_not_found", review_id=review_id)

# Status transition
logger.info("review_status_updated", review_id=review_id, new_status=new_status)
```

### 3.2 Report Generation Service

**Location**: [src/doc_quality/services/report_generator.py](src/doc_quality/services/report_generator.py)

```python
logger.info("generating_report", report_id=report_id, format=report_format)
logger.info("report_generated", report_id=report_id, file_path=file_path)
```

### 3.3 Research Service

**Location**: [src/doc_quality/services/research_service.py](src/doc_quality/services/research_service.py)

```python
logger.info("research_static_fallback", domain=request.domain)
logger.info("perplexity_research_start", domain=request.domain, model=model)

# Errors logged with full context
logger.error(
    "perplexity_api_error",
    error=str(exc),
    domain=request.domain,
    status_code=status_code
)
```

### 3.4 Template Manager

**Location**: [src/doc_quality/services/template_manager.py](src/doc_quality/services/template_manager.py)

Template loading and caching events.

---

## 4. Audit Trail Persistence

### 4.1 AuditEventORM Model

Immutable append-only audit trail stored in PostgreSQL. Every significant action is persisted.

**Location**: [src/doc_quality/models/orm.py](src/doc_quality/models/orm.py)

**Schema (16 columns):**

| Column | Type | Purpose |
| --- | --- | --- |
| `event_id` | UUID | Unique event identifier |
| `event_type` | VARCHAR | Event category (e.g., `login_success`, `review_created`, `finding_written`) |
| `actor_type` | VARCHAR | Who performed the action: `user`, `agent`, `service`, `orchestrator` |
| `actor_id` | VARCHAR | Email (user), agent name, service name, or orchestrator ID |
| `subject_type` | VARCHAR | What was affected: `document`, `review`, `finding`, `session`, `workflow` |
| `subject_id` | VARCHAR | Document ID, review ID, finding ID, etc. |
| `trace_id` | VARCHAR (nullable) | Distributed trace ID (for OTEL integration) |
| `correlation_id` | VARCHAR (nullable) | Workflow correlation ID linking related events |
| `tenant_id` | VARCHAR | Multi-tenant identifier (default: `default_tenant`) |
| `org_id` | VARCHAR (nullable) | Organization identifier |
| `project_id` | VARCHAR (nullable) | Project identifier |
| `event_time` | TIMESTAMP | UTC timestamp of event |
| `payload` | JSONB | Event-specific data (structured, no PII) |

**Example audit events:**

```python
# Login successful
AuditEventORM(
    event_type="login_success",
    actor_type="user",
    actor_id="user@example.com",
    subject_type="session",
    subject_id="session_uuid",
    event_time=datetime.utcnow(),
    payload={"ip": "192.168.1.1", "remember_me": True},
)

# Review created
AuditEventORM(
    event_type="review_created",
    actor_type="user",
    actor_id="reviewer@example.com",
    subject_type="review",
    subject_id="review_id",
    trace_id="trace_123",
    correlation_id="workflow_456",
    payload={"document_id": "doc_789", "status": "pending"},
)

# Finding written by agent
AuditEventORM(
    event_type="finding_written",
    actor_type="agent",
    actor_id="compliance_agent",
    subject_type="finding",
    subject_id="finding_id",
    trace_id="trace_789",
    payload={"requirement": "EU AI Act Art. 12", "severity": "high"},
)
```

### 4.2 Audit Event Persistence

Two service layers persist audit events:

**Auth Route Handler** ([src/doc_quality/api/routes/auth.py](src/doc_quality/api/routes/auth.py#L110-L130)):
```python
def _log_audit_event(
    db: Session,
    *,
    event_type: str,
    actor_type: str,
    actor_id: str,
    subject_type: str,
    subject_id: str,
    payload: dict,
) -> None:
    event = AuditEventORM(
        event_id=secrets.token_urlsafe(24),
        tenant_id="default",
        org_id=None,
        project_id=None,
        event_time=_now_utc(),
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        subject_type=subject_type,
        subject_id=subject_id,
        trace_id=None,
        correlation_id=None,
        payload=payload,
    )
    db.add(event)
    db.commit()
```

**Skills Service** ([src/doc_quality/services/skills_service.py](src/doc_quality/services/skills_service.py#L226-L260)):
```python
def log_event(db: Session, request: LogEventRequest) -> AuditEventRecord:
    """Persist an audit event for orchestrator/tool activity."""
    record = AuditEventORM(
        event_id=str(uuid.uuid4()),
        event_type=sanitize_text(request.event_type),
        actor_type=sanitize_text(request.actor_type),
        actor_id=sanitize_text(request.actor_id),
        subject_type=sanitize_text(request.subject_type),
        subject_id=sanitize_text(request.subject_id),
        trace_id=sanitize_text(request.trace_id) if request.trace_id else None,
        correlation_id=sanitize_text(request.correlation_id) if request.correlation_id else None,
        tenant_id=sanitize_text(request.tenant_id),
        org_id=sanitize_text(request.org_id) if request.org_id else None,
        project_id=sanitize_text(request.project_id) if request.project_id else None,
        payload=sanitize_nested_dict(request.payload),
    )
    db.add(record)
    db.commit()
    return AuditEventRecord.from_orm(record)
```

---

## 5. Orchestrator Logging

### 5.1 CrewAI Flow Events

The DocumentReviewFlow logs step-level events during workflow execution:

**Location**: [services/orchestrator/src/doc_quality_orchestrator/flows/document_review_flow.py](services/orchestrator/src/doc_quality_orchestrator/flows/document_review_flow.py#L548-L580)

```python
step = WorkflowStepEvent(
    step_id="normalize-input",
    step_name="normalize_input",
    status="started",
    agent_id="orchestrator",
    provider_id=adapter.provider_id,
)

# ... step execution ...

# Persist step completion
steps.append(WorkflowStepEvent(
    step_id="normalize-input",
    status="completed",
    output=normalized_payload,
))
```

**WorkflowStepEvent fields:**
- `step_id`, `step_name` — Unique identifier and human-readable name
- `status` — `started`, `completed`, `failed`
- `agent_id` — Agent that executed the step
- `provider_id` — Model provider (anthropic, openai, nemotron, etc.)
- `started_at`, `ended_at` — Timing for performance tracking
- `token_usage`, `cost` — Model economics tracking
- `output`, `error` — Step result or error details

### 5.2 LogEventTool

Agents use the **LogEventTool** to persist arbitrary audit events during workflow execution:

**Location**: [services/orchestrator/src/doc_quality_orchestrator/crews/review_flow.py](services/orchestrator/src/doc_quality_orchestrator/crews/review_flow.py#L687-L730)

```python
class LogEventTool(_SkillsBase):
    name: str = "log_event"
    description: str = (
        "Persist an audit event to the backend Skills API. "
        "Required inputs: event_type, actor_type, actor_id. "
        "Optional: subject_type, subject_id, extra_payload (dict). "
        "Returns JSON with event_id."
    )

    def _run(
        self,
        event_type: str,
        actor_type: str,
        actor_id: str,
        subject_type: str | None = None,
        subject_id: str | None = None,
        extra_payload: dict[str, Any] | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "event_type": event_type,
            "actor_type": actor_type,
            "actor_id": actor_id,
            "trace_id": trace_id,
            "correlation_id": correlation_id,
            "payload": extra_payload or {},
        }
        # ... construct and POST to backend /api/v1/skills/log_event
        return self._post("/skills/log_event", payload)
```

**Example agent logging:**
```python
# Intake agent logs document lookup
log_event_tool._run(
    event_type="document_lookup_completed",
    actor_type="agent",
    actor_id="intake_agent",
    subject_type="document",
    subject_id="doc_123",
    extra_payload={"status": "found", "content_length": 5432}
)

# Compliance agent logs finding
log_event_tool._run(
    event_type="compliance_finding_created",
    actor_type="agent",
    actor_id="compliance_agent",
    subject_type="finding",
    subject_id="finding_uuid",
    extra_payload={
        "requirement": "EU AI Act Art. 12",
        "severity": "high",
        "evidence": "Missing transparency documentation"
    }
)
```

### 5.3 Orchestrator Service Logging

**Location**: [services/orchestrator/src/doc_quality_orchestrator/service.py](services/orchestrator/src/doc_quality_orchestrator/service.py)

```python
import structlog

logger = structlog.get_logger(__name__)

class OrchestratorService:
    async def run_workflow(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        logger.info("workflow_started", run_id=run_id, document_id=request.document_id)
        # ... orchestration logic ...
        logger.info("workflow_completed", run_id=run_id, status=response.status)
```

---

## 6. Rate Limiting & Abuse Detection

### 6.1 Global API Throttle

**Location**: [src/doc_quality/core/rate_limit.py](src/doc_quality/core/rate_limit.py)

Process-local token bucket rate limiter for all `/api/v1/*` endpoints.

**Configuration**:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GLOBAL_RATE_LIMIT_ENABLED` | `true` | Enable/disable global throttling |
| `GLOBAL_RATE_LIMIT_REQUESTS` | `240` | Max requests per window |
| `GLOBAL_RATE_LIMIT_WINDOW_SECONDS` | `60` | Time window in seconds |

**Example log entry:**
```json
{
  "event": "rate_limit_exceeded",
  "limit": 240,
  "window_seconds": 60,
  "status": 429
}
```

### 6.2 Login Abuse Protection

Tracks failed login attempts per IP and per email, enforcing temporary lockout.

**Configuration**:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTH_LOGIN_RATE_LIMIT_COUNT` | `8` | Failed attempts before lockout |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS` | `300` | Failed attempt tracking window (5 min) |
| `AUTH_LOGIN_LOCKOUT_SECONDS` | `600` | Temporary lockout duration (10 min) |

**Logged events**:
- `login_attempt` — Each login attempt with result (success/failure)
- `login_throttled` — Rate limit hit (too many failed attempts)
- `login_lockout_activated` — Account temporarily locked
- `login_lockout_released` — Lockout period expires

### 6.3 Password Recovery Throttle

Recovery requests per email limited to avoid enumeration attacks.

**Configuration**:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTH_RECOVERY_RATE_LIMIT_WINDOW_MINUTES` | `15` | Throttle window per email |

---

## 7. Sensitive Data Redaction

All logging functions sanitize user-submitted content to prevent PII leakage.

**Sanitization Functions** ([src/doc_quality/core/security.py](src/doc_quality/core/security.py)):

```python
def sanitize_text(text: str, max_length: int = 500) -> str:
    """Remove control chars, truncate, prevent log injection."""
    if not isinstance(text, str):
        return ""
    return "".join(c for c in text if ord(c) >= 32 or c in "\t\n").strip()[:max_length]

def sanitize_nested_dict(d: dict, max_depth: int = 3) -> dict:
    """Recursively sanitize dict values, respect privacy."""
    if not isinstance(d, dict) or max_depth <= 0:
        return {}
    return {
        sanitize_text(k): sanitize_text(v) if isinstance(v, str) else v
        for k, v in d.items()
    }
```

**PII Protection Policy**:
- User passwords never logged
- Email addresses logged only in audit context (actor_id, subject_id)
- Document content summarized or truncated
- API keys and secrets filtered from error messages

---

## 8. Monitoring & Alerts (Future: Phase 3)

### 8.1 OpenTelemetry Integration (Planned)

**Road**: Distributed tracing for agent → service → persistence flow

- Trace ID already captured in `AuditEventORM.trace_id`
- Correlation ID ready for multi-step workflows
- Step-level event payload includes timing, token usage, cost

**Future implementation**:
```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("document_analysis") as span:
    span.set_attribute("document.id", doc_id)
    span.set_attribute("workflow.run_id", run_id)
    # ... analysis logic ...
```

### 8.2 Metrics Dashboard (Planned Phase 3)

Proposed metrics:
- **Request latency** (p50, p95, p99) by endpoint
- **Error rate** by error type and endpoint
- **Database query latency** by operation
- **Model token usage and cost** by workflow
- **Audit trail growth** (events/day)

---

## 9. Debugging & Querying Audit Trails

### 9.1 Direct SQL Queries

Query the audit trail directly for compliance investigations:

```sql
-- Recent login events
SELECT event_id, event_time, actor_id, payload
FROM audit_events
WHERE event_type = 'login_success'
ORDER BY event_time DESC
LIMIT 50;

-- Finding creation timeline for a document
SELECT event_id, event_time, actor_id, actor_type, payload
FROM audit_events
WHERE subject_type = 'finding' AND subject_id = 'finding_123'
ORDER BY event_time;

-- All actions by a specific orchestrator run
SELECT event_id, event_time, event_type, actor_id, payload
FROM audit_events
WHERE trace_id = 'trace_abc123'
ORDER BY event_time;

-- Failed login attempts in last 24 hours
SELECT actor_id, COUNT(*) as attempt_count, MAX(event_time) as latest
FROM audit_events
WHERE event_type = 'login_failure' AND event_time > NOW() - INTERVAL '24 hours'
GROUP BY actor_id
ORDER BY attempt_count DESC;
```

### 9.2 Structured Log Search

In production with centralized log aggregation (ELK, Splunk, CloudWatch):

```
# Find all high-severity compliance findings in the last 7 days
event_type:compliance_finding_created severity:high timestamp:[now-7d TO now]

# Trace a specific workflow execution
trace_id:trace_abc123

# Find errors in document analysis
event_type:document_analysis_* status:error
```

### 9.3 Development Logging

Set `LOG_FORMAT=console` for readable terminal output:

```bash
LOG_FORMAT=console LOG_LEVEL=DEBUG pytest tests/test_auth_session_api.py -v -s
```

**Console output example:**
```
2026-03-30 14:23:11 [INFO] application_starting version=0.1.0 env=development
2026-03-30 14:23:12 [INFO] http_request method=POST path=/api/v1/auth/login status=200 duration_ms=45.3
2026-03-30 14:23:12 [INFO] review_created review_id=rev_123 document_id=doc_456 status=pending
```

---

## 10. Compliance Audit Trail Requirements

The system satisfies key regulatory logging requirements:

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Immutable audit trail | PostgreSQL append-only `audit_events` table | [ORM model](src/doc_quality/models/orm.py) |
| Login/logout events | `login_success`, `login_failure`, `logout` | [auth.py](src/doc_quality/api/routes/auth.py#L110) |
| Access control enforcement | RBAC role checks logged per request | [session_auth.py](src/doc_quality/core/session_auth.py) |
| Document analysis tracing | Full step-level CrewAI events + outcome | [document_review_flow.py](services/orchestrator/src/doc_quality_orchestrator/flows/document_review_flow.py) |
| Human review records | HITL review lifecycle in `hitl_reviews` + audit events | [hitl_workflow.py](src/doc_quality/services/hitl_workflow.py) |
| Timestamp accuracy | ISO 8601 UTC timestamps on all events | [logging_config.py](src/doc_quality/core/logging_config.py) |
| Correlation tracking | trace_id / correlation_id for multi-step workflows | [skills.py models](src/doc_quality/models/skills.py#L113) |
| Sensitive data protection | PII sanitization via `sanitize_text()` | [security.py](src/doc_quality/core/security.py) |

---

## 11. Quick Reference

### Enable JSON Logging (Production)

```bash
LOG_FORMAT=json
LOG_LEVEL=INFO
```

### Enable Debug Logging (Development)

```bash
LOG_FORMAT=console
LOG_LEVEL=DEBUG
```

### Query Recent Audit Events

```bash
sqlite3 doc_quality.db "SELECT event_time, event_type, actor_id FROM audit_events ORDER BY event_time DESC LIMIT 20;"
```

### Test Logging in Tests

```python
import pytest
from src.doc_quality.core.logging_config import configure_logging

@pytest.fixture(autouse=True)
def setup_logging():
    configure_logging(log_level="DEBUG", log_format="console")
    yield
```

---

## 12. Related Documentation

- [System Architecture Document (SAD)](project-context/1.define/sad.md) — Observability as architectural requirement
- [Backend Implementation](project-context/2.build/backend.md) — Detailed service logging patterns
- [Database Schema](DATABASE_README.md#database-schema) — `audit_events` table reference
- [Authentication & Authorization](AUTHENTICATION_AUTHORIZATION_README.md) — Login/logout event logging

---

**Document Version**: 0.1.0  
**Last Updated**: March 30, 2026  
**Status**: Phase 0 MVP (complete), Phase 3 enhancements (OTEL, metrics) planned
