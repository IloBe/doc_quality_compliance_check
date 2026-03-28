# Frontend: Initial Definition of Done (DoD) per Epic (Phase 0)

<!-- markdownlint-disable MD009 MD022 MD032 MD036 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2026-3-15  
**Author persona:** `@frontend-eng`  
**AAMAD phase:** 2.build 

## Epic A — App shell, auth entry, theming (Next.js + Tailwind)
**DoD**
- [ ] Branded `/login` page exists (white/blue/green calm layout; Inter/Open Sans).
- [ ] After “login”, user enters app shell with:
  - top bar (project selector placeholder, search box placeholder, operations icon placeholder, help icon, focus mode, fullscreen, user menu)
  - left sidebar nav with required entries
- [ ] Theme tokens / Tailwind config supports: blue primary, green success, amber warning, red error, neutral surfaces.
- [ ] No glassmorphism. Contrast is readable for tables.
- [ ] “Exit to login” and “Sign out” exist in user menu (can be stubbed) and show correct disabled behavior (see Epic F).

## Epic B — Project/Product context + navigation state
**DoD**
- [ ] Project context exists in UI (Phase 0: 1 project ↔ 1 product).
- [ ] Project selector is visible; selected project is reflected in page headers/breadcrumbs (even if single option).
- [ ] Navigation between pages works without full reload; sidebar highlights active route.
- [ ] Global search field exists (Phase 0 can be UI-only; functional later).

## Epic C — Document lists (Documents/SOP/Forms/Risk/Architecture) + read-only open
**DoD**
- [ ] List pages exist as routes with consistent table component:
  - `/documents`, `/sops`, `/forms`, `/risk/rmf`, `/risk/fmea`, `/architecture`
- [ ] Each row shows: Doc ID, Title, Type, Product, Status, Updated at/by, Lock chip.
- [ ] Row action “Open” navigates to Document Hub (read-only).
- [ ] Row action “Edit” exists and is disabled when locked by someone else (Phase 0: can be mocked lock state).

## Epic D — Document Hub multi-page routing (Focus & Flow)
**DoD**
- [ ] Document Hub header component exists and is reused across doc types:
  - Breadcrumb, Title, Doc ID (copy), Type chip, Product chip, Status chip, Version, Lock chip
  - Actions: Edit, Export PDF, overflow menu
- [ ] Each “tab” is a real route (deep-linkable):
  - `/doc/:id/content`, `/doc/:id/workflow`, `/doc/:id/links`, `/doc/:id/exports`, `/doc/:id/help`
- [ ] Default open mode is **read-only**.
- [ ] Workflow page contains comments UI (even stubbed) and status stepper (Draft → In Review → Approved).

## Epic E — Locks (exclusive edit) UX + enforcement hooks
**DoD**
- [ ] Clicking Edit attempts to acquire lock (Phase 0 can call a placeholder API or be mocked).
- [ ] If lock acquired → UI switches to edit mode:
  - autosave indicator appears (“Saving…” → “Saved …” can be stubbed)
  - lock chip shows “Locked (you)”
- [ ] If lock denied → remains read-only; banner “Read-only — locked by {user} since {time}”.
- [ ] Lock chips appear in lists and hub header consistently.
- [ ] TTL/heartbeat is defined in spec (even if Phase 0 uses stubbed timer).

## Epic F — Operations / Exports job UX + exit blocking
**DoD**
- [ ] Operations indicator in top bar with:
  - idle state, running state (animated ring + badge), error state
- [ ] Operations drawer opens listing jobs (queued/running/ready/failed).
- [ ] Exit to login / Sign out:
  - disabled when jobs running
  - attempt shows blocking modal listing running operations
- [ ] UX is neutral/blue for “busy” (not error-red).

## Epic G — Exports system (per-doc + my inbox + org registry) + DRAFT watermark behavior
**DoD**
- [ ] Per-document exports page `/doc/:id/exports` lists exports for that document only.
- [ ] Sidebar `/exports` page exists:
  - shows **Ready-only** exports
  - supports filtering by doc type/product/status-at-export (Draft/Approved)
  - exports inherit document permissions (Phase 0: can be simulated)
- [ ] Export PDF action enqueues an export job (Phase 0: stub job state ok).
- [ ] Draft export watermark requirement is documented and visible in UI:
  - export entries show chip “DRAFT” if exported from Draft/In Review.
  - (Backend watermarking can be Phase 1 if needed, but the UX must be ready.)

## Epic H — Bridge Runs (Page 2) stepper
**DoD**
- [ ] Bridge Runs list page exists `/bridge` with “New run” CTA.
- [ ] New run flow `/bridge/new` uses stepper:
  - Intake → Classification → Result (Branching can be stubbed per PRD if required)
- [ ] Intake supports adding inputs (UI + file picker; can post to backend later).
- [ ] Classification page shows:
  - verdict card (High/Limited/Minimal)
  - “Why?” panel (placeholder citations ok)
  - run log sidebar (“Steps & evidence”)

## Epic I — Artifact Lab (Page 3) + “Ask the Author” overlay
**DoD**
- [ ] Route `/artifact-lab/:runId` exists.
- [ ] Left artifact list; center editor workspace; right citations panel.
- [ ] “Ask the Author” overlay exists (Phase 0: UI only).
- [ ] Generated/updated artifacts link back to Document Hub pages.

## Epic J — Auditor Vault (Page 4) comparison + gap list
**DoD**
- [ ] Route `/auditor-vault/:runId` exists.
- [ ] Side-by-side layout exists (artifact vs obligations/evidence).
- [ ] Gap list table exists (Phase 0 replaces heatmap).
- [ ] Verdict controls exist: Approve / Request revision / Escalate (Phase 0: actions may be stubbed).

## Epic K — Audit Trail (Page 5) timeline + filters
**DoD**
- [ ] Route `/audit-trail` exists.
- [ ] Timeline list shows events (Phase 0: can be mock data).
- [ ] Filters exist: project/product/run/doc/date range.
- [ ] Links from run/doc pages to audit trail views exist.

---

## Audit

```text
persona=frontend-eng
action=develop-fe
timestamp=2026-3-15
adapter=AAMAD-vscode
artifact=project-context/2.build/phase0_definition_of_done.md
version=0.1.0
status=complete
```
