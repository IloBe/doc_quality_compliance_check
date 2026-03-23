# Setup Documentation — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@project-mgr`  
**AAMAD phase:** 2.build  

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
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

# Logging
LOG_LEVEL="INFO"          # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT="json"         # json | console

# File Upload
MAX_FILE_SIZE_MB=10       # Maximum uploaded file size in megabytes

# Anthropic Claude (OPTIONAL - system works without this)
# ANTHROPIC_API_KEY=sk-ant-api03-...
# ANTHROPIC_MODEL=claude-3-haiku-20240307
```

**Important:** `ANTHROPIC_API_KEY` is optional. The system runs fully without it — LLM enrichment is skipped gracefully and the rule-based analysis engine is used for all compliance checks.

### 3. Environment Variable Reference

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `APP_NAME` | `Doc Quality Compliance Check` | No | Application display name |
| `APP_VERSION` | `0.1.0` | No | Application version string |
| `ENVIRONMENT` | `development` | No | `development` \| `production` |
| `API_PREFIX` | `/api/v1` | No | URL prefix for all API routes |
| `LOG_LEVEL` | `INFO` | No | Logging verbosity level |
| `LOG_FORMAT` | `json` | No | `json` for structured logging, `console` for human-readable |
| `MAX_FILE_SIZE_MB` | `10` | No | Maximum file upload size in MB |
| `ANTHROPIC_API_KEY` | (unset) | No | Anthropic API key for Claude enrichment |
| `ANTHROPIC_MODEL` | `claude-3-haiku-20240307` | No | Claude model identifier |

---

## Running the Development Server

### Start the Server

```bash
uvicorn src.doc_quality.api.main:app --reload
```

Expected output:
```
INFO:     Will watch for changes in these directories: ['/path/to/project']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Verify the Server is Running

```bash
# Health check
curl http://localhost:8000/health
# Expected: {"status":"healthy","version":"0.1.0"}

# API documentation
open http://localhost:8000/docs    # Swagger UI
open http://localhost:8000/redoc   # ReDoc

# Frontend dashboard
open http://localhost:8000/        # HTML dashboard
```

### Custom Port and Host

```bash
# Different port
uvicorn src.doc_quality.api.main:app --reload --port 8080

# Listen on all interfaces (for Docker or network access)
uvicorn src.doc_quality.api.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Running Tests

### Run All Tests

```bash
pytest tests/ -v
```

Expected output:
```
============================= test session starts ==============================
platform linux -- Python 3.12.x
collected 30 items

tests/test_document_analyzer.py::test_detect_document_type_arc42 PASSED
tests/test_document_analyzer.py::test_detect_document_type_model_card PASSED
tests/test_document_analyzer.py::test_analyze_arc42_complete PASSED
tests/test_document_analyzer.py::test_analyze_arc42_partial PASSED
tests/test_document_analyzer.py::test_analyze_arc42_empty PASSED
tests/test_document_analyzer.py::test_analyze_model_card_complete PASSED
tests/test_document_analyzer.py::test_analyze_model_card_incomplete PASSED
tests/test_compliance_checker.py::... (6 tests)
tests/test_hitl_workflow.py::... (6 tests)
tests/test_report_generator.py::... (3 tests)
tests/test_template_manager.py::... (8 tests)

============================== 30 passed in X.Xs ==============================
```

### Run Tests with Coverage Report

```bash
pytest tests/ -v --cov=src/doc_quality --cov-report=term-missing
```

### Run a Specific Test Module

```bash
pytest tests/test_document_analyzer.py -v
pytest tests/test_compliance_checker.py -v
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

```
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
├── frontend/                       # Browser dashboard
│   ├── index.html                  # Single-page app (4 tabs)
│   ├── css/styles.css              # Responsive styling
│   └── js/app.js                   # Fetch API calls + UI logic
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
|---------|---------|---------|
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

### 1. In-Memory Review Store (Data Loss on Restart)

**Issue:** HITL review records are stored in an in-memory Python dict (`_review_store` in `hitl_workflow.py`). All review records are lost when the server restarts.

**Workaround (MVP):** This is a documented known limitation. Do not restart the server during an active review session in production use. SQLite persistence is planned for Phase 2.

**Workaround (Development):** Use the API endpoints to recreate reviews as needed during testing.

### 2. PDF Reports Filesystem Storage

**Issue:** Generated PDF reports are stored in the `reports/` directory on the local filesystem. If the server is restarted or the directory is cleared, download links for previously generated reports will fail.

**Workaround:** Regenerate reports if the filesystem is cleared. Phase 2 will add persistent file storage.

### 3. Frontend Static File Serving

**Issue:** The FastAPI `StaticFiles` mount for `frontend/` uses a `try/except RuntimeError` fallback. If the `frontend/` directory does not exist, the API still starts but the dashboard is not accessible.

**Workaround:** Ensure the `frontend/` directory exists at the project root. The directory is included in the repository.

### 4. Python 3.12 Required

**Issue:** Running with Python <3.12 is outside the supported project baseline and may lead to dependency resolution/runtime differences.

**Workaround:** Use Python 3.12.x.

### 5. Large Document Performance

**Issue:** Very large documents (close to the 10 MB limit) may cause noticeable latency because analysis is synchronous.

**Workaround:** For MVP, the 10 MB limit (`MAX_FILE_SIZE_MB=10`) is sufficient for typical arc42 documents. Phase 2 will add FastAPI `BackgroundTasks` for async processing.

---

## Quick Start Summary

```bash
# One-command setup (from repo root, after cloning)
python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"

# Copy environment config
cp .env.example .env

# Run tests to verify installation
pytest tests/ -v

# Start server
uvicorn src.doc_quality.api.main:app --reload

# Open dashboard
open http://localhost:8000
```

---

## Sources

- Python 3.12 Release Notes, https://docs.python.org/3/whatsnew/3.12.html
- FastAPI Tutorial — Bigger Applications, https://fastapi.tiangolo.com/tutorial/bigger-applications/
- Pydantic v2 Migration Guide, https://docs.pydantic.dev/latest/migration/
- uvicorn Documentation, https://www.uvicorn.org/
- pytest Documentation, https://docs.pytest.org/en/stable/
- uv Package Manager, https://github.com/astral-sh/uv

---

## Assumptions

1. The developer has Python 3.12 installed and a working pip/pip3 in PATH.
2. The `frontend/` directory is present in the repository root (not gitignored).
3. The `reports/` directory will be created at runtime by the report generator service if it does not exist.
4. An Anthropic API key is not required; the system is fully functional without it.
5. The development server runs on `localhost:8000` by default; all frontend API calls use this base URL.

---

## Open Questions

1. Should `uv` become the recommended package manager over `pip` for improved dependency resolution speed?
2. Should a `Makefile` with common commands (`make install`, `make test`, `make run`) be added for convenience?
3. Should `pre-commit` hooks be configured for automatic ruff + mypy checks before commit?
4. Is `requirements.txt` maintained manually or should it be generated from `pyproject.toml` via `pip compile`?

---

## Audit

```
persona=project-mgr
action=setup-project
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/2.build/setup.md
version=0.1.0
status=complete
```
