"""Document lock service.

Single responsibility: acquire/release/read document lock state.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..core.logging_config import get_logger
from ..core.security import sanitize_text
from ..models.orm import DocumentLockORM, SkillDocumentORM

logger = get_logger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class LockState:
    document_id: str
    locked_by: str | None
    locked_at: datetime | None
    expires_at: datetime | None


@dataclass
class LockActionResult:
    ok: bool
    document_id: str
    locked_by: str | None
    locked_at: datetime | None
    expires_at: datetime | None
    message: str


def _normalize_actor(actor_id: str) -> str:
    actor = sanitize_text(actor_id).strip()
    if not actor:
        raise ValueError("actor_id is required")
    if len(actor) > 255:
        raise ValueError("actor_id too long")
    return actor


def _delete_if_expired(db: Session, lock: DocumentLockORM) -> bool:
    now = _utc_now()
    expires_at = lock.expires_at
    if expires_at is None:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at > now:
        return False

    db.delete(lock)
    db.commit()
    logger.info("document_lock_expired", document_id=lock.document_id)
    return True


def get_lock_state(db: Session, document_id: str) -> LockState:
    lock = db.query(DocumentLockORM).filter(DocumentLockORM.document_id == document_id).first()
    if lock is None:
        return LockState(document_id=document_id, locked_by=None, locked_at=None, expires_at=None)

    if _delete_if_expired(db, lock):
        return LockState(document_id=document_id, locked_by=None, locked_at=None, expires_at=None)

    return LockState(
        document_id=lock.document_id,
        locked_by=lock.locked_by,
        locked_at=lock.locked_at,
        expires_at=lock.expires_at,
    )


def acquire_lock(db: Session, *, document_id: str, actor_id: str, ttl_minutes: int = 30) -> LockActionResult:
    actor = _normalize_actor(actor_id)
    ttl = max(1, min(int(ttl_minutes), 8 * 60))

    document = db.query(SkillDocumentORM).filter(SkillDocumentORM.document_id == document_id).first()
    if document is None:
        return LockActionResult(
            ok=False,
            document_id=document_id,
            locked_by=None,
            locked_at=None,
            expires_at=None,
            message="Document not found",
        )

    lock = db.query(DocumentLockORM).filter(DocumentLockORM.document_id == document_id).first()
    now = _utc_now()
    expires_at = now + timedelta(minutes=ttl)

    if lock is not None and _delete_if_expired(db, lock):
        lock = None

    if lock is None:
        lock = DocumentLockORM(
            document_id=document_id,
            locked_by=actor,
            locked_at=now,
            expires_at=expires_at,
        )
        db.add(lock)
        db.commit()
        db.refresh(lock)
        logger.info("document_lock_acquired", document_id=document_id, locked_by=actor)
        return LockActionResult(
            ok=True,
            document_id=document_id,
            locked_by=lock.locked_by,
            locked_at=lock.locked_at,
            expires_at=lock.expires_at,
            message="Lock acquired",
        )

    if lock.locked_by != actor:
        return LockActionResult(
            ok=False,
            document_id=document_id,
            locked_by=lock.locked_by,
            locked_at=lock.locked_at,
            expires_at=lock.expires_at,
            message="Document is already locked by another owner",
        )

    lock.locked_at = now
    lock.expires_at = expires_at
    db.commit()
    db.refresh(lock)
    logger.info("document_lock_renewed", document_id=document_id, locked_by=actor)
    return LockActionResult(
        ok=True,
        document_id=document_id,
        locked_by=lock.locked_by,
        locked_at=lock.locked_at,
        expires_at=lock.expires_at,
        message="Lock renewed",
    )


def release_lock(db: Session, *, document_id: str, actor_id: str) -> LockActionResult:
    actor = _normalize_actor(actor_id)
    lock = db.query(DocumentLockORM).filter(DocumentLockORM.document_id == document_id).first()
    if lock is None:
        return LockActionResult(
            ok=True,
            document_id=document_id,
            locked_by=None,
            locked_at=None,
            expires_at=None,
            message="Lock already released",
        )

    if _delete_if_expired(db, lock):
        return LockActionResult(
            ok=True,
            document_id=document_id,
            locked_by=None,
            locked_at=None,
            expires_at=None,
            message="Lock already expired",
        )

    if lock.locked_by != actor:
        return LockActionResult(
            ok=False,
            document_id=document_id,
            locked_by=lock.locked_by,
            locked_at=lock.locked_at,
            expires_at=lock.expires_at,
            message="Only current lock owner can release the lock",
        )

    db.delete(lock)
    db.commit()
    logger.info("document_lock_released", document_id=document_id, locked_by=actor)
    return LockActionResult(
        ok=True,
        document_id=document_id,
        locked_by=None,
        locked_at=None,
        expires_at=None,
        message="Lock released",
    )
