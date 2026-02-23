"""Unit tests for the report generator service."""
import pytest
from pathlib import Path
from src.doc_quality.models.document import DocumentAnalysisResult, DocumentStatus, DocumentType
from src.doc_quality.models.report import ReportFormat, ReportType
from src.doc_quality.services.report_generator import generate_report


@pytest.fixture
def sample_analysis() -> DocumentAnalysisResult:
    return DocumentAnalysisResult(
        document_id="test-doc-001",
        filename="architecture.md",
        document_type=DocumentType.ARC42,
        status=DocumentStatus.PASSED,
        overall_score=0.85,
        issues=["Missing deployment diagram"],
        recommendations=["Add UML deployment diagram"],
    )


def test_generate_pdf_report(sample_analysis, tmp_path):
    result = generate_report(
        analysis=sample_analysis,
        report_type=ReportType.DOCUMENT_ANALYSIS,
        report_format=ReportFormat.PDF,
        output_dir=str(tmp_path),
    )
    assert result.report_id is not None
    assert result.file_path is not None
    assert Path(result.file_path).exists()
    assert result.file_path.endswith(".pdf")


def test_generate_report_summary(sample_analysis, tmp_path):
    result = generate_report(
        analysis=sample_analysis,
        report_type=ReportType.DOCUMENT_ANALYSIS,
        report_format=ReportFormat.PDF,
        output_dir=str(tmp_path),
    )
    assert "architecture.md" in result.summary
    assert "85%" in result.summary


def test_generate_report_with_reviewer(sample_analysis, tmp_path):
    result = generate_report(
        analysis=sample_analysis,
        report_type=ReportType.COMPLIANCE_AUDIT,
        report_format=ReportFormat.PDF,
        output_dir=str(tmp_path),
        reviewer_name="Alice Smith",
    )
    assert result.report_id is not None
    assert result.file_path is not None
