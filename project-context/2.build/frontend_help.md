# Frontend Page Documentation — Help & Snippets

**Page label:** Support / Knowledge Base  
**Routes:** `/help` (index) · `/help/glossary` · `/help/qa`  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, static/local-backed with user-editable glossary

## Purpose

Reduce decision friction during audits and reviews by centralizing repeatable answers, terminology, and evidence-oriented guidance in one place. Supports consistent language across engineering, QM, audit, and risk teams.

---

## Part 1 — Help index (`/help`)

### Current implementation

- `frontend/pages/help/index.tsx` renders the landing page.
- Renders standardized header via `PageHeaderWithWhy` (`Support / Knowledge Base` → `Help & Snippets`).
- Renders `HelpCenterSummaryGrid` — KPI-style summary of help content counts.
- Renders `HelpNavigationCards` — card links to sub-sections (Glossary, Q&A, and any additional navigation targets).
- Renders `HelpSnippetHighlights` — curated snippet examples for quick reference.
- Uses bottom `Governance note` footer card (amber).

### Data sources

- `buildHelpCenterSummary()` — summary stats from `lib/helpCenterViewModel`.
- `buildHelpSnippets()` — static snippet content.
- `HELP_NAVIGATION_CARDS` — static navigation card definitions.

---

## Part 2 — Glossary (`/help/glossary`)

### Glossary implementation

- `frontend/pages/help/glossary.tsx` renders the glossary page.
- Renders standardized header via `PageHeaderWithWhy` (`Help & Snippets / Glossary` → `Glossary`).
- Renders `GlossaryComposer` — form to add new glossary terms locally.
- Renders `HelpSearchPanel` — substring filter across term, domain, and definition fields.
- Renders `GlossaryTable` — paginated/filtered list of glossary terms.
- Uses bottom `Maintenance note` footer card (emerald).

### Components

| Component | File | Purpose |
| --- | --- | --- |
| `GlossaryComposer` | `components/helpCenter/` | Draft form for adding a new term |
| `HelpSearchPanel` | `components/helpCenter/` | Shared substring search input |
| `GlossaryTable` | `components/helpCenter/` | Filtered term display table |

### Data sources and state

- Initial terms: `HELP_GLOSSARY_TERMS` from `lib/helpCenterViewModel`.
- `glossaryItems` — local state, initialized with static terms; new terms appended on submit.
- `draft` — local `GlossaryTerm` state managed by `GlossaryComposer`.
- `canSubmitGlossaryDraft(draft)` — validation guard (non-empty term + domain + definition).
- `useSubstringFilter` with `getGlossarySearchText` — filter across term, domain, definition.
- `appendGlossaryDraft(prev, draft)` — adds new term and resets draft.

### Glossary behavior

- New terms are appended to local state only; no backend persistence.
- Filter reduces visible items in real time.
- Submit button disabled when `canSubmitGlossaryDraft` returns false.

---

## Part 3 — Q&A (`/help/qa`)

### Q&A implementation

- `frontend/pages/help/qa.tsx` renders the Q&A page.
- Renders standardized header via `PageHeaderWithWhy` (`Help & Snippets / Q&A` → `Q&A`).
- Renders `HelpSearchPanel` — substring filter across questions, answers, and examples.
- Renders a two-column layout (`xl:grid-cols-3`):
  - **Left (1/3):** `HelpQaSidebar` — filterable Q&A entry list.
  - **Right (2/3):** `HelpQaDetailPanel` — full detail for selected entry.
- Uses bottom `Editorial rule` footer card (indigo).

### Q&A components

| Component | File | Purpose |
| --- | --- | --- |
| `HelpQaSidebar` | `components/helpCenter/` | Selectable list of Q&A entries |
| `HelpQaDetailPanel` | `components/helpCenter/` | Full answer + example display |
| `HelpSearchPanel` | `components/helpCenter/` | Shared substring search input |

### Q&A data sources and state

- `HELP_QA_ENTRIES` — static Q&A entries from `lib/helpCenterViewModel`.
- `selectedId` — local state, initialized to first entry.
- `useSubstringFilter` with `getQaSearchText` — filter across question + answer + examples.
- `getSelectedQaEntry(filteredItems, selectedId)` — resolves selected entry from filtered list.

### Behavior

- Selecting a sidebar entry renders full answer in the detail panel.
- Filter reduces sidebar list in real time.
- Detail panel renders the currently selected entry or null if none match filter.

---

## Shared conventions

- All three pages use the `PageHeaderWithWhy` pattern with consistent eyebrow hierarchy.
- `HelpSearchPanel` is a shared component reused across glossary and Q&A.
- No backend calls from any help page — all data is static or local-state.

## Known boundaries

- Glossary additions are session-only; no backend persistence.
- Q&A entries are static; no add/edit UI on this page.
- Navigation cards on the help index are static links.

## Acceptance criteria

- Help index renders summary grid, navigation cards, and snippet highlights.
- Glossary displays all static terms; new term can be added via composer (local only).
- Glossary filter reduces visible items across term, domain, and definition.
- Q&A sidebar lists all entries; selecting one populates the detail panel.
- Q&A filter reduces visible entries in real time.
- All three pages render footer cards with correct accent colors.
