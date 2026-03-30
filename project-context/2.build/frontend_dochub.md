# Frontend Page Documentation — Document Hub

**Page label:** Home  
**Route:** `/`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, mock-backed workspace entry page

## Purpose

Serve as the operational landing page for governed documentation assets so users can filter records, inspect ownership/status, acquire locks, and launch Bridge workflows.

## Current implementation

- Shows pre-title label `Home` and title `Document Hub`.
- Shows a `LuInfo` icon that toggles the `Why this page matters` helper panel.
- Supports query-based filtering through `q` and `project` URL params.
- Mirrors query param `q` into local filter state for input editing.
- Renders document cards from the Zustand mock store.
- Exposes `Upload Document`, `Acquire Lock`, and Bridge-launch actions.

## Data sources and permissions

- Document source is `useMockStore(state => state.documents)`.
- Lock acquisition uses `useMockStore(state => state.acquireLock)`.
- Edit permission is controlled by `useCan('doc.edit')`.
- Bridge-launch permission is controlled by `useCan('bridge.run')`.

## UX and behavior contract

- Search input filters by document ID, title, type, and product.
- Pressing `Enter` updates the route query without a full navigation refresh.
- Upload is currently a permission-gated UI action, not a fully wired document-ingest workflow on this page.
- Lock buttons show either `Acquire Lock` or `Locked by ...` state.
- Bridge entry links to `/doc/{docId}/bridge` when the role permits it.
- An explicit empty state is shown when filters produce no matches.

## Known boundaries

- Document Hub still uses mock data rather than the live documents API.
- Project filtering is query-driven but still works against the local mock dataset.
- Upload and lock behavior are demo-friendly UI flows, not yet full backend document orchestration.

## Acceptance criteria

- Existing query filters are reflected in the visible UI state.
- Role-restricted actions are disabled rather than silently hidden.
- Users with `bridge.run` permission can open a document Bridge session.
- Empty-state and card metadata remain clear and audit-oriented.
