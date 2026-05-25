"""Pydantic models for admin governance controls and policy snapshots."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


GovernanceStatus = Literal["compliant", "warning", "critical", "draft"]


class GovernanceMetric(BaseModel):
    """Top-level governance KPI surfaced on the admin governance page."""

    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=200)
    value: float
    unit: str | None = Field(default=None, max_length=20)
    status: GovernanceStatus


class GovernancePolicy(BaseModel):
    """Policy registry entry with ownership and review metadata."""

    id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=240)
    version: str = Field(min_length=1, max_length=50)
    owner: str = Field(min_length=1, max_length=200)
    review_cadence: str = Field(min_length=1, max_length=100)
    next_review_date: str = Field(min_length=1, max_length=30)
    status: GovernanceStatus


class GovernanceControl(BaseModel):
    """Control implementation record mapped to framework obligations."""

    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=240)
    framework: str = Field(min_length=1, max_length=240)
    framework_id: str = Field(min_length=1, max_length=160)
    control_type: Literal["directive", "norm", "policy", "sop"] = "directive"
    activation_mode: Literal["baseline", "context"] = "baseline"
    domain_tags: list[str] = Field(default_factory=list)
    market_tags: list[str] = Field(default_factory=list)
    objective: str = Field(min_length=1, max_length=2000)
    implementation: str = Field(min_length=1, max_length=2000)
    evidence: str = Field(min_length=1, max_length=1000)
    status: GovernanceStatus
    is_active: bool = True


class GovernanceControlCreateRequest(BaseModel):
    """Request payload to create a governance control catalog entry."""

    name: str = Field(min_length=3, max_length=240)
    framework_id: str = Field(min_length=2, max_length=160)
    framework: str = Field(min_length=2, max_length=240)
    control_type: Literal["directive", "norm", "policy", "sop"] = "directive"
    activation_mode: Literal["baseline", "context"] = "baseline"
    domain_tags: list[str] = Field(default_factory=list)
    market_tags: list[str] = Field(default_factory=list)
    objective: str = Field(min_length=5, max_length=2000)
    implementation: str = Field(min_length=5, max_length=2000)
    evidence: str = Field(min_length=2, max_length=1000)
    status: GovernanceStatus = "draft"
    is_active: bool = True


class GovernanceControlListResponse(BaseModel):
    """Response payload for governance control catalog queries."""

    items: list[GovernanceControl] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GovernanceSnapshotResponse(BaseModel):
    """Response payload used by the admin governance frontend route."""

    metrics: list[GovernanceMetric] = Field(default_factory=list)
    policies: list[GovernancePolicy] = Field(default_factory=list)
    controls: list[GovernanceControl] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
