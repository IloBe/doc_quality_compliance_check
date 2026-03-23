"""API routes for document upload and analysis."""
from io import BytesIO

from docx import Document as DocxDocument
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
from ...core.security import sanitize_text, validate_file_size, validate_filename
from ...models.document import DocumentAnalysisResult, DocumentType
from ...services.document_analyzer import analyze_document
from ...services.skills_service import persist_document

router = APIRouter(prefix="/documents", tags=["documents"])


class AnalyzeTextRequest(BaseModel):
    content: str
    filename: str
    doc_type: DocumentType | None = None


@router.post("/analyze", response_model=DocumentAnalysisResult)
async def analyze_document_text(
    request: AnalyzeTextRequest,
    db: Session = Depends(get_db),
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
async def upload_document(file: UploadFile, db: Session = Depends(get_db)) -> DocumentAnalysisResult:
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
