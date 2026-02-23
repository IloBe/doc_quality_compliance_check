"""Unit tests for the document analyzer service."""
import pytest
from src.doc_quality.models.document import DocumentStatus, DocumentType
from src.doc_quality.services.document_analyzer import (
    ARC42_REQUIRED_SECTIONS,
    analyze_arc42_document,
    analyze_model_card,
    detect_document_type,
)


def test_detect_arc42_type():
    assert detect_document_type("# arc42 Architecture", "architecture.md") == DocumentType.ARC42


def test_detect_model_card_type():
    assert (
        detect_document_type("# Model Card\n## Intended Use", "modelcard.md")
        == DocumentType.MODEL_CARD
    )


def test_detect_unknown_type():
    assert detect_document_type("Random content", "notes.txt") == DocumentType.UNKNOWN


def test_arc42_analysis_complete(sample_arc42_content):
    result = analyze_arc42_document(sample_arc42_content, "doc-1", "architecture.md")
    assert result.document_type == DocumentType.ARC42
    assert result.overall_score > 0.9
    assert result.status == DocumentStatus.PASSED


def test_arc42_analysis_missing_sections():
    content = "# Introduction and Goals\nSome content"
    result = analyze_arc42_document(content, "doc-2", "partial.md")
    assert result.status == DocumentStatus.MODIFICATIONS_NEEDED
    assert len(result.missing_sections) > 0
    assert result.overall_score < 1.0


def test_model_card_analysis_complete(sample_model_card_content):
    result = analyze_model_card(sample_model_card_content, "doc-3", "model.md")
    assert result.document_type == DocumentType.MODEL_CARD
    assert result.overall_score > 0.8


def test_model_card_analysis_incomplete():
    content = "# Model Card\n## Model Details\nSome model info"
    result = analyze_model_card(content, "doc-4", "incomplete_model.md")
    assert result.status == DocumentStatus.MODIFICATIONS_NEEDED
    assert len(result.missing_sections) > 0
