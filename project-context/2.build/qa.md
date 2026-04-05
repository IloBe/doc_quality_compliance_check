# QA Documentation — Doc Quality Compliance Check

<!-- markdownlint-disable MD031 MD032 MD034 MD040 MD060 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.3.11  
**Date:** 2026-4-5  
**Author persona:** `@qa-eng`  
**AAMAD phase:** 2.build  

---

## Overview

This document captures the original Phase-0 QA baseline. The current codebase now includes a broader pytest suite covering service, API-route, auth/session, recovery, authorization, integration, UAT-style workflow, and observability behaviors in addition to the initial unit tests.

> **Consistency note (2026-4-4):** Keep this file as Phase-0 baseline context, not as the full current test inventory. Historical baseline statements remain for traceability, but they should be read together with the active `tests/` directory and latest pytest outputs.

---

## Section 1 – Test Strategy

### 1.1 Testing Pyramid (Historical MVP Baseline)

```
         ┌──────────┐
         │  E2E     │  ← Not implemented (Phase 2)
         │  Tests   │
        ┌┴──────────┴┐
        │ Integration │  ← TestClient wired in conftest.py; route tests deferred (Phase 2)
        │   Tests    │
       ┌┴────────────┴┐
       │  Unit Tests  │  ← ✅ 30 tests, 5 test modules (MVP)
       └──────────────┘
```

**Current state (2026-4-4):** The historical pyramid above is preserved for Phase-0 traceability, but the live repo has moved beyond it:

- Unit/service tests still cover analyzer, compliance, templates, report generation, research, and HITL services.
- FastAPI `TestClient` coverage is now implemented across auth/session, authorization, rate limiting, recovery, bridge runs, dashboard, observability, skills, audit trail, document lock, document hub, stakeholder admin, and UAT-style workflows.
- Full browser E2E coverage and performance/DAST automation remain deferred.

### 1.2 Test Framework

| Tool | Version | Purpose |
|------|---------|---------|
| `pytest` | ≥7.4.0 | Test runner, fixture system |
| `pytest-asyncio` | ≥0.23.0 | Async test support (mode=auto) |
| `pytest-cov` | ≥4.1.0 | Coverage reporting and minimum coverage gate enforcement |
| `fastapi.testclient.TestClient` | via FastAPI | HTTP/API integration testing for authenticated and unauthenticated route behavior |
| `@playwright/test` | ≥1.54.2 | Browser E2E smoke workflows for critical user journeys |
| `OWASP ZAP` baseline | stable container image | DAST baseline scan for pre-release/CI target URLs |

**pytest configuration (`pyproject.toml`):**
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = "--cov=src --cov-report=term-missing --cov-fail-under=85"
```

**Active quality gate:** The suite now enforces a backend coverage threshold of **85%** via `pytest-cov`.

### 1.3 Test Organisation

```
tests/
├── conftest.py                  — Shared fixtures (TestClient, sample documents)
├── test_document_analyzer.py    — 7 tests
├── test_compliance_checker.py   — 6 tests
├── test_hitl_workflow.py        — 6 tests
├── test_report_generator.py     — 3 tests
└── test_template_manager.py     — 8 tests
```

The tree above is the original MVP baseline snapshot. The current `tests/` directory also includes representative route/integration modules such as:

- `test_auth_session_api.py`, `test_auth_authorization_api.py`, `test_auth_rate_limit_api.py`, `test_auth_recovery_api.py`
- `test_bridge_run_api.py`, `test_dashboard_api.py`, `test_observability_api.py`, `test_audit_trail_api.py`
- `test_skills_api.py`, `test_document_lock_api.py`, `test_document_hub_live_api.py`, `test_stakeholder_profiles_api.py`
- `test_integration_api_workflow.py`, `test_uat_workflow.py`, `test_error_envelope_api.py`, `test_risk_templates_defaults_api.py`
- `test_risk_templates_api.py`, `test_reports_download_api.py`, `test_documents_read_api.py`, `test_compliance_standard_mapping_api.py`, `test_templates_api.py`, `test_research_api.py`

### 1.4 Test Execution

```bash
# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=src --cov-report=term-missing

# Run a specific module
python -m pytest tests/test_document_analyzer.py -v

# Run a specific test
python -m pytest tests/test_compliance_checker.py::test_high_risk_medical_domain -v

# Run a current API/integration module
python -m pytest tests/test_auth_session_api.py -v
```

---

## Section 2 – Test Results Summary

This section preserves the original MVP baseline run for historical comparison.

**Last run (historical baseline):** 2025-02-23  
**Python version:** 3.12.3  
**Duration:** 0.05 seconds  

```
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-9.0.2, pluggy-1.6.0
asyncio: mode=Mode.AUTO

collected 30 items

tests/test_compliance_checker.py::test_high_risk_medical_domain       PASSED
tests/test_compliance_checker.py::test_low_risk_general_domain        PASSED
tests/test_compliance_checker.py::test_provider_role_detection        PASSED
tests/test_compliance_checker.py::test_applicable_regulations_medical PASSED
tests/test_compliance_checker.py::test_eu_ai_act_check_returns_result PASSED
tests/test_compliance_checker.py::test_eu_ai_act_check_low_compliance PASSED
tests/test_document_analyzer.py::test_detect_arc42_type               PASSED
tests/test_document_analyzer.py::test_detect_model_card_type          PASSED
tests/test_document_analyzer.py::test_detect_unknown_type             PASSED
tests/test_document_analyzer.py::test_arc42_analysis_complete         PASSED
tests/test_document_analyzer.py::test_arc42_analysis_missing_sections PASSED
tests/test_document_analyzer.py::test_model_card_analysis_complete    PASSED
tests/test_document_analyzer.py::test_model_card_analysis_incomplete  PASSED
tests/test_hitl_workflow.py::test_create_review_without_modifications PASSED
tests/test_hitl_workflow.py::test_create_review_with_modifications    PASSED
tests/test_hitl_workflow.py::test_get_review_by_id                    PASSED
tests/test_hitl_workflow.py::test_update_review_status                PASSED
tests/test_hitl_workflow.py::test_list_reviews_for_document           PASSED
tests/test_hitl_workflow.py::test_update_nonexistent_review           PASSED
tests/test_report_generator.py::test_generate_pdf_report              PASSED
tests/test_report_generator.py::test_generate_report_summary         PASSED
tests/test_report_generator.py::test_generate_report_with_reviewer   PASSED
tests/test_template_manager.py::test_list_templates_returns_all       PASSED
tests/test_template_manager.py::test_active_templates_count           PASSED
tests/test_template_manager.py::test_inactive_templates_exist         PASSED
tests/test_template_manager.py::test_unknown_template_returns_none    PASSED
tests/test_template_manager.py::test_inactive_template_returns_placeholder PASSED
tests/test_template_manager.py::test_template_index_contains_active   PASSED
tests/test_template_manager.py::test_template_index_contains_inactive PASSED
tests/test_template_manager.py::test_get_template_with_file           PASSED

============================== 30 passed in 0.05s ==============================
```

**Summary:** ✅ 30 passed | 0 failed | 0 errors | 0 warnings

**Current-state note (2026-4-5):** The live suite now extends well beyond this 30-test baseline and includes authenticated API, integration, workflow, authorization matrix, contract-shape, and list ordering/limit edge tests.

**Latest inventory snapshot (2026-4-5):** `pytest --collect-only -q` now reports **172 collected tests**.

**Latest coverage baseline (2026-4-5):** Full-suite execution with coverage reports **85.53% total coverage**, which currently passes the enforced **85%** threshold gate.

---

## Section 3 – Test Coverage by Module

### 3.1 `test_document_analyzer.py` — 7 Tests

Tests for `src/doc_quality/services/document_analyzer.py`

| Test | Function tested | Scenario |
|------|----------------|---------|
| `test_detect_arc42_type` | `detect_document_type` | Content contains `arc42` → `DocumentType.ARC42` |
| `test_detect_model_card_type` | `detect_document_type` | Content contains `Model Card` → `DocumentType.MODEL_CARD` |
| `test_detect_unknown_type` | `detect_document_type` | Generic content → `DocumentType.UNKNOWN` |
| `test_arc42_analysis_complete` | `analyze_arc42_document` | All 12 sections present → `status=PASSED`, `score>0.9` |
| `test_arc42_analysis_missing_sections` | `analyze_arc42_document` | Only 1 section present → `status=MODIFICATIONS_NEEDED`, `missing_sections` non-empty |
| `test_model_card_analysis_complete` | `analyze_model_card` | All 9 sections present → `score>0.8`, `DocumentType.MODEL_CARD` |
| `test_model_card_analysis_incomplete` | `analyze_model_card` | Only `Model Details` section → incomplete |

**Shared fixtures used:**
- `sample_arc42_content` — complete 12-section arc42 document with UML diagram snippets
- `sample_model_card_content` — complete 9-section model card

### 3.2 `test_compliance_checker.py` — 6 Tests

Tests for `src/doc_quality/services/compliance_checker.py`

| Test | Function tested | Scenario |
|------|----------------|---------|
| `test_high_risk_medical_domain` | `check_eu_ai_act_compliance` | Medical device AI domain → `risk_level=HIGH` |
| `test_low_risk_general_domain` | `check_eu_ai_act_compliance` | Non-AI general domain → `risk_level=MINIMAL` |
| `test_provider_role_detection` | `check_eu_ai_act_compliance` | Domain description includes "develop" → `role=PROVIDER` |
| `test_applicable_regulations_medical` | `get_applicable_regulations` | Medical AI domain → EU AI Act + MDR in result |
| `test_eu_ai_act_check_returns_result` | `check_eu_ai_act_compliance` | Returns `ComplianceCheckResult` with `check_id` UUID |
| `test_eu_ai_act_check_low_compliance` | `check_eu_ai_act_compliance` | Minimal domain info → `compliance_score<1.0`, `gaps` list non-empty |

**Key assertions validated:**
- All 9 requirements (EUAIA-1 through EUAIA-9) are always present in the result
- `compliance_score` is in range [0.0, 1.0]
- `check_id` is a valid UUID string
- `risk_level` and `role` are valid enum values

### 3.3 `test_hitl_workflow.py` — 6 Tests

Tests for `src/doc_quality/services/hitl_workflow.py`

| Test | Function tested | Scenario |
|------|----------------|---------|
| `test_create_review_without_modifications` | `create_review` | No modifications → `status=PASSED`, `approval_date` set |
| `test_create_review_with_modifications` | `create_review` | With `ModificationRequest` → `status=MODIFICATIONS_NEEDED`, `approval_date=None` |
| `test_get_review_by_id` | `get_review` | Created review retrievable by ID |
| `test_update_review_status` | `update_review_status` | Status update persisted in memory store |
| `test_list_reviews_for_document` | `list_reviews_for_document` | Multiple reviews for same document returned correctly |
| `test_update_nonexistent_review` | `update_review_status` | Non-existent ID → returns `None` (no exception) |

**ModificationRequest fields tested:**
- `location` (section name)
- `description` (what needs to change)
- `importance` (`ModificationImportance.MAJOR` / `MINOR` / `CRITICAL`)
- `risk_if_not_done`
- `responsible_role`

### 3.4 `test_report_generator.py` — 3 Tests

Tests for `src/doc_quality/services/report_generator.py`

| Test | Function tested | Scenario |
|------|----------------|---------|
| `test_generate_pdf_report` | `generate_report` | PDF file created at expected path; `ReportResult` returned with valid ID |
| `test_generate_report_summary` | `generate_report` | `analysis_summary` contains quality score and section counts |
| `test_generate_report_with_reviewer` | `generate_report` | Reviewer name included in `ReportResult` metadata |

**PDF generation assertions:**
- `result.file_path` ends with `.pdf`
- PDF file exists on filesystem after generation
- `result.id` is a non-empty string
- `result.generated_at` is a valid datetime

### 3.5 `test_template_manager.py` — 8 Tests

Tests for `src/doc_quality/services/template_manager.py`

| Test | Function tested | Scenario |
|------|----------------|---------|
| `test_list_templates_returns_all` | `list_templates` | Returns all 10 templates (6 active + 4 inactive) |
| `test_active_templates_count` | `list_templates` | Exactly 6 templates with `active=True` |
| `test_inactive_templates_exist` | `list_templates` | At least 1 template with `active=False` |
| `test_unknown_template_returns_none` | `get_template_by_id` | Non-existent ID → returns `None` |
| `test_inactive_template_returns_placeholder` | `get_template_by_id` | Inactive template ID → returns placeholder string (not `None`) |
| `test_template_index_contains_active` | `get_template_index` | Index string contains "Active Templates" section |
| `test_template_index_contains_inactive` | `get_template_index` | Index string contains "Inactive Templates" section |
| `test_get_template_with_file` | `get_template_by_id` | Active template → returns markdown content from filesystem |

**Template count assertion:** `list_templates()` returns exactly 10 items (6 active + 4 inactive registered in `template_manager.py`).

### 3.6 Current Coverage Matrix (2026-4-5)

| Area / Route Family | Current Coverage | Evidence (tests) | Remaining Gap |
|---|---|---|---|
| Auth/session/recovery (`/api/v1/auth/*`) | ✅ Strong | `test_auth_session_api.py`, `test_auth_recovery_api.py`, `test_auth_rate_limit_api.py` | Add more negative/edge token lifecycle scenarios |
| Authorization boundaries | ✅ Stronger | `test_auth_authorization_api.py`, `test_stakeholder_profiles_api.py` | Add optional future matrix expansions for newly introduced routes/roles |
| Error envelope + global handlers | ✅ Strong | `test_error_envelope_api.py` | Add more route-specific error-shape checks |
| Documents analyze/upload/list/lock (`/api/v1/documents/*`) | ✅ Stronger | `test_document_hub_live_api.py`, `test_document_lock_api.py`, `test_skills_api.py`, `test_integration_api_workflow.py`, `test_documents_read_api.py` | Add optional malformed-id validation assertions if route-level ID constraints are introduced |
| Skills + audit event logging (`/api/v1/skills/*`) | ✅ Strong | `test_skills_api.py`, `test_integration_api_workflow.py`, `test_audit_trail_api.py` | Add contract-style validation for response schemas |
| Bridge run + human review (`/api/v1/bridge/*`) | ✅ Strong | `test_bridge_run_api.py` | Add additional failure-mode and concurrent-review cases |
| Dashboard summary (`/api/v1/dashboard/summary`) | ✅ Stronger | `test_dashboard_api.py` | Add larger data-volume performance assertions when benchmark suite is introduced |
| Observability + metrics (`/api/v1/observability/*`, `/metrics`) | ✅ Strong | `test_observability_api.py` | Add auth/permission boundary checks if policy changes |
| Audit trail (`/api/v1/audit-trail/*`) | ✅ Stronger | `test_audit_trail_api.py` | Add large-window stress/perf coverage beyond functional limit/order checks |
| Stakeholder admin (`/api/v1/admin/stakeholder-profiles/*`) | ✅ Strong | `test_stakeholder_profiles_api.py` | Add additional permission permutations and data-volume cases |
| Risk templates (`/api/v1/risk-templates/*`) | ✅ Stronger | `test_risk_templates_defaults_api.py`, `test_risk_templates_api.py` | Add additional validation/error-path cases and auth-boundary permutations if policy changes |
| Compliance routes (`/api/v1/compliance/*`) | ✅ Stronger (still evolving) | `test_uat_workflow.py`, `test_auth_authorization_api.py`, `test_compliance_standard_mapping_api.py` | Add further validation/error-path permutations as requirements evolve |
| Reports (`/api/v1/reports/*`) | ✅ Stronger | `test_integration_api_workflow.py`, `test_reports_download_api.py` | Add deeper edge assertions if download semantics evolve (multi-artifact ambiguity, stricter filename policies) |
| Research (`/api/v1/research/regulations`) | ✅ Implemented | `test_auth_authorization_api.py`, `test_research_api.py` | Add route-level handling coverage for unexpected provider payloads/timeouts if needed |
| Templates API (`/api/v1/templates/*`) | ✅ Implemented | `test_templates_api.py` + `test_template_manager.py` | Add optional auth-boundary or missing-file behavior checks if route policy changes |

---

## Section 4 – Shared Test Fixtures (`tests/conftest.py`)

```python
@pytest.fixture
def client(test_db_session) -> TestClient:
    """Return an authenticated FastAPI test client with DB override."""

    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        login = test_client.post(
            "/api/v1/auth/login",
            json={"email": os.environ["AUTH_MVP_EMAIL"], "password": os.environ["AUTH_MVP_PASSWORD"]},
        )
        if login.status_code != 200:
            raise RuntimeError(login.text)
        yield test_client

    app.dependency_overrides.clear()

@pytest.fixture
def sample_arc42_content() -> str:
    """Complete 12-section arc42 document with UML diagram indicators."""
    return """
# Architecture Documentation (arc42)
## Introduction and Goals
## Constraints
## Context and Scope
## Solution Strategy
## Building Block View
## Runtime View
## Deployment View
## Concepts
## Architecture Decisions
## Quality Requirements
## Risks and Technical Debt
## Glossary
### System Context Diagram
### Component Diagram
### Sequence Diagram
"""

@pytest.fixture
def sample_model_card_content() -> str:
    """Complete 9-section model card document."""
    return """
# Model Card
## Model Details
## Intended Use
## Factors
## Metrics
## Evaluation Data
## Training Data
## Quantitative Analyses
## Ethical Considerations
## Caveats and Recommendations
"""
```

The current `TestClient` fixture is no longer just a placeholder: it overrides the DB dependency, authenticates a browser-style session, and is used by many route/integration tests in the live suite.

---

## Section 5 – Security Scan Results

### 5.1 CodeQL Analysis

**Status:** ✅ 0 alerts  

CodeQL static analysis was run against the repository. No security alerts were identified.

| Alert Type | Count | Notes |
|------------|-------|-------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |
| Low | 0 | — |

**Security measures that contributed to 0 alerts:**
- `bleach.clean()` applied to all user text inputs → prevents XSS injection
- `validate_filename()` regex whitelist → prevents path traversal
- `validate_file_size()` → prevents resource exhaustion
- No subprocess calls with user-supplied arguments
- SQLAlchemy/PostgreSQL-backed paths now exist; use parameterized ORM/database access controls and migration discipline to mitigate SQL-injection risks.
- No pickle/eval/exec on user-supplied data
- Secrets via environment variables only (`ANTHROPIC_API_KEY`) — not hardcoded

### 5.2 Code Review

**Status:** ✅ 0 blocking comments

Automated code review identified no blocking issues.

---

## Section 6 – Known Gaps and Deferred Testing

### 6.1 Incomplete Integration and Route Coverage

**Current state:** FastAPI `TestClient`-based route tests are implemented today. The live suite exercises session auth, RBAC/authorization boundaries, login lockout/rate limiting, recovery flows, error envelopes, bridge human review paths, dashboard aggregation, observability APIs, stakeholder admin APIs, document lock flows, document upload/list/lock/read flows, skills APIs, audit-trail APIs, reports download, templates routes, compliance standard-mapping routes, research routes, and UAT-style backend workflows.

**Closure approach:** Treat this as a route-surface and workflow-verification problem, not a generic testing shortfall. The gap is considered closed only when route inventory, route-to-test mapping, critical browser journeys, and CI quality gates are all in place.

**Required actions (Phase 2):**

1. **Close the route surface intentionally**
    - Build and maintain an inventory of routes under `src/doc_quality/api/routes/*.py`
    - Map each non-trivial route to at least one success-path test and one failure-path test
    - Fail CI when a newly introduced route has no mapped test coverage

2. **Add true browser E2E smoke coverage**
    - Add Playwright smoke flows for the highest-risk user journeys
    - Minimum journey set:
        - login → upload/analyze document → inspect result
        - lock/release workflow on a document
        - review/report workflow including download behavior
        - stakeholder/authorization journey for allowed vs denied actions

3. **Keep regression guardrails at CI level**
    - Add `pytest-cov` with a fail-under threshold
    - Preserve contract-style assertions for high-change endpoints such as dashboard, audit trail, compliance, reports, and documents
    - Add a route-to-test drift check so future endpoint growth does not silently outpace QA coverage

4. **Deepen high-risk workflow failure modes**
    - Add concurrency and repeated-transition tests for bridge/HITL decisions
    - Add race-window and revocation edge tests for session/auth flows
    - Add timeout/invalid-payload handling tests for external-provider-backed research workflows

**Exit criteria:**


**Definition of done:**

$$
    ext{Gap Closed} \iff
(\text{route map complete}) \land
(\text{critical E2E pass}) \land
(\text{CI quality gates pass})
$$

**Implementation status (Phase 2, ACTIVE - Route Drift Gate):**

✅ **Route-to-test drift gate is now live in CI:**
- Implementation: `src/doc_quality/tools/route_coverage_audit.py` (RouteAudit class and CLI)
- Integration: `tests/conftest.py` `pytest_configure()` hook runs audit at pytest collection time
- Baseline inventory: **57 total FastAPI routes** discovered across all route modules
- Coverage status: **All 57 routes mapped to tests** (0 unmapped, 0% drift)
- Exit behavior: pytest fails if any unmapped route is detected
- CLI interface: `python src/doc_quality/tools/route_coverage_audit.py` for manual audits

Example pytest output on success:
```
[route-coverage] 57 routes verified - all mapped to tests
```

Route detection works by:
1. AST parsing of all route files to extract `@router.get/post/put/delete` decorated functions
2. Text search of test files to find path strings, method calls, and prefix patterns
3. Failure if any route is not found in any test file

```python
# Example: current route-style test pattern
def test_analyze_text_endpoint(client):
    response = client.post("/api/v1/documents/analyze", json={
        "content": "# arc42\n## Introduction and Goals\n...",
        "filename": "arch.md"
    })
    assert response.status_code == 200
    data = response.json()
    assert "document_id" in data
    assert data["document_type"] == "arc42"
```

### 6.2 Missing Performance Tests

**Current state:** Functional correctness is covered, but there is still no benchmark or load-oriented suite validating response-time or throughput behavior under realistic volume.

**Required actions (Phase 2):**

1. Add benchmark coverage for the highest-value backend flows
    - document analysis
    - report generation
    - dashboard/audit/compliance list-heavy queries

2. Define enforceable performance targets
    - analysis response target
    - report generation target
    - list endpoint latency target under seeded load

3. Run performance checks in a reproducible environment
    - lightweight benchmark gate in CI where feasible
    - deeper load testing in pre-release or scheduled runs

**Exit criteria:**

- A repeatable benchmark suite exists
- Core endpoint latency targets are documented and measured
- Regression threshold failures are visible before release

### 6.3 Missing End-to-End Tests

**Current state:** Backend/API coverage already includes report generation and HTTP download behavior, including negative-path and header assertions. The remaining gap is true browser-level E2E validation across UI pages and user journeys.

**Required actions (Phase 2):**

1. Add browser smoke coverage for critical journeys
    - login → upload/analyze → inspect document result
    - report generation/download from the UI
    - lock/release document workflow
    - stakeholder/authorization workflow for allowed vs denied actions

2. Validate cross-page behavior instead of API behavior only
    - navigation state
    - user-visible errors
    - file download behavior in the browser
    - permission-gated UI controls

3. Run browser smoke tests automatically
    - on pull requests for a minimal set
    - more complete scenarios on main or pre-release

**Exit criteria:**

- Critical browser smoke suite exists and runs reliably
- Core user journeys are covered across page transitions
- UI regressions can be caught without relying solely on backend API tests

### 6.4 Missing Security Penetration Tests

**Current state:** Static analysis and secure coding checks are in place, but no dynamic security testing is run against the live application behavior.

**Required actions (Phase 2):**

1. Add a baseline DAST workflow
    - OWASP ZAP against a development/staging deployment
    - authenticated scan path for protected routes where practical

2. Define release-blocking findings
    - target 0 critical/high findings
    - review and triage medium findings before release

3. Expand beyond generic scans over time
    - session/auth abuse scenarios
    - authorization bypass attempts
    - upload/download abuse paths

**Exit criteria:**

- A repeatable DAST workflow exists
- Security findings are triaged and tracked
- Release readiness includes dynamic security evidence, not only SAST

### 6.5 No AI Model Evaluation Framework

**Current state:** Functional tests cover fallback/provider behavior, and the orchestrator service now also has an explicit offline-first LLM/CrewAI test split for deterministic verification of prompt rendering, schema validation, guardrails, routing, and validator-stage error handling. The remaining gap is a formal model-quality evaluation framework. There is still no benchmark set, no ground truth annotations, and no release-quality gate for:
- arc42 section false-negative rate (sections present but not detected)
- EU AI Act requirement false-positive rate (requirements incorrectly marked as "met")
- Comparative accuracy: rule-based vs. Claude-enriched

**Implemented LLM/CrewAI test layers (2026-4-5):**
- **Pure unit tests (offline):** deterministic fake adapters/runners validate routing fallback, schema parsing, skip paths, guardrail composition, and CrewAI compatibility behavior in `services/orchestrator/tests/test_review_flow.py` and `services/orchestrator/tests/test_document_review_flow.py`.
- **Agent contract tests (offline):** fixture-based validator output schema checks plus prompt rendering / schema-option assertions now run in `services/orchestrator/tests/test_llm_contracts.py` with representative JSON fixtures under `services/orchestrator/tests/fixtures/`.
- **Online integration tests:** a manual-only smoke-test entrypoint now exists in `services/orchestrator/tests/test_llm_integration_smoke.py`, but it remains skipped by default and also skips while adapters are still scaffold-backed. Any future live-model smoke execution must be explicitly gated behind manual approval flags and token-budget env vars and must not be started automatically because of token-cost controls.

**Operator runbook location:** the short manual smoke-test operator procedure now lives in `TESTING_README.md` and `services/orchestrator/README.md` so QA/release operators have one command path and one expectation model for approval flags, token budget, and expected skip behavior.

**Required actions (Phase 2/3):**
1. Assemble 50 representative arc42 documents with expert annotations
2. Run rule-based and Claude-enriched analysis on each
3. Compute precision, recall, F1 for section detection
4. Set accuracy targets (proposed: precision ≥95%, recall ≥90% for arc42 sections)

**Exit criteria:**

- Annotated benchmark corpus exists
- Rule-based and LLM-assisted paths are evaluated on the same dataset
- Accuracy targets are documented and reviewed as a release signal

### 6.6 Concrete Remaining Gaps (Post Route-Coverage Cycle)

Priority route-family gaps are closed. The next concrete QA gaps are:

1. **Performance/scale assertions for list-heavy APIs**
    - Dashboard summary with larger persisted datasets
    - Audit trail list under large `window_hours` and high event volume
    - Compliance standard-mapping list under high volume and mixed tenants/projects

2. **Deeper failure-mode coverage on high-change workflows**
    - Bridge repeated decision transitions are now covered for duplicate/conflicting human-review submissions; true concurrency/race tests still remain
    - Additional auth/session token lifecycle edge cases now cover server-side revocation, expiry rejection, recovery-session invalidation, token single-use, and idempotent logout; deeper race-window tests still remain
    - Research provider timeout/invalid payload permutations beyond current fallback checks

3. **Coverage governance automation**
    - Maintain the active `pytest-cov` threshold gate and raise it over time as practical
    - Track route-to-test mapping drift in CI for newly introduced endpoints

4. **Non-functional security and E2E depth**
    - Baseline implemented: workflow-dispatch OWASP ZAP scan in `.github/workflows/dast-zap-baseline.yml`
    - Baseline implemented: Playwright browser smoke in `frontend/tests/e2e/smoke.spec.ts` with CI workflow `.github/workflows/browser-e2e-smoke.yml`
    - Remaining: broaden authenticated journey depth (upload/analyze/lock/release/report-download) and define blocking DAST thresholds for release gates

---

## Section 7 – Future QA Backlog

### Active Backlog (Phase 2, Current Priority)

| Item | Priority | Phase | Description |
|------|----------|-------|-------------|
| Browser E2E smoke suite | HIGH | 2 | Expand from baseline Playwright smoke (login, forgot-access, unauth redirect) to full authenticated critical journeys |
| Performance benchmarks | HIGH | 2 | Add benchmark/load coverage for analysis, reports, dashboard, audit trail, and compliance list-heavy queries |
| Bridge/auth failure-mode expansion | MEDIUM | 2 | Continue from newly added duplicate-review and session-revocation tests into true concurrency and race-window coverage on high-change workflows |
| OWASP ZAP baseline | MEDIUM | 2 | Expand from baseline workflow-dispatch scan to scheduled/PR policy with explicit release-blocking thresholds |
| CI static quality gates | MEDIUM | 2 | Keep `ruff` and `mypy` checks in CI to reduce regression noise around the test suite |
| AI evaluation benchmark | LOW | 3 | Build annotated benchmark corpus and compare rule-based vs LLM-assisted quality outcomes; keep any live-model smoke tests manually gated and budget-limited |
| Contract/fuzz testing | LOW | 3 | Add schemathesis or similar contract/fuzz coverage for high-change API surfaces |
| Regression pack for policy changes | LOW | 3 | Preserve non-regression tests for EU AI Act, governance, and workflow rule changes |

### Completed Items (Phase 2)

| Item | Status | Completed | Exit Criteria |
|------|--------|-----------|---------------|
| Route-to-test drift gate | ✅ COMPLETE | 2026-4-5 | 57/57 routes mapped; pytest integration active; 0 unmapped routes |
| pytest-cov threshold gate | ✅ COMPLETE | 2026-4-5 | 85% fail-under threshold active; current coverage 85.53% |

### In-Progress Expansions (Phase 2)

| Item | Status | Updated | Current Evidence |
|------|--------|---------|------------------|
| Bridge/auth failure-mode expansion | ▶ PARTIAL | 2026-4-5 | Added pytest coverage for duplicate bridge review conflicts, 3-reviewer terminal-decision contention, invalid approved+follow-up combinations, idempotent logout, revoked/expired session rejection, recovery reset revoking active sessions, 3-session invalidation across clients, and recovery token single-use |
| Non-functional security and E2E depth | ▶ PARTIAL | 2026-4-5 | Added baseline OWASP ZAP workflow (`.github/workflows/dast-zap-baseline.yml`) and baseline Playwright browser smoke suite (`frontend/playwright.config.ts`, `frontend/tests/e2e/smoke.spec.ts`, `.github/workflows/browser-e2e-smoke.yml`) |
| LLM/CrewAI offline test layering | ▶ PARTIAL | 2026-4-5 | Added deterministic unit + contract tests for orchestrator prompt/rendering, validator schema parsing, fake adapter execution, and guardrail wiring in `services/orchestrator/tests/test_review_flow.py`, `services/orchestrator/tests/test_document_review_flow.py`, `services/orchestrator/tests/test_llm_contracts.py`; manual smoke entrypoint added in `services/orchestrator/tests/test_llm_integration_smoke.py`, still intentionally gated and scaffold-blocked by default |

---

## Section 8 – Test Maintenance Notes

### 8.1 Historical Note on In-Memory Review Tests

The earlier Phase-0 test baseline referenced module-level in-memory review state. Current backend persistence has moved to database-backed paths for core auth/session/review workflows, so this note is historical and should not be treated as the current architecture contract.

### 8.2 Filesystem-Dependent Tests

Some tests still exercise filesystem behavior, but the current suite isolates that behavior more intentionally than the original baseline implied:

- `test_report_generator.py` writes generated reports into `tmp_path`
- `test_reports_download_api.py` uses isolated working directories / disposable report artifacts for generate → download coverage
- `test_template_manager.py::test_get_template_with_file` builds a temporary SOP directory under `tmp_path`
- API/document hub flows still depend on the application's upload/report paths and persistence behavior rather than being pure in-memory tests

**Impact on CI:** Tests still need a writable working directory and consistent app configuration, but the suite no longer depends on uncontrolled accumulation of repo-root artifacts for core report/file assertions.

### 8.3 PDF File Cleanup

The original Phase-0 concern about test PDFs accumulating in `reports/` is now substantially reduced. Unit-level report generation already uses `tmp_path`, and API-level report download coverage is also exercised with isolated temporary working directories and disposable artifacts.

**Maintenance rule:** Keep any new filesystem-dependent report/download tests isolated via `tmp_path`, disposable artifact directories, or equivalent fixture-managed cleanup so CI workers remain stateless and repeatable.

---

## Sources

- pytest Documentation, https://docs.pytest.org/en/stable/
- pytest-asyncio Documentation, https://pytest-asyncio.readthedocs.io/
- FastAPI TestClient, https://fastapi.tiangolo.com/tutorial/testing/
- OWASP Top 10:2021, https://owasp.org/Top10/
- CodeQL Documentation, https://codeql.github.com/docs/
- EU AI Act Art. 9–15 (requirement accuracy baseline), Regulation (EU) 2024/1689

---

## Assumptions

1. Tests are run from the repository root directory (`python -m pytest`).
2. The `templates/sop/` directory contains all 6 active SOP template files at test time.
3. The `reports/` directory is writable by the test process; it is created automatically by the report generator service if absent.
4. Where persistence-backed tests are used, test data isolation is handled by fixtures/database setup strategy rather than relying on module-level in-memory stores.
5. Python 3.12 is required; the test suite was validated on Python 3.12.3.
6. No Anthropic API key is required to run the tests; all tests use the rule-based engine only.

---

## Open Questions

1. **Coverage target ratchet:** When should the active `--cov-fail-under=85` gate be increased, and what evidence should trigger the next threshold raise?
2. **Test isolation:** Which remaining workflow paths still need stronger fixture-driven isolation beyond the current DB override + transaction rollback pattern?
3. **CI integration:** Which CI system will run the test suite? GitHub Actions is the target; when should the workflow file be created?
4. **Filesystem isolation:** Should all future browser/E2E download tests also use disposable artifact directories, or is a shared ephemeral test workspace acceptable in CI?
5. **Accuracy benchmark:** When should the 50-document arc42 annotation benchmark be assembled? Who provides the ground truth annotations (QM staff, system architects)?

---

## Audit (Updated 2026-4-5 with Route-to-Test Drift Gate)

```
persona=qa-eng
action=qa
timestamp=2026-4-5
adapter=AAMAD-vscode
artifact=project-context/2.build/qa.md
version=0.3.17
status=complete-with-drift-gate-partial-bridge-auth-failure-expansion-partial-non-functional-security-e2e-baseline-partial-llm-offline-layering-and-manual-smoke-entrypoint
tests_passed=172-collected
tests_failed=0
current_suite_status=expanded-api-integration-with-route-contract-ordering-limit-authorization-active-85-percent-coverage-gate-route-to-test-drift-enforcement-partial-bridge-auth-failure-mode-coverage-baseline-dast-browser-e2e-offline-llm-crewai-unit-contract-tests-and-manual-llm-smoke-entrypoint
drift_gate_status=ACTIVE-57-routes-all-mapped
route_coverage_audit_tool=src/doc_quality/tools/route_coverage_audit.py
pytest_collection_hook=tests/conftest.py::pytest_configure
codeql_alerts=0
llm_offline_contract_tests=services/orchestrator/tests/test_review_flow.py+test_document_review_flow.py+test_llm_contracts.py
llm_manual_smoke_entrypoint=services/orchestrator/tests/test_llm_integration_smoke.py
```
