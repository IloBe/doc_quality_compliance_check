# Product Requirements Document (PRD) — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@product-mgr`  
**AAMAD phase:** 1.define  

---

## Section 1 – Executive Summary

### Problem Statement

Quality Management teams in EU companies developing or deploying high-risk AI systems face a critical, legally mandated challenge: ensuring all technical documentation meets both structural completeness requirements (arc42 architecture documentation standard) and regulatory compliance requirements (EU AI Act Arts. 9–15, Annex IV). Today, this process is entirely manual:

- A QM representative manually cross-checks a 12-section arc42 document against an EU AI Act checklist
- This takes 8–20 hours per document
- The review trail is scattered across emails, spreadsheets, and Word documents
- Generated evidence packages are not consistently formatted or audit-ready
- No structured workflow exists to communicate gap-filling assignments back to the document author

The consequences of inadequate documentation are severe: EU AI Act non-compliance fines up to €35M or 7% of global turnover, delayed conformity assessments, and failed notified-body audits.

### Solution

An AI-assisted document quality and compliance check system built on Python 3.11 + FastAPI, providing:

1. **Automated document analysis:** Checks arc42 architecture documents (12 required sections + UML diagrams) and model cards (9 required sections + EU AI Act fields) for completeness
2. **EU AI Act compliance assessment:** Evaluates documents against all 9 mandatory requirements (Art. 9–15, Art. 43, Art. 72), classifies AI system risk level, and detects provider/deployer role
3. **PDF audit reports:** Generates downloadable, submission-ready PDF reports with section checklist, compliance scores, gaps, and recommendations
4. **SOP template management:** Provides 6 active Standard Operating Procedure templates aligned to EU AI Act and arc42 requirements
5. **HITL review workflow:** Structured Human-In-The-Loop review with pass/fail verdicts and actionable modification requests
6. **Optional LLM enrichment:** Anthropic Claude integration for semantic gap analysis beyond rule-based keyword matching

### Strategic Rationale

- **Regulatory urgency:** EU AI Act full enforcement (August 2026) creates a non-deferrable compliance deadline
- **Market gap:** No competitor offers the combination of arc42 structural checking + EU AI Act compliance + SOP templates + HITL workflow in a single integrated tool
- **Multi-agent architecture:** Parallel DocumentCheckAgent and ComplianceCheckAgent enable independent, composable analysis that can be extended with additional agents (MDR agent, GDPR agent) without modifying the core services
- **MVP delivery timeline:** One experienced developer using VS Code + GitHub Copilot + AAMAD can deliver the complete MVP in 6 weeks, validating the concept before larger investment

---

## Section 2 – Market Context & User Analysis

### 2.1 Primary User Personas

**Persona 1: QM Lead — Maria (42)**

| Attribute | Detail |
|-----------|--------|
| Role | Quality Management Lead, EU medical device AI company |
| Technical level | Business-technical (understands EU AI Act, arc42 structure; does not write code) |
| Primary goal | Ensure documentation meets EU AI Act + MDR requirements before conformity assessment |
| Secondary goal | Maintain audit trail of all review decisions |
| Pain points | Manual cross-checking takes 8–20h per doc; no structured modification workflow; audit trail in email |
| Key workflows | Upload doc → gap report → assign modifications → approve → download PDF |
| Success criteria | Generates audit-ready PDF in <5 minutes for any uploaded document |

**Persona 2: SW Architect — Jan (35)**

| Attribute | Detail |
|-----------|--------|
| Role | System/Software Architect responsible for arc42 documentation |
| Technical level | High (writes code, familiar with arc42; not a compliance expert) |
| Primary goal | Know which sections are missing before QM review; get actionable modification requests |
| Secondary goal | Access SOP templates to understand what content is required in each section |
| Pain points | Does not know EU AI Act requirements; review cycles slow; no visibility into QM checklist |
| Key workflows | Browse SOP templates → fill in arc42 → receive modification requests → revise |
| Success criteria | Receives specific, actionable modification requests with section + priority + description |

**Persona 3: Compliance Auditor — Elke (51)**

| Attribute | Detail |
|-----------|--------|
| Role | External notified body auditor / internal audit function |
| Technical level | Compliance specialist (EU AI Act expert; not an arc42 expert) |
| Primary goal | Receive complete, auditable evidence package for conformity assessment |
| Secondary goal | Verify HITL review trail demonstrates human oversight per EU AI Act Art. 14 |
| Pain points | Incomplete documentation packages; no consistent formatting; no audit trail |
| Key workflows | Receive PDF report → verify compliance scores → validate HITL review records |
| Success criteria | PDF report clearly maps each EU AI Act requirement to document evidence |

### 2.2 Competitive Landscape

| Solution Type | Examples | QM adoption | Technical depth | EU AI Act | HITL workflow | arc42 check |
|---------------|----------|-------------|----------------|-----------|---------------|-------------|
| Legal compliance SaaS | OneTrust | High | Low | Partial | No | No |
| Static checklists | Excel/PDF | High | None | Manual | No | No |
| Generic doc linters | Vale, textlint | Low | Medium | No | No | No |
| AI governance platforms | Credo AI, Arthur | Low | High | Partial | No | No |
| **This product** | Doc Quality Check | Target | High | Full (9 req.) | Yes | Yes (12 sec.) |

### 2.3 User Journey Map

```
[Maria - QM Lead]
DISCOVER → UPLOAD → ANALYZE → REVIEW → ASSIGN → APPROVE → REPORT
  │           │         │         │         │          │        │
  │           │     Gap report   HITL    Mod.req.  HITL pass  PDF
  │           │     in <3s      verdict  to Jan    recorded  download
  │           │
  └── First visit: browses Templates tab to understand what docs are needed

[Jan - SW Architect]
DISCOVER → DOWNLOAD SOP → FILL IN → SUBMIT → REVISE → RESUBMIT
  │               │             │        │       │          │
  │          arc42 template   arc42 doc  QM    Mod.req.   Approved
  │          from Templates     ready   review  received
  │          tab
  │
  └── Guided by structured SOP templates aligned to EU AI Act

[Elke - Compliance Auditor]
RECEIVE PDF → REVIEW SCORES → CHECK HITL TRAIL → VERIFY COVERAGE → ACCEPT/REJECT
      │               │               │                  │                │
   Offline         Section          Review              EU AI Act        Audit
   submission      checklist        timestamps          Art. 14          decision
                   visible          visible             evidence
```

---

## Section 3 – Technical Requirements & Architecture

### 3.1 Multi-Agent Architecture

The system uses a CrewAI-style multi-agent architecture where specialised agents are responsible for distinct analysis domains:

**DocumentCheckAgent**
- **Role:** Document Quality Analyst
- **Goal:** Analyse uploaded documents for structural completeness and quality
- **Backstory:** Expert in arc42 architecture documentation and model card standards
- **Tools:** Document content reader, section pattern matcher, UML diagram detector
- **LLM enrichment (optional):** Anthropic Claude for semantic gap analysis beyond keyword matching

**ComplianceCheckAgent**
- **Role:** EU AI Act Compliance Specialist
- **Goal:** Assess documents against EU AI Act mandatory requirements
- **Backstory:** Expert in EU AI Act Arts. 9–15, risk classification, role detection
- **Tools:** Regulation requirement matcher, risk level classifier, applicable-regulations detector
- **LLM enrichment (optional):** Anthropic Claude for nuanced requirement interpretation

### 3.2 Service Layer Architecture

```
src/doc_quality/
  core/
    config.py           — pydantic-settings (Settings class, get_settings)
    logging_config.py   — structlog JSON configuration
    security.py         — bleach sanitisation, filename validation, file size limits
  models/
    document.py         — DocumentAnalysisResult, DocumentSection, DocumentType, DocumentStatus
    compliance.py       — ComplianceCheckResult, ComplianceRequirement, ProductDomainInfo,
                          RiskLevel, AIActRole, ComplianceFramework
    report.py           — ReportResult, ReportMetadata
    review.py           — ReviewRecord, ModificationRequest, ReviewStatus, ReviewVerdict
  services/
    document_analyzer.py    — analyze_document, analyze_arc42_document, analyze_model_card,
                               detect_document_type, _check_sections
    compliance_checker.py   — check_eu_ai_act_compliance, determine_ai_act_risk_level,
                               detect_role, get_applicable_regulations
    template_manager.py     — list_templates, get_template, get_active_templates
    report_generator.py     — generate_report (PDF via ReportLab)
    hitl_workflow.py        — create_review, get_review, update_review_status,
                               list_reviews
  agents/
    doc_check_agent.py      — DocumentCheckAgent (wraps document_analyzer + optional Claude)
    compliance_agent.py     — ComplianceCheckAgent (wraps compliance_checker + optional Claude)
  api/
    main.py                 — FastAPI app creation, lifespan, CORS, request logging
    routes/
      documents.py          — /api/v1/documents endpoints
      compliance.py         — /api/v1/compliance endpoints
      reports.py            — /api/v1/reports endpoints
      templates.py          — /api/v1/templates endpoints
```

### 3.3 Integration Architecture

```
Frontend (HTML/CSS/JS)
    │ fetch() API calls
    ▼
FastAPI (uvicorn)
    │ Pydantic v2 request/response validation
    ├── DocumentRouter → DocumentAnalyzerService → [DocCheckAgent (optional LLM)]
    ├── ComplianceRouter → ComplianceCheckerService → [ComplianceAgent (optional LLM)]
    ├── ReportsRouter → ReportGeneratorService → ReportLab → PDF file
    └── TemplatesRouter → TemplateManagerService → filesystem
```

### 3.4 Security Requirements

| Requirement | Implementation | Standard |
|-------------|---------------|----------|
| XSS prevention | `bleach.clean()` on all user text inputs | OWASP Top 10 A03 |
| Path traversal prevention | `validate_filename()` regex whitelist | OWASP Top 10 A01 |
| File size limits | `validate_file_size()` enforcement | DoS prevention |
| No PII in logs | structlog event field sanitisation | GDPR Art. 25 |
| CORS restriction | Explicit allowed origins list | Browser security |
| Input length limits | Pydantic field validators | Injection prevention |

---

## Section 4 – Functional Requirements

### Priority Definitions
- **P0 (MVP, must-have):** Required for 6-week MVP delivery
- **P1 (Enhanced, should-have):** Second milestone priority
- **P2 (Future, could-have):** Backlog, not committed

### P0 — MVP Requirements

**F1: Document Upload and Analysis**
- Accept file upload (PDF, DOCX, MD, TXT) via `POST /api/v1/documents/upload`
- Accept text content directly via `POST /api/v1/documents/analyze`
- Auto-detect document type (arc42, model card, SOP, requirements, risk assessment)
- Return `DocumentAnalysisResult` with: document type, sections found/missing, UML diagrams detected, quality score, issues list, recommendations list
- File size limit: configurable (default 10 MB)
- Filename validation: alphanumeric + dots/hyphens/underscores only
- All text content sanitised with bleach before processing

**F2: arc42 Compliance Check**
- Check for all 12 required arc42 sections by name pattern matching (case-insensitive)
- Detect presence of UML diagram types (system context, component, sequence, class, deployment)
- Calculate completeness score: `sections_found / 12 * 100`
- Return status: `complete` (all 12 present) | `partial` (some missing) | `incomplete` (<50% present) | `invalid`
- List missing sections with specific, actionable recommendations per missing section

**F3: Model Card Compliance Check**
- Check for all 9 required model card sections
- Flag EU AI Act-specific fields: intended use, limitations, ethical considerations, training data
- Return completeness score and missing sections
- Detect model card document type from content/filename heuristics

**F4: EU AI Act Compliance Assessment**
- Evaluate document against all 9 mandatory EU AI Act requirements (EUAIA-1 through EUAIA-9)
- Classify AI system risk level: `prohibited` | `high` | `limited` | `minimal`
- Detect role: `provider` | `deployer` | `distributor` | `importer` | `unknown`
- Return gap list (requirements not met) and met list (requirements evidenced in document)
- Use `ProductDomainInfo` input: domain name, description, uses_ai_ml flag, intended_use
- Risk classification based on domain keywords matching EU AI Act Annex III categories

**F5: PDF Report Generation**
- Generate PDF via ReportLab from `DocumentAnalysisResult` + `ComplianceCheckResult`
- Report includes: title page, document metadata, section checklist, compliance score, gaps list, recommendations, reviewer information (if HITL completed)
- `POST /api/v1/reports/generate` → returns `ReportResult` with report ID and file path
- `GET /api/v1/reports/download/{report_id}` → returns PDF as `application/pdf`
- Reports stored in `reports/` directory on filesystem

**F6: SOP Template Management**
- `GET /api/v1/templates/` → list all templates with metadata (ID, title, category, status, description)
- `GET /api/v1/templates/{template_id}` → return template content (markdown text) + metadata
- 6 active templates: `business_goals`, `stakeholders`, `architecture`, `quality_requirements`, `risk_assessment`, `glossary`
- Inactive templates return placeholder content explaining why they are not yet active
- Templates loaded from `templates/sop/` filesystem directory

**F7: HITL Review Workflow**
- `POST /api/v1/compliance/review` → create review record (reviewer name, verdict, modification requests)
- `GET /api/v1/compliance/review/{review_id}` → get review record
- `PUT /api/v1/compliance/review/{review_id}` → update review status
- `GET /api/v1/compliance/reviews` → list all reviews
- Verdicts: `pass` | `modifications_needed`
- Modification requests: structured objects with `section_name`, `description`, `priority` (critical/high/medium/low)
- Review records include: ID, reviewer name, document ID, verdict, timestamp, modification requests, status

### P1 — Enhanced Requirements

**F8: Domain-Specific Regulation Detection**
- `POST /api/v1/compliance/applicable-regulations` → detect which regulations apply based on domain info
- Support: EU AI Act (mandatory if AI/ML), MDR (medical devices), GDPR (personal data), ISO 9001 (quality management), ISO 27001 (information security), BSI Grundschutz
- Return prioritised list of applicable regulations with brief rationale

**F9: LLM-Enriched Analysis**
- Optional Anthropic Claude integration (activated by `ANTHROPIC_API_KEY` environment variable)
- When enabled: agents use Claude for semantic gap detection beyond keyword matching
- When disabled: graceful fallback to rule-based analysis only
- Structured prompt templates for arc42 analysis and EU AI Act assessment
- Response parsing into standard `DocumentAnalysisResult` / `ComplianceCheckResult` models

**F10: Dashboard with Review History**
- Frontend Reports tab displays review history (reviewer, document, verdict, timestamp)
- Status tracking: `pending` | `in_review` | `approved` | `rejected` | `revision_requested`
- Searchable/filterable review list

### P2 — Future Requirements

**F11: Additional Document Types**
- Requirements specification documents (IEEE 830 / ISO 29148 sections)
- Test strategy documents (ISO 29119 sections)
- Deployment architecture documents

**F12: Multi-User Authentication**
- OAuth2 / API key authentication
- Role-based access: QM Lead (full access), Architect (submit docs, view own reviews), Auditor (read-only PDF access)

**F13: Database Persistence**
- SQLite (Phase 2) → PostgreSQL (Phase 3) for review records and report metadata
- Configurable via `DATABASE_URL` environment variable
- Migration path from in-memory to database transparent to service layer

---

## Section 5 – Non-Functional Requirements

### 5.1 Performance

| Metric | Target | Current Implementation |
|--------|--------|----------------------|
| Document analysis (rule-based) | <3 seconds | In-process synchronous, typically <500ms |
| PDF report generation | <10 seconds | ReportLab synchronous, typically 1–3s |
| EU AI Act compliance check | <2 seconds | In-process synchronous, typically <200ms |
| LLM-enriched analysis (optional) | <30 seconds | Anthropic API latency dependent |
| Template listing | <100ms | In-memory + filesystem read |

### 5.2 Security

| Requirement | Implementation |
|-------------|---------------|
| OWASP Top 10 A03 (Injection) | bleach XSS sanitisation, parameterised models |
| OWASP Top 10 A01 (Broken Access Control) | Filename whitelist regex |
| BSI Grundschutz baseline | No secret storage in code, structured logging, input validation |
| GDPR Art. 25 (Privacy by design) | No PII in log output; no user data persistence in MVP |
| TLS in production | Recommended via reverse proxy (nginx); not in scope for MVP |

### 5.3 Availability and Reliability

| Metric | Target |
|--------|--------|
| Availability (single instance) | 99% (no HA in MVP) |
| Data durability (reviews) | Non-persistent in MVP; SQLite in Phase 2 |
| Error handling | All service exceptions return structured JSON error responses |
| Graceful degradation | LLM enrichment failure falls back to rule-based without error |

### 5.4 Maintainability

- Full Python type hints throughout all modules
- Pydantic v2 for all data models (no raw dicts in service layer)
- structlog for all logging (no `print()` statements)
- Services are pure functions or minimal-state classes; no global mutable state
- pytest test suite with 30 unit tests, all passing

---

## Section 6 – UX Design Requirements

### 6.1 Tab-Based Dashboard Layout

```
┌────────────────────────────────────────────────────────────┐
│  Doc Quality & Compliance Check          v0.1.0            │
├────────────────────────────────────────────────────────────┤
│  [Document Analysis] [Compliance Check] [Templates] [Reports]│
├────────────────────────────────────────────────────────────┤
│                      Tab Content Area                       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Document Analysis Tab

- **Input area:** File upload button (accepts .md, .txt, .pdf, .docx) + freeform text area for paste
- **Document type selector:** Auto-detect or manual override (arc42, model card, SOP)
- **Results panel:** Section checklist table (section name | found/missing | status icon), quality score badge, issues list, recommendations list
- **Loading state:** Spinner while waiting for analysis response
- **Error state:** Inline error message with HTTP status and detail

### 6.3 Compliance Check Tab

- **Input form:** Domain name, domain description, uses AI/ML checkbox (yes/no), intended use text area
- **Results panel:** Risk level badge (colour-coded: red=high, orange=limited, green=minimal), role badge (provider/deployer), requirements table (ID | title | met/gap | description), gap list, met requirements list
- **Applicable regulations:** Expandable section showing detected applicable frameworks

### 6.4 Templates Tab

- **Template grid:** Card layout with template title, category, status badge (active/inactive), brief description
- **Template detail modal:** Full markdown content rendered in modal, download button
- **Active/inactive distinction:** Inactive templates show placeholder content and "Coming soon" indicator

### 6.5 Reports Tab

- **Generate report form:** Document ID input + compliance check ID input
- **Download button:** Opens PDF in new tab or triggers download
- **Review history table:** Review ID | Document | Reviewer | Verdict | Timestamp | Status (Phase 2 full implementation)

### 6.6 API Access

- JSON API available for all endpoints (Content-Type: application/json)
- Interactive API documentation at `/docs` (FastAPI Swagger UI)
- Alternative docs at `/redoc`

---

## Section 7 – Success Metrics & KPIs

### 7.1 Business Metrics

| KPI | Target | Measurement |
|-----|--------|-------------|
| EU AI Act requirements coverage | 100% (9/9 requirements checkable) | Manual verification of EUAIA-1 through EUAIA-9 |
| Time from upload to report | <5 minutes | End-to-end timing test |
| SOP templates active | 6/6 | Template listing API check |
| HITL workflow completeness | Pass + Modifications verdicts both working | Test both verdict paths |

### 7.2 Technical Metrics

| KPI | Target | Current Status |
|-----|--------|---------------|
| Unit test count | ≥30 | 30 tests passing ✅ |
| Test pass rate | 100% | 100% ✅ |
| CodeQL security alerts | 0 critical | 0 ✅ |
| Code review comments | 0 blocking | 0 ✅ |
| Python type coverage | Full hints in all modules | Implemented ✅ |
| Pydantic v2 models | All data models use Pydantic v2 | Implemented ✅ |

### 7.3 User Metrics (Post-MVP)

| KPI | Target | Measurement Method |
|-----|--------|--------------------|
| QM staff adoption rate | ≥2 QM users in first month | Usage logging |
| Time savings per document review | >80% reduction vs manual | User interview |
| False negative rate (missed sections) | <5% | Expert annotation benchmark |
| Review completion rate | >90% of submitted docs reviewed | HITL workflow metrics |

---

## Section 8 – Implementation Strategy

### Phase 1 (Weeks 1–2): Core Document Analysis

**Deliverables:**
- `src/doc_quality/core/` — config, logging, security
- `src/doc_quality/models/document.py` — DocumentAnalysisResult, DocumentType
- `src/doc_quality/services/document_analyzer.py` — analyze_arc42_document, detect_document_type
- `src/doc_quality/api/routes/documents.py` — POST /analyze, POST /upload
- Unit tests: test_document_analyzer.py (7 tests)

**Success criteria:** `POST /api/v1/documents/analyze` returns section checklist for an arc42 document

### Phase 2 (Weeks 3–4): EU AI Act Checker + PDF Reports

**Deliverables:**
- `src/doc_quality/models/compliance.py` — ComplianceCheckResult, RiskLevel, AIActRole
- `src/doc_quality/services/compliance_checker.py` — check_eu_ai_act_compliance
- `src/doc_quality/models/report.py` — ReportResult
- `src/doc_quality/services/report_generator.py` — PDF generation via ReportLab
- `src/doc_quality/api/routes/compliance.py` — POST /check/eu-ai-act, POST /applicable-regulations
- `src/doc_quality/api/routes/reports.py` — POST /generate, GET /download/{id}
- Unit tests: test_compliance_checker.py (6 tests), test_report_generator.py (3 tests)

**Success criteria:** Full round-trip from domain info → compliance check → PDF report download

### Phase 3 (Weeks 5–6): SOP Templates + HITL + Frontend

**Deliverables:**
- `templates/sop/` — 6 SOP markdown files
- `src/doc_quality/services/template_manager.py` — list/get templates
- `src/doc_quality/models/review.py` — ReviewRecord, ModificationRequest
- `src/doc_quality/services/hitl_workflow.py` — create/get/update/list reviews
- `src/doc_quality/api/routes/templates.py` — GET /templates/, GET /templates/{id}
- `frontend/` — HTML/CSS/JS dashboard (4 tabs)
- Unit tests: test_template_manager.py (8 tests), test_hitl_workflow.py (6 tests)
- AI agents: `src/doc_quality/agents/` — DocCheckAgent, ComplianceAgent

**Success criteria:** Full frontend dashboard working; 30 tests passing; HITL workflow complete

---

## Section 9 – QA Checklist

### Architecture & Design

- [x] FastAPI + Pydantic v2 architecture chosen and documented (SAD)
- [x] All data models defined as Pydantic v2 classes (no raw dicts in API)
- [x] Service layer separated from API layer (routes call services, not business logic inline)
- [x] Agent layer wraps services (agents call services, not API routes)
- [x] Optional LLM dependency: code works without `ANTHROPIC_API_KEY`

### Security

- [x] bleach sanitisation applied to all user text inputs
- [x] Filename validation regex prevents path traversal
- [x] File size limits enforced before content processing
- [x] No secrets in source code
- [x] CORS restricted to explicit allowed origins
- [x] No PII in structured log output

### Testing

- [x] Unit tests for document_analyzer.py (7 tests)
- [x] Unit tests for compliance_checker.py (6 tests)
- [x] Unit tests for hitl_workflow.py (6 tests)
- [x] Unit tests for report_generator.py (3 tests)
- [x] Unit tests for template_manager.py (8 tests)
- [x] All 30 tests pass with 0 failures
- [ ] Integration tests (FastAPI TestClient) — deferred to Phase 2
- [ ] Performance/load tests — deferred to Phase 2
- [ ] End-to-end PDF download flow test — deferred to Phase 2

### Documentation

- [x] MRD created (`project-context/1.define/market-research-document.md`)
- [x] PRD created (`project-context/1.define/product-requirements-document.md`)
- [x] SAD created (`project-context/1.define/sad.md`)
- [x] Setup documentation (`project-context/2.build/setup.md`)
- [x] Backend documentation (`project-context/2.build/backend.md`)
- [x] Frontend documentation (`project-context/2.build/frontend.md`)
- [x] Integration documentation (`project-context/2.build/integration.md`)
- [x] QA documentation (`project-context/2.build/qa.md`)

### Compliance

- [x] All 9 EU AI Act requirements (EUAIA-1 through EUAIA-9) implemented in checker
- [x] All 12 arc42 sections implemented in checker
- [x] All 6 SOP templates active and downloadable
- [x] HITL review workflow with structured modification requests
- [x] PDF reports with audit trail information

---

## Sources

- EU AI Act (Regulation (EU) 2024/1689), Official Journal of the EU, 12 July 2024, Arts. 9–15, 43, 72, 99, Annex III, Annex IV
- arc42 Template v8.2 Specification, Gernot Starke & Peter Hruschka, https://arc42.org
- Model Card for Model Reporting, Mitchell et al. (2019), ACM FAccT
- ISO/IEC 25010:2023 — Systems and Software Quality Requirements and Evaluation (SQuaRE)
- FastAPI Documentation v0.109+, https://fastapi.tiangolo.com
- Pydantic v2 Documentation, https://docs.pydantic.dev/latest/
- ReportLab User Guide v4.x, https://www.reportlab.com/docs/
- structlog Documentation, https://www.structlog.org/en/stable/
- bleach Documentation, https://bleach.readthedocs.io/en/latest/
- Anthropic Claude API Documentation, https://docs.anthropic.com/en/api/

---

## Assumptions

1. EU AI Act Art. 9–15 requirements are stable from August 2026 enforcement; minor guidance changes are handled via requirements engine updates.
2. arc42 v8.2 is the reference template; organisations using customised arc42 may have reduced detection accuracy for renamed sections.
3. Model card format follows the Mitchell et al. (2019) 9-section structure; Hugging Face model card extensions are not in scope for MVP.
4. HITL review records are acceptable as ephemeral (in-memory) for MVP; production deployment requires database persistence.
5. PDF reports generated by ReportLab are acceptable for audit submission without a digital signature (electronic signature support is out of scope for MVP).
6. The system handles text-based documents; binary/encrypted PDFs and scanned image documents are out of scope.
7. "Optional LLM enrichment" means the API key may be absent; when present, Claude enrichment runs automatically without additional user action.
8. The 30-test unit test suite represents all automated tests for MVP; integration and E2E tests are backlog items.

---

## Open Questions

1. **arc42 section detection accuracy:** What is the agreed false-negative threshold? Recommend: validate against 10 real arc42 documents from actual users.
2. **MDR requirement mapping:** Which MDR articles should be mapped to the compliance checker for Phase 2? (Candidate: MDR Art. 10, Annex I, Annex XV)
3. **PDF signature:** Should generated PDF reports include a cryptographic signature for audit submission integrity? (Candidate library: pyhanko)
4. **Authentication design:** When Phase 2 introduces authentication, should it be OAuth2 (SSO integration), API keys, or basic auth?
5. **Review record retention:** EU AI Act Art. 72 implies multi-year post-market monitoring; what is the required retention period for HITL review records?
6. **LLM accuracy metrics:** How will we measure the accuracy of Claude-enriched analysis vs. rule-based baseline? (Proposed: human-annotated benchmark set of 50 arc42 documents)
7. **Template versioning:** When SOP templates are updated to reflect new regulation guidance, how are document authors notified of template changes?

---

## Audit

```
persona=product-mgr
action=create-prd
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/1.define/product-requirements-document.md
version=0.1.0
status=complete
```
