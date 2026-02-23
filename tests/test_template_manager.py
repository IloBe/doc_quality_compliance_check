"""Unit tests for the template manager service."""
from pathlib import Path
import pytest
from src.doc_quality.services.template_manager import (
    ACTIVE_TEMPLATES,
    ALL_TEMPLATES,
    INACTIVE_TEMPLATES,
    get_template_by_id,
    get_template_index,
    list_templates,
)


def test_list_templates_returns_all():
    templates = list_templates()
    assert len(templates) == len(ALL_TEMPLATES)


def test_active_templates_count():
    assert len(ACTIVE_TEMPLATES) == 6


def test_inactive_templates_exist():
    assert len(INACTIVE_TEMPLATES) > 0


def test_unknown_template_returns_none():
    assert get_template_by_id("nonexistent_template_xyz") is None


def test_inactive_template_returns_placeholder():
    result = get_template_by_id("test_strategy")  # Known inactive template
    assert result is not None
    assert "inactive" in result.lower()


def test_template_index_contains_active():
    index = get_template_index()
    assert "business_goals" in index
    assert "stakeholders" in index
    assert "Active Templates" in index


def test_template_index_contains_inactive():
    index = get_template_index()
    assert "Inactive Templates" in index


def test_get_template_with_file(tmp_path):
    # Create a temporary SOP template file
    sop_dir = tmp_path / "sop"
    sop_dir.mkdir()
    template_file = sop_dir / "sop_business_goals.md"
    template_file.write_text("# Business Goals\n\nTemplate content here.")

    result = get_template_by_id("business_goals", templates_dir=str(sop_dir))
    assert result is not None
    assert "Business Goals" in result
