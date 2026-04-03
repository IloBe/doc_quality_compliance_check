# Frontend Page Documentation — Risk (FMEA/RMF)

**Page label:** Governance Workspace  
**Route:** `/risk`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, hybrid persistence with action-history demo fallback

## Purpose

Manage company-wide (RMF) and product-specific (FMEA) risk records with traceable lifecycle actions. Operationalizes SAD Section 1 constraints: separate RMF vs FMEA handling, enforce action traceability (who/when/why), and provide graceful continuity when backend is unavailable.

## Current implementation

- `frontend/pages/risk.tsx` renders the full page.
- Renders standardized header via `PageHeaderWithWhy` (`Governance Workspace` → `Risk (FMEA/RMF)`).
- Renders `RiskKpiGrid` with aggregated stats (total, by status, by type).
- Renders `RiskFiltersPanel` for query, type (RMF/FMEA/All), status, and product filters.
- Renders a two-column layout:
  - **Left (xl:col-span-2):** `RiskRecordsTable` with lifecycle workflow actions + `RiskTemplateEditor` for editable RMF/FMEA content.
  - **Right sidebar:** Create risk record form + recent risk actions list.
- Uses bottom `Governance note` footer card.

### Components

| Component | File | Purpose |
| --- | --- | --- |
| `RiskKpiGrid` | `components/risk/` | Aggregated risk stats display |
| `RiskFiltersPanel` | `components/risk/` | Search query + multi-dimension filters |
| `RiskRecordsTable` | `components/risk/` | Lifecycle workflow table with action buttons |
| `RiskTemplateEditor` | `components/risk/` | Editable RMF/FMEA template tabs |

## Data sources and state

- **Risk actions:** `fetchRiskActions(250)` from `lib/riskActionClient` on mount.
  - Backend-first unless `NEXT_PUBLIC_DEMO_MODE=true`; sets `isDemoMode` to `true` when the action-history path returns `degradedToDemo`.
  - Appended in real time via `appendRiskAction()` on each lifecycle transition.
- **Risk templates:** `createRiskTemplate()` from `lib/riskTemplateClient` on new record creation.
  - Sends an empty `rows` array so the backend can auto-seed canonical rows by `template_type` when the API is available.
  - Falls back to localStorage demo persistence when the template API is unavailable.
- **Document/status store:** `mockStore` (`documents`, `addDocument`, `updateDocStatus`) used to maintain record lifecycle state and feed `buildSeededRiskRows()`.
- **View model helpers:** `buildSeededRiskRows`, `buildRiskStats`, `filterRiskRows`, `buildRiskDocId`, `formatRiskDate` from `lib/riskViewModel`.

## RBAC

- `useCan('doc.edit')` — required to create new risk records and initiate lifecycle transitions.
- `useCan('review.approve')` — required to approve a risk record.
- Read-only users can view records and action history; action buttons are disabled.

## Lifecycle workflow

Risk records follow a single direction:

```text
Draft → In Review → Approved
          ↑
     request_changes
```

| Action button | Required role | Appended action_type | New status |
| --- | --- | --- | --- |
| Submit for Review | `doc.edit` | `submit_for_review` | `In Review` |
| Approve | `review.approve` | `approve` | `Approved` |
| Request Changes | `review.approve` | `request_changes` | `Draft` |

All transitions call `appendRiskAction()` first; status update only fires if persistence succeeds.

## UX and behavior contract

- **Demo banner:** amber badge shown when the risk-action path is operating in demo mode (`degradedToDemo`), whether because demo mode is forced or the live action API is unavailable.
- **Info/error messages:** inline success (emerald) and error (rose) text above KPI grid.
- **Reference tables info popup:** modal overlay (accessible via `LuInfo` button on Create form) explaining RMF (Table 1 — company-level) vs FMEA (Table 2 — product-level) with tips.
- **Create record form:** requires title (≥3 chars), product (≥3 chars), rationale (≥10 chars); disabled when `canEdit` is false.
- **Recent risk actions list:** last 10 actions filtered to current risk record IDs in the store, shown in sidebar.
- Page auto-selects first available record on mount and after creation.

## Known boundaries

- Template editor content is rendered client-side; template persistence goes through `riskTemplateClient` and may degrade to local demo storage.
- Risk record IDs are generated client-side via `buildRiskDocId(type)` and written to mock store before the backend template call resolves.
- `buildSeededRiskRows()` currently stays strictly document-backed and does not inject synthetic fallback rows.
- No pagination on the records table; filters operate on full in-memory rows.

## Acceptance criteria

- RMF and FMEA records display in filtered table with lifecycle action buttons gated by role.
- All lifecycle transitions persist a `RiskAction` to backend (or demo fallback) before updating UI status.
- Create form validates correctly and attempts backend template creation with demo fallback if the API is unavailable.
- Demo mode banner reflects the action-history/demo-fallback state rather than general page connectivity alone.
- Reference tables popup opens and closes without layout impact.
