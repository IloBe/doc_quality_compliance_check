# Frontend Page Documentation — Document Hub

**Page label:** Home  
**Route:** `/`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, hybrid persisted/demo workspace entry page

## Purpose

Serve as the controlled landing page for governed documentation assets so users can search records, inspect ownership/status, upload files, manage edit locks, and launch Bridge workflows.

## Current implementation

- Renders standardized header via `PageHeaderWithWhy` (`Home` → `Document Hub`).
- Supports query-driven filtering through `q` and `project` URL params.
- Mirrors query param `q` into local filter state for user editing.
- Loads persisted documents on mount via `listDocuments()` and merges them into local store state.
- Exposes `Upload Document`, lock action button, and Bridge-launch actions.
- Uses a bottom `Governance note` footer card for page-level policy guidance.

## Data sources and permissions

- Primary render source is `useMockStore(state => state.documents)`.
- Persisted list ingestion comes from `documentRetrievalClient` (`GET /api/v1/documents`).
- Upload uses `documentUploadClient` (`POST /api/v1/documents/upload`) with demo fallback.
- Lock actions use `documentLockClient` (`.../lock/acquire`, `.../lock/release`) with demo fallback.
- Local lock synchronization uses `acquireLock`, `releaseLock`, and `setDocumentLock` from mock store.
- Edit permission is controlled by `useCan('doc.edit')`.
- Bridge-launch permission is controlled by `useCan('bridge.run')`.

## UX and behavior contract

- Search input filters by document ID, title, type, and product.
- Pressing `Enter` updates route query via shallow navigation.
- Upload validates file extension before request and surfaces user-facing success/error messages.
- Lock button behavior is ownership-aware:
  - unlocked → `Acquire Lock`
  - locked by current user → `Release Lock`
  - locked by another owner → disabled + owner displayed
- Bridge entry links to `/doc/{docId}/bridge` when role permits it.
- Empty-state card appears when filters produce no matches.

## Known boundaries

- Rendering still relies on local store composition for responsiveness.
- Persistence and lock APIs degrade gracefully to demo behavior when backend is unavailable.
- Status filter UI currently remains presentational (`Status: All`) rather than a separate backend-driven filter control.

## Acceptance criteria

- Existing query filters are reflected in visible UI state.
- Role-restricted actions are disabled rather than silently hidden.
- Upload success inserts a new card immediately and reports backend/demo mode result.
- Lock acquire/release flows show explicit user feedback and owner conflict messaging.
- Users with `bridge.run` permission can open a document Bridge session.
