"""Explicit backend Skills API for orchestrator tool calls."""
from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
from ...core.privacy_payload_guard import assess_sensitive_output_exposure
from ...core.purpose_access import ACCESS_PURPOSE_HEADER, CONTENT_READ_ALLOWED_PURPOSES, enforce_sensitive_access_purpose
from ...core.session_auth import require_roles
from ...models.skills import (
    AuditEventRecord,
    ExtractTextRequest,
    ExtractTextResponse,
    FindingRecord,
    GetDocumentRequest,
    LogEventRequest,
    SearchDocumentsRequest,
    SearchDocumentsResponse,
    SkillDocumentRecord,
    WriteFindingRequest,
)
from ...services.bridge_privacy_service import assess_output_ip_risk
from ...services.skills_service import extract_text, get_document, log_event, search_documents, write_finding

router = APIRouter(prefix="/skills", tags=["skills"])


def _output_ip_risk_block_detail(summary: str, output_ip_risk: object) -> dict[str, object]:
    return {
        "reason": "skills_output_ip_risk_blocked",
        "message": summary,
        "action_points": [
            "Obtain human approval before exposing or re-exporting the full text.",
            "Remove copied, trademarked, or source-identifying material before retrying.",
        ],
        "output_ip_risk": output_ip_risk,
    }


def _sensitive_output_block_detail(summary: str, signals: list[str]) -> dict[str, object]:
    return {
        "reason": "skills_sensitive_output_blocked",
        "message": summary,
        "details": signals,
        "action_points": [
            "Redact secret or trade-secret material before requesting extracted text.",
            "Use metadata-only retrieval if raw text is not operationally required.",
            "Escalate to compliance reviewer for controlled disclosure exceptions.",
        ],
    }


@router.post("/get_document", response_model=SkillDocumentRecord)
async def get_document_skill(
    request: GetDocumentRequest,
    access_purpose: str | None = Header(default=None, alias=ACCESS_PURPOSE_HEADER),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> SkillDocumentRecord:
    """Return a stored document by id."""
    result = get_document(db, request.document_id, include_extracted_text=request.include_extracted_text)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {request.document_id}")
    if request.include_extracted_text and (result.extracted_text or ""):
        enforce_sensitive_access_purpose(
            access_purpose=access_purpose,
            allowed_purposes=CONTENT_READ_ALLOWED_PURPOSES,
            resource_label="skills.get_document.extracted_text",
        )
        sensitive_output = assess_sensitive_output_exposure(result.extracted_text)
        if sensitive_output.blocked:
            raise HTTPException(
                status_code=422,
                detail=_sensitive_output_block_detail(
                    "Exposed document text contains sensitive secret/trade-secret signals and cannot be returned via the Skills API.",
                    list(sensitive_output.matched_signals),
                ),
            )
        output_ip_risk = assess_output_ip_risk(result.extracted_text)
        if output_ip_risk.risk_level in {"medium", "high"}:
            raise HTTPException(
                status_code=422,
                detail=_output_ip_risk_block_detail(
                    "Exposed document text contains output IP-risk signals and cannot be returned via the Skills API.",
                    asdict(output_ip_risk),
                ),
            )
    return result


@router.post("/search_documents", response_model=SearchDocumentsResponse)
async def search_documents_skill(
    request: SearchDocumentsRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> SearchDocumentsResponse:
    """Search stored documents for orchestrator/tool use."""
    return search_documents(db, request)


@router.post("/extract_text", response_model=ExtractTextResponse)
async def extract_text_skill(
    request: ExtractTextRequest,
    access_purpose: str | None = Header(default=None, alias=ACCESS_PURPOSE_HEADER),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> ExtractTextResponse:
    """Extract text from a stored or inline document."""
    settings = get_settings()
    try:
        result = extract_text(db, request, settings.max_file_size_mb)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    enforce_sensitive_access_purpose(
        access_purpose=access_purpose,
        allowed_purposes=CONTENT_READ_ALLOWED_PURPOSES,
        resource_label="skills.extract_text.response",
    )
    sensitive_output = assess_sensitive_output_exposure(result.extracted_text)
    if sensitive_output.blocked:
        raise HTTPException(
            status_code=422,
            detail=_sensitive_output_block_detail(
                "Extracted text contains sensitive secret/trade-secret signals and cannot be returned via the Skills API.",
                list(sensitive_output.matched_signals),
            ),
        )
    output_ip_risk = assess_output_ip_risk(result.extracted_text)
    if output_ip_risk.risk_level in {"medium", "high"}:
        raise HTTPException(
            status_code=422,
            detail=_output_ip_risk_block_detail(
                "Extracted text contains output IP-risk signals and cannot be returned via the Skills API.",
                asdict(output_ip_risk),
            ),
        )
    return result


@router.post("/write_finding", response_model=FindingRecord)
async def write_finding_skill(
    request: WriteFindingRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> FindingRecord:
    """Persist a finding for a stored document."""
    try:
        return write_finding(db, request)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/log_event", response_model=AuditEventRecord)
async def log_event_skill(
    request: LogEventRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager", "architect", allow_service=True)),
) -> AuditEventRecord:
    """Persist an audit event emitted by the orchestrator or tools."""
    return log_event(db, request)
