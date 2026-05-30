# Phase 1 Execution Sequence — Privacy Step Contract (PSC-01 to PSC-07)

This document is the executable build handoff for the first high-gap finding:
mandatory privacy-policy step contract for model-using workflows, including
backend enforcement and frontend failure UX alignment.

Primary architecture anchor:
- SAD AD-16 with supporting AD-17, AD-18, AD-19.

AIUC-1 trace anchor:
- A001, A002, A003, A004, A005, A006, A007 from Data & Privacy requirements.

OWASP Chapter A trace anchor:
- Input data handling and governance -> A001
- Output rights and usage controls -> A002
- Context-aware access boundaries -> A003
- Trade-secret and confidential-data protection -> A004
- Tenant/customer isolation -> A005
- PII leakage prevention in outputs/logs -> A006
- Output IP and copyright/trademark safeguards -> A007

Companion planning document:
- project-context/2.build/phase1_privacy_step_contract_handoff.md

## 0. Execution Status (Updated 2026-05-25)

- [x] PSC-01 implemented and remediated to quality requirements.
- [x] PSC-02 implemented and remediated to quality requirements.
- [x] PSC-03 implemented and remediated to quality requirements.
- [x] Topic 3.1 implemented (models/compliance/policy contract service).
- [x] Topic 3.2 remediated:
  - Orchestrator service now enforces policy-contract checks and fail-closed routing before execution/routing decisions.
  - Centralized API exception mapping includes policy domain exceptions with stable error fields.
- [x] Topic 3.3 implemented (allow + deny audit evidence persistence with policy metadata).
- [x] API error payload now includes stable fields required by this sequence:
  - error_code
  - message
  - action_points
  - correlation_id
- [x] Targeted backend tests for PSC paths and error-envelope assertions are passing.
- [x] Full backend suite and coverage gate are passing (coverage >= 85%).
- [x] Frontend failure UX alignment in section 3.4 implemented with actionable guidance and correlation IDs.

## 1. Delivery Order

1. PSC-01: Define policy step contract schema and validators
2. PSC-02: Enforce contract in model invocation pipeline
3. PSC-03: Enforce fail-closed routing for personal-data-possible flows
4. PSC-04: Persist policy/routing audit evidence for each model step
5. PSC-05: Standardize exception taxonomy and API error mapping
6. PSC-06: Regression and conformance test pass in py313_venv
7. PSC-07: Frontend failure-state wiring aligned to existing UI style

AIUC-1 coverage in this order:
- PSC-01/PSC-02/PSC-03 establish A001-A003/A005/A006 runtime enforcement.
- PSC-04/PSC-05 establish A002/A006/A007 audit and failure-contract traceability.
- PSC-06 validates A001-A007 end-to-end conformance.
- PSC-07 ensures A002/A006/A007 user-visible failure guidance.

OWASP Chapter A coverage in this order:
- PSC-01/PSC-02/PSC-03 enforce Chapter A policy boundaries at runtime.
- PSC-04/PSC-05 ensure auditable evidence and safe failure handling.
- PSC-06 validates Chapter A conformance tests.
- PSC-07 aligns user-visible Chapter A deny guidance with existing UI style.

## 2. Quality Requirements (Mandatory)

The following constraints are mandatory for all implementation tasks:

- SOLID:
  - Single Responsibility for schema validation, policy enforcement, routing, and audit persistence.
  - Open/Closed for adding new sensitivity classes and routing providers without changing orchestration control flow.
  - Liskov substitution across provider adapters and policy evaluators.
  - Interface segregation for contract validation, routing decision, and persistence boundaries.
  - Dependency inversion so workflow logic depends on interfaces, not provider-specific implementations.
- Type safety:
  - Full type hints on all new public functions, models, and exceptions.
- Documentation:
  - Module docstrings and class/function docstrings for new or substantially changed logic.
- Exceptions and error handling:
  - Domain-specific exceptions with explicit mapping to stable API error codes.
  - Internal logs retain diagnostic detail; external API responses remain safe and actionable.
- Logging:
  - Structured logs for policy pass/fail, routing decisions, and deny-path reasons with correlation IDs.
- User-facing failures:
  - Clear message, cause, and action points.
  - No stack traces or sensitive internals in user payloads.
- Testing:
  - Unit + integration + API negative-path tests for policy and routing controls.
  - Maintain or improve existing coverage gate.
- UI consistency:
  - Use existing bridge/admin error presentation style and existing component patterns.

## 3. File-Level Change Targets

### 3.1 Backend models and contract layer (PSC-01)

- src/doc_quality/models/model_policy.py
  - Add or extend typed model for step policy contract metadata.
- src/doc_quality/models/compliance.py
  - Add shared enums/types for sensitivity and inference location if not already centralized.
- src/doc_quality/services/bridge_privacy_service.py
  - Add policy context derivation helper returning a typed policy contract payload.
- New file: src/doc_quality/services/policy_contract_service.py
  - Single-purpose validator for mandatory policy fields and allowed values.

### 3.2 Backend orchestration and route enforcement (PSC-02 and PSC-03)

- src/doc_quality/services/bridge_orchestrator_service.py
  - Enforce policy contract check before step execution and before model-routing decision.
- src/doc_quality/api/routes/bridge.py
  - Integrate policy enforcement failures into existing error envelope and run workflow handling.
- src/doc_quality/services/model_policy_service.py
  - Add routing policy helper for fail-closed behavior on personal-data-possible class.
- src/doc_quality/api/main.py
  - Ensure centralized exception mapping includes new domain exceptions and stable codes.

### 3.3 Audit evidence persistence (supports PSC-02 and PSC-03)

- src/doc_quality/models/orm.py
  - Ensure audit payload contract can hold policy metadata fields.
- src/doc_quality/api/routes/bridge.py
  - Persist and emit policy evidence fields for both allowed and denied routes.

### 3.4 Frontend failure UX alignment (execution-ready, follows PSC-05 and PSC-07)

- frontend/lib/bridgeClient.ts
  - Parse stable backend error code/action points fields.
- frontend/lib/bridgeRunViewModel.ts
  - Map policy/routing codes to user-facing guidance.
- frontend/pages/bridge.tsx
  - Render actionable failure callouts in existing visual language.
- frontend/pages/doc/[docId]/bridge.tsx
  - Mirror same error guidance and action points.

## 4. Exception Taxonomy (Implementation Target)

Define explicit exception classes with docstrings and typed payload fields:

- PolicyContractViolationError
- PolicyRoutingDeniedError
- PolicyMetadataPersistenceError
- OnPremDependencyUnavailableError

Required error payload fields in API responses:

- error_code
- message
- action_points (list of short next-step instructions)
- correlation_id

## 5. User-Facing Action Point Standards

Every deny/failure case in bridge workflow must provide action points.

Example failure classes and action points:

- On-prem route unavailable:
  - Verify on-prem model service health.
  - Retry bridge run after service recovery.
  - Contact platform operator if outage persists.
- Policy contract invalid:
  - Review missing policy metadata fields.
  - Resubmit workflow with required classification context.
  - Contact administrator if route template is outdated.
- External fallback denied:
  - Use approved scrubbed workflow only if policy permits.
  - Escalate to compliance reviewer for exception request.

## 6. Test Plan (Ready to Execute)

AIUC-1 requirement-to-test mapping:

| AIUC-1 ID | Primary Tests |
| --- | --- |
| A001 | `tests/test_privacy_controls.py`, `tests/test_bridge_orchestrator_service.py`, `tests/test_bridge_run_api.py` |
| A002 | `tests/test_bridge_run_api.py`, `tests/test_error_envelope_api.py`, `frontend/tests/bridgeRunViewModel.test.ts` |
| A003 | `tests/test_adapter_routing_policy.py`, `tests/test_bridge_orchestrator_service.py` |
| A004 | `tests/test_error_envelope_api.py` (IP/trade-secret deny-path cases), release checklist checks |
| A005 | `tests/test_adapter_routing_policy.py`, `tests/test_bridge_run_api.py` (cross-customer isolation deny-path) |
| A006 | `tests/test_privacy_controls.py`, `tests/test_error_envelope_api.py`, log/redaction assertions |
| A007 | `tests/test_error_envelope_api.py`, `tests/test_bridge_run_api.py`, `frontend/tests/bridgeClient.test.ts` |

OWASP Chapter A requirement-to-test crosswalk:

| OWASP Chapter A control theme | Primary Tests |
| --- | --- |
| Input data handling and governance | `tests/test_privacy_controls.py`, `tests/test_bridge_orchestrator_service.py`, `tests/test_bridge_run_api.py` |
| Output rights and usage controls | `tests/test_bridge_run_api.py`, `tests/test_error_envelope_api.py`, `frontend/tests/bridgeRunViewModel.test.ts` |
| Context-aware access boundaries | `tests/test_adapter_routing_policy.py`, `tests/test_bridge_orchestrator_service.py` |
| Trade-secret and confidential-data protection | `tests/test_error_envelope_api.py` deny-path cases, release checklist checks |
| Tenant/customer isolation | `tests/test_adapter_routing_policy.py`, `tests/test_bridge_run_api.py` cross-customer isolation cases |
| PII leakage prevention in outputs/logs | `tests/test_privacy_controls.py`, `tests/test_error_envelope_api.py`, logging/redaction checks |
| Output IP and copyright/trademark safeguards | `tests/test_error_envelope_api.py`, `tests/test_bridge_run_api.py`, `frontend/tests/bridgeClient.test.ts` |

### 6.1 Backend unit tests

- tests/test_adapter_routing_policy.py
  - Add fail-closed tests for personal-data-possible class.
- tests/test_privacy_controls.py
  - Add contract validator negative tests for missing metadata.
- tests/test_bridge_orchestrator_service.py
  - Add policy-enforcement tests in strict and fallback modes.

### 6.2 API tests

- tests/test_bridge_run_api.py
  - Add deny-path assertions for policy contract and routing failures.
- tests/test_error_envelope_api.py
  - Add assertions for stable error_code and action_points content.

### 6.3 Frontend tests

- frontend/tests/bridgeClient.test.ts
  - Add parsing tests for actionable error payloads.
- frontend/tests/bridgeRunViewModel.test.ts
  - Add mapping tests for policy/routing errors and action hints.
- frontend/tests/e2e/smoke.spec.ts
  - Add one failure-state smoke scenario for bridge policy denial UI copy.

## 7. Execution Commands (py313_venv)

Run from repository root.

- Activate environment:
  - .\py313_venv\Scripts\Activate.ps1
- Run targeted backend tests:
  - .\py313_venv\Scripts\python.exe -m pytest tests/test_adapter_routing_policy.py tests/test_bridge_orchestrator_service.py tests/test_bridge_run_api.py tests/test_error_envelope_api.py -q
- Run full backend suite gate:
  - .\py313_venv\Scripts\python.exe -m pytest
- Run frontend unit tests:
  - Set-Location frontend
  - npm test -- bridgeClient.test.ts bridgeRunViewModel.test.ts
- Run frontend smoke test:
  - npm run test:e2e -- tests/e2e/smoke.spec.ts

## 8. Definition of Done for PSC-01 to PSC-07

- [x] Mandatory policy contract is validated for every model-using bridge step.
- [x] personal-data-possible requests are fail-closed when on-prem execution is unavailable.
- [x] Audit evidence persists policy metadata for allow and deny paths.
- [x] API responses provide safe, actionable user guidance with stable error codes.
- [x] Exception taxonomy includes PolicyContractViolationError, PolicyRoutingDeniedError, PolicyMetadataPersistenceError, and OnPremDependencyUnavailableError.
- [x] Audit payloads persist explicit fallback_reason_code where applicable.
- [x] Frontend displays clear action points using existing page/component style.
- [x] All targeted tests pass in py313_venv and no diagnostics regressions are introduced.
- [x] AIUC-1 A001-A007 are traceable from implementation tickets to executed test evidence.
- [x] OWASP Chapter A controls are traceable from build sequence to executed test evidence.
