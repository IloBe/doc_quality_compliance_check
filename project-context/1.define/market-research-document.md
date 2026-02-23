# Market Research Document (MRD) — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@product-mgr`  
**AAMAD phase:** 1.define  

---

## Executive Summary

**Market Opportunity.** The EU AI Act (Regulation 2024/1689) entered into force on 1 August 2024 and its high-risk AI system obligations become fully enforceable from 2 August 2026. This creates an immediate, legally mandated compliance deadline for every EU-based company developing or deploying AI systems in high-risk categories (Annex III: medical devices, employment, law enforcement, critical infrastructure, etc.). Non-compliance carries fines of up to €35 million or 7% of global annual turnover for prohibited-AI violations and up to €15 million or 3% for other obligations. Despite this urgency, the market for integrated technical-documentation compliance tooling remains fragmented: legal teams use static checklists while engineering teams use isolated linters, with no bridge between the two. The combined TAM for EU AI governance, compliance, and audit tooling is estimated to exceed €2 billion by 2027.

**Technical Feasibility.** AI-assisted document analysis using Python FastAPI and large language models (Anthropic Claude) is a proven, production-ready technology stack. Structured document analysis—checking arc42 architecture templates for completeness, validating model cards against EU AI Act Annex IV requirements, and generating downloadable audit reports—can be implemented with a minimal dependency set: FastAPI (REST API), Pydantic v2 (type-safe validation), ReportLab (PDF generation), structlog (structured logging), and bleach (security). The optional LLM enrichment layer (Anthropic Claude) adds semantic depth to gap analysis without requiring it as a hard runtime dependency, enabling graceful degradation.

**Recommended Approach.** An MVP-first strategy targeting internal Quality Management (QM) teams in EU companies that are already developing or deploying high-risk AI systems. The MVP delivers a self-hosted FastAPI service with a browser dashboard, covering the four highest-value use cases: (1) arc42 architectural documentation completeness checking, (2) EU AI Act compliance assessment against all 9 mandatory requirements, (3) downloadable PDF audit reports, and (4) SOP template management + HITL review workflow. A single developer using agentic tooling (VS Code + GitHub Copilot + AAMAD framework) can deliver this MVP in 6 weeks, validating product-market fit before investing in multi-tenancy, authentication, and cloud deployment.

---

## Section 1 – Market Analysis & Opportunity Assessment

### 1.1 Market Size and Growth

| Metric | Value | Source / Notes |
|--------|-------|----------------|
| EU AI Act full enforcement | August 2026 | Regulation (EU) 2024/1689, Art. 113 |
| High-risk AI system categories | 8 Annex III categories, 40+ subcategories | EU AI Act Annex III |
| EU companies affected (est.) | 50,000–150,000 providers + deployers | European Commission IA |
| Max fine for non-compliance | €35M or 7% global turnover | EU AI Act Art. 99 |
| EU AI governance tools TAM (2027 est.) | >€2 billion | Analyst projections |
| GDPR compliance tools market (comparable) | €1.3B (2023) → €3.5B (2027) | IDC estimates |

The EU AI Act compliance market is expected to follow the trajectory of GDPR tools (2018–2020), where a hard regulatory deadline triggered rapid tooling adoption. EU AI Act is significantly more technically complex than GDPR—requiring technical documentation, conformity assessments, and logging—which creates demand for developer-facing tools that pure legal software cannot address.

### 1.2 Market Gap Analysis

| Gap | Current State | Opportunity |
|-----|---------------|-------------|
| Integrated arc42 + EU AI Act checking | None found | Combined technical documentation + regulation check |
| Structured SOP template management | Manual Word/PDF templates | Versioned, downloadable, HITL-reviewed |
| HITL review workflow for AI assessments | Ad hoc email/ticket systems | Structured pass/fail with modification request tracking |
| Rule-based compliance (no LLM required) | LLM-only tools (API key mandatory) | Offline-capable rule-based core |
| PDF audit reports for submission | Manual report writing | Auto-generated, submission-ready PDF |
| Multi-framework check (EU AI Act + MDR + GDPR) | Separate tools per framework | Single unified checker |

### 1.3 Target Audience

**Primary:** Quality Management (QM) departments and compliance officers in EU companies developing or deploying AI systems classified as high-risk under EU AI Act Annex III.

**Secondary:** Technical teams (product managers, requirements engineers, system architects, ML/AI engineers) that produce the technical documentation subject to QM review.

**Tertiary:** External compliance auditors (notified bodies, internal audit functions) that verify AI governance evidence packages.

### 1.4 Business Case

- A single non-compliance finding during a conformity assessment can delay an AI product launch by 6–18 months.
- QM staff currently spend 8–20 hours manually checking an arc42 document for completeness and EU AI Act coverage.
- Automated checking reduces this to <5 minutes for initial gap identification, freeing QM staff for substantive review.
- A company deploying one high-risk AI system annually can justify €20,000–€100,000/year in tooling to avoid €15M+ non-compliance fines.
- HITL workflow formalises the review audit trail, which itself is an EU AI Act Art. 14 (human oversight) compliance artefact.

### 1.5 Competitive Landscape

| Competitor Type | Example | Strength | Weakness |
|-----------------|---------|----------|----------|
| Legal compliance SaaS | OneTrust, TrustArc | Broad regulatory coverage | No technical doc integration, no arc42 |
| Static checklists | Excel/PDF checklists | Free, simple | Not automated, no gap tracking |
| Generic doc linters | Vale, textlint | Good for style/grammar | No regulatory context |
| AI governance platforms | Credo AI, Arthur AI | ML model monitoring | Expensive, no EU AI Act Art. 11 doc check |
| Doc Quality Check (this product) | — | arc42 + EU AI Act + HITL + PDF in one tool | Single-instance MVP, no auth yet |

**Key differentiator:** This product is the only tool that combines (a) structured architecture documentation checking (arc42), (b) EU AI Act mandatory requirements assessment, (c) SOP template management, and (d) HITL review workflow with a downloadable PDF audit trail—in a single self-hosted service with no mandatory LLM dependency.

---

## Section 2 – Technical Feasibility & Requirements Analysis

### 2.1 Technology Stack Assessment

| Component | Technology | Feasibility | Rationale |
|-----------|-----------|-------------|-----------|
| REST API backend | Python 3.11 + FastAPI 0.109+ | ✅ Proven | Async, typed, auto-docs, widely deployed |
| Data validation | Pydantic v2 | ✅ Proven | Native FastAPI integration, strict type safety |
| Document parsing | Python stdlib + regex | ✅ Proven | Sufficient for markdown/text arc42 docs |
| PDF generation | ReportLab 4.1+ | ✅ Proven | Pure Python, no system deps, widely used in production |
| LLM enrichment | Anthropic Claude (optional) | ✅ API available | Claude 3 models support long-context document analysis |
| Structured logging | structlog 24.1+ | ✅ Proven | JSON logging required for EU AI Act Art. 12 audit trail |
| XSS sanitisation | bleach 6.1+ | ✅ Proven | Battle-tested HTML sanitiser |
| Frontend | Vanilla HTML/CSS/JS | ✅ Appropriate | No framework needed for MVP dashboard |

### 2.2 arc42 Compliance Checking

The arc42 template defines 12 required sections that must be present in a conforming architecture document:

1. Introduction and Goals  
2. Constraints  
3. Context and Scope  
4. Solution Strategy  
5. Building Block View  
6. Runtime View  
7. Deployment View  
8. Concepts  
9. Architecture Decisions  
10. Quality Requirements  
11. Risks and Technical Debt  
12. Glossary  

Additionally, the checker detects UML diagram types: system context, component, sequence, class, and deployment diagrams.

### 2.3 EU AI Act Requirement Mapping

Nine mandatory requirements for high-risk AI systems (Art. 9–15 + Art. 43):

| ID | Article | Requirement |
|----|---------|-------------|
| EUAIA-1 | Art. 9 | Risk Management System |
| EUAIA-2 | Art. 10 | Data and Data Governance |
| EUAIA-3 | Art. 11 | Technical Documentation (Annex IV) |
| EUAIA-4 | Art. 12 | Record-Keeping / Logging |
| EUAIA-5 | Art. 13 | Transparency and User Information |
| EUAIA-6 | Art. 14 | Human Oversight |
| EUAIA-7 | Art. 15 | Accuracy, Robustness and Cybersecurity |
| EUAIA-8 | Art. 43 | Conformity Assessment |
| EUAIA-9 | Art. 72 | Post-Market Monitoring |

### 2.4 PDF Report Generation

ReportLab enables production-quality PDF generation from Python without system-level dependencies (no wkhtmltopdf, no headless browser). Reports include: section-by-section checklist, compliance scores, identified gaps, risk level badge, and actionable recommendations. Generated PDFs are suitable for offline audit submission.

### 2.5 HITL Review Workflow

Human-In-The-Loop review is a mandatory design constraint (not optional) to ensure that all AI-generated assessments are verified by a qualified human before acting on them. Reviewers can:
- **Pass** an assessment: marks it as approved
- **Request modifications**: submits structured modification requests (section name + description + priority) that the document author receives as actionable items

---

## Section 3 – User Experience & Workflow Analysis

### 3.1 User Personas

**Persona 1 — QM Lead (Maria, 42)**
- Role: Quality Management representative at an EU medical device AI company
- Goal: Ensure all technical documentation meets EU AI Act + MDR requirements before conformity assessment
- Pain points: Manually cross-checking 12 arc42 sections + 9 EU AI Act requirements takes a full day; audit trail is scattered across emails and spreadsheets
- Workflow: Receives arc42 docs from architects → uploads to tool → reviews gap report → assigns modifications → approves → downloads PDF for auditor

**Persona 2 — SW Architect (Jan, 35)**
- Role: System/software architect responsible for arc42 documentation
- Goal: Know which sections are missing or incomplete before QM review; get actionable modification requests
- Pain points: Does not know EU AI Act requirements in detail; manual review cycles are slow
- Workflow: Downloads SOP template from tool → fills in arc42 sections → submits for QM review → receives structured modification requests → addresses them

**Persona 3 — Compliance Auditor (Elke, 51)**
- Role: External notified body auditor reviewing technical documentation
- Goal: Receive a complete, auditable evidence package with all required artefacts
- Pain points: Incomplete documentation, missing EU AI Act fields, no audit trail of review decisions
- Workflow: Receives PDF audit report → reviews compliance scores and gaps → validates HITL review audit trail

### 3.2 Quality Manager Workflow

```
[Upload arc42 Document] → [Automatic Section Check]
         ↓
[EU AI Act Compliance Check] → [Gap Report Generated]
         ↓
[Assign Modification Requests to Author]
         ↓
[Author Revises Document]
         ↓
[QM Reviews Revised Document] → [HITL Pass/Fail Verdict]
         ↓
[Generate PDF Audit Report] → [Download for Auditor]
```

### 3.3 Technical Developer Workflow

```
[Browse SOP Templates] → [Download Relevant Template]
         ↓
[Fill in arc42 / Model Card Sections]
         ↓
[Submit Document for QM Review]
         ↓
[Receive Structured Modification Requests]
         ↓
[Address Each Modification] → [Resubmit]
```

### 3.4 HITL as a Compliance Mechanism

The HITL review workflow is not merely a UX feature — it is itself a compliance artefact. EU AI Act Art. 14 requires that high-risk AI systems be designed for effective human oversight. By recording every review decision (reviewer name, timestamp, verdict, modification requests), the system generates an audit trail demonstrating that human oversight was exercised over every AI-generated compliance assessment.

---

## Section 4 – Production & Operations Requirements

### 4.1 Deployment

**MVP:** Single-instance Docker container (or bare `uvicorn` process) on a developer workstation or internal server. No cloud infrastructure required for MVP.

**Phase 2:** Docker Compose with persistent volume for reports and reviews. SQLite for review audit trail persistence.

**Phase 3 (Future):** Kubernetes deployment, PostgreSQL, multi-user authentication, CI/CD pipeline.

### 4.2 Logging and Auditability

- `structlog` structured JSON logging for all service operations
- Every compliance check, document analysis, report generation, and HITL review decision is logged with timestamp, document ID, and result summary
- Logs are machine-readable (JSON) for SIEM integration
- No PII in log output (GDPR-compliant logging)

### 4.3 Security

- `bleach` XSS sanitisation applied to all user-supplied text content before processing
- Filename validation via regex to prevent path traversal attacks
- File size limits enforced (configurable via `MAX_FILE_SIZE_MB`, default 10 MB)
- No authentication in MVP (internal deployment only)
- CORS restricted to `localhost:3000` and `localhost:8000` in MVP

### 4.4 PDF Export

- ReportLab-generated PDFs include a header identifying the tool and version
- Reports contain: document metadata, section checklist with pass/fail markers, compliance score, identified gaps, recommendations, and reviewer information (if HITL completed)
- PDFs are self-contained (no external fonts or images required beyond ReportLab defaults)

---

## Section 5 – Innovation & Differentiation

### 5.1 Unique Value Propositions

1. **Integrated arc42 + EU AI Act checking:** No other tool combines structured architecture documentation checking with EU AI Act mandatory requirements in a single service.

2. **HITL as first-class citizen:** Unlike tools that treat human review as an optional overlay, this system makes HITL review a required workflow step with structured output (modification requests have section names, descriptions, and priorities).

3. **Six SOP templates mapped to EU AI Act:** Business Goals, Stakeholders, Architecture, Quality Requirements, Risk Assessment, and Glossary SOPs are directly aligned with EU AI Act Art. 9–15 and arc42 requirements—so filling in the templates produces EU AI Act-compliant documentation by design.

4. **Rule-based core with optional LLM enrichment:** Works offline without an Anthropic API key. LLM enrichment adds semantic analysis (gaps not detectable by keyword matching) but is not required for the core compliance value.

5. **Extensible compliance framework:** The compliance checker supports multiple frameworks (EU AI Act, MDR, GDPR, ISO 9001, BSI Grundschutz). Inactive templates for future domains are already registered in the system.

### 5.2 Six SOP Templates — EU AI Act Alignment

| SOP Template | EU AI Act Article | arc42 Section |
|--------------|-------------------|---------------|
| Business Goals SOP | Art. 9 (Risk Management) | Section 1: Introduction and Goals |
| Stakeholders SOP | Art. 13 (Transparency) | Section 1: Introduction and Goals |
| Architecture SOP | Art. 11 (Technical Documentation) | Sections 3–8 |
| Quality Requirements SOP | Art. 15 (Accuracy, Robustness) | Section 10: Quality Requirements |
| Risk Assessment SOP | Art. 9 (Risk Management) | Section 11: Risks and Technical Debt |
| Glossary SOP | Art. 13 (Transparency) | Section 12: Glossary |

---

## Section 6 – Critical Decision Points

### 6.1 Go / No-Go Factors

**Go factors:**
- EU AI Act enforcement creates a mandatory, legally-driven compliance deadline (August 2026)
- No integrated competitor combining arc42 + EU AI Act + HITL in a single tool
- Python/FastAPI stack fully proven; 6-week MVP delivery by one developer is achievable
- Optional LLM dependency means the tool works without an Anthropic API key (lower adoption friction)

**No-go conditions:**
- EU AI Act scope significantly narrows (unlikely; Regulation is enacted law)
- A well-funded competitor launches an identical integrated tool before MVP delivery

### 6.2 Build vs. Buy

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Compliance rules engine | Build | No existing tool covers arc42 + EU AI Act together |
| PDF generation | Buy (ReportLab) | Open-source, pure Python, sufficient functionality |
| LLM document analysis | Buy (Anthropic API) | No need to train own models; Claude 3 sufficient |
| Frontend | Build (vanilla) | Minimal UI requirements; KISS principle for MVP |
| Authentication | Defer | MVP is internal deployment only |

### 6.3 Technology Bets

- **Pydantic v2:** Breaking change from v1; chosen for performance and native FastAPI integration
- **structlog over standard logging:** JSON-structured logs required for EU AI Act Art. 12 audit trail compliance
- **bleach over custom sanitisation:** Battle-tested OWASP-aligned HTML sanitiser; no custom regex security code

---

## Section 7 – Risk Assessment Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| EU AI Act scope/interpretation changes | Low | High | Track European Commission guidance; modular requirements engine |
| Anthropic API unavailability | Medium | Low | Rule-based core works without API; graceful degradation implemented |
| In-memory review store data loss on restart | High | Medium | Document as known limitation; SQLite persistence in Phase 2 |
| Large file processing blocks event loop | Medium | Medium | Background tasks in Phase 2; 10 MB file size limit for MVP |
| No authentication in MVP — internal exposure | Medium | Medium | Document explicitly; add auth in Phase 2 before any non-internal deployment |
| arc42 section detection false negatives | Medium | Medium | Regex patterns cover common heading styles; LLM enrichment covers edge cases |
| PDF generation failure for malformed input | Low | Low | Fallback to text summary; bleach sanitisation prevents injection |

---

## Section 8 – Actionable Recommendations

### 48-Hour Actions

1. Create AAMAD project-context artifacts (MRD, PRD, SAD) ✅
2. Confirm Python 3.11 environment and `pip install -e ".[dev]"` working ✅
3. Validate all 30 unit tests pass ✅
4. Confirm FastAPI server starts and `/health` returns `{"status": "healthy"}` ✅

### 30-Day Priorities

1. Conduct usability test with 2–3 QM professionals: validate arc42 section detection accuracy
2. Add TestClient-based API route integration tests (target: 10 additional tests)
3. Implement SQLite persistence for review audit trail
4. Add EU AI Act secondary regulation detection (MDR for medical devices)
5. Define CI/CD pipeline (GitHub Actions) with ruff linting and pytest

### 6-Month Roadmap

| Month | Milestone |
|-------|-----------|
| 1–2 | MVP delivered, internal QM team onboarded, usability feedback collected |
| 3 | SQLite persistence, Docker Compose deployment, MDR/GDPR checkers |
| 4 | Multi-user authentication (OAuth2/API key), email notifications for HITL |
| 5 | LLM-enriched analysis enabled by default, accuracy metrics collected |
| 6 | Cloud deployment (AWS/Azure), SaaS pricing model evaluation |

---

## Sources

- EU AI Act (Regulation (EU) 2024/1689), Official Journal of the EU, 12 July 2024
- arc42 Template v8.2, Gernot Starke & Peter Hruschka, https://arc42.org
- Model Card Template, Mitchell et al. (2019), Google Research
- ISO/IEC 25010:2023 — Systems and Software Quality Model
- BSI Grundschutz IT-Grundschutz-Kompendium, Bundesamt für Sicherheit in der Informationstechnik
- ISO 9001:2015 — Quality Management Systems
- GDPR (Regulation (EU) 2016/679)
- ReportLab Documentation, https://www.reportlab.com/docs/
- Anthropic Claude API Documentation, https://docs.anthropic.com
- FastAPI Documentation, https://fastapi.tiangolo.com
- structlog Documentation, https://www.structlog.org
- bleach Documentation, https://bleach.readthedocs.io

---

## Assumptions

1. Target users are EU companies (or companies with EU operations) developing/deploying high-risk AI systems under EU AI Act Annex III.
2. Documents submitted are text-based (markdown, plain text) or standard office formats; binary/encrypted PDFs are out of scope for MVP.
3. The arc42 template structure follows the canonical 12-section format; non-standard adaptations may reduce detection accuracy.
4. Anthropic Claude API availability is treated as optional; the rule-based core is self-sufficient for MVP.
5. MVP deployment is internal-only (single organisation, no internet-facing exposure); production multi-tenant deployment requires authentication (Phase 2).
6. EU AI Act technical requirements are stable from August 2026 enforcement date; minor guidance updates are handled via requirements engine updates, not architectural changes.
7. "High-risk" AI system classification follows EU AI Act Annex III exactly; the system classifies based on domain keywords, not legal interpretation.
8. The 6-week MVP timeline assumes one experienced Python developer using agentic tooling (VS Code + GitHub Copilot + AAMAD).

---

## Open Questions

1. **Accuracy benchmark:** What is the acceptable false-negative rate for arc42 section detection? (Currently unvalidated against real architecture documents.)
2. **MDR integration timeline:** When should Medical Device Regulation (MDR) requirements be added? (Candidate for 30-day priority.)
3. **LLM evaluation:** How should accuracy of Claude-enriched gap analysis be measured? (Proposed: expert annotation of 50 real arc42 docs.)
4. **SaaS model:** Is a self-hosted product sufficient, or is a multi-tenant cloud SaaS required for commercial viability?
5. **Authentication design:** OAuth2 vs API key vs LDAP integration for Phase 2 authentication?
6. **Data retention policy:** How long should generated PDF reports and HITL review records be retained? (EU AI Act Art. 72 post-market monitoring implies multi-year retention.)
7. **Inactive templates activation criteria:** What triggers activation of inactive SOP templates (e.g., MDR-specific templates)?

---

## Audit

```
persona=product-mgr
action=create-mrd
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/1.define/market-research-document.md
version=0.1.0
status=complete
```
