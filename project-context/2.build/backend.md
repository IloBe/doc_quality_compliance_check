# Backend Implementation Documentation — Doc Quality Compliance Check

<!-- markdownlint-disable MD031 MD032 MD038 MD040 MD056 MD060 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.3.0  
**Date:** 2026-3-31  
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
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)
```

**Request logging middleware:**
Every HTTP request is logged with method, path, status code, and duration in milliseconds:
```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info("http_request", method=..., path=..., status=..., duration_ms=...)
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
| Request body | `ProductDomainInfo` — `domain_name`, `domain_description`, `uses_ai_ml: bool`, `intended_use` |
| Response | `ComplianceCheckResult` with risk level, role, 9 requirements, gaps, score |
| Framework | EU AI Act (Regulation (EU) 2024/1689) |

**`POST /api/v1/compliance/applicable-regulations`**

| Property | Value |
|----------|-------|
| Request body | `ProductDomainInfo` |
| Response | `list[str]` — names of applicable regulations detected |
| Frameworks | EU AI Act, MDR, GDPR, ISO 9001, ISO 27001, BSI Grundschutz |

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

---

## Section 4 – Service Layer

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

## Section 5 – Core Utilities

### 5.1 Configuration (`src/doc_quality/core/config.py`)

```python
class Settings(BaseSettings):
    app_name: str = "Doc Quality Compliance Check"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me-in-production"
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "console"
    max_file_size_mb: int = 10
    session_cookie_name: str = "dq_session"
    session_cookie_secure: bool = False
    global_rate_limit_enabled: bool = True
    global_rate_limit_requests: int = 240
    global_rate_limit_window_seconds: int = 60
    auth_login_rate_limit_count: int = 8
    auth_login_rate_limit_window_seconds: int = 300
    auth_login_lockout_seconds: int = 600
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"
    perplexity_api_key: str = ""
    perplexity_model: str = "sonar-pro"
    reports_output_dir: str = "reports"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

def get_settings() -> Settings:
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

**Phase 0:** Release gating is manual (`pytest tests/ -v` via local developer or CI orchestrator). The 30-test classical unit test suite + LLM unit tests must pass before release; integration tests are deferred to Phase 2.

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
action=develop-be
timestamp=2026-3-31
adapter=AAMAD-vscode
artifact=project-context/2.build/backend.md
version=0.3.0
status=complete
```
