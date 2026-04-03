# Setup Documentation — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.3.0  
**Date:** 2026-4-3  
**Author persona:** `@project-mgr`  
**AAMAD phase:** 2.build  

---

## Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| Python | 3.12.x | Project runtime baseline |
| pip | ≥ 23.x | For package installation |
| uv (optional) | ≥ 0.1.x | Faster alternative to pip; not required |
| Git | Any | For repository cloning |
| Anthropic API key | Optional | Only required for LLM-enriched analysis |

**Verify Python version:**

```bash
python --version
# Expected: Python 3.12.x
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/IloBe/doc_quality_compliance_check.git
cd doc_quality_compliance_check
```

### 2. Create a Virtual Environment (Recommended)

```bash
python -m venv .venv

# Activate on Linux/macOS:
source .venv/bin/activate

# Activate on Windows:
.venv\Scripts\activate
```

### 3. Install Dependencies

**Standard installation (with dev dependencies):**

```bash
pip install -e ".[dev]"
```

**Production-only installation (no dev/test dependencies):**

```bash
pip install -e .
```

**Alternative with uv (faster):**

```bash
uv pip install -e ".[dev]"
```

This installs all runtime and development dependencies defined in `pyproject.toml`:

- `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`
- `reportlab`, `structlog`, `bleach`, `anthropic`
- `python-multipart`, `python-docx`, `pypdf`, `aiofiles`, `jinja2`, `httpx`
- Dev: `pytest`, `pytest-asyncio`, `pytest-cov`, `ruff`, `mypy`

---

## Environment Configuration

### 1. Copy the Example Environment File

```bash
cp .env.example .env
```

### 2. Configure Variables

Edit `.env` with your preferred settings:

```bash
# Application Settings
APP_NAME="Doc Quality Compliance Check"
APP_VERSION="0.1.0"
ENVIRONMENT="development"

# API Configuration
API_PREFIX="/api/v1"

# Security / Authentication
SECRET_KEY="change-me-in-production"
SESSION_COOKIE_NAME="dq_session"
AUTH_MVP_EMAIL="mvp-user@example.invalid"
AUTH_MVP_PASSWORD="CHANGE_ME_BEFORE_USE"
AUTH_MVP_ROLES="qm_lead"
AUTH_MVP_ORG="QM-CORE-STATION"

# Abuse Protection
GLOBAL_RATE_LIMIT_ENABLED=true
GLOBAL_RATE_LIMIT_REQUESTS=240
GLOBAL_RATE_LIMIT_WINDOW_SECONDS=60
AUTH_LOGIN_RATE_LIMIT_COUNT=8
AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS=300
AUTH_LOGIN_LOCKOUT_SECONDS=600

# Logging
LOG_LEVEL="INFO"          # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT="console"      # console | json

# File Upload
MAX_FILE_SIZE_MB=10       # Maximum uploaded file size in megabytes

# Anthropic Claude (OPTIONAL - system works without this)
# ANTHROPIC_API_KEY=sk-ant-api03-...
# ANTHROPIC_MODEL=claude-3-haiku-20240307
```

**Important:** `ANTHROPIC_API_KEY` is optional. The system runs fully without it — LLM enrichment is skipped gracefully and the rule-based analysis engine is used for all compliance checks.

### 3. Environment Variable Reference

| Variable | Default | Required | Description |
| --- | --- | --- | --- |
| `APP_NAME` | `Doc Quality Compliance Check` | No | Application display name |
| `APP_VERSION` | `0.1.0` | No | Application version string |
| `ENVIRONMENT` | `development` | No | `development` \| `production` |
| `API_PREFIX` | `/api/v1` | No | URL prefix for all API routes |
| `SECRET_KEY` | `change-me-in-production` | Yes in production | Shared application secret; production startup fails if insecure default remains |
| `SESSION_COOKIE_NAME` | `dq_session` | No | Name of backend-owned session cookie |
| `AUTH_MVP_EMAIL` | `mvp-user@example.invalid` | No | Bootstrap login email for Phase 0 |
| `AUTH_MVP_PASSWORD` | `CHANGE_ME_BEFORE_USE` | No | Bootstrap login password for Phase 0 |
| `AUTH_MVP_ROLES` | `qm_lead` | No | Comma-separated MVP bootstrap roles |
| `AUTH_MVP_ORG` | `QM-CORE-STATION` | No | Bootstrap organization value |
| `GLOBAL_RATE_LIMIT_ENABLED` | `true` | No | Enables process-local global API throttling |
| `GLOBAL_RATE_LIMIT_REQUESTS` | `240` | No | Maximum API requests per window |
| `GLOBAL_RATE_LIMIT_WINDOW_SECONDS` | `60` | No | Global throttle window |
| `AUTH_LOGIN_RATE_LIMIT_COUNT` | `8` | No | Failed login attempts before lockout |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS` | `300` | No | Failed-login tracking window |
| `AUTH_LOGIN_LOCKOUT_SECONDS` | `600` | No | Temporary login lockout duration |
| `LOG_LEVEL` | `INFO` | No | Logging verbosity level |
| `LOG_FORMAT` | `console` | No | `console` for human-readable local logs, `json` for structured output |
| `MAX_FILE_SIZE_MB` | `10` | No | Maximum file upload size in MB |
| `ANTHROPIC_API_KEY` | (unset) | No | Anthropic API key for Claude enrichment |
| `ANTHROPIC_MODEL` | `claude-3-haiku-20240307` | No | Claude model identifier |

---

## Running the Development Server

### Start the Server

```bash
./scripts/start_backend.ps1 -Reload
```

The launcher is idempotent for local Windows development:

- Starts Uvicorn when port `8000` is free.
- Returns success when a healthy backend is already running.
- Fails fast if `8000` is occupied by an unhealthy process.

Expected output:

```text
Starting backend on http://127.0.0.1:8000 ...
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
...
# or when already running:
Backend already running and healthy on http://127.0.0.1:8000 (PID: ...).
```

### Verify the Server is Running

```bash
# Health check
curl http://localhost:8000/health
# Expected: {"status":"healthy","version":"0.1.0"}

# API documentation
open http://localhost:8000/docs    # Swagger UI
open http://localhost:8000/redoc   # ReDoc

# Frontend entry points
open http://localhost:8000/health  # Backend health check
open http://localhost:3000/login   # Frontend login page (Next.js dev server)
open http://localhost:3000/        # Protected app shell / Doc Hub after auth
```

### Custom Port and Host

```bash
# Different port
./scripts/start_backend.ps1 -Port 8080 -Reload

# Listen on all interfaces (for Docker or network access)
./scripts/start_backend.ps1 -BindHost 0.0.0.0 -Port 8000 -Reload
```

---

## Running Tests

### Run All Tests

```bash
python -m pytest
```

Expected outcome:

```text
============================= test session starts ==============================
platform ... -- Python 3.12.x
collected ... items
...
============================== ... passed in X.Xs ==============================
```

### Run Tests with Coverage Report

```bash
python -m pytest --cov=src --cov-report=term-missing
```

### Run a Specific Test Module

```bash
python -m pytest tests/test_document_analyzer.py -v
python -m pytest tests/test_compliance_checker.py -v
```

### Run Linting (Ruff)

```bash
ruff check src/ tests/
```

### Run Type Checking (mypy)

```bash
mypy src/
```

---

## Project Structure Overview

```text
doc_quality_compliance_check/
├── .env.example                    # Environment variable template
├── .env                            # Local environment (gitignored)
├── pyproject.toml                  # Package metadata + dependencies
├── requirements.txt                # Pinned production dependencies
├── AGENTS.md                       # AAMAD bridge file
├── CHECKLIST.md                    # AAMAD project checklist
│
├── src/doc_quality/                # Main application package
│   ├── __init__.py
│   ├── core/                       # Cross-cutting concerns
│   │   ├── config.py               # pydantic-settings Settings class
│   │   ├── logging_config.py       # structlog configuration
│   │   └── security.py             # bleach sanitisation, validation
│   ├── models/                     # Pydantic v2 data models
│   │   ├── document.py             # DocumentAnalysisResult, DocumentType
│   │   ├── compliance.py           # ComplianceCheckResult, RiskLevel
│   │   ├── report.py               # ReportResult
│   │   └── review.py               # ReviewRecord, ModificationRequest
│   ├── services/                   # Business logic layer
│   │   ├── document_analyzer.py    # arc42 + model card checking
│   │   ├── compliance_checker.py   # EU AI Act compliance engine
│   │   ├── template_manager.py     # SOP template management
│   │   ├── report_generator.py     # PDF generation via ReportLab
│   │   └── hitl_workflow.py        # HITL review workflow
│   ├── agents/                     # AI agent layer (optional LLM)
│   │   ├── doc_check_agent.py      # DocumentCheckAgent
│   │   └── compliance_agent.py     # ComplianceCheckAgent
│   └── api/                        # FastAPI application
│       ├── main.py                 # App factory, middleware, health
│       └── routes/                 # Route modules
│           ├── documents.py        # POST /analyze, POST /upload
│           ├── compliance.py       # POST /check/eu-ai-act
│           ├── reports.py          # POST /generate, GET /download
│           └── templates.py        # GET /templates/
│
├── templates/                      # Document templates
│   ├── arc42/                      # arc42 template files
│   └── sop/                        # 6 SOP markdown templates
│       ├── sop_business_goals.md
│       ├── sop_stakeholders.md
│       ├── sop_architecture.md
│       ├── sop_quality_requirements.md
│       ├── sop_risk_assessment.md
│       └── sop_glossary.md
│
├── frontend/                       # Next.js frontend application
│   ├── pages/                      # Route entry points (`/`, `/login`, docs, workflow)
│   ├── components/                 # App shell and page components
│   ├── lib/                        # Auth/API helpers and client utilities
│   └── ...
│
├── tests/                          # Pytest unit tests
│   ├── conftest.py                 # Shared fixtures
│   ├── test_document_analyzer.py   # 7 tests
│   ├── test_compliance_checker.py  # 6 tests
│   ├── test_hitl_workflow.py       # 6 tests
│   ├── test_report_generator.py    # 3 tests
│   └── test_template_manager.py    # 8 tests
│
├── reports/                        # Generated PDF reports (runtime)
│   └── (generated at runtime)
│
├── AAMAD/                          # AAMAD framework files
│   ├── CHECKLIST.md
│   ├── CHANGELOG.md
│   └── ...
│
└── project-context/                # AAMAD project context artifacts
    ├── 1.define/
    │   ├── market-research-document.md
    │   ├── product-requirements-document.md
    │   └── sad.md
    └── 2.build/
        ├── setup.md
        ├── backend.md
        ├── frontend.md
        ├── integration.md
        └── qa.md
```

---

## Dependency Reference

| Package | Version | Purpose |
| --- | --- | --- |
| `fastapi` | ≥0.109.0 | REST API framework; async, typed, auto-docs |
| `uvicorn[standard]` | ≥0.27.0 | ASGI server; `standard` extras include websockets, watchfiles |
| `pydantic` | ≥2.5.0 | Data validation and serialisation (v2 API) |
| `pydantic-settings` | ≥2.1.0 | Type-safe environment variable configuration |
| `python-multipart` | ≥0.0.9 | Multipart form data parsing for file uploads |
| `reportlab` | ≥4.1.0 | Pure-Python PDF generation for audit reports |
| `python-docx` | ≥1.1.0 | DOCX document parsing (Phase 2 active) |
| `pypdf` | ≥5.0.0 | PDF text extraction (Phase 2 active) |
| `structlog` | ≥24.1.0 | Structured JSON logging (EU AI Act Art. 12 compliance) |
| `anthropic` | ≥0.18.0 | Anthropic Claude API client for optional LLM enrichment |
| `httpx` | ≥0.26.0 | Async HTTP client (used by test utilities) |
| `aiofiles` | ≥23.2.1 | Async file I/O |
| `jinja2` | ≥3.1.3 | Template rendering (used in report generation) |
| `bleach` | ≥6.1.0 | HTML/XSS sanitisation for user-supplied text |
| `pytest` | ≥7.4.0 | Test runner (dev) |
| `pytest-asyncio` | ≥0.23.0 | Async test support (dev) |
| `pytest-cov` | ≥4.1.0 | Test coverage reporting (dev) |
| `ruff` | ≥0.2.0 | Fast Python linter + formatter (dev) |
| `mypy` | ≥1.8.0 | Static type checker (dev) |

---

## Known Issues and Workarounds

### 1. Review Persistence (Current State)

**Current state:** Review/workflow-related persistence now uses database-backed storage paths in the current backend baseline; the prior in-memory-only `_review_store` limitation is no longer the primary architecture.

**Operational note:** For local development, keep PostgreSQL available to preserve session and review-related records across restarts.

### 2. PDF Reports Filesystem Storage

**Issue:** Generated PDF reports are stored in the `reports/` directory on the local filesystem. If the server is restarted or the directory is cleared, download links for previously generated reports will fail.

**Workaround:** Regenerate reports if the filesystem is cleared. Phase 2 will add persistent file storage.

### 3. Frontend Runtime Mode

**Current state:** The primary frontend runtime is the Next.js app on port `3000`. Backend static mount behavior remains legacy-compatible and should not be treated as the default interactive UX path.

**Workaround:** Ensure the `frontend/` directory exists at the project root and run the frontend dev server separately for login/app-shell workflows.

### 4. Python 3.12 Required

**Issue:** Running with Python <3.12 is outside the supported project baseline and may lead to dependency resolution/runtime differences.

**Workaround:** Use Python 3.12.x.

### 5. Large Document Performance

**Issue:** Very large documents (close to the 10 MB limit) may cause noticeable latency because analysis is synchronous.

**Workaround:** The current 10 MB limit (`MAX_FILE_SIZE_MB=10`) is sufficient for typical arc42/model-card/SOP inputs; very large files may still require asynchronous processing enhancements in later phases.

---

## Quick Start Summary

```bash
# One-command setup (from repo root, after cloning)
python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"

# Copy environment config
cp .env.example .env

# Run tests to verify installation
python -m pytest

# Start server
./scripts/start_backend.ps1 -Reload

# Start frontend (separate terminal)
npm --prefix frontend run dev

# Open login / app shell
open http://localhost:3000/login
```

---

## Sources

- [Python 3.12 Release Notes](https://docs.python.org/3/whatsnew/3.12.html)
- [FastAPI Tutorial — Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Pydantic v2 Migration Guide](https://docs.pydantic.dev/latest/migration/)
- [uvicorn Documentation](https://www.uvicorn.org/)
- [pytest Documentation](https://docs.pytest.org/en/stable/)
- [uv Package Manager](https://github.com/astral-sh/uv)

---

## Assumptions

1. The developer has Python 3.12 installed and a working pip/pip3 in PATH.
2. The `frontend/` directory is present in the repository root (not gitignored).
3. The `reports/` directory will be created at runtime by the report generator service if it does not exist.
4. An Anthropic API key is not required; the system is fully functional without it.
5. The backend runs on `localhost:8000` by default and the Next.js frontend runs on `localhost:3000`; browser authentication is established through `/api/v1/auth/login` and backend-owned HTTP-only session cookies.

---

## Open Questions

1. Should `uv` become the recommended package manager over `pip` for improved dependency resolution speed?
2. Should a `Makefile` with common commands (`make install`, `make test`, `make run`) be added for convenience?
3. Should `pre-commit` hooks be configured for automatic ruff + mypy checks before commit?
4. Is `requirements.txt` maintained manually or should it be generated from `pyproject.toml` via `pip compile`?

---

## Audit

```text
persona=project-mgr
action=setup-project
timestamp=2026-4-3
adapter=AAMAD-vscode
artifact=project-context/2.build/setup.md
version=0.3.0
status=complete
```
