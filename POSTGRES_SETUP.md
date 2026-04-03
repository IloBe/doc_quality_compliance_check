# PostgreSQL Setup Guide — Doc Quality Compliance Check

Phase 0 (MVP): Session authentication, HITL reviews, audit events, compliance records.

## Quick Start (Recommended for Windows)

### Option 1: PostgreSQL via Docker (Easiest)

**Prerequisites:** Docker Desktop installed and running

**In Terminal (PowerShell as Administrator):**

```powershell
# From repo root: C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check

# 1. Start PostgreSQL container
docker compose up -d

# 2. Verify container is running
docker ps --filter "name=dq-postgres" --format "{{.Names}}|{{.Status}}|{{.Ports}}"

# 3. Wait for PostgreSQL to be ready (15-30 seconds)
Start-Sleep -Seconds 15

# 4. Initialize database and run migrations
$env:DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality"
.\.venv\Scripts\python.exe init_postgres.py

# 5. Verify initialization completed
# Should see: "Database initialization complete!"

# 6. Backend is now ready to start
.\scripts\start_backend.ps1 -Reload
```

---

### Option 2: Local PostgreSQL Installation

**For Windows:**

1. Download PostgreSQL installer: [PostgreSQL Windows Download](https://www.postgresql.org/download/windows/)
   - Select version: **PostgreSQL 16**
   - During installation:
     - Port: 5432 (default)
     - Password: `postgres` (or your choice)
     - Install as service ✓

2. Verify installation (test connection):

   ```powershell
   # Should show PostgreSQL version if installed
   psql --version
   ```

3. Initialize database:

   ```powershell
   $env:DATABASE_URL = "postgresql+psycopg2://postgres:your_password@localhost:5432/doc_quality"
   .\.venv\Scripts\python.exe init_postgres.py
   ```

---

## What Gets Created

The initialization script (`init_postgres.py`) automatically:

| Step | What Happens | Database Schema |
| --- | --- | --- |
| 1. Test Connection | Connects to PostgreSQL server on `localhost:5432` | (System `postgres` database) |
| 2. Create Database | Creates `doc_quality` database if missing | New empty database |
| 3. Run Migrations | Alembic applies migrations 001→011 | **Core tables verified by initializer:** |
| | | • `hitl_reviews` — Human-in-the-loop review records |
| | | • `skill_documents` — Uploaded/analyzed documents |
| | | • `skill_findings` — Compliance findings |
| | | • `audit_events` — Immutable audit trail |
| | | • `user_sessions` — Email/password session tokens |
| | | • `quality_observations` — AI quality telemetry events |
| | | • `stakeholder_profiles` — Role profile records |
| | | • `stakeholder_employee_assignments` — Employee role assignments |
| 4. Verify Schema | Checks all required tables and required columns exist | All initializer-required tables + indexes |

### Tables Created

**`hitl_reviews`** — Required for: Document review workflow

```text
review_id (UUID)         — Primary key
document_id (varchar)    — Linked document
status (varchar)         — pending|modifications_needed|approved
reviewer_name (varchar)  — Who reviewed it
modifications_required (JSON) — Array of requested changes
approval_date (timestamp) — When approved
created_at, updated_at (timestamps) — Audit timestamps
```

**`user_sessions`** — Required for: Email/password login

```text
session_id (varchar)         — Primary key (server session identifier)
session_token_hash (varchar) — Hashed token (unique index)
user_email (varchar)         — User identity (from AUTH_MVP_EMAIL or app user)
user_roles (JSON)            — ["qm_lead", "auditor", ...]
user_org (varchar)           — Organization (e.g., QM-CORE-STATION)
is_revoked (boolean)         — Session active/revoked
expires_at (timestamp)       — Expiry timestamp (short or remember-me TTL)
created_at, last_seen_at (timestamps) — Audit trail
```

**`audit_events`** — Required for: Compliance audit trail (immutable)

```text
event_id (varchar)        — Primary key
event_type (varchar)      — login_success|document_uploaded|...
tenant_id (varchar)       — Multi-tenancy support
org_id (varchar)          — Organization within tenant
actor_type (varchar)      — user|system|agent
actor_id (varchar)        — Who performed the action
subject_type (varchar)    — document|review|finding
subject_id (varchar)      — What was acted upon
payload (JSON)            — Event-specific data
event_time (timestamp)    — When it happened (for ordering)
correlation_id (varchar)  — Request trace for debugging
```

**`skill_documents`** — Uploaded documents ready for analysis
**`skill_findings`** — Compliance findings from analysis

---

## Verify Installation

After running `init_postgres.py`, test the full auth flow:

```powershell
# 1. Set environment and start backend
Set-Location C:\Dev\doc-quality-compliance-check\doc_quality_compliance_check
$env:DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality"
.\scripts\start_backend.ps1 -Reload

# 2. In a new terminal, test health endpoint
curl.exe -sS http://127.0.0.1:8000/health

# 3. Test login (should return 200 + session cookie)
$tmp = ".\login.json"
Set-Content -Path $tmp -Value '{"email":"mvp-user@example.invalid","password":"CHANGE_ME_BEFORE_USE"}' -NoNewline
curl.exe -i -sS -H "Content-Type: application/json" --data-binary "@$tmp" http://127.0.0.1:8000/api/v1/auth/login

# Expected response: HTTP/1.1 200 OK + dq_session cookie
```

---

## Troubleshooting

### "Connection refused" on `localhost:5432`

**Problem:** PostgreSQL is not running

**Solutions:**

- **Docker:** `docker compose up -d` to start container
- **Local:** Start PostgreSQL service
  - Windows Service: `Services.msc` → PostgreSQL → Start
  - Command: `pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start`

### "Database does not exist"

**Problem:** `init_postgres.py` failed or was interrupted

**Solution:**

```powershell
# Re-run initialization (safe to run multiple times)
.\.venv\Scripts\python.exe init_postgres.py
```

### "Authentication failed for user 'postgres'"

**Problem:** Wrong password in `DATABASE_URL`

**Solution:**

```powershell
# Use correct password
$env:DATABASE_URL = "postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/doc_quality"

# Or reset postgres password (Windows)
psql -U postgres -h localhost
# Then in psql: ALTER USER postgres WITH PASSWORD 'newpassword';
```

### "alembic: command not found"

**Problem:** Alembic not installed in `.venv`

**Solution:**

```powershell
# Re-install dependencies
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

---

## Cleanup / Reset

**If you need to start fresh:**

```powershell
# 1. Stop backend
# Ctrl+C in terminal running uvicorn

# 2. Stop and remove PostgreSQL (Docker only)
docker compose down -v

# 3. (Optional) verify/remove lingering volume names
docker volume ls | Select-String postgres_data

# 4. Start fresh
docker compose up -d
.\.venv\Scripts\python.exe init_postgres.py
```

---

## Schema Verification (Manual SQL)

If you want to inspect the database directly:

```powershell
# Connect to PostgreSQL
psql -U postgres -d doc_quality -h localhost

# In psql terminal:
# List tables
\dt

# Describe user_sessions table
\d user_sessions

# Count sessions
SELECT COUNT(*) FROM user_sessions;

# Check recent audit events
SELECT event_type, actor_id, event_time FROM audit_events ORDER BY event_time DESC LIMIT 5;

# Exit
\q
```

---

## Production Checklist

Before deploying to production:

- [ ] Use strong passwords (not `postgres`)
- [ ] Enable SSL/TLS for PostgreSQL connections (`sslmode=require`)
- [ ] Set up automated backups (daily minimum)
- [ ] Configure connection pooling (PgBouncer / SQLAlchemy `pool_size`)
- [ ] Enable binary replication for HA
- [ ] Set up monitoring (pgAdmin / CloudWatch / Prometheus alerts)
- [ ] Document recovery procedure
- [ ] Test restore from backup

---

## References

- PostgreSQL Official: [https://www.postgresql.org/docs/16/](https://www.postgresql.org/docs/16/)
- Alembic Documentation: [https://alembic.sqlalchemy.org/](https://alembic.sqlalchemy.org/)
- SAD Requirement AD-5: Storage backend (PostgreSQL + filesystem)
- SAD Requirement R-1: HITL persistence to PostgreSQL DB
- Migrations: `migrations/versions/` (`001_initial_hitl_reviews.py` → `011_risk_templates.py`)
