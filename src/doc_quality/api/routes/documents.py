"""API routes for document upload and analysis."""
from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from ...core.config import get_settings
from ...core.security import sanitize_text, validate_file_size, validate_filename
from ...models.document import DocumentAnalysisResult, DocumentType
from ...services.document_analyzer import analyze_document

router = APIRouter(prefix="/documents", tags=["documents"])


class AnalyzeTextRequest(BaseModel):
    content: str
    filename: str
    doc_type: DocumentType | None = None


@router.post("/analyze", response_model=DocumentAnalysisResult)
async def analyze_document_text(request: AnalyzeTextRequest) -> DocumentAnalysisResult:
    """Analyze a document provided as text content."""
    content = sanitize_text(request.content)
    try:
        filename = validate_filename(request.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return analyze_document(content, filename, request.doc_type)


@router.post("/upload", response_model=DocumentAnalysisResult)
async def upload_document(file: UploadFile) -> DocumentAnalysisResult:
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

    # Decode text content (works for .md, .txt files)
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content = content_bytes.decode("latin-1")

    content = sanitize_text(content)
    return analyze_document(content, filename)
