# Frontend Page Documentation — SOPs

**Page label:** Governance Library  
**Route:** `/sops`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, statically generated from filesystem SOP markdown files

## Purpose

Centralize controlled SOP (Standard Operating Procedure) templates so teams can quickly review required process structure, ownership, and evidence expectations before execution or audit.

## Current implementation

- `frontend/pages/sops.tsx` renders the full page.
- Uses `getStaticProps` (Next.js static generation) to read all `.md` files from `templates/sop/`.
- Renders standardized header via `PageHeaderWithWhy` (`Governance Library` → `SOPs`).
- Header right area shows a SOP file count badge (`N SOP Files`).
- Renders a two-column layout (`xl:grid-cols-3`):
  - **Left (1/3):** `SopListPanel` — card list of all SOPs with active selection.
  - **Right (2/3):** `SopContentPanel` — rendered HTML content of the selected SOP.
- Uses bottom `Governance note` footer card (blue).

### Components

| Component | File | Purpose |
| --- | --- | --- |
| `SopListPanel` | `components/sops/` | Selectable list of SOP cards |
| `SopContentPanel` | `components/sops/` | HTML content viewer for active SOP |

## Data sources and state

### Static generation (`getStaticProps`)

- Reads `templates/sop/*.md` from the filesystem at build time.
- Files sorted alphabetically and mapped to `SopItem`:

```ts
type SopItem = {
  id: string;          // fileName
  fileName: string;
  title: string;       // parsed via parseSopTitle() or fallback from fileName
  documentId: string;  // parsed via parseSopDocumentId() from markdown metadata
  html: string;        // marked.parse() result
};
```

- Helpers: `parseSopTitle`, `parseSopDocumentId`, `resolveActiveSop` from `lib/sopsViewModel`.

### Client state

- `activeSopId` — local state initialized to `sops[0]?.id || ''`.
- `activeSop` derived via `resolveActiveSop(sops, activeSopId)`.
- Selection changes update `activeSopId`; content panel re-renders immediately.

## UX and behavior contract

- First SOP in the sorted list is selected by default.
- Clicking a card activates that SOP and renders its HTML content in the right panel.
- SOP file count badge in header reflects the actual number of `.md` files found at build time.
- Content panel renders compiled HTML via `marked.parse()`.

## Known boundaries

- Page is statically generated; adding new SOP files requires a Next.js rebuild.
- No search or filter on the SOP list.
- No write capability — SOPs are read-only on this page.
- `documentId` metadata depends on a consistent field present in each SOP `.md` file.

## Relationship to compliance

- SOPs are governed process templates aligned with compliance standards.
- The SOP page provides read-only reference access — operational actions and approvals occur in their respective workflow pages.

## Acceptance criteria

- All `.md` files from `templates/sop/` are displayed as selectable cards.
- Default selection renders first SOP content on page load.
- Selecting a different card updates the content panel immediately.
- File count badge shows the correct number.
- Content renders as formatted HTML.
- Governance note footer is visible at the bottom of the page.
