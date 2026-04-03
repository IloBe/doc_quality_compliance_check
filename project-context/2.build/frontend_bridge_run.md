# Frontend Page Documentation — Bridge Run

**Page label:** Bridge / Workflow  
**Route:** `/doc/[docId]/bridge`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented document-session page with hybrid runtime behavior

## Purpose

Execute and evidence a single document-level Bridge run with step visibility, readable control outcomes, and audit-friendly logs.

## Route and component structure

- Route entry: `frontend/pages/doc/[docId]/bridge.tsx`
- Main UI component: `frontend/components/DocBridgePage.tsx`
- Data/API client: `frontend/lib/bridgeClient.ts`

## Current implementation

- Resolves document from local store by `docId`; in backend mode can create fallback document header when local record is missing.
- Shows page title, session ID, `Live Session` tag, and `Why this page matters` panel toggle.
- Renders four-step pipeline:
  - Inspection Agent
  - Compliance Agent
  - Research Agent
  - Quality Gate
- Maintains timestamped stream-log panel.
- Provides `Execute Bridge Run` and `Exit Workflow` actions.
- Provides mandatory human review panel after run completion (approve/reject with reason and optional follow-up task fields).

## Runtime modes and backend integration

- Backend mode is enabled with `NEXT_PUBLIC_BRIDGE_SOURCE=backend`.
- Backend endpoints currently used:
  - `POST /api/v1/bridge/run/eu-ai-act`
  - `GET /api/v1/bridge/alerts/eu-ai-act/{document_id}`
  - `GET /api/v1/bridge/runs/{run_id}/human-review`
  - `POST /api/v1/bridge/runs/{run_id}/human-review`
- Auth transport uses cookie-backed session requests.
- In backend mode the run auto-starts once per load for authorized users.
- Frontend role gating is aligned with backend route authorization for bridge run/review roles (`qm_lead`, `auditor`, `riskmanager`, `architect`).
- Human-review submission enforces backend validation rules for reject/follow-up combinations and duplicate-review prevention.

## Backend-mode behavior contract

- On load, page checks regulatory alert state.
- If backend reports `requires_document_update=true`, regulatory popup is shown.
- Compliance rows consume backend requirement payload when available.
- Existing human review (if present) is fetched and rendered.
- API failures surface in-page error messages while preserving page usability.

## UX and behavior contract

- Execute button is disabled when user lacks `bridge.run` permission.
- Step states are distinct for pending/running/completed.
- Compliance and research sections show pass/fail control outcomes.
- Quality Gate presents concise final summary.
- Human review panel enforces minimum reason input and conditional assignee requirement for manual follow-up rejection.
- Session ID remains visible for traceability.

## Known boundaries

- Non-backend mode uses simulated delays, derived checks, and local review-record fallback.
- Context parameter surfaces remain mostly presentation-oriented.
- Page is implementation-rich but still intentionally hybrid (mock + live) by design.

## Acceptance criteria

- Run executes without runtime errors.
- Compliance, Research, and Quality Gate sections show readable details.
- Backend mode calls alert/run/review endpoints with authenticated cookies.
- Regulatory popup appears when backend marks update required.
- Human review submission updates page state and status messaging.
