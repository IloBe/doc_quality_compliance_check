# Frontend Page Requirements — Bridge Run (Document Session)

**Page label:** Bridge / Workflow  
**Route:** `/doc/[docId]/bridge`  
**Owner persona:** `@frontend-eng`

## Purpose

Execute and evidence a single document-level orchestration run with traceable step outcomes.

## Runtime modes and backend integration

- **Route:** `/doc/[docId]/bridge` renders via [frontend/pages/doc/[docId]/bridge.tsx](frontend/pages/doc/[docId]/bridge.tsx), delegating to [frontend/components/DocBridgePage.tsx](frontend/components/DocBridgePage.tsx).
- **Backend mode toggle:** set `NEXT_PUBLIC_BRIDGE_SOURCE=backend`.
- **API origin:** optional `NEXT_PUBLIC_API_ORIGIN` prefix; when omitted, frontend uses same-origin requests.
- **Bridge API client:** [frontend/lib/bridgeClient.ts](frontend/lib/bridgeClient.ts).
- **Backend endpoints:**
  - `POST /api/v1/bridge/run/eu-ai-act`
  - `GET /api/v1/bridge/alerts/eu-ai-act/{document_id}`
- **Auth transport:** cookie/session (`credentials: include`) must be available for API calls.

### Backend-mode behavior contract

- On page load in backend mode, an alert check is performed (`GET .../alerts/...`).
- If regulatory requirements changed since last approved run, a popup is shown immediately.
- In backend mode, the bridge run starts automatically once per page load for authorized users.
- Compliance evidence rows are populated from backend `requirements` data.
- If API call fails, an error banner is shown and the page remains usable.

## Functional requirements

- Show pre-title label in dashboard-style typography and page title with info icon toggle.
- Enable `Execute Bridge Run` action with role-aware enablement.
- Render step pipeline: Inspection, Compliance, Research, Quality Gate.
- Show timestamped stream logs.
- In backend mode, execute EU AI Act run through API and map returned requirement outcomes into UI.
- For **Compliance Agent**, display checked ISO/SOP controls with pass/fail status.
- For **Research Agent**, display cross-referenced external regulations with pass/fail status.
- For **Quality Gate**, display a concise two-sentence final result summary.
- Show regulatory update popup when backend reports `requires_document_update=true`.

## Data and state

- Source: mock store document lookup by `docId`.
- Source fallback (backend mode): if `docId` is not in mock store, create a route-based placeholder document model so the page can still execute backend checks.
- Run execution: step progression with stateful logs.
- Backend run call at compliance step in backend mode.
- Status update: `updateDocStatus()` on completion.

## UX properties

- Step states must be visually distinct (pending/running/completed).
- Evidence lines should include both text and status badges.
- Session ID must remain visible for audit traceability.

## Acceptance criteria

- Run executes without runtime errors.
- Compliance/Research/Quality Gate show explicit, readable outcome details.
- Final state is understandable without opening additional pages.
- In backend mode, bridge API run and alert endpoints are called successfully with authenticated session.
- Regulatory update popup appears whenever backend marks document update as required.
