# Frontend Page Documentation — Dashboard

**Page label:** Quality & Audit Insights  
**Route:** `/dashboard`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, hybrid mock/live page

## Purpose

Provide an audit-readiness overview across governed documents, active jobs, cycle time, risk classification, and standards coverage.

## Current implementation

- Shows the pre-title label `Quality & Audit Insights`.
- Shows page title `Dashboard` with `LuInfo` toggle for the `Why this page matters` panel.
- Supports timeframe switching for `week`, `month`, and `year`.
- Renders four KPI cards: open documents, active jobs, average cycle time, and compliance pass rate.
- Renders risk distribution and a document standards coverage table.
- Shows a concluding guidance banner for where to continue deeper analysis.

## Data sources and state

- Default mode is **demo/mock mode** using `useMockStore(state => state.documents|exports|bridgeRuns)`.
- Live mode is enabled only when `NEXT_PUBLIC_DASHBOARD_SOURCE=backend`.
- Backend mode uses `fetchDashboardSummary(timeframe)` from `frontend/lib/dashboardClient.ts`.
- Backend request target is `GET /api/v1/dashboard/summary?timeframe=...` with `credentials: 'include'`.

## UX and behavior contract

- When backend mode is off, a blue demo-mode banner explains that the page is using the same mock dataset as Doc Hub.
- When backend mode is on, the page shows explicit loading and error states.
- Timeframe switches recompute mock metrics locally or reload backend analytics remotely.
- Risk distribution uses derived or returned `High`, `Limited`, and `Minimal` counts.
- Standards coverage rows show readable pass/fail indicators per standard/article.

## Known boundaries

- The page is read-only; it does not currently trigger workflow actions directly.
- Demo mode is the default for resilience and local evaluation.
- Backend analytics are optional and should not be documented as always-on.

## Acceptance criteria

- KPI values change when the timeframe changes.
- Demo mode renders without backend availability.
- Backend mode surfaces loading and API errors clearly.
- Risk and standards views remain readable and audit-oriented in both modes.
