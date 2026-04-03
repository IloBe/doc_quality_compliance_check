# Frontend Page Documentation — Artifact Lab

**Page label:** Generation & Push  
**Routes:** `/artifact-lab` (index) · `/artifact-lab/[runId]` (run workspace)  
**Protection:** Protected route inside `AppShell`  
**Owner persona:** `@frontend-eng`  
**Status:** Implemented, demo-backed with backend export/push clients (demo fallback)

## Purpose

Transform Bridge findings into usable governance artifacts. Connects generated content, regulatory citations, and export flows so teams can move from analysis to auditable deliverables with full traceability.

---

## Part 1 — Index page (`/artifact-lab`)

### Current implementation

- `frontend/pages/artifact-lab/index.tsx` renders the run selection page.
- Renders standardized header via `PageHeaderWithWhy` (`Generation & Push` → `Artifact Lab`).
- Renders a demo-mode info banner (blue).
- Renders four KPI cards: Runs Available, Done Runs, In Progress, Document Links.
- Renders a run selection table with product, status badge, latest document link, evidence count, and `Open Lab` button.
- Uses bottom `Governance note` footer card (blue).

### Data sources

- `useMockStore` — `bridgeRuns` and `documents` from Zustand store.
- `buildArtifactRunCards(runs, docs)` from `lib/artifactLabViewModel` — derives run cards with linked doc metadata.

### Run table columns

`Run | Product | Status | Latest Document | Evidence | Action`

- Status badge: `Done` (emerald), `Running` (blue), `Error` (rose), default (neutral).
- `Open Lab` button links to `/artifact-lab/${encodeURIComponent(run.runId)}`.

---

## Part 2 — Run workspace (`/artifact-lab/[runId]`)

### Current workspace implementation

- `frontend/pages/artifact-lab/[runId].tsx` renders the full artifact workspace.
- `runId` extracted from `router.query.runId`.
- Renders standardized header: eyebrow `Generation & Push`, title `Artifact Lab`, subtitle shows run ID + product + status.
- Header right area: `Exit workflow` button → `/artifact-lab` and `Ask the Author` button.
- Renders a three-column layout (`xl:grid-cols-12`):
  - **Left sidebar (xl:col-span-3):** artifact type selector + linked documents list.
  - **Center editor (xl:col-span-6):** editable Markdown textarea + export center.
  - **Right citations panel (xl:col-span-3):** citation coverage + citation items.
- Renders `Ask the Author` overlay (full-screen modal) when triggered.
- Uses bottom `Governance note` footer card (blue).

### Artifact drafts

Initialized via `buildInitialArtifactDrafts()` from `lib/artifactLabViewModel` — returns a set of typed artifact drafts (e.g., arc42, risk register, compliance summary, etc.).

Each draft: `{ id, kind, title, content, citations[] }`.

### Editor

- Free-form Markdown textarea (`min-h-[420px]`).
- `Save draft` button — simulated 450ms async delay, shows success timestamp or error.
- Content change updates the in-memory draft via `setArtifactDrafts`.

### Export center

Three export actions with demo fallback:

| Button | Client function | Demo fallback |
| --- | --- | --- |
| Export PDF | `exportArtifactPdf(...)` from `lib/artifactExportClient` | `degradedToDemo: true` banner |
| Export MD | `exportArtifactMarkdown(...)` | `degradedToDemo: true` banner |
| Push to Wiki | `pushArtifactToWiki(...)` | local wiki queue note |

- PDF export also calls `enqueueExport(primaryDoc.id)` in mock store to register a job.
- All three show success/error inline banners; loading spinners during execution.

### Citations panel

- Derived from `selectedArtifact.citations`.
- `computeCitationCoverage(citations)` from view model provides a coverage percentage indicator.

### Ask the Author overlay

1. User clicks `Ask the Author` → full-screen overlay opens.
2. Chat thread renders: initial assistant greeting + user/assistant turn history.
3. User types a prompt and submits — user message appended, `createAskAuthorAssistantReply(title)` produces assistant reply.
4. `Apply Latest Proposal` button: calls `applyLatestProposalToDrafts(...)` — inserts proposal content into the current draft, appends confirmation message to chat.
5. **Session outcome gate (required to close):**
   - Select: `Resolved` or `Escalate to HITL reviewer`
   - Rationale: ≥10 characters required
   - `Finish Session` button: validates gate, records outcome in `saveInfo`, closes overlay.
6. Cannot close overlay via escape or click-outside if gate not passed — must complete the session outcome.

### Error / not-found states

- `runId` missing: renders loading placeholder.
- Run not found in store: renders error card with `Back to Artifact Lab` link.

## Known boundaries

- Artifact draft content is in-memory only; `Save draft` simulates persistence (no real backend save endpoint yet).
- Export and push clients call backend endpoints with demo fallback — full persistence requires backend endpoints to be configured.
- Citation data is static per artifact type from `buildInitialArtifactDrafts`.

## Acceptance criteria

- Index page renders run cards from mock store with correct status badges.
- `Open Lab` navigates to correct `[runId]` workspace.
- Workspace editor allows free-form Markdown editing.
- Save draft shows success timestamp or error inline.
- All three export actions execute with loading state and inline feedback.
- Ask the Author overlay requires session outcome + rationale before closing.
- Applying proposal inserts content into the draft editor.
- Run-not-found state shows graceful error card with back navigation.
