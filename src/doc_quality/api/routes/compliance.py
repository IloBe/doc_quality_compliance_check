"""API routes for compliance checking."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ...core.session_auth import require_roles
from ...core.security import sanitize_text
from ...models.compliance import ComplianceCheckResult, ComplianceFramework, ProductDomainInfo
from ...services.compliance_checker import (
    check_eu_ai_act_compliance,
    get_applicable_regulations,
)

router = APIRouter(prefix="/compliance", tags=["compliance"])


class ComplianceCheckRequest(BaseModel):
    document_content: str
    document_id: str
    domain_info: ProductDomainInfo


@router.post("/check/eu-ai-act", response_model=ComplianceCheckResult)
async def check_eu_ai_act(
    request: ComplianceCheckRequest,
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> ComplianceCheckResult:
    """Check a document against EU AI Act requirements."""
    content = sanitize_text(request.document_content)
    return check_eu_ai_act_compliance(content, request.domain_info, request.document_id)


@router.post("/applicable-regulations", response_model=list[ComplianceFramework])
async def get_regulations(
    domain_info: ProductDomainInfo,
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> list[ComplianceFramework]:
    """Return list of applicable regulations for a given product domain."""
    return get_applicable_regulations(domain_info)
