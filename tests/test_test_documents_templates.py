from __future__ import annotations

from pathlib import Path


_DOCS_DIR = Path(__file__).resolve().parents[1] / "docs" / "test_documents"


def _read(name: str) -> str:
    return (_DOCS_DIR / name).read_text(encoding="utf-8")


def test_arc42_happy_fixture_follows_arc42_structure() -> None:
    content = _read("05_arc42_architecture_happy.md")

    required_headings = [
        "## 1. Introduction and Goals",
        "## 2. Constraints",
        "## 3. Context and Scope",
        "## 4. Solution Strategy",
        "## 5. Building Block View",
        "## 6. Runtime View",
        "## 7. Deployment View",
        "## 8. Concepts",
        "## 9. Architecture Decisions",
        "## 10. Quality Requirements",
        "## 11. Risks and Technical Debt",
        "## 12. Glossary",
    ]
    for heading in required_headings:
        assert heading in content

    # Required UML wording used by document analyzer checks.
    assert "system context diagram" in content.lower()
    assert "component diagram" in content.lower()
    assert "sequence diagram" in content.lower()


def test_arc42_failure_fixture_is_template_styled_but_incomplete() -> None:
    content = _read("05_arc42_architecture_failure.md")

    # Still arc42 styled.
    assert content.startswith("# arc42 Architecture Documentation")
    assert "## 1. Introduction and Goals" in content

    # Intentionally missing required sections for negative-path behavior.
    assert "## 2. Constraints" not in content
    assert "## 7. Deployment View" not in content
    assert "## 12. Glossary" not in content


def test_sop_fixtures_follow_sop_structure() -> None:
    full_sop_files = [
        "01_quality_management_plan_happy.md",
        "02_ai_risk_management_sop_happy.md",
        "03_fmea_template_happy.md",
        "04_risk_management_plan_happy.md",
        "06_data_privacy_failure.md",
    ]

    for name in full_sop_files:
        content = _read(name)
        assert content.startswith("# Standard Operating Procedure")
        assert "**Document ID:**" in content
        assert "## 1. Purpose" in content
        assert "## 2. Scope" in content
        assert "## 10. Document History" in content

    # Compact happy-path privacy fixture intentionally stays short to avoid
    # triggering large-text personal-data classification.
    compact_privacy = _read("06_data_privacy_happy.md")
    assert compact_privacy.startswith("# Standard Operating Procedure")
    assert "**Document ID:**" in compact_privacy
    assert "## 1. Purpose" in compact_privacy
    assert "## 2. Scope" in compact_privacy


def test_txt_failure_fixtures_follow_consistent_negative_template() -> None:
    failure_txt_files = [
        "01_quality_management_plan_failure.txt",
        "02_ai_risk_management_sop_failure.txt",
        "03_fmea_template_failure.txt",
        "04_risk_management_plan_failure.txt",
    ]

    required_markers = [
        "NEGATIVE TEMPLATE FIXTURE:",
        "Fixture metadata:",
        "- Path: failure path",
        "- Template style: negative-template v1",
        "1) Purpose (intentionally wrong)",
        "2) Scope (intentionally wrong)",
        "3) Governance gaps",
        "4) Unsafe instructions",
        "5) Missing required controls",
        "6) Incorrect claims (intentionally included)",
        "Expected review outcome:",
        "- reject or rework",
    ]

    for name in failure_txt_files:
        content = _read(name)
        for marker in required_markers:
            assert marker in content
