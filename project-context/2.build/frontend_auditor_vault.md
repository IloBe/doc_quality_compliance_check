# Frontend Page Documentation — Auditor Vault

**Page label:** Pipeline / Evidence Governance  
**Route:** `/auditor-vault`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, read-only evidence shelf derived from mock store

## Purpose

Centralize governed artifacts from documents, exports, and bridge runs into a single evidence inventory for audit readiness, recency monitoring, and traceable retrieval. Reduces audit preparation time by providing one consistent place to verify artifact freshness, approval state, and traceability context before formal reviews.

## Current implementation

- `frontend/pages/auditor-vault.tsx` renders the full page.
- Renders standardized header via `PageHeaderWithWhy` (`Pipeline / Evidence Governance` → `Auditor Vault`).
- Renders a top read-only advisory banner (blue) explaining vault is evidence-oriented and non-editable.
- Renders four inline KPI cards in a responsive grid: Total Evidence, Approved/Ready, Pending Review, Readiness Score.
- Renders an evidence inventory table with health badges per row.
- Uses bottom `Governance note` footer card (blue).
- Header right area contains a `TimeframeSelector` component.

## Data sources and state

- **Documents:** `useMockStore((state) => state.documents)`
- **Exports:** `useMockStore((state) => state.exports)`
- **Bridge runs:** `useMockStore((state) => state.bridgeRuns)`
- **Timeframe:** local state (`DashboardTimeframe`) — `'day' | 'week' | 'month' | 'quarter'`
- **View model:**
  - `buildVaultEvidenceRows(documents, exports, bridgeRuns, timeframe)` — unified row list.
  - `buildVaultSnapshot(rows)` — aggregated KPI snapshot.
  - `getHealthBadgeClass(health)` — Tailwind class for health badge color.

## KPI cards

| Card | Value source |
| --- | --- |
| Total Evidence | `snapshot.totalEvidence` |
| Approved / Ready | `snapshot.approvedArtifacts` |
| Pending Review | `snapshot.pendingReviews` |
| Readiness Score | `snapshot.readinessScore` % (stale count shown as sub-note) |

## Evidence inventory table columns

`ID | Title | Source | Product | Status | Health | Updated`

- **Source:** `documents` / `exports` / `bridgeRuns` — unified across three origin types.
- **Health badge:** color-coded via `getHealthBadgeClass(row.health)` — indicates artifact freshness/approval state.
- **Updated:** `row.updatedAt · row.updatedBy` combined cell.

## UX and behavior contract

- Page is entirely read-only — no create, edit, or delete actions.
- Read-only advisory banner instructs users to visit source pages for editing.
- Timeframe selector controls the window used by `buildVaultEvidenceRows`; rows update reactively.
- Empty state: "No evidence rows in selected timeframe." message when `rows.length === 0`.
- Table rows use row key `${row.source}-${row.id}` to handle cross-type ID collisions.

## Known boundaries

- All data derived from Zustand mock store; no direct backend calls from this page.
- Health classification and readiness score logic is contained in `auditorVaultViewModel.ts`.
- Stale artifact detection window is tied to `timeframe` selection applied inside the view model.

## Acceptance criteria

- Vault displays unified evidence rows from documents, exports, and bridge runs.
- Timeframe selector changes update the row list and KPI snapshot reactively.
- Health badges render correctly with color coding.
- KPI cards show correct aggregated counts for the selected timeframe.
- Read-only advisory banner is always visible.
- No edit, create, or delete actions are exposed anywhere on the page.
