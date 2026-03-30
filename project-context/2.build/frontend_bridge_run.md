# Frontend Page Documentation — Bridge Run

**Page label:** Bridge / Workflow  
**Route:** `/doc/[docId]/bridge`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented document-session page with mock and optional backend mode

## Purpose

Execute and evidence a single document-level Bridge run with step-by-step visibility, readable control outcomes, and audit-friendly logs.

## Route and component structure

- Route entry: `frontend/pages/doc/[docId]/bridge.tsx`
- Main UI component: `frontend/components/DocBridgePage.tsx`
- Data/API client: `frontend/lib/bridgeClient.ts`

## Current implementation

- Resolves the document from the mock store by `docId`.
- In backend mode, creates a fallback placeholder document when `docId` is not found in the mock store.
- Shows page title, session ID, `Why this page matters`, and `Live Session` tag.
- Renders a four-step pipeline:
  - Inspection Agent
  - Compliance Agent
  - Research Agent
  - Quality Gate
- Maintains a timestamped stream-log panel.
- Provides `Execute Bridge Run` and `Exit Workflow` actions.
- Updates document status to `Approved` when a backend run returns `approved=true`.

## Runtime modes and backend integration

- Backend mode is enabled with `NEXT_PUBLIC_BRIDGE_SOURCE=backend`.
- API origin follows the same `NEXT_PUBLIC_API_ORIGIN` / same-origin logic as other frontend clients.
- Backend endpoints used by the current page:
  - `POST /api/v1/bridge/run/eu-ai-act`
  - `GET /api/v1/bridge/alerts/eu-ai-act/{document_id}`
- Auth transport requires cookie-backed session requests.

## Backend-mode behavior contract

- On page load in backend mode, the page checks for regulatory alerts.
- If the backend reports `requires_document_update=true`, a regulatory popup is shown.
- In backend mode, the run auto-starts once per page load for authorized users.
- Compliance rows use backend `requirements` data when available.
- API failures surface as an error banner while keeping the page usable.

## UX and behavior contract

- The execute button is disabled when the user lacks `bridge.run` permission.
- Step states are visually distinct for pending, running, and completed phases.
- Compliance step shows checked ISO/SOP-style controls with pass/fail badges.
- Research step shows cross-referenced regulations with pass/fail badges.
- Quality Gate shows a concise final result summary after the run reaches the last step.
- Session ID stays visible for traceability.

## Known boundaries

- Non-backend mode uses simulated delays, mock checks, and generated logs.
- The `Context Parameters` panel is currently static presentation content.
- This page is more implementation-complete than the overview page, but still mixes mock and live behavior by design.

## Acceptance criteria

- A run can execute without runtime errors.
- Compliance, Research, and Quality Gate sections show readable outcome details.
- Backend mode calls alert and run endpoints with authenticated session cookies.
- Regulatory update popup appears when the backend marks a document update as required.
- Final state is understandable without opening additional routes.
