# Backend Implementation Documentation — Doc Quality Compliance Check

<!-- markdownlint-disable MD031 MD032 MD038 MD040 MD056 MD060 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.4.0  
**Date:** 2026-4-30  
**Author persona:** `@backend-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The backend is a Python 3.12 FastAPI application using a hybrid layered architecture:

```text
API Routes → Service Layer / Skills API → Persistence / Audit Trail
                                      └→ Optional agent wrappers / CrewAI orchestrator
                                      └→ Model provider adapter layer
```

All data flows through Pydantic v2 models. All service functions use full Python type hints. All operations are logged via structlog. User-supplied content is sanitised at the API boundary before persistence or downstream processing.

---

## Section 1 – Multi-Agent Architecture

The system implements a CrewAI-style multi-agent pattern with two specialised agents that wrap the service layer with optional LLM enrichment. The best-fit target architecture is a **hybrid model**:


- keep existing wrapper-style agents for simple and latency-sensitive tasks,
- add a dedicated **CrewAI orchestrator service** for complex multi-step workflows,
- keep all production-system access in the backend **Skills API / service layer**,
- route model access through a **provider adapter interface** so workflow code does not depend on a specific SDK.

**Phase 0 status:** Wrapper-based path is production-ready and the standalone CrewAI orchestrator service already exists. It extends (not rewrites) the existing Skills API service layer.

**Prompt Governance & Traceability (AD-11, Phase 0 mandatory):** All LLM prompts (provider-agnostic, including Anthropic/OpenAI/other adapters) must be managed as versioned artifacts in `prompts/` with traceable change rationale and version identifiers. No inline production prompts are permitted.

**Skills API boundary (required):**

- document retrieval and document parsing (`pypdf`, `python-docx`, OCR fallback later),
- PostgreSQL reads/writes and audit-event persistence,
- export/report generation,
- redaction, tool allowlists, and rate-limit/guardrail enforcement.

Agents and CrewAI flows must call these capabilities through backend services or HTTP endpoints; they must not access the database directly.

**Model adapter contract (required):**

- `generate(messages, options) -> { content, json?, tool_calls?, usage, model_id }`
- optional `stream(messages, options)` for UX/chat paths
- capability declaration: `tool_calls`, `json_schema`, `streaming`

Initial adapters:

- `AnthropicAdapter` (current primary implementation target)
- `OpenAICompatibleAdapter` (generic compatible endpoints)
- `NemotronAdapter` (supported provider target, may initially use stub/dev endpoint or compatible gateway)

### DocumentCheckAgent (`src/doc_quality/agents/doc_check_agent.py`)

| Property | Value |
|----------|-------|
| **Role** | Document Quality Analyst |
| **Goal** | Analyse uploaded documents for structural completeness and quality gaps |
| **Backstory** | Expert in arc42 architecture documentation standards and model card requirements |
| **Tools** | `document_analyzer.py` service functions; optional Anthropic Claude call |
| **LLM enrichment** | When an LLM adapter is enabled (currently Anthropic path): sends document content with a structured prompt loaded from versioned files in `prompts/`; parses response into `DocumentAnalysisResult` supplement |

### ComplianceCheckAgent (`src/doc_quality/agents/compliance_agent.py`)

| Property | Value |
|----------|-------|
| **Role** | EU AI Act Compliance Specialist |
| **Goal** | Assess domain information against EU AI Act mandatory requirements |
| **Backstory** | Expert in EU AI Act Arts. 9–15, risk classification methodology, and provider/deployer role detection |
| **Tools** | `compliance_checker.py` service functions; optional Anthropic Claude call |
| **LLM enrichment** | When an LLM adapter is enabled (currently Anthropic path): sends domain description with a structured prompt loaded from versioned files in `prompts/`; parses response into `ComplianceCheckResult` supplement |

### CrewAI Orchestrator (`services/orchestrator/`)

| Property | Value |
|----------|-------|
| **Role** | Workflow brain for multi-step compliance runs |
| **Responsibilities** | crew/flow definition, branching, retries, verifier gates, run/step audit events |
| **Boundaries** | Uses Skills API/services for tools and data access; no direct DB access from agents |
| **Endpoints (minimum)** | `/health`, `/workflows/run` |
| **Initial workflow** | `generate_audit_package` or equivalent end-to-end compliance flow |
| **Config source** | YAML at `services/orchestrator/src/doc_quality_orchestrator/crews/config/agents.yaml` and `.../tasks.yaml` (loaded by `build_generate_audit_package_crew` via CrewAI `config=...` convention) |

**Crew persona matrix (concise):**

| Agent | Role | Goal | Backstory Focus |
|-------|------|------|-----------------|
| Intake | Audit Scope Senior Research Specialist | Resolve scope + validate document/metadata before analysis | Meticulous scope validation and ambiguity reduction |
| Evidence | Document Evidence Senior Research Specialist | Extract high-signal, citation-ready evidence via Skills API | Completeness and traceable evidence quality |
| Compliance | EU AI Act Critical Reviewer and Risk Analyst | Identify policy gaps/risks and write evidence-backed findings | Skeptical review; assumption and evidence checks |
| Synthesis | Senior Compliance Instructor for non-technical reviewers | Explain results clearly in structured audit package | Educator style; clarity for non-technical stakeholders |
| Verifier | Audit Package Critical Reviewer and Risk Analyst | Pass/fail final package on schema, citations, hallucination checks | Final quality gate, fail-fast mindset |

### Provider Adapter Layer (`services/model_adapters/`)

| Adapter | Purpose |
|---------|---------|
| `AnthropicAdapter` | Current provider implementation target |
| `OpenAICompatibleAdapter` | Common adapter surface for compatible backends |
| `NemotronAdapter` | Adapter contract for NVIDIA Nemotron-Parse integration target |

### CrewAI Runtime Controls & Observability (Phase 0, defined in CrewAI DoD)

**Operational Safety Limits (hard enforced):**

All CrewAI orchestrator runs are bounded by the following hard limits to prevent runaway execution and excessive token consumption:

- `max_steps`: Maximum number of steps per run (e.g., 10–15 steps for flagship workflow)
- `max_retries_per_step`: Maximum retries per failed step (e.g., 2–3)
- `max_token_budget_per_run`: Token budget ceiling per complete run (e.g., 100K tokens)
- `step_timeout_seconds`: Per-step wall-clock timeout (e.g., 60–120 seconds)
- `global_run_timeout_seconds`: Overall run timeout (e.g., 300–600 seconds)

Exceeded limits trigger immediate failure with explicit run status and reason code (e.g., `TIMEOUT_EXCEEDED`, `TOKEN_BUDGET_EXCEEDED`, `MAX_RETRIES_EXHAUSTED`).

**Routing and Kill-Switch:**

- `routing_mode`: Task router selects between `single_agent_wrapper` (rule-based, latency-sensitive) and `crewai_workflow` (multi-step, complex)
- **Feature-flagged:** Routing can be configured per tenant, user, or complexity signal (e.g., document size, requirement count)
- **Kill-switch:** Enables immediate routing of all traffic back to single-agent path without redeploy (safety feature for production incidents)
- **Routing decision logging:** Every execution logs its routing choice in audit events for compliance and debugging

**Observability and Auditability:**

Every CrewAI step is fully observable and persisted to PostgreSQL:

- `run_id`, `trace_id`, `workflow_id`: Unique identifiers for end-to-end tracing
- `step_id`, `attempt`: Step-level tracking with retry attempts
- `agent_id`, `tool_name`: Agent and tool provenance
- `status`, `started_at`, `ended_at`: Execution lifecycle
- `prompt_template` / `prompt_version`: Versioned prompt references (loaded from `prompts/` directory)
- `tool_inputs` / `tool_outputs`: Step input/output (redacted per policy)
- `token_usage` / `cost_metadata`: Token and cost tracking where available
- **Replay links:** All step artifacts (prompts, I/O, redaction metadata) are persisted to enable deterministic replay for audit and debugging
- **Verifier gate:** A Verifier Agent validates every step's output against JSON schema, presence of citations/evidence, and absence of hallucinated markers

All audit events are stored in the `audit_events` append-only table with provenance fields (`tenant_id`, `org_id`, `project_id`, `actor_id`, `correlation_id`) for full compliance audit trail.

**Agent-specific data governance:**

- Long-retention `audit_events` are preserved for compliance (hot/warm/cold tiers per Persistence DoD)
- Short-retention `agent_telemetry` (non-compliance-critical) is kept for operational monitoring and debugging
- Sensitive content is redacted per policy before any persistence

### CrewAI Flow Orchestration Pattern (Phase 0+, Best Practice Implementation)

**Architecture (idiomatic CrewAI pattern):**

```
FastAPI HTTP Request
    ↓
OrchestratorService (thin wrapper)
    ↓
DocumentReviewFlow (owns orchestration logic)
    ├─ _resolve_routing_mode()
    ├─ execute_workflow()
    ├─ _dispatch()
    ├─ _crew_path()  ← calls Crew.kickoff()
    └─ _scaffold_path()  ← single-agent fallback
    ↓
WorkflowRunResponse
```

**Design pattern rationale:**

Per CrewAI best practices, the Flow pattern separates concerns:

- **Flow** (`DocumentReviewFlow` in `flows/document_review_flow.py`):
  - Owns end-to-end orchestration logic
  - Manages workflow state (run_id, trace_id, correlations)
  - Resolves routing mode (single-agent vs crew) with kill-switch logic
  - Enforces global timeout via `asyncio.wait_for()`
  - Logs routing decisions and completion events
    - Runs a post-crew model validator stage through the provider adapter contract
  - Dispatches to execution paths
  - Returns structured response

**Post-crew validator stage (Phase 0 hardening):**

- Executes after `crew.kickoff()` and after the deterministic verifier result is parsed.
- Uses the same provider adapter abstraction as the rest of the orchestrator, so validation remains provider-neutral.
- Loads a versioned prompt from `services/orchestrator/src/doc_quality_orchestrator/prompts/model_validator_stage_v1.txt`.
- Requests structured JSON output with `decision`, `summary`, `issues`, and `checks`.
- Persists `model_validator_stage_started`, `model_validator_stage_completed`, and `model_validator_stage_skipped` audit events.
- Keeps deterministic task guardrails and the Crew verifier authoritative; if the model validator cannot return valid structured output, the stage is skipped instead of breaking the run.

- **Service** (`OrchestratorService` in `service.py`):
  - Thin HTTP-facing wrapper
  - Accepts requests from FastAPI controller
  - Instantiates DocumentReviewFlow
  - Delegates all orchestration to Flow
  - Returns response to caller

- **Crew** (`build_generate_audit_package_crew()` in `crews/review_flow.py`):
  - Reusable "team skill" encapsulating five specialized agents
  - Executed in thread-pool executor via `crew.kickoff()`
  - Called from Flow._crew_path()
  - Agents access backend only via Skills API tools

**Flow state management:**

```python
class DocumentReviewFlow:
    def __init__(self, settings: OrchestratorSettings):
        self.settings = settings
        self.skills_api = SkillsApiClient(settings.backend_base_url)
        # Flow state (initialized per execute_workflow call)
        self.run_id: str = ""
        self.trace_id: str = ""
        self.routing_mode: Literal["single_agent_wrapper", "crewai_workflow"] = "..."

    async def execute_workflow(self, request: WorkflowRunRequest):
        # Initialize Flow state
        self.run_id = str(uuid4())
        self.trace_id = request.trace_id or str(uuid4())
        self.routing_mode = self._resolve_routing_mode(request)
        # ... rest of orchestration
```

**Future extensibility (Phase 1+):**

The Flow pattern enables:
- **Multi-crew orchestration:** Sequence multiple crews (extract → analyze → report)
- **Event-driven workflows:** Respond to webhooks, schedules, document uploads
- **State machines:** Complex branching and conditional logic
- **Team skill reuse:** Same crew in multiple flows

All possible without changing Crew definitions.

**Agent initialization pattern:**

```python
# Both agents follow this pattern
class DocumentCheckAgent:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = (
            anthropic.Anthropic(api_key=self.settings.anthropic_api_key)
            if self.settings.anthropic_api_key
            else None
        )
        self.logger = get_logger(__name__)

    def analyze(self, content: str, filename: str) -> DocumentAnalysisResult:
        # 1. Always run rule-based analysis
        result = analyze_document(content, filename)
        # 2. Optionally enrich with Claude
        if self.client:
            result = self._enrich_with_llm(result, content)
        return result
```

---

## Section 2 – FastAPI Application Structure

### Application Factory (`src/doc_quality/api/main.py`)

The application is created via an `create_app()` factory function following the FastAPI recommended pattern for testability.

**Lifespan context manager:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_format)
    logger.info("application_starting", version=settings.app_version, env=settings.environment)
    yield
    logger.info("application_stopping")
```

**CORS configuration:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://0.0.0.0:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

**Request logging middleware:**
Every HTTP request flows through middleware that adds request/correlation IDs, applies global rate limiting to `/api/v1/*`, records OpenTelemetry span metadata when enabled, emits `http_request` logs, and appends response tracing headers:
```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid4().hex
    correlation_id = request.headers.get("x-correlation-id") or request_id
    structlog.contextvars.bind_contextvars(request_id=request_id, correlation_id=correlation_id)
    ...
    logger.info("http_request", method=..., path=..., status=..., duration_ms=..., trace_id=...)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Correlation-ID"] = correlation_id
    return response
```

**Static file serving (legacy compatibility):**
```python
try:
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
except RuntimeError:
    pass  # Frontend directory not found; skip static serving
```

This mount is preserved for compatibility with legacy assets, but the preferred frontend runtime is the separate Next.js application in `frontend/`.

**Health check:**
```python
@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "version": settings.app_version}
```

---

## Section 3 – API Routes

### 3.1 Documents Routes (`/api/v1/documents`)

**`POST /api/v1/documents/analyze`**

| Property | Value |
|----------|-------|
| Request body | `AnalyzeTextRequest` — `content: str`, `filename: str`, `doc_type: DocumentType \| None` |
| Response | `DocumentAnalysisResult` (JSON) |
| Auth | Required (API key or bearer token, role-based authorization checks) |
| Security | `sanitize_text(content)`, `validate_filename(filename)` applied before processing |

**`POST /api/v1/documents/upload`**

| Property | Value |
|----------|-------|
| Request body | `multipart/form-data` — `file: UploadFile` |
| Supported formats | `.md`, `.txt`, `.pdf`, `.docx` (full text extraction for binary and text formats) |
| File size limit | `MAX_FILE_SIZE_MB` (default 10 MB); returns HTTP 413 if exceeded |
| Response | `DocumentAnalysisResult` (JSON) |
| Security | `validate_filename()`, `validate_file_size()`, `sanitize_text()` applied |

### 3.2 Compliance Routes (`/api/v1/compliance`)

**`POST /api/v1/compliance/check/eu-ai-act`**

| Property | Value |
|----------|-------|
| Request body | `ComplianceCheckRequest` — `document_content: str`, `document_id: str`, `domain_info: ProductDomainInfo` |
| Response | `ComplianceCheckResult` with risk level, role, 9 requirements, gaps, score |
| Auth | Required (`qm_lead`, `architect`, `riskmanager`, `auditor`) |
| Framework | EU AI Act (Regulation (EU) 2024/1689) |
| Notes | `document_content` is sanitized via `sanitize_text()` before processing |

**`POST /api/v1/compliance/applicable-regulations`**

| Property | Value |
|----------|-------|
| Request body | `ProductDomainInfo` |
| Response | `list[ComplianceFramework]` — applicable regulatory frameworks detected |
| Auth | Required (`qm_lead`, `architect`, `riskmanager`, `auditor`) |
| Frameworks | EU AI Act, MDR, GDPR, ISO 9001, ISO 27001, BSI Grundschutz |

**`POST /api/v1/compliance/standard-mapping-requests`**

| Property | Value |
|----------|-------|
| Request body | `StandardMappingRequestCreate` — `standard_name`, `sop_reference`, `business_justification`, `requester_email`, `tenant_id`, `project_id` (optional) |
| Response | `StandardMappingRequestRecord` — `request_id` (SMR-{hex}), `status`, `submitted_at`, all sanitized input fields |
| Auth | Required (`qm_lead`, `architect`, `riskmanager`, `auditor`) |
| Persistence | Persisted as `compliance.standard_mapping.requested` audit event in `audit_events` table |
| Purpose | Submit a request to map an internal SOP to a named standard; creates an auditable compliance artefact |

**`GET /api/v1/compliance/standard-mapping-requests`**

| Property | Value |
|----------|-------|
| Query params | `limit` (1..200, default 25) |
| Response | `StandardMappingRequestListResponse` — recent standard-mapping requests from audit event storage |
| Auth | Required (`qm_lead`, `architect`, `riskmanager`, `auditor`) |
| Purpose | List recent mapping requests for compliance review and dashboard display |

**HITL review exposure status:**

- The HITL persistence and service layer are implemented in `src/doc_quality/services/hitl_workflow.py`.
- A dedicated public HTTP route surface for full HITL review lifecycle management is **not yet fully exposed** in the current API.
- This remains one of the main integration gaps between implemented backend capability and browser-facing workflows.

### 3.3 Reports Routes (`/api/v1/reports`)

**`POST /api/v1/reports/generate`**

| Property | Value |
|----------|-------|
| Request body | Includes: `document_analysis_id`, `compliance_check_id` (optional), `reviewer_name` (optional) |
| Response | `ReportResult` — `id`, `file_path`, `generated_at` |
| Output | PDF file saved to `reports/report_{uuid}.pdf` |

**`GET /api/v1/reports/download/{report_id}`**

| Property | Value |
|----------|-------|
| Path param | `report_id: str` — UUID of previously generated report |
| Response | `application/pdf` binary stream |
| Error | HTTP 404 if report file not found |

### 3.4 Templates Routes (`/api/v1/templates`)

**`GET /api/v1/templates/`**

| Property | Value |
|----------|-------|
| Response | `list[dict]` — all templates with `id`, `title`, `active`, `category`, `description` |
| Source | `ACTIVE_TEMPLATES + INACTIVE_TEMPLATES` from `template_manager.py` |

**`GET /api/v1/templates/{template_id}`**

| Property | Value |
|----------|-------|
| Path param | `template_id: str` — e.g., `business_goals`, `architecture` |
| Response | `dict` with `id`, `title`, `content` (markdown text), `active` |
| Error | HTTP 404 if template ID not found |
| Inactive templates | Return placeholder content (not 404) |

### 3.5 Observability Routes (`/api/v1/observability`)

**`POST /api/v1/observability/quality-observations`**

| Property | Value |
|----------|-------|
| Request body | `QualityObservationRequest` — `source_component`, `aspect`, `outcome`, optional `score`, `latency_ms`, `error_type`, `hallucination_flag`, evaluation metadata |
| Response | `QualityObservationRecord` persisted in `quality_observations` |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`, service clients allowed) |
| Purpose | Capture production quality signals for performance, accuracy, error, hallucination, and evaluation tracking |

**`GET /api/v1/observability/quality-summary`**

| Property | Value |
|----------|-------|
| Query params | `window_hours` (1..2160), optional `source_component`, optional `aspect` |
| Response | `QualitySummaryResponse` with totals, aspect breakdown, average score, p95 latency |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`, service clients allowed) |
| Purpose | Support operational dashboards and post-release quality evaluation loops |

**`GET /api/v1/observability/llm-traces`**

| Property | Value |
|----------|-------|
| Query params | `limit` (1..100), `window_hours` (1..2160), optional `source_component` |
| Response | `LlmPromptOutputList` — recent prompt/output pairs including `rich_payload` (all non-base fields from the observation payload: tokens, temperature, latency, hallucination flag, domain extras) |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`, service clients allowed) |
| Purpose | Visual traceability of LLM prompts and outputs in admin observability tooling |

**`GET /api/v1/observability/workflow-components`**

| Property | Value |
|----------|-------|
| Query params | `window_hours` (1..2160) |
| Response | `WorkflowComponentBreakdownResponse` — per `source_component` totals, pass/warn/fail/info counts, average latency, latest event timestamp; sorted by total desc |
| Auth | Required (same roles as above) |
| Purpose | Component-level breakdown for pipeline health inspection — isolate which agent (research\_agent, document\_analyzer, compliance\_checker) contributes to latency regressions or failure spikes |

**`GET /metrics`**

| Property | Value |
|----------|-------|
| Response | Prometheus text exposition (`dq_http_requests_total`, request latency histograms, quality metrics families) |
| Auth | Public scrape endpoint (deployment should restrict network access at ingress) |
| Purpose | Real-time performance/error/quality telemetry ingestion by monitoring stack |

### 3.6 Admin — Stakeholder Profile Routes (`/api/v1/admin/stakeholder-profiles`)

**`GET /api/v1/admin/stakeholder-profiles`**

| Property | Value |
|----------|-------|
| Query params | `include_inactive: bool` (default `true`) |
| Response | `StakeholderProfileListResponse` — all configured role-template profiles |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`) |
| Purpose | Populate role selector on the Stakeholders & Rights admin page |

**`PUT /api/v1/admin/stakeholder-profiles/{profile_id}`**

| Property | Value |
|----------|-------|
| Path param | `profile_id: str` (1..64 chars) |
| Request body | `StakeholderProfileUpsertRequest` — `title`, `description`, `permissions`, `is_active` |
| Response | `StakeholderProfileRecord` — created or updated profile |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`) |
| Purpose | Create or update one stakeholder role-template profile (idempotent upsert) |

**`GET /api/v1/admin/stakeholder-profiles/{profile_id}/employees`**

| Property | Value |
|----------|-------|
| Path param | `profile_id: str` |
| Response | `StakeholderEmployeeAssignmentListResponse` — list of `StakeholderEmployeeAssignmentRecord` with `assignment_id`, `employee_name`, `created_at`, `created_by` |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`) |
| Purpose | List all employees currently assigned to a role profile |

**`POST /api/v1/admin/stakeholder-profiles/{profile_id}/employees`**

| Property | Value |
|----------|-------|
| Path param | `profile_id: str` |
| Request body | `StakeholderEmployeeAssignmentRequest` — `employee_name` |
| Response | `StakeholderEmployeeAssignmentRecord` for the created row |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`) |
| Validation | Duplicate name+profile combination currently raises HTTP 400 from backend validation |
| Purpose | Add a named employee to a role profile (single-add from UI; called in parallel for bulk-add) |

**`DELETE /api/v1/admin/stakeholder-profiles/{profile_id}/employees/{assignment_id}`**

| Property | Value |
|----------|-------|
| Path params | `profile_id: str`, `assignment_id: str` |
| Response | JSON success payload — `{"success": true}` |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`) |
| Purpose | Remove a named employee assignment from a role profile |

---

### 3.7 Bridge Routes (`/api/v1/bridge`)

Production-grade compliance execution with HITL integration and regulatory drift detection.

**`POST /api/v1/bridge/run/eu-ai-act`**

| Property | Value |
|----------|-------|
| Request body | `BridgeRunRequest` — `document_id: str`, `domain_info: ProductDomainInfo` |
| Response | `BridgeRunResponse` — `run_id`, `compliance_score`, `requirements`, `mandatory_gaps`, `approved`, `human_review_required`, `regulatory_update` |
| Auth | Required (`qm_lead`, `architect`, `riskmanager`, `auditor`) |
| Persistence | Run outcome persisted as audit events; findings stored in `skill_findings`; bridge review records stored in `bridge_human_reviews` |
| Purpose | Execute full EU AI Act compliance run for a document, evaluate regulatory drift, and generate structured result for HITL review gate |

**`GET /api/v1/bridge/alerts/eu-ai-act/{document_id}`**

| Property | Value |
|----------|-------|
| Path param | `document_id: str` |
| Response | `BridgeRegulatoryAlertResponse` — `regulatory_update` with drift status vs last approved run |
| Auth | Required |
| Purpose | Check if EU AI Act requirements have changed since last approved run; drives UI popup alerts |

**`GET /api/v1/bridge/runs/{run_id}/human-review`**

| Property | Value |
|----------|-------|
| Path param | `run_id: str` |
| Response | `BridgeHumanReviewResponse` — previously submitted review for this run |
| Auth | Required (`qm_lead`, `riskmanager`, `auditor`) |
| Error | HTTP 404 if no review exists yet |
| Purpose | Rehydrate prior human-review state when reopening a bridge run page |

**`POST /api/v1/bridge/runs/{run_id}/human-review`**

| Property | Value |
|----------|-------|
| Path param | `run_id: str` |
| Request body | HITL decision — `decision` (`approved`\|`rejected`), `reason`, and optional follow-up task assignment |
| Response | `BridgeHumanReviewResponse` |
| Auth | Required (`qm_lead`, `riskmanager`, `auditor`) |
| Validation | Returns HTTP 409 on duplicate submission and HTTP 422 on invalid follow-up-task combinations |
| Purpose | Record the HITL approval/rejection decision for a bridge run; creates auditable approval artefact |

**`POST /api/v1/bridge/agents/reload`**

| Property | Value |
|----------|-------|
| Response | `BridgeAgentsReloadResponse` — readiness snapshot for all bridge agents plus active requirements version/signature |
| Auth | Required (`qm_lead`, `architect`, `riskmanager`, `auditor`) |
| Purpose | Operational reload/readiness action used by the Bridge overview page |

---

### 3.8 Research Routes (`/api/v1/research`)

Perplexity-powered regulatory research with graceful static fallback.

**`POST /api/v1/research/regulations`**

| Property | Value |
|----------|-------|
| Request body | `ResearchRequest` — `domain: str`, `description: str`, `target_market: str`, `custom_query: str \| None` |
| Response | `ResearchResult` — `answer`, `citations`, `applicable_frameworks`, `provider`, `model_used`, `query` |
| Auth | Required (`qm_lead`, `architect`, `riskmanager`, `auditor`) |
| Graceful degradation | Falls back to static regulation map when `PERPLEXITY_API_KEY` is not set |
| Observability | Result logged to `quality_observations` when Perplexity provider is used |
| Purpose | Research applicable EU/German regulations for a product domain; supports compliance gap analysis |

---

### 3.9 Skills Routes (`/api/v1/skills`)

Backend Skills API for CrewAI orchestrator tool calls. All endpoints support `allow_service=True` so machine-to-machine access via service role is permitted in addition to browser user roles.

**`POST /api/v1/skills/get_document`**

| Property | Value |
|----------|-------|
| Request body | `GetDocumentRequest` — `document_id: str` |
| Response | `SkillDocumentRecord` |
| Auth | Required (browser roles **or** service client) |
| Error | HTTP 404 if document not found |

**`POST /api/v1/skills/search_documents`**

| Property | Value |
|----------|-------|
| Request body | `SearchDocumentsRequest` — `query: str`, `limit: int` |
| Response | `SearchDocumentsResponse` — matched documents |
| Auth | Required (browser roles or service client) |

**`POST /api/v1/skills/extract_text`**

| Property | Value |
|----------|-------|
| Request body | `ExtractTextRequest` — document id or inline content |
| Response | `ExtractTextResponse` — extracted text, content type |
| Auth | Required (browser roles or service client) |
| Error | HTTP 400 if file size exceeds `MAX_FILE_SIZE_MB` |

**`POST /api/v1/skills/write_finding`**

| Property | Value |
|----------|-------|
| Request body | `WriteFindingRequest` — `document_id`, `finding_type`, `title`, `description`, `severity`, `evidence` |
| Response | `FindingRecord` |
| Auth | Required (browser roles or service client) |
| Error | HTTP 404 if referenced document not found |

**`POST /api/v1/skills/log_event`**

| Property | Value |
|----------|-------|
| Request body | `LogEventRequest` — full `AuditEventORM` field set |
| Response | `AuditEventRecord` |
| Auth | Required (browser roles or service client) |
| Purpose | Orchestrator emits run/step audit events directly via this skill endpoint |

---

### 3.10 Risk Templates Routes (`/api/v1/risk-templates`)

Full CRUD for RMF (Risk Management File) and FMEA risk templates with AI-assisted row suggestions and CSV export.

**`GET /api/v1/risk-templates`**

| Property | Value |
|----------|-------|
| Query params | `template_type` (`RMF`\|`FMEA`, optional), `product` (optional) |
| Response | `RiskTemplateListResponse` |
| Auth | Required (`qm_lead`, `riskmanager`, `architect`, `auditor`) |

**`POST /api/v1/risk-templates`**

| Property | Value |
|----------|-------|
| Request body | `CreateRiskTemplateRequest` — `template_type`, `template_title`, `product`, `created_by`, optional `rationale`, `rows` |
| Response | `RiskTemplate` (created) |
| Auth | Required |

**`GET /api/v1/risk-templates/{template_id}`**

| Property | Value |
|----------|-------|
| Response | `RiskTemplate` with all rows |
| Error | HTTP 404 if not found |
| Auth | Required |

**`PUT /api/v1/risk-templates/{template_id}`**

| Property | Value |
|----------|-------|
| Request body | `UpdateRiskTemplateRequest` |
| Response | Updated `RiskTemplate` |
| Auth | Required |

**`DELETE /api/v1/risk-templates/{template_id}`**

| Property | Value |
|----------|-------|
| Response | HTTP 204 |
| Auth | Required |

**`PUT /api/v1/risk-templates/defaults/{template_type}`**

| Property | Value |
|----------|-------|
| Path param | `template_type: str` (`RMF`\|`FMEA`) |
| Request body | `EnsureDefaultRiskTemplateRequest` |
| Response | `RiskTemplate` — created or existing default |
| Auth | Required |
| Purpose | Idempotent endpoint to seed the default template for a type on first use |

**`GET /api/v1/risk-templates/{template_id}/export/csv`**

| Property | Value |
|----------|-------|
| Response | `text/csv` stream — all rows exported |
| Auth | Required |
| Purpose | Excel-compatible CSV export for FMEA tables and risk management records (SAD §3.1 requirement) |

**`POST /api/v1/risk-templates/ai-suggest`**

| Property | Value |
|----------|-------|
| Request body | `AiSuggestRowRequest` — `template_type`, `partial_row`, and optional free-text `context` |
| Response | `AiSuggestRowResponse` — AI-suggested field values |
| Auth | Required |
| Graceful degradation | Falls back to empty/default suggestions when `ANTHROPIC_API_KEY` is not set |

---

### 3.11 Audit Trail Routes (`/api/v1/audit-trail`)

Governance-focused read-only audit trail access and audit schedule management.

**`GET /api/v1/audit-trail/events`**

| Property | Value |
|----------|-------|
| Query params | `window_hours` (1..8760, default 720), `limit` (1..1000, default 200), `event_type`, `actor_id`, `subject_type`, `subject_id` (all optional filters) |
| Response | `AuditEventListResponse` — filtered audit event timeline |
| Auth | Required (`qm_lead`, `auditor`, `riskmanager`, `architect`) |
| Purpose | Power the Audit Trail governance page; filter by actor, subject, or event type |

**`GET /api/v1/audit-trail/events/{event_id}`**

| Property | Value |
|----------|-------|
| Path param | `event_id: str` |
| Response | `AuditEventRecord` — full event payload with provenance fields |
| Auth | Required |
| Error | HTTP 404 if not found |

**`GET /api/v1/audit-trail/schedule`**

| Property | Value |
|----------|-------|
| Query params | `tenant_id` (default `default_tenant`), `org_id`, `project_id` (optional) |
| Response | `AuditScheduleRecord` — planned internal/external audit dates, notified body |
| Auth | Required |

**`PUT /api/v1/audit-trail/schedule`**

| Property | Value |
|----------|-------|
| Request body | `UpsertAuditScheduleRequest` — `internal_audit_date`, `external_audit_date`, `external_notified_body`, `tenant_id`, `org_id`, `project_id` |
| Response | Updated `AuditScheduleRecord` |
| Auth | Required |
| Purpose | Persist audit planning dates for compliance governance and calendar views |

---

### 3.12 Dashboard Routes (`/api/v1/dashboard`)

Aggregated analytics endpoints powering Command Center KPIs and document risk views.

**`GET /api/v1/dashboard/summary`**

| Property | Value |
|----------|-------|
| Query params | `timeframe` (`week`\|`month`\|`year`, default `month`) |
| Response | `DashboardSummaryResponse` — KPIs (`open_documents`, `closed_documents`, `active_jobs`, `compliance_pass_rate`, `bridge_runs_done`), `risk_distribution` (high/limited/minimal counts), document rows with per-row compliance check results |
| Auth | Required (session authenticated) |
| Purpose | Populate the Command Center dashboard with current quality/compliance KPIs |

---

## Section 4 – Service Layer

### 4.0 Quality Service (`src/doc_quality/services/quality_service.py`)

Observability persistence and aggregation functions for the quality telemetry pipeline.

**`save_quality_observation(db, request: QualityObservationRequest) -> QualityObservationORM`**

Persists a single quality observation row to the `quality_observations` table, including all payload fields as JSON.

**`get_quality_summary(db, window_hours, source_component, aspect) -> QualitySummaryResponse`**

Aggregates observations in the requested window. Returns totals, hallucination/error/evaluation counts, average score, p95 latency, and a per-aspect breakdown list (`QualityAspectSummary`).

**`get_recent_llm_prompt_output_pairs(db, limit, window_hours, source_component) -> LlmPromptOutputList`**

Returns the most recent LLM traces. Each item includes `prompt`, `output`, `provider`, `model_used`, `trace_id`, `correlation_id`, `subject_type`, `subject_id`, and a `rich_payload` dict containing all non-base payload fields (tokens used, temperature, latency, hallucination flag, domain extras) extracted at query time.

**`get_workflow_component_breakdown(db, window_hours) -> WorkflowComponentBreakdownResponse`**

Groups observations by `source_component`, counts pass/warn/fail/info outcomes, computes average latency, records the latest event timestamp per component, and returns the list sorted by total observations descending. Supports isolation of per-agent performance regressions.

### 4.0b Stakeholder Service (`src/doc_quality/services/stakeholder_service.py`)

Stakeholder profile and employee assignment persistence.

**`list_stakeholder_profiles(db) -> list[StakeholderProfileORM]`**

Returns all stakeholder role-template profiles.

**`list_stakeholder_assignments(db, profile_id) -> list[StakeholderEmployeeAssignmentORM]`**

Returns all employee assignments for a given profile ordered by `created_at`.

**`add_stakeholder_assignment(db, profile_id, employee_name, created_by) -> StakeholderEmployeeAssignmentORM`**

Validates that the profile exists, deduplicates (raises HTTP 409 on duplicate), and persists a new `StakeholderEmployeeAssignmentORM` row.

**`delete_stakeholder_assignment(db, profile_id, assignment_id) -> None`**

Validates the assignment exists and belongs to the profile before deletion (raises HTTP 404 otherwise).

### 4.1 Document Analyzer (`src/doc_quality/services/document_analyzer.py`)

**`detect_document_type(content: str, filename: str) -> DocumentType`**

Detects document type from content keywords and filename heuristics:
- `arc42` in content or filename → `DocumentType.ARC42`
- `model card` in content or `modelcard` in filename → `DocumentType.MODEL_CARD`
- `standard operating procedure` in content or `sop` in filename → `DocumentType.SOP`
- `requirements` in content/filename → `DocumentType.REQUIREMENTS`
- `risk` + `assessment` in content → `DocumentType.RISK_ASSESSMENT`
- Default → `DocumentType.UNKNOWN`

**`analyze_arc42_document(content: str) -> tuple[list[DocumentSection], list[str], DocumentStatus]`**

Checks for all 12 required arc42 sections using case-insensitive regex pattern matching.  
Pattern example: `re.compile(r"#+\s*" + re.escape(section_name), re.IGNORECASE)`  
Also detects 5 UML diagram types from content keywords.  
Returns sections list, UML diagrams detected, and status (`COMPLETE` / `PARTIAL` / `INCOMPLETE`).

**`analyze_model_card(content: str) -> tuple[list[DocumentSection], list[str], DocumentStatus]`**

Checks for all 9 required model card sections using the same regex pattern approach.  
Returns sections list and status.

**`analyze_document(content: str, filename: str, doc_type: DocumentType | None = None) -> DocumentAnalysisResult`**

Main entry point. Detects document type, routes to appropriate analyzer function, computes quality score, generates issues and recommendations lists. Returns complete `DocumentAnalysisResult` with UUID.

### 4.2 Compliance Checker (`src/doc_quality/services/compliance_checker.py`)

**`determine_ai_act_risk_level(domain_info: ProductDomainInfo) -> RiskLevel`**

Classifies AI system risk level by matching domain description against EU AI Act Annex III keyword categories:
- High-risk keywords: `biometric identification`, `critical infrastructure`, `medical devices`, `law enforcement`, etc.
- Returns `RiskLevel.PROHIBITED`, `RiskLevel.HIGH`, `RiskLevel.LIMITED`, or `RiskLevel.MINIMAL`

**`detect_role(domain_info: ProductDomainInfo) -> AIActRole`**

Detects provider/deployer/distributor/importer role from domain description:
- `develop` / `build` / `create` → `AIActRole.PROVIDER`
- `deploy` / `use` / `implement` → `AIActRole.DEPLOYER`
- Default → `AIActRole.UNKNOWN`

**`check_eu_ai_act_compliance(domain_info: ProductDomainInfo) -> ComplianceCheckResult`**

Main EU AI Act check function. Evaluates all 9 requirements (EUAIA-1 through EUAIA-9) against domain info:
- Each requirement is checked for evidence keywords in the domain description
- Returns `ComplianceCheckResult` with risk level, role, per-requirement met/gap status, compliance score, gaps and met lists

**`get_applicable_regulations(domain_info: ProductDomainInfo) -> list[str]`**

Detects which regulatory frameworks apply based on domain keywords:
- AI/ML use → EU AI Act (always when `uses_ai_ml=True`)
- `medical` / `device` → MDR
- `personal data` / `gdpr` → GDPR
- Quality management keywords → ISO 9001
- Security keywords → ISO 27001 / BSI Grundschutz

### 4.3 Template Manager (`src/doc_quality/services/template_manager.py`)

**Template Registry:**
- `ACTIVE_TEMPLATES`: 6 active SOP templates (business goals, stakeholders, architecture, quality requirements, risk assessment, glossary)
- `INACTIVE_TEMPLATES`: 4 future templates (test strategy, deployment, data governance, security concept)
- `ALL_TEMPLATES`: combined list

**`list_templates() -> list[dict]`**

Returns `ALL_TEMPLATES` metadata list. Does not read file contents (metadata only).

**`get_template_by_id(template_id: str, templates_dir: str = "templates/sop") -> str | None`**

- Looks up template by ID in `ALL_TEMPLATES`
- Inactive templates: returns placeholder markdown text (not `None`)
- Active templates: reads markdown file from `templates/sop/{filename}` using `pathlib.Path`
- Missing file: logs error and returns `None`

**`get_template_index(templates_dir: str = "templates/sop") -> str`**

Returns a formatted markdown index page listing all active and inactive templates. Used for dashboard display.

### 4.4 Report Generator (`src/doc_quality/services/report_generator.py`)

**`generate_report(analysis: DocumentAnalysisResult, compliance: ComplianceCheckResult | None, reviewer_name: str | None, output_dir: str = "reports") -> ReportResult`**

Builds a multi-page PDF using ReportLab `SimpleDocTemplate` and `Platypus` API:

1. **Title page:** Report title, filename, document type, generation timestamp, reviewer name (if provided)
2. **Analysis summary:** Status, quality score, sections found/missing count
3. **Section checklist table:** Two-column table (section name | Present/Missing) with green/red row colouring via `TableStyle`
4. **Compliance results (if provided):** Risk level, role, compliance score
5. **Requirements table:** Three-column table (ID | Requirement | Met/Gap)
6. **Gaps list:** Bulleted list of unmet requirements
7. **Recommendations:** Bulleted list of improvement recommendations

PDF is written to `reports/report_{uuid}.pdf`. Directory is created if it does not exist.  
Returns `ReportResult` with generated UUID and file path.

### 4.5 HITL Workflow (`src/doc_quality/services/hitl_workflow.py`)

**Persistent store:** HITL review records are persisted in PostgreSQL and mapped to typed review models. Data survives restarts and is queryable for audit reporting.

**`create_review(document_id, reviewer_name, reviewer_role, modifications, comments) -> ReviewRecord`**

Creates a `ReviewRecord` with UUID. Status is automatically set:
- No modifications → `ReviewStatus.PASSED`
- With modifications → `ReviewStatus.MODIFICATIONS_NEEDED`
- `approval_date` set to `datetime.now(timezone.utc)` if PASSED

**`get_review(review_id: str) -> ReviewRecord | None`**

Fetches by primary key from the persistence layer. Returns `None` if not found.

**`update_review_status(review_id: str, new_status: ReviewStatus, approver_name: str | None) -> ReviewRecord | None`**

Updates persisted status and metadata. Sets `approval_date` when status becomes `PASSED`. Returns `None` if review not found (logs warning).

**`list_reviews() -> list[ReviewRecord]`**

Returns persisted review records as a list, with filtering/pagination support in the API layer.

---

## Section 4b – ORM Models and Database Tables (`src/doc_quality/models/orm.py`)

All tables use SQLAlchemy declarative base and are created/migrated via Alembic.

| Table | ORM Class | Key columns | Purpose |
|---|---|---|---|
| `user_sessions` | `UserSessionORM` | `session_id`, `session_token_hash`, `user_email`, `user_roles` (JSON), `user_org`, `is_revoked`, `expires_at`, `created_at`, `last_seen_at` | Browser session store; token stored as hash only |
| `app_users` | `AppUserORM` | `user_id`, `email`, `password_hash`, `roles` (JSON), `org`, `is_active`, `is_locked`, `created_at`, `updated_at` | Application user credentials with hashed passwords |
| `password_recovery_tokens` | `PasswordRecoveryTokenORM` | `token_id`, `user_email`, `token_hash`, `requested_ip`, `expires_at`, `used_at`, `attempt_count`, `requested_at` | Single-use recovery tokens; only the hash is stored |
| `hitl_reviews` | `ReviewRecordORM` | `review_id`, `document_id`, `status`, `reviewer_name`, `reviewer_role`, `review_date`, `modifications_required` (JSON), `comments`, `approval_date`, `created_at`, `updated_at` | HITL review records with modification requests |
| `audit_events` | `AuditEventORM` | `event_id`, `tenant_id`, `org_id`, `project_id`, `event_time`, `event_type`, `actor_type`, `actor_id`, `subject_type`, `subject_id`, `trace_id`, `correlation_id`, `payload` (JSON) | Append-only compliance audit trail; multi-tenancy + provenance fields; designed for range partitioning on `event_time` |
| `audit_schedules` | `AuditScheduleORM` | `schedule_id`, `tenant_id`, `org_id`, `project_id`, `internal_audit_date`, `external_audit_date`, `external_notified_body`, `updated_by`, `created_at`, `updated_at` | Persistent governance audit planning schedule |
| `bridge_human_reviews` | `BridgeHumanReviewORM` | `review_id`, `run_id`, `document_id`, `decision`, `reason`, `reviewer_email`, `reviewer_roles` (JSON), `reviewed_at`, `next_task_type`, `next_task_assignee`, `next_task_instructions`, `assignee_notified` | Persistent HITL approval/rejection decisions per bridge run |
| `skill_documents` | `SkillDocumentORM` | `document_id`, `filename`, `content_type`, `document_type`, `extracted_text`, `source`, `created_at`, `updated_at` | Document registry for Skills API; stores extracted text for orchestrator tool calls |
| `document_locks` | `DocumentLockORM` | `document_id` (PK), `locked_by`, `locked_at`, `expires_at` | TTL-based document editing lock; prevents concurrent modification by multiple users |
| `skill_findings` | `FindingORM` | `finding_id`, `document_id`, `finding_type`, `title`, `description`, `severity`, `evidence` (JSON), `created_at` | Analysis findings per document created through Skills API |
| `quality_observations` | `QualityObservationORM` | `observation_id`, `event_time`, `source_component`, `aspect`, `outcome`, `score`, `latency_ms`, `error_type`, `hallucination_flag`, `subject_type`, `subject_id`, `trace_id`, `correlation_id`, `payload` (JSON) | AI quality telemetry from workflow agents; `payload` stores LLM trace fields for `rich_payload` extraction |
| `stakeholder_profiles` | `StakeholderProfileORM` | `profile_id`, `title`, `description`, `permissions` (JSON), `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at` | Governance role-template profiles with permission sets |
| `stakeholder_employee_assignments` | `StakeholderEmployeeAssignmentORM` | `assignment_id`, `profile_id`, `employee_name`, `created_by`, `created_at` | Persistent employee-to-role assignments; unique constraint on `(profile_id, employee_name)` |
| `risk_templates` | `RiskTemplateORM` | `template_id`, `template_type` (`RMF`\|`FMEA`), `template_title`, `product`, `version`, `status`, `created_by`, `template_metadata` (JSON), `created_at`, `updated_at` | Risk template header records |
| `risk_template_rows` | `RiskTemplateRowORM` | `row_id`, `template_id`, `row_order`, `row_data` (JSON), `created_at` | Individual data rows belonging to a risk template |

### Key ORM classes

**`AuditEventORM`** — append-only audit trail with full provenance fields (`tenant_id`, `org_id`, `project_id`, `actor_type`/`actor_id`, `subject_type`/`subject_id`, `trace_id`, `correlation_id`). The `payload` JSON column carries event-specific data. Designed for range partitioning on `event_time` for long-term retention.

**`DocumentLockORM`** — lightweight lock ownership record; `document_id` is the primary key (one lock per document). `expires_at` enables TTL-based auto-expiry via application-level check.

**`QualityObservationORM`** — persists all quality signals. The `payload` column stores the full observation dict (including LLM trace fields) as JSON, enabling both structured column queries and flexible `rich_payload` extraction at the API layer.

**`BridgeHumanReviewORM`** — HITL approval artefact for bridge runs; `next_task_type` / `next_task_assignee` fields support follow-up task assignment for `rerun_bridge` or `manual_follow_up` workflows.

**`StakeholderEmployeeAssignmentORM`** — stores who is assigned to which governance role. `created_by` captures the authenticated user email at assignment time. Unique constraint on `(profile_id, employee_name)` prevents accidental duplicates.

---

## Section 5 – Core Utilities

### 5.1 Configuration (`src/doc_quality/core/config.py`)

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    app_name: str = "Doc Quality Compliance Check"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"

    # Security
    secret_key: str = "change-me-in-production"
    allowed_file_types: list[str] = [".pdf", ".docx", ".md", ".txt"]
    max_file_size_mb: int = 10
    session_cookie_name: str = "dq_session"
    session_cookie_secure: bool = False  # auto-set to True outside development
    # Global request rate limiting
    global_rate_limit_enabled: bool = True
    global_rate_limit_requests: int = 240
    global_rate_limit_window_seconds: int = 60
    # Session TTL policy
    session_ttl_short_minutes: int = 120         # remember_me=False
    session_ttl_remember_me_minutes: int = 7200  # remember_me=True
    # MVP user provisioning (override via env vars — never commit real credentials)
    auth_mvp_email: str = "mvp-user@example.invalid"
    auth_mvp_password: str = "CHANGE_ME_BEFORE_USE"
    auth_mvp_roles: str = "qm_lead"
    auth_mvp_org: str = "QM-CORE-STATION"
    auth_auto_provision_mvp_user: bool = True
    # Password recovery
    auth_recovery_ttl_minutes: int = 15
    auth_recovery_rate_limit_count: int = 5
    auth_recovery_rate_limit_window_minutes: int = 15
    auth_recovery_debug_expose_token: bool = False  # must stay False in production
    # Login abuse protection
    auth_login_rate_limit_count: int = 8
    auth_login_rate_limit_window_seconds: int = 300
    auth_login_lockout_seconds: int = 600

    # AI / Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"

    # AI / Perplexity (regulatory research)
    perplexity_api_key: str = ""
    perplexity_model: str = "sonar-pro"
    perplexity_api_base_url: str = "https://api.perplexity.ai"

    # Logging
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "console"

    # Observability (OpenTelemetry + Prometheus)
    metrics_enabled: bool = True
    tracing_enabled: bool = True
    tracing_exporter: Literal["none", "console", "otlp"] = "none"
    tracing_otlp_endpoint: str = ""
    tracing_sampling_ratio: float = 1.0
    telemetry_service_name: str = "doc-quality-api"

    # Storage paths
    templates_dir: str = "templates"
    reports_output_dir: str = "reports"

    # Database (set DATABASE_URL in .env — never commit credentials)
    database_url: str = "postgresql+psycopg2://dbuser:CHANGE_ME@localhost:5432/doc_quality"
    database_echo: bool = False

    @model_validator(mode="after")
    def validate_security_defaults(self) -> "Settings":
        """Enforce secure defaults; fail-fast in production if defaults are unchanged."""
        if self.environment != "development":
            self.session_cookie_secure = True
        if self.environment == "production" and self.secret_key.strip() == "change-me-in-production":
            raise ValueError("SECRET_KEY must be explicitly configured in production")
        return self


def get_settings() -> Settings:
    """Return application settings singleton."""
    return Settings()
```

Production validation also forces `SESSION_COOKIE_SECURE=true` outside development and rejects the default `SECRET_KEY` in production.

### 5.2 Structured Logging (`src/doc_quality/core/logging_config.py`)

```python
def configure_logging(log_level: str = "INFO", log_format: str = "console") -> None:
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
    return structlog.get_logger(name)
```

Every service function logs at key decision points: function entry with input IDs, analysis completion with scores, errors with full context. Log fields never contain user-submitted PII.

### 5.3 Security (`src/doc_quality/core/security.py`)

**`sanitize_text(text: str) -> str`**

```python
def sanitize_text(text: str) -> str:
    return bleach.clean(text, tags=[], strip=True)
```

Strips all HTML tags. Called on all user-supplied text content before any processing.

**`validate_filename(filename: str) -> str`**

```python
_SAFE_FILENAME_PATTERN = re.compile(r"^[\w\-. ]+$")

def validate_filename(filename: str) -> str:
    if not _SAFE_FILENAME_PATTERN.match(filename):
        raise ValueError(f"Unsafe filename: {filename!r}")
    return filename
```

Whitelist regex: alphanumeric, hyphens, dots, underscores, spaces. Validation also restricts file extensions to `.pdf`, `.docx`, `.md`, and `.txt`. Raises `ValueError` → converted to HTTP 400 by route handler.

**`validate_file_size(size_bytes: int, max_mb: int) -> None`**

```python
def validate_file_size(size_bytes: int, max_mb: int) -> None:
    max_bytes = max_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError(f"File size {size_bytes} bytes exceeds {max_mb} MB limit")
```

Raises `ValueError` → converted to HTTP 413 by route handler.

---

## Section 6 – Type Safety and Code Quality

| Practice | Implementation |
|----------|---------------|
| Python type hints | Full type hints in all modules (`str | None`, `list[T]`, return types) |
| Pydantic v2 models | All data passed between layers uses Pydantic BaseModel instances |
| No raw dicts in service layer | Services receive and return typed Pydantic models |
| No `print()` statements | All output goes through structlog |
| No global mutable state | Persistence-backed services avoid module-level mutable stores |
| Enum types | `DocumentType`, `DocumentStatus`, `RiskLevel`, `AIActRole`, `ReviewStatus` |
| Settings via `BaseSettings` | Environment-driven configuration with production validation |

---

## Section 7 – Known Limitations (Current)

The following previously documented MVP gaps are now addressed and therefore are **not** current limitations:

- HITL review persistence is implemented (PostgreSQL-backed storage).
- Authentication and authorization are enforced for protected API routes.
- Binary document text extraction for `.pdf` and `.docx` is fully supported.

### 7.1 Optional LLM Enrichment — Graceful Degradation

When `ANTHROPIC_API_KEY` is not set, agents fall back to rule-based analysis only. The rule-based engine is deterministic and covers all PRD P0 requirements. LLM enrichment adds semantic depth but is not required.

**Graceful degradation pattern:**

```python
if self.client:
    try:
        enriched = self._enrich_with_llm(result, content)
        return enriched
    except Exception as e:
        self.logger.warning("llm_enrichment_failed", error=str(e))
        # Fall through to return rule-based result
return result
```

### 7.2 Phase 0 Test Gating and Phase 2 CI/CD

**Phase 0/current local practice:** Release gating remains manual (`python -m pytest` via local developer or CI orchestrator). The current pytest suite now extends beyond the original 30-test unit baseline and includes API-route, auth/session, and integration-oriented coverage.

**Phase 2:** GitHub Actions CI/CD pipeline will be added with automated pytest, ruff, and mypy checks on every push, plus integration test execution.

---

## Sources

- FastAPI Documentation — Application Factory Pattern, [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- Pydantic v2 — BaseModel, BaseSettings, [https://docs.pydantic.dev/latest/](https://docs.pydantic.dev/latest/)
- structlog — Processors and Configuration, [https://www.structlog.org](https://www.structlog.org)
- bleach — `clean()` API, [https://bleach.readthedocs.io](https://bleach.readthedocs.io)
- ReportLab Platypus — SimpleDocTemplate, Table, TableStyle, [https://www.reportlab.com/docs/](https://www.reportlab.com/docs/)
- EU AI Act Arts. 9–15, Annex III, Annex IV (Regulation (EU) 2024/1689)
- arc42 Template v8.2, [https://arc42.org](https://arc42.org)
- Anthropic Python SDK, [https://github.com/anthropics/anthropic-sdk-python](https://github.com/anthropics/anthropic-sdk-python)

---

## Assumptions

1. The service layer is stateless from an API caller perspective; persistence is delegated to the database layer. Services can be called directly in tests without mocking the FastAPI request context.
2. `get_settings()` returns a fresh `Settings` instance per call; tests that need custom settings should manage environment overrides carefully.
3. Pydantic v2 strict mode is not enabled globally; field validators use lenient coercion by default.
4. The `reports/` directory is created by `report_generator.py` if it does not exist; no pre-creation step is required in deployment.
5. Claude API calls use the model specified by `ANTHROPIC_MODEL` (default: `claude-3-5-sonnet-20241022`); other Claude models are interchangeable.
6. All datetime objects use `timezone.utc` to avoid timezone-naive comparison issues.

---

## Resolved Open Questions

1. **Large document processing workflow (SAD-aligned R-4):** The architecture applies a 10 MB upload limit in current scope and plans Phase 2 mitigation with background tasks + streaming for larger files, including mandatory UI feedback when files exceed limits or move to asynchronous processing.
2. **Agent orchestration (PRD/SAD-aligned (part 1.7), resolved):** Adopt a hybrid pattern: keep the current single-agent wrapper for atomic/latency-sensitive deterministic tasks, and introduce CrewAI flows incrementally for multi-step compliance workflows (audit package generation, evidence gap analysis, cross-document consistency checks) with traceable run events (`trace_id`/`correlation_id`) persisted in PostgreSQL.
3. **Prompt versioning (SAD-aligned AD-11, resolved):** This is a mandatory requirement, not an open design question. In alignment with SAD Section 1.6 “Prompt Versioning & Traceability (Mandatory)” and AD-11, all LLM prompts must be stored as versioned files in `prompts/` (no inline production prompts), including version identifiers and change rationale for audit traceability and reproducibility.
4. **Persistence scaling (SAD-aligned AD-13, resolved):** Long-lived review/audit persistence is implemented with an append-only event log, immutable snapshots, and policy-driven hot/warm/cold retention:
    - **Storage pattern:** append-only `audit_events` as source of truth (who/what/when), separate materialized current-state tables (`reviews`, `findings`, `documents`, `evidence`) for low-latency UI reads.
    - **Event provenance fields:** `tenant_id`, `org_id`, `project_id`, `event_time`, `event_type`, `actor_type`, `actor_id`, `correlation_id`/`trace_id`, `subject_type`/`subject_id`, `payload` (`jsonb`), optional `payload_hash`.
    - **Immutable snapshots:** periodic snapshots (e.g., nightly and workflow-completion) for review state and agent-run summaries to reduce expensive historical replay.
    - **Tiered retention:** hot (0–90 days, full OLTP indexing), warm (90 days–2 years, reduced index footprint), cold (2–7+ years archive with retrieval), with policy controls for legal hold and redaction.
    - **Partitioning:** PostgreSQL range partitioning by `event_time` (monthly default); optional tenant hash subpartitioning at extreme multi-tenant scale.
    - **Indexing baseline:** `(tenant_id, event_time desc)`, `(tenant_id, correlation_id)`, `(tenant_id, subject_type, subject_id, event_time desc)`, optional actor/event-type indexes; selective JSON indexing via generated columns + targeted GIN/`jsonb_path_ops`; BRIN on very large time partitions.
    - **Archival:** export aged partitions to Parquet (or compressed JSONL) with manifest (row counts, min/max time, checksums), store in object storage with integrity controls; maintain `archive_catalog` metadata in PostgreSQL.
    - **Archive query paths:** on-demand restore into temporary tables and/or federated query engines for long-range analytics without stressing OLTP.
    - **Agent-specific data governance:** separate long-retention `audit_events` from shorter-retention `agent_telemetry`; store prompt-template version, model/provider metadata, tool-call I/O (redacted where required), and deterministic `trace_id`.
5. **Extraction quality monitoring (SAD-aligned AD-12, resolved):** OCR fallback for scanned/low-quality PDFs is mandatory and will be implemented with a SOTA pipeline: **transcribe + structure + grounding**. Implementation requirements:
    - **Pipeline design:** confidence-gated routing from text-layer extraction to OCR fallback; preserve layout anchors/bounding boxes for reading-order reliability and hallucination reduction.
    - **Output-first model selection:** choose OCR models primarily by required downstream output format (DocTags/HTML for reconstruction, Markdown+captions for LLM QA, JSON for programmatic table/chart extraction).
    - **Model strategy:** maintain at least two OCR profiles (e.g., form-heavy and layout-heavy) to improve robustness across invoices/forms/scans/multilingual pages.
    - **Evaluation strategy:** use one public benchmark for sanity checks and a domain micro-benchmark (~50–200 real pages) scored on CER/WER, reading order, table structure accuracy, and field-level extraction accuracy.
    - **Deployment options:** support local OpenAI-compatible serving (e.g. vLLM) and a Transformers-based path for stricter formatting, post-processing hooks, and future fine-tuning.
    - **Scale-out path:** support batch OCR jobs for high-volume ingestion and define future upgrades for visual retrieval and direct document QA on complex layouts.

---

## Audit

```python
persona=backend-eng
action=align-code-vs-sad-backend
timestamp=2026-4-30
adapter=AAMAD-vscode
artifact=project-context/2.build/backend.md
version=0.4.0
status=complete
```
