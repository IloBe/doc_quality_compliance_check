# Frontend Page Documentation — Admin

<!-- markdownlint-disable MD007 MD009 MD013 MD022 MD031 MD032 MD034 MD036 MD037 MD060 -->

**Page label:** Admin Center
**Routes:** `/admin`, `/admin/observability`, `/admin/stakeholders`
**Protection:** Protected route inside `AppShell`
**Owner persona:** `@frontend-eng`
**Status:** Implemented — live backend data + demo mode

---

## Purpose

Provide a technical administration entrypoint for:

- AI quality observability and tracing-telemetry review,
- stakeholder governance: role-template permission matrix and persistent employee assignment per role,
- authorization-right alignment with the backend RBAC model.

---

## Current implementation

API transport and endpoint-integration details are documented in [integration.md](integration.md), especially Section 2.6 (Observability) and Section 2.7 (Stakeholder Admin API).

### Admin Center overview (`/admin`)

`frontend/pages/admin/index.tsx` renders a quick-navigation card grid that links to both admin sub-modules. No additional data fetches; static shell page.

---

### Observability page (`/admin/observability`)

`frontend/pages/admin/observability.tsx`

#### Data and mode

| Mode | Condition | Effect |
|---|---|---|
| **Demo mode** (default) | `NEXT_PUBLIC_OBSERVABILITY_SOURCE` absent or any value ≠ `backend` | Loads representative mock telemetry from in-memory `useMemo` — no backend call, no DB writes |
| **Live backend mode** | `NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend` | Fetches all four endpoints in parallel |

A blue demo-mode banner is shown in the page when not in backend mode (same pattern as Dashboard).

#### Page sections (all sections active in both modes)

| Section | Description |
|---|---|
| **KPI cards** | Total observations · Avg quality score · P95 latency · Hallucination report count |
| **Quality Aspect Breakdown** | Pass / warn / fail counts, avg score, avg latency per aspect (performance, accuracy, evaluation, hallucination, error) |
| **Workflow Component Breakdown** | Per-component (research\_agent, document\_analyzer, compliance\_checker) — total, pass/warn/fail/info counts, avg latency, latest-event timestamp |
| **Prometheus Snapshot** | HTTP requests total, hallucination reports total, AI evaluations total scraped from `/metrics` |
| **Window details** | Window start / end timestamps for the selected observation window |
| **Recent GenAI Prompt/Output Pairs** | Per-trace: source component, provider, model, timestamp, prompt text, output text, **Rich GenAI Trace Payload** (tokens, temperature, latency, hallucination flag, risk items, etc.) displayed in an indigo-styled collapsible pre-block |
| **Future topic notice** | Product-user chatbot roadmap note |

#### Window selector

Inline tab strip: `24h` · `7d` · `30d`. Re-triggers `load()` on change in both demo and backend modes.

#### Data sources (backend mode)

| Endpoint | Client function |
|---|---|
| `GET /api/v1/observability/quality-summary?window_hours=…` | `fetchQualitySummary(windowHours)` |
| `GET /api/v1/observability/llm-traces?limit=15&window_hours=…` | `fetchLlmPromptOutputPairs(15, windowHours)` |
| `GET /api/v1/observability/workflow-components?window_hours=…` | `fetchWorkflowComponentBreakdown(windowHours)` |
| `GET /metrics` (backend origin, direct) | `fetchMetricsSnapshot()` |

Client module: `frontend/lib/observabilityClient.ts`

#### Demo mock data (demo mode)

The following mock data is returned from `useMemo` hooks keyed on `windowHours`:

- **KPI and aspect summary:** base observation counts scaled by window (143 / 892 / 3 241), five aspects with realistic pass/warn/fail ratios and avg scores (performance 0.87, accuracy 0.79, evaluation 0.75, hallucination 0.62, error null).
- **Workflow breakdown:** three components (`research_agent`, `document_analyzer`, `compliance_checker`) with proportional counts and representative avg latencies (1 920 / 2 240 / 2 980 ms).
- **Prometheus snapshot:** HTTP request totals, hallucination count, AI evaluation count scaled per window.
- **Prompt/output pairs:** three domain-realistic traces (SOP pre-market risk validation, arc42 triage architecture review, FMEA dose calculation compliance check) with actual provider/model fields, rich payloads with `tokens_used`, `finish_reason`, `temperature`, `latency_ms`, `hallucination_flag`, and additional domain-specific fields.

---

### Stakeholders & Rights page (`/admin/stakeholders`)

`frontend/pages/admin/stakeholders.tsx`

#### Page sections

| Section | Description |
|---|---|
| **Role-template selector** | Dropdown to select from available stakeholder roles |
| **Permission toggles** | Read/write/approve/admin toggles per selected role, aligned with `frontend/lib/rbac.ts` |
| **Current user context** | Displays authenticated user name and role |
| **Employee assignment area** | Add / remove named employees to the currently selected role profile (persisted in PostgreSQL) |

#### Employee assignment feature

- **Single-add mode:** text input + "Add" button. Calls `POST /api/v1/admin/stakeholder-profiles/{profile_id}/employees`.
- **Bulk-add mode:** toggled via a "Bulk Add" button. Accepts a textarea with one employee name per line. On submit: deduplicates names via `Set`, fires `Promise.allSettled` in parallel, then displays a success/fail count message.
- **Remove:** each assigned employee has an inline "Remove" button. Calls `DELETE /api/v1/admin/stakeholder-profiles/{profile_id}/employees/{assignment_id}`.
- **Persistence:** assignments are stored in the `stakeholder_employee_assignments` PostgreSQL table (Alembic migration 008) with `assignment_id`, `profile_id`, `employee_name`, `created_by`, `created_at`.

#### Data sources

| Endpoint | Client function |
|---|---|
| `GET /api/v1/admin/stakeholder-profiles` | `fetchStakeholderProfiles()` |
| `GET /api/v1/admin/stakeholder-profiles/{id}/employees` | `fetchStakeholderAssignments(profileId)` |
| `POST /api/v1/admin/stakeholder-profiles/{id}/employees` | `addStakeholderAssignment(profileId, employeeName)` |
| `DELETE /api/v1/admin/stakeholder-profiles/{id}/employees/{assignmentId}` | `removeStakeholderAssignment(profileId, assignmentId)` |

Client module: `frontend/lib/stakeholderClient.ts`

---

## Header style

Both admin sub-pages (`/admin/observability`, `/admin/stakeholders`) implement the same header pattern as the Dashboard:

- breadcrumb label above the page title (`Admin / Observability`, `Admin / Stakeholders & Rights`),
- inline info icon button (`LuInfo`) that toggles a `WhyThisPageMatters` context panel,
- subtitle paragraph with page purpose.

---

## UX and behavior contract

- Admin section must remain discoverable from the left navigation with nested subitems.
- Observability page must show explicit loading / error states in backend mode.
- Technical metrics must degrade gracefully when the metrics endpoint is unavailable (returns `null` values, not a page error).
- Both admin pages must render within the same workstation shell patterns as other protected pages.
- Demo mode must clearly label itself via the blue banner to prevent operator confusion.
- Bulk-add must show a count message confirming how many names were added successfully and how many failed.

---

## Acceptance criteria

- Clicking `Admin` in the sidebar reveals navigable subitems (`Observability`, `Stakeholders & Rights`).
- `/admin/observability` in demo mode shows KPI cards, aspect table, component breakdown table, and three prompt/output trace cards without any backend connection.
- `/admin/observability` in backend mode fetches all four endpoints and renders the same structure with live data.
- `/admin/stakeholders` allows role template permission toggling in UI.
- `/admin/stakeholders` allows adding a single employee name, which appears in the assignment list below the role.
- `/admin/stakeholders` bulk-add mode accepts newline-separated names, deduplicates, and shows a success/fail count message.
- Assignments survive page refresh (backend persistence).
- Route protection remains session-based via `_app.tsx`; unauthorized users are redirected to `/login`.
- All tests in `tests/test_observability_api.py` and `tests/test_stakeholder_profiles_api.py` pass (4/4 each).

---

## Known boundaries

- Permission-toggle save action on the Stakeholders page currently updates local UI state; backend persistence for the permission matrix itself (not employee names) is a planned future increment (Phase A.2).
- No in-UI distributed trace explorer exists; the page visualizes summary telemetry and metric snapshots.
- Prometheus data shown is a concise snapshot, not a full dashboard replacement.
- Product-user chatbot support is a planned follow-up module; it will emit the same prompt/output telemetry pattern when implemented.
