"""API routes for report generation."""
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ...models.document import DocumentAnalysisResult, DocumentStatus, DocumentType
from ...models.report import ReportFormat, ReportRequest, ReportResult, ReportType
from ...services.report_generator import generate_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=ReportResult)
async def create_report(request: ReportRequest) -> ReportResult:
    """Generate a report for an analyzed document."""
    # Create a minimal analysis result for demo (in production, load from storage)
    dummy_analysis = DocumentAnalysisResult(
        document_id=request.document_id,
        filename="document.md",
        document_type=DocumentType.ARC42,
        status=DocumentStatus.PASSED,
        overall_score=0.85,
    )
    return generate_report(
        analysis=dummy_analysis,
        report_type=request.report_type,
        report_format=request.report_format,
        reviewer_name=request.reviewer_name,
    )


@router.get("/download/{report_id}")
async def download_report(report_id: str) -> FileResponse:
    """Download a generated report by ID."""
    reports_dir = Path("reports")
    candidates = list(reports_dir.glob(f"report_{report_id}.*")) if reports_dir.exists() else []
    if not candidates:
        raise HTTPException(status_code=404, detail="Report not found")

    file_path = candidates[0]
    media_type = "application/pdf" if file_path.suffix == ".pdf" else "text/html"
    return FileResponse(str(file_path), media_type=media_type, filename=file_path.name)
