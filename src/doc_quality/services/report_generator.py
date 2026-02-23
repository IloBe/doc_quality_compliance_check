"""Report generation service producing PDF and HTML outputs."""
import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..core.logging_config import get_logger
from ..models.compliance import ComplianceCheckResult
from ..models.document import DocumentAnalysisResult
from ..models.report import ReportFormat, ReportResult, ReportType

logger = get_logger(__name__)


def _build_pdf_document_report(
    analysis: DocumentAnalysisResult,
    compliance: Optional[ComplianceCheckResult],
    reviewer_name: Optional[str],
) -> bytes:
    """Build PDF bytes from analysis and optional compliance results."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph("Document Quality & Compliance Report", styles["Title"]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(f"File: {analysis.filename}", styles["Normal"]))
    story.append(Paragraph(f"Document Type: {analysis.document_type.value}", styles["Normal"]))
    story.append(Paragraph(f"Generated: {datetime.utcnow().isoformat()}", styles["Normal"]))
    if reviewer_name:
        story.append(Paragraph(f"Reviewer: {reviewer_name}", styles["Normal"]))
    story.append(Spacer(1, 0.5 * cm))

    # Analysis Summary
    story.append(Paragraph("Analysis Summary", styles["Heading2"]))
    story.append(Paragraph(f"Status: {analysis.status.value}", styles["Normal"]))
    story.append(Paragraph(f"Quality Score: {analysis.overall_score:.0%}", styles["Normal"]))
    story.append(Spacer(1, 0.3 * cm))

    # Sections table
    if analysis.sections_found:
        story.append(Paragraph("Section Checklist", styles["Heading3"]))
        table_data = [["Section", "Status"]]
        for sec in analysis.sections_found:
            status_text = "Present" if sec.present else "Missing"
            table_data.append([sec.name.title(), status_text])
        t = Table(table_data, colWidths=[12 * cm, 4 * cm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E86AB")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#F0F0F0")],
                    ),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    # Issues
    if analysis.issues:
        story.append(Paragraph("Issues Found", styles["Heading3"]))
        for issue in analysis.issues:
            story.append(Paragraph(f"- {issue}", styles["Normal"]))
        story.append(Spacer(1, 0.3 * cm))

    # Recommendations
    if analysis.recommendations:
        story.append(Paragraph("Recommendations", styles["Heading3"]))
        for rec in analysis.recommendations:
            story.append(Paragraph(f"- {rec}", styles["Normal"]))
        story.append(Spacer(1, 0.3 * cm))

    # Compliance section
    if compliance:
        story.append(Paragraph("Compliance Check Results", styles["Heading2"]))
        story.append(Paragraph(compliance.summary, styles["Normal"]))
        story.append(Spacer(1, 0.3 * cm))
        if compliance.mandatory_gaps:
            story.append(Paragraph("Mandatory Gaps", styles["Heading3"]))
            for gap in compliance.mandatory_gaps:
                story.append(Paragraph(f"- {gap}", styles["Normal"]))

    doc.build(story)
    return buffer.getvalue()


def generate_report(
    analysis: DocumentAnalysisResult,
    report_type: ReportType,
    report_format: ReportFormat,
    output_dir: str = "reports",
    compliance: Optional[ComplianceCheckResult] = None,
    reviewer_name: Optional[str] = None,
) -> ReportResult:
    """Generate a report and save it to output_dir."""
    report_id = str(uuid.uuid4())
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    logger.info("generating_report", report_id=report_id, format=report_format)

    file_path: Optional[str] = None
    summary = f"Report for {analysis.filename}: score={analysis.overall_score:.0%}"

    if report_format == ReportFormat.PDF:
        pdf_bytes = _build_pdf_document_report(analysis, compliance, reviewer_name)
        file_name = f"report_{report_id}.pdf"
        full_path = output_path / file_name
        full_path.write_bytes(pdf_bytes)
        file_path = str(full_path)

    logger.info("report_generated", report_id=report_id, file_path=file_path)

    return ReportResult(
        report_id=report_id,
        document_id=analysis.document_id,
        report_type=report_type,
        report_format=report_format,
        file_path=file_path,
        summary=summary,
    )
