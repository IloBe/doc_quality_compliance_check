"""Service layer for runtime model policy and active model resolution."""
from __future__ import annotations

from datetime import timezone

from sqlalchemy import inspect
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.logging_config import get_logger
from ..core.security import sanitize_text
from ..models.model_policy import (
    ActiveModelInfo,
    ActiveModelResponse,
    ModelPolicyCandidate,
    ModelPolicyRecord,
    ModelPolicyUpdateRequest,
)
from ..models.orm import ModelPolicyConfigORM

logger = get_logger(__name__)

_POLICY_ROW_ID = "default"


def _ensure_policy_table_exists(db: Session) -> None:
    """Ensure model policy table exists to avoid runtime crashes on drifted DBs."""
    bind = db.get_bind()
    inspector = inspect(bind)
    if inspector.has_table(ModelPolicyConfigORM.__tablename__):
        return
    ModelPolicyConfigORM.__table__.create(bind=bind, checkfirst=True)
    logger.warning("model_policy_table_auto_created", table=ModelPolicyConfigORM.__tablename__)


def _default_policy() -> ModelPolicyRecord:
    settings = get_settings()
    items: list[ModelPolicyCandidate] = [
        ModelPolicyCandidate(
            model_id="llama3.1:8b",
            display_name="Llama 3.1 8B",
            provider="ollama",
            enabled=True,
            priority=1,
        ),
        ModelPolicyCandidate(
            model_id="llama3.1:70b",
            display_name="Llama 3.1 70B",
            provider="ollama",
            enabled=True,
            priority=2,
            params={"temperature": 0.15, "top_p": 0.9, "top_k": 32},
        ),
        ModelPolicyCandidate(
            model_id="qwen3:32b",
            display_name="Qwen3 32B",
            provider="ollama",
            enabled=True,
            priority=3,
            params={"temperature": 0.2, "top_p": 0.85, "top_k": 40},
        ),
        ModelPolicyCandidate(
            model_id=settings.anthropic_model,
            display_name=f"Anthropic ({settings.anthropic_model})",
            provider="anthropic",
            enabled=bool(settings.anthropic_model),
            priority=40,
        ),
        ModelPolicyCandidate(
            model_id=settings.perplexity_model,
            display_name=f"Perplexity ({settings.perplexity_model})",
            provider="perplexity",
            enabled=bool(settings.perplexity_model),
            priority=50,
        ),
    ]

    # Defensive dedupe when env-configured external model names collide.
    deduped: list[ModelPolicyCandidate] = []
    seen: set[str] = set()
    for item in items:
        if item.model_id in seen:
            continue
        seen.add(item.model_id)
        deduped.append(item)

    return ModelPolicyRecord(default_model_id="llama3.1:8b", items=deduped, updated_by="system")


def ensure_model_policy(db: Session) -> None:
    """Seed default policy row when table is empty."""
    try:
        _ensure_policy_table_exists(db)
        existing = db.query(ModelPolicyConfigORM).filter(ModelPolicyConfigORM.config_id == _POLICY_ROW_ID).first()
    except ProgrammingError as exc:
        db.rollback()
        if "model_policy_configs" not in str(exc).lower():
            raise
        _ensure_policy_table_exists(db)
        existing = db.query(ModelPolicyConfigORM).filter(ModelPolicyConfigORM.config_id == _POLICY_ROW_ID).first()
    if existing is not None:
        return

    policy = _default_policy()
    row = ModelPolicyConfigORM(
        config_id=_POLICY_ROW_ID,
        default_model_id=policy.default_model_id,
        items=[item.model_dump(mode="json") for item in policy.items],
        updated_by=policy.updated_by,
    )
    db.add(row)
    db.commit()
    logger.info("model_policy_seeded", default_model_id=policy.default_model_id)


def _row_to_record(row: ModelPolicyConfigORM) -> ModelPolicyRecord:
    items = [ModelPolicyCandidate.model_validate(item) for item in (row.items or [])]
    updated_at = row.updated_at
    if updated_at is not None and updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    return ModelPolicyRecord(
        default_model_id=row.default_model_id,
        items=items,
        updated_by=row.updated_by,
        updated_at=updated_at or row.created_at,
    )


def get_model_policy(db: Session) -> ModelPolicyRecord:
    """Return persisted model policy."""
    ensure_model_policy(db)
    row = db.query(ModelPolicyConfigORM).filter(ModelPolicyConfigORM.config_id == _POLICY_ROW_ID).first()
    if row is None:
        # Defensive fallback if transaction races with drop/create in tests.
        return _default_policy()
    return _row_to_record(row)


def update_model_policy(
    db: Session,
    *,
    request: ModelPolicyUpdateRequest,
    actor_email: str,
) -> ModelPolicyRecord:
    """Persist admin-updated model policy."""
    ensure_model_policy(db)

    sanitized_default = sanitize_text(request.default_model_id).strip()
    sanitized_actor = sanitize_text(actor_email).strip()
    items: list[ModelPolicyCandidate] = []
    for candidate in request.items:
        items.append(
            ModelPolicyCandidate(
                model_id=sanitize_text(candidate.model_id).strip(),
                display_name=sanitize_text(candidate.display_name).strip(),
                provider=candidate.provider,
                enabled=bool(candidate.enabled),
                priority=int(candidate.priority),
                params=candidate.params,
            )
        )

    # Sort by explicit priority to make resolution deterministic.
    items = sorted(items, key=lambda item: item.priority)
    record = ModelPolicyRecord(
        default_model_id=sanitized_default,
        items=items,
        updated_by=sanitized_actor,
    )

    row = db.query(ModelPolicyConfigORM).filter(ModelPolicyConfigORM.config_id == _POLICY_ROW_ID).first()
    if row is None:
        row = ModelPolicyConfigORM(config_id=_POLICY_ROW_ID)
        db.add(row)

    row.default_model_id = record.default_model_id
    row.items = [item.model_dump(mode="json") for item in record.items]
    row.updated_by = record.updated_by
    db.commit()
    db.refresh(row)

    logger.info(
        "model_policy_updated",
        updated_by=record.updated_by,
        default_model_id=record.default_model_id,
        candidate_count=len(record.items),
    )
    return _row_to_record(row)


def resolve_active_model(db: Session) -> ActiveModelInfo:
    """Resolve currently active model using default id, enabled flag and priority."""
    policy = get_model_policy(db)
    by_id = {item.model_id: item for item in policy.items}

    preferred = by_id.get(policy.default_model_id)
    if preferred is not None and preferred.enabled:
        return ActiveModelInfo(
            model_id=preferred.model_id,
            display_name=preferred.display_name,
            provider=preferred.provider,
            priority=preferred.priority,
            params=preferred.params,
        )

    enabled = sorted((item for item in policy.items if item.enabled), key=lambda item: item.priority)
    if enabled:
        candidate = enabled[0]
        return ActiveModelInfo(
            model_id=candidate.model_id,
            display_name=candidate.display_name,
            provider=candidate.provider,
            priority=candidate.priority,
            params=candidate.params,
        )

    # Last resort for a fully disabled list: still surface default for visibility.
    fallback = preferred or policy.items[0]
    return ActiveModelInfo(
        model_id=fallback.model_id,
        display_name=fallback.display_name,
        provider=fallback.provider,
        priority=fallback.priority,
        params=fallback.params,
    )


def get_active_model_response(db: Session) -> ActiveModelResponse:
    """Return active model with policy metadata for frontend disclaimer use."""
    policy = get_model_policy(db)
    return ActiveModelResponse(
        active_model=resolve_active_model(db),
        policy_updated_at=policy.updated_at,
        policy_updated_by=policy.updated_by,
    )
