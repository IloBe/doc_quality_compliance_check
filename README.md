# Compliance and Quality Check of Technical and Product Software Documentation

AI-assisted compliance and quality assurance platform for software documentation.

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
