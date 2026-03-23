# -*- coding: utf-8 -*-
"""Document Review Flow: orchestrates routing, state, and business logic for document workflows.

This Flow implements the CrewAI best practice pattern:
  - Flow owns the end-to-end process, routing logic, state, and business logic
  - Crew is a reusable "team skill" called by the Flow
  - State (run_id, trace_id) is managed at the Flow level
  - Triggers, responses, and multi-crew orchestration can be added in future phases
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from importlib.util import find_spec
from pathlib import Path
from typing import Any
from typing import Literal
from uuid import uuid4

import structlog
import yaml
from pydantic import BaseModel, Field, ValidationError

from ..adapters import get_adapter
from ..config import OrchestratorSettings
from ..models import GenerateOptions, ModelMessage, WorkflowRunRequest, WorkflowRunResponse, WorkflowStepEvent
from ..runtime_limits import RuntimeLimitConfig, RuntimeLimitEnforcer
from ..skills_api import SkillsApiClient

logger = structlog.get_logger(__name__)

_GENERATE_AUDIT_PACKAGE = "generate_audit_package"
_TASKS_CONFIG_PATH = Path(__file__).resolve().parents[1] / "crews" / "config" / "tasks.yaml"
_PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"


class ModelValidatorReport(BaseModel):
    """Structured output returned by the post-crew validator stage."""

    decision: Literal["pass", "fail", "review"]
    summary: str
    issues: list[str] = Field(default_factory=list)
    checks: list[str] = Field(default_factory=list)


class ModelValidatorStageResult(BaseModel):
    """Execution receipt for the post-crew validator stage."""

    stage_status: Literal["completed", "skipped"]
    prompt_version: str
    report: ModelValidatorReport | None = None
    reason: str | None = None
    provider_id: str | None = None
    model_id: str | None = None


class DocumentReviewFlow:
    """Orchestrates document review workflows (single-agent or multi-agent CrewAI).

    Responsibilities:
    - Resolve routing mode based on configuration and request parameters
    - Manage workflow state (run_id, trace_id, correlations)
    - Orchestrate execution paths (crew or scaffold)
    - Log routing decisions and completion events
    - Apply global timeout enforcement
    - Return structured WorkflowRunResponse

    This is the idiomatic CrewAI Flow pattern: Flow owns orchestration logic,
    Crew is a sub-task called by the Flow.
    """

    def __init__(self, settings: OrchestratorSettings) -> None:
        self.settings = settings
        self.skills_api = SkillsApiClient(settings.backend_base_url)
        self.model_validator_config = self._load_model_validator_config()

        # Flow state (initialized per execute_workflow call)
        self.run_id: str = ""
        self.trace_id: str = ""
        self.routing_mode: Literal["single_agent_wrapper", "crewai_workflow"] = "single_agent_wrapper"
        self.runtime_enforcer: RuntimeLimitEnforcer | None = None

    @staticmethod
    def _load_model_validator_config() -> dict[str, Any]:
        """Load optional post-crew validator stage settings from YAML."""
        defaults: dict[str, Any] = {
            "enabled": True,
            "prompt_version": "model_validator_stage_v1",
            "required_checks": [
                "final_verdict_consistency",
                "unsupported_language_scan",
                "evidence_signal_present",
            ],
        }
        if not _TASKS_CONFIG_PATH.exists():
            return defaults

        with _TASKS_CONFIG_PATH.open("r", encoding="utf-8") as handle:
            loaded: dict[str, Any] = yaml.safe_load(handle) or {}

        validator_cfg = loaded.get("validator_stage")
        if not isinstance(validator_cfg, dict):
            return defaults

        merged = {**defaults, **validator_cfg}
        required_checks = merged.get("required_checks")
        if not isinstance(required_checks, list) or not all(isinstance(item, str) for item in required_checks):
            merged["required_checks"] = defaults["required_checks"]
        if not isinstance(merged.get("prompt_version"), str):
            merged["prompt_version"] = defaults["prompt_version"]
        if not isinstance(merged.get("enabled"), bool):
            merged["enabled"] = defaults["enabled"]
        return merged

    def _load_validator_prompt(self, prompt_version: str) -> str:
        """Load the versioned validator prompt template from disk."""
        prompt_path = _PROMPTS_DIR / f"{prompt_version}.txt"
        return prompt_path.read_text(encoding="utf-8")

    @staticmethod
    def _extract_model_validator_report(
        response_json: dict[str, Any] | None,
        response_content: str,
    ) -> ModelValidatorReport:
        """Parse a structured validator report from provider output."""
        if response_json is not None:
            return ModelValidatorReport.model_validate(response_json)
        return ModelValidatorReport.model_validate(json.loads(response_content))

    async def _run_model_validator_stage(
        self,
        *,
        adapter: Any,
        request: WorkflowRunRequest,
        raw_output: str,
        verified_pass: bool,
        document_id: str | None,
    ) -> ModelValidatorStageResult:
        """Run a dedicated model-backed validation stage over crew output."""
        prompt_version = str(self.model_validator_config["prompt_version"])
        if not self.settings.model_validator_enabled or not self.model_validator_config.get("enabled", True):
            return ModelValidatorStageResult(
                stage_status="skipped",
                prompt_version=prompt_version,
                reason="disabled",
            )
        if not raw_output.strip():
            return ModelValidatorStageResult(
                stage_status="skipped",
                prompt_version=prompt_version,
                reason="empty_crew_output",
            )

        try:
            prompt_template = self._load_validator_prompt(prompt_version)
        except OSError as exc:
            return ModelValidatorStageResult(
                stage_status="skipped",
                prompt_version=prompt_version,
                reason=f"prompt_load_failed:{exc}",
            )

        await self.skills_api.log_event(
            {
                "event_type": "model_validator_stage_started",
                "actor_type": "agent",
                "actor_id": "model_validator_stage",
                "subject_type": "workflow",
                "subject_id": self.run_id,
                "trace_id": self.trace_id,
                "correlation_id": self.run_id,
                "payload": {
                    "workflow_id": request.workflow_id,
                    "prompt_version": prompt_version,
                    "provider": adapter.provider_id,
                },
            }
        )

        messages = [
            ModelMessage(
                role="system",
                content="Return JSON only and follow the response schema exactly.",
            ),
            ModelMessage(
                role="user",
                content=prompt_template.format(
                    workflow_id=request.workflow_id,
                    run_id=self.run_id,
                    trace_id=self.trace_id,
                    document_id=document_id or "",
                    verified_pass=str(verified_pass).lower(),
                    required_checks="\n".join(
                        f"- {check}" for check in self.model_validator_config["required_checks"]
                    ),
                    raw_output=raw_output,
                ),
            ),
        ]

        try:
            response = await adapter.generate(
                messages=messages,
                options=GenerateOptions(
                    response_schema=ModelValidatorReport.model_json_schema(),
                    temperature=0.0,
                    max_tokens=self.settings.model_validator_max_tokens,
                ),
            )
            report = self._extract_model_validator_report(response.json_payload, response.content)
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            await self.skills_api.log_event(
                {
                    "event_type": "model_validator_stage_skipped",
                    "actor_type": "agent",
                    "actor_id": "model_validator_stage",
                    "subject_type": "workflow",
                    "subject_id": self.run_id,
                    "trace_id": self.trace_id,
                    "correlation_id": self.run_id,
                    "payload": {
                        "workflow_id": request.workflow_id,
                        "prompt_version": prompt_version,
                        "reason": f"invalid_response:{exc}",
                        "provider": adapter.provider_id,
                    },
                }
            )
            return ModelValidatorStageResult(
                stage_status="skipped",
                prompt_version=prompt_version,
                reason=f"invalid_response:{exc}",
                provider_id=adapter.provider_id,
            )
        except Exception as exc:  # pragma: no cover
            await self.skills_api.log_event(
                {
                    "event_type": "model_validator_stage_skipped",
                    "actor_type": "agent",
                    "actor_id": "model_validator_stage",
                    "subject_type": "workflow",
                    "subject_id": self.run_id,
                    "trace_id": self.trace_id,
                    "correlation_id": self.run_id,
                    "payload": {
                        "workflow_id": request.workflow_id,
                        "prompt_version": prompt_version,
                        "reason": f"adapter_error:{exc}",
                        "provider": adapter.provider_id,
                    },
                }
            )
            return ModelValidatorStageResult(
                stage_status="skipped",
                prompt_version=prompt_version,
                reason=f"adapter_error:{exc}",
                provider_id=adapter.provider_id,
            )

        await self.skills_api.log_event(
            {
                "event_type": "model_validator_stage_completed",
                "actor_type": "agent",
                "actor_id": "model_validator_stage",
                "subject_type": "workflow",
                "subject_id": self.run_id,
                "trace_id": self.trace_id,
                "correlation_id": self.run_id,
                "payload": {
                    "workflow_id": request.workflow_id,
                    "prompt_version": prompt_version,
                    "decision": report.decision,
                    "issues": report.issues,
                    "checks": report.checks,
                    "provider": response.provider_id,
                    "model_id": response.model_id,
                },
            }
        )
        return ModelValidatorStageResult(
            stage_status="completed",
            prompt_version=prompt_version,
            report=report,
            provider_id=response.provider_id,
            model_id=response.model_id,
        )

    @staticmethod
    def crewai_available() -> bool:
        """Return whether CrewAI is importable in the current runtime."""
        return find_spec("crewai") is not None

    def _resolve_routing_mode(
        self, request: WorkflowRunRequest
    ) -> Literal["single_agent_wrapper", "crewai_workflow"]:
        """Determine effective routing mode, applying the kill switch.

        Rules (in order):
        1. If explicit routing_mode is "crewai_workflow", check conditions:
           - CrewAI must be available
           - Kill switch must be off
        2. If explicit routing_mode is "single_agent_wrapper", use it
        3. If routing_mode is "auto":
           - Route generate_audit_package to CrewAI if available and enabled
           - Default to single-agent wrapper
        """
        if request.routing_mode == "crewai_workflow":
            if not self.crewai_available():
                logger.warning("crewai_not_available_forced_fallback")
                return "single_agent_wrapper"
            if not self.settings.crewai_workflow_enabled:
                logger.warning("crewai_kill_switch_active")
                return "single_agent_wrapper"
            return "crewai_workflow"

        if request.routing_mode == "single_agent_wrapper":
            return "single_agent_wrapper"

        # "auto" — route by workflow_id
        if (
            request.workflow_id == _GENERATE_AUDIT_PACKAGE
            and self.crewai_available()
            and self.settings.crewai_workflow_enabled
        ):
            return "crewai_workflow"

        return "single_agent_wrapper"

    async def execute_workflow(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        """Execute the workflow end-to-end within a global timeout.

        Flow lifecycle:
        1. Initialize state (run_id, trace_id, runtime enforcer)
        2. Resolve routing mode (with kill-switch logic)
        3. Log routing decision to audit trail
        4. Dispatch to appropriate execution path
        5. Return structured response

        Args:
            request: Workflow execution request with input payload and options

        Returns:
            WorkflowRunResponse with result, status, and audit events
        """
        # Initialize Flow state
        self.run_id = str(uuid4())
        self.trace_id = request.trace_id or str(uuid4())
        self.routing_mode = self._resolve_routing_mode(request)
        
        # Initialize runtime limits enforcer
        limit_config = RuntimeLimitConfig(
            max_steps=self.settings.max_steps,
            max_retries_per_step=self.settings.max_retries_per_step,
            max_token_budget_per_run=self.settings.max_token_budget_per_run,
            step_timeout_seconds=self.settings.step_timeout_seconds,
            global_run_timeout_seconds=self.settings.global_run_timeout_seconds,
        )
        self.runtime_enforcer = RuntimeLimitEnforcer(
            run_id=self.run_id,
            trace_id=self.trace_id,
            config=limit_config,
        )

        # Log routing decision immediately
        await self.skills_api.log_event(
            {
                "event_type": "workflow_routing_decision",
                "actor_type": "orchestrator",
                "actor_id": "router",
                "subject_type": "workflow",
                "subject_id": self.run_id,
                "trace_id": self.trace_id,
                "correlation_id": self.run_id,
                "payload": {
                    "workflow_id": request.workflow_id,
                    "requested_routing_mode": request.routing_mode,
                    "effective_routing_mode": self.routing_mode,
                    "crewai_available": self.crewai_available(),
                    "crewai_workflow_enabled": self.settings.crewai_workflow_enabled,
                    "runtime_limits": {
                        "max_steps": self.settings.max_steps,
                        "max_retries_per_step": self.settings.max_retries_per_step,
                        "max_token_budget_per_run": self.settings.max_token_budget_per_run,
                        "step_timeout_seconds": self.settings.step_timeout_seconds,
                        "global_run_timeout_seconds": self.settings.global_run_timeout_seconds,
                    },
                },
            }
        )

        # Execute within global timeout
        try:
            result = await asyncio.wait_for(
                self._dispatch(request),
                timeout=self.settings.global_run_timeout_seconds,
            )
        except asyncio.TimeoutError:
            logger.error(
                "workflow_run_timeout",
                run_id=self.run_id,
                timeout=self.settings.global_run_timeout_seconds,
            )
            adapter = get_adapter(request.provider, self.settings)
            return WorkflowRunResponse(
                run_id=self.run_id,
                workflow_id=request.workflow_id,
                trace_id=self.trace_id,
                status="failed",
                adapter_id=adapter.provider_id,
                routing_mode=self.routing_mode,
                output={
                    "error": "timeout",
                    "reason": f"global_run_timeout_seconds={self.settings.global_run_timeout_seconds} exceeded",
                },
            )

        return result

    async def _dispatch(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        """Dispatch to execution path based on routing mode.

        Args:
            request: Workflow request

        Returns:
            WorkflowRunResponse from the selected path
        """
        if self.routing_mode == "crewai_workflow":
            return await self._crew_path(request)
        return await self._scaffold_path(request)

    # ================================================================ CrewAI Path

    async def _crew_path(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        """Execute the 'Generate Audit Package' CrewAI crew in a thread-pool executor.

        Flow responsibilities:
        - Extract document_id from request
        - Build the crew with traceability context
        - Execute in thread pool (crew.kickoff is sync)
        - Parse crew output
        - Log completion event
        - Return response

        Crew responsibilities:
        - Run five specialized agents
        - Perform compliance analysis
        - Generate audit package
        """
        from ..crews.review_flow import build_generate_audit_package_crew

        adapter = get_adapter(request.provider, self.settings)
        document_id = request.input_payload.get("document_id")
        _doc_id: str | None = document_id if isinstance(document_id, str) and document_id else None

        # Build crew with traceability context
        crew = build_generate_audit_package_crew(
            backend_base_url=self.settings.backend_base_url,
            trace_id=self.trace_id,
            correlation_id=self.run_id,
            document_id=_doc_id,
            max_retries_per_step=self.settings.max_retries_per_step,
        )

        logger.info(
            "crew_workflow_starting",
            run_id=self.run_id,
            trace_id=self.trace_id,
            workflow_id=request.workflow_id,
            document_id=_doc_id,
        )

        # Execute crew in thread pool (crew.kickoff is synchronous)
        loop = asyncio.get_running_loop()
        kickoff_inputs: dict[str, object] = {
            "run_id": self.run_id,
            "trace_id": self.trace_id,
            "document_id": _doc_id or "",
        }
        crew_result = await loop.run_in_executor(
            None, lambda: crew.kickoff(inputs=kickoff_inputs)
        )

        # Parse crew output
        raw_output: str = str(crew_result) if crew_result else ""
        verified_pass = "VERIFIED: PASS" in raw_output
        model_validator_result = await self._run_model_validator_stage(
            adapter=adapter,
            request=request,
            raw_output=raw_output,
            verified_pass=verified_pass,
            document_id=_doc_id,
        )
        validator_decision = model_validator_result.report.decision if model_validator_result.report else None
        validator_requires_attention = validator_decision in {"fail", "review"}
        run_status: Literal["successful", "failed", "degraded"] = (
            "successful" if verified_pass and not validator_requires_attention else "degraded"
        )

        # Log completion event
        await self.skills_api.log_event(
            {
                "event_type": "crew_workflow_completed",
                "actor_type": "agent",
                "actor_id": "orchestrator",
                "subject_type": "workflow",
                "subject_id": self.run_id,
                "trace_id": self.trace_id,
                "correlation_id": self.run_id,
                "payload": {
                    "workflow_id": request.workflow_id,
                    "verified_pass": verified_pass,
                    "run_status": run_status,
                    "provider": adapter.provider_id,
                    "model_validator_stage": model_validator_result.model_dump(mode="json"),
                },
            }
        )

        logger.info(
            "crew_workflow_completed",
            run_id=self.run_id,
            trace_id=self.trace_id,
            verified_pass=verified_pass,
            model_validator_decision=validator_decision,
        )

        # Return structured response
        return WorkflowRunResponse(
            run_id=self.run_id,
            workflow_id=request.workflow_id,
            trace_id=self.trace_id,
            status=run_status,
            adapter_id=adapter.provider_id,
            routing_mode="crewai_workflow",
            output={
                "crew_output": raw_output,
                "verified_pass": verified_pass,
                "document_id": _doc_id,
                "model_validator": model_validator_result.model_dump(mode="json"),
            },
        )

    # ============================================================== Scaffold Path

    async def _scaffold_path(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        """Single-agent scaffold workflow (fallback / simple tasks).

        Flow responsibilities:
        - Orchestrate 7 sequential steps
        - Manage state and error handling
        - Log step events for audit trail
        - Return comprehensive response

        Steps:
        1. Normalize input
        2. Backend health check
        3. Document lookup
        4. Extract text
        5. Model summary
        6. Write finding
        7. Log completion event
        """
        adapter = get_adapter(request.provider, self.settings)
        steps: list[WorkflowStepEvent] = []

        # Step 1 — normalise input
        normalize_step = WorkflowStepEvent(
            step_id="normalize-input",
            step_name="normalize_input",
            status="started",
            agent_id="orchestrator",
            provider_id=adapter.provider_id,
        )
        steps.append(normalize_step)
        normalized_payload = {
            "workflow_id": request.workflow_id,
            "input_payload": request.input_payload,
        }
        normalize_step.status = "completed"
        normalize_step.ended_at = datetime.now(timezone.utc)
        normalize_step.details = {"keys": sorted(request.input_payload.keys())}

        # Step 2 — backend health check
        backend_step = WorkflowStepEvent(
            step_id="skills-health",
            step_name="skills_api_health_check",
            status="started",
            agent_id="orchestrator",
            tool_name="health_check",
        )
        steps.append(backend_step)
        backend_health = await self.skills_api.health_check()
        backend_step.status = "completed"
        backend_step.ended_at = datetime.now(timezone.utc)
        backend_step.details = backend_health

        # Step 3 — document lookup
        document_lookup_step = WorkflowStepEvent(
            step_id="skills-document-lookup",
            step_name="skills_document_lookup",
            status="started",
            agent_id="orchestrator",
            tool_name="get_document",
        )
        steps.append(document_lookup_step)
        document_snapshot: dict[str, object] | None = None
        requested_document_id = request.input_payload.get("document_id")
        if isinstance(requested_document_id, str) and requested_document_id:
            try:
                document_snapshot = await self.skills_api.get_document(requested_document_id)
            except Exception as exc:  # pragma: no cover
                document_lookup_step.status = "failed"
                document_lookup_step.ended_at = datetime.now(timezone.utc)
                document_lookup_step.details = {"error": str(exc), "document_id": requested_document_id}
            else:
                document_lookup_step.status = "completed"
                document_lookup_step.ended_at = datetime.now(timezone.utc)
                document_lookup_step.details = {
                    "document_id": requested_document_id,
                    "filename": document_snapshot.get("filename"),
                }
        else:
            search_result = await self.skills_api.search_documents(query="", limit=5)
            document_lookup_step.status = "completed"
            document_lookup_step.ended_at = datetime.now(timezone.utc)
            document_lookup_step.details = {"result_count": len(search_result.get("results", []))}
            if search_result.get("results"):
                document_snapshot = search_result["results"][0]

        # Step 4 — extract_text (if document resolved)
        extracted_text: str | None = None
        if document_snapshot and document_snapshot.get("document_id"):
            extract_step = WorkflowStepEvent(
                step_id="skills-extract-text",
                step_name="skills_extract_text",
                status="started",
                agent_id="orchestrator",
                tool_name="extract_text",
            )
            steps.append(extract_step)
            try:
                extract_result = await self.skills_api.extract_text(
                    {"document_id": str(document_snapshot["document_id"])}
                )
                extracted_text = extract_result.get("extracted_text") or ""
                extract_step.status = "completed"
                extract_step.ended_at = datetime.now(timezone.utc)
                extract_step.details = {
                    "document_id": document_snapshot["document_id"],
                    "char_count": len(extracted_text),
                }
            except Exception as exc:  # pragma: no cover
                extract_step.status = "failed"
                extract_step.ended_at = datetime.now(timezone.utc)
                extract_step.details = {"error": str(exc)}

        # Step 5 — provider model summary
        model_step = WorkflowStepEvent(
            step_id="provider-summary",
            step_name="provider_summary",
            status="started",
            agent_id="workflow_manager",
            provider_id=adapter.provider_id,
        )
        steps.append(model_step)
        model_response = await adapter.generate(
            messages=[
                ModelMessage(
                    role="system",
                    content=(
                        "Summarize the workflow run and confirm that all system access must go through the backend Skills API."
                    ),
                ),
                ModelMessage(
                    role="user",
                    content=str(normalized_payload),
                ),
            ],
            options=GenerateOptions(response_schema={"type": "object"}),
        )
        model_step.status = "completed"
        model_step.ended_at = datetime.now(timezone.utc)
        model_step.model_id = model_response.model_id
        model_step.details = {"usage": model_response.usage}

        # Step 6 — write_finding (if document resolved)
        finding_id: str | None = None
        if document_snapshot and document_snapshot.get("document_id"):
            finding_step = WorkflowStepEvent(
                step_id="skills-write-finding",
                step_name="skills_write_finding",
                status="started",
                agent_id="orchestrator",
                tool_name="write_finding",
            )
            steps.append(finding_step)
            try:
                finding_result = await self.skills_api.write_finding(
                    {
                        "document_id": str(document_snapshot["document_id"]),
                        "finding_type": "scaffold_review",
                        "title": "Scaffold workflow review result",
                        "description": (
                            model_response.content[:500]
                            if model_response.content
                            else "No model output."
                        ),
                        "severity": "low",
                        "evidence": [extracted_text[:300]] if extracted_text else [],
                    }
                )
                finding_id = finding_result.get("finding_id")
                finding_step.status = "completed"
                finding_step.ended_at = datetime.now(timezone.utc)
                finding_step.details = {"finding_id": finding_id}
            except Exception as exc:  # pragma: no cover
                finding_step.status = "failed"
                finding_step.ended_at = datetime.now(timezone.utc)
                finding_step.details = {"error": str(exc)}

        # Step 7 — audit log
        await self.skills_api.log_event(
            {
                "event_type": "workflow_run_completed",
                "actor_type": "agent",
                "actor_id": "orchestrator",
                "subject_type": "workflow",
                "subject_id": self.run_id,
                "trace_id": self.trace_id,
                "correlation_id": self.run_id,
                "payload": {
                    "workflow_id": request.workflow_id,
                    "routing_mode": "single_agent_wrapper",
                    "provider": adapter.provider_id,
                    "adapter_model_id": model_response.model_id,
                    "finding_id": finding_id,
                },
            }
        )

        logger.info(
            "scaffold_workflow_completed",
            run_id=self.run_id,
            trace_id=self.trace_id,
            workflow_id=request.workflow_id,
            provider=adapter.provider_id,
        )

        # Return structured response
        return WorkflowRunResponse(
            run_id=self.run_id,
            workflow_id=request.workflow_id,
            trace_id=self.trace_id,
            status="degraded" if not self.crewai_available() else "successful",
            adapter_id=adapter.provider_id,
            routing_mode="single_agent_wrapper",
            output={
                "backend_health": backend_health,
                "document_snapshot": document_snapshot,
                "extracted_text_chars": len(extracted_text) if extracted_text else 0,
                "finding_id": finding_id,
                "model_summary": model_response.json_payload or {"summary": model_response.content},
                "crewai_available": self.crewai_available(),
                "note": (
                    "CrewAI runtime detected"
                    if self.crewai_available()
                    else "CrewAI package not importable; scaffold fallback executed"
                ),
            },
            steps=steps,
        )
