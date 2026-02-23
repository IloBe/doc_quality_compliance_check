"""Document analysis service for arc42, UML, and model card checks."""
import re
import uuid
from typing import Optional

from ..core.logging_config import get_logger
from ..models.document import (
    DocumentAnalysisResult,
    DocumentSection,
    DocumentStatus,
    DocumentType,
)

logger = get_logger(__name__)

# arc42 required sections (12 sections)
ARC42_REQUIRED_SECTIONS: list[str] = [
    "introduction and goals",
    "constraints",
    "context and scope",
    "solution strategy",
    "building block view",
    "runtime view",
    "deployment view",
    "concepts",
    "architecture decisions",
    "quality requirements",
    "risks and technical debt",
    "glossary",
]

MODEL_CARD_REQUIRED_SECTIONS: list[str] = [
    "model details",
    "intended use",
    "factors",
    "metrics",
    "evaluation data",
    "training data",
    "quantitative analyses",
    "ethical considerations",
    "caveats and recommendations",
]

UML_DIAGRAM_TYPES: list[str] = [
    "system context diagram",
    "component diagram",
    "sequence diagram",
    "class diagram",
    "deployment diagram",
]


def detect_document_type(content: str, filename: str) -> DocumentType:
    """Detect document type from content and filename heuristics."""
    content_lower = content.lower()
    filename_lower = filename.lower()

    if "arc42" in content_lower or "arc42" in filename_lower:
        return DocumentType.ARC42
    if "model card" in content_lower or "modelcard" in filename_lower:
        return DocumentType.MODEL_CARD
    if "standard operating procedure" in content_lower or "sop" in filename_lower:
        return DocumentType.SOP
    if "requirements" in content_lower or "requirement" in filename_lower:
        return DocumentType.REQUIREMENTS
    if "risk" in content_lower and "assessment" in content_lower:
        return DocumentType.RISK_ASSESSMENT
    return DocumentType.UNKNOWN


def _check_sections(
    content: str, required_sections: list[str]
) -> tuple[list[DocumentSection], list[str]]:
    """Check which sections are present/missing in document content."""
    content_lower = content.lower()
    sections_found: list[DocumentSection] = []
    missing: list[str] = []

    for section_name in required_sections:
        pattern = re.compile(
            r'(^|\n)#{1,4}\s*' + re.escape(section_name), re.IGNORECASE
        )
        present = bool(pattern.search(content_lower))
        # Also check plain text match for non-markdown
        if not present and section_name in content_lower:
            present = True
        sections_found.append(
            DocumentSection(
                name=section_name,
                present=present,
                issues=[] if present else [f"Section '{section_name}' is missing or incomplete"],
            )
        )
        if not present:
            missing.append(section_name)

    return sections_found, missing


def analyze_arc42_document(content: str, document_id: str, filename: str) -> DocumentAnalysisResult:
    """Analyze a document against arc42 template requirements."""
    logger.info("analyzing_arc42_document", document_id=document_id, filename=filename)

    sections_found, missing_sections = _check_sections(content, ARC42_REQUIRED_SECTIONS)

    # Check for UML diagrams (look for diagram references or PlantUML blocks)
    uml_issues: list[str] = []
    for diagram in UML_DIAGRAM_TYPES[:3]:  # Check first 3 critical diagrams
        if diagram not in content.lower():
            uml_issues.append(f"Missing or undetected UML diagram: {diagram}")

    all_issues = [s.issues[0] for s in sections_found if s.issues] + uml_issues
    score = max(0.0, 1.0 - (len(missing_sections) / len(ARC42_REQUIRED_SECTIONS)))

    status = (
        DocumentStatus.PASSED
        if not missing_sections and not uml_issues
        else DocumentStatus.MODIFICATIONS_NEEDED
    )

    recommendations: list[str] = []
    if missing_sections:
        recommendations.append(
            f"Add the following arc42 sections: {', '.join(missing_sections[:3])}"
        )
    if uml_issues:
        recommendations.append(
            "Include required UML diagrams (system context, component, sequence)"
        )

    logger.info(
        "arc42_analysis_complete",
        document_id=document_id,
        score=score,
        missing_count=len(missing_sections),
    )

    return DocumentAnalysisResult(
        document_id=document_id,
        filename=filename,
        document_type=DocumentType.ARC42,
        status=status,
        sections_found=sections_found,
        missing_sections=missing_sections,
        overall_score=round(score, 2),
        issues=all_issues,
        recommendations=recommendations,
    )


def analyze_model_card(content: str, document_id: str, filename: str) -> DocumentAnalysisResult:
    """Analyze a model card document."""
    logger.info("analyzing_model_card", document_id=document_id, filename=filename)

    sections_found, missing_sections = _check_sections(content, MODEL_CARD_REQUIRED_SECTIONS)

    # Check EU AI Act relevant fields in model card
    eu_act_issues: list[str] = []
    eu_required = ["intended use", "ethical considerations"]
    for field in eu_required:
        if field not in content.lower():
            eu_act_issues.append(f"EU AI Act relevant field missing: {field}")

    all_issues = [s.issues[0] for s in sections_found if s.issues] + eu_act_issues
    score = max(0.0, 1.0 - (len(missing_sections) / len(MODEL_CARD_REQUIRED_SECTIONS)))
    status = DocumentStatus.PASSED if score >= 0.8 else DocumentStatus.MODIFICATIONS_NEEDED

    return DocumentAnalysisResult(
        document_id=document_id,
        filename=filename,
        document_type=DocumentType.MODEL_CARD,
        status=status,
        sections_found=sections_found,
        missing_sections=missing_sections,
        overall_score=round(score, 2),
        issues=all_issues,
        recommendations=(
            [f"Add missing model card sections: {', '.join(missing_sections[:3])}"]
            if missing_sections
            else []
        ),
    )


def analyze_document(
    content: str, filename: str, doc_type: Optional[DocumentType] = None
) -> DocumentAnalysisResult:
    """Main entry point: analyze document content and return result."""
    document_id = str(uuid.uuid4())
    if doc_type is None:
        doc_type = detect_document_type(content, filename)

    if doc_type == DocumentType.ARC42:
        return analyze_arc42_document(content, document_id, filename)
    if doc_type == DocumentType.MODEL_CARD:
        return analyze_model_card(content, document_id, filename)

    # Generic analysis for other document types
    logger.info("generic_document_analysis", document_id=document_id, doc_type=doc_type)
    return DocumentAnalysisResult(
        document_id=document_id,
        filename=filename,
        document_type=doc_type,
        status=DocumentStatus.PENDING,
        overall_score=0.5,
        issues=["No specific template checker available for this document type"],
        recommendations=["Define document type explicitly for detailed analysis"],
    )
