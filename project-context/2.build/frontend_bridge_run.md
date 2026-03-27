# Frontend Page Requirements — Bridge Run (Document Session)

**Page label:** Bridge / Workflow  
**Route:** `/doc/[docId]/bridge`  
**Owner persona:** `@frontend-eng`

## Purpose

Execute and evidence a single document-level orchestration run with traceable step outcomes.

## Functional requirements

- Show pre-title label in dashboard-style typography and page title with info icon toggle.
- Enable `Execute Bridge Run` action with role-aware enablement.
- Render step pipeline: Inspection, Compliance, Research, Quality Gate.
- Show timestamped stream logs.
- For **Compliance Agent**, display checked ISO/SOP controls with pass/fail status.
- For **Research Agent**, display cross-referenced external regulations with pass/fail status.
- For **Quality Gate**, display a concise two-sentence final result summary.

## Data and state

- Source: mock store document lookup by `docId`.
- Run execution: simulated step progression with stateful logs.
- Status update: `updateDocStatus()` on completion.

## UX properties

- Step states must be visually distinct (pending/running/completed).
- Evidence lines should include both text and status badges.
- Session ID must remain visible for audit traceability.

## Acceptance criteria

- Run executes without runtime errors.
- Compliance/Research/Quality Gate show explicit, readable outcome details.
- Final state is understandable without opening additional pages.
