# Database Setup — Doc Quality System

**Status:** Phase 0 (MVP) | **Persistence Layer:** PostgreSQL  
**Requirements:** SAD AD-5 (Storage), R-1 (HITL), R-2 (Audit Trail)

---

## Smoke Test Modes (SQLite vs PostgreSQL)

Use this section to choose the right database for your validation scope.

- **Fast Smoke Test (SQLite)**
  - Use for: quick local checks (`/login`, `/auth/login`, session cookie flow, frontend/backend wiring)
  - Not for: release sign-off, PostgreSQL-specific behavior, infrastructure readiness

- **Integration / Pre-Release (PostgreSQL)**
  - Use for: required architecture validation (migrations, schema parity, real persistence behavior, ops readiness)
  - Not for: ultra-fast local checks when DB setup should be skipped

### A) Fast Smoke Test (SQLite)

```powershell
# Terminal 1: Backend (SQLite)
cd C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check
$env:DATABASE_URL = "sqlite:///./doc_quality.db"
$env:PYTHONPATH = "src"
.\.venv\Scripts\python.exe -m uvicorn doc_quality.api.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check\frontend
npm run dev
```

Open `http://localhost:3000/login` and sign in with the `AUTH_MVP_EMAIL` / `AUTH_MVP_PASSWORD` values from your `.env` file.

### B) Integration Test (PostgreSQL) — Recommended Before Sign-Off

Follow **Quick Start (4 Steps)** below. This is the authoritative path for requirements validation.

---

## Password Recovery Flow (Implemented)

Recovery is now implemented end-to-end with backend-owned security controls.

Frontend routes:

- `/forgot-access` → request token
- `/reset-access?token=...` → verify token and set new password

Backend routes:

- `POST /api/v1/auth/recovery/request`
- `POST /api/v1/auth/recovery/verify`
- `POST /api/v1/auth/recovery/reset`

Security controls:

- Generic response for request endpoint (anti-enumeration)
- Only token hash is stored in DB
- Token TTL and single-use enforcement
- Per-email and per-IP throttling window
- Active sessions revoked after successful reset
- Audit trail events written for request/verify/reset lifecycle

Persistence objects:

- `app_users` table (hashed passwords)
- `password_recovery_tokens` table (hashed token, expiry, usage metadata)
- `audit_events` entries for recovery events

Migration requirement:

- Apply migration `005_app_users_and_recovery_tokens.py` before using recovery flow in PostgreSQL.

Development note:

- In development mode, request endpoint can return `debug_token` and `reset_url` to simplify local testing.
- Disable debug token exposure in non-dev environments.

Quick API smoke test:

```powershell
# Request recovery token
$tmp = ".\recovery_request.json"
Set-Content -Path $tmp -Value "{`"email`":`"$env:AUTH_MVP_EMAIL`"}" -NoNewline
curl.exe -sS -H "Content-Type: application/json" --data-binary "@$tmp" http://localhost:8000/api/v1/auth/recovery/request

# Then call verify/reset with returned debug_token in development mode
```

---

## Quick Start (4 Steps)

### 1️⃣ Start PostgreSQL

**Option A: Docker** (Easiest)
```powershell
cd C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check
docker-compose up -d
Start-Sleep -Seconds 15  # Wait for database ready
```

**Option B: Local Installation**
- Download PostgreSQL 16 from [postgresql.org/download/windows](https://postgresql.org/download/windows)
- Install with port 5432, user `postgres`, set a strong password of your choice (store it in `.env` as `DATABASE_URL`)
- Start Windows Service: `Services.msc` → PostgreSQL → Start

**Option C: Cloud** (AWS RDS, Azure Database, etc.)
- Create PostgreSQL 16 instance, note connection string

---

### 2️⃣ Initialize Database

```powershell
# Set connection URL — replace CHANGE_ME with your actual postgres password from .env
$env:DATABASE_URL = "postgresql+psycopg2://postgres:CHANGE_ME@localhost:5432/doc_quality"

# Run one-command initialization (creates DB + runs all migrations)
.\.venv\Scripts\python.exe init_postgres.py
```

**Expected:** All 4 checks pass ✓
- Test Connection ✓
- Create Database ✓
- Run Migrations ✓
- Verify Schema ✓

---

### 3️⃣ Start Backend & Test Login

```powershell
# Terminal 1: Backend server — load real credentials from .env, not inline
$env:DATABASE_URL = "postgresql+psycopg2://postgres:CHANGE_ME@localhost:5432/doc_quality"
.\.venv\Scripts\python.exe -m uvicorn doc_quality.api.main:app `
  --app-dir "C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check\src" `
  --host 0.0.0.0 --port 8000

# Terminal 2: Test login — use YOUR AUTH_MVP_EMAIL / AUTH_MVP_PASSWORD from .env
$tmp = ".\login.json"
Set-Content -Path $tmp -Value "{`"email`":`"$env:AUTH_MVP_EMAIL`",`"password`":`"$env:AUTH_MVP_PASSWORD`"}" -NoNewline
curl.exe -i -sS -H "Content-Type: application/json" --data-binary "@$tmp" http://localhost:8000/api/v1/auth/login
```

**Expected response:** `HTTP 200 OK` with `dq_session` cookie

---

### 4️⃣ Verify with Tests

```powershell
# Run backend auth tests (requires PostgreSQL running)
.\.venv\Scripts\python.exe -m pytest tests/test_auth_session_api.py -v
```

**Expected:** 5 tests passing ✓

---

## Database Schema

### Tables Created (Alembic Migrations 001-004)

| Table | Purpose | Phase | Columns |
|-------|---------|-------|---------|
| `user_sessions` | Email/password login with HTTP-only cookies | 0 (MVP) | 9 |
| `hitl_reviews` | Human-in-the-loop review workflow | 0 | 14 |
| `audit_events` | Immutable compliance audit trail | 0+ | 16 |
| `skill_documents` | Uploaded documents for analysis | 0+ | 8 |
| `skill_findings` | Compliance findings from analysis | 0+ | 8 |

### Key Tables for Phase 0

**`user_sessions`** — Session authentication
```sql
session_id          VARCHAR(64) PRIMARY KEY
session_token_hash  VARCHAR(128) UNIQUE         -- Hashed cookie value
user_email          VARCHAR(255)                -- e.g. you@your-domain.example
user_roles          JSON                        -- ["qm_lead", ...]
user_org            VARCHAR(255)                -- QM-CORE-STATION
is_revoked          BOOLEAN DEFAULT false
expires_at          TIMESTAMP WITH TIME ZONE   -- 8 hours default
created_at          TIMESTAMP WITH TIME ZONE
last_seen_at        TIMESTAMP WITH TIME ZONE
```

**`audit_events`** — Immutable compliance trail (EU AI Act Art. 12)
```sql
event_id            VARCHAR(64) PRIMARY KEY
event_type          VARCHAR(100)                -- login_success, document_uploaded, etc.
actor_type          VARCHAR(50)                 -- user|system|agent
actor_id            VARCHAR(100)
subject_type        VARCHAR(50)
subject_id          VARCHAR(100)
tenant_id           VARCHAR(100)                -- Multi-tenancy (SAD AD-5)
org_id              VARCHAR(100) NULLABLE
project_id          VARCHAR(100) NULLABLE
event_time          TIMESTAMP WITH TIME ZONE   -- For range partitioning
correlation_id      VARCHAR(64) NULLABLE       -- Request trace
payload             JSON
created_at          TIMESTAMP WITH TIME ZONE
```

---

## Configuration

### Environment Variables

Create `.env` in repo root with:

```env
# Copy .env.example → .env and fill in your real values — never commit .env
# Database connection (PostgreSQL required for integration/pre-release validation)
DATABASE_URL=postgresql+psycopg2://postgres:CHANGE_ME@localhost:5432/doc_quality
DATABASE_ECHO=false

# Auth (MVP demo user — set a real mailbox and strong password)
AUTH_MVP_EMAIL=you@your-domain.example
AUTH_MVP_PASSWORD=CHANGE_ME_BEFORE_USE
AUTH_MVP_ROLES=qm_lead
AUTH_MVP_ORG=YOUR-ORG
```

### Cloud / Remote PostgreSQL

```env
# Example AWS RDS
DATABASE_URL=postgresql+psycopg2://postgres:SecurePassword@your-instance.rds.amazonaws.com:5432/doc_quality

# Example Azure Database
DATABASE_URL=postgresql+psycopg2://postgres@dbname:SecurePassword@dbname.postgres.database.azure.com:5432/doc_quality
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `init_postgres.py` | Automated initialization script (1 command = DB + migrations + verify) |
| `docker-compose.yml` | PostgreSQL container config (Docker users) |
| `.env.postgresql.example` | Environment variable template |
| `migrations/versions/` | 4 Alembic migrations (001-004) |
| `POSTGRES_SETUP.md` | Full setup guide with troubleshooting |
| `POSTGRES_SETUP_QUICKSTART.md` | Command reference (copy/paste) |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `connection refused` | PostgreSQL not running | `docker-compose up -d` OR check Windows Services |
| `database does not exist` | Migration failed/skipped | Re-run `.\.venv\Scripts\python.exe init_postgres.py` |
| `Authentication failed` | Wrong password in `DATABASE_URL` | Verify password matches installation |
| `table 'user_sessions' does not exist` | Migration incomplete | Check script output for errors, retry init |
| `alembic: command not found` | Alembic not in venv | `.\.venv\Scripts\python.exe -m pip install alembic` |

---

## Requirements Met

✅ **SAD AD-5 (Storage):** PostgreSQL + filesystem persistence  
✅ **SAD R-1 (HITL):** Review records persisted to DB with audit timestamps  
✅ **SAD R-2 (Audit):** Immutable append-only audit trail with tenant/org/project provenance  
✅ **PRD Auth:** Email/password MVP with session-based login  
✅ **RBAC:** User roles stored in session (qm_lead, auditor, architect, riskmanager, service)

---

## Next Steps

1. **You:** Choose PostgreSQL method (Docker recommended) and run `init_postgres.py`
2. **Backend:** Login endpoint ready to test at `http://localhost:8000/api/v1/auth/login`
3. **Frontend:** Start with `npm --prefix frontend run dev`, login page at `http://localhost:3000/login`
4. **Tests:** Run `pytest tests/test_auth_session_api.py -v`

---

## Learn More

- **Full Setup Guide:** [POSTGRES_SETUP.md](POSTGRES_SETUP.md)
- **Quick Command Reference:** [POSTGRES_SETUP_QUICKSTART.md](POSTGRES_SETUP_QUICKSTART.md)
- **Infrastructure Summary:** [POSTGRES_INFRASTRUCTURE_SETUP.md](POSTGRES_INFRASTRUCTURE_SETUP.md)
- **Backend Architecture:** [project-context/2.build/backend.md](project-context/2.build/backend.md)
- **System Architecture:** [project-context/1.define/sad.md](project-context/1.define/sad.md)

---

**Need help?** Check error message → find in Troubleshooting table → follow fix → retry `init_postgres.py` (safe to run multiple times)
