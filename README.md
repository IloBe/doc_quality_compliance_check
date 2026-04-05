# Compliance and Quality Check of Technical and Product Software Documentation

AI-assisted compliance and quality assurance platform for software documentation.

<!-- Badges -->
[![Python](https://img.shields.io/badge/python-%E2%89%A53.12-blue)](https://www.python.org/downloads/release/python-3120/)
[![License](https://img.shields.io/github/license/IloBe/doc_quality_compliance_check)](https://github.com/IloBe/doc_quality_compliance_check/blob/main/LICENSE)
[![Pytest Coverage](https://img.shields.io/badge/pytest%20coverage-86.09%25-brightgreen)](project-context/2.build/qa.md)

Current implementation baseline:

- **Frontend:** Next.js + React + TypeScript browser app in `frontend/`
- **Backend:** FastAPI API in `src/doc_quality/api/main.py`
- **Persistence:** PostgreSQL primary path for sessions, reviews, audit events, documents, and findings
- **Authentication:** backend-issued HTTP-only session cookies with role-based authorization
- **Orchestration:** optional standalone CrewAI orchestrator in `services/orchestrator/`

## Business context summary

Software teams in regulated or audit-heavy environments (healthcare, fintech, enterprise SaaS or critical infrastructure) often lose significant time during releases because documentation quality and compliance checks are manual, inconsistent and late in the delivery cycle.

The **Doc Quality Compliance Checker** addresses this by introducing a structured, workflow-oriented system that:

- checks technical documents against governance and quality standards,
- improves consistency across SOP, architecture, and risk artifacts,
- shortens review cycles for QA, compliance, and audit teams,
- reduces release risk by surfacing gaps earlier,
- provides better traceability for approvals and governance decisions.

### Primary business value

- **Faster readiness for audits and reviews** through standardized evidence quality.
- **Lower operational risk** by detecting non-compliance before release gates.
- **Higher team productivity** by reducing repetitive manual document checks.
- **Stronger governance visibility** for product leads, QA, and compliance stakeholders.

### Observability and AI quality telemetry (Admin — technical service)

The **Observability** admin module provides production-grade AI workflow tracing for QM leads, architects, and technical service teams performing quality inspections or preparing for external audits. It visualizes:

- **Quality summary KPIs** — total observations, average quality score, P95 latency, and hallucination report count within a selectable 24 h / 7 d / 30 d window.
- **Quality aspect breakdown** — pass / warn / fail counts and average scores per aspect (performance, accuracy, evaluation, hallucination, error).
- **Workflow component breakdown** — per-component (research\_agent, document\_analyzer, compliance\_checker) observation counts, outcome distribution, average latency, and latest-event timestamp, making it possible to isolate which pipeline stage introduced latency regressions or failure spikes.
- **Recent GenAI prompt/output pairs** — full prompt, output, provider, model, and a rich trace payload (tokens used, temperature, latency, hallucination flag, and any additional metadata) for every LLM-backed flow.
- **Prometheus snapshot** — HTTP request totals, hallucination report totals, and AI evaluation totals directly from the `/metrics` endpoint.

The page operates in **demo mode by default** (representative mock telemetry, no DB writes required) and switches to live database-backed telemetry when `NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend` is set — the same env-flag pattern used by the Dashboard, ensuring zero risk to the production audit trail during demonstrations.

### Stakeholder governance and rights management (Admin — QM)

The **Stakeholders & Rights** admin module supports QM leads and administrators in governing who holds which role and what rights they carry throughout regulated workflows. It provides:

- **Role-template matrix** — permission toggles per stakeholder role (`qm_lead`, `architect`, `riskmanager`, `auditor`, `developer`) aligned with the RBAC matrix in `frontend/lib/rbac.ts`, ensuring UI-visible role constraints stay consistent with backend authorization enforcement.
- **Persistent employee assignment per role** — name-to-role assignments are stored in PostgreSQL (`stakeholder_employee_assignments` table, Alembic migration 008). Both a single-add form and a **bulk-add mode** (one name per line, automatic deduplication, parallel async POST) are provided for faster team onboarding.
- **Audit-ready record keeping** — each assignment carries `created_at`, `created_by`, and `profile_id` provenance fields, making the governance record queryable for inspection reports and audit evidence packages.

Both the Observability and Stakeholders & Rights modules are accessible from the **Admin** section of the left navigation bar and are protected by backend-enforced session authentication. They are designed to be the operational control surface for technical leads and QM personnel overseeing AI-assisted documentation workflows.

---

## Product snapshot

Attached browser-page view of the Document Hub:

<!-- markdownlint-disable-next-line MD033 -->
<img src="./docs/images/DocQuality_Compliance-QA-Lab.JPG?v=20260327" alt="Doc Quality Compliance Checker - Document Hub" style="max-width:100%;height:auto;" width="1200" />

---

## Getting Started

### Testing

Short testing entrypoint from project root dir with .venv setting:

- Run all backend tests: `python -m pytest`
- Run one module quickly: `python -m pytest tests/test_auth_session_api.py -v`

For full testing details (scope, status, workflows, role ownership, and lifecycle mapping), see:

- [Testing Guide](TESTING_README.md)
- [QA Baseline and Gap Tracker](project-context/2.build/qa.md)

### Database Setup (Phase 0 MVP)

Phase 0 requires **PostgreSQL 16** for session authentication, HITL reviews, and compliance audit trails.

**Quick Start (4 steps):**

1. Start PostgreSQL (Docker: `docker-compose up -d` | Local: Install PostgreSQL 16 + start service)
2. Initialize database: `.\.venv\Scripts\python.exe init_postgres.py`
3. Verify with login test (use `AUTH_MVP_EMAIL` / `AUTH_MVP_PASSWORD` from your `.env`)
4. Run tests: `pytest tests/test_auth_session_api.py -v`

📖 **[Database Setup Guide](DATABASE_README.md)** — Complete walkthrough with Docker/local/cloud options, troubleshooting, and schema details.

**Also See:**

- [Quick Command Reference](POSTGRES_SETUP_QUICKSTART.md) — Copy/paste terminal commands
- [Full Setup Guide](POSTGRES_SETUP.md) — Detailed configuration and verification steps
- [Infrastructure Overview](POSTGRES_INFRASTRUCTURE_SETUP.md) — Schema, requirements alignment, deployment path
- [Application User Handbook](APP_USER_HANDBOOK.md) — Operational guidance for stakeholders, including top menu controls and compliance relevance
- [Authentication and Authorization Guide](AUTHENTICATION_AUTHORIZATION_README.md) — Implemented login, session, RBAC, throttling, recovery, and security-test concepts
- [Observability and Logging Guide](OBSERVABILITY_LOGGING_README.md) — Structured logging, OpenTelemetry tracing, Prometheus metrics, quality evaluation telemetry, and compliance monitoring
- [Project Structure Guide](PROJECT_STRUCTURE.md) — Complete tree-style overview of codebase layout with inline component descriptions

### Start the application (database + backend + frontend)

Use separate terminals so PostgreSQL, the API, and the UI run at the same time.

1. **Database terminal** (from `doc_quality_compliance_check/`):

   Start PostgreSQL database:

   ```powershell
   docker compose up -d
   .\.venv\Scripts\python.exe init_postgres.py
   ```

   Expected outcome:
   - PostgreSQL listens on `localhost:5432`
   - schema initialization completes without errors
   - `.env` contains `DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality`

2. **Backend terminal** (from `doc_quality_compliance_check/`):

   Start backend server (idempotent launcher, recommended):

    ```powershell
    .\scripts\start_backend.ps1 -Reload
   ```

   Behavior:
   - Starts Uvicorn on `127.0.0.1:8000` if the port is free.
   - Returns success when a healthy backend is already running on `8000`.
   - Fails fast if the port is occupied but `/health` is not responding.

   Manual fallback (direct Uvicorn):

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn src.doc_quality.api.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   Expected output includes either:
   - `Uvicorn running on http://127.0.0.1:8000`
   - `Backend already running and healthy on http://127.0.0.1:8000`

3. **Frontend terminal** (from `doc_quality_compliance_check/frontend/`):

   Start frontend of browser application:

   ```powershell
   npm run dev
   ```

   Open:
   - `http://localhost:3000/login`

   > **Cookie note:** `NEXT_PUBLIC_API_ORIGIN` must be **empty** (the default in `frontend/.env.local`) for local
   > development. The frontend proxies all `/api/*` and `/health` calls through Next.js to `127.0.0.1:8000`,
   > so the session cookie stays same-origin (`localhost:3000`). Setting a direct cross-origin URL breaks
   > `SameSite=lax` cookie delivery and makes the login button appear unresponsive after a successful
   > authentication (silent redirect loop back to `/login`).

   > **Auth API badge note:** the login page can show a live Auth API status badge. For stable local demos, keep
   > `NEXT_PUBLIC_ENABLE_AUTH_HEALTH_CHECK=true` and point `NEXT_PUBLIC_HEALTH_ORIGIN=http://127.0.0.1:8000` so the
   > badge checks backend health directly without relying on the Next.js proxy path.

4. **Quick verification**
   - Database is running on `localhost:5432`
   - Backend health (via proxy): `http://localhost:3000/health`
   - Backend health (direct): `http://127.0.0.1:8000/health`
   - `frontend/.env.local` → `NEXT_PUBLIC_API_ORIGIN=` (empty = proxy mode, required for local dev)

### Optional: start the orchestrator service

If you want to exercise the CrewAI orchestration runtime as well, use a fourth terminal.

1. **Orchestrator terminal** (from `doc_quality_compliance_check/services/orchestrator/`):

   ```powershell
   uv run python -m doc_quality_orchestrator
   ```

2. **Verify orchestrator health:**
   - `http://localhost:8010/health`

The orchestrator is optional for the core login/dashboard/document flows. The backend remains the system of record and exposes the Skills API used by orchestrator workflows.

### Password Recovery Flow

The login page now includes a production-style recovery path:

1. Open [forgot-access route](frontend/pages/forgot-access.tsx) via `/forgot-access`
2. Request recovery token (generic anti-enumeration response)
3. Open [reset-access route](frontend/pages/reset-access.tsx) via `/reset-access?token=...`
4. Set new password, then sign in again at `/login`

Backend endpoints are implemented in [auth route module](src/doc_quality/api/routes/auth.py):

- `POST /api/v1/auth/recovery/request`
- `POST /api/v1/auth/recovery/verify`
- `POST /api/v1/auth/recovery/reset`

Security behavior includes hashed recovery tokens, TTL + single-use validation, per-IP/per-email throttling, session revocation on reset, and audit logging.

### Security environment defaults (Phase 0 hardening)

| Variable | Default | Production behavior |
| --- | --- | --- |
| `SECRET_KEY` | `change-me-in-production` | Startup fails if unchanged |
| `SESSION_COOKIE_SECURE` | `false` | Forced to `true` when `ENVIRONMENT != development` |
| `AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN` | `false` | Token/reset URL stays hidden unless explicitly enabled in development |
| `GLOBAL_RATE_LIMIT_ENABLED` | `true` | Global `/api/v1/*` request limiting enforced |
| `AUTH_LOGIN_RATE_LIMIT_COUNT` | `8` | Login throttling + lockout policy enabled |

### Authorization matrix (browser users vs service clients)

| Endpoint group | Browser session roles | Service API key (`service`) |
| --- | --- | --- |
| `/api/v1/skills/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Allowed (explicit machine endpoints) |
| `/api/v1/observability/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Allowed (quality telemetry + evaluation ingestion) |
| `/api/v1/reports/*` | `qm_lead`, `riskmanager`, `auditor` | Denied |
| `/api/v1/compliance/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Denied |
| `/api/v1/research/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Denied |
| `/api/v1/auth/me` | Any authenticated browser session | Denied (session-only endpoint) |
