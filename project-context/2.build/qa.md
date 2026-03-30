# QA Documentation — Doc Quality Compliance Check

<!-- markdownlint-disable MD031 MD032 MD034 MD040 MD060 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.2.0  
**Date:** 2026-3-31  
**Author persona:** `@qa-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The QA strategy for MVP is **unit test first**: all five service modules are covered by dedicated pytest unit test files. Integration tests (FastAPI TestClient) and end-to-end tests are backlog items deferred to Phase 2. All 30 unit tests pass with 0 failures.

> **Consistency note (2026-3-31):** This file preserves the initial Phase-0 QA baseline snapshot. The current codebase has expanded beyond this original scope (including auth/session/rate-limit and API-route tests). Treat this document as historical baseline context; for current coverage, use the active `tests/` directory and latest CI/test outputs.

---

## Section 1 – Test Strategy

### 1.1 Testing Pyramid (MVP)

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

### 1.2 Test Framework

| Tool | Version | Purpose |
|------|---------|---------|
| `pytest` | ≥7.4.0 | Test runner, fixture system |
| `pytest-asyncio` | ≥0.23.0 | Async test support (mode=auto) |
| `pytest-cov` | ≥4.1.0 | Coverage reporting |
| `fastapi.testclient.TestClient` | via FastAPI | HTTP integration testing (wired in conftest.py; not used in unit tests) |

**pytest configuration (`pyproject.toml`):**
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

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

### 1.4 Test Execution

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=src/doc_quality --cov-report=term-missing

# Run a specific module
pytest tests/test_document_analyzer.py -v

# Run a specific test
pytest tests/test_compliance_checker.py::test_high_risk_medical_domain -v
```

---

## Section 2 – Test Results Summary

**Last run:** 2025-02-23  
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

---

## Section 4 – Shared Test Fixtures (`tests/conftest.py`)

```python
@pytest.fixture
def client() -> TestClient:
    """Return a FastAPI test client (available for future integration tests)."""
    return TestClient(app)

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

The `TestClient` fixture is wired but not yet used by the current unit tests. It is available for Phase 2 integration tests.

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

### 6.1 Missing Integration Tests

**Gap:** No FastAPI TestClient-based tests for HTTP routes. Current unit tests call service functions directly, bypassing the API layer (request validation, security middleware, error handling, response serialisation).

**Impact:** Route-level bugs (incorrect HTTP status codes, missing response fields, CORS misconfiguration, middleware errors) would not be detected by the current test suite.

**Plan (Phase 2):** Add `tests/test_routes_documents.py`, `tests/test_routes_compliance.py`, etc. using the `TestClient` fixture already wired in `conftest.py`.

```python
# Example: planned Phase 2 test
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

**Gap:** No load testing or performance benchmarks. Response time SLOs (<3s for analysis, <10s for PDF generation) are untested.

**Plan (Phase 2):** Add `locust` or `pytest-benchmark` tests for the core analysis endpoints.

### 6.3 Missing End-to-End Tests

**Gap:** No test for the full PDF download flow: generate → store → download. The PDF file existence is verified in unit tests but the HTTP download endpoint is not tested.

**Plan (Phase 2):** Add `test_routes_reports.py::test_generate_and_download_pdf` using TestClient.

### 6.4 Missing Security Penetration Tests

**Gap:** No DAST (Dynamic Application Security Testing) or penetration testing. CodeQL provides SAST coverage but dynamic attack simulations are not run.

**Plan (Phase 2):** Run OWASP ZAP scan against development server; target 0 medium+ alerts.

### 6.5 No AI Model Evaluation Framework

**Gap:** The LLM-enriched analysis (optional Anthropic Claude) has no accuracy evaluation. There is no benchmark set, no ground truth annotations, and no metrics for:
- arc42 section false-negative rate (sections present but not detected)
- EU AI Act requirement false-positive rate (requirements incorrectly marked as "met")
- Comparative accuracy: rule-based vs. Claude-enriched

**Plan (Phase 2/3):**
1. Assemble 50 representative arc42 documents with expert annotations
2. Run rule-based and Claude-enriched analysis on each
3. Compute precision, recall, F1 for section detection
4. Set accuracy targets (proposed: precision ≥95%, recall ≥90% for arc42 sections)

---

## Section 7 – Future QA Backlog

| Item | Priority | Phase | Description |
|------|----------|-------|-------------|
| TestClient route tests | HIGH | 2 | Cover all 10+ API endpoints with TestClient |
| pytest-cov coverage target | HIGH | 2 | Set minimum coverage threshold at ≥80% |
| Ruff linting in CI | HIGH | 2 | GitHub Actions: `ruff check src/ tests/` on every push |
| mypy strict type checking | MEDIUM | 2 | `mypy src/` with strict mode; target 0 errors |
| E2E PDF download test | MEDIUM | 2 | Full generate → download flow via TestClient |
| Performance benchmarks | MEDIUM | 2 | locust or pytest-benchmark for analysis endpoints |
| OWASP ZAP scan | MEDIUM | 2 | DAST scan against dev server |
| AI evaluation benchmark | LOW | 3 | 50-document annotated benchmark for Claude accuracy |
| Contract tests | LOW | 3 | Pact or schemathesis API contract tests |
| Regression test suite | LOW | 3 | Non-regression tests for EU AI Act requirement changes |

---

## Section 8 – Test Maintenance Notes

### 8.1 Historical Note on In-Memory Review Tests

The earlier Phase-0 test baseline referenced module-level in-memory review state. Current backend persistence has moved to database-backed paths for core auth/session/review workflows, so this note is historical and should not be treated as the current architecture contract.

### 8.2 Filesystem-Dependent Tests

`test_generate_pdf_report` and `test_get_template_with_file` write to / read from the local filesystem. These tests require:
- `reports/` directory writable by the test process (created automatically by `generate_report`)
- `templates/sop/sop_business_goals.md` (and other active template files) present at the repo root

**Impact on CI:** Tests must be run from the repository root directory; the GitHub Actions runner must have write access to the working directory.

### 8.3 PDF File Cleanup

`test_generate_pdf_report` creates a PDF file in `reports/`. These files are not automatically deleted after tests. For clean test runs, the `reports/` directory may accumulate test PDFs.

**Phase 2 fix:** Add a pytest fixture that tracks and deletes generated report files after each test.

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

1. Tests are run from the repository root directory (`pytest tests/ -v`).
2. The `templates/sop/` directory contains all 6 active SOP template files at test time.
3. The `reports/` directory is writable by the test process; it is created automatically by the report generator service if absent.
4. Where persistence-backed tests are used, test data isolation is handled by fixtures/database setup strategy rather than relying on module-level in-memory stores.
5. Python 3.12 is required; the test suite was validated on Python 3.12.3.
6. No Anthropic API key is required to run the tests; all tests use the rule-based engine only.

---

## Open Questions

1. **Coverage target:** Should pytest-cov enforce a minimum coverage threshold (e.g., `--cov-fail-under=80`) in CI?
2. **Test isolation:** Should the in-memory `_review_store` be cleared via fixture for true test isolation, or is the current unique-ID approach sufficient?
3. **CI integration:** Which CI system will run the test suite? GitHub Actions is the target; when should the workflow file be created?
4. **PDF cleanup:** Should generated test PDFs be deleted automatically, or should a `tmp_path` pytest fixture be used to isolate filesystem tests?
5. **Accuracy benchmark:** When should the 50-document arc42 annotation benchmark be assembled? Who provides the ground truth annotations (QM staff, system architects)?

---

## Audit

```
persona=qa-eng
action=qa
timestamp=2026-3-31
adapter=AAMAD-vscode
artifact=project-context/2.build/qa.md
version=0.2.0
status=complete
tests_passed=historical-baseline-30
tests_failed=historical-baseline-0
codeql_alerts=0
```
