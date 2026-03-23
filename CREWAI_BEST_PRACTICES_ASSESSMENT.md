# CrewAI Best Practices Assessment

**Product:** Document Quality & Compliance Check System  
**Date:** 2026-03-22  
**Evaluator:** @backend-eng  
**Question:** Does the implemented CrewAI concept fit CrewAI best practices?

---

## Executive Summary

**Current Status:** ⚠️ **PARTIAL ALIGNMENT** — The implementation handles the operational/plumbing correctly but **lacks a critical architectural layer**. 

The code implements a **hybrid router** (single-agent wrapper + Crew) which is correct, but it **does not use CrewAI Flow**, which is the best-practice orchestration pattern for multi-step business logic.

**Recommendation:** Refactor `OrchestratorService` to use CrewAI `Flow` instead of direct `Crew.kickoff()`, moving routing logic and state management into a proper Flow pattern.

---

## CrewAI Best Practices Reference

From CrewAI documentation and patterns:

| Concern | Best Practice | Your Usage |
|---------|---|---|
| **End-to-end process** | Use Flow to define process, state, business logic | ❌ Missing: direct Crew.kickoff() |
| **Triggers & responses** | Flow manages webhooks, events, schedules | ⚠️ Partial: manual HTTP routing in OrchestratorService |
| **Orchestrate crews/steps** | Flow orchestrates multiple Crews or Python steps in sequence | ❌ Missing: single Crew only, no multi-crew orchestration |
| **Complex tasks** | Crew handles research, writing, planning, reasoning | ✅ Present: five-agent crew in `generate_audit_package` |
| **Agent collaboration** | Agents reason and decide which tools to call | ✅ Present: agent decision-making in crew tasks |
| **Encapsulated skill** | Crew is reusable "team skill" called by Flow | ⚠️ Partial: crew is reusable but not called from Flow |
| **Typical pattern** | Flow → Crew → data access | ⚠️ Modified: Service → (Crew OR Scaffold) → Skills API |

---

## Current Implementation Structure

```
FastAPI HTTP request (/workflows/run)
    ↓
OrchestratorService.run_workflow(WorkflowRunRequest)
    ├─ _resolve_routing_mode()  ← [routing logic here]
    ├─ Log routing decision → audit_events
    ├─ Global timeout wrapper (asyncio.wait_for)
    │
    ├─ Branch A: Single-agent fallback (7 steps, sequential)
    │   ├ Normalize input
    │   ├ Backend health check
    │   ├ Document lookup
    │   ├ Extract text
    │   ├ Model summary
    │   ├ Write finding
    │   └ Log event
    │
    └─ Branch B: CrewAI path (if routing_mode == "crewai_workflow")
        └─ Crew.kickoff() in thread executor
            ├ Agent 1: Intake Specialist
            ├ Agent 2: Evidence Collector
            ├ Agent 3: Compliance Analyst
            ├ Agent 4: Report Synthesizer
            └ Agent 5: Quality Verifier
            
        ↓ [crew output]
        
        ├─ Parse output (check for "VERIFIED: PASS")
        ├─ Log completion event → audit_events
        └─ Return WorkflowRunResponse
```

---

## Analysis Against Best Practices

### ✅ What You're Doing Right

1. **Hybrid Architecture (Fallback)**
   - Single-agent wrapper for simple/latency-sensitive tasks ✓
   - CrewAI for complex multi-step workflows ✓
   - Feature-flagged routing with kill-switch ✓
   - Matches the "Application backend" pattern

2. **Skills API Boundary**
   - No agent direct database access ✓
   - All agents call backend via HTTP tools ✓
   - Follows best practice of keeping agents isolated from system access

3. **Audit Trail**
   - Routing decision logged ✓
   - Workflow completion logged ✓
   - Trace ID / correlation ID propagation ✓
   - Step events captured for single-agent path ✓

4. **Safety Limits**
   - Global timeout enforced via `asyncio.wait_for()` ✓
   - Per-agent retries via `max_iter` ✓
   - Matches CrewAI DoD requirements

5. **Agent Reasoning**
   - Five specialized agents in crew ✓
   - Each agent has role, goal, backstory ✓
   - Agents collaborate via sequential task execution ✓

### ❌ What's Missing (Best Practice Gap)

1. **No CrewAI Flow Pattern**
   
   **What you're doing:**
   ```python
   async def run_workflow(self, request: WorkflowRunRequest):
       # routing logic here
       crew = build_generate_audit_package_crew(...)
       result = crew.kickoff(inputs=...)  # Direct Crew call
       return WorkflowRunResponse(...)
   ```
   
   **Best practice (CrewAI Flow):**
   ```python
   from crewai import Flow
   
   class DocumentReviewFlow(Flow):
       def __init__(self, ...):
           super().__init__()
           # Define state, routing logic
           
       def flow_logic(self, request: WorkflowRunRequest):
           # Step 1: Route (this is a Flow concern, not OrchestratorService)
           routing_mode = self._resolve_routing_mode(request)
           
           # Step 2: Execute (Crew is a "sub-task" of the Flow)
           if routing_mode == "crewai_workflow":
               result = self.generate_audit_package_crew.kickoff(...)
           else:
               result = self._scaffold_run(...)
           
           # Step 3: Persist result
           self.log_to_database(result)
           return result
   
   flow = DocumentReviewFlow()
   result = await flow.flow_logic(request)
   ```
   
   **Impact of gap:**
   - Routing logic lives in service code, not orchestration layer
   - State management (trace_id, run_id) is implicit, not explicit Flow state
   - No single source of truth for process definition
   - Harder to reason about the end-to-end workflow

2. **Single Crew Only (No Multi-Crew Orchestration)**
   
   **Current:** One flagship `generate_audit_package` crew
   
   **Best practice:** Flow could orchestrate multiple crews:
   ```python
   class DocumentReviewFlow(Flow):
       def flow_logic(self, request):
           # Crew 1: Extract & normalize
           result1 = self.extraction_crew.kickoff(...)
           
           # Crew 2: Analyze compliance
           result2 = self.analysis_crew.kickoff(
               context=result1.output
           )
           
           # Crew 3: Generate report
           result3 = self.reporting_crew.kickoff(
               context=result2.output
           )
           
           return result3
   ```
   
   **Impact of gap:**
   - Single-task workflows only
   - Complex multi-stage processes would require nested logic in service code
   - No clear way to reuse crew skills across different flows

3. **No Flow Triggers/Events**
   
   **Best practice:** Flow can respond to webhooks, schedules, events
   ```python
   class DocumentReviewFlow(Flow):
       @flow_trigger()
       async def on_document_uploaded(self, event):
           # Auto-trigger workflow on upload
           ...
   ```
   
   **Current:** Manual HTTP request only
   
   **Impact:** Event-driven workflows not supported

4. **State Not Managed by Flow**
   
   **Current:** run_id, trace_id created ad-hoc
   ```python
   run_id = str(uuid4())
   trace_id = request.trace_id or str(uuid4())
   ```
   
   **Best practice:** Flow maintains state
   ```python
   class DocumentReviewFlow(Flow):
       def __init__(self, run_id: str, trace_id: str):
           super().__init__()
           self.run_id = run_id  # Flow property
           self.trace_id = trace_id
   ```

### ⚠️ Partial Implementation Issues

1. **Routing Logic in Service (Should Be in Flow)**
   
   `_resolve_routing_mode()` is business logic (decide single-agent vs crew) that belongs in Flow orchestration, not service layer.
   
   **Current location:** `OrchestratorService._resolve_routing_mode()`  
   **Best location:** `DocumentReviewFlow._resolve_routing_mode()`

2. **Crew Not Encapsulated as Flow Sub-Task**
   
   The crew is built and executed directly:
   ```python
   crew = build_generate_audit_package_crew(...)
   result = crew.kickoff(...)
   ```
   
   **Best practice:** Crew is a method of the Flow:
   ```python
   class DocumentReviewFlow(Flow):
       def generate_audit_package(self):
           crew = build_generate_audit_package_crew(...)
           return crew.kickoff()
   ```

3. **Fallback Path Not in Flow (Ad-Hoc Implementation)**
   
   Single-agent scaffold has its own 7-step orchestration separate from crew.
   
   **Best practice:** Both paths would be orchestrated by Flow:
   ```python
   class DocumentReviewFlow(Flow):
       def execute(self):
           if self.routing_mode == "crew":
               return self.crew_path()
           else:
               return self.scaffold_path()
   ```

---

## Recommendations

### Priority 1: Adopt CrewAI Flow Pattern

**Goal:** Refactor `OrchestratorService` to use CrewAI Flow as the orchestration layer.

**Steps:**

1. **Create `DocumentReviewFlow(Flow)` in `crews/`:**
   ```python
   # crews/document_review_flow.py
   from crewai import Flow
   
   class DocumentReviewFlow(Flow):
       def __init__(
           self, 
           backend_base_url: str,
           settings: OrchestratorSettings
       ):
           super().__init__()
           self.backend_base_url = backend_base_url
           self.settings = settings
           self.skills_api = SkillsApiClient(backend_base_url)
       
       async def execute_workflow(
           self, 
           request: WorkflowRunRequest
       ) -> WorkflowRunResponse:
           # Flow now owns routing logic
           self.routing_mode = self._resolve_routing_mode(request)
           
           # Execute appropriate path
           if self.routing_mode == "crewai_workflow":
               return await self._crew_path(request)
           else:
               return await self._scaffold_path(request)
       
       def _resolve_routing_mode(self, request):
           # Move from OrchestratorService
           ...
   ```

2. **Move routing and dispatch logic into Flow:**
   - `_resolve_routing_mode()` → Flow method
   - `_run_crew_workflow()` → Flow method
   - `_run_scaffold_workflow()` → Flow method

3. **Keep OrchestratorService thin:**
   ```python
   class OrchestratorService:
       def __init__(self, settings: OrchestratorSettings):
           self.settings = settings
       
       async def run_workflow(self, request: WorkflowRunRequest):
           flow = DocumentReviewFlow(self.settings.backend_base_url, self.settings)
           return await flow.execute_workflow(request)
   ```

4. **Add Flow state management:**
   ```python
   class DocumentReviewFlow(Flow):
       def __init__(self, ...):
           super().__init__()
           self.run_id: str = ""
           self.trace_id: str = ""
       
       async def execute_workflow(self, request: WorkflowRunRequest):
           self.run_id = str(uuid4())
           self.trace_id = request.trace_id or str(uuid4())
           # ...
   ```

### Priority 2: Support Multi-Crew Workflows (Phase 1+)

**Goal:** Prepare architecture for orchestrating multiple specialized crews.

**Example (Phase 1+):**
```python
class DocumentReviewFlow(Flow):
    def execute_workflow(self, request):
        # Extract crew
        extraction_result = self.extraction_crew.kickoff(...)
        
        # Analysis crew (uses extraction output)
        analysis_result = self.analysis_crew.kickoff(
            context=extraction_result.output
        )
        
        # Reporting crew
        final_result = self.reporting_crew.kickoff(
            context=analysis_result.output
        )
        
        return final_result
```

### Priority 3: Document Flow Pattern in SAD/Backend

**Goal:** Update architecture documentation to reflect Flow usage.

**Updates:**
- SAD Section 3: Add "Orchestration Pattern" subsection describing Flow
- backend.md Section 2: Update application structure diagram to show Flow layer
- CrewAI DoD: Reference Flow state management (run_id, trace_id)

---

## Impact Assessment

### Adoption Impact

| Dimension | Current | Post-Refactor | Impact |
|-----------|---------|--------------|--------|
| **Architectural clarity** | Service acts as router | Flow owns orchestration | +More explicit business logic |
| **Routing logic** | OrchestratorService | DocumentReviewFlow | Cleaner separation |
| **State management** | Ad-hoc (service-level) | Flow properties | Easier tracing & debugging |
| **Multi-crew support** | N/A (single crew) | Possible (Phase 1+) | Future-proof |
| **Testability** | Service-level tests | Flow unit tests | Easier mocking |
| **Code duplication** | Separate paths (crew/scaffold) | Unified Flow | Less code |

### Risk Assessment

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Refactoring breaks existing crew | **LOW** | Crew logic unchanged; only orchestration layer moves |
| Flow unfamiliar to team | **MEDIUM** | CrewAI Flow is well-documented; small learning curve |
| Performance regression | **LOW** | Flow is wrapper; no performance impact |

---

## Summary

**Current Status:** You've built a solid hybrid router with good safety limits, audit trails, and Skills API boundary enforcement. ✅

**Gap:** The orchestration pattern doesn't use CrewAI `Flow`, which is the idiomatic way to structure multi-step workflows. Routing logic and state management live in the service layer instead of a proper Flow abstraction. ⚠️

**Path Forward:**
1. ✅ Keep: hybrid architecture (single-agent + crew), safety limits, audit trails
2. ✅ Keep: Skills API boundary, no direct DB access
3. ❌ Refactor: Extract routing logic and state management into `DocumentReviewFlow(Flow)`
4. 🔮 Plan: Multi-crew orchestration for Phase 1+ (enabled by Flow pattern)

**Timeline:** Low urgency (Phase 1+) since current architecture is functionally correct. Refactoring is about architectural clarity and future extensibility, not bug fixes.

---

## References

- CrewAI Documentation: https://docs.crewai.com/concepts/flows
- Your SAD Section 5: Architectural Decisions
- Your backend.md Section 2: FastAPI Application Structure
- Your CrewAI DoD: Phase 0 runtime controls

