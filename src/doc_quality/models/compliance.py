"""Pydantic models for compliance checks."""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ComplianceFramework(str, Enum):
    EU_AI_ACT = "eu_ai_act"
    MDR = "mdr_eu_medical_devices"
    GDPR = "gdpr"
    ISO_9001 = "iso_9001"
    ISO_27001 = "iso_27001"
    BSI_GRUNDSCHUTZ = "bsi_grundschutz"


class RiskLevel(str, Enum):
    LOW = "low"
    LIMITED = "limited"
    HIGH = "high"
    UNACCEPTABLE = "unacceptable"


class AIActRole(str, Enum):
    PROVIDER = "provider"
    DEPLOYER = "deployer"
    BOTH = "both"
    NOT_APPLICABLE = "not_applicable"


class ComplianceRequirement(BaseModel):
    requirement_id: str
    framework: ComplianceFramework
    title: str
    description: str
    mandatory: bool = True
    met: Optional[bool] = None
    evidence: Optional[str] = None
    gap_description: Optional[str] = None


class ComplianceCheckResult(BaseModel):
    document_id: str
    framework: ComplianceFramework
    risk_level: Optional[RiskLevel] = None
    ai_act_role: Optional[AIActRole] = None
    requirements: list[ComplianceRequirement] = Field(default_factory=list)
    mandatory_gaps: list[str] = Field(default_factory=list)
    optional_gaps: list[str] = Field(default_factory=list)
    compliance_score: float = Field(ge=0.0, le=1.0)
    summary: str = ""


class ProductDomainInfo(BaseModel):
    domain: str = Field(..., description="Product domain e.g. 'medical devices', 'finance'")
    description: str = Field(..., description="Product description")
    uses_ai_ml: bool = False
    ai_system_description: Optional[str] = None
    intended_use: Optional[str] = None
    target_market: str = "EU"


class StandardMappingRequestCreate(BaseModel):
    standard_name: str = Field(..., min_length=3, max_length=200)
    sop_reference: str = Field(..., min_length=3, max_length=255)
    business_justification: str = Field(..., min_length=15, max_length=4000)
    requester_email: str = Field(..., min_length=5, max_length=255)
    tenant_id: str = Field(default="default", min_length=1, max_length=100)
    project_id: Optional[str] = Field(default=None, max_length=100)


class StandardMappingRequestRecord(BaseModel):
    request_id: str
    status: str
    submitted_at: str
    standard_name: str
    sop_reference: str
    business_justification: str
    requester_email: str
    tenant_id: str
    project_id: Optional[str] = None


class StandardMappingRequestListResponse(BaseModel):
    items: list[StandardMappingRequestRecord] = Field(default_factory=list)
