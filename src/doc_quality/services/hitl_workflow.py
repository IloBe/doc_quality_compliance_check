"""Human-In-The-Loop (HITL) review workflow service with PostgreSQL persistence."""
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from ..core.logging_config import get_logger
from ..core.database import SessionLocal
from ..models.review import ModificationRequest, ReviewRecord, ReviewStatus
from ..models.orm import ReviewRecordORM

logger = get_logger(__name__)


def _orm_to_model(orm_record: ReviewRecordORM) -> ReviewRecord:
    """Convert SQLAlchemy ORM model to Pydantic model."""
    return ReviewRecord(
        review_id=str(orm_record.review_id),
        document_id=orm_record.document_id,
        status=ReviewStatus(orm_record.status),
        reviewer_name=orm_record.reviewer_name,
        reviewer_role=orm_record.reviewer_role,
        review_date=orm_record.review_date,
        modifications_required=[
            ModificationRequest(**mod) for mod in orm_record.modifications_required
        ],
        comments=orm_record.comments,
        approval_date=orm_record.approval_date,
    )


def _model_to_orm(model: ReviewRecord, db: Session) -> ReviewRecordORM:
    """Convert Pydantic model to SQLAlchemy ORM model."""
    modifications_dict = [mod.model_dump() for mod in model.modifications_required]
    return ReviewRecordORM(
        review_id=model.review_id,
        document_id=model.document_id,
        status=model.status.value,
        reviewer_name=model.reviewer_name,
        reviewer_role=model.reviewer_role,
        review_date=model.review_date,
        modifications_required=modifications_dict,
        comments=model.comments,
        approval_date=model.approval_date,
    )


def create_review(
    document_id: str,
    reviewer_name: str,
    reviewer_role: str,
    modifications: Optional[list[ModificationRequest]] = None,
    comments: str = "",
    db: Optional[Session] = None,
) -> ReviewRecord:
    """Create a new HITL review record for a document with PostgreSQL persistence."""
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        status = ReviewStatus.MODIFICATIONS_NEEDED if modifications else ReviewStatus.PASSED

        record = ReviewRecord(
            review_id=str(uuid4()),
            document_id=document_id,
            status=status,
            reviewer_name=reviewer_name,
            reviewer_role=reviewer_role,
            modifications_required=modifications or [],
            comments=comments,
            approval_date=datetime.now(timezone.utc) if status == ReviewStatus.PASSED else None,
        )

        orm_record = _model_to_orm(record, db)
        db.add(orm_record)
        db.commit()
        db.refresh(orm_record)

        result = _orm_to_model(orm_record)
        logger.info("review_created", review_id=str(orm_record.review_id), document_id=document_id, status=status)
        return result
    finally:
        if should_close:
            db.close()


def get_review(review_id: str, db: Optional[Session] = None) -> Optional[ReviewRecord]:
    """Retrieve a review by ID from PostgreSQL."""
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        orm_record = db.query(ReviewRecordORM).filter(
            ReviewRecordORM.review_id == review_id
        ).first()
        if orm_record is None:
            logger.warning("review_not_found", review_id=review_id)
            return None
        return _orm_to_model(orm_record)
    finally:
        if should_close:
            db.close()


def update_review_status(
    review_id: str,
    new_status: ReviewStatus,
    approver_name: Optional[str] = None,
    db: Optional[Session] = None,
) -> Optional[ReviewRecord]:
    """Update the status of an existing review in PostgreSQL."""
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        orm_record = db.query(ReviewRecordORM).filter(
            ReviewRecordORM.review_id == review_id
        ).first()
        if orm_record is None:
            logger.warning("review_not_found", review_id=review_id)
            return None

        orm_record.status = new_status.value
        if new_status == ReviewStatus.PASSED:
            orm_record.approval_date = datetime.now(timezone.utc)

        db.commit()
        db.refresh(orm_record)

        logger.info("review_status_updated", review_id=review_id, new_status=new_status)
        return _orm_to_model(orm_record)
    finally:
        if should_close:
            db.close()


def list_reviews_for_document(document_id: str, db: Optional[Session] = None) -> list[ReviewRecord]:
    """List all reviews associated with a document from PostgreSQL."""
    if db is None:
        db = SessionLocal()
        should_close = True
    else:
        should_close = False

    try:
        orm_records = db.query(ReviewRecordORM).filter(
            ReviewRecordORM.document_id == document_id
        ).all()
        return [_orm_to_model(record) for record in orm_records]
    finally:
        if should_close:
            db.close()
