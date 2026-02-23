"""Pydantic models for document entities."""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    ARC42 = "arc42"
    MODEL_CARD = "model_card"
    SOP = "sop"
    REQUIREMENTS = "requirements"
    RISK_ASSESSMENT = "risk_assessment"
    UNKNOWN = "unknown"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    PASSED = "passed"
    MODIFICATIONS_NEEDED = "modifications_needed"
    FAILED = "failed"


class DocumentUpload(BaseModel):
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="MIME type")
    size_bytes: int = Field(..., ge=0, description="File size in bytes")


class DocumentSection(BaseModel):
    name: str
    present: bool
    content_preview: Optional[str] = None
    issues: list[str] = Field(default_factory=list)


class DocumentAnalysisResult(BaseModel):
    document_id: str
    filename: str
    document_type: DocumentType
    status: DocumentStatus
    sections_found: list[DocumentSection] = Field(default_factory=list)
    missing_sections: list[str] = Field(default_factory=list)
    overall_score: float = Field(ge=0.0, le=1.0, description="Quality score 0-1")
    issues: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
