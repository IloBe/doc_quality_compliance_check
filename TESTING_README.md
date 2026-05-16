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

Current validated baseline on 2026-4-5:
- `172` collected tests
- `172` passing tests
- `86.09%` total backend coverage
- active `pytest-cov` fail-under gate at `85%`
- active route-to-test drift gate for backend FastAPI routes
- baseline Playwright smoke suite configured
- baseline OWASP ZAP DAST workflow configured

Primary enforcement signals currently available:
- `pytest` test pass/fail
- coverage threshold via `pytest-cov`
- route inventory drift detection at pytest startup
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

## 4. Test Groups Mapped to Main User and App Workflow

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

### 7.1 Backend pytest suite

Run all backend tests:

```powershell
python -m pytest
```

Run one module:

```powershell
python -m pytest tests/test_auth_session_api.py -v
```

Run a specific test:

```powershell
python -m pytest tests/test_bridge_run_api.py::test_bridge_human_review_three_reviewers_only_first_decision_wins -v
```

### 7.1a Recommended local setup for Python 3.13 (`py313_venv`) with `uv`

When running tests on MS Windows with Python 3.13, prefer a project-local `uv` environment to keep dependencies aligned with `pyproject.toml` and `uv.lock`.

From `doc_quality_compliance_check/`:

```powershell
uv venv --python 3.13 py313_venv
.\py313_venv\Scripts\Activate.ps1
uv sync --extra dev --frozen --active
uv run pytest -q
```

Notes:
- `--extra dev` is required for test dependencies (`pytest`, `pytest-cov`, etc.).
- `--frozen` ensures installs match `uv.lock` exactly.
- when using `py313_venv` (instead of default `.venv`), add `--active` to `uv run` commands.
- `uv run --active pytest` avoids interpreter/path drift and is preferred over plain `python -m pytest`.

### 7.1b Troubleshooting: `python -m pytest` fails after creating `py313_venv`

Common cause:
- pytest is executed from a different interpreter/environment than `py313_venv`.

Quick checks:

```powershell
python -c "import sys; print(sys.executable)"
uv run --active python -c "import sys; print(sys.executable)"
```

If you see this warning:

```text
warning: `VIRTUAL_ENV=py313_venv` does not match the project environment path `.venv` and will be ignored; use `--active` to target the active environment instead
```

Warning:
- if pytest prints SQLite `ResourceWarning` messages on this setup, use the current test fixtures as the baseline and run `uv run --active pytest -q -W default` to verify the leak is fixed.

use `--active` explicitly:

```powershell
uv sync --extra dev --frozen --active
uv run --active pytest -q
```

If the paths differ, run tests through `uv`:

```powershell
uv sync --extra dev --frozen --active
uv run --active pytest -q
```

If you still prefer `python -m pytest`, ensure the shell is activated with:

```powershell
.\py313_venv\Scripts\Activate.ps1
```

### 7.2 Coverage and route drift gates

Both are active by default through `pyproject.toml` and `tests/conftest.py`.

What runs automatically:
- backend coverage threshold: `--cov-fail-under=85`
- route-to-test drift audit before pytest collection

Manual route audit:

```powershell
python src/doc_quality/tools/route_coverage_audit.py
```

### 7.3 Browser smoke E2E

`npm run test:e2e` only starts the Next.js frontend dev server via `playwright.config.ts webServer`. The backend is **not required** for the current smoke suite — `frontend/lib/authClient.ts` is a mocked stub that returns a default user client-side, so no real API calls are made during these tests.

> When `authClient.ts` is replaced with a real backend-calling implementation, the backend will become required again and section 7.3 must be updated accordingly.

**Single terminal — Playwright E2E** (from `doc_quality_compliance_check/`):

Preconditions:
- Node.js must be in PATH (`node --version` should return v18 or later).
- Chromium browser must be installed (run `npm run test:e2e:install` once from `frontend/`).
- No activated Python venv is required.

> **Important**: all `npm` commands must run from the `frontend/` subdirectory, not the project root. The project root has no `package.json` and `npm install` will fail there.

```powershell
cd frontend
npm install
npm run test:e2e:install
npm run test:e2e
```

Playwright starts the Next.js dev server automatically, then runs the three smoke assertions against it.

Sanity-check test discovery (optional, no backend needed):

```powershell
npx playwright test --list
```

### 7.3a Manual browser app test run (MS Windows + Edge)

Use this runbook when QA or stakeholders need to manually test the app in a real browser session (outside Playwright automation).

Open three PowerShell terminals.

1. **Database terminal** (from `doc_quality_compliance_check/`):

```powershell
docker compose up -d; docker compose ps
.\.venv\Scripts\python.exe init_postgres.py
```

Expected `docker compose ps` result includes a healthy Postgres container, with information about created name, image status ports and service.

If PowerShell reports `docker` is not recognized, do the following:

1. Install Docker Desktop for Windows (or start it if already installed).
2. Open a **new** PowerShell window after installation/start.
3. Verify Docker CLI is available:

```powershell
docker --version
docker compose version
```

4. Re-run:

```powershell
docker compose up -d
```

Fallback when Docker is unavailable:
- install/run local PostgreSQL 16 service on `localhost:5432`
- keep `DATABASE_URL` aligned with local Postgres
- run `\.venv\Scripts\python.exe init_postgres.py` after DB is reachable

2. **Backend terminal** (from `doc_quality_compliance_check/`):

```powershell
.\scripts\start_backend.ps1 -Reload
```

3. **Frontend terminal** (from `doc_quality_compliance_check/frontend/`):

```powershell
npm install
npm run dev
```

Open in Microsoft Edge via terminal command:

```powershell
start msedge http://localhost:3000/login
```

or use directly in browser:

```text
http://localhost:3000/login
```

Health checks:
- frontend proxy health: `http://localhost:3000/health`
- backend direct health: `http://127.0.0.1:8000/health`

Important local auth note:
- keep `frontend/.env.local` with `NEXT_PUBLIC_API_ORIGIN=` (empty) for same-origin cookie auth via Next.js proxy.

#### Short QA smoke checklist (Edge, 8 actions)

1. Open `http://localhost:3000/login` and confirm login page renders correctly.
2. Sign in using configured test credentials (`AUTH_MVP_EMAIL` / `AUTH_MVP_PASSWORD`) and confirm redirect into authenticated app shell.
3. From sidebar, open **Dashboard** and verify KPI cards render without API error banners.
4. Open **Document Hub** and verify list/filter UI responds (search box, status filter, and list updates).
5. Open **Risk** page and verify list/detail selection works and action buttons are visible according to role.
6. Open **Audit Trail** page and verify timeline loads and selecting a row updates details panel.
7. Open **Exports Registry** and verify filter controls and download dialog open/close behavior.
8. Trigger logout (top bar exit), then confirm unauthenticated access redirects back to `/login`.

### 7.4 DAST baseline

GitHub Actions workflow:
- `.github/workflows/dast-zap-baseline.yml`

Current usage model:
- manual `workflow_dispatch`
- supply a staging or pre-release URL
- upload artifacts for triage (`html`, `json`, `md`)

### 7.5 Manual LLM smoke test runbook

Purpose:
- provide a human-approved, budget-limited operator path for future live-model validation,
- keep accidental token spend out of normal local and CI test runs.

Current state:
- offline unit tests: `services/orchestrator/tests/test_review_flow.py`, `services/orchestrator/tests/test_document_review_flow.py`
- offline contract tests: `services/orchestrator/tests/test_llm_contracts.py`
- entrypoint: `services/orchestrator/tests/test_llm_integration_smoke.py`
- marker: `llm_integration`
- default behavior: skipped unless explicit approval and budget env vars are set
- current repo limitation: the registered orchestrator adapters are still scaffold-backed, so the smoke test will still skip even when manually enabled

Operator steps:
1. Confirm human approval exists for a live-model smoke run.
2. Confirm the selected provider is no longer scaffold-backed in the current repo/runtime.
3. Set a small explicit token budget.
4. Run only the smoke-test module from `services/orchestrator/`.
5. Record whether the result was an intentional skip, a schema/contract failure, or a true live-model pass.

PowerShell example:

```powershell
cd services/orchestrator
$env:PYTHONPATH = (Resolve-Path .\src).Path
$env:RUN_LLM_INTEGRATION_TESTS = "1"
$env:LLM_TEST_HUMAN_APPROVED = "1"
$env:LLM_TEST_BUDGET_TOKENS = "400"
$env:LLM_TEST_PROVIDER = "anthropic"
python -m pytest tests/test_llm_integration_smoke.py -q --cov-fail-under=0
```

Offline validation example (no live model calls):

```powershell
cd services/orchestrator
$env:PYTHONPATH = (Resolve-Path .\src).Path
python -m pytest tests/test_review_flow.py tests/test_document_review_flow.py tests/test_llm_contracts.py -q --cov-fail-under=0
```

Expected outcomes:
- `1 skipped`: expected today when approval flags are missing, budget is invalid, or the provider remains scaffold-backed
- `1 passed`: expected only after a real provider implementation exists and returns schema-valid JSON
- `1 failed`: investigate provider wiring, credentials, schema drift, or response-contract issues before repeating the run

Operator rules:
- never run this smoke test automatically in CI by default
- never omit `LLM_TEST_BUDGET_TOKENS`
- prefer a single targeted module run over the whole orchestrator suite for live-model checks
- capture the provider, budget, outcome, and approval context in QA notes when a real online smoke run is performed

---

## 8. Current Baseline Assets

Key files:
- `tests/conftest.py`
- `src/doc_quality/tools/route_coverage_audit.py`
- `frontend/playwright.config.ts`
- `frontend/tests/e2e/smoke.spec.ts`
- `.github/workflows/browser-e2e-smoke.yml`
- `.github/workflows/dast-zap-baseline.yml`
- `services/orchestrator/tests/test_review_flow.py`
- `services/orchestrator/tests/test_document_review_flow.py`
- `services/orchestrator/tests/test_llm_contracts.py`
- `services/orchestrator/tests/test_llm_integration_smoke.py`
- `project-context/2.build/qa.md`

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
