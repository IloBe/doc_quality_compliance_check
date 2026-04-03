# Application User Handbook

## Purpose

This handbook provides operational guidance for users of the Doc Quality Compliance Checker. It is written for quality, compliance, audit, and product stakeholders who require consistent, traceable, and policy-aligned execution of documentation checks.

## Scope

This handbook covers the application's compliance workflows, role-specific operating patterns, top menu controls, and their governance relevance for users working in regulated documentation environments.

## Application Business Goal Summary

The Doc Quality Compliance Checker is designed to improve release readiness in regulated environments by moving documentation checks from late, manual activities into a structured and traceable operational workflow.

### Strategic objectives

- **Accelerate audit readiness** through standardized document evidence quality.
- **Reduce compliance risk** by identifying gaps before release gates.
- **Increase review efficiency** with consistent workflows and reduced manual effort.
- **Strengthen governance visibility** with clear status, ownership, and decision traceability.

### Control outcomes expected by stakeholders

- Repeatable document review execution across teams.
- Transparent processing state for analysis and compliance runs.
- Role-aligned accountability for approvals, exceptions, and sign-off actions.
- Better quality of evidence presented in internal and external audits.

---

## Application Business Compliance Workflows

The following workflows describe the main compliance-relevant operations implemented in the platform. Each workflow corresponds to a traceable processing chain — from document intake to evidence archiving — supporting regulated environments that require audit-ready outputs.

### 1) Document Compliance Analysis (Bridge Workflow)

**What is handled**

A document is submitted together with product domain context (domain type, EU AI Act role, risk level). The bridge service evaluates the document against the EU AI Act requirements catalog covering nine mandatory and optional obligations (EUAIA-1 through EUAIA-9: Risk Management System, Data Governance, Technical Documentation, Record-Keeping, Transparency, Human Oversight, Accuracy/Robustness, Conformity Assessment, EU Database Registration). The result is a structured compliance record tied to the document ID.

**Key outputs**

- Compliance score (0.0–1.0) with pass/fail determination.
- Mandatory and optional gap lists with per-requirement detail.
- Automatic recommendation and human review flag.
- Regulatory drift alert when the requirements catalog has changed since the last approved run.

**Compliance relevance**

Documents gain a versioned, traceable compliance record persisted in the database. Regulatory drift detection ensures that a re-run is flagged when underlying requirements change, preventing approval decisions based on stale catalog versions.

### 2) Human-in-the-Loop (HITL) Review Workflow

**What is handled**

When a bridge run raises the human review flag, a HITL review record is created and assigned to a named reviewer with an identified role. The reviewer evaluates the automatic recommendation and either approves the document or records structured modification requests at field level.

**Key outputs**

- Review status: `PASSED` or `MODIFICATIONS_NEEDED`.
- Reviewer identity, role, and approval timestamp.
- Modification requests with field-level descriptions.
- Persisted record in the `hitl_reviews` PostgreSQL table.

**Compliance relevance**

Provides documentary evidence of human oversight required by EU AI Act Art. 14. The persistent review record supports audit inquiries covering who reviewed a document, when, and with what outcome.

### 3) Regulatory Research and Gap Analysis

**What is handled**

On-demand retrieval of relevant regulatory requirements using the configured research service (Perplexity Sonar Pro or static fallback when no API key is configured). Supports exploratory gap analysis against EU/DE frameworks before formal compliance runs are triggered. Domain-to-framework mapping applies automatically: medical products resolve EU AI Act + MDR + ISO 9001; finance/HR domains resolve EU AI Act + GDPR; general scope resolves EU AI Act + GDPR + ISO 27001.

**Key outputs**

- Applicable framework identifiers (EU AI Act, MDR, GDPR, ISO 9001/27001, BSI Grundschutz).
- Domain-specific regulation summaries with article references.
- Research results available for PRD authoring and compliance planning via the `/api/v1/research/regulations` endpoint.

**Compliance relevance**

Ensures domain-specific regulatory obligations are identified early in the product cycle, reducing gap rework at formal compliance gate stages.

### 4) Risk Assessment Workflow

**What is handled**

Risk templates define structured RMF/FMEA records for product and process risks. Templates are seeded per domain by the risk template seeder. Risk records are created against these templates, linked to the active project, and tracked through the release lifecycle with severity, likelihood, and mitigation state.

**Key outputs**

- Structured risk records with severity, likelihood, and mitigation status.
- Domain-specific risk template catalog populated at initialization.
- Risk status surfaced in the `/risk` view for Product Owner and QA review.

**Compliance relevance**

Supports pre-market risk management obligations (EU AI Act Art. 9, MDR Annex I). Provides documented risk evidence required at internal and external audits and conformity assessments.

### 5) Audit Trail and Evidence Chain Workflow

**What is handled**

All compliance-relevant actions — bridge runs, HITL decisions, skill executions, and authentication events — are written to the `audit_events` table as immutable chronological records. The Audit Trail page provides a paginated event log. The Auditor Workstation supports finding disposition. The Auditor Vault provides read-only evidence package review scoped to formal audit access.

**Key outputs**

- Immutable event log with timestamps, actor identity, event type, and payload snapshot.
- Chronological schedule view for regulatory reporting intervals.
- Read-only evidence packages in the Auditor Vault for formal inspection.

**Compliance relevance**

Satisfies record-keeping and automatic logging obligations (EU AI Act Art. 12). Provides the documentary evidence base for conformity assessments (Art. 43) and supports audit inquiries requiring a complete activity history for any reviewed document.

### 6) Evidence Export and Artifact Lab Workflow

**What is handled**

Compliance runs and quality observations are packaged as evidence artifacts and exported through the Artifact Lab. Export jobs run asynchronously and their status is visible in the operations indicator and session alerts throughout processing. Completed packages are retrievable from the `/exports` view for submission or archiving.

**Key outputs**

- Structured evidence packages combining run results, findings, and review records.
- Export job lifecycle tracked through the operations surface (in-progress, failed, complete).
- Downloadable artifacts for submission to auditing bodies or internal release gate reviews.

**Compliance relevance**

Enables structured evidence handover for external audits, notified body submissions, and internal release gates. Failed export conditions are surfaced immediately to users via session alerts, ensuring no silent failure in evidence delivery.

---

## Role-Specific Quick Actions and Workflows

The following role views are intended as fast operating patterns for daily use.

### Auditor

**Quick actions**

- Validate the active project in the top menu.
- Use search to retrieve required audit evidence by Doc ID/title.
- Review processing completion in operations status before assessment.
- Use **Auditor Workstation** for finding disposition and **Audit Trail** for immutable chronology checks.
- Use **Auditor Vault** for read-only evidence package review.

**Standard workflow**

1. Select correct project context.
2. Retrieve target controlled documents.
3. Confirm analysis/compliance runs are complete.
4. Evaluate findings against required standards/articles.
5. Record review conclusion, disposition, and escalation items.

### QA / Compliance Specialist

**Quick actions**

- Verify project scope and current release context.
- Track operations progress for scan/bridge/export completion.
- Validate failed controls and evidence sufficiency in **Compliance**, **Bridge**, and **Artifact Lab** views.
- Coordinate remediation and re-check cycles.

**Standard workflow**

1. Confirm project and baseline document set.
2. Trigger or monitor compliance checks.
3. Review failed checks and classify severity.
4. Assign corrective actions and due dates.
5. Re-validate outcomes and export evidence package before gate approval.

### Product Owner / Delivery Lead

**Quick actions**

- Confirm project context for release planning.
- Use search for release-critical documents.
- Review completion status and unresolved compliance/risk issues.
- Align release decisions with documented quality evidence.

**Standard workflow**

1. Open the release project context.
2. Verify high-priority documentation coverage.
3. Check unresolved findings and risk impact (RMF/FMEA context).
4. Confirm remediation plan and ownership.
5. Approve or defer release based on evidence quality.

### Platform Administrator

**Quick actions**

- Validate role visibility and session behavior.
- Ensure users can access help and execute standard controls.
- Review **Admin / Observability** for quality, latency, and failure signals.
- Review **Admin / Stakeholders & Rights** for role/permission governance.
- Verify sign-out behavior on shared endpoints.
- Support incident triage when operations appear stalled.

**Standard workflow**

1. Confirm access and role mapping integrity.
2. Verify control surface availability (project scope, search, operations, alerts, help, fullscreen).
3. Support troubleshooting for operational failures.
4. Document incidents and recovery actions.
5. Confirm return to compliant operating state.

---

## Top Menu Controls and Compliance Relevance

The top menu supports three control objectives:

1. **Context integrity** — actions are performed in the correct project scope.
2. **Operational transparency** — users can see when validation or analysis jobs are running.
3. **Access and accountability** — user identity and session controls support auditability.

### 1) Active Project Selector (`LuChevronDown`)

**Business function**
- Switches the active project context (`All Projects` or a product scope derived from loaded documents/runs).

**Compliance importance**
- Prevents cross-project review errors.
- Ensures findings, approvals, and evidence are linked to the correct project record.

**Stakeholder impact**
- **QA/Compliance**: verifies that checks are run against the intended scope.
- **Auditors**: confirms traceability of review actions by project.

### 2) Search (`LuSearch`)

**Business function**
- Finds documents by Doc ID/title within the active project scope and supports direct jump to the document bridge workflow.

**Compliance importance**
- Reduces retrieval time for controlled artifacts (SOPs, architecture records, risk files).
- Supports timely response during internal or external audits.

**Stakeholder impact**
- **Reviewers/Auditors**: direct access to evidence documents.
- **Product owners**: quick navigation to release-relevant artifacts.

### 3) Operations Indicator (`LuLoader`)

**Business function**
- Shows whether background operations are running (bridge runs, export jobs, compliance-related processing).
- Opens the operations drawer when selected.

**Compliance importance**
- Prevents premature interpretation of incomplete results.
- Improves process transparency with visible processing status.

**Stakeholder impact**
- **QA**: validates job completion before approving outcomes.
- **Audit teams**: confirms operational sequencing and review timing.

### 4) Session Alerts (`LuBell`)

**Business function**
- Opens session alert cards (for example, operations-in-progress and failed export counts).

**Compliance importance**
- Increases visibility of warning conditions before sign-off.
- Supports timely remediation by highlighting unresolved operational failures.

**Stakeholder impact**
- **QA/Compliance**: faster detection of blocked or failed processing tasks.
- **Audit teams**: clearer evidence that unresolved operational issues were surfaced.

### 5) Focus Mode (`LuLayoutGrid` / `LuMinimize`)

**Business function**
- Toggles workspace density between standard and focused working mode.

**Compliance importance**
- Supports controlled review behavior by reducing visual distractions.
- Improves consistency for detailed evidence assessment.

**Stakeholder impact**
- **Auditors/Reviewers**: improved concentration during high-criticality checks.

### 6) Help (`LuCircleHelp`)

**Business function**
- Entry point for in-app guidance.

**Compliance importance**
- Standardizes interpretation of workflow steps and expected evidence quality.
- Reduces procedural variance across teams.

**Stakeholder impact**
- **New users**: faster onboarding to compliant operation.
- **Process owners**: lower risk of non-standard execution.

### 7) Fullscreen (`LuMaximize` / `LuMinimize`)

**Business function**
- Expands the application into full-screen mode.

**Compliance importance**
- Improves clarity in formal review sessions and screen-shared audits.
- Supports accurate reading of detailed findings and metadata.

**Stakeholder impact**
- **Auditors/QA leads**: clearer collaborative review sessions.

### 8) User Identity and Role Display

**Business function**
- Shows current user identity and primary role.

**Compliance importance**
- Reinforces role-based accountability.
- Supports clear attribution of review activities.

**Stakeholder impact**
- **All stakeholders**: transparent role context for decision authority.

### 9) Sign Out (`LuLogOut`)

**Business function**
- Terminates the active user session.

**Compliance importance**
- Reduces unauthorized use on shared devices.
- Supports session hygiene and audit-ready access control.

**Stakeholder impact**
- **Security/Compliance**: stronger control over session lifecycle.

