"""API routes for document upload and analysis."""
from io import BytesIO
from datetime import datetime

from docx import Document as DocxDocument
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
from ...core.session_auth import require_roles
from ...core.security import sanitize_text, validate_file_size, validate_filename
from ...models.document import DocumentAnalysisResult, DocumentStatus, DocumentType
from ...models.orm import DocumentLockORM
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
    persist_document(
        db,
        filename=filename,
        content_type="text/plain",
        extracted_text=content,
        document_type=result.document_type,
        source="analyze_text",
        document_id=result.document_id,
    )
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
    persist_document(
        db,
        filename=filename,
        content_type=file.content_type or "application/octet-stream",
        extracted_text=content,
        document_type=result.document_type,
        source="upload",
        document_id=result.document_id,
    )
    return result


@router.get("/{document_id}", response_model=DocumentAnalysisResult)
async def get_document_by_id(
    document_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "architect", "riskmanager", "auditor")),
) -> DocumentAnalysisResult:
    """Retrieve a document by ID from persistent storage."""
    document = get_document_from_db(db, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {document_id}")
    
    return DocumentAnalysisResult(
        document_id=document.document_id,
        filename=document.filename,
        document_type=DocumentType(document.document_type),
        status=DocumentStatus.PENDING,
        overall_score=0.0,  # Placeholder; actual score would need to be stored separately
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
    
    active_locks = {row.document_id: row for row in db.query(DocumentLockORM).all()}

    documents = [
        DocumentSummaryResponse(
            document_id=doc.document_id,
            filename=doc.filename,
            document_type=DocumentType(doc.document_type),
            overall_score=0.0,
            status=_workflow_status_to_tag(getattr(doc, "workflow_status", None)),
            updated_at=doc.updated_at,
            locked_by=active_locks.get(doc.document_id).locked_by if active_locks.get(doc.document_id) else None,
        )
        for doc in search_result.results
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
