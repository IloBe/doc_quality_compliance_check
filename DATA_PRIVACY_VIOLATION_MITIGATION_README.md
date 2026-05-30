# Data Privacy Violation Mitigation

## General Purpose

This document is the general-purpose implementation and governance baseline for data privacy violation mitigation across backend workflows.

Priority ordering in this document:
1. Priority 1 (implemented now): software-level privacy guardrails available on real workflow paths.
2. Lower-priority follow-up topics: stricter runtime isolation, policy automation, and UI workflow acceleration.

## Priority 1: Cross-workflow software mitigation (implemented)

### Objective

Provide deterministic, auditable privacy-violation detection and mitigation artifacts in real application workflows, not only in bridge-specific responses.

### Real workflow availability

Implemented and active in these backend workflow paths:
- Bridge execution now uses locally governed Ollama-based models as the default operational path for privacy-sensitive workflows, with active model selection and generation parameters managed through the model-policy admin surface for privileged roles (app_admin, qm_lead, riskmanager).
- Bridge run workflow (`POST /api/v1/bridge/run/eu-ai-act`): privacy violation detection, mitigation proposals, sandbox-step metadata, and rejection recommendation enforcement.
- Skills extraction workflow (`POST /api/v1/skills/extract_text` with `store_document=true`): automatic privacy finding and privacy audit event persistence when violation signals are detected.
- Documents analysis workflow (`POST /api/v1/documents/analyze` and file upload persistence path): same automatic privacy finding and privacy audit event persistence through centralized document persistence guardrails.

### Software design quality principles applied

- Single responsibility: privacy detection and mitigation heuristics remain in dedicated service logic.
- Reuse over duplication: document-persistence guardrail hook applies uniformly across relevant workflows.
- Deterministic behavior: transparent signal matching and thresholding for auditable decisions.
- Idempotent evidence persistence intent: findings are not duplicated for the same document/finding type path.
- Traceability: findings and audit events are persisted with evidence payload including signals and proposals.

### Priority 1 implementation details

#### A) Bridge detection and recommendation enforcement

Bridge run performs deterministic privacy-violation assessment and now enforces non-approval when a privacy violation is detected.

The bridge model path has shifted from remote external GenAI inference to locally governed Ollama execution for the privacy-sensitive run path; model priority and generation parameters are maintained in the model-policy service and administered by privileged application roles.

Detection includes explicit indicators such as:
- personal/medical context signals,
- direct identifier signals,
- explicit GDPR/security violation claims,
- LLM/GenAI processing-risk claims,
- repeated failed mitigation signals.

#### B) Step-by-step local sandbox model plan

Bridge run attaches per-step sandbox metadata for:
- Inspection Agent,
- Compliance Agent,
- Research Agent,
- Quality Gate.

Each step includes:
- sandbox id,
- model provider/model id,
- sandbox mode,
- egress policy,
- local-processing indicator.

#### C) Automatic artifacts on non-bridge workflows

When documents are persisted through skills extraction or documents analysis paths and privacy-violation signals are detected:
- a high-severity `data_privacy_violation` finding is stored,
- a `document.privacy_violation.detected` audit event is stored,
- evidence payload includes violation summary, matched signals, and mitigation proposals.

#### D) Mitigation proposals in bridge UI

If a violation is detected, the Compliance Agent card in bridge UI renders the mitigation proposal list.

## Evidence and persistence coverage

Current persistence footprint:
- bridge run events with sandbox-step metadata,
- bridge privacy-violation audit event and bridge privacy finding,
- cross-workflow privacy finding on persisted document paths,
- cross-workflow privacy audit event on persisted document paths.

## Validation for Priority 1

Validation is executed with `py313_venv` and focused tests for real paths:
- bridge run API tests including real PDF doc07 scenario,
- skills API test for stored extract path privacy artifacts,
- documents analyze API test for privacy artifacts.

Expected result: privacy-violation behavior is consistently available in bridge and other relevant backend workflows.

## Current limitations

- Deterministic heuristic detection should be complemented by richer classifier stages.
- Bridge runtime now enforces strict local-only sandbox execution and deny-external egress policy; deployment still requires host/container hardening operations (image provenance, runtime patching, and node security baselines).
- UI currently exposes proposal text only; actionable links/workflow automation are pending.

## Runtime topology fallback control

### Purpose of BRIDGE_RUNTIME_TOPOLOGY_ALLOW_METADATA_FALLBACK

BRIDGE_RUNTIME_TOPOLOGY_ALLOW_METADATA_FALLBACK controls what happens when runtime container inspection fails while BRIDGE_RUNTIME_TOPOLOGY_SOURCE is set to docker_inspect.

The flag is a safety valve for environments that are still onboarding dedicated per-agent bridge containers.

- false: strict proof mode. If docker inspect cannot verify an agent container, bridge runtime readiness is blocked.
- true: transitional mode. If docker inspect fails, backend uses metadata-based proof for the affected agent and continues runtime readiness evaluation without blocking solely on probe failure.

### Why this flag exists

Different environments have different maturity levels:

- Local developer machine: often no dedicated bridge-agent containers are running yet.
- Integration/staging during rollout: partial topology instrumentation may exist.
- Production: container topology proof is expected to be complete and continuously verifiable.

Without this flag, developer and transitional environments would hard-fail even when all other guardrails (local model policy, deny-external egress, HITL review path, audit evidence) are correctly configured.

### Behavioral matrix

| BRIDGE_RUNTIME_TOPOLOGY_SOURCE | BRIDGE_RUNTIME_TOPOLOGY_ALLOW_METADATA_FALLBACK | Expected behavior |
|---|---|---|
| metadata | false or true | Uses metadata proof directly. No docker inspect probing is attempted. |
| docker_inspect | false | Strict mode: probe failure blocks readiness and bridge run execution. |
| docker_inspect | true | Transitional mode: probe failure falls back to metadata proof for that agent; readiness can still pass if remaining checks pass. |

### Security and governance implications

- Strict mode (fallback false) provides stronger runtime attestation confidence because container state must be observed directly.
- Transitional mode (fallback true) reduces attestation strength but keeps workflows operational while topology deployment catches up.
- In transitional mode, fallback events are still logged (warning level) for operational visibility.

### Recommended usage by environment

- Development/local: true (to avoid unnecessary hard blocks while bootstrapping containers).
- Integration/staging: true only during rollout windows, then switch to false.
- Production: false, combined with health checks and container orchestration monitoring.

### Related settings

- BRIDGE_RUNTIME_TOPOLOGY_SOURCE
- BRIDGE_TOPOLOGY_PROOF_REQUIRED
- BRIDGE_CONTAINER_RUNTIME_BIN
- BRIDGE_AGENT_CONTAINER_INSPECTION
- BRIDGE_AGENT_CONTAINER_COMPLIANCE
- BRIDGE_AGENT_CONTAINER_RESEARCH
- BRIDGE_AGENT_CONTAINER_QUALITY_GATE

### Bridge runtime .env reference checklist

Use this table as the single copy/paste reference for bridge runtime topology and attestation behavior.

| Variable | Typical local value | Typical production value | Description |
|---|---|---|---|
| BRIDGE_TOPOLOGY_PROOF_REQUIRED | true | true | Enables bridge topology proof as a required readiness control before runs are allowed. |
| BRIDGE_RUNTIME_TOPOLOGY_SOURCE | docker_inspect | docker_inspect | Selects primary topology evidence source (`docker_inspect` or `metadata`). |
| BRIDGE_RUNTIME_TOPOLOGY_ALLOW_METADATA_FALLBACK | true | false | Allows metadata fallback if docker inspect probing fails. Keep false for strict attestation in production. |
| BRIDGE_CONTAINER_RUNTIME_BIN | docker | docker | Container runtime binary used for inspect probes. |
| BRIDGE_ORCHESTRATOR_NAME | bridge-workflow-orchestrator | bridge-workflow-orchestrator | Logical orchestrator identity included in runtime proof payloads. |
| BRIDGE_ORCHESTRATOR_MODE | containerized-sandbox | containerized-sandbox | Declares orchestration mode for policy/readiness reporting. |
| BRIDGE_AGENT_NETWORK_ID | bridge-sandbox-network | bridge-sandbox-network | Expected network identifier for bridge agent sandbox containers. |
| BRIDGE_AGENT_CONTAINER_INSPECTION | bridge-agent-inspection | bridge-agent-inspection | Container name used for inspection-agent runtime proof. |
| BRIDGE_AGENT_CONTAINER_COMPLIANCE | bridge-agent-compliance | bridge-agent-compliance | Container name used for compliance-agent runtime proof. |
| BRIDGE_AGENT_CONTAINER_RESEARCH | bridge-agent-research | bridge-agent-research | Container name used for research-agent runtime proof. |
| BRIDGE_AGENT_CONTAINER_QUALITY_GATE | bridge-agent-quality-gate | bridge-agent-quality-gate | Container name used for quality-gate runtime proof. |

Recommended local developer baseline:

1. Keep BRIDGE_RUNTIME_TOPOLOGY_SOURCE=docker_inspect.
2. Set BRIDGE_RUNTIME_TOPOLOGY_ALLOW_METADATA_FALLBACK=true when dedicated per-agent containers are not yet deployed.
3. Switch BRIDGE_RUNTIME_TOPOLOGY_ALLOW_METADATA_FALLBACK=false before production readiness verification.

## Privacy Risk Register and Mitigation Coverage

The following table tracks all listed bridge privacy-risk signals, implemented mitigations, and proposal-only mitigations for remaining gaps.

| Risk ID | Risk Signal / Scenario | Status | Implemented Mitigations | Proposal for Remainder Risks |
|---------|------------------------|--------|--------------------------|------------------------------|
| R1 | External model transfer of potentially personal prompt/output data | Implemented (primary) | Local-only bridge sandbox plan (`processed_locally=true`), deny-external egress, runtime enforcement and rejection when violated | Add infrastructure-level egress firewall verification and signed attestation pipeline per deployment |
| R2 | Medical-context sensitive content exposure (`medical_context`) | Implemented (detection + proposals) | Deterministic signal detection and bridge rejection recommendation on violation | Add domain-specific PHI entity classifier and confidence scoring before inference |
| R3 | Direct identifier exposure (`direct_identifier`) | Implemented (detection + proposals) | Detection of direct identifier indicators and mitigation proposal generation | Add mandatory pre-inference redaction pipeline with test-gated release criteria |
| R4 | Explicit privacy/security violation statements (`privacy_violation_claim`) | Implemented (detection + auditability) | Violation findings persisted, audit events persisted, review gate required | Add automated CAPA ticket generation and tracking integration |
| R5 | LLM/GenAI processing risk claims (`genai_processing_claim`) | Implemented (detection + routing consequences) | Violation contributes to rejection recommendation, mitigation proposals produced | Add model I/O policy classifier to separate personal-data-possible vs scrubbed flows |
| R6 | Recurring incident signal (`failed_mitigation_repeat`) | Implemented (detection + HITL escalation proposal) | Mitigation proposal requires human approval workflow for repeated incidents | Add recurrence counter with severity escalation thresholds and mandatory riskmanager routing |
| R7 | Local model enforcement failure (`local_model_enforcement_failed`) | Implemented (hard fail) | Bridge run blocked by policy checks, explicit mitigation proposal attached | Add startup readiness monitor alarms and deployment rollback automation |
| R8 | Telemetry over-retention of sensitive artifacts | Partially implemented (retention tagging + redaction guard active, strict retention split pending) | Structured logging and safe client-error envelopes are implemented; audit/telemetry payloads are now tagged with persistence-time retention metadata (`__privacy_meta__.retention_class`) and redaction markers | Implement tiered retention policy with storage-level TTL partitioning and legal-hold override tests |
| R9 | Secrets/token leakage in prompts, logs, or events | Partially implemented (pre-persist guard active, broader policy enforcement pending) | Security-safe configuration baseline and placeholder-only env policy are enforced; API error payloads avoid internal stack details; persistence-time payload guard now redacts secret-like keys/values and trade-secret signal content at audit/telemetry boundaries | Add stricter allowlist/blocklist policy profiles per endpoint class and operator-managed redaction policy tuning |
| R10 | Human-process gap for unresolved privacy incidents | Partially implemented (HITL review gate active) | Mandatory bridge HITL approval/rejection workflow exists and is auditable | Add mandatory next-task assignment SLA checks with overdue escalation notifications |
| R11 | Output IP and copyright/trademark violation risk in generated artifacts (A007) | Partially implemented (bridge + report-generation + artifact-export + skills-response guards, escalation evidence) | Deterministic output IP-risk classification (`low`/`medium`/`high`), medium/high escalation metadata, finding persistence, `bridge.run.output_ip_risk.detected` audit event, report-generation fail-closed policy checks, artifact export-client fail-closed checks, and public Skills API response gating for extracted text | Extend from bridge/report/export/skills-response scope to any remaining server-side API response surfaces and add policy-bound ownership/usage checks |

### Summary

Implemented now:
- Local Ollama model usage is the default controlled inference path for privacy-sensitive bridge runs, replacing the earlier remote external-provider exposure pattern for this flow.
- Detection and mitigation proposals for all active bridge privacy-risk signals (R1-R7).
- Initial output IP-risk controls for A007: deterministic `low`/`medium`/`high` classification, medium/high HITL escalation metadata, auditable event evidence, report-generation fail-closed policy checks, artifact-export client fail-closed checks, and public Skills API response gating for extracted text.
- Contract-first policy enforcement for model-using bridge steps (step policy contract validation before execution and routing).
- Fail-closed routing enforcement for personal-data-possible flows with actionable deny reasons.
- Runtime self-check gate with strict or transitional topology proof behavior (`docker_inspect` + metadata fallback control).
- Audit-grade evidence for allow and deny paths including policy metadata and `fallback_reason_code` when applicable.
- Stable API error mapping (`error_code`, `reason`, `action_points`, `correlation_id`) and frontend failure guidance rendering.
- Mandatory bridge HITL review workflow with persisted decision evidence.

Remaining proposal-only items:
- R8 remains open for storage-tier retention enforcement (TTL/legal-hold mechanics), despite implemented retention metadata tagging and redaction-at-write guards.
- R9 remains open for policy-depth expansion (endpoint-specific guard profiles), though pre-persist redaction is now active in audit/telemetry persistence.
- R10 still requires operational SLA automation for follow-up assignment and overdue escalation.
- R11 still requires output-rights policy enforcement coverage in any remaining server-side API response surfaces and export paths.

## Backend implementation checklist (AIUC-1 and OWASP Chapter A)

Use this checklist as the operational closure tracker for backend engineering work. Keep this section updated in every privacy-control pull request.

Legend:
- [x] Implemented and verified
- [~] Partially implemented or in progress
- [ ] Not started

### Policy and governance artifacts

- [~] AIUC-PRIV-01 / A001: Maintain a versioned AI Input Data Policy artifact and persist policy_rule_id plus policy_version in allow/deny audit evidence.
- [~] AIUC-PRIV-02 / A002: Enforce AI Output Rights Policy (ownership, allowed usage, deletion, opt-out) in report/export and API response paths (report generation, artifact-export client paths, and Skills API extracted-text responses are now fail-closed; only narrower server-side response paths remain open).
- [~] AIUC-PRIV-03 / A003: Enforce contextual least-privilege checks (user role plus agent role plus purpose tag) for every model-using workflow step.

### Data leakage and IP protection

- [~] AIUC-PRIV-04 / A004: Add trade-secret and IP leakage classifiers with deny or redact controls at prompt, output, and telemetry boundaries (telemetry/audit redaction-at-write for trade-secret signals and secret-like values implemented; deny controls for all prompt/output surfaces still pending).
- [~] AIUC-PRIV-06 / A006: Enforce output leakage scanning before API return and before persistence for all sensitive response surfaces.
- [~] AIUC-PRIV-07 / A007: Add output IP-risk classification (low, medium, high) and mandatory HITL escalation for medium/high risk (implemented in bridge run, report-generation, artifact-export client paths, and Skills API extracted-text responses; pending extension to any remaining API response surfaces).

### Tenant isolation and access control

- [~] AIUC-PRIV-05 / A005: Enforce tenant/project isolation in retrieval, context assembly, traces, caches, and persistence; remove remaining default-tenant-only assumptions.
- [~] OWASP-A-PRIV-04: Add purpose-based authorization checks for sensitive trace/export access, beyond RBAC-only checks (implemented fail-closed purpose-tag checks for observability debug-trace retrieval, audit-trail debug-trace list/detail access, report/risk-template export endpoints, document detail extracted-text reads, and Skills extracted-text response surfaces; broader purpose enforcement across any remaining non-export sensitive surfaces is pending).
- [~] OWASP-A-PRIV-06: Add deny-by-default no-mixing tests for cross-customer context assembly and evidence persistence.

### Runtime guardrails and error handling

- [x] OWASP-A-PRIV-01: Enforce pre-execution policy checks in bridge run paths with auditable decision evidence.
- [x] OWASP-A-PRIV-02: Enforce fail-closed routing for personal-data-possible paths when compliant on-prem execution is unavailable.
- [x] OWASP-A-PRIV-07: Return stable user-safe deny responses with action points and correlation_id.

### Telemetry, secrets, and release conformance

- [~] OWASP-A-PRIV-03: Complete strict retention-class tagging and redaction-at-write enforcement across all telemetry and audit persistence paths (payload-level `__privacy_meta__` tagging and persistence-time redaction implemented; storage-tier retention policy/TTL split still pending).
- [~] OWASP-A-PRIV-05: Keep secret domains split for API auth, session signing, and recovery signing; add rotation workflow and auditable secret-governance events.
- [~] OWASP-A-PRIV-08: Keep py313_venv conformance suites green for routing, redaction, retention, RBAC, isolation, and secret-config hardening.

### Definition of done for each checklist item

For every item marked [x], include:
1. Backend code references (service and route level).
2. Automated test coverage reference (unit/integration/API).
3. Auditable evidence field names produced by runtime.
4. Clear deny-path behavior with stable error semantics where applicable.
5. README and QA matrix linkage updates when behavior changes.

## Lower-priority follow-up topics

1. Add policy-bound action links per mitigation proposal to launch guided remediation workflows.
2. Add mandatory pre-inference redaction stage for sensitive classes.
3. Add retention-policy enforcement tests for prompt/output minimization in telemetry and audit stores.

## Presentation proposal for bridge behaviour as mitigation concept

### Title

Bridge Workflow Privacy Risk Mitigations
From external GenAI exposure risk to contract-first fail-closed execution

### Executive message

The privacy posture of bridge runs has moved from provider/routing ambiguity toward deterministic, auditable enforcement:
- policy metadata is mandatory per model-using step,
- personal-data-possible routing is fail-closed,
- runtime readiness is a blocking gate,
- allow/deny decisions are traceable with actionable operator guidance.

### Slide 1: Baseline to Current State

Starting point:
- external model providers could appear in bridge execution paths,
- privacy metadata was not uniformly enforced as mandatory pre-execution contract,
- deny-path evidence and operator guidance were not fully standardized.

Current state:
- mandatory `StepPolicyContract` validation before execution and routing,
- fail-closed guardrails for personal-data-possible workloads,
- runtime self-check gate blocks unsafe runs,
- explicit policy evidence persistence for allow and deny outcomes,
- stable frontend/backend error contract with action points and correlation ID,
- full backend quality gate passing with PSC-focused tests.

### Slide 2: Main Privacy Risks (Top 3)

1. Egress traffic flow of sensitive data toward orchestrator/external model boundaries.
2. Application telemetry and workflow tracing over-retention/exposure risk.
3. Role-based access control and GDPR-process completion gaps.

### Slide 3: Topic 1 Risk Statement (start here)

Risk 1:
Potential transfer of personal-data-possible content to non-on-prem model execution paths.

Why critical:
- bridge uses multi-agent model steps,
- any routing bypass can create privacy and compliance exposure,
- weak attestability undermines audit confidence.

### Slide 4: Topic 1 Mitigation Architecture

1) Mandatory policy step contract
- each model-using step carries: sensitivity class, policy rule, decision reason, selected inference location.
- invalid/missing contract results in rejection.

2) Fail-closed routing
- `personal_data_possible` requires on-prem inference.
- external fallback denied unless explicitly controlled and scrubbed-fallback classified.

3) Runtime readiness gate
- bridge run blocked if runtime self-check fails.
- user receives clear remediation action points.

4) Deterministic model policy resolution
- active model policy resolved centrally,
- policy checks applied before bridge execution continues.

### Slide 5: CrewAI-Orchestrator and Agent Control Surface

Orchestrator-level controls:
- policy contract validation and fail-closed routing in orchestration service boundary,
- controls apply beyond HTTP route layer (non-bypass intent).

Agent/runtime controls:
- per-agent sandbox execution metadata,
- runtime topology proof (`docker_inspect` strict mode or transitional metadata fallback),
- deny-external egress policy checks in local-only mode.

Evidence controls:
- deny-path audit event includes reason/action points/policy contracts,
- allow-path audit events include runtime + policy evidence.

### Slide 6: Topic 1 User and Operator Experience

API contract:
- stable fields: `error_code`, `reason`, `action_points`, `correlation_id`.

Frontend behavior:
- bridge failure callouts map policy/routing/runtime reasons to actionable guidance,
- correlation ID surfaced for incident triage.

### Slide 7: Topic 1 Outcome Summary

Now prevented:
- personal-data-possible flow on non-on-prem route,
- uncontrolled external fallback for non-scrubbed workloads,
- bridge execution under failed runtime readiness.

Now provable:
- why a run was denied,
- which policy contract governed each step,
- whether fallback was selected (`fallback_reason_code` when applicable).

### Slide 8: Topic 2 Telemetry and Tracing Risk Mitigations

Implemented now:
- structured logs and trace/correlation linkage,
- safe client error payload filtering,
- architecture and DoD definitions for retention-class split.

Partially implemented / open:
- strict technical retention split and redaction-at-write for sensitive telemetry payloads remain follow-up items.

### Slide 9: Topic 3 RBAC and GDPR Workflow Mitigations

Implemented now:
- authenticated role-gated bridge paths,
- mandatory HITL bridge review evidence,
- auditable review actions and compliance workflow context.

Partially implemented / open:
- SLA automation for follow-up assignment and overdue escalation,
- further process hardening for unresolved privacy incidents.

### Slide 10: Architecture Conclusion

- Privacy controls shifted from narrative policy to runtime-enforced contracts.
- Bridge behavior is now fail-closed, policy-auditable, and operator-actionable.
- Remaining highest-value engineering backlog: telemetry retention/redaction, secret scanning gate, and process SLA automation.
