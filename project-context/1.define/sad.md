# System Architecture Document (SAD) — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@system-arch`  
**Standard:** ISO/IEC/IEEE 42010:2022 — Architecture Description  
**AAMAD phase:** 1.define  

---

## Section 1 – MVP Architecture Philosophy & Principles

### 1.1 Guiding Principles

This architecture follows the **KISS principle** (Keep It Simple, Stupid) for MVP delivery, with explicit documented paths toward more complex architectures in subsequent phases.

| Principle | Application in This System |
|-----------|---------------------------|
| **KISS** | Synchronous service calls; no message queues; filesystem for report storage in MVP |
| **Single Responsibility** | Each service class/module has exactly one domain (analysis, compliance, generation, templates, workflow) |
| **Dependency Inversion** | Services receive typed Pydantic models, not raw strings or dicts |
| **Graceful Degradation** | LLM enrichment is optional; rule-based core is self-sufficient |
| **Security by Default** | bleach sanitisation, filename validation, and file size limits applied at API boundary, not deep in services |
| **Observability First** | structlog structured JSON logging in every service function, not just error paths |

### 1.2 Quality Model — ISO/IEC 25010:2023

The architecture is designed to satisfy the following ISO 25010 quality characteristics in priority order:

1. **Functional Suitability** — All PRD P0 requirements (F1–F7) are implemented and tested
2. **Security** — BSI Grundschutz baseline; GDPR-compliant logging; OWASP Top 10 mitigations
3. **Maintainability** — Full type hints, Pydantic v2 models, modular service layer, pytest suite
4. **Performance Efficiency** — <3s document analysis, <10s PDF generation (synchronous, single instance)
5. **Reliability** — Structured error handling; graceful LLM degradation; 100% test pass rate

### 1.3 EU AI Act Art. 11 as an Architectural Constraint

EU AI Act Art. 11 + Annex IV require that high-risk AI providers draw up technical documentation **before** placing the AI system on the market. This constraint directly shapes the architecture:

- arc42 completeness checking is the primary document analysis flow (not a secondary feature)
- The HITL workflow is a mandatory design element, not optional post-processing
- structlog JSON logs provide the Art. 12 logging capability requirement
- Generated PDF reports are designed for audit submission (not just internal use)
- The SOP templates directly map to Annex IV technical documentation sections

### 1.4 HITL as a Mandatory Design Constraint

Human-In-The-Loop review is treated as a **first-class architectural component**, not a UI affordance. This means:
- All AI-generated assessments produce a `ReviewRecord` object, not just a free-form result
- Review verdicts (`pass` | `modifications_needed`) are persisted with timestamps
- Modification requests are structured objects (`ModificationRequest`) with section, description, and priority — not free text
- The audit trail of review decisions is itself a compliance artefact for EU AI Act Art. 14

---

## Section 2 – Stakeholders and Concerns

| Stakeholder | Primary Concerns | Architectural Viewpoints |
|-------------|-----------------|-------------------------|
| **Quality Manager (Maria)** | Documents meet EU AI Act compliance standards; audit reports are downloadable PDF; HITL review trail is auditable | Functional, Process, Deployment |
| **System Architect (Jan)** | arc42 sections complete; UML diagrams present; modification requests are actionable | Functional, Logical |
| **Compliance Auditor (Elke)** | EU AI Act requirements correctly assessed; risk level classification is accurate; HITL trail demonstrates Art. 14 compliance | Functional, Data |
| **Developer / ML Engineer** | SOP templates provide clear guidance; modification requests are specific (section + priority + description) | Functional |
| **DevOps / Project Manager** | Deployment is simple (single `uvicorn` command); logging is structured; security is hardened; tests all pass | Deployment, Process |
| **Security Reviewer** | No secret storage in code; XSS prevented; filename validation; no PII in logs | Security (cross-cutting) |

---

## Section 3 – Architectural Views

### 3.1 Logical View

The system is decomposed into five logical layers:

```
┌─────────────────────────────────────────────────────────────┐
│                  Presentation Layer                          │
│           Frontend (HTML5 / CSS3 / Vanilla JS)              │
│   [Document Tab] [Compliance Tab] [Templates] [Reports]      │
│         fetch() → /api/v1/* endpoints                       │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP/REST (JSON)
┌─────────────────────────────▼───────────────────────────────┐
│                   API Layer (FastAPI)                        │
│  /api/v1/documents    /api/v1/compliance                     │
│  /api/v1/reports      /api/v1/templates                      │
│  Pydantic v2 request validation + response serialisation     │
│  bleach sanitisation + filename/size validation at boundary  │
└──────┬──────────────────┬──────────────┬────────────────────┘
       │                  │              │
┌──────▼──────┐  ┌────────▼──────┐  ┌───▼──────────────────┐
│  Document   │  │  Compliance   │  │  Template / Report    │
│  Analyzer   │  │  Checker      │  │  / HITL Services      │
│  Service    │  │  Service      │  │                       │
│             │  │               │  │  TemplateManager      │
│  analyze_   │  │  check_eu_    │  │  ReportGenerator      │
│  document() │  │  ai_act_      │  │  HitlWorkflow         │
│             │  │  compliance() │  │                       │
└──────┬──────┘  └────────┬──────┘  └───────────────────────┘
       │                  │
┌──────▼──────────────────▼──────────────────────────────────┐
│                  AI Agent Layer (Optional LLM)              │
│   DocumentCheckAgent          ComplianceCheckAgent          │
│   - wraps DocumentAnalyzer   - wraps ComplianceChecker      │
│   - optional Claude call     - optional Claude call         │
│   - structured prompt        - structured prompt            │
│   - result parsed to model   - result parsed to model       │
└─────────────────────────────────────────────────────────────┘
                              │
                    [Anthropic Claude API]
                    (optional; graceful fallback)
```

**Core module responsibilities:**

| Module | Responsibility |
|--------|---------------|
| `core/config.py` | `Settings` class via pydantic-settings; `get_settings()` singleton |
| `core/logging_config.py` | structlog JSON configuration; `get_logger()` factory |
| `core/security.py` | `sanitize_text()`, `validate_filename()`, `validate_file_size()` |
| `models/document.py` | `DocumentAnalysisResult`, `DocumentSection`, `DocumentType`, `DocumentStatus` |
| `models/compliance.py` | `ComplianceCheckResult`, `ComplianceRequirement`, `ProductDomainInfo`, `RiskLevel`, `AIActRole`, `ComplianceFramework` |
| `models/report.py` | `ReportResult`, `ReportMetadata` |
| `models/review.py` | `ReviewRecord`, `ModificationRequest`, `ReviewStatus`, `ReviewVerdict` |
| `services/document_analyzer.py` | `analyze_document()`, `analyze_arc42_document()`, `analyze_model_card()`, `detect_document_type()` |
| `services/compliance_checker.py` | `check_eu_ai_act_compliance()`, `determine_ai_act_risk_level()`, `detect_role()`, `get_applicable_regulations()` |
| `services/template_manager.py` | `list_templates()`, `get_template()`, `get_active_templates()` |
| `services/report_generator.py` | `generate_report()` (ReportLab PDF) |
| `services/hitl_workflow.py` | `create_review()`, `get_review()`, `update_review_status()`, `list_reviews()` |
| `agents/doc_check_agent.py` | `DocumentCheckAgent` — wraps service + optional Claude |
| `agents/compliance_agent.py` | `ComplianceCheckAgent` — wraps service + optional Claude |

### 3.2 Process / Runtime View

**Document Analysis Sequence:**

```
Client          DocumentsRouter    DocumentAnalyzerService    [ClaudeAPI]
  │                   │                       │                    │
  │ POST /analyze     │                       │                    │
  │──────────────────►│                       │                    │
  │                   │ sanitize_text()        │                    │
  │                   │ validate_filename()    │                    │
  │                   │──────────────────────►│                    │
  │                   │                       │ detect_document_   │
  │                   │                       │ type()             │
  │                   │                       │ _check_sections()  │
  │                   │                       │ (arc42 regex)      │
  │                   │                       │                    │
  │                   │                       │ [if API key set]   │
  │                   │                       │───────────────────►│
  │                   │                       │ Claude enrichment  │
  │                   │                       │◄───────────────────│
  │                   │◄──────────────────────│                    │
  │                   │  DocumentAnalysisResult                    │
  │◄──────────────────│                       │                    │
  │  JSON response    │                       │                    │
```

**EU AI Act Compliance Check Sequence:**

```
Client          ComplianceRouter   ComplianceCheckerService   [ClaudeAPI]
  │                   │                       │                    │
  │ POST /check/eu-ai-act                     │                    │
  │──────────────────►│                       │                    │
  │                   │ ProductDomainInfo      │                    │
  │                   │──────────────────────►│                    │
  │                   │                       │ determine_risk_    │
  │                   │                       │ level()            │
  │                   │                       │ detect_role()      │
  │                   │                       │ check requirements │
  │                   │                       │ (EUAIA-1..9)       │
  │                   │                       │                    │
  │                   │                       │ [if API key set]   │
  │                   │                       │───────────────────►│
  │                   │                       │ Claude enrichment  │
  │                   │                       │◄───────────────────│
  │                   │◄──────────────────────│                    │
  │                   │  ComplianceCheckResult │                    │
  │◄──────────────────│                       │                    │
  │  JSON response    │                       │                    │
```

**PDF Report Generation Sequence:**

```
Client          ReportsRouter      ReportGeneratorService    Filesystem
  │                   │                       │                   │
  │ POST /generate    │                       │                   │
  │──────────────────►│                       │                   │
  │                   │ ReportResult request  │                   │
  │                   │──────────────────────►│                   │
  │                   │                       │ ReportLab canvas  │
  │                   │                       │ Build PDF pages   │
  │                   │                       │ Save to reports/  │
  │                   │                       │──────────────────►│
  │                   │◄──────────────────────│                   │
  │                   │  ReportResult{id,path} │                  │
  │◄──────────────────│                       │                   │
  │  JSON {report_id} │                       │                   │
  │                   │                       │                   │
  │ GET /download/{id}│                       │                   │
  │──────────────────►│                       │                   │
  │                   │                       │ Read PDF file     │
  │                   │                       │◄──────────────────│
  │◄──────────────────│                       │                   │
  │  application/pdf  │                       │                   │
```

### 3.3 Deployment View

**MVP Deployment (single instance):**

```
┌──────────────────────────────────────────────────────────┐
│                   Host Machine (Linux/macOS/Windows)      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Python 3.11 Process (uvicorn)                     │  │
│  │                                                    │  │
│  │  FastAPI app (src/doc_quality/api/main.py)         │  │
│  │  Port: 8000                                        │  │
│  │                                                    │  │
│  │  Serves:                                           │  │
│  │   • /api/v1/*  (REST API)                         │  │
│  │   • /docs      (Swagger UI)                        │  │
│  │   • /health    (health check)                      │  │
│  │   • /          (StaticFiles → frontend/)           │  │
│  │                                                    │  │
│  │  ┌──────────────┐   ┌────────────────────────┐    │  │
│  │  │ templates/   │   │ reports/               │    │  │
│  │  │ sop/*.md     │   │ report_*.pdf           │    │  │
│  │  │ arc42/*.md   │   │ (generated at runtime) │    │  │
│  │  └──────────────┘   └────────────────────────┘    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  .env (optional)                                   │  │
│  │  ANTHROPIC_API_KEY=sk-ant-...                      │  │
│  │  LOG_LEVEL=INFO                                    │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬─────────────────────┘
                                     │ HTTPS (optional)
                              [Anthropic API]
                           (if ANTHROPIC_API_KEY set)
```

**Phase 2 Deployment (Docker Compose):**

```yaml
# Planned - not yet implemented
services:
  app:
    build: .
    ports: ["8000:8000"]
    volumes:
      - reports:/app/reports
      - ./templates:/app/templates:ro
    environment:
      - DATABASE_URL=sqlite:///app/data/reviews.db
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

### 3.4 Data View

**Core Pydantic v2 Data Models:**

```python
# Document Analysis
class DocumentType(str, Enum):
    ARC42 | MODEL_CARD | SOP | REQUIREMENTS | RISK_ASSESSMENT | UNKNOWN

class DocumentStatus(str, Enum):
    COMPLETE | PARTIAL | INCOMPLETE | INVALID

class DocumentSection(BaseModel):
    name: str
    present: bool
    content_snippet: str | None = None

class DocumentAnalysisResult(BaseModel):
    id: str                              # UUID
    document_type: DocumentType
    status: DocumentStatus
    sections: list[DocumentSection]      # Arc42: 12 sections; Model card: 9 sections
    uml_diagrams: list[str]             # Detected UML diagram types
    quality_score: float                 # 0.0–100.0
    issues: list[str]
    recommendations: list[str]
    analyzed_at: datetime

# Compliance
class RiskLevel(str, Enum):
    PROHIBITED | HIGH | LIMITED | MINIMAL

class AIActRole(str, Enum):
    PROVIDER | DEPLOYER | DISTRIBUTOR | IMPORTER | UNKNOWN

class ComplianceRequirement(BaseModel):
    id: str                              # EUAIA-1 through EUAIA-9
    title: str
    mandatory: bool
    description: str
    met: bool
    evidence: str | None = None
    gap_description: str | None = None

class ComplianceCheckResult(BaseModel):
    id: str                              # UUID
    framework: ComplianceFramework
    risk_level: RiskLevel
    role: AIActRole
    requirements: list[ComplianceRequirement]
    compliance_score: float              # 0.0–100.0
    gaps: list[str]
    met_requirements: list[str]
    applicable_regulations: list[str]
    checked_at: datetime

# HITL Review
class ReviewVerdict(str, Enum):
    PASS | MODIFICATIONS_NEEDED

class ReviewStatus(str, Enum):
    PENDING | IN_REVIEW | APPROVED | REJECTED | REVISION_REQUESTED

class ModificationRequest(BaseModel):
    section_name: str
    description: str
    priority: str                        # critical | high | medium | low

class ReviewRecord(BaseModel):
    id: str                              # UUID
    document_id: str
    reviewer_name: str
    verdict: ReviewVerdict
    modification_requests: list[ModificationRequest]
    status: ReviewStatus
    created_at: datetime
    updated_at: datetime

# Reports
class ReportResult(BaseModel):
    id: str                              # UUID
    file_path: str
    document_analysis_id: str | None
    compliance_check_id: str | None
    reviewer_name: str | None
    generated_at: datetime
```

---

## Section 4 – Quality Attributes

### 4.1 Quality Attribute Scenarios (ISO 25010)

| Quality Characteristic | Scenario | Measure | Implementation |
|----------------------|----------|---------|---------------|
| **Functional Suitability** | QM uploads arc42 doc → all 12 sections checked | 12/12 sections always evaluated | `ARC42_REQUIRED_SECTIONS` list, regex matching |
| **Functional Suitability** | EU AI Act compliance check → 9 requirements assessed | 9/9 requirements always evaluated | `EU_AI_ACT_REQUIREMENTS` list, deterministic rule engine |
| **Performance Efficiency** | Rule-based doc analysis completes | <3 seconds | Synchronous in-process; no I/O beyond text parsing |
| **Performance Efficiency** | PDF report generation completes | <10 seconds | ReportLab in-process; single-pass rendering |
| **Security** | User uploads malicious HTML/JS | Sanitised before processing | `bleach.clean()` at API boundary |
| **Security** | User submits malicious filename | Rejected with 400 | `validate_filename()` regex whitelist |
| **Security** | User uploads >10 MB file | Rejected with 413 | `validate_file_size()` enforcement |
| **Maintainability** | Developer adds new regulation | Adds dict to `EU_AI_ACT_REQUIREMENTS` | Data-driven requirements engine |
| **Maintainability** | Developer adds new arc42 section | Adds string to `ARC42_REQUIRED_SECTIONS` | Data-driven sections list |
| **Reliability** | Anthropic API unavailable | Falls back to rule-based without error | `try/except` around all Claude calls |
| **Reliability** | Service raises exception | Returns structured JSON error | FastAPI exception handlers |

---

## Section 5 – Architectural Decisions

| ID | Decision | Options Considered | Chosen Option | Rationale |
|----|----------|-------------------|--------------|-----------|
| **AD-1** | Backend framework | Flask, FastAPI, Django, Starlette | **FastAPI** | Async-native, Pydantic v2 native integration, automatic OpenAPI docs, type-checked route handlers, active ecosystem |
| **AD-2** | Data validation library | marshmallow, Pydantic v1, Pydantic v2, attrs | **Pydantic v2** | Type safety, FastAPI native, v2 performance improvements, strict mode available, field validators |
| **AD-3** | PDF generation | WeasyPrint, wkhtmltopdf, ReportLab, fpdf2 | **ReportLab** | Pure Python (no system-level dependencies), production-proven, rich layout control, no Chromium/Qt runtime required |
| **AD-4** | LLM integration model | Required dependency, optional dependency, not included | **Optional dependency** | KISS: rule-based core delivers compliance value without API key; Claude adds semantic depth when available; reduces adoption friction |
| **AD-5** | Storage backend | PostgreSQL, SQLite, Redis, filesystem | **Filesystem (MVP)** | Simplest for MVP: no DB setup, no ORM; reports/ directory for PDFs; in-memory dict for reviews; documented path to SQLite/PostgreSQL |
| **AD-6** | Input sanitisation | Custom regex, OWASP sanitiser, bleach, html.escape | **bleach** | Battle-tested, OWASP-aligned, configurable allow-lists, widely used in production; no custom security code |
| **AD-7** | Logging library | standard logging, loguru, structlog | **structlog** | JSON-structured output (required for EU AI Act Art. 12 logging compliance), processor pipeline, context binding |
| **AD-8** | Frontend framework | React, Vue, Angular, vanilla HTML/JS | **Vanilla HTML/CSS/JS** | KISS: no build toolchain, no npm, no bundler; tab navigation is simple enough for plain JS; reduces maintenance surface |
| **AD-9** | Configuration management | os.environ, python-dotenv, pydantic-settings | **pydantic-settings** | Type-safe settings, native Pydantic v2 integration, `.env` file support, validation on startup |
| **AD-10** | Testing framework | unittest, pytest, hypothesis | **pytest** | Industry standard, rich plugin ecosystem (pytest-asyncio, pytest-cov), cleaner test syntax |

---

## Section 6 – Risks and Technical Debt

### 6.1 Identified Risks

| Risk ID | Risk | Probability | Impact | Mitigation | Timeline |
|---------|------|-------------|--------|------------|----------|
| **R-1** | In-memory review store lost on restart | **HIGH** | **MEDIUM** | Document as known limitation; SQLite persistence in Phase 2 | Phase 2 |
| **R-2** | Anthropic API rate limits or outage | **MEDIUM** | **LOW** | Graceful fallback to rule-based implemented | Already mitigated |
| **R-3** | Large file (>10 MB) blocks event loop | **MEDIUM** | **MEDIUM** | 10 MB limit enforced; background tasks + streaming in Phase 2 | Phase 2 |
| **R-4** | No authentication on MVP | **MEDIUM** | **MEDIUM** | Document explicitly: MVP is internal-only deployment; auth in Phase 2 | Phase 2 |
| **R-5** | arc42 section detection false negatives | **MEDIUM** | **MEDIUM** | Regex patterns cover common heading styles; LLM enrichment covers non-standard headings | Ongoing |
| **R-6** | PDF file accumulation in reports/ dir | **LOW** | **LOW** | Manual cleanup; scheduled cleanup task in Phase 2 | Phase 2 |
| **R-7** | EU AI Act guidance updates requiring rule changes | **LOW** | **HIGH** | Requirements engine is data-driven (list of dicts); updates require only data changes | On guidance release |

### 6.2 Technical Debt

| Item | Debt Type | Impact | Payoff Plan |
|------|-----------|--------|-------------|
| In-memory HITL review store | Architecture | Reviews lost on restart | SQLite persistence, Phase 2 |
| No database layer | Architecture | No query/filter capability | SQLite → PostgreSQL, Phase 2–3 |
| No authentication | Security | Internal deployment only | OAuth2/API key, Phase 2 |
| No integration tests | Testing | Route-level bugs undetected | TestClient tests, Phase 2 |
| No CI/CD pipeline | Operations | Manual test/deploy | GitHub Actions, Phase 2 |
| No Docker image | Operations | Non-reproducible deployment | Dockerfile, Phase 2 |
| No file storage backend | Architecture | Reports stored on local FS | Object storage (S3/MinIO), Phase 3 |
| LLM prompt not version-controlled | Maintainability | Prompt drift | Prompt registry, Phase 2 |

---

## Section 7 – Constraints

### 7.1 Technical Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Python version | ≥3.11 | Required for `str | None` union syntax, `tomllib`, improved typing |
| Anthropic API key | Optional | Must work without it; LLM is enhancement only |
| EU AI Act Art. 9–15 | Must be checkable by rule-based engine | Legal requirement; no LLM dependency for compliance |
| PDF output | Must be audit-submission ready | EU AI Act evidence package requirement |
| File size limit | Configurable (default 10 MB) | Performance constraint; DoS prevention |
| Filesystem dependency | `reports/` and `templates/` directories | MVP simplicity; no external storage required |
| CORS | Restricted to explicit origins | Browser security requirement |

### 7.2 Business Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| MVP delivery | 6 weeks, 1 developer | Validated by AAMAD agentic tooling approach |
| No external cloud dependencies | All core functions work offline | Enterprise security requirements; no SaaS lock-in |
| No PII persistence | GDPR Art. 25 | No user data stored beyond session |
| Open source stack | All core dependencies are OSI-licensed | License compliance; no proprietary runtime |

---

## Section 8 – Traceability to PRD

| SAD Component | PRD Requirement(s) | Implementation |
|--------------|-------------------|---------------|
| `document_analyzer.py` | F1, F2, F3 | `analyze_document()`, `analyze_arc42_document()`, `analyze_model_card()` |
| `compliance_checker.py` | F4, F8 | `check_eu_ai_act_compliance()`, `get_applicable_regulations()` |
| `report_generator.py` | F5 | `generate_report()` → ReportLab PDF |
| `template_manager.py` | F6 | `list_templates()`, `get_template()` |
| `hitl_workflow.py` | F7 | `create_review()`, `update_review_status()` |
| `agents/doc_check_agent.py` | F9 | `DocumentCheckAgent` with optional Claude |
| `agents/compliance_agent.py` | F9 | `ComplianceCheckAgent` with optional Claude |
| `api/routes/documents.py` | F1 | POST /analyze, POST /upload |
| `api/routes/compliance.py` | F4, F7, F8 | POST /check/eu-ai-act, POST /applicable-regulations, POST/GET /review |
| `api/routes/reports.py` | F5 | POST /generate, GET /download/{id} |
| `api/routes/templates.py` | F6 | GET /templates/, GET /templates/{id} |
| `core/security.py` | NFR Security | `sanitize_text()`, `validate_filename()`, `validate_file_size()` |
| `core/logging_config.py` | NFR Security (Art. 12) | structlog JSON configuration |
| `frontend/` | F10 (partial), UX requirements | 4-tab dashboard, fetch() API integration |

---

## Sources

- ISO/IEC/IEEE 42010:2022 — Architecture Description Standard
- ISO/IEC 25010:2023 — Systems and Software Quality Model (SQuaRE)
- EU AI Act (Regulation (EU) 2024/1689), Arts. 9–15, 43, 72, Annex III, Annex IV
- arc42 Template v8.2, https://arc42.org
- BSI IT-Grundschutz-Kompendium, Bundesamt für Sicherheit in der Informationstechnik
- FastAPI Architecture Documentation, https://fastapi.tiangolo.com/tutorial/bigger-applications/
- Pydantic v2 Architecture, https://docs.pydantic.dev/latest/concepts/
- ReportLab Architecture Guide, https://www.reportlab.com/docs/
- structlog Documentation, https://www.structlog.org/en/stable/
- OWASP Top 10:2021, https://owasp.org/Top10/

---

## Assumptions

1. MVP is deployed as a single-instance service (no load balancer, no horizontal scaling).
2. arc42 documents are in markdown or plain text format; binary DOCX/PDF parsing is best-effort via PyPDF2/python-docx in Phase 2.
3. The rule-based compliance engine is deterministic for the same input; LLM enrichment may produce slightly different outputs across runs (non-deterministic by nature).
4. `reports/` directory is writable by the uvicorn process; filesystem persistence of PDFs is sufficient for MVP.
5. `templates/sop/` markdown files are static for MVP; template versioning is a Phase 2 concern.
6. CORS origins `localhost:3000` and `localhost:8000` are sufficient for MVP; production deployment behind a reverse proxy will require CORS origin update.
7. In-memory `_review_store: dict` in `hitl_workflow.py` is acceptable for MVP with documented risk (R-1 above).
8. The Anthropic Claude API client is initialised only when `ANTHROPIC_API_KEY` is set; no API calls are made without an explicit key.

---

## Open Questions

1. **Phase 2 storage:** SQLite (simpler) vs. PostgreSQL (production-ready) for review record persistence?
2. **Authentication strategy:** Which authentication model for Phase 2? OAuth2 with provider, API key, or LDAP/SAML for enterprise SSO?
3. **arc42 binary parsing:** When should `.docx` and binary `.pdf` arc42 parsing be added? (Candidate: Phase 2 via python-docx + PyPDF2)
4. **Agent orchestration:** Should Phase 2 introduce CrewAI or LangGraph for multi-agent orchestration, or continue with the current lightweight single-agent pattern?
5. **PDF digital signatures:** Should generated reports include pyhanko digital signatures for audit integrity?
6. **Horizontal scaling:** What triggers the move from single-instance to horizontally scaled deployment? (Candidate trigger: >50 documents/day)
7. **Template versioning:** How should SOP template updates be managed and communicated to document authors?

---

## Audit

```
persona=system-arch
action=create-sad
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/1.define/sad.md
version=0.1.0
status=complete
```
