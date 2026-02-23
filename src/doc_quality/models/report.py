"""Pydantic models for generated reports."""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ReportFormat(str, Enum):
    PDF = "pdf"
    HTML = "html"
    JSON = "json"


class ReportType(str, Enum):
    DOCUMENT_ANALYSIS = "document_analysis"
    COMPLIANCE_AUDIT = "compliance_audit"
    GAP_ANALYSIS = "gap_analysis"
    FULL_AUDIT = "full_audit"


class ReportRequest(BaseModel):
    document_id: str
    report_type: ReportType
    report_format: ReportFormat = ReportFormat.PDF
    include_recommendations: bool = True
    reviewer_name: Optional[str] = None


class ReportResult(BaseModel):
    report_id: str
    document_id: str
    report_type: ReportType
    report_format: ReportFormat
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    file_path: Optional[str] = None
    summary: str = ""
