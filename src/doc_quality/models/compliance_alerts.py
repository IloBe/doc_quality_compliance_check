"""Pydantic models for persisted compliance alert history."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ComplianceAlertRecord(BaseModel):
    """Single persisted compliance alert suitable for archive views and audits."""

    alert_id: str
    framework: str = Field(..., description="Framework family, e.g. EU AI Act or GDPR")
    title: str
    summary: str
    severity: str = Field(..., description="Informational severity label")
    source_label: str
    source_url: str | None = None
    provider: str = Field(..., description="Research or demo provider identifier")
    model_used: str | None = None
    search_query: str | None = None
    jurisdiction: str | None = None
    observed_at: str
    event_time: str
    is_demo: bool = False
    payload_snapshot: dict[str, Any] = Field(default_factory=dict)


class ComplianceAlertListResponse(BaseModel):
    """List response for alert archive retrieval."""

    items: list[ComplianceAlertRecord] = Field(default_factory=list)
