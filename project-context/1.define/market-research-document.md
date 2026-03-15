# Market Research Document (MRD) — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@product-mgr`  
**AAMAD phase:** 1.define  

---

## Executive Summary

**Market Opportunity.** The EU AI Act (Regulation 2024/1689) and German-specific governance expectations (e.g., BSI TR-03185) create an immediate, legally mandated compliance deadline for enterprises. Beyond the AI Act, regulations like NIS2 (cybersecurity) and GDPR (data protection) demand a unified approach to AI engineering governance. Large enterprises in Germany must prove that AI-enabled software—whether used in R&D or shipped as a product—is developed, validated, and maintained according to these standards. Non-compliance carries fines up to 7% of global turnover, while manual compliance work remains a massive bottleneck for Quality & Regulatory (Q&R) departments.

**Technical Feasibility.** A multi-agent orchestration framework (CrewAI) using Python 3.12 and modern LLMs/VLMs (e.g., NVIDIA Nemotron-Parse for complex PDF ingestion) enables the automation of "regulatory-to-workflow" bridges. A structured backend (FastAPI, PostgreSQL) ensures reproducibility and audit readiness by maintaining a history of inputs, decisions, and generated artifacts (templates and SOPs). This agentic approach allows for explainable risk classification and the generation of tailored engineering procedures that are far more effective than static spreadsheets.

**Recommended Approach.** Deliver an MVP "Compliance & Quality Copilot" focused on the German/EU reality. The MVP implements a core workflow: (1) AI use-case intake and risk classification (EU AI Act oriented), (2) automatic generation of tailored risk assessment templates, and (3) generation of SOPs that guide engineering teams through execution. This "multi-agent, audit-ready governance automation" targets Q&R representatives as primary users, providing them with standardized, defensible outputs while reducing the friction previously caused by ad-hoc feedback cycles with developers.

---

## Section 1 – Market Analysis & Opportunity Assessment

### 1.1 Market Size and Growth

| Metric | Value | Source / Notes |
|--------|-------|----------------|
| EU AI Act full enforcement | August 2026 | Regulation (EU) 2024/1689, Art. 113 |
| High-risk AI system categories | 8 Annex III categories, 40+ subcategories | EU AI Act Annex III |
| EU companies affected (est.) | 50,000–150,000 providers + deployers | European Commission IA |
| Max fine for non-compliance | €35M or 7% global turnover | EU AI Act Art. 99 |
| NIS2 & GDPR influence | High | Cross-regulatory governance pressure |
| BSI TR-03185 & Secure Lifecycle | Germany standard | Influential for engineering governance |

The internal enterprise need for scalable AI governance is the primary market. Pressure comes not just from the EU AI Act, but also from NIS2 (cybersecurity posture), GDPR (accountability), and in specific domains like e.g. medicine from MDR. In Germany, BSI guidance for secure software lifecycles aligns engineering governance with security-by-design, creating a high-bar requirement for traceable and reproducible evidence.

### 1.2 Market Gap Analysis

| Gap | Current State | Opportunity |
|-----|---------------|-------------|
| **Integrated arc42 + EU AI Act checking** | None found | Combined technical documentation + regulation check |
| **Multi-Agent Governance Bridge** | Static Templates | Automated "Regulatory-to-Workflow" bridge |
| **Germany/BSI Alignment** | Generic tools | Security-by-design & BSI-aligned lifecycles |
| **Reproducibility & Audit Defense** | Scattered files | Centralized history of inputs, decisions, & logic |
| **Actionable SOP Generation** | Static Word/PDFs | Dynamically generated SOPs for specific use cases |
| **Document Ingestion (Complex)** | Text-only parsing | NVIDIA Nemotron-Parse for complex layouts/tables |
| **HITL review workflow** | Ad hoc email/tickets | Structured pass/fail with modification request tracking |
| **Rule-based core (no mandatory LLM)** | LLM-only tools | Offline-capable rule-based core with optional enrichment |

### 1.3 Target Audience

**Primary:** Q&R representatives (Quality Management, Regulatory Affairs, Compliance, Security/Privacy governance). They create document templates and SOPs, and perform final review/approval of engineering outputs.

**Secondary:** Product Owners, Requirement Engineers, Software Architects, and R&D teams. They use the generated SOPs to fill templates with product-specific content and deliver them for review.

**Tertiary:** External compliance auditors (notified bodies, internal audit functions) requiring a clear audit trail of how risk was assessed and managed.

### 1.4 Business Case

- **Faster alignment:** Reduce "time to first-pass" for risk classification and structured documentation.
- **Consistency:** Standardized outputs across different product teams and geographic sites.
- **Audit Readiness by Default:** Built-in traceability (who, what, when, why) for all generated assessments.
- **Lower Friction:** Q&R guides engineering via clear SOPs instead of subjective, ad-hoc feedback cycles.
- **Scalability:** Rule packs (EU AI Act, GDPR, NIS2, BSI) can be updated centrally in the agent knowledge base.

### 1.5 Competitive Landscape

| Competitor Type | Example | Strength | Weakness |
|-----------------|---------|----------|----------|
| Legal compliance SaaS | OneTrust, TrustArc | Broad regulatory coverage | No technical doc integration, no arc42 |
| Static checklists | Excel/PDF checklists | Free, simple | Not automated, no gap tracking |
| Generic doc linters | Vale, textlint | Good for style/grammar | No regulatory context |
| AI governance platforms | Credo AI, Arthur AI | ML model monitoring | Expensive, no EU AI Act Art. 11 doc check |
| Doc Quality Check (this product) | — | arc42 + EU AI Act + HITL + PDF in one tool | Single-instance MVP, no auth yet |

**Key differentiator:** This product is the only "Multi-Agent AI Governance Copilot" focused on the German/EU reality. It explicitly supports (a) Q&R representatives in creating tailored templates/SOPs and (b) engineering teams in executing them—all with explainable outcomes and built-in audit defense (reproducibility and history).

---

## Section 2 – Technical Feasibility & Requirements Analysis

### 2.1 Technology Stack Assessment

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Backend | Python 3.12 | Better performance, modern type hinting, async stability, structured logging and testing |
| Multi-Agent Engine | CrewAI | Orchestration of specialized agents (Classifier, Template Author, SOP Author, Auditor) |
| Document Ingestion | NVIDIA Nemotron-Parse | Advanced layout-aware PDF/document parsing into useable data |
| API Layer | FastAPI | High-performance, standardized API-first design |
| Persistence | PostgreSQL | Robust storage for artifacts, metadata, and full audit history |
| Reporting | ReportLab / Jinja2 | Direct PDF generation for audit-ready evidence |
| UI Framework | Plotly Dash or REST / Modern Web UI | Workflow-driven, secure, simple and modern UI for Q&R personnel |

### 2.2 Core MVP Capabilities & arc42 Compliance

The MVP delivers a multi-agent "regulatory-to-workflow" bridge with the following core technical capabilities:

1.  **Use-Case Intake:** Forms and document uploads for AI context (intended purpose, users, data, environment).
2.  **arc42 Section Analysis:** Automatic detection and completeness checking of the 12 canonical arc42 architecture sections:
    *   1. Introduction and Goals | 2. Constraints | 3. Context and Scope
    *   4. Solution Strategy | 5. Building Block View | 6. Runtime View
    *   7. Deployment View | 8. Concepts | 9. Architecture Decisions
    *   10. Quality Requirements | 11. Risks and Technical Debt | 12. Glossary
    *   *Includes detection of UML diagram types (System Context, Component, Sequence, etc.).*
3.  **Transparent Classification:** AI-driven risk classification (EU AI Act risk model) with cited rationale and criteria.
4.  **Artifact Generation:** Dynamic templates (e.g. Risk Assessment) + associated SOPs (Standard Operating Procedures) explaining how engineering must execute, fill, and document the assessment.
5.  **Reproducibility Repository:** History page per artifact maintaining full versioning of inputs, agent tool calls, decisions, and logic for audit defense.
6.  **Configurable Rule Packs:** Modular logic for EU AI Act, GDPR, NIS2, MDR, and BSI-aligned checklists.

### 2.3 Regulatory & Governance Context Mapping

The "market" is defined by the internal enterprise need for scalable, traceable governance.

| Framework | Alignment in MVP | Detailed AI Act Requirements |
|-----------|-----------------|-----------------------------|
| **EU AI Act** | Risk-based classification, documentation, human oversight (Art. 14). | Art. 9: Risk Mgmt \| Art. 10: Data Gov \| Art. 11: Tech Doc (Annex IV) \| Art. 12: Record-Keeping \| Art. 13: Transparency \| Art. 14: Human Oversight \| Art. 15: Cyber/Robustness \| Art. 43: Conformity \| Art. 72: Post-Market Monitoring |
| **GDPR** | Accountability, lawful processing, and DPIA-like logic. | Art. 6: Lawful Processing \| Art. 35: Data Protection Impact Assessment (DPIA) \| Art. 5: Principles |
| **NIS2** | Secure software lifecycle (supply chain & governance duty). | Incident readiness, governance duties, supply chain security posture. |
| **MDR (Medical)** | Stricter development/audit controls (when applicable). | Annex II: Tech Doc \| Art. 10: General Obligations of Manufacturers. |
| **BSI (Germany)** | Secure software lifecycle practices (Security-by-Design). | BSI TR-03185 Security of AI Systems \| IT-Grundschutz-Kompendium. |

### 2.4 Reproducibility as a Technical Constraint

Audit defense requires that every decision (e.g., "This is High-Risk") is reproducible. The system must store:
- Exact snapshot of agent logic/rules used.
- Inputs provided by the user.
- Intermediate decisions and tool calls.
- Model and version information.

### 2.5 HITL Review Workflow

Human-In-The-Loop review is a mandatory design constraint. Reviewers (Q&R) can:
- **Pass** an assessment: marks it as approved
- **Request modifications**: submits structured modification requests that engineering must address.
- **Audit Traceability**: Every decision (reviewer, timestamp, rationale) is logged.

---

## Section 3 – User Experience & Workflow Analysis

### 3.1 User Personas

**Persona 1 — Q&R Lead (Maria, 42)**
- Role: Quality Management / Compliance representative (EU/Germany context).
- Goal: Create tailored SOPs/templates and review engineering work for audit readiness.
- Pain points: Translating evolving legal rules into consistent engineering practice. E.g. manually cross-checking 12 arc42 sections + 9 AU AI Act requirements takes a full day.
- Workflow: Takes use-case input and arc42 docs from architects → agents generate SOP/Template → First review → Assigns first modifications → Sends to engineering after first fixes, if necessary → Reviews/Approves filled work.

**Persona 2 — Software Architect/Engineer (Jan, 35)**
- Role: R&D lead for local AI implementation and responsible for arc42 documentation.
- Goal: Document the AI system quickly and correctly without being a legal expert. Gets actionable modification requests.
- Pain points: Ambiguity in regulatory requirements; tedious manual documentation. Does not know EU AI Act or other legal topics and their requirements in detail.
- Workflow: Receives SOP/Template from Q&R → Uses SOP guidance to fill content and fills in arc42 sections → Submits for QM review.

**Persona 3 — Compliance Auditor (Elke, 51)**
- Role: External or Internal Auditor reviewing technical documentation.
- Goal: Receive a complete, auditable evidence package with all required artefacts. Verify the "Who, What, When, and Why" of a product's compliance status.
- Pain points: Lack of traceable evidence; non-standardized and incomplete documentation; no audit trail of review decisions.
- Workflow: Accesses History page → Downloads PDF audit report → Reviews compliance scores and gaps → Validates the rationales cited by the Multi-Agent engine and the HITL review audit trail.

### 3.2 Q&R Governance Workflow (The "Bridge")

The "Bridge" represents the end-to-end automation of translating regulatory requirements into actionable engineering procedures. It consists of two sub-flows: **Artifact Generation** (Q&R sets the stage) and **Compliance Verification** (Engineering executes & Q&R approves).

#### 3.2.1 SOP & Template Generation Workflow (The "Push")
This flow enables Q&R to create use-case-specific governance packages.

1.  **AI Use-Case Intake:** Q&R describes the AI system context (purpose, data, domain).
2.  **Multi-Agent Risk Assessment:**
    *   **Classifier Agent:** Identifies EU AI Act risk class + rationale.
    *   **Rule Engine:** Maps applicable obligations (NIS2, GDPR, BSI).
3.  **Automated Artifact Authoring:**
    *   **Template Author Agent:** Generates a tailored **Risk Assessment Template** with specific sections required for that use-case.
    *   **SOP Author Agent:** Generates a **Standard Operating Procedure (SOP)** explaining *how* engineering must fill the template and what evidence is required.
4.  **Governance Release:** Q&R reviews and releases the "Governance Pack" for the product team.

#### 3.2.2 Compliance & Review Workflow (The "Pull")
This flow covers the execution and verification of the documentation.

```
[Upload arc42 / Filled Template] → [Automatic Section Check]
         ↓
[Cross-Check against SOP/Criteria] → [Gap Report Generated]
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
[Access Governance Pack] → [Download Tailored Template & SOP]
         ↓
[Execute according to SOP] → [Fill arc42 / Model Card Sectoins / Risk Template]
         ↓
[Submit Evidence for Review] → [Address Modification Requests]
         ↓
[Final Approval] → [Traceable Audit Readiness & History Tracking]
```

### 3.4 Core Workflow Steps

1. **Intake:** Describe context, intended purpose, data, and environment.
2. **Classify:** Automated risk classification with transparent sources.
3. **Draft:** Tailored templates and SOPs generated for that specific use-case.
4. **Govern:** Record all versions and decisions to support audit readiness. Starts with Agents review and includes HITL as compliance mechanism.

---

## Section 4 – Production & Operations Requirements

### 4.1 Deployment

**MVP:** Docker-compose setup with FastAPI, PostgreSQL, and the Multi-Agent worker. Can be deployed on-prem for high-security environments.

**Phase 2:** Kubernetes deployment for larger enterprises with centralized governance "Rule Packs" shared across sites.

### 4.2 Logging and Auditability

- **Traceability:** Every agent step is logged into PostgreSQL with audit-ready metadata. A general audit-ready logging concept is implemented for the entire software application.
- **Explainability:** Rationale for classification (e.g. which EU AI Act appendix triggered a high-risk label), risk mitigations if available, limitations and constraints.
- **Security:** NVIDIA Nemotron-Parse handles document ingestion securely within the enterprise boundary. OWASP Top 10 security issues for Agentic Applications are taken into account to implement security concepts.

### 4.3 Success Metrics (Business Insights)

1. **Cycle-time Reduction:** Time to produce the first-pass risk classification and documentation.
2. **Consistency Score:** Uniformity of outputs across different teams and projects.
3. **Audit Confidence:** Reduction in "Gap Analysis" findings during internal/external audits including documented investigation process and associated people.
4. **Adoption Rate:** Percentage of engineering teams using the SOP-driven workflow.

---

## Section 5 – Innovation & Differentiation

### 5.1 Unique Value Proposition (USP)

> **“Multi-agent, audit-ready governance automation focused on Germany/EU reality.”**

Unlike generic document generators, this system emphasizes:
- **Explainable Outcomes:** Transparent reasoning cited from criteria.
- **Actionable Artifacts:** Delivers both the *How* (SOP) and the *Where* (Templates).
- **Reproducibility:** A full history and versioning for audit defense.
- **EU/Germany Framing:** Specifically aligned with BSI security lifecycle expectations.

### 5.2 Key SOP Templates — EU AI Act Alignment

| SOP Template | EU AI Act Article  | Governance Focus | arc42 Section
|--------------|-------------------|------------------|---------------|
| **Risk Assessment** | Art. 9 (Risk Management) | Impact on fundamental rights & safety. | Section 11: Risks and Technical Debt |
| **Technical Architecture** | Art. 11 (Technical Documentation) | Security-by-Design & Robustness. | Sections 3–8 (Architecture Views & Concepts) |
| **Data Governance** | Art. 10 (Data & Data Governance) | Lawful processing and data quality. | Section 8: Concepts (Data & Domain Models) |
| **Quality Requirements** | Art. 15 (Accuracy, Robustness) | Accuracy, robustness, cybersecurity. | Section 10: Quality Requirements |
| **Human Oversight** | Art. 14 (Human Oversight) | Roles, training, and override protocols. | Section 8: Concepts (Human-System Interaction) |
| **Post-Market Monitor** | Art. 72 (Post-Market Monitoring) | Lifecycle feedback and complaint handling. | Section 10: Quality Requirements (Monitoring) |
| **Glossary** | Art. 13 (Transparency) | Quality, accuracy, robustness | Section 12: Glossary |

---

## Section 6 – Decision Points

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

### 6.3 Roadmap

| Milestone | Deliverable |
|-----------|-------------|
| **MVP (Weeks 1-6)** | Risk classification workflow, Template/SOP generation, History page, Polished UI for Q&R tasks. |
| **Phase 2** | Full coverage of NIS2/GDPR, ALM toolchain integration (Jira/Confluence), Multi-user Role-Based Access Control. |
| **Phase 3** | Notified-body grade MDR automation, advanced cloud deployment, automated post-market monitoring integration. |


### 6.4 Tech Bets

- **CrewAI over LangChain:** Chosen for its superior orchestration of "Specialized Agents" required for complex regulatory reasoning.
- **NVIDIA Nemotron-Parse:** Betting on VLM-driven ingestion to handle complex regulatory tables/flowcharts that OCR/text-parsing misses.
- **Internal Enterprise Focus:** Designing for Q&R departmental workflows over pure developer toolkits.

---

## Section 7 – Risk Assessment Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| EU AI Act scope/interpretation changes | Low | High | Track European Commission guidance; modular requirements engine |
| Evolving Regulations | High | Medium | Centrally managed "Rule Packs" for easy updates. |
| Anthropic API unavailability | Medium | Low | Rule-based core works without API; graceful degradation implemented |
| AI Hallucinations | Medium | High | Mandatory HITL (Q&R Approval) for all outputs. |
| In-memory review store data loss on restart | High | Medium | Document as known limitation; SQLite persistence in Phase 2 |
| Large file processing blocks event loop | Medium | Medium | Background tasks in Phase 2; 10 MB file size limit for MVP |
| No authentication in MVP — internal exposure | Medium | Medium | Document explicitly; add auth in Phase 2 before any non-internal deployment |
| arc42 section detection false negatives | Medium | Medium | Regex patterns cover common heading styles; LLM enrichment covers edge cases |
| PDF generation failure for malformed input | Low | Low | Fallback to text summary; bleach sanitisation prevents injection |
| Complex PDF parsing fails | Medium | Low | NVIDIA Nemotron-Parse integration + manual fallback. |
| Low Engineering Adoption | Medium | Medium | Clear SOP guidance reduces their work burden. |

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
4. Add EU AI Act secondary regulation detection (MDR for medical devices is out of scope for 6 week MVP)
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
- ISO 9001:2015 — Quality Management Systems
- ISO/IEC 25010:2023 — Systems and Software Quality Model
- BSI TR-03185 — Guidance for secure software lifecycle (Germany)
- BSI Grundschutz IT-Grundschutz-Kompendium, Bundesamt für Sicherheit in der Informationstechnik
- NIST AI Risk Management Framework
- NIS2 Directive (EU) 2022/2555
- GDPR (Regulation (EU) 2016/679)
- ReportLab Documentation, https://www.reportlab.com/docs/
- Model Card Template, Mitchell et al. (2019), Google Research
- Anthropic Claude API Documentation, https://docs.anthropic.com
- FastAPI Documentation, https://fastapi.tiangolo.com
- structlog Documentation, https://www.structlog.org
- bleach Documentation, https://bleach.readthedocs.io
- NVIDIA Nemotron-Parse Documentation
- CrewAI Multi-Agent Framework Documentation

---

## Assumptions

1. Target users are EU companies, specifically Germany (or companies with EU operations) developing/deploying high-risk AI systems under EU AI Act Annex III.
2. Documents submitted are text-based (markdown, plain text) or standard office formats and PDFs; encrypted PDFs are out of scope for MVP.
3. The arc42 template structure follows the canonical 12-section format; non-standard adaptations may reduce detection accuracy.
4. OpenAI API is default setup, Anthropic Claude API availability is treated as optional; the rule-based core is self-sufficient for MVP.
5. MVP deployment is internal-only (single organisation, no internet-facing exposure); production multi-tenant deployment requires authentication (Phase 2).
6. EU AI Act technical requirements are stable from August 2026 enforcement date; minor guidance updates are handled via requirements engine updates, not architectural changes.
7. "High-risk" AI system classification follows EU AI Act Annex III exactly; the system classifies based on domain keywords, not legal interpretation.
8. The 6-week MVP timeline assumes one experienced Python developer using agentic tooling (VS Code + GitHub Copilot + AAMAD).

---

## Open Questions

1. **Accuracy benchmark:** What is the acceptable false-negative rate for arc42 section detection? (Currently unvalidated against real architecture documents.)
2. **MDR integration timeline:** When should Medical Device Regulation (MDR) requirements be added? (Candidate for 30-day priority. Not in focus of 6 week MVP)
3. **LLM evaluation:** How should accuracy of LLM-enriched gap analysis be measured? (Proposed: expert annotation of 50 real arc42 docs.)
4. **SaaS model:** Is a self-hosted product sufficient, or is a multi-tenant cloud SaaS required for commercial viability?
5. **Authentication design:** OAuth2 vs API key vs LDAP integration for Phase 2 authentication?
6. **Data retention policy:** How long should generated PDF reports and HITL review records be retained? (EU AI Act Art. 72 post-market monitoring implies multi-year retention.)
7. **Inactive templates activation criteria:** What triggers activation of inactive SOP templates (e.g. MDR-specific templates)?

---

## Audit

```
persona=product-mgr
action=finalize-article-labels-mrd
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/1.define/market-research-document.md
version=0.6.0
status=complete
```
