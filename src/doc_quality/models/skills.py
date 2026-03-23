"""Pydantic models for the backend Skills API."""
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

from .document import DocumentType


class SkillDocumentRecord(BaseModel):
    """Stored document returned by the Skills API."""

    document_id: str
    filename: str
    content_type: str
    document_type: DocumentType
    extracted_text: str
    source: Literal["analyze_text", "upload", "skills_extract"]
    created_at: datetime
    updated_at: datetime


class GetDocumentRequest(BaseModel):
    """Request payload for document lookup."""

    document_id: str


class SearchDocumentsRequest(BaseModel):
    """Request payload for document search."""

    query: str = ""
    document_type: DocumentType | None = None
    limit: int = Field(default=10, ge=1, le=100)


class SearchDocumentsResponse(BaseModel):
    """Search result payload."""

    results: list[SkillDocumentRecord] = Field(default_factory=list)


class ExtractTextRequest(BaseModel):
    """Request payload for text extraction."""

    document_id: str | None = None
    filename: str | None = None
    content_base64: str | None = None
    content_type: str | None = None
    store_document: bool = False
    document_type: DocumentType | None = None


class ExtractTextResponse(BaseModel):
    """Text extraction response."""

    extracted_text: str
    filename: str
    content_type: str
    document_id: str | None = None


class FindingRecord(BaseModel):
    """Stored finding written by orchestrator or human reviewer."""

    finding_id: str
    document_id: str
    finding_type: str
    title: str
    description: str
    severity: Literal["low", "medium", "high", "critical"]
    evidence: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WriteFindingRequest(BaseModel):
    """Request payload for finding creation."""

    document_id: str
    finding_type: str
    title: str
    description: str
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    evidence: dict[str, Any] = Field(default_factory=dict)


class AuditEventRecord(BaseModel):
    """Audit event persisted through the Skills API.
    
    New fields (Topic 6):
    - tenant_id: Tenant identifier (for multi-tenancy)
    - org_id: Organization identifier
    - project_id: Project identifier
    - event_time: When the event occurred
    """

    event_id: str
    event_type: str
    actor_type: str
    actor_id: str
    subject_type: str
    subject_id: str
    trace_id: str | None = None
    correlation_id: str | None = None
    tenant_id: str = "default_tenant"  # NEW: Multi-tenancy support
    org_id: str | None = None  # NEW: Organization identifier
    project_id: str | None = None  # NEW: Project identifier
    event_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))  # NEW: Event timestamp
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LogEventRequest(BaseModel):
    """Request payload for audit event creation.
    
    New fields (Topic 6):
    - tenant_id: Tenant identifier (required, default: "default_tenant")
    - org_id: Organization identifier (optional)
    - project_id: Project identifier (optional)
    
    These fields enable multi-tenancy and compliance audit trail per backend.md.
    """

    event_type: str
    actor_type: str = "agent"
    actor_id: str = "orchestrator"
    subject_type: str = "workflow"
    subject_id: str
    trace_id: str | None = None
    correlation_id: str | None = None
    tenant_id: str = "default_tenant"  # NEW: Multi-tenancy support
    org_id: str | None = None  # NEW: Organization identifier
    project_id: str | None = None  # NEW: Project identifier
    payload: dict[str, Any] = Field(default_factory=dict)
