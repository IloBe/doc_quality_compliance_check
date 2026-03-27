# Frontend Page Requirements — Dashboard

**Page label:** Quality & Audit Insights  
**Route:** `/dashboard`  
**Owner persona:** `@frontend-eng`

## Purpose

Provide a concise audit-readiness overview across documents, controls, risks, and operational progress.

## Functional requirements

- Keep dashboard-style pre-title label (`Quality & Audit Insights`).
- Show page title with info icon (`LuInfo`) that toggles "Why this page matters".
- Support timeframe switching (`week`, `month`, `year`).
- Support demo mode from mock store and backend mode via `NEXT_PUBLIC_DASHBOARD_SOURCE=backend`.
- Show KPI cards, risk distribution, standards coverage, and per-standard status icons.

## Data and state

- Demo source: mock store (`documents`, `exports`, `bridgeRuns`).
- Production source: `/api/v1/dashboard/summary`.

## UX properties

- Status by standard must align row-by-row with standards list.
- Loading and error states required for backend mode.
- Demo mode banner required when backend mode is off.

## Acceptance criteria

- KPI values change with timeframe.
- Status icons clearly indicate pass/fail by standard.
- Switching to backend mode does not break demo fallback behavior.
