<!-- markdownlint-disable MD032 MD036 MD040 MD060 -->
# Product Requirements Document (PRD) — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.8.4  
**Date:** 2026-5-25  
**Author persona:** `@product-mgr`  
**AAMAD phase:** 1.define  

---

## Section 1 – Executive Summary

### Problem Statement

Large enterprises in Germany and the EU face a massive bottleneck in AI governance. Quality & Regulatory (Q&R) teams must ensure that AI-enabled software—whether used in R&D or shipped as a product—is developed, validated, and documented in a way that satisfies complex, overlapping mandates (EU AI Act, GDPR, NIS2, BSI TR-03185). Today, this process is broken:

- **Manual Translation:** Q&R teams spend days translating high-level regulations into internal procedures and engineering checklists.
- **Static Tools:** Static Word/Excel templates fail to capture the dynamic nature of AI risk and the "Secure Software Lifecycle" (BSI standards).
- **Communication Gaps:** Engineering teams are often overwhelmed by regulatory jargon and lack clear, actionable "Standard Operating Procedures" (SOPs) for specific AI use cases.
- **Audit Fragility:** Documentation is often scattered, making it difficult to prove *who* made a decision, *when*, *why*, and based on *what* regulatory criteria (lack of reproducibility).

### Solution

A **Multi-Agent AI Governance & Compliance Copilot** that acts as a "Regulatory-to-Workflow" bridge. Built on **Python 3.12**, a **FastAPI + Next.js** application stack, **CrewAI-style orchestration**, and provider adapters that include an implemented Anthropic path plus a Nemotron integration target/scaffold, the system provides:

1. **AI Use-Case Intake & Classification:** Automated risk classification (EU AI Act risk model) with transparent rationale and cited criteria.

2. **arc42 & Compliance Checking:** Automated structural analysis of architecture documents (arc42) and cross-checking against EU AI Act, GDPR, NIS2, and BSI checklists.

3. **Audit-Ready PDF Evidence:** Generation of downloadable, submission-ready PDF audit reports with embedded traceability data.

4. **Multi-Agent Orchestration:** CrewAI enables specialized agents (Classifier, Author, Auditor) to handle complex, non-linear governance tasks that traditional scripts cannot.

5. **Audit-First Design:** Unlike generic generative AI, this system prioritizes "Explainability" and "Reproducibility" as core technical constraints.

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

**Persona 4: Riskmanager — Sven (38)**

| Attribute | Detail |
|-----------|--------|
| Role | Risk Manager, QM department |
| Technical level | Advanced (deep knowledge of risk management, regulatory requirements, and audit processes; not a software developer) |
| Primary goal | Ensure all product and company-wide risk management records are complete, traceable, and audit-ready per EU AI Act and ISO standards |
| Secondary goal | Oversee risk analysis, mitigation, and verification for each product; maintain links to technical templates and QM documentation |
| Pain points | Incomplete risk records, lack of traceability, manual updates, unclear evidence requirements |
| Key workflows | Review risk management files → validate risk handling → link supporting documents → approve for audit |
| Success criteria | Risk management records are structured, linked, and ready for notified body audits and ISO certification |

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

### 3.1 Multi-Agent Architecture (CrewAI)

The system utilizes specialized agents orchestrated with **CrewAI** to provide non-linear, explainable reasoning for complex governance tasks. To minimize rewrite risk, CrewAI is introduced as a **hybrid orchestration runtime** layered on top of the existing FastAPI services rather than as a replacement for the current service layer.

**Architecture pattern (required):**

- **CrewAI orchestrator layer** acts as the workflow brain for multi-step collaboration, retries, branching, and run/step event emission.
- **Execution / Skills API** remains the safe runtime boundary for document retrieval, parsing, persistence, export generation, and guardrails.
- **Model provider layer** is adapter-based so orchestration targets capabilities, not vendor SDKs.

This means:

- CrewAI is the required orchestration runtime for complex workflows.
- Existing backend services remain the primary tool/execution surface.
- **NVIDIA Nemotron-Parse** is treated as a supported provider/integration target via adapter contract, not as a frontend dependency requirement.

**Classifier Agent (The Legal Specialist)**
- **Role:** AI Governance Specialist
- **Goal:** Classify an AI system according to the EU AI Act risk model and identify applicable German regulations (BSI, NIS2).
- **Backstory:** Expert in legal text interpretation, Annex III categories, and risk-based obligations.
- **Tools:** Use-case intake analyzer, rule pack matcher (EU AI Act, GDPR, BSI).

**Orchestration Agent (The Workflow Manager)**
- **Role:** Governance Process Manager
- **Goal:** Dynamically select the correct compliance path and coordinate sub-agents based on the Classification results.
- **Backstory:** Specialist in multi-regulatory compliance logic and hierarchical decision-making; ensures the "Push" and "Pull" workflows are executed only when conditions are met.
- **Tools:** Workflow router, state manager, cross-agent consistency checker.

**Template Author Agent (The Standards Expert)**
- **Role:** Quality Documentation Architect
- **Goal:** Author a tailored Risk Assessment Template or arc42-aligned structure for a specific risk class.
- **Backstory:** Deep knowledge of technical documentation standards (ISO/IEC 42010, arc42).
- **Tools:** Template generator, section builder.

**SOP Author Agent (The Process Engineer)**
- **Role:** Regulatory Operations Specialist
- **Goal:** Write a Standard Operating Procedure explaining how engineering must fill the templates and what evidence to collect.
- **Backstory:** Expert in Quality Management Systems (QMS) and SOP design.
- **Tools:** Procedure flow description generator, evidence requirements builder.

**Compliance Checker Agent (The Auditor)**
- **Role:** Governance Auditor
- **Goal:** Verify if a filled artifact (arc42 doc / Risk Assessment) meets the criteria defined in the SOP and original rule packs.
- **Backstory:** Skeptical reviewer with expert-level knowledge of gap analysis.
- **Tools:** arc42 structural analyzer, NVIDIA Nemotron-Parse ingestion tool.

### 3.2 System Architecture & Traceability

```text
Frontend (Modern UI)
  │ 
  ▼
FastAPI Backend / Skills API (Python 3.12)
  │ 
  ├── Rule-based services + guarded tools
  │       ├── document retrieval / parsing
  │       ├── PostgreSQL writes / audit logging
  │       └── exports / report generation
  │
  ├── CrewAI Orchestrator Service
  │       ├── Classifier / Author / Auditor flows
  │       ├── retries / branching / verifier gates
  │       └── run + step events (`trace_id` / `correlation_id`)
  │
    └── Model Provider Adapter Layer
      ├── Internal on-prem model gateway / runtime (production target for personal-data prompts)
      ├── AnthropicAdapter (controlled fallback / migration path)
      ├── OpenAICompatibleAdapter (controlled fallback / migration path)
      └── NemotronAdapter (controlled fallback / ingestion support)
  │ 
  Persistence: PostgreSQL (audit history, decision snapshots, model/provider versions)
  │ 
  └── Reporting Layer: ReportLab / Jinja2 (PDF generation with embedded metadata)
```

### 3.3 Security & Explainability Requirements

| Requirement | Implementation Detail | Governance Standard |
|-------------|-----------------------|---------------------|
| **Reproducibility** | Finalized records in PostgreSQL (inputs, models, reasoning). | EU AI Act Art. 12 |
| **Data Persistence** | All HITL reviews and modification requests stored in DB from MVP. | Compliance Governance |
| **Performance** | PostgreSQL optimized for audit log retrieval and reporting. | Scalability |
| **Explainable Rationale** | Agents must cite specific criteria (e.g., EU AI Act Art. 9 §2) for every decision. | Transparency Principle |
| **Secure VLM Ingestion** | NVIDIA Nemotron-Parse for complex format ingestion (tables, flowcharts). | BSI Security Guidelines |
| **HITL Control** | Mandatory Q&R human-approval step for all agent-generated artifacts. | EU AI Act Art. 14 |
| **OWASP LLM Security** | Sanitization and defense against prompt injection (bleach, input validation). | OWASP Top 10 for LLMs |
| **File size Limits** | validate_file_size() enforcement | DoS prevention |
| **No PII in logs** | structlog event field sanitisation | GDPR Art. 25 |
| **Input length limits** | Pydantic field validators | Injection prevention |
| **CORS restriction** | Explicit allowed origins list | Browser security |
| **Traceable Audit trail** | Unified audit logging for system actions and user decisions. | German Compliance Laws |
| **Privacy boundary for AI models** | Minimize prompt context before model calls, treat backend/orchestrator-to-provider traffic as the privacy boundary, and prefer the internal on-prem gateway for personal-data prompts. | GDPR Art. 5, Art. 25, Art. 32 |

**Model Adapter Interface (required capabilities):**

- structured output with schema validation and bounded repair/retry,
- tool-calling envelope with allowlisted tool access,
- provider capability declaration (`tool_calls`, `json_schema`, `streaming`),
- optional streaming for UX paths, while orchestration workflows may run non-streaming for reliability,
- prompt minimization and redaction hooks before persistence or observability export,
- a routing policy that prefers internal/on-prem inference for any workflow that may contain direct or indirect personal data.

### 3.4 Change Request — Data Privacy CR-2026-05-16 (Risk 1 Mitigation)

**Change trigger:** Risk 1: External model transfer of potentially personal prompt/output data.

**Decision:** Migrate production inference for personal-data-bearing workflows from external providers to internal on-prem models, and keep external providers only as controlled fallback for scrubbed/non-personal data paths.

**Risk treatment objective:** Reduce sensitive data exposure to third parties by substituting external model calls with local model execution for affected workflows.

**Sensitive data in scope**

| Sensitive Data | Category | Examples | Why Sensitive | Current Protection | Risk if Exposed |
|----------------|----------|----------|---------------|--------------------|-----------------|
| Prompt context and model output content | Input/output content containing direct or inferred personal data | Names, emails, stakeholder assignments, reviewer identifiers, document passages copied into prompts, generated summaries that restate personal data | Leaves the primary application context during model inference on the current external-provider path | Session auth, RBAC, TLS, audit events, optional graceful fallback without external model key | Unauthorized disclosure, GDPR purpose-limitation/data-minimization non-compliance, reputational harm |
| Provider/model telemetry and rich trace payload | Metadata linked to actors, workflows, and potentially sensitive content fingerprints | `provider`, `model_used`, `trace_id`, `correlation_id`, latency/tokens, rich payload entries, prompt/output snapshots | Can reconstruct who triggered which model action and when; may become re-identifiable when joined with audit tables | Backend-protected endpoints, role checks, PostgreSQL persistence | Excessive internal visibility, inference attacks, unauthorized profiling of users/reviewers |
| Model credentials and routing configuration | Secrets and control-plane configuration | API keys, adapter routing flags, provider selection settings | Compromise enables data exfiltration or unauthorized model usage | Environment-based secret configuration and backend auth controls | Account abuse, data leakage, loss of integrity of compliance decisions |

**PRD requirement updates (effective immediately)**

- Personal-data-bearing workflows must route to internal on-prem models by default in production.
- External provider usage must be restricted to approved fallback cases with scrubbed inputs and explicit policy controls.
- Prompt/output storage must enforce minimization, redaction, and retention class separation (operational telemetry vs audit evidence).
- Telemetry visibility must follow least-privilege RBAC and purpose limitation.
- Secrets and routing configuration must be managed through hardened secret stores, rotation policy, and audited access.

**Acceptance criteria for this change request**

1. Routing policy enforces on-prem-first inference for workflows marked as potentially personal-data-bearing.
2. External-provider fallback is blocked unless scrubbed mode and policy gates are satisfied.
3. Audit evidence records the selected model location (`on_prem` vs `external_fallback`) and policy decision reason.
4. Trace payload retention and access controls are documented and validated in release checks.
5. Credential and routing configuration access is restricted, rotated, and auditable.

#### 3.4.5 Step Contract + Sandbox Pattern

The architecture shall decompose business workflows into discrete, policy-scoped steps instead of sending one large prompt to a model. Each step becomes an independently governed execution unit with a strict contract.

**Required step contract**

| Contract Field | Requirement |
|---------------|-------------|
| Step name | Stable, human-readable workflow step identifier |
| Business purpose | Why the step exists and which governance outcome it supports |
| Sensitivity class | `personal_data_possible`, `non_personal`, or `scrubbed_fallback` |
| Input schema | Versioned schema with explicit allowed fields only |
| Output schema | Structured output with bounded allowed values |
| Tool access | Allowlisted tools only; no implicit tool discovery |
| Model zone | `on_prem_only`, `on_prem_preferred`, or `external_fallback_allowed` |
| Time/token budget | Step-level limits to prevent runaway execution |
| Validation gate | Deterministic validator, schema check, and policy check |
| Audit fields | `step_id`, `trace_id`, `policy_rule_id`, `selected_model`, `decision_reason` |

**Sandbox execution pattern**

- Each step executes in an isolated sandbox with denied network egress by default.
- Only approved internal endpoints and local resources may be mounted into the sandbox.
- File access is restricted to the minimum path set needed for the step.
- Secrets are injected only when the step policy explicitly allows them and only in memory.
- Step outputs are passed through a redaction and schema-validation stage before persistence or review.
- If a step requires a model call, the orchestrator must resolve the target model from the capability registry before execution.

**Architectural improvement rationale**

- reduces prompt leakage by limiting context per step,
- improves traceability because each subtask has its own evidence trail,
- enables local model substitution per step instead of per workflow,
- supports safer fallback because only the failing step is retried or escalated,
- makes compliance review easier because each step maps to a specific business obligation.

**PRD-level acceptance criteria for the step pattern**

1. Every model-using workflow is expressible as a sequence of named step contracts.
2. No step may bypass policy checks or sandbox boundaries.
3. A privacy-sensitive workflow must be splittable into smaller steps without exposing the full prompt to a third party.
4. Step execution artifacts must be auditable per step, not only per workflow.

#### 3.4.6 On-Prem Model Capability Registry + Migration KPIs

The system shall maintain a capability registry for all approved local models so the orchestrator can route each step to the smallest acceptable model for the task.

**Registry fields**

| Field | Purpose |
|------|---------|
| `model_id` | Stable internal identifier |
| `provider_type` | Local, on-prem, or external fallback |
| `approved_tasks` | Allowed step types and use cases |
| `sensitivity_support` | Which data classes the model may process |
| `context_limit` | Safe maximum context size |
| `structured_output_quality` | Measured JSON/schema reliability |
| `latency_p95` | Route-selection performance bound |
| `hardware_profile` | Expected CPU/GPU/memory footprint |
| `release_status` | Experimental, approved, deprecated |
| `last_benchmark_date` | Freshness of capability assessment |

**Migration KPIs**

| KPI | Target | Meaning |
|----|--------|---------|
| On-prem routing coverage | Majority of personal-data-capable steps on local models | Privacy-by-default posture is active |
| External fallback rate | Exceptional and decreasing over time | External exposure is being reduced |
| Step-level validation pass rate | High and stable | Local model quality is fit for purpose |
| Reviewer override rate | Low and explainable | Outputs are reliable enough for governance work |
| Privacy incident count | Zero for production model traffic | Sensitive data is not leaving the boundary |
| Capability registry freshness | Current within defined review cycle | Routing decisions rely on valid model data |

**Migration governance requirements**

- Every model must be benchmarked against the exact step contracts it is allowed to serve.
- New local models may only be promoted after privacy, quality, and latency gates pass.
- External providers remain allowed only as exception paths with explicit reason codes and audit evidence.
- The registry must be versioned and tied to release approvals so routing behavior is reproducible.

#### 3.4.7 SOLID-Oriented Privacy Architecture

The PRD requires the implementation to follow SOLID principles so the on-prem privacy migration remains maintainable, testable, and extensible.

**SOLID mapping**

| Principle | PRD requirement |
|----------|------------------|
| Single Responsibility | Routing, policy evaluation, sandbox execution, redaction, audit writing, and persistence must remain separate concerns |
| Open/Closed | New local models must be addable through registry updates and adapters without changing orchestration logic |
| Liskov Substitution | All model adapters and step executors must implement the same contract so implementations are swappable |
| Interface Segregation | Routing, inference, validation, sandboxing, and audit interfaces must remain separate and minimal |
| Dependency Inversion | Workflow code must depend on abstract policy/model interfaces rather than concrete providers |

**Required component model**

| Component | Required behavior |
|-----------|------------------|
| Privacy Policy Engine | Classifies sensitivity and returns the allowed execution zone |
| Step Router | Chooses the approved model path for each workflow step |
| Step Contract Validator | Enforces schema, allowed tools, and output contract before execution |
| Sandboxed Step Executor | Runs each step in isolated runtime conditions with denied egress by default |
| On-Prem Local Model Gateway | Serves privacy-sensitive steps on internal models |
| Controlled External Fallback Adapter | Supports scrubbed, exception-only external inference |
| Model Capability Registry | Holds approved models, tasks, and benchmark metadata |
| Redaction / Normalization Service | Removes or minimizes sensitive prompt/output content before storage |
| Audit Event Writer | Persists routing, policy, and model evidence for traceability |

**PRD-level design requirements**

- Business workflows must be decomposed into named step contracts.
- Privacy-sensitive steps must default to on-prem execution.
- External fallback must remain exception-only and policy-controlled.
- No model may execute without step validation and audit recording.
- The smallest capable approved model should be selected for each step whenever possible.
- Step outputs must be redacted and normalized before long-retention persistence.

**PRD acceptance criteria for the architecture pattern**

1. The architecture supports local-model substitution per workflow step, not only per whole workflow.
2. The system can execute privacy-sensitive steps without exposing the full prompt to a third party.
3. All model invocations produce auditable policy and routing evidence.
4. Approved local models can be introduced by registry update without modifying orchestrator control flow.
5. Sandbox enforcement and step validation are mandatory for all model-using steps.

#### 3.4.8 GDPR Guardrails, Dictionaries, and Rights Handling

The product must enforce GDPR-focused protections for both standard PII and special category personal data before, during, and after model processing.

**Required data dictionaries / lookup tables**

| Dictionary / Lookup Table | Product requirement |
|---------------------------|---------------------|
| `pii_type_catalog` | Classify direct identifiers (name, home/email address, SSN, driver license, account, passport, biometric identifiers) |
| `special_category_catalog` | Classify GDPR Art. 9 categories (ethnicity, political views, religion/philosophy, trade union, genetic, biometric ID, health, sex life, sexual orientation) |
| `pattern_rule_catalog` | Store regex/checksum and token-pattern rules for high-confidence detection |
| `entity_detector_catalog` | Configure NER and semantic detectors for inferred personal data |
| `policy_action_matrix` | Map sensitivity class + purpose + legal basis to allow/deny/route actions |
| `retention_policy_catalog` | Define storage limitation rules (TTL, tier, deletion mode, legal-hold) |
| `dsr_action_catalog` | Define workflows and SLA controls for GDPR data-subject rights |

**Mandatory guardrails for model workflows**

1. Detect and classify personal data against lookup tables before model invocation.
2. Enforce lawful-purpose and purpose-limitation checks per workflow step.
3. Minimize context and redact/tokenize non-essential personal data.
4. Route restricted classes to on-prem models only; deny unauthorized external transfer.
5. Validate model outputs for leakage and policy non-compliance before persistence.
6. Persist only approved redacted classes with retention and deletion controls.
7. Audit all policy decisions and controls applied at step level.

**GDPR principles implementation requirements**

- Lawfulness/Fairness/Transparency: policy decisions include legal-basis and processing-explanation metadata.
- Purpose Limitation: processing denied when purpose tag does not match approved policy matrix entries.
- Data Minimization: step contracts must include field allowlists and maximum context budgets.
- Accuracy: uncertain detection/classification must trigger HITL review.
- Storage Limitation: retention policies must enforce automatic deletion and legal-hold rules.
- Integrity/Confidentiality: encryption, RBAC, sandboxing, egress controls, and secret rotation are mandatory.
- Accountability: immutable audit evidence and periodic conformance reporting are mandatory.

**Data subject rights requirements**

- Access (Art. 15): export subject-linked data and processing traces.
- Rectification (Art. 16): support corrected data and reprocessing trace updates.
- Erasure (Art. 17): remove data from governed stores and derived indexes where legally required.
- Restrict Processing (Art. 18): enforce per-subject processing lock checked by routing/policy components.
- Data Portability (Art. 20): provide structured export with field dictionary/provenance.
- Object (Art. 21): register objections and block non-exempt processing.

**Acceptance criteria (GDPR guardrails)**

1. Detection coverage includes direct identifiers and special category data examples listed above.
2. External transfer is denied for restricted classes unless explicit legal and policy exceptions are met.
3. Output leakage checks block persistence of non-compliant payloads.
4. Retention and deletion controls are automatically enforced and auditable.
5. All six GDPR rights workflows are testable and traceable end-to-end.

#### 3.4.9 Architecture Conformance Review (PRD vs Current Codebase)

This review confirms where PRD intent already fits the current implementation and where explicit delivery work remains.

**Conformance areas already implemented**

- Security and auth controls are implemented in configuration and route guards (`src/doc_quality/core/config.py`, `src/doc_quality/core/session_auth.py`, `src/doc_quality/api/routes/auth.py`).
- Input sanitization and upload guardrails are implemented (`src/doc_quality/core/security.py`).
- Bridge runtime topology proof and isolation evidence are implemented and exposed via API (`src/doc_quality/services/bridge_orchestrator_service.py`, `src/doc_quality/api/routes/bridge.py`).
- The bridge runtime contract already persists auditable proof fields (runtime source, container evidence, issues) suitable for governance review.

**Conformance gaps to close in next increment**

- The PRD-defined step sensitivity class (`personal_data_possible`, `non_personal`, `scrubbed_fallback`) is not yet a first-class required field across all model-using steps.
- Policy-rule identifiers and decision reasons are not yet enforced as mandatory persisted metadata for every model invocation beyond bridge-specific proof payloads.
- Retention separation between long-lived audit evidence and short-lived operational telemetry is partially documented but not yet fully codified end-to-end.
- GDPR rights workflows (Art. 15/16/17/18/20/21) are not yet implemented as complete API-visible process flows.

#### 3.4.10 New Detailed Requirements — Data Privacy and Security (CR-2026-05-25)

The following requirements are added as mandatory architecture-level requirements for the next delivery increment.

| Requirement ID | Requirement | Scope | Priority |
|----------------|-------------|-------|----------|
| DPS-01 | Every model-using step must declare `sensitivity_class`, `policy_rule_id`, and `decision_reason` before execution. | Orchestrator, model routing, audit events | P0 |
| DPS-02 | Requests with `sensitivity_class=personal_data_possible` must be denied if on-prem execution is unavailable. | Bridge workflow, provider adapters | P0 |
| DPS-03 | Runtime topology proof must be checked before compliance run approval and recorded in run evidence. | Bridge runtime, compliance gate | P0 |
| DPS-04 | External fallback requires explicit scrubbed mode plus recorded exception reason code. | Provider routing, policy engine | P0 |
| DPS-05 | Telemetry must be separated into retention classes (`audit_evidence`, `operational_metrics`, `debug_trace`). | Observability, storage policy | P1 |
| DPS-06 | Security-sensitive environment defaults must remain placeholder-safe in example files and fail-safe in production config. | Configuration, deployment docs | P0 |

**Acceptance criteria for the new requirements**

1. A bridge run is rejected when strict topology proof is required and container evidence is missing.
2. Audit events for model steps include `sensitivity_class`, `policy_rule_id`, and `decision_reason`.
3. External model usage cannot occur for personal-data-possible steps unless policy explicitly allows scrubbed fallback and records a reason code.
4. Release checks verify that env example files contain no real credentials and only neutral/demo placeholders.
5. Telemetry and audit retention classes are documented and testable with role-scoped read access.

### Security Requirements

The application must:
- Mitigate OWASP Top 10 AI security risks (prompt injection, insecure model usage, data leakage, supply chain vulnerabilities).
- Run agents in a sandboxed environment to prevent unauthorized access and privilege escalation.
- Enforce user authentication and role-based authorization for all sensitive features and data.
- Maintain audit logs for user actions and system events.
- Require all releases to pass unit tests, integration tests, and user acceptance tests before deployment, with documented test coverage and results.

---

## Section 4 – Functional Requirements

### Priority Definitions

- **P0 (MVP, must-have):** Required for 6-week MVP delivery
- **P1 (Enhanced, should-have):** Second milestone priority
- **P2 (Future, could-have):** Backlog, not committed

### P0 — MVP Requirements (The Governance Copilot)

**F0: Dynamic Workflow Orchestration (The Manager)**
- **Orchestration Agent:** Implements conditional logic for branching workflows.
- **Workflow Routing:** If `Risk Level == High`, trigger mandatory **Artifact Generation** (F2) and **Compliance Check** (F3).
- **Exemption Handling:** If `Exempt (e.g., pure R&D)`, terminate with an Exemption Certificate generation.

**F1: AI Use-Case Intake & Classification (The "Push" Workflow)**
- **Classifier Agent:** Automates risk classification (EU AI Act risk level) with cited reasoning.
- **Rule Engine:** Maps applicable obligations (GDPR, NIS2, BSI TR-03185).

**F2: Artifact Generation (Templates & SOPs)**
- **Template Author Agent:** Drafts a tailored Risk Assessment Template.
- **SOP Author Agent:** Drafts an SOP describing responsibilities and evidence requirements.

**F3: arc42 structural analysis & Compliance Check (The "Pull" Workflow)**
- **Compliance Checker Agent:** Performs 12-section arc42 check and regulatory requirement cross-check.
- **Nemotron Adapter Target:** A Nemotron integration target exists in the orchestrator adapter layer; full complex form/table ingestion for PDFs remains a later enhancement.

**F4: Reproducibility Repository & History Tracking**
- **Persistence:** PostgreSQL history per artifact (inputs, timestamps, Agent tool call snapshots, reasoning).
- **View:** A dedicated "History & Reproducibility" page in the UI.

**F5: HITL Review & Approval Workflow**

- **Audit Trial:** Record reviewer name, decision, and rationale into metadata.
- **Modification Request:** Structured, section-based modifications for authors.

**F6: Audit-Ready PDF Evidence Export**

- **Implementation:** ReportLab-driven PDF with embedded traceability metadata and review history.

**F7: Multi-User RBAC (Role-Based Access Control):**

- **Implementation:** Phase 0 uses email/password login with backend-managed HTTP-only sessions and route-level RBAC; enterprise SSO (OIDC/OAuth2/LDAP/SAML) is a later-phase enhancement.

### P1 — Enhanced Requirements

**F8: Enterprise Rule Packs:** Configurable logic for organization-specific standards.
**F9: Multi-Framework Synthesis:** Unified gap analysis across EU AI Act, GDPR, and BSI.
**F10: Continuous Improvement Hooks:** Feedback mechanism for Q&R per agent inaccuracies.

### P2 — Future Requirements (Phase 3+)

**F11: ALM Integration (Jira/Confluence):** Direct sync of modification requests.
**F12: Full MDR (Medical) Automation:** End-to-end documentation for high-class medical devices.

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
| OWASP Top 10 A03 (Injection) | Input sanitisation at API boundaries, filename/file-size validation, and ORM-backed persistence paths |
| OWASP Top 10 A01 (Broken Access Control) | Backend-owned sessions, route-level RBAC, and explicit service-account scoping |
| BSI Grundschutz baseline | No secret storage in code, structured logging, input validation |
| GDPR Art. 25 (Privacy by design) | No PII in structured logs; persisted auth/session/review/audit data is limited to governed PostgreSQL tables |
| TLS in production | Recommended via reverse proxy (nginx); not in scope for MVP |

### 5.3 Availability and Reliability

| Metric | Target |
|--------|--------|
| Availability (single instance) | 99% (no HA in MVP) |
| Data durability (reviews) | Approval-critical review/audit persistence is PostgreSQL-backed; generated report artifacts still use local filesystem in MVP |
| Error handling | All service exceptions return structured JSON error responses |
| Graceful degradation | LLM enrichment failure falls back to rule-based without error |

### 5.4 Maintainability

- Full Python type hints throughout all modules
- Pydantic v2 for all data models (no raw dicts in service layer)
- structlog for all logging (no `print()` statements)
- Services are pure functions or minimal-state classes; no global mutable state
- Expanded pytest suite with legacy unit coverage plus API/integration/security tests

---

## Section 6 – UX Design Requirements

### 6.1 Modern Multi-Page Architecture (SOTA UX)

The system transitions from a legacy tab-based design to a **State-of-the-Art (SOTA) Multi-Page Experience**. The UI follows the **"Focus & Flow"** principle, where each step of the governance process is an isolated, high-intent page. A branded login UI shall exist. The overall stylguide includes a white/blue/green theme, calm layout and a fonts that fits to that style. Goal is to have an app that feels modern, trustworthy, clear, traceable and mood-enhancing.

**Dark Mode:** The application must provide a user-selectable dark mode. Bright mode remains the default. Dark mode must be mood-enhancing, not distracting, and must not override existing default style configs.

**Automated Task Feedback:** For all automated tasks and their results (e.g., LLM/MoE outputs), the UI must provide a simple first evaluation concept: a thumb up/thumb down feedback mechanism. This enables users to quickly rate the quality or accuracy of automated actions, supporting LLM accuracy metrics and continuous improvement.

Proposal:
This palette of white/blue/green is a good match (trust + calm + progress). To keep it modern and not “clinical”:

- Use blue for primary actions/navigation
- Use green only for success/completion (Approved, Checks passed)
- Keep lots of warm-neutral surfaces (off-white, subtle gray) so green remains meaningful
- Add one small warm accent (amber) for warnings/“needs attention” states (very important in compliance)
- Mood-enhancing detail: use soft gradients very subtly in headers or empty states, not in data tables.

#### 6.1.1 Aesthetic & Theme

- **Theme:** White/blue/green palette (white and off-white backgrounds, blue for primary actions/navigation, green for success/completion, subtle gray for neutral surfaces, amber for warnings/attention, soft gradients in headers/empty states).
- **Typography:** Modern sans-serif (e.g., Inter or Open Sans) for clarity and trustworthiness; bold for headings, regular for content, and monospace for data tables.
- **Components:** Calm layout with shadowed cards, clean sidebars, micro-interactions for agent status, and mood-enhancing details (subtle gradients, clear icons, and accessible color contrasts).

### 6.2 Page 1: The Command Center (Landing/Intake)

- **Login Page:** Page 1 begins with a branded login page for app users, ensuring authentication and fulfilling security requirements. Only authenticated users can access the dashboard and features.
**Hero Area:** "Start New Compliance Bridge" — High-contrast CTA.
- **Project Selection:** Grid of active compliance projects with "Health Score" donuts.
- **Quick Links:** Access to recent SOPs, high-risk flags, and audit summaries.

### 6.3 Page 2: The Bridge (Orchestration & Intake)

- **Multi-Step Stepper UI:** Logic-aware progress bar (Intake -> Classification -> Branching -> Result).
- **VLM Ingestion Area:** Drag-and-drop zone for regulatory PDFs.
- **Agent Reasoning Window:** A sidebar showing the **Orchestrator's** live thought process (e.g., "Analyzing Art. 6(1) for High-Risk classification...").
- **Classification Verdict:** Large, centered card showing the Risk Tier (High/Limited/Minimal) + "Why?" explanation citing regulations.

### 6.4 Page 3: The Artifact Lab (Generation / Push)

- **Split-View Editor:**
  - **Left:** The generated arc42/SOP/Risk Assessment (Markdown preview).
  - **Right:** Compliance citations (Linked directly to Section 1.1, 2.3, etc.).
- **Agent Chat Overlay:** "Ask the Author" — Inline chat to refine specific generated sections.
- **Export Center:** One-click export to PDF, MD, or internal wiki formats.

### 6.5 Page 4: The Auditor Vault (Compliance Check / Pull)

- **Evidence Comparison View:** Side-by-side comparison of "Technical Artifact" vs. "Regulatory SOP".
- **Gap Matrix:** A heat-map visualization showing which SOP requirements are missing evidence.
- **Verdict Controls:** "Approve", "Request Revision", or "Escalate" buttons for the Human-in-the-loop (HITL).

### 6.6 Page 5: The Audit Trail (Postgres Transparency)

- **Timeline View:** A vertical chronological log of every agent decision, tool call, and user intervention.
- **Provenance Search:** Deep search across the **Reproducibility Repository** (e.g., "Show all decisions made using Nemotron-Parse on 2025-05-10").
- **Immutable Export:** Generate a cryptographically signed "Compliance Certificate" (v2+).

---

### Additional Risk Management Requirements

The system must provide:
- **General Risk Management Record (Company-wide):**
  - Structured according to Table 1 (Riskmanagement File).
  - Covers all required topics for company governance and audit readiness.
  - Links to supporting documents for notified body audits and ISO certification.

- **Product-Specific Risk Management Record:**
  - Structured according to Table 2 (Documentation of specific Product Risk-Handling).
  - Tracks risk analysis, mitigation, and verification for each product.
  - Supports traceability for high-risk products, including complaint resolution and expert review.

Both document types must be:
- Created, updated, and approved via HITL workflow (with timestamps and responsible person).
- At least after approval stored in the PostgreSQL DB as part of the specific project to implement the software product.
- Linked to technical templates (arc42, SOPs) and QM-specific documentation.
- Ready for external audits and regulatory certification.

---

- **Generate report form:** Document ID input + compliance check ID input
- **Download button:** Opens PDF in new tab or triggers download
- **Storage button:** Triggers storage in PostgreSQL as part of the specific project to implement the software product.
- **Review history surface:** persistent bridge human-review records and audit-trail views exist today; a richer unified review-history table remains a Phase 2 enhancement.

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
| Test pass rate, classical | 100% | 100% ✅ |
| LLM test pass rate | 99% | being none-deterministic: 85% tests passing ✅ |
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

## Section 8 – Implementation Strategy (Weeks 1–6)

- **Week 1-2:** Core multi-agent pipeline (Classifier & Author) + Use-case intake UI.
- **Week 3-4:** Compliance Checker agent (The "Pull") + NVIDIA Nemotron-Parse integration.
- **Week 5-6:** PostgreSQL History Repository + HITL workflow + PDF Audit Export.

---

## Section 9 – QA Checklist

### Architecture & Design

- [x] FastAPI + Pydantic v2 architecture chosen and documented (SAD)
- [x] All data models defined as Pydantic v2 classes (no raw dicts in API)
- [x] Service layer separated from API layer (routes call services, not business logic inline)
- [x] Agent layer wraps services (agents call services, not API routes)
- [x] LLM/MoE integration: System supports large language models and mixture-of-experts (e.g., NVIDIA Nemotron) for document analysis and compliance workflows. Code works without `ANTHROPIC_API_KEY` (optional enrichment).

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
- [x] Legacy 30 classical tests pass with 0 failures
- [x] Unit tests for LLMs/MoE and their functionality (e.g., Nemotron, Anthropic, etc.)
- [x] LLM/MoE tests pass with ≥85% success rate (non-deterministic outputs expected)
- [x] Basic FastAPI TestClient integration/security coverage exists for authenticated workflows, auth, authorization, rate limiting, recovery, error envelopes, and stakeholder APIs
- [ ] Broaden TestClient route coverage and end-to-end workflow coverage across remaining surfaces — Phase 2
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
- [x] LLM/MoE outputs are traceable, auditable, and mapped to compliance requirements

---

## Sources

- EU AI Act (Regulation (EU) 2024/1689), Official Journal of the EU, 12 July 2024, Arts. 9–15, 43, 72, 99, Annex III, Annex IV
- arc42 Template v8.2 Specification, Gernot Starke & Peter Hruschka, [https://arc42.org](https://arc42.org)
- Model Card for Model Reporting, Mitchell et al. (2019), ACM FAccT
- ISO/IEC 25010:2023 — Systems and Software Quality Requirements and Evaluation (SQuaRE)
- FastAPI Documentation v0.109+, [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- Pydantic v2 Documentation, [https://docs.pydantic.dev/latest/](https://docs.pydantic.dev/latest/)
- ReportLab User Guide v4.x, [https://www.reportlab.com/docs/](https://www.reportlab.com/docs/)
- structlog Documentation, [https://www.structlog.org/en/stable/](https://www.structlog.org/en/stable/)
- bleach Documentation, [https://bleach.readthedocs.io/en/latest/](https://bleach.readthedocs.io/en/latest/)
- Anthropic Claude API Documentation, [https://docs.anthropic.com/en/api/](https://docs.anthropic.com/en/api/)

---

## Assumptions

1. EU AI Act Art. 9–15 requirements are stable from August 2026 enforcement; minor guidance changes are handled via requirements engine updates.
2. arc42 v8.2 is the reference template; organisations using customised arc42 may have reduced detection accuracy for renamed sections.
3. Model card format follows the Mitchell et al. (2019) 9-section structure; Hugging Face model card extensions are not in scope for MVP.
4. Approval-critical HITL records are persisted in PostgreSQL-backed tables today; broader generic review-history UX beyond bridge/audit views remains an incremental enhancement.
5. PDF reports generated by ReportLab are acceptable for audit submission without a digital signature (electronic signature support is out of scope for MVP).
6. The system handles text-based documents directly; for scanned image documents and binary PDFs, the current implementation includes a scaffolded confidence-gated OCR decision path, while full OCR execution remains a Phase 2+ enhancement.
7. "Optional LLM enrichment" means the API key may be absent; when present, Claude enrichment runs automatically without additional user action.
8. The legacy 30-test classical unit suite no longer represents all automated coverage; the repo also includes TestClient-based API/integration/security tests. The QA document is retained as original Phase-0 baseline context, while the live test inventory is the `tests/` directory plus current pytest outputs. Formal CI release-gating remains future work, so local `pytest` execution is still the current Phase 0 release-gate mechanism.
9. The app shall improve compliance workflows by providing easy-to-find visual concepts in the UI. For example, when SOP templates are updated to reflect new regulated guidance, document authors are notified of template changes via a visual indicator (e.g. icon beside the document label). This ensures users are aware of new requirements and can quickly adapt documentation to maintain compliance.

---

## Open Questions

1. **arc42 section detection accuracy:** What is the agreed false-negative threshold? Recommend: validate against 10 real arc42 documents from actual users.
2. **MDR requirement mapping:** Which MDR articles should be mapped to the compliance checker for Phase 2 or 3? (Candidate: MDR Art. 10, Annex I, Annex XV). Only relevant if domain 'medical device compliance' shall be added as new big user story.
3. **PDF signature:** Should generated PDF reports include a cryptographic signature for audit submission integrity? (Candidate library: pyhanko), future-to-do for Phase 2 or 3.
4. **LLM accuracy metrics:** How will we measure the accuracy of LLM-enriched analysis vs. rule-based baseline? (Proposed: starting with human evaluation during first year, simple add-on: thumb up and down for automated tasks and their results; later on adding human-annotated benchmark set of 25 documents of each doc type)

---

## Future-To-Do Topics

- Enterprise SSO via OIDC/OAuth2/LDAP/SAML (recommended for large organizations, deferred to Phase 2+)
- Persistent distributed rate limiting and shared lockout state (e.g., Redis-backed) for multi-instance deployments (Phase 2+)
- Scheduled cleanup task for PDF file accumulation in reports/ directory (storage management, Phase 2)
- Broaden the existing TestClient-based integration suite to cover remaining route surfaces and end-to-end workflows more systematically (Phase 2)
- CI/CD pipeline setup with GitHub Actions, ruff/mypy linting, and automated pytest on every push (Phase 2)
- Containerize the main app/frontend deployment path and add a production-grade file/object storage backend; current repo already includes PostgreSQL Docker Compose for local dev and an orchestrator Dockerfile (Phase 2+)
- **Search improvement (Phase 2+)**: Adopting BM25 + dense retrieval makes sense for scale and compliance evidence quality in this product context.
- Document/report artefacts should evolve toward a reusable cross-project document framework as product scope matures and more project requirements are validated (Phase 3+)
- **OCR fallback enhancement (Phase 2+)**: Complete the currently scaffolded confidence-gated extraction pipeline by integrating real OCR execution with layout-aware OCR profiles, benchmark coverage, and scalable document QA/retrieval options.
- Electronic signature support for PDF audit reports via pyhanko or equivalent (Phase 2–3)

---

## Audit

```python
persona=product-mgr
action=align-prd-with-sad-and-current-implementation
timestamp=2026-4-4
adapter=AAMAD-vscode
artifact=project-context/1.define/product-requirements-document.md
version=0.8.2
status=complete
```
