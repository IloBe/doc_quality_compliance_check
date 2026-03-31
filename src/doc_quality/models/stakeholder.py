"""Pydantic models for stakeholder profile governance."""
from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field


class StakeholderProfileUpsertRequest(BaseModel):
    """Request payload for creating or updating one stakeholder profile."""

    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    permissions: list[str] = Field(default_factory=list, max_length=200)
    is_active: bool = True


class StakeholderProfileRecord(BaseModel):
    """Persisted stakeholder profile with audit metadata."""

    profile_id: str
    title: str
    description: str
    permissions: list[str] = Field(default_factory=list)
    is_active: bool = True
    created_by: str | None = None
    updated_by: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StakeholderProfileListResponse(BaseModel):
    """Collection response for stakeholder profiles."""

    items: list[StakeholderProfileRecord] = Field(default_factory=list)


class StakeholderEmployeeAssignmentRequest(BaseModel):
    """Request payload for assigning an employee to a stakeholder role."""

    employee_name: str = Field(min_length=1, max_length=255)


class StakeholderEmployeeAssignmentRecord(BaseModel):
    """Persisted employee assignment for one stakeholder profile."""

    assignment_id: str
    profile_id: str
    employee_name: str
    created_by: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StakeholderEmployeeAssignmentListResponse(BaseModel):
    """Collection response for stakeholder employee assignments."""

    items: list[StakeholderEmployeeAssignmentRecord] = Field(default_factory=list)
