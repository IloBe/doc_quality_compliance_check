"""Pydantic models for risk template management (RMF & FMEA)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Row-level data structures
# ---------------------------------------------------------------------------


class RmfRowData(BaseModel):
    """One row of a Risk Management File (company-wide, Table 1)."""

    nr: int = 1
    risk_category: str = ""
    activity: str = ""
    owner_role: str = ""
    qualification_required: str = ""
    target_date: str = ""
    regulatory_ref: str = ""
    status: str = "Open"
    control_measure: str = ""
    verification: str = ""
    evidence_ref: str = ""
    notes: str = ""


class FmeaRowData(BaseModel):
    """One row of a Failure Mode & Effects Analysis (product-specific, Table 2)."""

    nr: int = 1
    system_element: str = ""
    root_cause: str = ""
    failure_mode: str = ""
    hazard_impact: str = ""
    effect: str = ""
    severity: int = Field(default=1, ge=1, le=5)
    probability: int = Field(default=1, ge=1, le=5)
    # RPN is computed server-side and stored for audit; clients may recompute
    rpn: int = 1
    mitigation: str = ""
    verification: str = ""
    post_severity: int = Field(default=1, ge=1, le=5)
    post_probability: int = Field(default=1, ge=1, le=5)
    post_rpn: int = 1
    residual_risk: str = "Low"
    status: str = "Open"
    post_effect_risk: str = ""
    new_risks: str = ""
    notes: str = ""


# ---------------------------------------------------------------------------
# Template-level structures
# ---------------------------------------------------------------------------


class RiskTemplateRow(BaseModel):
    """Persisted row belonging to a risk template."""

    row_id: str
    template_id: str
    row_order: int
    row_data: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RiskTemplate(BaseModel):
    """A complete risk template with its rows."""

    template_id: str
    template_type: Literal["RMF", "FMEA"]
    template_title: str
    product: str
    version: str = "1.0.0"
    status: Literal["Draft", "In Review", "Approved"] = "Draft"
    created_by: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    rows: list[RiskTemplateRow] = Field(default_factory=list)


class RiskTemplateSummary(BaseModel):
    """Lightweight template record without rows."""

    template_id: str
    template_type: Literal["RMF", "FMEA"]
    template_title: str
    product: str
    version: str
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    row_count: int = 0


# ---------------------------------------------------------------------------
# Request / response bodies
# ---------------------------------------------------------------------------


class CreateRiskTemplateRequest(BaseModel):
    """Payload for creating a new template with an initial set of rows."""

    template_type: Literal["RMF", "FMEA"]
    template_title: str = Field(min_length=3, max_length=255)
    product: str = Field(min_length=2, max_length=255)
    created_by: str = Field(min_length=1, max_length=100)
    rationale: str | None = Field(default=None, max_length=1000)
    rows: list[dict[str, Any]] = Field(default_factory=list)


class EnsureDefaultRiskTemplateRequest(BaseModel):
    """Request body for ensuring a canonical server-managed default template."""

    product: str = Field(min_length=2, max_length=255)
    created_by: str = Field(min_length=1, max_length=100)


class UpdateRiskTemplateRequest(BaseModel):
    """Partial-update payload for an existing template."""

    template_title: str | None = Field(default=None, min_length=3, max_length=255)
    product: str | None = Field(default=None, min_length=2, max_length=255)
    status: Literal["Draft", "In Review", "Approved"] | None = None
    rows: list[dict[str, Any]] | None = None


class RiskTemplateListResponse(BaseModel):
    items: list[RiskTemplateSummary]
    total: int


class AiSuggestRowRequest(BaseModel):
    """Request body for the AI-assist endpoint."""

    template_type: Literal["RMF", "FMEA"]
    # Partial row data already filled in by the user (context for Claude)
    partial_row: dict[str, Any] = Field(default_factory=dict)
    # Optional free-text context (e.g. product description)
    context: str = ""


class AiSuggestRowResponse(BaseModel):
    """Suggested field values returned by Claude."""

    suggestions: dict[str, Any]
    explanation: str
    model_used: str
    degraded_to_defaults: bool = False
