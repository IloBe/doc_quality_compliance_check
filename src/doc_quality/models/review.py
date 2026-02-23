"""Pydantic models for HITL review workflow."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ReviewStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    PASSED = "passed"
    MODIFICATIONS_NEEDED = "modifications_needed"
    REJECTED = "rejected"


class ModificationImportance(str, Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    OPTIONAL = "optional"


class ModificationRequest(BaseModel):
    location: str = Field(..., description="Document section/location needing modification")
    description: str = Field(..., description="What modification is needed")
    importance: ModificationImportance
    risk_if_not_done: str = Field(..., description="Risk description if modification is skipped")
    responsible_role: Optional[str] = None
    responsible_person: Optional[str] = None
    responsible_department: Optional[str] = None


class ReviewRecord(BaseModel):
    review_id: str
    document_id: str
    status: ReviewStatus
    reviewer_name: str
    reviewer_role: str
    review_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modifications_required: list[ModificationRequest] = Field(default_factory=list)
    comments: str = ""
    approval_date: Optional[datetime] = None
