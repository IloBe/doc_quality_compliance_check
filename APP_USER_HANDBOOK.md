# Application User Handbook

## Purpose

This handbook provides operational guidance for users of the Doc Quality Compliance Checker. It is written for quality, compliance, audit, and product stakeholders who require consistent, traceable, and policy-aligned execution of documentation checks.

## Scope

This section defines the top menu controls and their role in the Q&M documentation workflow.

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

## Top Menu Controls and Compliance Relevance

The top menu supports three control objectives:

1. **Context integrity** — actions are performed in the correct project scope.
2. **Operational transparency** — users can see when validation or analysis jobs are running.
3. **Access and accountability** — user identity and session controls support auditability.

### 1) Active Project Selector (`LuChevronDown`)

**Business function**
- Switches the active project context (for example, `QM-CORE-STATION`).

**Compliance importance**
- Prevents cross-project review errors.
- Ensures findings, approvals, and evidence are linked to the correct project record.

**Stakeholder impact**
- **QA/Compliance**: verifies that checks are run against the intended scope.
- **Auditors**: confirms traceability of review actions by project.

### 2) Search (`LuSearch`)

**Business function**
- Finds documents by Doc ID or title from the active project.

**Compliance importance**
- Reduces retrieval time for controlled artifacts (SOPs, architecture records, risk files).
- Supports timely response during internal or external audits.

**Stakeholder impact**
- **Reviewers/Auditors**: direct access to evidence documents.
- **Product owners**: quick navigation to release-relevant artifacts.

### 3) Operations Indicator (`LuLoader`)

**Business function**
- Shows whether background operations are running (analysis jobs, bridge runs, compliance scans).
- Opens operations details when selected.

**Compliance importance**
- Prevents premature interpretation of incomplete results.
- Improves process transparency with visible processing status.

**Stakeholder impact**
- **QA**: validates job completion before approving outcomes.
- **Audit teams**: confirms operational sequencing and review timing.

### 4) Focus Mode (`LuLayoutGrid` / `LuMinimize`)

**Business function**
- Toggles workspace density between standard and focused working mode.

**Compliance importance**
- Supports controlled review behavior by reducing visual distractions.
- Improves consistency for detailed evidence assessment.

**Stakeholder impact**
- **Auditors/Reviewers**: improved concentration during high-criticality checks.

### 5) Help (`LuCircleHelp`)

**Business function**
- Entry point for in-app guidance.

**Compliance importance**
- Standardizes interpretation of workflow steps and expected evidence quality.
- Reduces procedural variance across teams.

**Stakeholder impact**
- **New users**: faster onboarding to compliant operation.
- **Process owners**: lower risk of non-standard execution.

### 6) Fullscreen (`LuMaximize`)

**Business function**
- Expands the application into full-screen mode.

**Compliance importance**
- Improves clarity in formal review sessions and screen-shared audits.
- Supports accurate reading of detailed findings and metadata.

**Stakeholder impact**
- **Auditors/QA leads**: clearer collaborative review sessions.

### 7) User Identity and Role Display

**Business function**
- Shows current user identity and primary role.

**Compliance importance**
- Reinforces role-based accountability.
- Supports clear attribution of review activities.

**Stakeholder impact**
- **All stakeholders**: transparent role context for decision authority.

### 8) Sign Out (`LuLogOut`)

**Business function**
- Terminates the active user session.

**Compliance importance**
- Reduces unauthorized use on shared devices.
- Supports session hygiene and audit-ready access control.

**Stakeholder impact**
- **Security/Compliance**: stronger control over session lifecycle.

---

## Operational Guidance

- Confirm the active project **before** starting document checks.
- Monitor the operations indicator and wait for completion before concluding review outcomes.
- Use search to retrieve exact evidence artifacts during review meetings.
- Sign out after each session, especially on shared workstations.

---

## Role-Specific Quick Actions and Workflows

The following role views are intended as fast operating patterns for daily use.

### Auditor

**Quick actions**
- Validate the active project in the top menu.
- Use search to retrieve required audit evidence by Doc ID/title.
- Review processing completion in operations status before assessment.
- Capture pass/fail observations and request remediation where needed.

**Standard workflow**
1. Select correct project context.
2. Retrieve target controlled documents.
3. Confirm analysis/compliance runs are complete.
4. Evaluate findings against required standards/articles.
5. Record review conclusion and escalation items.

### QA / Compliance Specialist

**Quick actions**
- Verify project scope and current release context.
- Track operations progress for scan/bridge completion.
- Validate failed controls and evidence sufficiency.
- Coordinate remediation and re-check cycles.

**Standard workflow**
1. Confirm project and baseline document set.
2. Trigger or monitor compliance checks.
3. Review failed checks and classify severity.
4. Assign corrective actions and due dates.
5. Re-validate outcomes before gate approval.

### Product Owner / Delivery Lead

**Quick actions**
- Confirm project context for release planning.
- Use search for release-critical documents.
- Review completion status and unresolved compliance issues.
- Align release decisions with documented quality evidence.

**Standard workflow**
1. Open the release project context.
2. Verify high-priority documentation coverage.
3. Check unresolved findings and risk impact.
4. Confirm remediation plan and ownership.
5. Approve or defer release based on evidence quality.

### Platform Administrator

**Quick actions**
- Validate role visibility and session behavior.
- Ensure users can access help and execute standard controls.
- Verify sign-out behavior on shared endpoints.
- Support incident triage when operations appear stalled.

**Standard workflow**
1. Confirm access and role mapping integrity.
2. Verify control surface availability (search, operations, fullscreen/help).
3. Support troubleshooting for operational failures.
4. Document incidents and recovery actions.
5. Confirm return to compliant operating state.

## Audit Readiness Note

The top menu controls are not cosmetic UI elements; they are part of the operating control surface for traceability, consistency, and governance in documentation quality management.