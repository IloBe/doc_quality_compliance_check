# Integration Documentation — Doc Quality Compliance Check

<!-- markdownlint-disable MD022 MD031 MD032 MD034 MD040 MD058 MD060 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.3.0  
**Date:** 2026-4-3  
**Author persona:** `@integration-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The current integration baseline is a **Next.js multi-page frontend** connected to a **FastAPI backend** over HTTP/JSON. The frontend uses environment-aware API clients and role-aware UI behavior, while the backend owns authentication, authorization, validation, logging, and persistence.

Preferred local setup:

- Next.js frontend on `localhost:3000`
- FastAPI backend on `127.0.0.1:8000`
- Next.js rewrites proxy `/api/*` and `/health` to the backend
- Recommended backend startup entrypoint: `./scripts/start_backend.ps1 -Reload` (idempotent launcher)

This preserves first-party cookie behavior in local development and keeps integration close to production routing patterns.

---

## Section 1 – Frontend ↔ Backend API Integration

### 1.1 Runtime Topology (Current)

| Layer | Status | Notes |
|---|---|---|
| Frontend runtime | ✅ Implemented | Next.js pages router, AppShell, protected-route bootstrap |
| Backend runtime | ✅ Implemented | FastAPI with `/api/v1/*` + `/health` |
| Dev transport | ✅ Implemented | Next.js rewrites proxy API + health |
| Legacy static serving | ⚠️ Compatibility-only path | FastAPI static mount exists, but Next.js runtime is the primary UX path |

### 1.2 API Base Resolution and Credentials

Current frontend clients use this pattern:

```typescript
const _rawOrigin = (process.env.NEXT_PUBLIC_API_ORIGIN ?? '').replace(/\/$/, '');
const API_ORIGIN = _rawOrigin;
const API_BASE = _rawOrigin ? `${_rawOrigin}/api/v1` : '/api/v1';
```

Behavior:

- If `NEXT_PUBLIC_API_ORIGIN` is unset: use relative `/api/v1` (local proxy mode)
- If `NEXT_PUBLIC_API_ORIGIN` is set: call backend directly (remote/staging mode)
- Browser calls use `credentials: 'include'` for session cookie transport

### 1.3 CORS Configuration

Defined in `src/doc_quality/api/main.py`:

```python
app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://0.0.0.0:8000",
  ],
  allow_credentials=True,
  allow_methods=["GET", "POST", "PUT", "DELETE"],
  allow_headers=["*"],
)
```

### 1.4 Auth + RBAC Handshake

Current implemented state:

- `_app.tsx` validates session via `GET /api/v1/auth/me` for all non-public pages.
- Public pages are `/login`, `/forgot-access`, `/reset-access`.
- Protected API routers require authentication with backend-owned session logic.
- Route-level role checks are enforced by backend dependencies (`require_roles(...)`).
- Service clients may use API key/bearer fallback for explicit machine flows.

---

## Section 2 – Request/Response Flow by Current Pages

### 2.1 Session + Access Recovery (Implemented)

Frontend integration points:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/recovery/request`
- `POST /api/v1/auth/recovery/verify`
- `POST /api/v1/auth/recovery/reset`

Flow:

```
Login page submits email/password
    │
    ├── POST /api/v1/auth/login
    │   → backend creates server session
    │   → backend sets HTTP-only cookie
  │   → frontend verifies session via short /auth/me retry bootstrap
    │
    └── App bootstrap calls GET /api/v1/auth/me
        → success: render protected route in AppShell
        → failure: redirect to /login
```

Determinism hardening (current):

- `loginWithPassword(...)` now performs bounded short retries of `GET /api/v1/auth/me` immediately after successful login response before route transition.
- Protected-route bootstrap in `_app.tsx` also retries `GET /api/v1/auth/me` before redirecting to `/login`.
- This removes transient race conditions between cookie issuance and initial protected-route session check on slower local environments.

### 2.2 Bridge Run + Human Review (Implemented, Backend Mode Toggle)

Bridge execution is enabled when `NEXT_PUBLIC_BRIDGE_SOURCE=backend`.

Frontend calls:

```http
POST /api/v1/bridge/run/eu-ai-act
GET /api/v1/bridge/alerts/eu-ai-act/{document_id}
GET /api/v1/bridge/runs/{run_id}/human-review
POST /api/v1/bridge/runs/{run_id}/human-review
POST /api/v1/bridge/agents/reload
```

Bridge request payload (current):

```json
{
  "document_id": "DOC-001",
  "domain_info": {
    "domain": "quality management",
    "description": "...",
    "uses_ai_ml": true,
    "intended_use": "...",
    "target_market": "EU"
  }
}
```

Current UI status:

- `/bridge` uses backend mode to reload bridge agents through `POST /api/v1/bridge/agents/reload`
- `/doc/[docId]/bridge` uses backend mode for bridge execution, alert lookup, and human review retrieval/submission
- Frontend role checks now align with backend bridge authorization so `architect` can execute run + human review actions in backend mode
- When backend mode is off, the page remains in demo mode without live API dependency

Validation coverage:

- `tests/test_bridge_run_api.py` verifies bridge run execution, human review submission/fetch lifecycle, rejection task assignment validation, and bridge agent reload snapshot auditing.

### 2.3 Dashboard Aggregation (Implemented, Backend Mode Toggle)

Dashboard backend mode is enabled when `NEXT_PUBLIC_DASHBOARD_SOURCE=backend`.

```http
GET /api/v1/dashboard/summary?timeframe=week|month|year
```

If backend mode is disabled, dashboard uses mock data from frontend state.

### 2.4 Governance Library Pages (Implemented, Build-Time Markdown)

These pages currently render markdown from repository files via `getStaticProps` (no runtime backend fetch):

- `/sops`
- `/architecture`

### 2.5 Document / Compliance / Risk / Templates / Reports APIs (Mixed Integration)

Backend endpoints are implemented and protected:

- `POST /api/v1/documents/analyze`
- `POST /api/v1/documents/upload`
- `GET /api/v1/documents/{document_id}/lock`
- `POST /api/v1/documents/{document_id}/lock/acquire`
- `POST /api/v1/documents/{document_id}/lock/release`
- `POST /api/v1/compliance/check/eu-ai-act`
- `POST /api/v1/compliance/applicable-regulations`
- `GET /api/v1/risk-templates/`
- `GET /api/v1/risk-templates/defaults/{template_type}`
- `PUT /api/v1/risk-templates/defaults/{template_type}`
- `POST /api/v1/risk-templates/`
- `GET /api/v1/templates/`
- `GET /api/v1/templates/index`
- `GET /api/v1/templates/{template_id}`
- `POST /api/v1/reports/generate`
- `GET /api/v1/reports/download/{report_id}`

Current UI status:

- Bridge and Dashboard are actively wired to backend through explicit mode switches.
- Risk page actively uses backend-backed risk-template defaults and creation, with local demo fallback when backend persistence is unavailable.
- Document Hub live core path is backend-first in both proxy mode (`/api/v1`) and direct-origin mode (`NEXT_PUBLIC_API_ORIGIN`) for list retrieval, upload, and lock acquire/release.
- Document lock APIs are integrated through a dedicated frontend client for ownership/locking flows.
- Compliance flows, templates, and report UX still include mock-first or partially wired interactions in parts of the current Next.js pages.

Validation coverage:

- `tests/test_document_hub_live_api.py` verifies upload → list retrieval → lock acquire/release end-to-end through backend APIs.

### 2.6 Quality Observability API (Implemented, Backend Mode Toggle)

Observability backend mode is enabled when `NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend`. Default is **demo mode** (mock data via `useMemo`, no backend call).

UI implementation details for this section are documented in [frontend_admin.md](frontend_admin.md) under "Observability page (`/admin/observability`)".

```http
GET /api/v1/observability/quality-summary?window_hours=24
GET /api/v1/observability/llm-traces?limit=15&window_hours=24
GET /api/v1/observability/workflow-components?window_hours=24
GET /metrics
```

All four requests are fired in parallel from `observabilityClient.ts`. The `/metrics` endpoint is reached via the Next.js `/metrics` rewrite (not through `/api/v1`). The `fetchMetricsSnapshot()` function uses the `HEALTH_ORIGIN` fallback chain (`NEXT_PUBLIC_HEALTH_ORIGIN` → `NEXT_PUBLIC_API_ORIGIN` → `http://127.0.0.1:8000`) for the direct backend health-origin call when outside the proxy.

Mock data structure (demo mode):

```json
{
  "summary": { "total_observations": 143, "average_score": 0.81, "p95_latency_ms": 2340, ... },
  "components": [
    { "source_component": "research_agent", "total": 51, "pass_count": 44, "average_latency_ms": 1920 },
    { "source_component": "document_analyzer", "total": 48, "pass_count": 40, ... },
    { "source_component": "compliance_checker", "total": 42, "pass_count": 25, ... }
  ],
  "prompt_pairs": [ /* 3 domain-realistic traces with rich_payload */ ]
}
```

### 2.7 Stakeholder Admin API (Implemented, Always Live)

The stakeholder employee assignment endpoints are always called against the live backend (no mock fallback needed — the page is an admin-only management surface):

UI behavior for this integration (single-add vs bulk-add, deduplication, and result messaging) is documented in [frontend_admin.md](frontend_admin.md) under "Stakeholders & Rights page (`/admin/stakeholders`)".

```http
GET    /api/v1/admin/stakeholder-profiles
GET    /api/v1/admin/stakeholder-profiles/{profile_id}/employees
POST   /api/v1/admin/stakeholder-profiles/{profile_id}/employees
DELETE /api/v1/admin/stakeholder-profiles/{profile_id}/employees/{assignment_id}
```

Authorization policy (current):

- `GET` profile/assignment endpoints: `qm_lead`, `riskmanager`, `auditor`, `architect`
- `POST`/`DELETE` assignment endpoints: `qm_lead`, `riskmanager` only (governance ownership)

POST payload:

```json
{ "employee_name": "Maria Müller" }
```

Bulk-add on the frontend fires multiple `POST` calls in parallel via `Promise.allSettled` — each call is atomic and independently fails/succeeds. The UI displays a `"N added, M failed"` message after all settle.

DELETE returns a success payload (`{"success": true}`) and is idempotent for already-removed assignment IDs. Duplicate employee assignment attempts are treated idempotently (same canonical employee name resolves to the existing assignment record).

Validation coverage:

- `tests/test_stakeholder_profiles_api.py` verifies assignment add/list/delete, idempotent add/delete behavior, and role-protected mutation paths.

---

## Section 3 – Serving and Routing Integration

### 3.1 Next.js Proxy Routing (Preferred)

`frontend/next.config.js` rewrites:

- `/api/:path*` → `${NEXT_PUBLIC_API_ORIGIN || 'http://127.0.0.1:8000'}/api/:path*`
- `/health` → `${NEXT_PUBLIC_API_ORIGIN || 'http://127.0.0.1:8000'}/health`
- `/metrics` → `${NEXT_PUBLIC_API_ORIGIN || 'http://127.0.0.1:8000'}/metrics`

The `/metrics` rewrite ensures that the Prometheus snapshot section of the Observability admin page can reach the backend `/metrics` endpoint without cross-origin issues in local development.

### 3.2 Backend StaticFiles Mount (Legacy-Compatible)

FastAPI still mounts `frontend/` via `StaticFiles(directory="frontend", html=True)`.

Current interpretation:

- Preserved for compatibility with legacy static assets (`index.html`, `js/app.js`, `css/styles.css`)
- Not the primary integration path for current Next.js pages
- API routes still take precedence

### 3.3 Health Endpoint

`GET /health` remains the canonical backend health endpoint for frontend checks and operational diagnostics.

---

## Section 4 – Security and Compliance Integration

### 4.1 Authentication Boundary

- Backend owns session creation, revocation, and validation.
- Browser session is carried in a backend-owned HTTP-only cookie.
- Protected routes are no longer public.
- Browser identity checks use `auth/me` (session only).

### 4.2 Authorization Boundary

- Route-level authorization uses required roles (`qm_lead`, `architect`, `riskmanager`, `auditor`, etc.).
- Frontend permission checks (`useCan(...)`) improve UX but do not replace backend authorization.

### 4.3 Request Logging + Rate Limiting

- Structured request logging middleware emits `http_request` events.
- Global API rate limiting can return HTTP `429` with `Retry-After`.

This aligns with SAD requirements for traceability, oversight, and operational control.

---

## Section 5 – Error and Validation Integration

### 5.1 Backend Error Envelope (Current)

Custom exception handlers return a standard envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed"
  }
}
```

Common codes include:

- `request_error`
- `authentication_required`
- `forbidden`
- `not_found`
- `method_not_allowed`
- `conflict`
- `payload_too_large`
- `validation_error`
- `rate_limited`
- `database_unavailable`
- `internal_error`

When backend routes raise `HTTPException` with structured `detail` data (for example conflict metadata such as lock owner), the response still uses the same envelope and preserves additional detail fields under `error.*` for UI compatibility.

### 5.2 Frontend Error Translation

Frontend API clients map backend payloads to operator-friendly messages, including local recovery guidance (backend offline, auth DB unavailable, auth route missing).

### 5.3 File Upload Content-Type Rule

When sending `multipart/form-data`, the frontend must not manually set `Content-Type`; the browser must inject boundary metadata automatically.

---

## Section 6 – Integration Status Matrix

| Area | Status | Notes |
|---|---|---|
| Next.js app shell + protected routes | ✅ Implemented | Session bootstrap + redirect to login |
| Auth API integration | ✅ Implemented | Login/logout/me + recovery flows wired |
| Bridge backend integration | ✅ Implemented (toggle) | `NEXT_PUBLIC_BRIDGE_SOURCE=backend` |
| Bridge human review + agent reload integration | ✅ Implemented (toggle) | Run page uses `human-review` and `agents/reload` endpoints in backend mode |
| Dashboard backend integration | ✅ Implemented (toggle) | `NEXT_PUBLIC_DASHBOARD_SOURCE=backend` |
| Observability backend integration | ✅ Implemented (toggle) | `NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend`; default is demo mode |
| Observability workflow component breakdown | ✅ Implemented | `GET /api/v1/observability/workflow-components` |
| Observability rich GenAI trace payload | ✅ Implemented | `rich_payload` field extracted at query time from observation JSON |
| Observability `/metrics` proxy rewrite | ✅ Implemented | Added to `next.config.js` rewrites |
| Stakeholder employee assignment API | ✅ Implemented | Full CRUD, PostgreSQL-backed (migration 008) |
| Risk template backend integration | ✅ Implemented with demo fallback | `risk.tsx` uses live defaults/create plus local fallback |
| Document lock API integration | ✅ Implemented | Lock acquire/release/state client exists for document ownership UX |
| Document analysis UI integration | 🟡 Partial | Backend endpoint ready; UI still mixed with mock-first flows |
| Compliance check UI integration | 🟡 Partial | Backend endpoint ready; progressive wiring pending |
| Templates API-driven UI | 🟡 Partial | Backend routes available; markdown pages currently build-time |
| Reports generate/download UX | 🟡 Partial | Backend routes available; richer page flow pending |
| Generic HITL review HTTP routes | 🟡 Partial | Bridge-specific human review routes exist; standalone HITL workflow API remains pending |
| Enterprise SSO integration | 🔴 Not yet implemented | Planned in later phase |

---

## Section 7 – Known Integration Issues

### 7.1 PDF Download Requires Filesystem Persistence

Generated PDF reports are stored in the `reports/` directory on the server filesystem. If:
- The server restarts between generation and download
- The `reports/` directory is cleared

Then `GET /api/v1/reports/download/{report_id}` returns HTTP 404.

**Mitigation:** Download reports immediately after generation. Phase 2/3 should add persistent object storage.

### 7.2 HITL API Surface Gap

Bridge-specific human review routes are implemented, but a broader standalone HITL workflow API surface is still incomplete in the current route set.

**Mitigation:** Keep using the existing bridge review endpoints for run-level decisions, and add explicit generic HITL create/list/update endpoints if non-bridge review workflows must be surfaced independently.

### 7.3 CORS Origins for Production

The current CORS allow list is localhost-focused and must be updated for non-localhost deployment domains.

### 7.4 Authentication and Authorization Status

Protected API endpoints are **not public anymore**. The backend now enforces authentication on protected routes via backend-owned session handling for browser users and API key / bearer-token access for explicit service clients.

Current implemented state:

- Browser users authenticate with email/password via `/api/v1/auth/login`.
- The backend issues an HTTP-only session cookie and validates it on subsequent requests.
- `/api/v1/auth/me` is session-only and returns the authenticated browser user.
- Service-to-service access is available for explicit machine endpoints and does not act as a blanket authorization bypass.
- Route-level RBAC is enforced on critical areas such as documents, compliance, research, reports, bridge, and skills.

Current integration limitation:

- Enterprise SSO (OIDC/OAuth2/LDAP/SAML) is not implemented yet and remains a later-phase enhancement.

### 7.5 File Upload Content-Type

When using `multipart/form-data` (file upload), the JavaScript code intentionally does NOT set a `Content-Type` header on the `fetch()` call. The browser must set this header automatically to include the multipart boundary. If `Content-Type: multipart/form-data` is set manually (without the boundary), the upload will fail with a 422 validation error.

---

## Section 8 – Future Integration Work

| Feature | Description | Phase |
| --- | --- | --- |
| WebSocket streaming | Stream LLM analysis progress to frontend in real time | Phase 3 |
| Enterprise SSO integration | OIDC/OAuth2/LDAP/SAML for organization-managed login, keeping backend session abstraction | Phase 2+ |
| Database webhook | Notify frontend when review status changes | Phase 2 |
| File storage backend | Object storage (S3/MinIO) for PDF reports and immutable evidence bundles | Phase 3 |
| Persistent distributed rate limiting | Replace process-local limiter with shared multi-instance throttling / lockout state | Phase 2+ |
| OpenTelemetry dashboards & alerts | Build centralized tracing dashboards and SLO alerting on top of delivered spans/metrics | Phase 3 |

---

## Sources

- FastAPI — CORS Middleware, https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI — StaticFiles, https://fastapi.tiangolo.com/tutorial/static-files/
- FastAPI — Request Body, https://fastapi.tiangolo.com/tutorial/body/
- FastAPI — Error Handling, https://fastapi.tiangolo.com/tutorial/handling-errors/
- Next.js — Rewrites, https://nextjs.org/docs/pages/api-reference/config/next-config-js/rewrites
- MDN Web Docs — Using Fetch, https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN Web Docs — FormData, https://developer.mozilla.org/en-US/docs/Web/API/FormData

---

## Assumptions

1. Local development primarily uses Next.js (`localhost:3000`) + FastAPI (`127.0.0.1:8000`) with rewrite-based API proxying.
2. `GET /health` remains the canonical backend health endpoint.
3. API error responses follow the standardized `error.code` + `error.message` envelope.
4. For MVP, some frontend workflows intentionally remain mock-first while backend integrations are progressively activated.
5. Standalone non-bridge HITL workflow routes and UI wiring remain a planned integration increment.

---

## Open Questions

1. **Bridge progress streaming:** Should bridge run progress move from polling/simulated stages to WebSocket or SSE streaming?
2. **Templates API strategy:** Should SOP and arc42 pages continue build-time filesystem loading, or migrate to backend API retrieval with version pinning?
3. **HITL route model:** Should review APIs live under `/compliance/reviews` or a dedicated `/hitl/*` namespace?
4. **API versioning policy:** Should `/api/v2` preserve strict compatibility contracts with `/api/v1`?
5. **Health depth:** Should `/health` stay shallow or include dependency checks (database/connectivity) under a separate readiness endpoint?

---

## Audit

```Python
persona=integration-eng
action=review-and-align-integration-doc
timestamp=2026-4-3
adapter=AAMAD-vscode
artifact=project-context/2.build/integration.md
version=0.3.0
status=updated
```
