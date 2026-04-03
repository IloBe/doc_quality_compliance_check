# Frontend Page Documentation — Exports Registry

**Page label:** Operations & Compliance  
**Route:** `/exports`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, read-only registry with local download and remote push support

## Purpose

Provide a centralized, read-only organization-wide view of all document export jobs and their status. Supports compliance audit trails for document provenance, timestamped export records, and export queue visibility.

## Current implementation

- `frontend/pages/exports.tsx` renders the full page.
- Renders standardized header via `PageHeaderWithWhy` (`Operations & Compliance` → `Exports Registry`).
- Renders `ExportsRegistryKpiGrid` with stats derived from all export jobs.
- Renders `ExportsRegistryFiltersPanel` for status and type filters.
- Renders `ExportsRegistryTable` with filtered job list; each row has a download action trigger.
- Renders `ExportDownloadDialog` (modal) opened on row download click — destination selection and execution flow.
- Provides a `Filters` button in the header right area that smooth-scrolls to the filters panel.
- Uses bottom `Governance note` footer card.

### Components

| Component | File | Purpose |
| --- | --- | --- |
| `ExportsRegistryKpiGrid` | `components/exportsRegistry/` | Stats summary cards |
| `ExportsRegistryFiltersPanel` | `components/exportsRegistry/` | Status + type filter selectors |
| `ExportsRegistryTable` | `components/exportsRegistry/` | Sortable job list with download triggers |
| `ExportDownloadDialog` | `components/exportsRegistry/` | Two-step download modal (local / remote) |

## Data sources and state

- **Export jobs:** `useMockStore((state) => state.exports)` — all jobs from the Zustand mock store.
- **View model helpers:** `buildExportRegistryStats`, `filterExports`, `DownloadDestination`, `ExportStatusFilter`, `ExportTypeFilter` from `lib/exportRegistryViewModel`.
- **Download action clients:** `downloadExportToBrowser`, `uploadExportToRemote` from `lib/exportRegistryClient`.

## UX and behavior contract

### Filters

- Status filter: `All | Queued | Processing | Done | Failed`
- Type filter: `All | PDF | Markdown | Excel | ...`
- `filteredCount` / `totalCount` shown in filter panel header.

### Download dialog flow

1. User clicks download on a table row → `ExportDownloadDialog` opens.
2. User selects destination: **Local** (browser download) or **Remote** (push to server URL).
3. **Local:** calls `downloadExportToBrowser(exportJob)` — triggers browser file download.
4. **Remote:** requires a `remoteServerUrl`; calls `uploadExportToRemote({ exportJob, remoteServerUrl })`.
5. Both paths: loading spinner during transfer, inline error on failure, dialog closes on success.
6. Back button within dialog resets destination selection without closing.

### Header scroll action

- `Filters` button in header right area calls `filtersRef.current?.scrollIntoView({ behavior: 'smooth' })`.

## Known boundaries

- The registry is read-only — export jobs are created by source pages (e.g., Artifact Lab, Document Hub) and written to mock store.
- No pagination; filter operates on full in-memory job list.
- Remote upload endpoint URL is entered by the user; no server-side validation of the URL.

## Acceptance criteria

- Registry displays all export jobs from mock store with correct status badges.
- Status and type filters reduce visible rows in real time.
- Filters scroll button smoothly navigates to filter panel.
- Local download triggers browser file save via `downloadExportToBrowser`.
- Remote upload sends job payload to user-supplied URL via `uploadExportToRemote`.
- Dialog shows inline error on download/upload failure without closing.
- Dialog closes automatically on successful transfer.
