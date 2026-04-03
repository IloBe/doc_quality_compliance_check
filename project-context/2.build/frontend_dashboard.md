# Frontend Page Documentation — Dashboard

**Page label:** Quality & Audit Insights  
**Route:** `/dashboard`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, hybrid mock/live page

## Purpose

Provide an audit-readiness overview across governed documents, active jobs, cycle time, risk classification, and standards coverage.

## Current implementation

- Renders standardized header via `PageHeaderWithWhy` with label `Quality & Audit Insights`.
- Supports timeframe switching through `TimeframeSelector` (`week`, `month`, `year`).
- Renders KPI grid, risk distribution card, and standards coverage table.
- Shows mode banners for demo/live operation.
- Uses bottom `Governance note` footer card to guide next analysis surfaces.

## Data sources and state

- Default mode is **demo/mock mode** using `useMockStore(state => state.documents|exports|bridgeRuns)`.
- Live mode is enabled only when `NEXT_PUBLIC_DASHBOARD_SOURCE=backend`.
- Backend mode uses `fetchDashboardSummary(timeframe)` from `frontend/lib/dashboardClient.ts`.
- Backend request target is `GET /api/v1/dashboard/summary?timeframe=...` with `credentials: 'include'`.
- If backend mode fails, page falls back to mock summary and shows warning message.

## UX and behavior contract

- Demo mode shows explicit blue status banner.
- Backend mode shows loading panel until first payload arrives.
- Backend errors are surfaced with a warning panel while preserving usable fallback rendering.
- Timeframe switches recompute mock metrics locally or reload backend analytics remotely.
- Risk distribution uses `High`, `Limited`, and `Minimal` buckets.
- Standards coverage rows show readable pass/fail indicators per standard/article.

## Known boundaries

- Page is read-only and does not trigger workflow actions.
- Demo mode remains default for resilience and local evaluation.
- Backend analytics are optional and should not be documented as always-on.

## Acceptance criteria

- KPI values change when timeframe changes.
- Demo mode renders without backend availability.
- Backend mode surfaces loading and API errors clearly.
- Risk and standards views remain readable and audit-oriented in both modes.
