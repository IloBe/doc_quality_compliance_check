"""Explicit backend Skills API for orchestrator tool calls."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
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
from ...services.skills_service import extract_text, get_document, log_event, search_documents, write_finding

router = APIRouter(prefix="/skills", tags=["skills"])


@router.post("/get_document", response_model=SkillDocumentRecord)
async def get_document_skill(request: GetDocumentRequest, db: Session = Depends(get_db)) -> SkillDocumentRecord:
    """Return a stored document by id."""
    result = get_document(db, request.document_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {request.document_id}")
    return result


@router.post("/search_documents", response_model=SearchDocumentsResponse)
async def search_documents_skill(
    request: SearchDocumentsRequest,
    db: Session = Depends(get_db),
) -> SearchDocumentsResponse:
    """Search stored documents for orchestrator/tool use."""
    return search_documents(db, request)


@router.post("/extract_text", response_model=ExtractTextResponse)
async def extract_text_skill(
    request: ExtractTextRequest,
    db: Session = Depends(get_db),
) -> ExtractTextResponse:
    """Extract text from a stored or inline document."""
    settings = get_settings()
    try:
        return extract_text(db, request, settings.max_file_size_mb)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/write_finding", response_model=FindingRecord)
async def write_finding_skill(
    request: WriteFindingRequest,
    db: Session = Depends(get_db),
) -> FindingRecord:
    """Persist a finding for a stored document."""
    try:
        return write_finding(db, request)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/log_event", response_model=AuditEventRecord)
async def log_event_skill(request: LogEventRequest, db: Session = Depends(get_db)) -> AuditEventRecord:
    """Persist an audit event emitted by the orchestrator or tools."""
    return log_event(db, request)
