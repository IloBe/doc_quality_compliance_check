"""Pydantic models for the orchestration service."""
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class ModelCapabilities(BaseModel):
    """Capability flags exposed by a provider adapter."""

    tool_calls: bool = False
    json_schema: bool = True
    streaming: bool = False


class ModelMessage(BaseModel):
    """Single model message in a provider-agnostic format."""

    role: Literal["system", "user", "assistant", "tool"]
    content: str


class ToolCall(BaseModel):
    """Tool-call envelope for provider-neutral orchestration."""

    tool_name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class GenerateOptions(BaseModel):
    """Invocation options for model generation."""

    response_schema: dict[str, Any] | None = None
    tool_allowlist: list[str] = Field(default_factory=list)
    temperature: float = 0.0
    max_tokens: int | None = None


class ModelResponse(BaseModel):
    """Normalized provider response."""

    model_config = ConfigDict(populate_by_name=True)

    content: str
    json_payload: dict[str, Any] | None = Field(
        default=None,
        alias="json",
        serialization_alias="json",
    )
    tool_calls: list[ToolCall] = Field(default_factory=list)
    usage: dict[str, Any] = Field(default_factory=dict)
    model_id: str
    provider_id: str


class WorkflowRunRequest(BaseModel):
    """Request payload for a workflow run."""

    workflow_id: str = "document_compliance_check"
    provider: Literal["anthropic", "openai_compatible", "nemotron"] = "anthropic"
    trace_id: str | None = None
    routing_mode: Literal["auto", "single_agent_wrapper", "crewai_workflow"] = "auto"
    input_payload: dict[str, Any] = Field(default_factory=dict)


class WorkflowStepEvent(BaseModel):
    """Single step-level event emitted by the orchestrator."""

    step_id: str
    step_name: str
    status: Literal["started", "completed", "failed"]
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: datetime | None = None
    agent_id: str | None = None
    tool_name: str | None = None
    provider_id: str | None = None
    model_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunResponse(BaseModel):
    """Response returned by the run workflow endpoint."""

    run_id: str = Field(default_factory=lambda: str(uuid4()))
    workflow_id: str
    trace_id: str = Field(default_factory=lambda: str(uuid4()))
    status: Literal["successful", "failed", "degraded"]
    adapter_id: str
    routing_mode: Literal["single_agent_wrapper", "crewai_workflow"] = "single_agent_wrapper"
    output: dict[str, Any] = Field(default_factory=dict)
    steps: list[WorkflowStepEvent] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Health endpoint response."""

    status: Literal["healthy"] = "healthy"
    service: str = "orchestrator"
    version: str
    crewai_available: bool
