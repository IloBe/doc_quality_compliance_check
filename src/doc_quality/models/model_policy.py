"""Pydantic models for configurable model-priority policy."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, model_validator


ModelProvider = Literal["ollama", "anthropic", "perplexity", "openai", "other"]


class ModelRuntimeParameters(BaseModel):
    """Runtime generation parameters used by one model candidate."""

    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    top_k: int = Field(default=40, ge=1, le=500)


class ModelPolicyCandidate(BaseModel):
    """One model option in the prioritized runtime list."""

    model_id: str = Field(min_length=1, max_length=120)
    display_name: str = Field(min_length=1, max_length=200)
    provider: ModelProvider = "other"
    enabled: bool = True
    priority: int = Field(default=100, ge=1, le=1000)
    params: ModelRuntimeParameters = Field(default_factory=ModelRuntimeParameters)


class ModelPolicyRecord(BaseModel):
    """Persisted policy used to resolve active local and fallback models."""

    default_model_id: str = Field(min_length=1, max_length=120)
    items: list[ModelPolicyCandidate] = Field(default_factory=list)
    updated_by: str | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @model_validator(mode="after")
    def validate_consistency(self) -> "ModelPolicyRecord":
        """Ensure ids are unique and default model is part of the list."""
        ids: list[str] = [item.model_id for item in self.items]
        if len(set(ids)) != len(ids):
            raise ValueError("model_id values must be unique")
        if self.default_model_id not in set(ids):
            raise ValueError("default_model_id must exist in items")
        return self


class ModelPolicyUpdateRequest(BaseModel):
    """Admin request payload for updating model policy."""

    default_model_id: str = Field(min_length=1, max_length=120)
    items: list[ModelPolicyCandidate] = Field(default_factory=list, min_length=1, max_length=20)


class ActiveModelInfo(BaseModel):
    """Resolved active model used by bridge/compliance/audit workflows."""

    model_id: str
    display_name: str
    provider: ModelProvider
    priority: int
    params: ModelRuntimeParameters = Field(default_factory=ModelRuntimeParameters)


class ActiveModelResponse(BaseModel):
    """Response envelope for frontend status/disclaimer rendering."""

    active_model: ActiveModelInfo
    policy_updated_at: datetime | None = None
    policy_updated_by: str | None = None
