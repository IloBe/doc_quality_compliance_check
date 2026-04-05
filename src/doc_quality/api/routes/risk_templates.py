"""API routes for risk template management (RMF & FMEA) with PostgreSQL persistence,
CSV export, and Anthropic Claude AI-assist for intelligent field suggestions.

Design follows SAD Section 1: KISS, SRP, graceful degradation when AI key or DB is absent.
"""
from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ...core.config import get_settings
from ...core.database import get_db
from ...core.session_auth import require_roles
from ...models.orm import RiskTemplateORM, RiskTemplateRowORM
from ...models.risk_template import (
    AiSuggestRowRequest,
    AiSuggestRowResponse,
    CreateRiskTemplateRequest,
    EnsureDefaultRiskTemplateRequest,
    FmeaRowData,
    RiskTemplate,
    RiskTemplateListResponse,
    RiskTemplateRow,
    RiskTemplateSummary,
    RmfRowData,
    UpdateRiskTemplateRequest,
)
from ...services.risk_template_seeder import RiskTemplateSeeder, RiskTemplateSeedContext

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/risk-templates", tags=["risk-templates"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ALLOWED_ROLES = ("qm_lead", "riskmanager", "architect", "auditor")
_DEFAULT_TEMPLATE_TITLES = {
    "RMF": "Default RMF Template",
    "FMEA": "Default FMEA Template",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id(prefix: str = "RT") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


def _template_to_summary(orm: RiskTemplateORM, row_count: int) -> RiskTemplateSummary:
    return RiskTemplateSummary(
        template_id=orm.template_id,
        template_type=orm.template_type,  # type: ignore[arg-type]
        template_title=orm.template_title,
        product=orm.product,
        version=orm.version,
        status=orm.status,
        created_by=orm.created_by,
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        row_count=row_count,
    )


def _template_to_full(orm: RiskTemplateORM, row_orms: list[RiskTemplateRowORM]) -> RiskTemplate:
    rows = [
        RiskTemplateRow(
            row_id=r.row_id,
            template_id=r.template_id,
            row_order=r.row_order,
            row_data=r.row_data,
            created_at=r.created_at,
        )
        for r in sorted(row_orms, key=lambda x: x.row_order)
    ]
    return RiskTemplate(
        template_id=orm.template_id,
        template_type=orm.template_type,  # type: ignore[arg-type]
        template_title=orm.template_title,
        product=orm.product,
        version=orm.version,
        status=orm.status,  # type: ignore[arg-type]
        created_by=orm.created_by,
        metadata=orm.template_metadata or {},
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        rows=rows,
    )


def _is_default_template(orm: RiskTemplateORM) -> bool:
    metadata = orm.template_metadata or {}
    return bool(metadata.get("is_default"))


def _canonical_default_metadata(template_type: str) -> dict[str, str | bool]:
    return {
        "is_default": True,
        "default_scope": "canonical",
        "managed_by": "server",
        "default_template_type": template_type,
    }


def _seed_rows_for_type(template_type: str, *, product: str, created_by: str) -> list[dict]:
    seed_context = RiskTemplateSeedContext(
        template_title=_DEFAULT_TEMPLATE_TITLES[template_type],
        product=product,
        rationale="System-managed canonical default template",
        created_by=created_by,
    )
    if template_type == "RMF":
        return RiskTemplateSeeder.seed_rmf_rows(seed_context)
    return RiskTemplateSeeder.seed_fmea_rows(seed_context)


def _replace_template_rows(
    db: Session,
    *,
    template_id: str,
    rows_to_persist: list[dict],
    now: datetime,
) -> list[RiskTemplateRowORM]:
    db.query(RiskTemplateRowORM).filter(RiskTemplateRowORM.template_id == template_id).delete()
    row_orms: list[RiskTemplateRowORM] = []
    for idx, row_dict in enumerate(rows_to_persist):
        row_orm = RiskTemplateRowORM(
            row_id=_new_id("RR"),
            template_id=template_id,
            row_order=idx,
            row_data=row_dict,
            created_at=now,
        )
        db.add(row_orm)
        row_orms.append(row_orm)
    return row_orms


def _find_default_template(db: Session, *, template_type: str, product: str) -> RiskTemplateORM | None:
    candidates = (
        db.query(RiskTemplateORM)
        .filter(RiskTemplateORM.template_type == template_type)
        .filter(RiskTemplateORM.product == product)
        .order_by(RiskTemplateORM.created_at.asc())
        .all()
    )
    for orm in candidates:
        if _is_default_template(orm):
            return orm
    legacy_title = _DEFAULT_TEMPLATE_TITLES[template_type]
    for orm in candidates:
        if orm.template_title == legacy_title:
            return orm
    return None


def _load_template_rows(db: Session, template_id: str) -> list[RiskTemplateRowORM]:
    return (
        db.query(RiskTemplateRowORM)
        .filter(RiskTemplateRowORM.template_id == template_id)
        .order_by(RiskTemplateRowORM.row_order)
        .all()
    )


# ---------------------------------------------------------------------------
# CRUD endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=RiskTemplateListResponse)
async def list_risk_templates(
    template_type: str | None = None,
    product: str | None = None,
    include_defaults: bool = False,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> RiskTemplateListResponse:
    """List all risk templates, optionally filtered by type or product."""
    query = db.query(RiskTemplateORM)
    if template_type:
        query = query.filter(RiskTemplateORM.template_type == template_type.upper())
    if product:
        query = query.filter(RiskTemplateORM.product.ilike(f"%{product}%"))
    orms = query.order_by(RiskTemplateORM.created_at.desc()).all()
    if not include_defaults:
        orms = [orm for orm in orms if not _is_default_template(orm)]

    items: list[RiskTemplateSummary] = []
    for orm in orms:
        count = db.query(RiskTemplateRowORM).filter(RiskTemplateRowORM.template_id == orm.template_id).count()
        items.append(_template_to_summary(orm, count))

    return RiskTemplateListResponse(items=items, total=len(items))


@router.get("/defaults/{template_type}", response_model=RiskTemplate)
async def get_default_risk_template(
    template_type: str,
    product: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> RiskTemplate:
    """Fetch the canonical server-managed default template without mutating it."""
    normalized_type = template_type.upper()
    if normalized_type not in _DEFAULT_TEMPLATE_TITLES:
        raise HTTPException(status_code=400, detail=f"Unsupported risk template type: {template_type}")

    orm = _find_default_template(db, template_type=normalized_type, product=product)
    if orm is None:
        raise HTTPException(
            status_code=404,
            detail=f"Canonical default template not found for {normalized_type} and product {product}",
        )

    row_orms = _load_template_rows(db, orm.template_id)
    return _template_to_full(orm, row_orms)


@router.put("/defaults/{template_type}", response_model=RiskTemplate)
async def ensure_default_risk_template(
    template_type: str,
    request: EnsureDefaultRiskTemplateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> RiskTemplate:
    """Ensure the canonical server-managed default template exists and is refreshed."""
    normalized_type = template_type.upper()
    if normalized_type not in _DEFAULT_TEMPLATE_TITLES:
        raise HTTPException(status_code=400, detail=f"Unsupported risk template type: {template_type}")

    now = _now()
    rows_to_persist = _seed_rows_for_type(
        normalized_type,
        product=request.product,
        created_by=request.created_by,
    )
    orm = _find_default_template(db, template_type=normalized_type, product=request.product)

    if orm is None:
        orm = RiskTemplateORM(
            template_id=_new_id("RT"),
            template_type=normalized_type,
            template_title=_DEFAULT_TEMPLATE_TITLES[normalized_type],
            product=request.product,
            version="1.0.0",
            status="Draft",
            created_by=request.created_by,
            template_metadata=_canonical_default_metadata(normalized_type),
            created_at=now,
            updated_at=now,
        )
        db.add(orm)
    else:
        orm.template_title = _DEFAULT_TEMPLATE_TITLES[normalized_type]
        orm.status = "Draft"
        orm.created_by = request.created_by
        orm.template_metadata = {
            **(orm.template_metadata or {}),
            **_canonical_default_metadata(normalized_type),
        }
        orm.updated_at = now

    row_orms = _replace_template_rows(
        db,
        template_id=orm.template_id,
        rows_to_persist=rows_to_persist,
        now=now,
    )

    db.commit()
    db.refresh(orm)

    logger.info(
        "risk_template_default_ensured",
        template_id=orm.template_id,
        template_type=normalized_type,
        product=request.product,
        row_count=len(row_orms),
    )
    return _template_to_full(orm, row_orms)


@router.post("", response_model=RiskTemplate, status_code=201)
async def create_risk_template(
    request: CreateRiskTemplateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> RiskTemplate:
    """
    Create a new risk template with initial rows.

    If rows are not provided, automatically seeds the template with default rows
    based on the template type (RMF or FMEA) and product context.
    """
    now = _now()
    template_id = _new_id("RT")

    # Determine rows: use provided rows or seed them
    rows_to_persist = request.rows
    if not rows_to_persist:
        # Invoke seeder to generate default rows based on template type
        seed_context = RiskTemplateSeedContext(
            template_title=request.template_title,
            product=request.product,
            rationale=request.rationale,
            created_by=request.created_by,
        )
        if request.template_type == "RMF":
            rows_to_persist = RiskTemplateSeeder.seed_rmf_rows(seed_context)
        else:
            rows_to_persist = RiskTemplateSeeder.seed_fmea_rows(seed_context)

        logger.info(
            "seeding_risk_template",
            template_id=template_id,
            template_type=request.template_type,
            row_count=len(rows_to_persist),
        )

    orm = RiskTemplateORM(
        template_id=template_id,
        template_type=request.template_type,
        template_title=request.template_title,
        product=request.product,
        version="1.0.0",
        status="Draft",
        created_by=request.created_by,
        template_metadata={"rationale": request.rationale} if request.rationale else {},
        created_at=now,
        updated_at=now,
    )
    db.add(orm)

    row_orms: list[RiskTemplateRowORM] = []
    for idx, row_dict in enumerate(rows_to_persist):
        row_orm = RiskTemplateRowORM(
            row_id=_new_id("RR"),
            template_id=template_id,
            row_order=idx,
            row_data=row_dict,
            created_at=now,
        )
        db.add(row_orm)
        row_orms.append(row_orm)

    db.commit()
    db.refresh(orm)

    logger.info("risk_template_created", template_id=template_id, template_type=request.template_type)
    return _template_to_full(orm, row_orms)


@router.get("/{template_id}", response_model=RiskTemplate)
async def get_risk_template(
    template_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> RiskTemplate:
    """Retrieve a single risk template with all rows."""
    orm = db.query(RiskTemplateORM).filter(RiskTemplateORM.template_id == template_id).first()
    if orm is None:
        raise HTTPException(status_code=404, detail=f"Risk template not found: {template_id}")
    row_orms = _load_template_rows(db, template_id)
    return _template_to_full(orm, row_orms)


@router.put("/{template_id}", response_model=RiskTemplate)
async def update_risk_template(
    template_id: str,
    request: UpdateRiskTemplateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> RiskTemplate:
    """Replace template metadata and/or its complete row set."""
    orm = db.query(RiskTemplateORM).filter(RiskTemplateORM.template_id == template_id).first()
    if orm is None:
        raise HTTPException(status_code=404, detail=f"Risk template not found: {template_id}")

    if request.template_title is not None:
        orm.template_title = request.template_title
    if request.product is not None:
        orm.product = request.product
    if request.status is not None:
        orm.status = request.status
    orm.updated_at = _now()

    row_orms: list[RiskTemplateRowORM] = []
    if request.rows is not None:
        # Replace all rows atomically
        db.query(RiskTemplateRowORM).filter(RiskTemplateRowORM.template_id == template_id).delete()
        now = _now()
        for idx, row_dict in enumerate(request.rows):
            row_orm = RiskTemplateRowORM(
                row_id=_new_id("RR"),
                template_id=template_id,
                row_order=idx,
                row_data=row_dict,
                created_at=now,
            )
            db.add(row_orm)
            row_orms.append(row_orm)

    db.commit()
    db.refresh(orm)

    if request.rows is None:
        row_orms = _load_template_rows(db, template_id)

    logger.info("risk_template_updated", template_id=template_id)
    return _template_to_full(orm, row_orms)


@router.delete("/{template_id}", status_code=204)
async def delete_risk_template(
    template_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> None:
    """Hard-delete a template and all its rows (cascade)."""
    orm = db.query(RiskTemplateORM).filter(RiskTemplateORM.template_id == template_id).first()
    if orm is None:
        raise HTTPException(status_code=404, detail=f"Risk template not found: {template_id}")

    db.query(RiskTemplateRowORM).filter(RiskTemplateRowORM.template_id == template_id).delete()
    db.delete(orm)
    db.commit()
    logger.info("risk_template_deleted", template_id=template_id)


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------

_RMF_CSV_HEADERS = [
    "Nr.", "Risk Topic (Table 1)", "Documentation Item(s)", "Owner / Role",
    "Qualification Required", "Target Date", "Regulatory Reference",
    "Status", "Control Measure", "Verification", "Reference Link(s) / Document IDs", "Notes",
]
_RMF_ROW_KEYS = [
    "nr", "risk_category", "activity", "owner_role", "qualification_required",
    "target_date", "regulatory_ref", "status", "control_measure",
    "verification", "evidence_ref", "notes",
]

_FMEA_CSV_HEADERS = [
    "Nr.", "System Element", "Root Cause", "Failure Mode / Hazard", "Hazard to / Impact on",
    "Potential Effect / Risk", "Severity (S)", "Probability (P)", "RPN (S×P)", "Risk Mitigation",
    "Risk Mitigation Verification", "Post-Mitigation Severity (S)", "Post-Mitigation Probability (P)",
    "Post-Mitigation RPN (S×P)", "Residual Risk", "Status", "Post-Mitigation Potential Effect / Risk",
    "New Risks", "Notes",
]
_FMEA_ROW_KEYS = [
    "nr", "system_element", "root_cause", "failure_mode", "hazard_impact",
    "effect", "severity", "probability", "rpn", "mitigation", "verification",
    "post_severity", "post_probability", "post_rpn", "residual_risk", "status",
    "post_effect_risk", "new_risks", "notes",
]


@router.get("/{template_id}/export/csv")
async def export_risk_template_csv(
    template_id: str,
    db: Session = Depends(get_db),
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> StreamingResponse:
    """Stream the template as a UTF-8 CSV file download."""
    orm = db.query(RiskTemplateORM).filter(RiskTemplateORM.template_id == template_id).first()
    if orm is None:
        raise HTTPException(status_code=404, detail=f"Risk template not found: {template_id}")

    row_orms = (
        db.query(RiskTemplateRowORM)
        .filter(RiskTemplateRowORM.template_id == template_id)
        .order_by(RiskTemplateRowORM.row_order)
        .all()
    )

    is_fmea = orm.template_type == "FMEA"
    headers = _FMEA_CSV_HEADERS if is_fmea else _RMF_CSV_HEADERS
    keys = _FMEA_ROW_KEYS if is_fmea else _RMF_ROW_KEYS

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    # Meta block at top
    writer.writerow([f"Template: {orm.template_title}"])
    writer.writerow([f"Type: {orm.template_type}", f"Product: {orm.product}", f"Status: {orm.status}"])
    writer.writerow([f"Version: {orm.version}", f"Created by: {orm.created_by}"])
    writer.writerow([])

    writer.writerow(headers)
    for row_orm in row_orms:
        data = row_orm.row_data or {}
        # Recompute RPN for FMEA rows
        if is_fmea:
            s = int(data.get("severity", 1))
            p = int(data.get("probability", 1))
            data["rpn"] = s * p
            ps = int(data.get("post_severity", 1))
            pp = int(data.get("post_probability", 1))
            data["post_rpn"] = ps * pp
        writer.writerow([str(data.get(k, "")) for k in keys])

    csv_bytes = output.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility

    filename = f"{orm.template_title.replace(' ', '_')}_{orm.template_type}.csv"
    return StreamingResponse(
        iter([csv_bytes]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# AI-assist (Anthropic Claude)
# ---------------------------------------------------------------------------

_RMF_SYSTEM_PROMPT = """You are an ISO 14971 / IEC 62304 risk management expert specialising in AI
medical diagnostic software. Your task is to suggest realistic values for an incomplete row of a
Risk Management File (RMF).

Return ONLY valid JSON with these keys (leave blank string if not applicable):
risk_category, owner_role, qualification_required, regulatory_ref, control_measure,
verification, evidence_ref

Example output format:
{
  "risk_category": "Product Risk",
  "owner_role": "Risk Manager",
  "qualification_required": "ISO 14971 training + clinical domain knowledge",
  "regulatory_ref": "ISO 14971:2019 §6",
  "control_measure": "FMEA-driven control set with periodic review",
  "verification": "Design review + independent risk assessment",
  "evidence_ref": "RMF-v1.0 + risk register"
}"""

_FMEA_SYSTEM_PROMPT = """You are an ISO 14971 / IEC 62304 FMEA expert specialising in AI medical
diagnostic software. Suggest realistic values for an incomplete FMEA row.

Return ONLY valid JSON with these keys:
severity (int 1-5), probability (int 1-5), effect, mitigation, verification, residual_risk
(one of: Low / Medium / High), status (one of: Open / Mitigated / Verified / Accepted)

Severity/Probability scale: 1=Negligible/Rare → 5=Catastrophic/Very Frequent
RPN = severity × probability; residual_risk follows: ≤4 Low, 5-12 Medium, ≥13 High

Example output format:
{
  "severity": 4,
  "probability": 2,
  "effect": "Delayed diagnosis leading to suboptimal treatment",
  "mitigation": "Mandatory human review for confidence < 0.85; alert threshold tuning",
  "verification": "Clinical evaluation study + regression test suite",
  "residual_risk": "Medium",
  "status": "Open"
}"""


def _default_rmf_suggestions() -> dict:
    return {
        "risk_category": "Product Risk",
        "owner_role": "Risk Manager",
        "qualification_required": "ISO 14971 certified risk practitioner",
        "regulatory_ref": "ISO 14971:2019",
        "control_measure": "Implement documented control measures with acceptance criteria",
        "verification": "Design review + test evidence",
        "evidence_ref": "RMF document ref",
    }


def _default_fmea_suggestions() -> dict:
    return {
        "severity": 3,
        "probability": 2,
        "effect": "Negative impact on diagnostic accuracy",
        "mitigation": "Add input validation and human review gate for edge cases",
        "verification": "Unit tests + clinical evaluation",
        "residual_risk": "Medium",
        "status": "Open",
    }


@router.post("/ai-suggest", response_model=AiSuggestRowResponse)
async def ai_suggest_risk_row(
    request: AiSuggestRowRequest,
    _user=Depends(require_roles(*_ALLOWED_ROLES)),
) -> AiSuggestRowResponse:
    """Use Anthropic Claude to suggest values for an incomplete RMF or FMEA row.

    Gracefully degrades to rule-based defaults when the API key is not configured.
    """
    settings = get_settings()

    if not settings.anthropic_api_key:
        logger.warning("anthropic_api_key_not_configured, returning defaults")
        defaults = (
            _default_fmea_suggestions()
            if request.template_type == "FMEA"
            else _default_rmf_suggestions()
        )
        return AiSuggestRowResponse(
            suggestions=defaults,
            explanation="Anthropic API key not configured — returning rule-based defaults. "
                        "Set ANTHROPIC_API_KEY in your .env file to enable AI-assist.",
            model_used="defaults",
            degraded_to_defaults=True,
        )

    try:
        import anthropic  # local import to avoid hard dependency at import time

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        system = _FMEA_SYSTEM_PROMPT if request.template_type == "FMEA" else _RMF_SYSTEM_PROMPT
        user_content_parts: list[str] = []
        if request.context:
            user_content_parts.append(f"Product / system context: {request.context}")
        if request.partial_row:
            user_content_parts.append(f"Partial row data already filled in:\n{json.dumps(request.partial_row, indent=2)}")
        user_content_parts.append(
            "Please suggest appropriate values for the missing fields. "
            "Return ONLY the JSON object, no markdown fences."
        )

        message = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=512,
            system=system,
            messages=[{"role": "user", "content": "\n\n".join(user_content_parts)}],
        )

        raw_text = message.content[0].text.strip()
        # Strip any accidental ```json ... ``` wrappers
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        suggestions: dict = json.loads(raw_text)

        # Clamp numeric fields for FMEA
        if request.template_type == "FMEA":
            for field in ("severity", "probability"):
                if field in suggestions:
                    suggestions[field] = max(1, min(5, int(suggestions[field])))
            if "severity" in suggestions and "probability" in suggestions:
                suggestions["rpn"] = suggestions["severity"] * suggestions["probability"]

        return AiSuggestRowResponse(
            suggestions=suggestions,
            explanation="Values suggested by Claude based on ISO 14971 / IEC 62304 guidelines.",
            model_used=settings.anthropic_model,
            degraded_to_defaults=False,
        )

    except Exception as exc:
        logger.warning("anthropic_ai_suggest_failed", error=str(exc))
        defaults = (
            _default_fmea_suggestions()
            if request.template_type == "FMEA"
            else _default_rmf_suggestions()
        )
        return AiSuggestRowResponse(
            suggestions=defaults,
            explanation=f"AI-assist call failed ({type(exc).__name__}) — returning defaults.",
            model_used="defaults",
            degraded_to_defaults=True,
        )
