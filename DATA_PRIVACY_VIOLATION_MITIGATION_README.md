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
| R8 | Telemetry over-retention of sensitive artifacts | Proposal only | Operational controls documented in SAD; no full enforcement in telemetry retention layer yet | Implement tiered retention policy with redaction-at-write and legal-hold override tests |
| R9 | Secrets/token leakage in prompts, logs, or events | Proposal only | Baseline secret-handling architecture documented; no dedicated bridge secret-scan gate yet | Add pre-persist secret scanner and blocklist enforcement for prompt/output/event payloads |
| R10 | Human-process gap for unresolved privacy incidents | Proposal only | HITL gate exists for bridge decisioning | Add mandatory next-task assignment SLA checks with overdue escalation notifications |

### Summary

Implemented now:
- Detection and mitigation proposals for all active bridge privacy-risk signals (R1-R7).
- Runtime enforcement for local-only model execution and policy-blocking behavior.
- Audit-grade finding/event persistence and mandatory review workflow integration.

Remaining proposal-only items:
- R8-R10 include concrete mitigation proposals and are tracked as prioritized follow-up controls.

## Lower-priority follow-up topics

1. Add policy-bound action links per mitigation proposal to launch guided remediation workflows.
2. Add mandatory pre-inference redaction stage for sensitive classes.
3. Add retention-policy enforcement tests for prompt/output minimization in telemetry and audit stores.
