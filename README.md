# Compliance and Quality Check of Technical and Product Software Documentation

AI-assisted compliance and quality assurance platform for software documentation.

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

## Product snapshot

Attached browser-page view of the Document Hub:

<!-- markdownlint-disable-next-line MD033 -->
<img src="./docs/images/DocQuality_Compliance-QA-Lab.JPG?v=20260327" alt="Doc Quality Compliance Checker - Document Hub" style="max-width:100%;height:auto;" width="1200" />

---

## Getting Started

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
- [Observability and Logging Guide](OBSERVABILITY_LOGGING_README.md) — Structured logging, audit trail persistence, request instrumentation, rate limiting, and compliance monitoring
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

   Start uvicorn backend server:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn src.doc_quality.api.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   Expected log line:
   - `Uvicorn running on http://127.0.0.1:8000`

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
| `/api/v1/reports/*` | `qm_lead`, `riskmanager`, `auditor` | Denied |
| `/api/v1/compliance/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Denied |
| `/api/v1/research/*` | `qm_lead`, `architect`, `riskmanager`, `auditor` | Denied |
| `/api/v1/auth/me` | Any authenticated browser session | Denied (session-only endpoint) |
