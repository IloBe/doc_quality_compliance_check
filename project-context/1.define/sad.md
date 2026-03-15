# System Architecture Document (SAD) — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.8.0  
**Date:** 2026-3-15  
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
- All AI-generated assessments produce a `ReviewRecord` object, not just a free-form result.
- **Traceability of Actions:** Every review, modification request, and fix must be stored with a specific **Action Date** and the **Identity (Name/ID)** of the person performing the task.
- Review verdicts (`pass` | `modifications_needed`) are persisted with timestamps and reviewer metadata.
- **Closed-Loop Fixes:** Modification requests are linked to specific remediations, creating an auditable trail of "Issue -> Request -> Fix -> Re-approval".
- **Role Rules:**
  1. Implementer and reviewer must not be the same person.
  2. High risk products or high risk complaints require a third person for approval.
  3. All HITL participants are part of the QM department; for high risk products/issues, a certified Riskmanager should be responsible for risk management and approval.
  4. For high risk aspects, top management must be informed; by law, they hold main responsibility for QM and governance.
  5. For technical SW documents (e.g., arc42), internal review shall be performed by the development department (Senior SW engineers, SW architects, SW testers, DevOps, etc.), depending on the document's focus. After internal approval it will be send to the QM department for additional review necessary for being auditable.
  6. HITL participant takes care of cost control information regarding model selection and usage.
- The audit trail of review decisions is itself a compliance artefact for EU AI Act Art. 14

#### Model Selection and Cost Control

All models used in implementation—including classical ML, LLMs, vLMs, and MoE concept models—must be cost controlled:

- Model selection considers both performance and operational cost (compute, storage, inference, licensing).
- Cost control mechanisms include:
  - Usage quotas and rate limits for LLM/vLM/MoE APIs.
  - Preference for open-source or on-premise models where feasible.
  - Monitoring and logging of model invocation frequency and resource consumption.
  - Automated alerts for cost threshold breaches.
  - Periodic review of model cost/performance trade-offs.
- Model usage policies are documented and enforced in code and architecture.
- Cost control aligns with compliance, audit, and sustainability requirements.

### 1.5 Risk Management Documentation Requirements

The system must support two distinct types of risk management documentation:

- **General Risk Management Record (Company-wide):**
  - Follows the structure of Table 1 (Riskmanagement File).
  - Covers topics such as risk management process, responsibilities, staff qualifications, risk management plan, intended use, hazardous situations, risk assessments, risk mitigations, completeness, assessed total risk, risk management report, and post-market phase.
  - Links to other documents required for audits and certification.

- **Product-Specific Risk Management Record:**
  - Follows the structure of Table 2 (Documentation of specific Product Risk-Handling).
  - Tracks risk analysis and mitigation for each product, including severity, probability, risk mitigation, verification, and new risks.
  - Supports traceability for high-risk products as required by EU AI Act and notified body audits.

Both document types must be:
- Created, updated, and approved via HITL workflow (with timestamps and responsible person).
- Linked to technical templates (e.g., arc42) and QM-specific documentation.
- Ready for external audits and ISO certification.

#### Risk Document Handling Process (EU AI Act Alignment)

References: [EU AI Act Article 9](https://artificialintelligenceact.eu/article-9-risk-management-system/), [Article 11](https://artificialintelligenceact.eu/article-11-technical-documentation/), [Annex IV](https://artificialintelligenceact.eu/annex-iv/), [Article 14](https://artificialintelligenceact.eu/article-14-human-oversight/)

1. **Ownership**
   - **Company-wide Risk Management Record:** Owned and maintained by the QM department (Quality Manager or certified Riskmanager).
   - **Product-specific Risk Management Record:** Owned by the product team (Product Owner, QM, and certified Riskmanager for high-risk products).

2. **Linking**
   - Each product-specific risk record must reference the company-wide risk management record for context and compliance alignment.
   - All risk records link to supporting documents (SOPs, audit reports, technical templates).

3. **Updating**
   - Updates are initiated by the responsible owner (QM or Product Owner).
   - All changes are versioned, timestamped, and attributed to the editor.
   - For high-risk products/issues, updates require review and approval by a certified Riskmanager.

4. **Approval**
   - Standard risk records: Approval by QM or Product Owner.
   - High-risk records: Approval by certified Riskmanager and notification to top management.
   - All approvals are logged with date, approver identity, and linked evidence.

5. **Traceability**
   - Every action (create, update, approve) is recorded in the audit trail.
   - All records are stored in PostgreSQL with links to related documents and version history.
   - For high-risk, escalation and notification to top management is mandatory.

| Document Type | Owner | Reviewer/Approver | Traceability |
|---------------|-------|-------------------|--------------|
| Company-wide Risk Record | QM / Riskmanager | QM / Riskmanager | Audit trail, version history |
| Product-specific Risk Record | Product Owner / QM | QM / Riskmanager (high-risk) | Audit trail, version history, links to company-wide record |
| High-risk Product/Issue | Product Owner / QM / Riskmanager | Riskmanager, Top Management | Audit trail, version history, escalation log |

### 1.6 Security Requirements

The system must address the following security requirements:

1. **OWASP Top 10 AI Security:**
   - All relevant OWASP Top 10 AI security risks must be mitigated (e.g., prompt injection, insecure model usage, data leakage, supply chain vulnerabilities).
   - Security controls and input validation must be implemented at API boundaries and agent interfaces.

2. **Secure Execution Environment:**
   - All agents must run in a sandboxed environment to prevent unauthorized access and privilege escalation.
   - The application must be deployed in a secure infrastructure (e.g., containerized, restricted network access).

3. **User Authentication & Authorization:**
   - The system must enforce user authentication and role-based authorization for all access to sensitive features and data.
   - Audit logs must record user actions for traceability.

4. **Testing Before Release:**
   - All releases must pass unit tests, integration tests, and user acceptance tests before deployment.
   - Test coverage and results must be documented and reviewed as part of the release process.

#### Security Requirements Implementation & Review Process

1. **Implementation**
   - **SW Engineers:** Implement security controls (OWASP Top 10, input validation, sandboxing, authentication/authorization) in application code.
   - **Test Engineers:** Develop and execute unit tests, integration tests, and user acceptance tests focused on security features.

2. **Review**
   - **Security Reviewer:** Reviews test results, code, and configurations for compliance with security requirements and standards.
   - **DevOps Engineer:** Validates integration and deployment security, ensures sandboxing and secure infrastructure, reviews logs and audit trails.

3. **Traceability**
   - All security-related tasks and reviews are documented and auditable.
   - Release is approved only after successful review and test completion.

| Task | Responsible | Reviewer |
|------|-------------|----------|
| Security controls implementation | SW Engineer | Security Reviewer |
| Security testing (unit/integration/UAT) | Test Engineer | Security Reviewer |
| Integration & deployment security | DevOps Engineer | Security Reviewer, DevOps |

### 1.7 Hybrid Agentic Decision Framework

The system architecture supports a hybrid agentic decision framework combining automated agents and HITL (Human-In-The-Loop) roles for compliance-critical workflows. This ensures both efficiency and regulatory traceability, especially for high-risk and audit-sensitive operations.

#### Framework Overview
- **Automated Agents:**
  - Execute routine compliance checks, document analysis, and risk scoring using AI models (FastAPI, Pydantic, structlog). Inform app user or defined QM person about this routine compliance checks, document analysis and risk scoring. For MVP, a list of clickable topics on a 'History View' page is enough getting information about automated work.
  - Operate within defined boundaries, with all actions logged and versioned.
  - Trigger HITL review gates for unclear, ambiguous, high-risk, or regulatory-sensitive cases. Don't hallucinate.

- **HITL Roles:**
  - Review, approve, and override agent decisions for compliance, risk, and security documentation.
  - Responsible for final approval of high-risk actions, risk document updates, and regulatory submissions.
  - All HITL actions are logged with timestamps, identity, and evidence links.

- **Escalation and Notification:**
  - High-risk or unresolved cases are escalated to certified Riskmanager and product management which have to inform top management.
  - Escalation logs are maintained for audit and traceability.

#### Decision Flow
1. **Routine Operation:**
   - Automated agents process documents and flag issues.
   - Low-risk issues are auto-resolved and logged.
   - If low-risk issue is unclear, trigger HITL process. Don't hallucinate.
2. **Ambiguous/High-Risk Case:**
   - Agent triggers HITL review gate.
   - HITL reviews, approves, or escalates as needed.
3. **Escalation:**
   - Certified Riskmanager/top management review and approve.
   - All actions recorded in audit trail.

#### Traceability and Compliance
- All agentic and HITL actions are versioned and auditable.
- Framework aligns with EU AI Act Article 14 (Human Oversight), ISO 25010, and ISO 42010.
- HITL review gates are configurable per workflow and risk level.
- Audit logs are stored in PostgreSQL and linked to relevant documents.

#### Table: Agentic vs HITL Roles
| Workflow Step | Automated Agent | HITL Role | Escalation |
|---------------|-----------------|-----------|------------|
| Routine Compliance Check | Yes | Optional | No |
| Risk Document Update | Yes | Yes | Yes (high-risk) |
| Security Review | Yes | Yes | Yes (critical) |
| Regulatory Submission | No | Yes | Yes |
| Audit Trail Logging | Yes | Yes | Yes |

---

## Section 2 – Stakeholders and Concerns

| Stakeholder | Primary Concerns | Architectural Viewpoints |
|-------------|-----------------|-------------------------|
| **Quality Manager (Maria)** | Documents meet EU AI Act compliance standards; audit reports are downloadable PDF; HITL review trail is auditable | Functional, Process, Deployment |
| **Riskmanager (Sven)** | Responsible for high-risk product/issue risk management and approval; ensures compliance with EU AI Act and ISO standards; maintains audit trail and escalation logs; member of QM department | Functional, Process, Data |
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
│           (Modern Multi-Page SOTA UI Experience)             │
│   [Command Center] [The Bridge] [Artifact Lab] [Audit Log]   │
│                                                             │
│   Goal: The multi-page frontend is designed to fulfill trust, clarity, traceability, and speed—while feeling modern and uplifting. The visual style will use a white-blue-green colour palette to evoke trust, calm, and progress. Detailed UI requirements will be clarified later; for now, the mood-enhancing style and UX principles are prioritized.
│                                                             │
│   After login, the first page presents a left navigation pane with the following elements:
│     - Dashboard
│     - Documents (all types, powerful filtering)
│         - Authors (especially from SW development) are responsible for maintaining arc42 documentation.
│         - QM personnel, requirement engineers, product owners, etc. primarily work with rich text editors for governance and compliance documents.
│     - SOPs
│     - Forms & Records
│     - Risk (RMF / FMEA)
│         - Excel import/export must be supported for FMEA tables and related risk management records.
│         - Severity and probability scales must be configurable per product; recommendations and explanations should be available via the Help page for main parts and terminology.
│     - Architecture (arc42)
│     - Reviews
│         - For the MVP, lighter approvals are requested; 21 CFR Part 11-style e-signatures and strict audit controls are out-of-scope for now.
│     - Help
│         - The Help page shall include a short description and explanation (max 3 sentences) of main QM terminology, ISO norms (ISO 42001, ISO 27001), NIS2, and EU AI Act.
│         - It must be possible to add further topics and items to the Help page; content must be editable and stored in the PostgreSQL database.
│     - Admin (Products, roles, risk scales)
│                                                             │
│   fetch() → /api/v1/* endpoints                       │
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
└──────┬──────┘  └────────┬──────┘  └──────────┬────────────┘
       │                  │                    │
       │                  │          ┌─────────▼────────────┐
       │                  │          │   Persistence Layer   │
       │                  │          │                      │
       │                  │          │  - PostgreSQL (P0)   │
       │                  │          │  - Audit Logs (Art12)│
       │                  │          └──────────────────────┘
       │                  │
┌──────▼──────────────────▼──────────────────────────────────┐
│                  AI Agent Layer (Optional LLM)              │
│   DocumentCheckAgent          ComplianceCheckAgent          │
│   - wraps DocumentAnalyzer   - wraps ComplianceChecker      │
│   - optional LLM call        - optional LLM call            │
│   - structured prompt        - structured prompt            │
│   - result parsed to model   - result parsed to model       │
└─────────────────────────────────────────────────────────────┘
                              │
                    [Multi-Provider LLM API]
                  (OpenAI, Anthropic, or others)
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
| `agents/doc_check_agent.py` | `DocumentCheckAgent` — wraps service + optional LLM |
| `agents/compliance_agent.py` | `ComplianceCheckAgent` — wraps service + optional LLM |

### 3.2 Process / Runtime View

**Document Analysis Sequence:**

```
Client          DocumentsRouter    DocumentAnalyzerService    [LLM API]
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
  │                   │                       │ LLM enrichment     │
  │                   │                       │ (OpenAI/Claude)    │
  │                   │                       │◄───────────────────│
  │                   │◄──────────────────────│                    │
  │                   │  DocumentAnalysisResult                    │
  │◄──────────────────│                       │                    │
  │  JSON response    │                       │                    │
```

**EU AI Act Compliance Check Sequence:**

```
Client          ComplianceRouter   ComplianceCheckerService   [LLM API]
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
  │                   │                       │ LLM enrichment     │
  │                   │                       │ (OpenAI/Claude)    │
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

**HITL Review & Fix Workflow Sequence (Art. 14 Traceability):**

```
Auditor         Client (UI)       HITL Service         PostgreSQL (DB)
  │                   │                 │                      │
  │ POST /review      │                 │                      │
  │ (Submit Verdict)  │                 │                      │
  │──────────────────►│ create_review() │                      │
  │                   │────────────────►│                      │
  │                   │                 │ INSERT ReviewRecord  │
  │                   │                 │ (Auditor, Timestamp) │
  │                   │                 │─────────────────────►│
  │                   │                 │                      │
  │ [If MODS_NEEDED]  │                 │                      │
  │                   │                 │ INSERT ModRequests   │
  │                   │                 │─────────────────────►│
  │                   │◄────────────────│                      │
  │◄──────────────────│  201 Created    │                      │
  │                   │                 │                      │
  │                   │                 │                      │
Developer       Client (UI)       HITL Service         PostgreSQL (DB)
  │                   │                 │                      │
  │ POST /fix         │                 │                      │
  │ (Submit Remedy)   │                 │                      │
  │──────────────────►│ update_fix()    │                      │
  │                   │────────────────►│                      │
  │                   │                 │ INSERT FixAction     │
  │                   │                 │ (Developer, Date)    │
  │                   │                 │─────────────────────►│
  │                   │                 │                      │
  │                   │                 │ UPDATE ReviewStatus  │
  │                   │                 │─────────────────────►│
  │                   │◄────────────────│                      │
  │◄──────────────────│  200 Success    │                      │
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
| **Cost Control** | Model selection and usage (ML, LLM, vLM, MoE) is monitored and limited | Quotas, rate limits, alerts, periodic review, preference for open-source/on-premise models | Usage quotas, logging, automated alerts, review policy, cost control enforcement |

---

## Section 5 – Architectural Decisions

### Authentication Approach (Phase 0)

For MVP/Phase 0, the architecture starts with API Key authentication for backend endpoints, providing simple and effective access control. Optionally, OAuth2 with a standard provider (e.g., Google, Microsoft, Auth0) can be added for user login and role-based access. This approach ensures traceability, auditability, and compliance with PRD/SAD requirements. LDAP/SAML for enterprise SSO is deferred to later phases as a future-to-do for large organizations.

| ID | Decision | Options Considered | Chosen Option | Rationale |
|----|----------|-------------------|--------------|-----------|
| **AD-1** | Backend framework | Flask, FastAPI, Django, Starlette | **FastAPI** | Async-native, Pydantic v2 native integration, automatic OpenAPI docs, type-checked route handlers, active ecosystem |
| **AD-2** | Data validation library | marshmallow, Pydantic v1, Pydantic v2, attrs | **Pydantic v2** | Type safety, FastAPI native, v2 performance improvements, strict mode available, field validators |
| **AD-3** | PDF generation | WeasyPrint, wkhtmltopdf, ReportLab, fpdf2 | **ReportLab** | Pure Python (no system-level dependencies), production-proven, rich layout control, no Chromium/Qt runtime required |
| **AD-4** | LLM integration model | Required dependency, optional dependency, not included | **Optional dependency** | KISS: rule-based core delivers compliance value without API key; Claude adds semantic depth when available; reduces adoption friction |
| **AD-5** | Storage backend | PostgreSQL, Redis, filesystem | **DB and Filesystem (MVP)** | For MVP: PostgreSQL DB setup and file storage, with ORM; reports/ directory for PDFs eg for exports or temporary local storage; in-memory dict storage for reviews and approved documents, Forms and SOPs, consistent storage at least before reboot or shutdown or triggered by user; documented path to PostgreSQL |
| **AD-6** | Input sanitisation | Custom regex, OWASP sanitiser, bleach, html.escape | **bleach** | Battle-tested, OWASP-aligned, configurable allow-lists, widely used in production; no custom security code |
| **AD-7** | Logging library | standard logging, loguru, structlog | **structlog** | JSON-structured output (required for EU AI Act Art. 12 logging compliance), processor pipeline, context binding |
| **AD-8** | Frontend framework | React, Vue, Angular, typscript, HTML/JS | **Modern Multi-page UI with React and tyscript** | KISS: build toolchain if necessary only, no npm, no bundler; tab navigation is simple enough for plain JS; reduces maintenance surface; changes possible according detailed frontend requirements |
| **AD-9** | Configuration management | os.environ, python-dotenv, pydantic-settings | **pydantic-settings** | Type-safe settings, native Pydantic v2 integration, `.env` file support, validation on startup |
| **AD-10** | Testing framework | unittest, pytest, hypothesis | **pytest** | Industry standard, rich plugin ecosystem (pytest-asyncio, pytest-cov), cleaner test syntax |

---

## Section 6 – Risks and Technical Debt

### 6.1 Identified Risks

| Risk ID | Risk | Probability | Impact | Mitigation | Timeline |
|---------|------|-------------|--------|------------|----------|
| **R-1** | Approved review records (HITL, SOP, risk) not persisted to PostgreSQL DB | **HIGH** | **MEDIUM** | Mandatory: All approved records must be stored in PostgreSQL DB; no approved document is lost; enforce as architectural requirement | Immediate |
| **R-2** | Documents (HITL reviews, SOPs, risk records) not persisted to DB at account session end (logout, app exit, shutdown) | **HIGH** | **MEDIUM** | Mandatory: All documents of mentioned types must be stored in PostgreSQL DB at session end; enforce as architectural requirement; no data loss on logout/app exit/shutdown | Immediate |
| **R-3** | Model API rate limits or outage (Anthropic, OpenAI, vLM, MoE, etc.) | **MEDIUM** | **LOW** | Graceful fallback to rule-based core; cost control enforced for all model APIs; monitoring and alerting for outages and quota breaches | Already mitigated |
| **R-4** | Large file (>10 MB) blocks event loop | **MEDIUM** | **MEDIUM** | 10 MB limit enforced; background tasks + streaming in Phase 2; UI feedback for file status is an architectural requirement (app user must be informed if file is too large); system improvement is a future-to-do in Phase 2 | Phase 2 |
| **R-5** | No authentication and authorisation for app login and critical actions | **HIGH** | **HIGH** | Authentication and authorisation are mandatory for app login and all HITL, risk, and compliance workflows; enforce as architectural requirement for traceability and auditability | Immediate |
| **R-6** | arc42 section detection false negatives | **MEDIUM** | **MEDIUM** | Regex patterns cover common heading styles; LLM enrichment covers non-standard headings; HITL review ensures completeness | Ongoing |
| **R-7** | PDF file accumulation in local reports/ dir | **LOW** | **LOW** | Manual cleanup; scheduled cleanup task in Phase 2; UI indicator for report status | Phase 2 |
| **R-8** | EU AI Act guidance updates requiring rule changes | **LOW** | **HIGH** | Requirements engine is data-driven (list of dicts); updates require only data changes; HITL review for regulatory changes | On guidance release |
| **R-9** | Cost overruns from model/API usage (LLM, vLM, MoE) | **MEDIUM** | **MEDIUM** | Usage quotas, rate limits, logging, automated alerts, periodic review, preference for open-source/on-premise models | Ongoing |
| **R-10** | HITL review not enforced for all workflows | **MEDIUM** | **HIGH** | HITL review is mandatory at workflow end; gates are configurable for additional review points; UI/UX supports status indicators and audit trail | Ongoing |
| **R-11** | Risk management traceability gaps | **MEDIUM** | **HIGH** | Ensure all risk records, updates, and approvals are versioned, linked, and auditable; UI/UX supports search/filter and audit trail visibility | Ongoing |

### 6.2 Technical Debt

| Item | Debt Type | Impact | Payoff Plan |
|------|-----------|--------|-------------|
| In-memory HITL review store | Architecture | Reviews lost on restart | PostgreSQL persistence, Phase 0 |
| No database layer | Architecture | No query/filter capability | PostgreSQL, Phase 0 |
| No authentication | Security | Internal deployment only | OAuth2/API key, Phase 0 |
| No integration tests | Testing | Route-level bugs undetected | TestClient tests, >= Phase 1 |
| No CI/CD pipeline | Operations | Manual test/deploy | GitHub Actions, Phase 2 |
| No Docker image | Operations | Non-reproducible deployment | Dockerfile, Phase 2 |
| No file storage backend | Architecture | Reports stored on local FS | At least: PostgreSQL for approved reports, Phase 0 |
| LLM prompt not version-controlled | Maintainability | Prompt drift | Prompt registry, Phase 2 |

---

## Section 7 – Constraints

### 7.1 Technical Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Python version | ≥3.11 | Required for `str | None` union syntax, `tomllib`, improved typing |
| Anthropic API key | Optional | Must work without it or other LLM types; LLM is expeted to be used for some tasks |
| EU AI Act Art. 9–15 | Must be checkable by rule-based engine | Legal requirement; no LLM dependency for compliance |
| PDF output | Must be audit-submission ready | EU AI Act evidence package requirement |
| File size limit | Configurable (default 10 MB) | Performance constraint; DoS prevention |
| Filesystem dependency | `reports/` and `templates/` directories | MVP simplicity workflow for local storage of app user; external storage required as well at least for approved, versioned document(PostgreSQL)|
| CORS (Cross-Origin Resource Sharing) | Restricted to explicit origins | Browser security requirement |

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
- EU AI Act (Regulation (EU) 2024/1689), Arts. 9–15, 43, 72, Annex III, Annex IV; https://artificialintelligenceact.eu/
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
2. arc42 documents are in markdown or plain text format. For binary DOCX/PDF parsing, the architecture starts with PyPDF2/python-docx in Phase 0 (MVP), and is designed to allow easy switching to NVIDIA Nemotron (or other advanced models) via configuration. This modular approach supports reliable MVP delivery and future extensibility for production-grade document ingestion.
3. The rule-based compliance engine is deterministic for the same input; LLM enrichment may produce slightly different outputs across runs (non-deterministic by nature).
4. `reports/` directory is writable by the uvicorn process; filesystem persistence of PDFs exists locally for user, final approved report result shall be stored in DB for MVP.
5. `templates/sop/` markdown files are static for MVP; template versioning is a Phase 2 concern.
6. CORS origins `localhost:3000` and `localhost:8000` are sufficient for MVP; production deployment behind a reverse proxy will require CORS origin update.
7. In-memory `_review_store: dict` in `hitl_workflow.py` is acceptable for MVP with documented risk (R-1 above).
8. The LLM API client is initialised only when a supported `API_KEY` (OpenAI, Anthropic, etc.) is set; no API calls are made without an explicit key.

---

## Open Questions

1. **PDF digital signatures:** Should generated reports include pyhanko digital signatures for audit integrity?
2. **Horizontal scaling:** What triggers the move from single-instance to horizontally scaled deployment? (Candidate trigger: >50 documents/day)

---

## API Overview

The application exposes a RESTful API with the following main routes (for traceability):
- `/api/v1/documents` — Document upload, analysis, and retrieval
- `/api/v1/compliance` — Compliance checking and regulatory mapping
- `/api/v1/reports` — PDF report generation and download
- `/api/v1/templates` — Template listing and retrieval
- `/api/v1/research` — Regulatory research and evidence gathering
- `/api/v1/reviews` — HITL review creation, update, and listing

All routes are versioned and documented for traceability and audit purposes.

---

## Future-To-Do Topics

- LDAP/SAML authentication for enterprise SSO (recommended for large organizations, deferred to Phase 2+)
- Scheduled cleanup task for PDF file accumulation in reports/ directory (storage management, Phase 2)
- Integration tests for route-level bugs (Phase 2)
- CI/CD pipeline setup (Phase 2)
- Docker image and file storage backend (Phase 2+)
- Prompt registry for LLM version control (Phase 2)

---

## Audit

```Python
persona=system-arch
action=update-sad-v0.7.0-agentic-ux-multillm
timestamp=2026-3-15
adapter=AAMAD-vscode
artifact=project-context/1.define/sad.md
version=0.8.0
status=complete
```
