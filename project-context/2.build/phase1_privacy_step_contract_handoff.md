# Phase 1 Build Handoff — Privacy Step Contract and Security Architecture

This handoff converts the architecture decisions from SAD Section 1.9 (AD-16..AD-19) into implementation tickets.

Related decisions:
- AD-16 Step privacy contract enforcement
- AD-17 Bridge topology proof as release gate
- AD-18 Retention-class observability split
- AD-19 Security-safe configuration baseline

AIUC-1 Data & Privacy trace set in scope:
- A001 Input data policy
- A002 Output data policy
- A003 Agent data access limits
- A004 Protect IP and trade secrets
- A005 Prevent cross-customer data exposure
- A006 Prevent PII leakage
- A007 Prevent output IP violations

OWASP Chapter A to AIUC-1 build crosswalk in scope:

| OWASP Chapter A control theme | AIUC-1 mapping |
| --- | --- |
| Input data handling and governance | A001 |
| Output rights and usage controls | A002 |
| Context-aware access boundaries | A003 |
| Trade-secret and confidential-data protection | A004 |
| Tenant/customer isolation | A005 |
| PII leakage prevention in outputs/logs | A006 |
| Output IP and copyright/trademark safeguards | A007 |

## Scope and Constraints

- Runtime and environment: Python 3.13 virtual environment (`py313_venv`), existing FastAPI backend, existing Next.js UI style/components.
- Design constraints: SOLID principles, strict type hints, clear docstrings, structured logging, deterministic exception handling, and actionable user-facing failure messages.
- Non-goals for this phase: full enterprise IAM migration and full GDPR rights workflow implementation.

## Ticket Backlog

| Ticket ID | Title | Owner | Priority | Depends On | AIUC-1 Mapping |
| --- | --- | --- | --- | --- | --- |
| PSC-01 | Define step policy contract model and validators | Backend Eng | P0 | None | A001, A002, A003 |
| PSC-02 | Enforce policy metadata in model invocation pipeline | Backend Eng | P0 | PSC-01 | A001, A002, A003, A006 |
| PSC-03 | Fail-closed routing for personal-data-possible steps | Backend Eng | P0 | PSC-01, PSC-02 | A001, A003, A005, A006 |
| PSC-04 | Persist policy/routing audit evidence for each model step | Backend Eng | P0 | PSC-02 | A001, A002, A003, A005, A006, A007 |
| PSC-05 | Standardize workflow exception taxonomy and API error mapping | Backend Eng | P0 | PSC-02 | A002, A006, A007 |
| PSC-06 | Add bridge and model-step conformance tests | QA Eng + Backend Eng | P0 | PSC-01..PSC-05 | A001, A002, A003, A004, A005, A006, A007 |
| PSC-07 | Add frontend failure UX for policy/routing errors (existing style) | Frontend Eng | P1 | PSC-05 | A002, A006, A007 |
| PSC-08 | Implement observability retention-class split | Backend Eng | P1 | PSC-04 | A001, A006 |
| PSC-09 | Add env-example conformance check in CI | QA Eng + DevOps | P1 | PSC-04 | A001, A006 |
| PSC-10 | Release readiness checklist and operator runbook update | QA Eng + DevOps | P1 | PSC-06..PSC-09 | A001, A002, A003, A004, A005, A006, A007 |

## Detailed Tickets

### PSC-01 — Define step policy contract model and validators

- Objective: make privacy-policy metadata mandatory for every model-using step.
- Implementation:
  - Introduce typed contract model (Pydantic) with fields: `step_id`, `sensitivity_class`, `policy_rule_id`, `decision_reason`, `selected_inference_location`, `allowed_tools`.
  - Add field validators for allowed values and minimum-length constraints.
  - Add module docstrings and function/class docstrings.
  - Keep validation logic single-purpose and reusable.
- SOLID notes:
  - Single Responsibility: contract schema/validation isolated from routing logic.
  - Interface Segregation: separate read/write interfaces for policy metadata.
- Acceptance criteria:
  - Any model step without required policy fields is rejected before execution.
  - Validation errors are returned as structured API errors with stable error code.

### PSC-02 — Enforce policy metadata in model invocation pipeline

- Objective: prevent execution paths that bypass policy metadata checks.
- Implementation:
  - Introduce a pre-execution policy guard in orchestrator/model call path.
  - Ensure all model adapters receive validated policy context.
  - Add structured log events (`policy_validation_passed`, `policy_validation_failed`) with correlation IDs.
- Exception handling:
  - Raise domain-specific exceptions (`PolicyContractViolationError`, `PolicyRoutingDeniedError`) and map to consistent HTTP error envelope.
- Acceptance criteria:
  - All model invocations in bridge/orchestrator paths pass through policy guard.
  - No direct adapter call can bypass policy guard in production path.

### PSC-03 — Fail-closed routing for personal-data-possible steps

- Objective: enforce on-prem routing or fail closed.
- Implementation:
  - Add deterministic routing rule: `personal_data_possible` requires on-prem path.
  - If on-prem unavailable, return blocked state with actionable remediation.
  - Record denial reason and operator action hint.
- User-facing failure message requirements:
  - Plain language and action-oriented.
  - Include what failed, why blocked, and what to do next.
  - Example action hints: "retry after on-prem model is healthy", "contact platform admin", "run policy-approved scrubbed fallback only if allowed".
- Acceptance criteria:
  - External routing for `personal_data_possible` is impossible unless explicit policy exception is enabled and audited.
  - Failure response includes actionable next-step hints.

### PSC-04 — Persist policy/routing audit evidence for each model step

- Objective: make routing and privacy-policy decisions audit-ready.
- Implementation:
  - Extend audit event payload schema with required fields:
    - `sensitivity_class`
    - `policy_rule_id`
    - `decision_reason`
    - `selected_inference_location`
    - `fallback_reason_code` (when applicable)
  - Ensure events are emitted for success and deny paths.
  - Add typed serialization helpers and unit tests.
- Acceptance criteria:
  - Every model step has a corresponding evidence event.
  - Missing policy metadata in persisted event is treated as test failure.

### PSC-05 — Standardize workflow exception taxonomy and API error mapping

- Objective: production-grade consistency for failures.
- Implementation:
  - Create explicit exception classes for policy, routing, dependency-health, timeout, and retry-exhaustion cases.
  - Map exceptions to stable error codes and actionable user messages.
  - Ensure logs contain stack traces only in internal logs, not client payloads.
- Best-practice requirements:
  - Type hints on all public functions.
  - Docstrings for all exception classes and handlers.
  - Preserve existing error envelope contract.
- Acceptance criteria:
  - Error payload includes machine code, user message, action points, and correlation ID.
  - Internal logs remain detailed; API responses remain safe.

### PSC-06 — Add bridge and model-step conformance tests

- Objective: make policy contract and routing behavior release-gated.
- Test scope:
  - Unit tests for contract validators and routing policy decisions.
  - Integration tests for denied external routing when sensitivity is personal-data-possible.
  - API tests for structured error envelope and actionable action points.
  - Regression tests for bridge runtime topology strict-mode behavior.
- Acceptance criteria:
  - Tests fail when required policy metadata is missing.
  - Tests fail when fail-closed routing is not enforced.
  - Coverage threshold remains at or above current gate.

### AIUC-1 Traceability Matrix (Execution Ownership)

| AIUC-1 ID | Primary Ticket(s) | Verification Evidence |
| --- | --- | --- |
| A001 | PSC-01, PSC-02, PSC-04, PSC-08 | Policy contract validator tests, audit payload assertions, retention-class checks |
| A002 | PSC-01, PSC-04, PSC-05, PSC-07 | Output-policy decision fields in events, API error envelope tests, UI failure guidance checks |
| A003 | PSC-01, PSC-02, PSC-03 | Step-contract enforcement tests, denied unauthorized route tests |
| A004 | PSC-06, PSC-10 | IP/trade-secret deny-path test cases in conformance suite and release checklist evidence |
| A005 | PSC-03, PSC-04, PSC-06 | Cross-customer isolation tests and deny-event audit records |
| A006 | PSC-02, PSC-03, PSC-05, PSC-06, PSC-08 | Leakage deny-path tests, redaction/logging tests, retention/redaction controls |
| A007 | PSC-05, PSC-06, PSC-07, PSC-10 | IP-risk error mapping tests, HITL-trigger checks, operator runbook mappings |

### OWASP Chapter A Execution Crosswalk

| OWASP Chapter A control theme | Primary Ticket(s) | Verification Evidence |
| --- | --- | --- |
| Input data handling and governance | PSC-01, PSC-02, PSC-04, PSC-08 | Policy metadata contract tests, audit evidence assertions, retention-class checks |
| Output rights and usage controls | PSC-04, PSC-05, PSC-07 | Output decision metadata checks, error-envelope tests, UX guidance checks |
| Context-aware access boundaries | PSC-01, PSC-02, PSC-03 | Policy-guard and route-deny tests with role/context inputs |
| Trade-secret and confidential-data protection | PSC-06, PSC-10 | Deny-path conformance tests and release checklist evidence |
| Tenant/customer isolation | PSC-03, PSC-04, PSC-06 | Context-mixing deny tests and immutable violation evidence |
| PII leakage prevention in outputs/logs | PSC-02, PSC-05, PSC-06, PSC-08 | Leakage/redaction tests and persistence guard checks |
| Output IP and copyright/trademark safeguards | PSC-05, PSC-06, PSC-07, PSC-10 | IP-risk failure mapping tests and HITL escalation evidence |

### PSC-07 — Add frontend failure UX for policy/routing errors (existing style)

- Objective: user-visible failures must be understandable and actionable.
- Implementation:
  - Map backend error codes to existing UI components and message styles.
  - Preserve current visual language and interaction patterns.
  - Display retry guidance and escalation action points near bridge run actions.
- Acceptance criteria:
  - Users see clear failure reason and next action without opening developer tools.
  - UI style stays consistent with existing pages and components.

### PSC-08 — Implement observability retention-class split

- Objective: separate long-retention audit evidence from short-lived operational traces.
- Implementation:
  - Introduce explicit retention class tagging and storage policy boundaries.
  - Restrict access to `debug_trace` class by elevated roles only.
  - Add retention-policy configuration docs and defaults.
- Acceptance criteria:
  - Evidence and debug trace classes can be queried independently.
  - Retention and role controls are testable.

### PSC-09 — Add env-example conformance check in CI

- Objective: prevent unsafe defaults and drift between settings and examples.
- Implementation:
  - Add a test/check that compares required settings keys against env example files.
  - Validate placeholder-only policy for secrets/credentials.
- Acceptance criteria:
  - CI fails when env example misses required keys or includes non-placeholder secret values.

### PSC-10 — Release readiness checklist and operator runbook update

- Objective: production-grade handoff and operations readiness.
- Implementation:
  - Add release checklist for policy contract, routing behavior, topology proof, and test gates.
  - Update troubleshooting runbook with failure codes and action points.
- Acceptance criteria:
  - Runbook includes explicit operator actions for all policy/routing failure classes.
  - Release checklist is referenced by QA sign-off.

## Proposed Build Sequence

1. PSC-01 and PSC-02
2. PSC-03 and PSC-04
3. PSC-05 and PSC-06
4. PSC-07 and PSC-08
5. PSC-09 and PSC-10

## Definition of Done (for this handoff)

- Contract-first policy enforcement implemented in backend model paths.
- Fail-closed routing for personal-data-possible requests enforced and audited.
- Error handling is typed, logged, and user-actionable.
- Tests cover positive and negative paths and pass in `py313_venv`.
- Frontend failure messaging uses existing UI style and includes action points.
- Build documentation is updated with deployment and troubleshooting guidance.
- AIUC-1 A001-A007 mapping is present in tickets and validated by QA trace evidence.
- OWASP Chapter A to AIUC-1 mapping is present in build tickets and validated by QA trace evidence.

## Execution Sequence Reference

For file-level targets and execution order of PSC-01 to PSC-03, see:

- `project-context/2.build/phase1_privacy_step_contract_execution_sequence.md`
