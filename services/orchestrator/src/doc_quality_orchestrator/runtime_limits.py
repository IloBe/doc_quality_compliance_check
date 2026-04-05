"""Runtime limits enforcement for orchestrator workflows.

Implements hard limits for orchestration safety:
- max_steps: Total agent steps per workflow run
- max_retries_per_step: Retries allowed per individual agent step
- max_token_budget_per_run: Global token budget across entire workflow
- step_timeout_seconds: Timeout per individual step execution
- global_run_timeout_seconds: Timeout for entire workflow run

Requirements (from phase0_crewAI_orchestration_definition_of_done.md):
- All limits are hard limits (must not be exceeded)
- Exceeded limits fail fast with explicit run status and reason code
- Step-level events are persisted to audit_events
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class RuntimeLimitConfig:
    """Immutable configuration for runtime limits."""

    max_steps: int
    max_retries_per_step: int
    max_token_budget_per_run: int
    step_timeout_seconds: float
    global_run_timeout_seconds: float

    def __post_init__(self) -> None:
        """Validate configuration."""
        if self.max_steps < 1:
            raise ValueError("max_steps must be >= 1")
        if self.max_retries_per_step < 1:
            raise ValueError("max_retries_per_step must be >= 1")
        if self.max_token_budget_per_run < 100:
            raise ValueError("max_token_budget_per_run must be >= 100")
        if self.step_timeout_seconds < 1.0:
            raise ValueError("step_timeout_seconds must be >= 1.0")
        if self.global_run_timeout_seconds < 1.0:
            raise ValueError("global_run_timeout_seconds must be >= 1.0")


@dataclass
class RuntimeLimitState:
    """Mutable state tracking runtime limit consumption."""

    run_id: str
    trace_id: str
    steps_executed: int = 0
    tokens_consumed: int = 0
    step_results: list[StepExecutionRecord] = None

    def __post_init__(self) -> None:
        if self.step_results is None:
            self.step_results = []

    def increment_step(self, token_count: int = 0) -> None:
        """Record execution of a step."""
        self.steps_executed += 1
        self.tokens_consumed += token_count

    def check_step_limit(self, config: RuntimeLimitConfig) -> tuple[bool, str | None]:
        """Check if step count is within limits.
        
        Returns:
            (ok, reason) where ok=True if within limits, reason if exceeded
        """
        if self.steps_executed >= config.max_steps:
            reason = f"max_steps={config.max_steps} exceeded ({self.steps_executed} executed)"
            return False, reason
        return True, None

    def check_token_limit(self, config: RuntimeLimitConfig) -> tuple[bool, str | None]:
        """Check if token budget is exhausted.
        
        Returns:
            (ok, reason) where ok=True if within limits, reason if exceeded
        """
        if self.tokens_consumed >= config.max_token_budget_per_run:
            reason = f"max_token_budget_per_run={config.max_token_budget_per_run} exceeded ({self.tokens_consumed} consumed)"
            return False, reason
        return True, None

    def remaining_tokens(self, config: RuntimeLimitConfig) -> int:
        """Return remaining token budget."""
        return max(0, config.max_token_budget_per_run - self.tokens_consumed)

    def remaining_steps(self, config: RuntimeLimitConfig) -> int:
        """Return remaining step quota."""
        return max(0, config.max_steps - self.steps_executed)


@dataclass
class StepExecutionRecord:
    """Record of a single step execution for audit trail."""

    step_id: str
    agent_id: str
    step_number: int
    attempt: int
    status: Literal["started", "completed", "failed", "timeout", "skipped"]
    started_at: datetime
    ended_at: datetime | None = None
    tokens_consumed: int = 0
    error_category: str | None = None
    error_message: str | None = None
    tool_name: str | None = None

    def duration_seconds(self) -> float:
        """Return step execution duration in seconds."""
        if self.ended_at is None:
            return 0.0
        return (self.ended_at - self.started_at).total_seconds()

    def to_audit_event_payload(self) -> dict:
        """Convert to audit event payload for persistence."""
        return {
            "step_id": self.step_id,
            "agent_id": self.agent_id,
            "step_number": self.step_number,
            "attempt": self.attempt,
            "status": self.status,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_seconds": self.duration_seconds(),
            "tokens_consumed": self.tokens_consumed,
            "tool_name": self.tool_name,
            "error_category": self.error_category,
            "error_message": self.error_message,
        }


class RuntimeLimitEnforcer:
    """Enforces runtime limits and tracks consumption during workflow execution."""

    def __init__(
        self,
        run_id: str,
        trace_id: str,
        config: RuntimeLimitConfig,
    ) -> None:
        self.config = config
        self.state = RuntimeLimitState(run_id=run_id, trace_id=trace_id)
        self.start_time = datetime.now(timezone.utc)

    def check_step_limit(self) -> tuple[bool, str | None]:
        """Check if next step is allowed.
        
        Returns:
            (allowed, reason) where allowed=True if step can execute
        """
        ok, reason = self.state.check_step_limit(self.config)
        if not ok:
            logger.warning("step_limit_exceeded", reason=reason, run_id=self.state.run_id)
        return ok, reason

    def check_token_limit(self) -> tuple[bool, str | None]:
        """Check if token budget remains.
        
        Returns:
            (ok, reason) where ok=True if tokens remain
        """
        ok, reason = self.state.check_token_limit(self.config)
        if not ok:
            logger.warning("token_limit_exceeded", reason=reason, run_id=self.state.run_id)
        return ok, reason

    def check_all_limits(self) -> tuple[bool, str | None]:
        """Check all runtime limits.
        
        Returns:
            (ok, reason) where ok=True if all limits respected
        """
        step_ok, step_reason = self.check_step_limit()
        if not step_ok:
            return False, step_reason

        token_ok, token_reason = self.check_token_limit()
        if not token_ok:
            return False, token_reason

        return True, None

    def record_step_execution(
        self,
        step_id: str,
        agent_id: str,
        step_number: int,
        attempt: int,
        status: Literal["started", "completed", "failed", "timeout", "skipped"],
        tokens_consumed: int = 0,
        tool_name: str | None = None,
        error_category: str | None = None,
        error_message: str | None = None,
    ) -> StepExecutionRecord:
        """Record step execution for audit trail.
        
        Args:
            step_id: Unique step identifier
            agent_id: Agent that executed the step
            step_number: Sequential step number (1-based)
            attempt: Attempt number (1-based)
            status: Execution status
            tokens_consumed: Tokens used by this step
            tool_name: Tool used (if any)
            error_category: Error category (if failed)
            error_message: Error message (if failed)
            
        Returns:
            StepExecutionRecord for audit persistence
        """
        now = datetime.now(timezone.utc)
        record = StepExecutionRecord(
            step_id=step_id,
            agent_id=agent_id,
            step_number=step_number,
            attempt=attempt,
            status=status,
            started_at=now,
            ended_at=now,
            tokens_consumed=tokens_consumed,
            tool_name=tool_name,
            error_category=error_category,
            error_message=error_message,
        )
        self.state.step_results.append(record)
        self.state.increment_step(tokens_consumed)

        logger.info(
            "step_execution_recorded",
            run_id=self.state.run_id,
            step_id=step_id,
            agent_id=agent_id,
            step_number=step_number,
            attempt=attempt,
            status=status,
            duration_seconds=record.duration_seconds(),
            tokens_consumed=tokens_consumed,
        )
        return record

    def get_runtime_summary(self) -> dict:
        """Return current runtime summary for logging/reporting."""
        elapsed = (datetime.now(timezone.utc) - self.start_time).total_seconds()
        return {
            "run_id": self.state.run_id,
            "trace_id": self.state.trace_id,
            "elapsed_seconds": elapsed,
            "steps_executed": self.state.steps_executed,
            "steps_remaining": self.state.remaining_steps(self.config),
            "tokens_consumed": self.state.tokens_consumed,
            "tokens_remaining": self.state.remaining_tokens(self.config),
            "step_records": len(self.state.step_results),
        }

    def failed_run_reason(self, reason: str | None = None) -> dict:
        """Format reason for failed run due to limit exceeded."""
        return {
            "error": "limit_exceeded",
            "reason": reason or "Unknown limit exceeded",
            "runtime_summary": self.get_runtime_summary(),
        }
