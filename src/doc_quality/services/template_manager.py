"""SOP template management service."""
from pathlib import Path
from typing import Optional

from ..core.logging_config import get_logger

logger = get_logger(__name__)

# The 6 primary active templates
ACTIVE_TEMPLATES: list[dict] = [
    {"id": "business_goals", "title": "Business and Product Goals", "file": "sop_business_goals.md", "active": True},
    {"id": "stakeholders", "title": "Stakeholders", "file": "sop_stakeholders.md", "active": True},
    {"id": "architecture", "title": "Technical Architectural System and Components Overview", "file": "sop_architecture.md", "active": True},
    {"id": "quality_requirements", "title": "Quality Requirements", "file": "sop_quality_requirements.md", "active": True},
    {"id": "risk_assessment", "title": "Risk Assessment", "file": "sop_risk_assessment.md", "active": True},
    {"id": "glossary", "title": "Glossary", "file": "sop_glossary.md", "active": True},
]

# Future templates (inactive)
INACTIVE_TEMPLATES: list[dict] = [
    {"id": "test_strategy", "title": "Test Strategy", "file": "sop_test_strategy.md", "active": False},
    {"id": "deployment", "title": "Deployment and Operations", "file": "sop_deployment.md", "active": False},
    {"id": "data_governance", "title": "Data Governance", "file": "sop_data_governance.md", "active": False},
    {"id": "security", "title": "Security Concept", "file": "sop_security.md", "active": False},
]

ALL_TEMPLATES = ACTIVE_TEMPLATES + INACTIVE_TEMPLATES


def list_templates() -> list[dict]:
    """Return all templates (active and inactive)."""
    return ALL_TEMPLATES


def get_template_by_id(template_id: str, templates_dir: str = "templates/sop") -> Optional[str]:
    """Return template content for a given template ID."""
    template_meta = next((t for t in ALL_TEMPLATES if t["id"] == template_id), None)
    if template_meta is None:
        logger.warning("template_not_found", template_id=template_id)
        return None

    if not template_meta["active"]:
        logger.info("template_inactive", template_id=template_id)
        return f"# {template_meta['title']}\n\n*This template is inactive and not yet available.*\n"

    template_path = Path(templates_dir) / template_meta["file"]
    if not template_path.exists():
        logger.error("template_file_missing", path=str(template_path))
        return None

    return template_path.read_text(encoding="utf-8")


def get_template_index(templates_dir: str = "templates/sop") -> str:
    """Return a formatted index page of all templates."""
    lines = ["# Document Templates Index\n"]
    lines.append("## Active Templates\n")
    for tmpl in ACTIVE_TEMPLATES:
        lines.append(f"- **{tmpl['title']}** (`{tmpl['id']}`)\n")
    lines.append("\n## Inactive Templates (Future Milestones)\n")
    for tmpl in INACTIVE_TEMPLATES:
        lines.append(f"- ~~{tmpl['title']}~~ (`{tmpl['id']}`) — *inactive*\n")
    return "".join(lines)
