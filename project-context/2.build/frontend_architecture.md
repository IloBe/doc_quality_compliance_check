# Frontend Page Documentation — Architecture (arc42)

**Page label:** Governance Library  
**Route:** `/architecture`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, statically generated from filesystem arc42 markdown templates

## Purpose

Provide a structured viewer for arc42 architecture documentation templates. Enables governance teams to review design intent, constraints, and architectural decisions in a consistent, audit-ready format.

## Current implementation

- `frontend/pages/architecture.tsx` renders the full page.
- Uses `getStaticProps` (Next.js static generation) to read all `.md` files from `templates/arc42/`.
- Renders standardized header via `PageHeaderWithWhy` (`Governance Library` → `Architecture (arc42)`).
- Header right area shows a template count badge (`N arc42 Templates`).
- Renders a two-column layout (`xl:grid-cols-3`):
  - **Left (1/3):** `Arc42TemplateListPanel` — card list of all templates with active selection.
  - **Right (2/3):** `Arc42TemplateContentPanel` — rendered HTML content of selected template.
- Uses bottom `Governance note` footer card (blue).

### Components

| Component | File | Purpose |
| --- | --- | --- |
| `Arc42TemplateListPanel` | `components/architecture/` | Selectable list of arc42 template cards |
| `Arc42TemplateContentPanel` | `components/architecture/` | HTML content viewer for active template |

## Data sources and state

### Static generation (`getStaticProps`)

- Reads `templates/arc42/*.md` from the filesystem at build time (relative to `process.cwd()`).
- Files are sorted alphabetically and mapped to `Arc42Item`:

```typescript
type Arc42Item = {
  id: string;        // fileName
  fileName: string;
  title: string;     // parsed from markdown frontmatter or fallback from fileName
  version: string;   // parsed from 'Version:' field in markdown
  status: string;    // parsed from 'Status:' field in markdown
  html: string;      // marked.parse() result
};
```

- Helpers: `parseArc42Title`, `parseArc42Field`, `resolveActiveArc42Template` from `lib/architectureViewModel`.

### Client state

- `activeTemplateId` — local state initialized to `templates[0]?.id || ''`.
- `activeTemplate` derived via `resolveActiveArc42Template(templates, activeTemplateId)`.
- Template selection updates `activeTemplateId`; content panel re-renders immediately.

## UX and behavior contract

- First template in the sorted list is selected by default.
- Clicking a card in the list panel activates that template and renders its HTML content.
- Template count badge in header reflects the actual number of `.md` files found at build time.
- Content panel renders compiled HTML via `marked.parse()` — supports all standard markdown syntax.

## Known boundaries

- Page is statically generated; adding new arc42 template files requires a Next.js rebuild.
- No search or filter on the template list.
- No write capability — templates are read-only on this page.
- Template metadata (version, status) depends on consistent field naming in each `.md` file.

## Acceptance criteria

- All `.md` files from `templates/arc42/` are displayed as selectable cards.
- Default selection renders first template content on page load.
- Selecting a different card updates the content panel immediately.
- Template count badge shows the correct number.
- Content renders as formatted HTML (not raw markdown).
- Governance note footer is visible at the bottom of the page.
