# Backend Implementation Documentation — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@backend-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The backend is a Python 3.11 FastAPI application using a layered architecture:

```
API Routes → Service Layer → [AI Agent Layer (optional)] → [Anthropic Claude API (optional)]
```

All data flows through Pydantic v2 models. All service functions use full Python type hints. All operations are logged via structlog. User-supplied content is sanitised with bleach at the API boundary.

---

## Section 1 – Multi-Agent Architecture

The system implements a CrewAI-style multi-agent pattern with two specialised agents that wrap the service layer with optional LLM enrichment.

### DocumentCheckAgent (`src/doc_quality/agents/doc_check_agent.py`)

| Property | Value |
|----------|-------|
| **Role** | Document Quality Analyst |
| **Goal** | Analyse uploaded documents for structural completeness and quality gaps |
| **Backstory** | Expert in arc42 architecture documentation standards and model card requirements |
| **Tools** | `document_analyzer.py` service functions; optional Anthropic Claude call |
| **LLM enrichment** | When `ANTHROPIC_API_KEY` is set: sends document content to Claude with structured prompt requesting section analysis and gap identification; parses response into `DocumentAnalysisResult` supplement |

### ComplianceCheckAgent (`src/doc_quality/agents/compliance_agent.py`)

| Property | Value |
|----------|-------|
| **Role** | EU AI Act Compliance Specialist |
| **Goal** | Assess domain information against EU AI Act mandatory requirements |
| **Backstory** | Expert in EU AI Act Arts. 9–15, risk classification methodology, and provider/deployer role detection |
| **Tools** | `compliance_checker.py` service functions; optional Anthropic Claude call |
| **LLM enrichment** | When `ANTHROPIC_API_KEY` is set: sends domain description to Claude for nuanced requirement gap analysis; parses response into `ComplianceCheckResult` supplement |

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
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=False,
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

**Static file serving:**
```python
try:
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
except RuntimeError:
    pass  # Frontend directory not found; skip static serving
```

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
| Auth | None (MVP) |
| Security | `sanitize_text(content)`, `validate_filename(filename)` applied before processing |

**`POST /api/v1/documents/upload`**

| Property | Value |
|----------|-------|
| Request body | `multipart/form-data` — `file: UploadFile` |
| Supported formats | `.md`, `.txt`, `.pdf`, `.docx` (text extraction; binary parsing limited in MVP) |
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

**HITL Review Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/compliance/review` | POST | Create a new HITL review record |
| `/api/v1/compliance/review/{review_id}` | GET | Retrieve a review by ID |
| `/api/v1/compliance/review/{review_id}` | PUT | Update review status |
| `/api/v1/compliance/reviews` | GET | List all review records |

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

**In-memory store:** `_review_store: dict[str, ReviewRecord] = {}` — module-level dict. Data is lost on process restart (known MVP limitation).

**`create_review(document_id, reviewer_name, reviewer_role, modifications, comments) -> ReviewRecord`**

Creates a `ReviewRecord` with UUID. Status is automatically set:
- No modifications → `ReviewStatus.PASSED`
- With modifications → `ReviewStatus.MODIFICATIONS_NEEDED`
- `approval_date` set to `datetime.now(timezone.utc)` if PASSED

**`get_review(review_id: str) -> ReviewRecord | None`**

Simple dict lookup. Returns `None` if not found.

**`update_review_status(review_id: str, new_status: ReviewStatus, approver_name: str | None) -> ReviewRecord | None`**

Updates status in-place. Sets `approval_date` when status becomes `PASSED`. Returns `None` if review not found (logs warning).

**`list_reviews() -> list[ReviewRecord]`**

Returns all values from `_review_store` as a list.

---

## Section 5 – Core Utilities

### 5.1 Configuration (`src/doc_quality/core/config.py`)

```python
class Settings(BaseSettings):
    app_name: str = "Doc Quality Compliance Check"
    app_version: str = "0.1.0"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"
    log_format: str = "json"
    max_file_size_mb: int = 10
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-3-haiku-20240307"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

`get_settings()` is cached via `@lru_cache` — only one `Settings` instance per process.

### 5.2 Structured Logging (`src/doc_quality/core/logging_config.py`)

```python
def configure_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer() if log_format == "json"
            else structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
    )

def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)
```

Every service function logs at key decision points: function entry with input IDs, analysis completion with scores, errors with full context. Log fields never contain user-submitted PII.

### 5.3 Security (`src/doc_quality/core/security.py`)

**`sanitize_text(text: str) -> str`**

```python
def sanitize_text(text: str) -> str:
    return bleach.clean(text, tags=[], attributes={}, strip=True)
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

Whitelist regex: alphanumeric, hyphens, dots, underscores, spaces. Rejects path traversal characters (`../`, `\`, etc.). Raises `ValueError` → converted to HTTP 400 by route handler.

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
| No global mutable state | Except `_review_store` in `hitl_workflow.py` (documented known limitation) |
| Enum types | `DocumentType`, `DocumentStatus`, `RiskLevel`, `AIActRole`, `ReviewStatus` |
| `@lru_cache` | `get_settings()` — single Settings instance per process |

---

## Section 7 – Known Limitations (Non-MVP Stubs)

### 7.1 In-Memory Review Store

The HITL review store (`_review_store` dict in `hitl_workflow.py`) is ephemeral. All review records are lost when the process restarts. This is acceptable for MVP (internal use, development) but must be replaced with SQLite persistence in Phase 2.

**Impact:** A QM reviewer who approves a document and then the server restarts loses the review record. The PDF report (if already generated and downloaded) persists on the filesystem.

### 7.2 No Authentication

All API endpoints are publicly accessible (no auth middleware). This is acceptable for MVP internal deployment only. Phase 2 will add OAuth2 or API key authentication.

**Impact:** Any user on the local network can access the API and generate reports. Mitigation: bind to `localhost` (default) rather than `0.0.0.0`.

### 7.3 Optional LLM Enrichment — Graceful Degradation

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

### 7.4 Binary Document Parsing

`.docx` (python-docx) and binary `.pdf` (PyPDF2) parsing is installed but only partially active in MVP. Uploaded `.docx` and `.pdf` files are read as bytes and decoded as UTF-8 text (or latin-1 fallback). For markdown and plain text files this works fully. For binary Office documents the text extraction may be incomplete.

**Phase 2:** Full binary document text extraction using python-docx and PyPDF2 pipelines.

### 7.5 No CI/CD Pipeline

Tests must be run manually (`pytest tests/ -v`). No GitHub Actions workflow exists yet. Phase 2 will add a CI pipeline with pytest, ruff, and mypy checks on every push.

---

## Sources

- FastAPI Documentation — Application Factory Pattern, https://fastapi.tiangolo.com
- Pydantic v2 — BaseModel, BaseSettings, https://docs.pydantic.dev/latest/
- structlog — Processors and Configuration, https://www.structlog.org
- bleach — `clean()` API, https://bleach.readthedocs.io
- ReportLab Platypus — SimpleDocTemplate, Table, TableStyle, https://www.reportlab.com/docs/
- EU AI Act Arts. 9–15, Annex III, Annex IV (Regulation (EU) 2024/1689)
- arc42 Template v8.2, https://arc42.org
- Anthropic Python SDK, https://github.com/anthropics/anthropic-sdk-python

---

## Assumptions

1. The service layer is stateless except for `_review_store` (documented). Services can be called directly in tests without mocking the FastAPI request context.
2. `get_settings()` returns a cached `Settings` instance; tests that need custom settings must clear the LRU cache or use dependency injection override.
3. Pydantic v2 strict mode is not enabled globally; field validators use lenient coercion by default.
4. The `reports/` directory is created by `report_generator.py` if it does not exist; no pre-creation step is required in deployment.
5. Claude API calls use the model specified by `ANTHROPIC_MODEL` (default: `claude-3-haiku-20240307`); other Claude models are interchangeable.
6. All datetime objects use `timezone.utc` to avoid timezone-naive comparison issues.

---

## Open Questions

1. **Background tasks:** When should FastAPI `BackgroundTasks` be introduced for large document processing? (Proposed: Phase 2, triggered when file size >1 MB)
2. **Agent orchestration:** Should Phase 2 introduce CrewAI or LangGraph for multi-agent task coordination, or remain with the current single-agent wrapper pattern?
3. **Prompt version control:** Should Claude prompts be stored as versioned files in `prompts/` directory, or remain as inline strings in agent code?
4. **Review store:** SQLite (simple, no extra deps) vs. PostgreSQL (production-ready) for Phase 2 persistence?
5. **DOCX/PDF parsing quality:** Should Phase 2 use Apache Tika (via tika-python) instead of python-docx + PyPDF2 for more robust text extraction?

---

## Audit

```
persona=backend-eng
action=develop-be
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/2.build/backend.md
version=0.1.0
status=complete
```
