# Frontend implementation plan with route map of tasks (Next.js)

<!-- markdownlint-disable MD007 MD022 MD029 MD032 MD058 MD060 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2026-3-15  
**Author persona:** `@frontend-eng`  
**AAMAD phase:** 2.build  

> Scope note: This is a **Phase-0 planning artifact**. For current implemented frontend routes and behavior, use `project-context/2.build/frontend.md` and the page-specific `frontend_*.md` documents.

## 1 Route map (Phase 0)
| Area | Route | Purpose |
|---|---|---|
| Auth | `/login` | Branded login entry |
| Shell | `/` | Doc Hub landing page after auth |
| Command Center | `/dashboard` | CTA + project overview + restore session |
| Bridge | `/bridge` | Runs list |
| Bridge | `/bridge/new` | Stepper intake/classification/result |
| Bridge | `/bridge/runs/[runId]` | Run detail + resume stepper |
| Artifact Lab | `/artifact-lab/[runId]` | Generate/refine artifacts |
| Auditor Vault | `/auditor-vault/[runId]` | Compare evidence + gaps |
| Docs | `/documents` | All documents list |
| SOPs | `/sops` | SOP list |
| Forms | `/forms` | Forms/templates list |
| Risk | `/risk/rmf` | RMF list |
| Risk | `/risk/fmea` | FMEA list |
| Architecture | `/architecture` | arc42 list |
| Exports | `/exports` | Org-wide Ready-only exports registry |
| Audit | `/audit-trail` | Global audit trail timeline |
| Document Hub | `/doc/[docId]/content` | Read/Edit content |
| Document Hub | `/doc/[docId]/workflow` | Comments + approvals |
| Document Hub | `/doc/[docId]/links` | Outgoing/incoming links |
| Document Hub | `/doc/[docId]/exports` | Per-doc exports |
| Document Hub | `/doc/[docId]/help` | Help + snippets |

## 2 Task breakdown by implementation layers

### Layer 0 — Foundations (theme + layout)
1. Create Tailwind theme tokens (blue/green/amber/red + neutrals).
2. Build layout primitives:
   - `AppShell` (sidebar + topbar)
   - `PageHeader` (title + breadcrumb)
   - `Card`, `Chip`, `Button`, `Table`, `Drawer`, `Modal`, `Stepper`
3. Add Focus mode + Fullscreen toggles (UI + basic functionality for fullscreen).

### Layer 1 — Navigation + shells
4. Implement `/login` page (no shell).
5. Implement authenticated layout wrapper (can be simple state for Phase 0).
6. Add sidebar routes + placeholder pages.

### Layer 2 — Documents (governance core)
7. Implement list pages with shared table:
   - documents/sops/forms/rmf/fmea/architecture
8. Implement Document Hub header and route-based “tabs”.
9. Implement Workflow page (comments only here; status stepper).
10. Implement Exports per-doc page + Export action button (job creation stub ok).

### Layer 3 — Locks + edit gating
11. Implement lock banner behaviors:
   - denied lock → read-only with banner
   - acquired lock → edit mode state + autosave indicator placeholder
12. Ensure Edit is disabled across lists/hub when locked by others.

### Layer 4 — Operations + Exports registry + exit blocking
13. Implement Operations indicator + drawer with job list.
14. Wire exit-blocking modal to “jobs running” state.
15. Implement `/exports` registry page (Ready-only).

### Layer 5 — Bridge pages (orchestration)
16. Implement `/bridge/new` stepper:
   - intake (file input UI)
   - classification (verdict + why + citations component)
   - result (next actions)
17. Implement `/bridge` runs list and `/bridge/runs/[runId]` detail.

### Layer 6 — Artifact Lab + Auditor Vault + Audit Trail
18. Implement `/artifact-lab/[runId]` 3-column layout + chat overlay stub.
19. Implement `/auditor-vault/[runId]` comparison layout + gap list.
20. Implement `/audit-trail` timeline + filters (mock events initially).

---

## Audit

```text
persona=frontend-eng
action=develop-fe
timestamp=2026-3-15
adapter=AAMAD-vscode
artifact=project-context/2.build/phase0_frontend_route_map.md
version=0.1.0
status=complete
```
