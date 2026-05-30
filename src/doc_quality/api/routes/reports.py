"""API routes for report generation."""
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.purpose_access import ACCESS_PURPOSE_HEADER, EXPORT_ALLOWED_PURPOSES, enforce_sensitive_access_purpose
from ...core.session_auth import require_roles
from ...services.bridge_privacy_service import assess_output_ip_risk
from ...models.document import DocumentAnalysisResult, DocumentStatus, DocumentType
from ...models.report import ReportFormat, ReportRequest, ReportResult, ReportType
from ...services.report_generator import generate_report
from ...services.skills_service import get_document

router = APIRouter(prefix="/reports", tags=["reports"])


def _resolve_document_type(raw_value: str | None) -> DocumentType:
    normalized = (raw_value or "").strip().lower()
    if not normalized:
        return DocumentType.UNKNOWN

    for document_type in DocumentType:
        if document_type.value == normalized:
            return document_type
    return DocumentType.UNKNOWN


@router.post("/generate", response_model=ReportResult)
async def create_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager")),
) -> ReportResult:
    """Generate a report for an analyzed document."""
    document = get_document(db, request.document_id, include_extracted_text=True)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {request.document_id}")

    output_ip_risk = assess_output_ip_risk(document.extracted_text)
    if output_ip_risk.risk_level in {"medium", "high"}:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Report generation blocked by output IP-risk policy.",
                "reason": "report_output_ip_risk_blocked",
                "action_points": [
                    "Review the document for copyright, trademark, and verbatim-copy indicators.",
                    "Obtain human approval before generating or exporting the report.",
                ],
                "details": [
                    output_ip_risk.summary,
                    *[f"signal:{signal}" for signal in output_ip_risk.matched_signals],
                ],
            },
        )

    dummy_analysis = DocumentAnalysisResult(
        document_id=request.document_id,
        filename=document.filename,
        document_type=_resolve_document_type(getattr(document, "document_type", None)),
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
async def download_report(
    report_id: str,
    access_purpose: str | None = Header(default=None, alias=ACCESS_PURPOSE_HEADER),
    _user=Depends(require_roles("qm_lead", "auditor", "riskmanager")),
) -> FileResponse:
    """Download a generated report by ID."""
    enforce_sensitive_access_purpose(
        access_purpose=access_purpose,
        allowed_purposes=EXPORT_ALLOWED_PURPOSES,
        resource_label="reports.download",
    )
    reports_dir = Path("reports")
    candidates = list(reports_dir.glob(f"report_{report_id}.*")) if reports_dir.exists() else []
    if not candidates:
        raise HTTPException(status_code=404, detail="Report not found")

    file_path = candidates[0]
    media_type = "application/pdf" if file_path.suffix == ".pdf" else "text/html"
    return FileResponse(str(file_path), media_type=media_type, filename=file_path.name)
