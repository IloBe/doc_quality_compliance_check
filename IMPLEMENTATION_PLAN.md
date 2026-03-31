# Implementation Plan — Doc Quality & Compliance Check System

**Project:** Document Quality & Compliance Check System  
**Version:** 2.0  
**Date:** 2026-03-31  
**Owner:** Development Team  
**Purpose:** Align the implementation plan with the code that is already delivered and define the remaining delivery path.

---

## Overview

This document replaces the earlier time-boxed 6-week rollout view with a **current-state implementation plan** based on the actual repository contents.

The system is no longer a lightweight prototype with mostly planned features. The codebase now already includes:

- a **FastAPI backend** with protected `/api/v1/*` routes,
- a **Next.js frontend** with login, dashboard, workflow/bridge, compliance, and governance pages,
- **PostgreSQL-backed persistence** for sessions, audit events, review records, documents, and findings,
- **server-side session authentication** with role-based authorization,
- **rate limiting, recovery flow safeguards, and structured logging**,
- a separate **CrewAI orchestrator service** that uses the backend as its Skills API/system of record.

Accordingly, the plan below is organized by **implemented workstreams**, **partially completed workstreams**, and **remaining delivery phases**.

---

## 1. Current Implementation Baseline

### 1.1 Runtime topology

| Area | Current state | Status |
| --- | --- | --- |
| Frontend | Next.js pages-router application in `frontend/` | ✅ Implemented |
| Backend | FastAPI app in `src/doc_quality/api/main.py` | ✅ Implemented |
| Persistence | PostgreSQL as primary persistence layer; SQLite available for smoke tests | ✅ Implemented |
| Auth model | Backend-issued HTTP-only session cookies + explicit service authentication | ✅ Implemented |
| Authorization | Role-based route protection via backend dependencies | ✅ Implemented |
| Observability | Structured logging + audit trail persistence | ✅ Implemented |
| Orchestration | Standalone CrewAI orchestrator service via Skills API | 🟡 Partially integrated |
| Legacy UI compatibility | FastAPI `StaticFiles` mount for legacy frontend assets | ⚠️ Compatibility only |

### 1.2 Primary code paths

- **Backend app:** `src/doc_quality/api/main.py`
- **Route modules:** `src/doc_quality/api/routes/`
- **Core services:** `src/doc_quality/services/`
- **Core security/runtime:** `src/doc_quality/core/`
- **ORM + Pydantic models:** `src/doc_quality/models/`
- **Frontend pages:** `frontend/pages/`
- **Frontend API clients:** `frontend/lib/`
- **Orchestrator service:** `services/orchestrator/`

---

## 2. Delivered Workstreams

## 2.1 Platform foundation and backend architecture

**Goal:** Establish the backend platform, configuration model, core services, and API runtime.

| Item | Current state |
| --- | --- |
| Python project scaffold (`pyproject.toml`, uv-based workflow) | ✅ Delivered |
| FastAPI application factory and route registration | ✅ Delivered |
| Pydantic settings / environment configuration | ✅ Delivered |
| Structured logging bootstrap | ✅ Delivered |
| Shared security helpers (sanitization, validation) | ✅ Delivered |
| Standardized error envelope and exception handling | ✅ Delivered |
| Health endpoint (`/health`) | ✅ Delivered |

**Result:** The project already has a production-shaped backend runtime rather than a minimal prototype.

---

## 2.2 Persistence and database implementation

**Goal:** Replace temporary/in-memory persistence assumptions with real database-backed storage.

### Delivered persistence scope

| Item | Current state |
| --- | --- |
| PostgreSQL persistence path | ✅ Delivered |
| Alembic migrations | ✅ Delivered |
| `init_postgres.py` bootstrap script | ✅ Delivered |
| `user_sessions` persistence | ✅ Delivered |
| `hitl_reviews` persistence | ✅ Delivered |
| `audit_events` persistence | ✅ Delivered |
| `skill_documents` persistence | ✅ Delivered |
| `skill_findings` persistence | ✅ Delivered |
| SQLite smoke-test mode | ✅ Delivered as dev convenience |

### Notes

- PostgreSQL is now the **primary persistence layer**, not a future milestone.
- SQLite remains useful only for quick local checks and should not be treated as the architecture target for release validation.
- The previous plan item “replace in-memory stores with DB” is obsolete and has been completed.

**Result:** Persistence is materially ahead of the original plan and already satisfies the main storage/audit/session requirements for the MVP baseline.

---

## 2.3 Authentication, authorization, and security hardening

**Goal:** Secure browser and service access with a hardened authn/authz model.

### Delivered security controls

| Item | Current state |
| --- | --- |
| Email/password login | ✅ Delivered |
| Server-side session creation and revocation | ✅ Delivered |
| HTTP-only session cookie transport | ✅ Delivered |
| Remember-me TTL policy | ✅ Delivered |
| Password hashing + verification | ✅ Delivered |
| Bootstrap MVP user via config | ✅ Delivered |
| Password recovery request / verify / reset flow | ✅ Delivered |
| Recovery token hashing, TTL, single-use enforcement | ✅ Delivered |
| Session revocation after password reset | ✅ Delivered |
| Browser RBAC (`qm_lead`, `architect`, `riskmanager`, `auditor`) | ✅ Delivered |
| Service authentication via API key / bearer | ✅ Delivered |
| Restricted machine access on explicit endpoints only | ✅ Delivered |
| Global API rate limiting | ✅ Delivered |
| Login throttling / temporary lockout | ✅ Delivered |
| Recovery-flow throttling | ✅ Delivered |

### Changed from old plan

The earlier plan treated these topics as future work using **JWT / OAuth2**. That is no longer accurate.

Current implementation uses:

- **server-side session cookies for browser flows**, and
- **API key / bearer authentication for explicit service flows**.

JWT and enterprise SSO remain possible future enhancements, but they are **not** the current implementation baseline.

**Result:** Authentication/authorization is already one of the most mature areas of the system and should be documented as completed hardening work, not a pending phase.

---

## 2.4 Observability, audit trail, and operational safeguards

**Goal:** Provide traceability and operational diagnostics aligned with compliance expectations.

### Delivered observability controls

| Item | Current state |
| --- | --- |
| `structlog`-based structured logging | ✅ Delivered |
| App startup/shutdown logs | ✅ Delivered |
| Request logging middleware (`http_request`) | ✅ Delivered |
| Standardized operational error logging | ✅ Delivered |
| Audit trail persistence in `audit_events` | ✅ Delivered |
| Service-level logging in report, research, HITL, template services | ✅ Delivered |
| Orchestrator event logging through Skills API | ✅ Delivered |
| Correlation fields (`trace_id`, `correlation_id`) in audit model | ✅ Delivered |
| OpenTelemetry request span instrumentation | ✅ Delivered |
| Prometheus metrics endpoint (`/metrics`) | ✅ Delivered |
| Quality telemetry ingestion (`/api/v1/observability/quality-observations`) | ✅ Delivered |
| Quality/evaluation summary API (`/api/v1/observability/quality-summary`) | ✅ Delivered |
| LLM trace capture API (`/api/v1/observability/llm-traces`) + `rich_payload` extraction | ✅ Delivered |
| Workflow component breakdown API (`/api/v1/observability/workflow-components`) | ✅ Delivered |
| `quality_observations` PostgreSQL table (migration 006) | ✅ Delivered |
| Admin Observability page — demo mode (env-flag gated, same pattern as Dashboard) | ✅ Delivered |
| Admin Observability page — backend live mode (`NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend`) | ✅ Delivered |
| `/metrics` proxy rewrite in `next.config.js` | ✅ Delivered |

### Remaining enhancement

| Item | Status |
| --- | --- |
| Centralized dashboards and alert policies | 📋 Planned |

**Result:** Observability now includes structured logs, trace context, Prometheus metrics, and quality/evaluation telemetry. Remaining work is dashboarding and alert policy hardening.

---

## 2.5 Core domain services and APIs

**Goal:** Deliver document analysis, compliance checking, research, reporting, and template APIs.

### Delivered backend services

| Service area | Current state |
| --- | --- |
| Document analysis | ✅ Delivered |
| Document upload | ✅ Delivered |
| EU AI Act compliance checking | ✅ Delivered |
| Regulation applicability mapping | ✅ Delivered |
| Report generation/download | ✅ Delivered |
| Template listing and retrieval | ✅ Delivered |
| Research service | ✅ Delivered |
| Dashboard summary aggregation | ✅ Delivered |
| Bridge run + regulatory alert endpoints | ✅ Delivered |
| HITL workflow service layer | ✅ Delivered |

### Delivered route groups

- `/api/v1/auth/*`
- `/api/v1/documents/*`
- `/api/v1/compliance/*`
- `/api/v1/bridge/*`
- `/api/v1/dashboard/*`
- `/api/v1/reports/*`
- `/api/v1/research/*`
- `/api/v1/templates/*`
- `/api/v1/skills/*`
- `/api/v1/observability/*`

### Partially complete

| Area | Current state |
| --- | --- |
| HITL HTTP lifecycle exposure | 🟡 Service/ORM complete; public route surface still incomplete |
| Additional framework depth (GDPR/MDR/ISO 27001 beyond current baseline) | 🟡 Partial / evolving |

**Result:** Most core backend capabilities are already shipped. The remaining work is now integration completeness and depth, not first implementation.

---

## 2.6 Frontend implementation

**Goal:** Deliver the operator-facing application and connect it to the backend.

### Delivered frontend scope

| Item | Current state |
| --- | --- |
| Next.js frontend scaffold | ✅ Delivered |
| Protected-route bootstrap in `_app.tsx` | ✅ Delivered |
| Login page with Auth API status badge | ✅ Delivered |
| Password recovery pages | ✅ Delivered |
| Document Hub page | ✅ Delivered |
| Dashboard page | ✅ Delivered |
| Workflow / bridge UI | ✅ Delivered |
| Compliance page | ✅ Delivered |
| Governance manual / SOPs / architecture pages | ✅ Delivered |
| Role-aware frontend helpers (`useCan`, RBAC helper layer) | ✅ Delivered |
| Mock-store fallback for MVP interactions | ✅ Delivered |
| Backend client wrappers for auth, bridge, dashboard | ✅ Delivered |
| Admin Observability page (demo + backend mode, workflow breakdown, rich GenAI payload) | ✅ Delivered |
| Admin Stakeholders & Rights page (role-template matrix + persistent employee assignment) | ✅ Delivered |
| `stakeholder_profiles` PostgreSQL table (migration 007) | ✅ Delivered |
| `stakeholder_employee_assignments` PostgreSQL table (migration 008) | ✅ Delivered |
| Bulk-add mode for employee assignment (textarea, deduplication, parallel async POST) | ✅ Delivered |

### Important implementation correction

The old plan described a **vanilla HTML/CSS/JS frontend** as the target. That is no longer correct.

Current frontend is:

- **Next.js + React + TypeScript**,
- using environment-aware API clients,
- with selected backend-connected pages and selected mock-first pages.

### Remaining frontend gaps

| Area | Current state |
| --- | --- |
| Bridge page backend integration | ✅ Implemented behind explicit backend mode |
| Dashboard backend integration | ✅ Implemented behind explicit backend mode |
| Templates/report/documents/compliance pages as fully API-driven UX | 🟡 Partial |
| Legacy static frontend retirement | 📋 Planned |

**Result:** Frontend work is materially more advanced than the old plan suggests, but some UI flows remain intentionally mock-first or partially wired.

---

## 2.7 Orchestrator and agent integration

**Goal:** Support multi-agent workflows while keeping the backend as policy and persistence boundary.

### Delivered

| Item | Current state |
| --- | --- |
| Standalone orchestrator runtime in `services/orchestrator/` | ✅ Delivered |
| CrewAI-based workflow package | ✅ Delivered |
| Skills API boundary | ✅ Delivered |
| Provider adapter abstraction | ✅ Delivered |
| Anthropic adapter | ✅ Delivered |
| OpenAI-compatible adapter scaffold | ✅ Delivered |
| Nemotron scaffold adapter | ✅ Delivered |
| Workflow routing modes / kill switch | ✅ Delivered |
| Audit/event logging from orchestrator to backend | ✅ Delivered |

### Still partial

| Area | Current state |
| --- | --- |
| Broader production workflow catalog | 🟡 Partial |
| Full UI integration of orchestrator workflows | 🟡 Partial |
| Mature automated tests for orchestrator package | 🟡 Partial |

**Result:** The orchestrator is no longer a speculative future item. It exists and should now be treated as an active subsystem that needs expansion and tighter integration.

---

## 3. Current Gaps and Delivery Priorities

## 3.1 Phase A — Complete MVP integration surface

**Priority:** High

### Phase B objectives

- Finish the remaining API-driven UI flows.
- Close the most visible gaps between shipped backend capability and frontend exposure.

### Phase B tasks

| # | Task | Owner | Status |
| --- | --- | --- | --- |
| A.1 | Expose HITL review lifecycle through dedicated HTTP routes | Backend | 📋 Planned |
| A.2 | Add corresponding frontend HITL review UX | Frontend | 📋 Planned |
| A.3 | Wire document analysis/upload flows more directly into Next.js pages | Frontend | 📋 Planned |
| A.4 | Add richer templates browser backed by current templates API | Frontend | 📋 Planned |
| A.5 | Add report generation/download flow into page UX | Frontend | 📋 Planned |
| A.6 | Reduce reliance on mock-first interactions where real APIs already exist | Frontend | 📋 Planned |

### Phase B deliverables

- End-to-end review workflow visible in browser UX
- API-driven document/compliance/report/template flows
- Reduced mismatch between backend capabilities and operator UI

---

## 3.2 Phase B — Production-readiness hardening

**Priority:** High

### Phase C objectives

- Finish the hardening work that remains environment-specific or operational.

### Phase C tasks

| # | Task | Owner | Status |
| --- | --- | --- | --- |
| B.1 | Expand CORS/environment policy for staging/production deployment model | Backend | 📋 Planned |
| B.2 | Strengthen secrets/config guidance for non-dev environments | Backend / DevOps | 📋 Planned |
| B.3 | Add broader integration and regression test coverage for secured route groups | QA | 📋 Planned |
| B.4 | Add deployment packaging and runtime verification for backend/frontend/orchestrator | DevOps | 📋 Planned |
| B.5 | Review role specialization on currently authenticated-only routes (`dashboard`, `templates`) | Backend | 📋 Planned |
| B.6 | Formalize production runbooks for DB/auth/recovery support paths | Ops | 📋 Planned |

### Deliverables

- Production-ready configuration profile
- Better environment-specific security controls
- Broader operational readiness for deployment and support

---

## 3.3 Phase C — Workflow depth and analytics

**Priority:** Medium

### Objectives

- Improve workflow richness, analytics depth, and operator experience.

### Tasks

| # | Task | Owner | Status |
| --- | --- | --- | --- |
| C.1 | Add richer dashboard analytics and trend reporting | Backend / Frontend | 📋 Planned |
| C.2 | Improve bridge progress reporting / streaming UX | Frontend / Backend | 📋 Planned |
| C.3 | Expand orchestrator workflow catalog beyond current flagship path | Backend / AI | 📋 Planned |
| C.4 | Add object-storage strategy for generated artifacts/reports if required | Backend / DevOps | 📋 Planned |
| C.5 | Improve research + compliance cross-linking in UI | Frontend | 📋 Planned |

---

## 3.4 Phase D — Strategic extensions

**Priority:** Medium / Long-term

### Candidate roadmap items

- Enterprise SSO / OIDC integration
- OpenTelemetry distributed tracing
- Expanded regulatory frameworks and deeper rule packs
- Webhook/event integrations
- Confluence / SharePoint integration
- Bulk document processing
- Multi-language support

These should remain roadmap items, not be presented as currently missing MVP essentials.

---

## 4. Updated Architecture Decisions

| ADR | Decision | Current rationale |
| --- | --- | --- |
| ADR-001 | FastAPI as main backend framework | Still correct; central API, policy, and integration boundary |
| ADR-002 | Pydantic settings/models | Still correct; shared validation and config backbone |
| ADR-003 | `structlog` for structured logging | Implemented and actively used |
| ADR-004 | PostgreSQL as primary persistence target | Implemented for sessions, audit, reviews, documents, findings |
| ADR-005 | SQLite as smoke-test path only | Useful for quick local validation, not the main architecture target |
| ADR-006 | Server-side session cookies for browser auth | Implemented and preferred over JWT for current browser model |
| ADR-007 | Explicit service auth for machine clients | Implemented via API key / bearer on allowed machine flows |
| ADR-008 | Next.js frontend instead of vanilla JS | Implemented; replaces earlier frontend assumption |
| ADR-009 | Backend as Skills API / system of record for orchestrator | Implemented and important for guardrails |
| ADR-010 | Provider adapter layer for model integrations | Implemented; keeps orchestrator vendor-neutral |
| ADR-011 | Observability page defaults to demo mode | Same env-flag pattern as Dashboard; zero risk to production audit trail during demos |
| ADR-012 | Stakeholder employee assignments persisted in PostgreSQL | Governance record must survive restarts and be queryable for audit evidence; migration 008 |

---

## 5. Risk Review and Mitigation

| Risk | Current mitigation |
| --- | --- |
| Backend unavailable during frontend demos | Login page health badge + direct health check path |
| Brute-force or abusive auth behavior | Global limiter + login throttling + recovery throttling |
| Unauthorized machine access | `allow_service=True` only on explicitly allowed endpoints |
| Audit trail gaps | `audit_events` persistence + structured logging already in place |
| UI/backend drift | Remaining Phase A work focuses on wiring already-implemented APIs into pages |
| Orchestrator bypassing policy | Skills API boundary prevents direct DB access |

---

## 6. Immediate Next Actions

The most accurate short-term delivery focus is now:

1. **Complete HITL route/UI exposure**
2. **Finish API-driven page integration for documents, compliance, templates, and reports**
3. **Tighten production-readiness for deployment, CORS, secrets, and regression coverage**
4. **Expand orchestrator/UI integration beyond the current flagship workflow**

---

## 7. Summary

The implementation is **substantially ahead** of the earlier plan in several key areas:

- PostgreSQL persistence is already implemented.
- Authentication and authorization are already implemented and hardened.
- Observability and audit logging already exist.
- The frontend is already a Next.js application, not a simple static dashboard.
- The orchestrator service already exists.

The plan should therefore be interpreted as:

- **completed foundation + security + persistence**,
- **partially completed UI/orchestrator integration**,
- **remaining delivery work focused on integration completeness, production hardening, and workflow expansion**.
