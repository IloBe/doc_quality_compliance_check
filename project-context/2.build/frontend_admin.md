# Frontend Page Documentation — Admin

<!-- markdownlint-disable MD007 MD009 MD013 MD022 MD031 MD032 MD034 MD036 MD037 MD060 -->

**Page label:** Admin Center
**Routes:** `/admin`, `/admin/observability`, `/admin/stakeholders`
**Protection:** Protected route inside `AppShell`
**Owner persona:** `@frontend-eng`
**Status:** Implemented — mixed admin module set (demo-backed observability, backend-backed stakeholder governance)

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
| **Current user context** | Displays authenticated session email and role list |
| **Employee assignment area** | Add / remove named employees to the currently selected role profile (persisted in PostgreSQL) |

#### Employee assignment feature

- **Single-add mode:** text input + "Add" button. Calls `POST /api/v1/admin/stakeholder-profiles/{profile_id}/employees`.
- **Bulk-add mode:** toggled via a "Bulk Add" button. Accepts a textarea with one employee name per line. On submit: deduplicates names via `Set`, fires `Promise.allSettled` in parallel, then displays a success/fail count message.
- **Remove:** each assigned employee has an inline "Remove" button. Calls `DELETE /api/v1/admin/stakeholder-profiles/{profile_id}/employees/{assignment_id}`.
- **Persistence:** assignments are stored in the `stakeholder_employee_assignments` PostgreSQL table (Alembic migration 008) with `assignment_id`, `profile_id`, `employee_name`, `created_by`, `created_at`.
- **Backend authorization:** assignment/profile reads are available to `qm_lead`, `riskmanager`, `auditor`, and `architect`; assignment/profile mutations are restricted to governance owner roles (`qm_lead`, `riskmanager`).

#### Data sources

| Endpoint | Client function |
|---|---|
| `GET /api/v1/admin/stakeholder-profiles?include_inactive=true` | `fetchStakeholderProfiles(true)` |
| `GET /api/v1/admin/stakeholder-profiles/{id}/employees` | `fetchStakeholderAssignments(profileId)` |
| `POST /api/v1/admin/stakeholder-profiles/{id}/employees` | `addStakeholderAssignment(profileId, employeeName)` |
| `DELETE /api/v1/admin/stakeholder-profiles/{id}/employees/{assignmentId}` | `removeStakeholderAssignment(profileId, assignmentId)` |

Client module: `frontend/lib/stakeholderClient.ts`

---

## Header style

All admin pages use the standardized `PageHeaderWithWhy` pattern:

- breadcrumb-style eyebrow label (`System Administration`, `Admin / Observability`, `Admin / Access Governance`),
- explicit page purpose subtitle,
- context explanation rendered via the shared page-header framework.

---

## UX and behavior contract

- Admin section remains discoverable from left navigation with nested subitems.
- Observability page shows explicit loading/error states in backend mode.
- Metrics retrieval degrades gracefully if `/metrics` is unavailable (null snapshot values, no page crash).
- Admin pages render within shared protected shell conventions.
- Demo mode is clearly labeled via blue banner to prevent operator confusion.
- Stakeholder bulk-add shows success/fail summary count.
- Stakeholder profile loading falls back to the seeded in-app profile set when backend retrieval fails.
- `/admin` overview page uses standardized `Governance note` footer convention.

---

## Acceptance criteria

- Clicking `Admin` reveals navigable subitems (`Observability`, `Stakeholders & Rights`).
- `/admin/observability` demo mode renders KPI/aspect/workflow/prompt-output sections without backend dependency.
- `/admin/observability` backend mode fetches summary, traces, workflow breakdown, and metrics snapshot.
- `/admin/stakeholders` supports profile save, single assignment add/remove, and bulk assignment add.
- Assignment rows persist across page refresh (backend persistence).
- Stakeholder page documentation does not imply a standalone demo mode for assignment persistence.
- Route protection remains session-based via `_app.tsx`; unauthorized users redirect to `/login`.

---

## Known boundaries

- Permission matrix persistence exists through profile save flow, but broader policy rollout controls remain a future governance increment.
- No in-UI distributed trace explorer; page focuses on quality telemetry summary views.
- Prometheus surface is concise snapshot, not a full monitoring dashboard replacement.
- Product-user chatbot support remains a future module.
