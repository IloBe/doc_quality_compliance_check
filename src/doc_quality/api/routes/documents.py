"""API routes for document upload and analysis."""
from dataclasses import asdict
from io import BytesIO
from datetime import datetime

from docx import Document as DocxDocument
from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
from ...core.privacy_payload_guard import assess_sensitive_output_exposure
from ...core.purpose_access import ACCESS_PURPOSE_HEADER, CONTENT_READ_ALLOWED_PURPOSES, enforce_sensitive_access_purpose
from ...core.session_auth import require_roles
from ...core.security import sanitize_text, validate_file_size, validate_filename
from ...models.document import DocumentAnalysisResult, DocumentStatus, DocumentType
from ...services.bridge_privacy_service import assess_output_ip_risk
from ...services.document_analyzer import analyze_document
from ...services.document_lock_service import acquire_lock, get_lock_state, release_lock
from ...services.skills_service import get_document as get_document_from_db, persist_document, search_documents

router = APIRouter(prefix="/documents", tags=["documents"])


def _workflow_status_to_tag(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized == "in_review":
        return "In Review"
    if normalized == "approved":
        return "Approved"
    if normalized == "rework_after_review":
        return "rework after review"
    return "Draft"


class AnalyzeTextRequest(BaseModel):
    content: str
    filename: str
    doc_type: DocumentType | None = None


class DocumentSummaryResponse(BaseModel):
    """Document metadata used by frontend listing/get endpoints."""

    document_id: str
    filename: str
    document_type: DocumentType
    overall_score: float = 0.0
    status: str = "Draft"
    version: str = "0.1.0"
    product: str = "AI-Diagnostics-Core"
    updated_at: datetime | None = None
    updated_by: str | None = None
    locked_by: str | None = None


class DocumentDetailResponse(BaseModel):
    """Document detail payload including extracted content for reader surfaces."""

    document_id: str
    filename: str
    document_type: DocumentType
    status: str = "Draft"
    overall_score: float = 0.0
    version: str = "0.1.0"
    product: str = "AI-Diagnostics-Core"
    updated_at: datetime | None = None
    updated_by: str | None = None
    locked_by: str | None = None
    extracted_text: str = ""


class DocumentListResponse(BaseModel):
    """Response model for document list endpoint."""

    documents: list[DocumentSummaryResponse]


class AcquireLockRequest(BaseModel):
    """Acquire/renew lock request."""

    actor_id: str
    ttl_minutes: int = 30


class ReleaseLockRequest(BaseModel):
    """Release lock request."""

    actor_id: str


class DocumentLockResponse(BaseModel):
    """Document lock response payload."""

    ok: bool
    document_id: str
    locked_by: str | None = None
    locked_at: datetime | None = None
    expires_at: datetime | None = None
    message: str


class SearchDocumentsRequest(BaseModel):
    """Request model for document search."""
    query: str = ""
    limit: int = 50


def _document_content_block_detail(*, message: str, reason: str, signals: list[str], output_ip_risk: object) -> dict[str, object]:
    return {
        "reason": reason,
        "message": message,
        "details": signals,
        "action_points": [
            "Use summary metadata only and avoid exposing raw extracted text directly.",
            "Redact sensitive secret/trade-secret segments and retry document retrieval.",
            "Escalate to a compliance reviewer if full text access is required for audit exceptions.",
        ],
        "output_ip_risk": output_ip_risk,
    }


@router.post("/analyze", response_model=DocumentAnalysisResult)
async def analyze_document_text(
    request: AnalyzeTextRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentAnalysisResult:
    """Analyze a document provided as text content."""
    content = sanitize_text(request.content)
    try:
        filename = validate_filename(request.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    result = analyze_document(content, filename, request.doc_type)
    persisted = persist_document(
        db,
        filename=filename,
        content_type="text/plain",
        extracted_text=content,
        document_type=result.document_type,
        source="analyze_text",
        document_id=result.document_id,
    )
    result.document_id = persisted.document_id
    return result


@router.post("/upload", response_model=DocumentAnalysisResult)
async def upload_document(
    file: UploadFile,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentAnalysisResult:
    """Upload and analyze a document file."""
    settings = get_settings()

    if file.filename is None:
        raise HTTPException(status_code=400, detail="Filename is required")

    try:
        filename = validate_filename(file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    content_bytes = await file.read()
    try:
        validate_file_size(len(content_bytes), settings.max_file_size_mb)
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc

    extension = filename.rsplit(".", 1)[-1].lower()
    if extension in {"md", "txt"}:
        try:
            content = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = content_bytes.decode("latin-1")
    elif extension == "pdf":
        reader = PdfReader(BytesIO(content_bytes))
        content = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif extension == "docx":
        document = DocxDocument(BytesIO(content_bytes))
        content = "\n".join(paragraph.text for paragraph in document.paragraphs)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{extension}")

    content = sanitize_text(content)
    result = analyze_document(content, filename)
    persisted = persist_document(
        db,
        filename=filename,
        content_type=file.content_type or "application/octet-stream",
        extracted_text=content,
        document_type=result.document_type,
        source="upload",
        document_id=result.document_id,
    )
    result.document_id = persisted.document_id
    return result


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document_by_id(
    document_id: str,
    access_purpose: str | None = Header(default=None, alias=ACCESS_PURPOSE_HEADER),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentDetailResponse:
    """Retrieve a document by ID from persistent storage."""
    document = get_document_from_db(db, document_id, include_extracted_text=True)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")

    enforce_sensitive_access_purpose(
        access_purpose=access_purpose,
        allowed_purposes=CONTENT_READ_ALLOWED_PURPOSES,
        resource_label="documents.detail.extracted_text",
    )

    sensitive_output = assess_sensitive_output_exposure(document.extracted_text or "")
    output_ip_risk = assess_output_ip_risk(document.extracted_text or "")
    if sensitive_output.blocked:
        raise HTTPException(
            status_code=422,
            detail=_document_content_block_detail(
                message="Document content delivery blocked due to sensitive secret/trade-secret exposure signals.",
                reason="document_sensitive_output_blocked",
                signals=list(sensitive_output.matched_signals),
                output_ip_risk=asdict(output_ip_risk),
            ),
        )
    if output_ip_risk.risk_level in {"medium", "high"}:
        raise HTTPException(
            status_code=422,
            detail=_document_content_block_detail(
                message="Document content delivery blocked due to output IP-risk signals.",
                reason="document_output_ip_risk_blocked",
                signals=list(output_ip_risk.matched_signals),
                output_ip_risk=asdict(output_ip_risk),
            ),
        )

    lock_state = get_lock_state(db, document_id)
    return DocumentDetailResponse(
        document_id=document.document_id,
        filename=document.filename,
        document_type=DocumentType(document.document_type),
        status=_workflow_status_to_tag(getattr(document, "workflow_status", None)),
        overall_score=0.0,
        updated_at=document.updated_at,
        locked_by=lock_state.locked_by,
        extracted_text=document.extracted_text or "",
    )


@router.get("/{document_id}/summary", response_model=DocumentSummaryResponse)
async def get_document_summary_by_id(
    document_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentSummaryResponse:
    """Retrieve a document summary by ID including current lock state."""
    document = get_document_from_db(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")

    lock_state = get_lock_state(db, document_id)
    return DocumentSummaryResponse(
        document_id=document.document_id,
        filename=document.filename,
        document_type=DocumentType(document.document_type),
        overall_score=0.0,
        status=_workflow_status_to_tag(getattr(document, "workflow_status", None)),
        updated_at=document.updated_at,
        locked_by=lock_state.locked_by,
    )


@router.get("", response_model=DocumentListResponse)
async def list_all_documents(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentListResponse:
    """List all documents from persistent storage (database)."""
    from ...models.skills import SearchDocumentsRequest as SkillsSearchRequest
    
    # Use the skills service to search for documents with a valid bounded limit.
    # SkillsSearchRequest enforces limit <= 100.
    search_result = search_documents(db, SkillsSearchRequest(query="", limit=100))

    unique_by_filename: dict[str, object] = {}
    for doc in search_result.results:
        key = (doc.filename or doc.document_id).strip().lower()
        current = unique_by_filename.get(key)
        if current is None:
            unique_by_filename[key] = doc
            continue

        current_updated = getattr(current, "updated_at", None)
        next_updated = getattr(doc, "updated_at", None)
        if next_updated and (not current_updated or next_updated >= current_updated):
            unique_by_filename[key] = doc
    
    documents = [
        DocumentSummaryResponse(
            document_id=doc.document_id,
            filename=doc.filename,
            document_type=DocumentType(doc.document_type),
            overall_score=0.0,
            status=_workflow_status_to_tag(getattr(doc, "workflow_status", None)),
            updated_at=doc.updated_at,
            locked_by=get_lock_state(db, doc.document_id).locked_by,
        )
        for doc in unique_by_filename.values()
    ]
    
    return DocumentListResponse(documents=documents)


@router.get("/{document_id}/lock", response_model=DocumentLockResponse)
async def get_document_lock(
    document_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentLockResponse:
    """Get active lock owner for a document."""
    state = get_lock_state(db, document_id)
    return DocumentLockResponse(
        ok=True,
        document_id=document_id,
        locked_by=state.locked_by,
        locked_at=state.locked_at,
        expires_at=state.expires_at,
        message="Lock state loaded",
    )


@router.post("/{document_id}/lock/acquire", response_model=DocumentLockResponse)
async def acquire_document_lock(
    document_id: str,
    request: AcquireLockRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentLockResponse:
    """Acquire or renew a document lock."""
    try:
        result = acquire_lock(
            db,
            document_id=document_id,
            actor_id=request.actor_id,
            ttl_minutes=request.ttl_minutes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not result.ok and result.message == "Document not found":
        raise HTTPException(status_code=404, detail=result.message)
    if not result.ok:
        raise HTTPException(
            status_code=409,
            detail={
                "message": result.message,
                "locked_by": result.locked_by,
            },
        )

    return DocumentLockResponse(
        ok=True,
        document_id=result.document_id,
        locked_by=result.locked_by,
        locked_at=result.locked_at,
        expires_at=result.expires_at,
        message=result.message,
    )


@router.post("/{document_id}/lock/release", response_model=DocumentLockResponse)
async def release_document_lock(
    document_id: str,
    request: ReleaseLockRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentLockResponse:
    """Release a document lock owned by the caller actor."""
    try:
        result = release_lock(db, document_id=document_id, actor_id=request.actor_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not result.ok:
        raise HTTPException(
            status_code=403,
            detail={
                "message": result.message,
                "locked_by": result.locked_by,
            },
        )

    return DocumentLockResponse(
        ok=True,
        document_id=result.document_id,
        locked_by=result.locked_by,
        locked_at=result.locked_at,
        expires_at=result.expires_at,
        message=result.message,
    )
