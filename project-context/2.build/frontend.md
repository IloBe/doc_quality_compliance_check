# Frontend Implementation Documentation — Doc Quality Compliance Check

<!-- markdownlint-disable MD007 MD009 MD013 MD022 MD031 MD032 MD034 MD036 MD037 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.7.0  
**Date:** 2026-4-3  
**Author persona:** `@frontend-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The frontend is a **Next.js + React + TypeScript** workstation UI that wraps protected workspace pages in a shared shell and keeps public authentication/recovery pages outside that shell.

This document reflects the **current shipped implementation**, not the earlier single-page static MVP concept.

### Current frontend baseline

- **Runtime:** Next.js application in `frontend/` with the Pages Router.
- **Auth model:** backend-issued HTTP-only session cookie, checked on protected route load.
- **Shell model:** authenticated pages render inside `AppShell` with sidebar, topbar, operations drawer, and blocking modal.
- **Data model:** hybrid frontend — auth/recovery, document upload/retrieval, and document lock actions are backend-integrated with graceful demo fallback for continuity.
- **Content model:** architecture and SOP library pages render markdown from repository templates at build time.
- **Operational model:** local development normally runs frontend on `localhost:3000` and backend on `127.0.0.1:8000`.

### UX principles currently expressed in code

- **Workflow-first navigation:** pages are organized around document operations, dashboard, governance references, and bridge orchestration.
- **Role-aware interaction:** buttons and actions are disabled when RBAC permissions are missing.
- **Explainability:** workspace pages include contextual “Why this page matters” guidance.
- **Audit-oriented posture:** the UI favors status visibility, document ownership, and route protection over generic CRUD styling.
- **Demo resilience:** the shell stays usable even when only auth/recovery is live, because several workspace datasets still come from a controlled mock store.

---

## Document Scope

This file is the **general frontend implementation baseline** across all pages.

Page-specific companion documents remain:

- [frontend_dochub.md](frontend_dochub.md)
- [frontend_dashboard.md](frontend_dashboard.md)
- [frontend_bridge_overview.md](frontend_bridge_overview.md)
- [frontend_bridge_run.md](frontend_bridge_run.md)
- [frontend_compliance.md](frontend_compliance.md)
- [frontend_login.md](frontend_login.md)
- [frontend_forgot_access.md](frontend_forgot_access.md)
- [frontend_reset_access.md](frontend_reset_access.md)
- [frontend_admin.md](frontend_admin.md)

General requirements that apply to all pages:

- **Role-aware behavior:** UI actions must respect authenticated session permissions.
- **Operational clarity:** loading, redirect, connectivity, and error states must be explicit.
- **Accessibility:** keyboard reachability, semantic labels, and text-based status cues remain mandatory.
- **No-regression policy:** updates must not break session handling, shell navigation, or protected-route redirects.
- **Consistent voice:** page headers, helper panels, and status surfaces should align with the current workstation visual language.

---

## Section 1 – Actual Frontend Structure

```text
frontend/
├── app/                     — App Router experiments / reserved workspace (not primary runtime)
├── components/              — Shared UI shell and workflow components
│   ├── AppShell.tsx         — Protected workspace chrome
│   ├── Sidebar.tsx          — Primary navigation
│   ├── Topbar.tsx           — Global actions and current-user controls
│   ├── OperationsDrawer.tsx — Running jobs / operation visibility
│   ├── BlockingModal.tsx    — Exit confirmation while operations are active
│   ├── DocBridgePage.tsx    — Bridge run experience component
│   ├── PageHeaderWithWhy.tsx — Standardized page header + purpose narrative
│   ├── FooterInfoCard.tsx   — Standardized governance footer note surface
│   └── documentHub/         — Document Hub page + card components
├── lib/
│   ├── authClient.ts        — Auth/recovery API client + health check logic
│   ├── authContext.tsx      — Current user context + permission helpers
│   ├── rbac.ts              — Frontend permission mapping
│   ├── mockStore.ts         — Zustand-backed mock data for demo workflows
│   ├── documentUploadClient.ts — Document upload API + demo fallback
│   ├── documentRetrievalClient.ts — Persistent document list/get client
│   ├── documentLockClient.ts — Document lock acquire/release API + fallback
│   ├── riskActionClient.ts  — Risk action persistence + fallback
│   ├── riskTemplateClient.ts — Risk template persistence client
│   ├── dashboardClient.ts   — Optional live dashboard aggregation client
│   └── observabilityClient.ts — Admin observability API + metrics client
├── pages/
│   ├── _app.tsx             — Session gate + AppShell bootstrap
│   ├── _document.tsx        — Custom document wrapper
│   ├── index.tsx            — Document Hub
│   ├── dashboard.tsx        — Dashboard analytics page
│   ├── compliance.tsx       — Governance / standards overview
│   ├── bridge.tsx           — Bridge orchestration overview page
│   ├── risk.tsx             — RMF/FMEA governance and actions
│   ├── exports.tsx          — Export registry
│   ├── audit-trail.tsx      — Audit events and schedule
│   ├── auditor-workstation.tsx — Human review workstation
│   ├── auditor-vault.tsx    — Read-only evidence inventory
│   ├── artifact-lab/        — Artifact run list + run detail views
│   ├── help/index.tsx       — Help center
│   ├── help/qa.tsx          — Q&A reference page
│   ├── help/glossary.tsx    — Glossary page
│   ├── architecture.tsx     — arc42 library view from markdown templates
│   ├── sops.tsx             — SOP library view from markdown templates
│   ├── doc/[docId]/bridge.tsx — Dynamic document bridge route
│   ├── admin/index.tsx      — Admin center overview
│   ├── admin/observability.tsx — Tracing/quality telemetry view
│   ├── admin/stakeholders.tsx — Stakeholder role templates and rights matrix
│   ├── login.tsx            — Public login page
│   ├── forgot-access.tsx    — Password recovery request page
│   └── reset-access.tsx     — Password reset page
├── public/                  — Static assets
├── styles/
│   └── globals.css          — Tailwind/global styling entry
├── next.config.js           — Dev origin config + backend rewrites
├── package.json             — Frontend dependencies/scripts
└── .env.local.example       — Frontend runtime env template
```

### Important correction vs. older docs

The frontend is **not** a single `index.html` + `styles.css` + `app.js` application anymore. It is a **multi-page Next.js app** with shared shell composition and page-level React components.

---

## Section 2 – Runtime Architecture

### 2.1 Route classes

The frontend currently has two route classes:

1. **Public auth routes**
   - `/login`
   - `/forgot-access`
   - `/reset-access`

2. **Protected workstation routes**
  - `/` (Document Hub)
  - `/dashboard`
  - `/compliance`
  - `/bridge`
  - `/risk`
  - `/exports`
  - `/audit-trail`
  - `/auditor-workstation`
  - `/auditor-vault`
  - `/artifact-lab`
  - `/artifact-lab/[runId]`
  - `/architecture`
  - `/sops`
  - `/help`
  - `/help/qa`
  - `/help/glossary`
  - `/admin`
  - `/admin/observability`
  - `/admin/stakeholders`

### 2.2 Protected route bootstrap

`frontend/pages/_app.tsx` is the frontend entrypoint for route protection.

Behavior:

- Public auth/recovery pages bypass `AppShell`.
- All other routes call `fetchCurrentUser()` on mount.
- If the session is valid, the page renders inside `AppShell`.
- If the session is invalid, the router redirects to `/login`.

This means the frontend depends on **server-side session validity**, not a client-only token store.

### 2.3 Shared shell model

Protected pages render inside `AppShell`, which provides:

- `Sidebar` for primary navigation
- `Topbar` for global actions and user context
- `OperationsDrawer` for long-running/mock operation visibility
- `BlockingModal` to prevent unsafe exit while operations are running

This is the current workstation frame for the product.

---

## Section 3 – Authentication and Session Behavior

### 3.1 Auth API integration

`frontend/lib/authClient.ts` is the source of truth for auth calls.

Implemented browser flows:

- `loginWithPassword()` → `POST /api/v1/auth/login`
- `logoutSession()` → `POST /api/v1/auth/logout`
- `fetchCurrentUser()` → `GET /api/v1/auth/me`
- `requestPasswordRecovery()` → `POST /api/v1/auth/recovery/request`
- `verifyRecoveryToken()` → `POST /api/v1/auth/recovery/verify`
- `resetPasswordWithToken()` → `POST /api/v1/auth/recovery/reset`

All auth requests use `credentials: 'include'` so the browser sends the backend-issued session cookie.

### 3.2 Local development proxy model

`frontend/next.config.js` rewrites:

- `/api/:path*` → FastAPI backend `/api/:path*`
- `/health` → FastAPI backend `/health`

This allows the browser to treat auth requests as same-origin to the Next.js app, which keeps `SameSite=Lax` session cookies usable in local development.

### 3.3 Login page behavior

`frontend/pages/login.tsx` is a real React login page, not a static splash screen.

It currently includes:

- prefilled demo credentials for local evaluation,
- remember-me checkbox wired to backend TTL behavior,
- inline error surface for failed authentication,
- optional Auth API status badge,
- live “checked ago” indicator for the health badge.

### 3.4 Health badge stability design

The Auth API badge deliberately uses a **direct backend health call** instead of the Next.js proxy path.

Current behavior:

- health target defaults to `NEXT_PUBLIC_HEALTH_ORIGIN`
- falls back to `NEXT_PUBLIC_API_ORIGIN`
- final fallback is `http://127.0.0.1:8000`
- each health request uses a short abort timeout
- polling runs only when the badge is enabled

This keeps the demo badge visible while avoiding repeated dev-proxy noise during backend outages.

---

## Section 4 – Data Sources by Page

The frontend is currently **hybrid**, not uniformly backend-driven.

### 4.1 Backend-driven today

- **Login / logout / session check**
- **Forgot-access / reset-access**
- **Document upload** via `POST /api/v1/documents/upload`
- **Document retrieval** via `GET /api/v1/documents` and `GET /api/v1/documents/{id}`
- **Document locking** via `POST /api/v1/documents/{id}/lock/acquire` and `.../release`
- **Optional dashboard summary** when `NEXT_PUBLIC_DASHBOARD_SOURCE=backend`
- **Auth health badge** on login
- **Admin observability summary** via `GET /api/v1/observability/quality-summary?window_hours=…`
- **Admin LLM prompt/output traces** via `GET /api/v1/observability/llm-traces?limit=…&window_hours=…`
- **Admin workflow component breakdown** via `GET /api/v1/observability/workflow-components?window_hours=…`
- **Admin metrics snapshot** via backend `/metrics` endpoint (proxied through Next.js rewrite)
- **Stakeholder profiles** via `GET /api/v1/admin/stakeholder-profiles`
- **Stakeholder employee assignments** via `GET/POST/DELETE /api/v1/admin/stakeholder-profiles/{id}/employees`
- **Risk action log persistence** via `/api/v1/risk-templates/actions` (with fallback)

### 4.2 Mock/demo-driven today

`frontend/lib/mockStore.ts` still powers several workstation experiences with Zustand state:

- document card rendering and local filtering in Document Hub
- local lock-state synchronization after backend lock/unlock calls
- export queue simulation
- bridge run status simulation
- operations-running status used by shell modal behavior

This is intentional for the current phase: the workspace remains demoable before every backend endpoint is fully wired into the UI.

### 4.3 Build-time content rendering

Two governance-library pages read markdown from the repository during build:

- `architecture.tsx` reads `../templates/arc42`
- `sops.tsx` reads `../templates/sop`

Both pages use `getStaticProps()` plus `marked` to transform markdown into rendered HTML.

---

## Section 5 – Current Page Map

### 5.1 Document Hub (`/`)

Implemented as `frontend/pages/index.tsx`.

Current behavior:

- loads persisted documents from backend on mount, then merges into local state,
- supports query/project filtering,
- enforces permission-sensitive actions via `useCan(...)`,
- supports lock acquire/release with backend API and demo fallback,
- supports upload with backend persistence and demo fallback,
- links into bridge workflows.

### 5.2 Dashboard (`/dashboard`)

Implemented as `frontend/pages/dashboard.tsx`.

Current behavior:

- defaults to mock-derived analytics,
- can switch to live backend aggregation with `NEXT_PUBLIC_DASHBOARD_SOURCE=backend`,
- supports timeframe changes,
- exposes KPI and risk distribution views.

### 5.3 Compliance (`/compliance`)

Implemented as `frontend/pages/compliance.tsx`.

Current behavior:

- presents governance standards and status cards,
- acts primarily as a reference/guidance surface,
- is not yet the full backend compliance-check execution UI described in older MVP docs.

### 5.4 Bridge overview (`/bridge`)

Implemented as `frontend/pages/bridge.tsx` (self-contained, no alias).

Current behavior:

- presents orchestration concepts and demo bridge entrypoints,
- focuses on workflow framing and demo visibility,
- does not yet represent full end-to-end backend job orchestration state on every screen element.

### 5.5 Architecture library (`/architecture`)

Implemented as `frontend/pages/architecture.tsx`.

Current behavior:

- lists available arc42 markdown templates,
- extracts metadata such as title/version/status when present,
- renders the selected template in-page.

### 5.6 SOP library (`/sops`)

Implemented as `frontend/pages/sops.tsx`.

Current behavior:

- lists markdown SOP files,
- extracts title and optional Document ID,
- renders selected SOP content in-page.

### 5.7 Access recovery pages

Implemented as:

- `frontend/pages/forgot-access.tsx`
- `frontend/pages/reset-access.tsx`

Current behavior:

- recovery request calls the backend,
- reset token is verified before password entry,
- reset form enforces basic client-side validation before submission.

### 5.8 Admin center and sub-pages (`/admin/*`)

Implemented as:

- `frontend/pages/admin/index.tsx`
- `frontend/pages/admin/observability.tsx`
- `frontend/pages/admin/stakeholders.tsx`

Current behavior:

- Sidebar exposes `Admin` with a sublist for `Observability` and `Stakeholders & Rights`.
- Admin overview provides quick navigation cards for both admin modules.
- **Observability page** operates in **demo mode by default** (env-flag pattern identical to Dashboard) — loads representative mock telemetry via `useMemo` with no backend dependency, labeled by a blue "Demo mode" banner. Switches to live data when `NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend`.
  - In both modes it renders: KPI cards (observations / avg score / P95 latency / hallucination reports), quality aspect breakdown table, **workflow component breakdown table** (per research\_agent / document\_analyzer / compliance\_checker), Prometheus snapshot, and recent GenAI prompt/output pairs with a **Rich GenAI Trace Payload** indigo pre-block per trace card (tokens, temperature, latency, hallucination flag, domain-specific extras).
  - Window selector (`24h`, `7d`, `30d`) scales all mock and live values consistently.
- **Stakeholders & Rights page** provides role-template governance UI and **persistent employee assignment per role**:
  - Assignments are stored in PostgreSQL (`stakeholder_employee_assignments`, migration 008) via `POST /api/v1/admin/stakeholder-profiles/{id}/employees`.
  - Single-add mode: text input + Add button.
  - Bulk-add mode: toggled separately; accepts a textarea with one name per line, deduplicates, fires parallel async POSTs, and shows a success/fail count message on completion.
  - Each assignment has an inline Remove button (`DELETE …/employees/{assignment_id}`).

### 5.9 Risk workspace (`/risk`)

Implemented as `frontend/pages/risk.tsx`.

Current behavior:

- supports RMF/FMEA record handling and status transitions,
- writes risk action trail via `riskActionClient` (backend-first, demo fallback),
- creates risk templates via `riskTemplateClient`,
- keeps UI responsive through local view models and filtered table projections.

### 5.10 Reporting and audit pages

Implemented as:

- `frontend/pages/exports.tsx`
- `frontend/pages/audit-trail.tsx`
- `frontend/pages/auditor-workstation.tsx`
- `frontend/pages/auditor-vault.tsx`

Current behavior:

- **Exports Registry** tracks export status, filtering, and download dialog UX.
- **Audit Trail** provides schedule and event-level inspection surfaces.
- **Auditor Workstation** supports reviewer decision workflows.
- **Auditor Vault** provides a read-only, consolidated evidence inventory for audit retrieval.

### 5.11 Help center pages (`/help*`)

Implemented as:

- `frontend/pages/help/index.tsx`
- `frontend/pages/help/qa.tsx`
- `frontend/pages/help/glossary.tsx`

Current behavior:

- provides governance snippets, Q&A quick references, and glossary support,
- complements topbar contextual help with persistent reference content.

---

## Section 6 – Role Awareness and Permission Checks

Frontend role awareness comes from:

- `AuthProvider` in `authContext.tsx`
- permission helpers in `rbac.ts`
- `useCan(permission)` checks inside protected pages

The frontend currently uses permission checks mainly to:

- disable upload/edit actions,
- disable bridge entrypoints when the role is insufficient,
- provide tooltip/title context for blocked actions.

Backend authorization still remains the enforcement authority. The frontend only improves UX and discoverability.

---

## Section 7 – Environment Variables

Current frontend env controls documented in `.env.local.example`:

- `NEXT_PUBLIC_API_ORIGIN`
  - backend base origin for rewrites and direct calls
  - typical local value: `http://127.0.0.1:8000`

- `NEXT_PUBLIC_ENABLE_AUTH_HEALTH_CHECK`
  - controls login-page Auth API badge visibility
  - default shipped expectation: enabled unless explicitly set to `false`

- `NEXT_PUBLIC_HEALTH_ORIGIN`
  - direct backend origin used by login-page health polling
  - avoids relying on the dev proxy for status display

- `NEXT_PUBLIC_DASHBOARD_SOURCE`
  - `backend` enables live dashboard aggregation
  - any other value keeps dashboard on demo/mock mode

- `NEXT_PUBLIC_OBSERVABILITY_SOURCE`
  - `backend` enables live quality telemetry from the PostgreSQL `quality_observations` table
  - any other value keeps observability on demo/mock mode (default; safe for demonstrations before workflow flows emit real telemetry)

---

## Section 8 – Current Gaps and Known Boundaries

The frontend is more advanced than the original static MVP concept, but it is **not yet fully backend-integrated across all pages**.

Important current boundaries:

- Document Hub rendering still depends on local store composition, while persistence and lock ownership are backend-backed.
- Compliance page is currently a governance reference view, not a full interactive compliance run form.
- Workflow/Bridge surfaces are partially demo-oriented and do not expose every orchestrator/runtime state via live backend APIs.
- Dashboard can be live-backed, but defaults to mock mode for resilience.
- Admin stakeholder permission-matrix editing is currently configuration-oriented (template UX, local state); backend persistence for the rights matrix itself remains a future increment. Employee name assignment per role is fully implemented and persisted in PostgreSQL (migration 008).
- Product-user chatbot support is a planned future admin topic and is currently documented as a follow-up extension.
- The shell and RBAC UX are implemented, while some domain workflows are still pending deeper API wiring.

This is the correct state to document for the current codebase.

---

## Section 9 – Development and Runtime Assumptions

### Local development

- Start FastAPI on port `8000`.
- Start Next.js in `frontend/` on port `3000`.
- Use the rewrite/proxy model for same-origin browser auth behavior.
- Keep the login badge enabled when demo visibility matters; disable it only if intentionally reducing status noise.

### Production direction

- Frontend and backend may still be deployed separately.
- Session-cookie behavior, allowed origins, and CORS must remain aligned with backend config.
- Any migration from mock workflows to live APIs should preserve current page contracts, shell structure, and permission UX.

---

## Section 10 – Architecture Decisions Captured Here

- The frontend runtime is **Next.js Pages Router**, not static `StaticFiles` UI serving.
- Auth is **backend-session based**, not localStorage-token based.
- Protected pages are **shell-wrapped** after session validation.
- The current UI is **hybrid live/mock by design**.
- Document lock ownership follows **backend-first control with demo fallback**, preserving continuity under degraded backend conditions.
- Template-library pages are **build-time markdown renderers**.
- The login-page Auth API badge is **default-on and direct-health-based** for stable demo behavior.
- Primary pages standardize a **Governance note** footer card convention for consistent page-level guidance.

---

## Audit Metadata

- Reviewed against current code in `frontend/pages`, `frontend/components`, `frontend/lib`, and `frontend/next.config.js`.
- Updated to remove obsolete references to single-file HTML/CSS/JS architecture.
- Aligned with `README.md`, `IMPLEMENTATION_PLAN.md`, and `project-context/2.build/backend.md` as of 2026-4-3.
