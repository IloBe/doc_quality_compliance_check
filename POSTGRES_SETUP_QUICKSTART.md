# PostgreSQL Setup — What You Do vs. What I Do

## Overview

The Doc Quality system requires PostgreSQL for Phase 0 (MVP) to support:
- ✅ User session authentication (email/password login)
- ✅ HITL review workflow persistence
- ✅ Audit event immutable logging
- ✅ Compliance records storage

**Status:** Database layer is ready. You need to provision PostgreSQL.

---

## What I (Agent) Have Done Automatically

1. ✅ **Fixed database engine** (`src/doc_quality/core/database.py`)
   - Made SQLAlchemy dialect-aware (SQLite fallback for testing, PostgreSQL for production)
   - Prevents `connect_timeout` errors when switching databases

2. ✅ **Created Alembic migrations** (11 migrations, ready to apply)
   - `001_initial_hitl_reviews.py` — HITL review workflow tables
   - `002_skills_api_tables.py` — Skill documents, findings, audit tables
   - `003_audit_events_provenance.py` — Audit trail with tenant/org fields
   - `004_user_sessions.py` — Session auth tables for email/password login
   - `005_app_users_and_recovery_tokens.py` — App users & password recovery tokens
   - `006_quality_observations.py` — AI quality telemetry observation table
   - `007_stakeholder_profiles.py` — Stakeholder role profiles table
   - `008_stakeholder_employee_assignments.py` — Employee-to-role assignment table
   - `009_audit_schedule.py` — Audit scheduling & calendar table
   - `010_bridge_human_reviews.py` — Bridge run HITL review linkage
   - `011_risk_templates.py` — FMEA & RMF risk template tables

3. ✅ **Generated initialization script** (`init_postgres.py`)
   - Automated: Test connection → Create DB → Run migrations → Verify schema
   - Provides colored output with clear error messages
   - Safe to run multiple times (idempotent)

4. ✅ **Created configuration examples**
   - `.env.postgresql.example` — Environment variable template
   - `docker-compose.yml` — One-command PostgreSQL setup
   - `POSTGRES_SETUP.md` — Full setup guide with troubleshooting

5. ✅ **Verified code integration**
   - `src/doc_quality/api/main.py` — Auth routes ready
   - `src/doc_quality/core/session_auth.py` — Session lifecycle ready
   - `tests/test_auth_session_api.py` — Auth tests ready (need DB to run)

---

## What You Do (Terminal Commands)

### Step 1: Choose PostgreSQL Installation Method

**Option A: Docker (Easiest, Recommended)**
```powershell
# Assumes Docker Desktop is installed

Set-Location C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check

# Start PostgreSQL in Docker
docker compose up -d

# Verify container is running
docker ps --filter "name=dq-postgres" --format "{{.Names}}|{{.Status}}|{{.Ports}}"

# Wait ~15-30 seconds for PostgreSQL to be ready
Start-Sleep -Seconds 15
```

**Option B: Local PostgreSQL Installation**
```powershell
# Download PostgreSQL 16 from https://www.postgresql.org/download/windows/
# Install with:
#   - Port: 5432
#   - Password: postgres (or your choice)
#   - Install as Windows Service: YES

# Verify installation
psql --version

# Start service (Windows Service Manager or)
net start postgresql-x64-16
```

**Option C: Managed Cloud PostgreSQL**
```
# AWS RDS, Azure Database for PostgreSQL, Heroku, etc.
# Update DATABASE_URL with remote connection string
```

---

### Step 2: Set Environment Variable

```powershell
# Set the database URL (copy exact command for your choice)

# For Docker or local on localhost:5432
$env:DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality"

# For cloud/remote (example AWS RDS)
# $env:DATABASE_URL = "postgresql+psycopg2://postgres:PASSWORD@your-instance.rds.amazonaws.com:5432/doc_quality"
```

---

### Step 3: Run Database Initialization

```powershell
# From: C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check

# Run the automated initialization
.\.venv\Scripts\python.exe init_postgres.py
```

**What it does:**
1. Tests PostgreSQL connection
2. Creates `doc_quality` database (if missing)
3. Runs Alembic migrations (applies all 11 migration scripts)
4. Verifies all tables and columns exist

**Expected output:**
```
======================================================================
PostgreSQL Database Initialization
Doc Quality Compliance Check System
======================================================================

Database URL: postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality

Step: Test Connection
----------------------------------------------------------------------
[✓] PostgreSQL server is reachable

Step: Create Database
----------------------------------------------------------------------
[✓] Database 'doc_quality' already exists

Step: Run Migrations
----------------------------------------------------------------------
[✓] Migrations completed successfully

Step: Verify Schema
----------------------------------------------------------------------
[✓] Table 'hitl_reviews' OK (14 columns)
[✓] Table 'skill_documents' OK (8 columns)
[✓] Table 'skill_findings' OK (8 columns)
[✓] Table 'audit_events' OK (16 columns)
[✓] Table 'user_sessions' OK (9 columns)
[✓] Table 'quality_observations' OK (12 columns)
[✓] Table 'stakeholder_profiles' OK (7 columns)
[✓] Table 'stakeholder_employee_assignments' OK (6 columns)

======================================================================
Initialization Summary
======================================================================
  Test Connection: ✓ OK
  Create Database: ✓ OK
  Run Migrations: ✓ OK
  Verify Schema: ✓ OK

✓ Database initialization complete!

Next steps:
  1. Set DATABASE_URL in .env:
     DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality
  2. Start backend:
     .\.venv\Scripts\python.exe -m uvicorn src.doc_quality.api.main:app --host 127.0.0.1 --port 8000 --reload
  3. Test login:
     curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
       -H 'Content-Type: application/json' \
       -d '{"email":"mvp-user@example.invalid","password":"CHANGE_ME_BEFORE_USE"}'
```

---

### Step 4: Verify with Test Login

```powershell
# 1. Start the backend (from doc_quality_compliance_check/)
Set-Location c:\Dev\doc-quality-compliance-check\doc_quality_compliance_check
$env:DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality"

.\.venv\Scripts\python.exe -m uvicorn src.doc_quality.api.main:app --host 127.0.0.1 --port 8000 --reload

# Leave running, open another terminal for step 2

# 2. Test auth endpoint (in new terminal from same directory)
$tmp = ".\login.json"
Set-Content -Path $tmp -Value '{"email":"mvp-user@example.invalid","password":"CHANGE_ME_BEFORE_USE"}' -NoNewline

curl.exe -i -sS -H "Content-Type: application/json" `
  --data-binary "@$tmp" `
  http://127.0.0.1:8000/api/v1/auth/login
```

**Expected response (200 OK with session cookie):**
```
HTTP/1.1 200 OK
date: Fri, 03 Apr 2026 09:00:00 GMT
content-type: application/json
set-cookie: dq_session=xxxx...; HttpOnly; Max-Age=7200; Path=/; SameSite=lax

{"user":{"email":"mvp-user@example.invalid","roles":["qm_lead"],"org":"QM-CORE-STATION"},"expires_at":"2026-04-03T..."}
```

---

### Step 5 (Optional): Run Full Test Suite

```powershell
# Run backend auth tests (requires PostgreSQL running)
.\.venv\Scripts\python.exe -m pytest tests/test_auth_session_api.py -v

# Expected: 7 tests passing
# ✓ test_login_issues_session_cookie
# ✓ test_me_returns_user_after_login
# ✓ test_logout_clears_session
# ✓ test_login_rejects_invalid_password
# ✓ test_rbac_denies_insufficient_role_for_report_generation
# ✓ test_login_without_remember_me_uses_short_ttl
# ✓ test_login_with_remember_me_uses_persistent_ttl
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `connection refused` | PostgreSQL not running | `docker-compose up -d` OR start Windows Service |
| `database does not exist` | Migration didn't run | Re-run `.\.venv\Scripts\python.exe init_postgres.py` |
| `Authentication failed` | Wrong password | Check `DATABASE_URL`, verify password during install |
| `alembic: command not found` | Alembic not installed | `.\.venv\Scripts\python.exe -m pip install alembic` |
| `table 'user_sessions' does not exist` | Migration incomplete | Check migration output, ensure no errors, retry init script |

---

## Environment Variables

### Development (.env)
```env
# PostgreSQL (required for login)
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality
DATABASE_ECHO=false

# Auth (MVP defaults — override in .env, never commit real credentials)
AUTH_MVP_EMAIL=mvp-user@example.invalid
AUTH_MVP_PASSWORD=CHANGE_ME_BEFORE_USE
AUTH_MVP_ROLES=qm_lead
AUTH_MVP_ORG=QM-CORE-STATION
AUTH_AUTO_PROVISION_MVP_USER=true

# Security
SECRET_KEY=change-me-in-production
SESSION_COOKIE_SECURE=false
AUTH_RECOVERY_DEBUG_EXPOSE_TOKEN=false

# Rate limiting
GLOBAL_RATE_LIMIT_ENABLED=true
AUTH_LOGIN_RATE_LIMIT_COUNT=8

# Backend
ENVIRONMENT=development
DEBUG=false
LOG_LEVEL=INFO
```

### Production Checklist
- [ ] Use strong password (not `postgres`)
- [ ] Enable SSL/TLS (`sslmode=require` in connection string)
- [ ] Use connection pooling (PgBouncer / SQLAlchemy `pool_size=10`)
- [ ] Enable binary replication for backup/HA
- [ ] Set up automated daily backups
- [ ] Configure CloudWatch/monitoring alerts
- [ ] Document recovery procedure (restore from backup)

---

## References

- **SAD Requirement AD-5:** Storage backend (PostgreSQL + filesystem)
- **SAD Requirement R-1:** Approved review records persisted to PostgreSQL
- **SAD Requirement R-2:** Immutable audit trail with provenance
- **Project Status:** Phase 0 MVP — Auth, HITL reviews, audit trail, quality telemetry, stakeholder governance, risk templates
- **Future:** Phase 1 — OIDC SSO; Phase 2 — vector search & retrieval augmentation

---

## Next Actions After DB Setup

1. ✅ PostgreSQL running + initialized (`init_postgres.py` passed)
2. Start backend: `.\.venv\Scripts\python.exe -m uvicorn src.doc_quality.api.main:app --host 127.0.0.1 --port 8000 --reload`
3. Start frontend: `cd frontend && npm run dev`
4. Open login: `http://localhost:3000/login`
5. Test login with credentials from your `.env` (`AUTH_MVP_EMAIL` / `AUTH_MVP_PASSWORD`)
6. Run backend tests: `pytest tests/ -v`

---

## Questions?

If `init_postgres.py` fails:
1. Check error message for specific cause
2. Verify PostgreSQL is running (`docker ps` or Windows Services)
3. Verify `DATABASE_URL` matches your setup
4. Re-run script (it's safe to run multiple times)

If DB tests fail after init:
1. Re-run init script to ensure migrations applied
2. Check migration logs for SQL errors
3. Verify database exists: `psql -U postgres -d doc_quality -h localhost -c "\dt"`
