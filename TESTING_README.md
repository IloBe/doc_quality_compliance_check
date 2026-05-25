<!-- markdownlint-disable MD022 MD032 MD034 MD040 MD060 -->

# Testing Guide

Comprehensive testing guide for the Doc Quality Compliance Check system.

This guide explains:
- what kinds of tests exist in the repository,
- what each test layer covers,
- how to run tests locally and in CI,
- which test groups support which app workflows and user roles,
- and which testing level belongs to which phase of the software implementation and product lifecycle.

---

## 1. Purpose

The testing strategy supports two goals at the same time:
- protect implementation quality while features are developed and changed,
- provide release-readiness evidence for regulated, audit-heavy, and governance-driven workflows.

The repository already contains:
- backend unit and service tests,
- API integration and workflow tests,
- browser smoke E2E baseline artifacts,
- route-to-test drift enforcement,
- coverage gate enforcement,
- baseline DAST workflow scaffolding.

---

## 2. Current Testing Status

**Current validated baseline on 2026-05-16:**
- **172 collected tests** (all in root `tests/` directory)
- **172 passing tests** (100% pass rate)
- **86.09% total backend coverage** (with `src/` and `services/orchestrator/src/` combined)
- **Active coverage gate:** `pytest-cov` fail-under at 85%
- **Active drift detection:** route-to-test inventory audit at pytest startup
- **Browser smoke suite:** Playwright configured and runnable
- **Security baseline:** OWASP ZAP DAST (dynamic application security testing) workflow configured

**Test distribution:**
- 31 API integration tests (authentication, authorization, routes)
- 18 orchestrator service tests (privacy, adapters, validator stages, contracts)
- 35+ core service/unit tests (document analysis, compliance, research, templates)
- 8+ workflow integration tests (UAT, HITL, bridge, human review)
- 3 browser smoke tests (login, recovery, redirect)
- 1+ manual LLM integration smoke test (requires approval flags)

**Primary enforcement signals:**
- `pytest` test pass/fail
- Coverage threshold via `pytest-cov`
- Route inventory drift detection at pytest startup
- Playwright smoke workflow in GitHub Actions
- OWASP ZAP workflow-dispatch baseline in GitHub Actions

---

## 3. Testing Levels

### 3.1 Unit / Service Tests

Purpose:
- validate business logic in isolation,
- catch fast regressions early,
- verify deterministic rule and transformation logic.

Examples:
- document analysis
- compliance checking
- template loading
- report generation helpers
- research service logic
- HITL workflow services

Typical owners:
- backend engineer
- AI/ML integration engineer
- QA engineer for regression hardening

Lifecycle phase:
- implementation
- pull request review
- continuous integration

### 3.2 API Integration Tests

Purpose:
- verify route behavior through FastAPI `TestClient`,
- validate request/response contracts,
- exercise auth, authorization, persistence, and error handling together.

Examples:
- auth/session/recovery routes
- bridge review flows
- dashboard and observability routes
- document upload/read/lock flows
- audit trail and compliance routes

Typical owners:
- backend engineer
- integration engineer
- QA engineer

Lifecycle phase:
- implementation
- integration
- PR validation
- release candidate stabilization

### 3.3 Workflow / Scenario Tests

Purpose:
- validate end-to-end backend workflows across multiple route families,
- check cross-feature orchestration and realistic user journeys without a browser.

Examples:
- UAT-style backend workflow coverage
- integration API workflow tests
- bridge and human-review governance sequences
- session invalidation across several active user sessions

Typical owners:
- QA engineer
- integration engineer
- technical product owner for acceptance evidence

Lifecycle phase:
- integration
- system test
- pre-release verification

### 3.4 Browser E2E Smoke Tests

Purpose:
- validate actual UI route navigation and visible controls,
- confirm critical pages load and user-facing entry flows work,
- catch browser-only regressions missed by API tests.

Current baseline:
- login page renders
- forgot-access page renders
- unauthenticated root access redirects to login

Typical owners:
- frontend engineer
- QA engineer
- release manager for smoke verification

Lifecycle phase:
- PR smoke checks for frontend changes
- pre-release validation
- production-like demo readiness

### 3.5 Security / DAST Testing

Purpose:
- scan running targets for common web weaknesses,
- complement SAST and code review with runtime security evidence.

Current baseline:
- OWASP ZAP workflow for manual / pre-release baseline scanning

Typical owners:
- security engineer
- QA engineer
- platform / DevOps engineer

Lifecycle phase:
- pre-release
- scheduled security verification
- release governance

---

## 4. Test Groups Mapped to Main User and Application Workflows

| Test Group | Example Files | Primary User / Actor | Main Workflow Covered |
|---|---|---|---|
| Core document quality services | `tests/test_document_analyzer.py`, `tests/test_compliance_checker.py` | QM lead, architect, risk manager | Analyze documentation quality and compliance findings |
| Authentication and session management | `tests/test_auth_session_api.py`, `tests/test_auth_rate_limit_api.py`, `tests/test_auth_recovery_api.py` | Browser app user, administrator, QM lead | Login, logout, recovery, rate limiting, session invalidation |
| Authorization and RBAC | `tests/test_auth_authorization_api.py`, `tests/test_stakeholder_profiles_api.py` | QM lead, auditor, risk manager, architect, service client | Allowed vs denied route access and governance boundaries |
| Bridge and human review | `tests/test_bridge_run_api.py` | QM lead, auditor, risk manager, architect | Run bridge checks, fetch alerts, submit human approval/rejection, conflict handling |
| Document hub and locks | `tests/test_document_hub_live_api.py`, `tests/test_document_lock_api.py`, `tests/test_documents_read_api.py` | Documentation contributor, QM lead, reviewer | Upload, analyze, list, fetch, acquire/release lock |
| Dashboard and observability | `tests/test_dashboard_api.py`, `tests/test_observability_api.py` | QM lead, architect, technical service | Monitor KPIs, workflow metrics, prompt/output traces |
| Audit trail and compliance operations | `tests/test_audit_trail_api.py`, `tests/test_compliance_standard_mapping_api.py`, `tests/test_uat_workflow.py` | Auditor, risk manager, QM lead | Review audit events, schedules, mapping requests, governance actions |
| Skills and workflow integration | `tests/test_skills_api.py`, `tests/test_integration_api_workflow.py` | Service client, QM lead, architect | Extract text, search documents, write findings, cross-route integration |
| Reports and exported artifacts | `tests/test_report_generator.py`, `tests/test_reports_download_api.py` | QM lead, auditor, risk manager | Generate compliance reports and retrieve downloadable artifacts |
| Templates and risk templates | `tests/test_template_manager.py`, `tests/test_templates_api.py`, `tests/test_risk_templates_api.py`, `tests/test_risk_templates_defaults_api.py` | Architect, risk manager, QM lead | Load templates, manage risk defaults, export risk content |
| Research and regulation retrieval | `tests/test_research_alerts_api.py`, `tests/test_research_api.py`, `tests/test_research_service.py` | Architect, risk manager, compliance analyst | Compliance alerts, regulation support and research-backed guidance |
| Browser smoke E2E | `frontend/tests/e2e/smoke.spec.ts` | Browser app user | Login entry flow, recovery entry flow, unauth redirect behavior |
| Security baseline DAST | `.github/workflows/dast-zap-baseline.yml` | Security / release governance | Runtime scan of deployed target before release decision |

---

## 5. Test Scope by User Role

### QM Lead
Should be covered by:
- unit/service validation for document quality logic,
- API route tests for dashboard, reports, observability, bridge, compliance,
- browser smoke for login and critical admin workflows,
- pre-release DAST baseline.

### Architect
Should be covered by:
- document analysis and research tests,
- authorization matrix tests,
- template and risk-template tests,
- browser smoke for route access and core navigation.

### Risk Manager
Should be covered by:
- compliance, bridge, and audit workflow tests,
- reports and risk-template route coverage,
- session/auth tests for protected operations,
- DAST baseline before release.

### Auditor
Should be covered by:
- read-only governance route tests,
- report download tests,
- audit-trail tests,
- authorization denial tests for mutation paths.

### Technical Service / Service Client
Should be covered by:
- skills and observability machine-endpoint tests,
- service-auth compatibility checks,
- workflow integration tests.

### Frontend / Browser App User
Should be covered by:
- login, forgot-access, redirect and visible control checks,
- eventually upload/analyze/report/lock smoke flows.

---

## 6. Testing by Software Lifecycle Phase

| Lifecycle Phase | Main Roles | Required Testing Level |
|---|---|---|
| Feature implementation | Backend engineer, frontend engineer | Unit/service tests first, then focused API tests for changed routes |
| Integration | Integration engineer, backend engineer, QA engineer | API integration tests, workflow tests, auth/permission regression tests |
| Pull request review | Engineer + reviewer | Full impacted pytest modules, coverage gate pass, route-drift gate pass |
| Frontend UI verification | Frontend engineer, QA engineer | Browser smoke E2E for changed entry and critical routes |
| Pre-release hardening | QA engineer, release manager, security engineer | Full pytest suite, browser smoke workflow, DAST baseline, manual release review |
| Release governance | Product lead, QM lead, compliance stakeholders | Review test evidence, unresolved risks, DAST results, workflow coverage |
| Post-release regression | QA engineer, platform engineer | Re-run smoke tests, targeted regression packs, issue-driven additions |

Recommended expectation by level:
- every feature should add or update at least one automated test,
- every new protected backend route should be represented in API tests,
- every critical browser journey should have at least smoke coverage,
- every release candidate should have runtime security evidence.

---

## 7. How to Run Tests

All backend tests live in the root `tests/` directory. The repository supports **Windows (PowerShell), Linux (Bash), and macOS (Bash)** development environments. Commands are provided for each platform.

### 7.1 Test Categories Overview

Before running tests, understand which category matches your workflow:

| Category | Purpose | Files | Typical Duration |
|---|---|---|---|
| **Unit Tests** | Business logic, transformations, helpers in isolation | `test_compliance_checker.py`, `test_document_analyzer.py`, `test_research_service.py`, `test_report_generator.py`, `test_template_manager.py` | ~5–10 sec |
| **Integration Tests** | API route contracts, database persistence, auth flows | `test_auth_*_api.py`, `test_documents_read_api.py`, `test_document_hub_live_api.py`, `test_dashboard_api.py`, `test_audit_trail_api.py` | ~30–60 sec |
| **Contract Tests** | LLM structured outputs, schema validation, validator pipeline | `test_llm_contracts.py`, `test_privacy_controls.py`, `test_adapter_routing_policy.py` | ~3–10 sec |
| **Workflow Tests** | End-to-end backend scenarios without a browser | `test_uat_workflow.py`, `test_integration_api_workflow.py`, `test_hitl_workflow.py`, `test_bridge_run_api.py` | ~10–30 sec |
| **Browser Smoke Tests** | UI navigation, login flow, critical page renders | `frontend/tests/e2e/smoke.spec.ts` | ~15–30 sec |
| **Manual LLM Smoke** | Live model validation (requires approval and budget flags) | `test_llm_integration_smoke.py` marker: `llm_integration` | ~5–20 sec (if enabled) |

### 7.2 Setup: Common Prerequisites

**All platforms:**
1. Clone/enter the repository: `cd doc_quality_compliance_check`
2. Activate or create a Python virtual environment (3.12+)
3. Install dev dependencies: `pip install -e .[dev]`

**Quick verification:**

**Windows (PowerShell):**
```powershell
python -m pytest --version
python -m pytest --collect-only -q | Select-Object -First 10
```

**Linux / macOS (Bash):**
```bash
python -m pytest --version
python -m pytest --collect-only -q | head -10
```

Expected output: pytest version plus the first collected 10 test items.

### 7.3 Run Backend Tests (Unit, Integration, Contract, Workflow)

#### 7.3.1 All Tests with Coverage (Default)

Runs the full test suite with coverage reporting and the 85% fail-under gate.

**Windows (PowerShell):**
```powershell
python -m pytest -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest -v
```

**Expected output (counts and runtime vary by branch and environment):**
```
221 passed, 1 skipped (test_llm_integration_smoke.py, live LLM smoke tests are disabled to avoid accidental live API calls and token spend) in 31.24s (coverage report)
```

If you want to run it intentionally, set:

- RUN_LLM_INTEGRATION_TESTS=1
- LLM_TEST_HUMAN_APPROVED=1
- LLM_TEST_BUDGET_TOKENS (for example 400)
- LLM_TEST_PROVIDER (for example anthropic)

---

#### 7.3.2 Unit Tests Only

Run business logic validation without API or orchestrator integration.

**Windows (PowerShell):**
```powershell
python -m pytest tests/test_document_analyzer.py tests/test_compliance_checker.py tests/test_research_service.py tests/test_report_generator.py tests/test_template_manager.py -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest \
  tests/test_document_analyzer.py \
  tests/test_compliance_checker.py \
  tests/test_research_service.py \
  tests/test_report_generator.py \
  tests/test_template_manager.py \
  -v
```

**Expected outcome:** ~10–15 sec, all passed.

---

#### 7.3.3 Integration Tests Only

Validate API routes, auth flows, and persistence.

**Windows (PowerShell):**
```powershell
python -m pytest tests/test_auth_*.py tests/test_documents_read_api.py tests/test_document_hub_live_api.py tests/test_dashboard_api.py tests/test_audit_trail_api.py tests/test_bridge_run_api.py -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest \
  tests/test_auth_*.py \
  tests/test_documents_read_api.py \
  tests/test_document_hub_live_api.py \
  tests/test_dashboard_api.py \
  tests/test_audit_trail_api.py \
  tests/test_bridge_run_api.py \
  -v
```

**Expected outcome:** ~45–60 sec, all passed.

---

#### 7.3.4 Contract Tests Only

Validate LLM structured outputs, privacy policies, and adapter routing.

**Windows (PowerShell):**
```powershell
python -m pytest tests/test_llm_contracts.py tests/test_privacy_controls.py tests/test_adapter_routing_policy.py -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest \
  tests/test_llm_contracts.py \
  tests/test_privacy_controls.py \
  tests/test_adapter_routing_policy.py \
  -v
```

**Expected outcome:** ~5–10 sec, all passed.

---

#### 7.3.5 Workflow Tests Only

End-to-end backend journeys (UAT, HITL, bridge orchestration).

**Windows (PowerShell):**
```powershell
python -m pytest tests/test_uat_workflow.py tests/test_integration_api_workflow.py tests/test_hitl_workflow.py tests/test_document_review_flow.py -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest \
  tests/test_uat_workflow.py \
  tests/test_integration_api_workflow.py \
  tests/test_hitl_workflow.py \
  tests/test_document_review_flow.py \
  -v
```

**Expected outcome:** ~15–30 sec, all passed.

---

#### 7.3.6 Quick Validation (No Coverage Gate)

Fast feedback for development without coverage enforcement. Useful during active feature work.

**Windows (PowerShell):**
```powershell
python -m pytest --override-ini addopts='' -q
```

**Linux / macOS (Bash):**
```bash
python -m pytest --override-ini addopts='' -q
```

**Expected output:** `221 passed, 1 skipped in 31.25s` (no coverage report).

---

#### 7.3.7 Run One Test Module

Focused testing on a single feature or service.

**Windows (PowerShell):**
```powershell
python -m pytest tests/test_auth_session_api.py -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest tests/test_auth_session_api.py -v
```

---

#### 7.3.8 Run One Specific Test

Debug or isolate a single test case.

**Windows (PowerShell):**
```powershell
python -m pytest "tests/test_bridge_run_api.py::test_bridge_human_review_three_reviewers_only_first_decision_wins" -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest "tests/test_bridge_run_api.py::test_bridge_human_review_three_reviewers_only_first_decision_wins" -v
```

---

#### 7.3.9 Run Tests Matching a Pattern

Run tests whose name contains a substring.

**Windows (PowerShell):**
```powershell
python -m pytest -k "auth and session" -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest -k "auth and session" -v
```

---

#### 7.3.10 Coverage Reports

View coverage and identify untested code paths.

**Generate and display coverage:**

**Windows (PowerShell):**
```powershell
python -m pytest --cov=src --cov-report=term-missing
```

**Linux / macOS (Bash):**
```bash
python -m pytest --cov=src --cov-report=term-missing
```

**Generate HTML coverage (optional, opens browser):**

**Windows (PowerShell):**
```powershell
python -m pytest --cov=src --cov-report=html; explorer htmlcov/index.html
```

**Linux (Bash):**
```bash
python -m pytest --cov=src --cov-report=html && xdg-open htmlcov/index.html
```

**macOS (Bash):**
```bash
python -m pytest --cov=src --cov-report=html && open htmlcov/index.html
```

---

### 7.4 Browser E2E / Regression Smoke Tests

Playwright test suite validates login flow, recovery flow, and unauthenticated redirects.

**Preconditions:**
- Node.js v18+ must be in PATH (`node --version`)
- No activated Python venv required (Node separate from Python)
- First-time setup requires browser install (`npm run test:e2e:install`)

**All platforms — E2E smoke tests:**

From `frontend/` subdirectory:

**Windows (PowerShell):**
```powershell
cd frontend
npm install
npm run test:e2e:install  # First time only
npm run test:e2e
```

**Linux / macOS (Bash):**
```bash
cd frontend
npm install
npm run test:e2e:install  # First time only
npm run test:e2e
```

**Expected output:**
```
3 passed (15–30 sec)
```

---

#### 7.4.1 E2E Tests with Browser UI (Headed Mode)

View the browser while tests run—useful for debugging UI issues.

**Windows (PowerShell):**
```powershell
cd frontend
npm run test:e2e:headed
```

**Linux / macOS (Bash):**
```bash
cd frontend
npm run test:e2e:headed
```

---

#### 7.4.2 E2E Test Discovery

List all available E2E tests without running them.

**Windows (PowerShell):**
```powershell
cd frontend
npx playwright test --list
```

**Linux / macOS (Bash):**
```bash
cd frontend
npx playwright test --list
```

---

### 7.5 Manual Integration Test: Backend + Frontend Together

Run the backend API server and Next.js frontend dev server, then manually test in a real browser (Edge, Chrome, Firefox, Safari).

#### Setup: Three Terminals

**Terminal 1 — Database (from repo root):**

**Windows (PowerShell):**
```powershell
docker compose up -d
.\.venv\Scripts\python.exe init_postgres.py
```

**Linux / macOS (Bash):**
```bash
docker compose up -d
source .venv/bin/activate
python init_postgres.py
```

---

**Terminal 2 — Backend API (from repo root):**

**Windows (PowerShell):**
```powershell
.\scripts\start_backend.ps1 -Reload
```

**Linux / macOS (Bash):**
```bash
source .venv/bin/activate
./scripts/start_backend.sh
```

or directly:

```bash
uvicorn src.doc_quality.api.main:app --reload --host 127.0.0.1 --port 8000
```

---

**Terminal 3 — Frontend dev server (from `frontend/` directory):**

**Windows (PowerShell):**
```powershell
cd frontend
npm install
npm run dev
```

**Linux / macOS (Bash):**
```bash
cd frontend
npm install
npm run dev
```

---

**Health checks:**

Open in your browser:
- **Frontend:** `http://localhost:3000/login`
- **Frontend health:** `http://localhost:3000/health`
- **Backend health:** `http://127.0.0.1:8000/health`

---

**QA Manual Smoke Checklist (8 Quick Actions):**

1. ✓ Open `http://localhost:3000/login` → login page renders
2. ✓ Sign in with test credentials → app shell loads, redirect works
3. ✓ **Dashboard** page → KPI cards render without errors
4. ✓ **Document Hub** page → list/filter UI responds
5. ✓ **Risk** page → list/detail selection works
6. ✓ **Audit Trail** page → timeline loads
7. ✓ **Exports Registry** page → filter and download dialog work
8. ✓ **Logout** → unauthenticated redirect to `/login` works

---

### 7.6 Manual LLM Integration Smoke Test (Requires Approval)

Test live LLM model validators with explicit human approval and token budget control. **Default: skipped** (safety gate).

**Precondition:**
- Confirm a real on-prem Nemotron gateway is configured (the Anthropic and OpenAI-compatible fallback adapters are still scaffold-backed)

**Windows (PowerShell):**

```powershell
$env:PYTHONPATH = (Resolve-Path .\services\orchestrator\src).Path
$env:RUN_LLM_INTEGRATION_TESTS = "1"
$env:LLM_TEST_HUMAN_APPROVED = "1"
$env:LLM_TEST_BUDGET_TOKENS = "400"
$env:LLM_TEST_PROVIDER = "anthropic"
python -m pytest tests/test_llm_integration_smoke.py -v -m llm_integration --cov-fail-under=0
```

**Linux / macOS (Bash):**

```bash
export PYTHONPATH="$(cd services/orchestrator/src && pwd)"
export RUN_LLM_INTEGRATION_TESTS="1"
export LLM_TEST_HUMAN_APPROVED="1"
export LLM_TEST_BUDGET_TOKENS="400"
export LLM_TEST_PROVIDER="anthropic"
python -m pytest tests/test_llm_integration_smoke.py -v -m llm_integration --cov-fail-under=0
```

**Expected outcomes:**
- `1 skipped`: expected when approval missing, budget invalid, the provider is scaffold-backed, or the on-prem gateway is not configured
- `1 passed`: expected only after real provider exists and returns schema-valid JSON
- `1 failed`: investigate provider wiring or schema mismatch

---

### 7.7 Offline LLM Contract Validation (No Live Model Calls)

Validate orchestrator contracts and privacy logic without calling live LLM services.

Note:
- the plain `python -m pytest ... -v` command still inherits the repo coverage gate from `pyproject.toml`
- targeted slices often fail that gate because they do not exercise enough of `src/` and `services/orchestrator/src/`
- for local contract checks, use the same test list with `--override-ini addopts=''` if you want to skip coverage enforcement

**Windows (PowerShell):**
```powershell
python -m pytest tests/test_privacy_controls.py tests/test_adapter_routing_policy.py tests/test_llm_contracts.py tests/test_document_review_flow.py -v
```

**Windows (PowerShell, no coverage gate):**
```powershell
python -m pytest --override-ini addopts='' tests/test_privacy_controls.py tests/test_adapter_routing_policy.py tests/test_llm_contracts.py tests/test_document_review_flow.py -v
```

**Linux / macOS (Bash):**
```bash
python -m pytest \
  tests/test_privacy_controls.py \
  tests/test_adapter_routing_policy.py \
  tests/test_llm_contracts.py \
  tests/test_document_review_flow.py \
  -v
```

**Linux / macOS (Bash, no coverage gate):**
```bash
python -m pytest --override-ini addopts='' \
  tests/test_privacy_controls.py \
  tests/test_adapter_routing_policy.py \
  tests/test_llm_contracts.py \
  tests/test_document_review_flow.py \
  -v
```

**Expected outcome:** ~10 sec, all passed, no external API calls.

---

### 7.8 Route Coverage Audit

Verify that all FastAPI routes have at least one test. Runs automatically before pytest collection.

**Manual audit (optional):**

**Windows (PowerShell):**
```powershell
python src/doc_quality/tools/route_coverage_audit.py
```

**Linux / macOS (Bash):**
```bash
python src/doc_quality/tools/route_coverage_audit.py
```

**Expected output:** summary of route coverage, warnings for unmapped routes.

---

### 7.9 Security DAST Baseline (Manual Pre-Release)

OWASP ZAP workflow for runtime security scanning.

**Current:** manual workflow dispatch in GitHub Actions.

**File:** `.github/workflows/dast-zap-baseline.yml`

**Usage:**
1. Go to GitHub repo → **Actions** tab → **DAST ZAP Baseline**
2. Click **Run workflow** → supply staging/pre-release URL
3. Wait for completion, download artifacts (`html`, `json`, `md`)

---

### 7.10 Advanced: Python 3.13 with `uv` (Optional Local Setup)

Use project-local `uv` environment for stricter dependency locking and interpreter isolation on Windows.

**Windows (PowerShell) — Optional uv setup:**

```powershell
# First time only
uv venv --python 3.13 py313_venv
.\py313_venv\Scripts\Activate.ps1
uv sync --extra dev --frozen --active

# Subsequent runs
.\py313_venv\Scripts\Activate.ps1
uv run --active pytest -q
```

**Benefits:**
- Exact dependency locking via `uv.lock`
- Avoids interpreter drift between Python environments
- Faster subsequent installs

**Troubleshooting:**

If pytest fails after creating `py313_venv`:

```powershell
# Check which Python is active
python -c "import sys; print(sys.executable)"
uv run --active python -c "import sys; print(sys.executable)"

# If they differ, ensure activation
.\py313_venv\Scripts\Activate.ps1
uv sync --extra dev --frozen --active
```

---

## 8. Current Baseline Assets

All test files are now in the root `tests/` directory (moved from service-local directories for consistency).

**Backend tests (pytest, root `tests/` directory):**
- `tests/conftest.py` — pytest bootstrap and fixtures
- `tests/fixtures/` — JSON fixtures for validator reports
- `docs/test_documents/06_data_privacy_happy.md` — synthetic privacy-safe document fixture
- `docs/test_documents/06_data_privacy_failure.md` — synthetic personal-data-bearing document fixture
- Unit/service tests: `test_document_analyzer.py`, `test_compliance_checker.py`, `test_research_service.py`, `test_report_generator.py`, `test_template_manager.py`
- API integration tests: `test_auth_*.py`, `test_documents_read_api.py`, `test_document_hub_live_api.py`, `test_dashboard_api.py`, `test_audit_trail_api.py`, `test_bridge_run_api.py`, etc.
- Workflow tests: `test_uat_workflow.py`, `test_integration_api_workflow.py`, `test_hitl_workflow.py`
- Orchestrator service tests: `test_privacy_controls.py`, `test_adapter_routing_policy.py`, `test_llm_contracts.py`, `test_document_review_flow.py`, `test_review_flow.py`
- Manual LLM smoke: `test_llm_integration_smoke.py` (marker: `llm_integration`, requires approval flags)

**Frontend E2E tests (Playwright):**
- `frontend/tests/e2e/smoke.spec.ts` — login, recovery, redirect smoke assertions
- `frontend/playwright.config.ts` — Playwright configuration

**Infrastructure and configuration:**
- `pyproject.toml` — pytest settings, coverage gate (85%), test markers
- `conftest.py` — root-level pytest bootstrap for multi-source imports
- `src/doc_quality/tools/route_coverage_audit.py` — FastAPI route-to-test drift detector
- `.github/workflows/ci-tests.yml` — unified CI test entrypoint (root pytest)
- `.github/workflows/browser-e2e-smoke.yml` — Playwright CI workflow
- `.github/workflows/dast-zap-baseline.yml` — OWASP ZAP security scanning

**Documentation:**
- `project-context/2.build/qa.md` — detailed QA baseline and gap tracker
- This file: `TESTING_README.md`

---

## 9. Current Gaps Still Open

Remaining high-priority expansions:
- authenticated browser smoke journeys for upload/analyze/lock/release/report-download,
- explicit DAST blocking thresholds for release policy,
- performance benchmark suite,
- deeper research timeout and malformed-provider response coverage,
- further route-specific contract/error-shape assertions where APIs evolve.

---

## 10. Recommended Ownership Model

### Developers
- add unit and API tests together with feature changes,
- keep route mapping current,
- use focused test runs during local development.

### QA Engineering
- expand workflow, boundary, concurrency, and regression coverage,
- curate browser smoke scope,
- maintain evidence in `project-context/2.build/qa.md` and this guide.

### Security / Platform
- operate DAST and CI workflows,
- define runtime security thresholds,
- keep release evidence automated where practical.

### Product / QM / Compliance Stakeholders
- review whether critical workflows are represented,
- confirm release-readiness evidence aligns with governance expectations,
- identify business-critical journeys that must stay in smoke coverage.

---

## 11. Related Documents

- [README](README.md)
- [QA Baseline and Gap Tracker](project-context/2.build/qa.md)
- [Authentication and Authorization Guide](AUTHENTICATION_AUTHORIZATION_README.md)
- [Database Setup Guide](DATABASE_README.md)
- [Observability and Logging Guide](OBSERVABILITY_LOGGING_README.md)
- [Project Structure Guide](PROJECT_STRUCTURE.md)
