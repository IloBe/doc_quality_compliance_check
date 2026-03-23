# Backend: Phase 0 CrewAI Orchestration Definition of Done (DoD)

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2026-3-22  
**Author persona:** `@backend-eng`  
**AAMAD phase:** 2.build  

---

## Scope

Phase 0 introduces CrewAI safely via a hybrid architecture:

- keep existing single-agent wrapper for simple/latency-sensitive tasks,
- add one flagship CrewAI workflow for complex multi-step orchestration,
- keep tool/data access inside the existing backend execution/skills layer,
- use a provider adapter interface so workflow logic is vendor-neutral,
- preserve auditability, reliability, and rollback safety.

This fits the current codebase because the existing FastAPI services already provide the deterministic business and tool layer that the orchestrator can call without large rewrites.

**Required service split:**

- `services/orchestrator/flows/` contains `DocumentReviewFlow` (owns orchestration logic, routing, state management, timeout enforcement).
- `services/orchestrator/crews/` contains crew builders and agent definitions (execute multi-step workflows).
- `services/orchestrator/service.py` is a thin wrapper that instantiates Flow and delegates all logic.
- Existing backend services remain the execution / skills API for parsing, DB writes, exports, and policy enforcement.
- Model access is routed through adapters (Anthropic first; Nemotron scaffolded as provider target).

**Flow Pattern (CrewAI Best Practice):**

Adopts the idiomatic CrewAI Flow pattern to separate orchestration concerns:

- **DocumentReviewFlow** (master orchestrator):
  - Resolves routing mode (single-agent vs crew) with kill-switch and feature flags
  - Manages workflow state (run_id, trace_id, correlations)
  - Enforces global timeout via asyncio.wait_for()
  - Logs routing decisions and completion events
  - Runs a dedicated post-crew model validator stage with structured output and audit events
  - Dispatches to execution paths
  - Returns structured WorkflowRunResponse

- **OrchestratorService** (HTTP entry point):
  - Thin wrapper for HTTP requests
  - Instantiates DocumentReviewFlow
  - Delegates to Flow.execute_workflow()
  - Returns response

- **Crew** (reusable team skill):
  - Executes 5-agent workflow (Intake → Evidence → Analysis → Synthesis → Verification)
  - Called from Flow._crew_path() in thread-pool executor
  - Agents access backend only via Skills API tools

This pattern enables future extensibility (multi-crew orchestration, event-driven workflows, state machines) without changing Crew definitions.

**Validator hardening requirement:**

- [x] Deterministic task guardrails and structured outputs are enforced inside the Crew builder.
- [x] A Flow-level post-crew model validator stage executes after `crew.kickoff()`.
- [x] Validator prompts are versioned as files, not embedded inline in workflow code.
- [x] Validator results are logged as audit events with provider/model/prompt metadata.
- [x] Validator failures caused by invalid provider output degrade gracefully via skip semantics rather than crashing the workflow.

---

## Flagship workflow (must-have)

- [ ] Exactly one production workflow implemented: **Generate Audit Package**.
- [ ] Workflow includes at minimum:
  - intake + scope normalization,
  - evidence collection,
  - compliance analysis,
  - report synthesis,
  - verifier gate.
- [ ] Workflow is fully traceable through `trace_id`/`correlation_id`.

---

## Runtime safety limits (hard limits)

- [ ] `max_steps` configured and enforced.
- [ ] `max_retries_per_step` configured and enforced.
- [ ] `max_token_budget_per_run` configured and enforced.
- [ ] `step_timeout_seconds` configured and enforced for every step.
- [ ] `global_run_timeout_seconds` configured and enforced.
- [ ] Exceeded limits fail fast with explicit run status and reason code.

---

## Observability and auditability

- [ ] Step-level events are persisted to PostgreSQL audit model (`audit_events`).
- [ ] Each event contains at least:
  - `run_id`, `trace_id`, `workflow_id`, `step_id`, `attempt`,
  - `agent_id`, `tool_name` (if used), `status`, `started_at`, `ended_at`,
  - token/cost metadata where available,
  - error category + message on failure.
- [ ] Replay links are available for every step:
  - prompt template/version,
  - tool inputs/outputs,
  - redaction metadata,
  - output artifact references.
- [ ] Sensitive content is redacted per policy before persistence.

---

## Determinism and quality gates

- [ ] Every step output is validated against a JSON schema.
- [ ] Invalid schema output triggers bounded retry and then deterministic failure state.
- [ ] Provider adapters expose structured-output support explicitly (`json_schema` capability or equivalent repair path).
- [ ] A **Verifier Agent** checks:
  - citation/evidence presence,
  - schema conformance,
  - no hallucinated evidence markers.
- [ ] Run can be marked `successful` only after verifier pass.

---

## Feature-flagged routing and rollback

- [ ] Task router supports immediate routing modes:
  - `single_agent_wrapper`
  - `crewai_workflow`
- [ ] Feature flags support tenant-level and user-level targeting.
- [ ] Kill switch can route all traffic back to single-agent path without redeploy.
- [ ] Routing decision is logged in audit events for each run.

---

## Concrete migration plan (minimal disruption)

### Step 1 — Stabilize executor interface

- [ ] Current agent executor is exposed via a stable interface (`execute_task(...)`) with:
  - prompt/template resolution,
  - model selection,
  - tool sandboxing,
  - guardrails/redaction.

### Step 2 — Add CrewAI orchestrator

- [ ] Introduce orchestrator service running one CrewAI flow (`generate_audit_package`).
- [ ] Orchestrator calls existing executor via adapter (no duplicate agent logic).
- [ ] Orchestrator service exposes at minimum:
  - `GET /health`
  - `POST /workflows/run`
- [ ] Orchestrator is runnable locally through one documented command (`uv run` or container entrypoint).
- [ ] `services/orchestrator/pyproject.toml` (or equivalent dependency manifest) includes `crewai`.
- [ ] `services/orchestrator/Dockerfile` exists for isolated runtime packaging.

### Step 2a — Add provider adapter layer

- [ ] Define internal adapter contract with capabilities:
  - `generate(messages, options)` returning content + schema/tool metadata,
  - optional `stream(messages, options)`,
  - support flags for `tool_calls`, `json_schema`, `streaming`.
- [ ] Implement `AnthropicAdapter` as the first production adapter.
- [ ] Scaffold `NemotronAdapter` behind the same contract.
- [ ] Contract tests verify adapter behavior without requiring full production Nemotron rollout.

### Step 3 — Add router

- [ ] Router rules: `{simple -> wrapper, complex -> CrewAI flow}`.
- [ ] Complexity signals include task type, evidence/document count, and requested depth.

### Step 4 — Persist runs/events

- [ ] Persist run and step lifecycle to `audit_events` with deterministic IDs.
- [ ] Store run summary projection for UI (`run_id`, `status`, durations, outputs).
- [ ] Persist routing mode, adapter id, provider/model id, and tool-call metadata for every run.

### Step 4a — Enforce execution boundary

- [ ] All CrewAI tool access goes through backend services / Skills API.
- [ ] Agents do not open direct DB connections or bypass policy enforcement.
- [ ] Allowlisted tools are enforced per workflow/agent role.

### Step 5 — Expand only on evidence

- [ ] Add additional CrewAI workflows only after measured wins on quality/reliability/cost.
- [ ] Expansion criteria documented with baseline vs post-rollout metrics.

---

## Acceptance metrics for Phase 0 sign-off

- [ ] ≥ 95% successful completion on benchmarked flagship workflow set.
- [ ] 100% runs have traceable step-level audit events.
- [ ] 100% successful runs pass verifier gate.
- [ ] Kill-switch rollback tested in staging and documented.
- [ ] No increase in P0 latency path for simple wrapper-routed tasks.

---

## Out of Scope (Phase 0)

- Multiple CrewAI workflows in production
- Autonomous tool-discovery/planning beyond defined flow
- Federated analytics over archived runs

---

## Audit

```Python
persona=backend-eng
action=define-phase0-crewai-orchestration-dod
timestamp=2026-3-22
adapter=AAMAD-vscode
artifact=project-context/2.build/phase0_crewAI_orchestration_definition_of_done.md
version=0.1.0
status=complete
```
