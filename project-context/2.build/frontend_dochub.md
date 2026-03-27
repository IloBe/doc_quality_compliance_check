# Frontend Page Requirements — Doc Hub

**Page label:** Home / Doc Hub  
**Route:** `/`  
**Owner persona:** `@frontend-eng`

## Purpose

The Doc Hub is the operational entry point for governed documentation assets. Users identify, filter, and start controlled workflows from this page.

## Functional requirements

- Show pre-title label **Home** with dashboard-style label typography.
- Show page title **Document Hub** and an info icon (`LuInfo`) to toggle the "Why this page matters" panel.
- Support search and project filtering via query params (`q`, `project`) and local filter input.
- Render document cards from mock store in demo mode.
- Expose `Acquire Lock` action with role-aware disabled states.
- Expose navigation to per-document Bridge run.

## Data and state

- Source: `useMockStore().documents`.
- Security: role checks from `useCan('doc.edit')` and `useCan('bridge.run')`.

## UX properties

- Evidence-first metadata on each card (ID, status, updatedBy, updatedAt, schema).
- Empty state when no records match filters.
- Status badges must remain clear and color-semantic.

## Acceptance criteria

- Doc Hub opens with active filters reflected in UI.
- Users can start a Bridge workflow from any permitted document.
- Role-restricted actions are visibly disabled with reason text.
