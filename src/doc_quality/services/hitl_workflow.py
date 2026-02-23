"""Human-In-The-Loop (HITL) review workflow service."""
import uuid
from datetime import datetime
from typing import Optional

from ..core.logging_config import get_logger
from ..models.review import ModificationRequest, ReviewRecord, ReviewStatus

logger = get_logger(__name__)

# In-memory store for reviews (replace with database in production)
_review_store: dict[str, ReviewRecord] = {}


def create_review(
    document_id: str,
    reviewer_name: str,
    reviewer_role: str,
    modifications: Optional[list[ModificationRequest]] = None,
    comments: str = "",
) -> ReviewRecord:
    """Create a new HITL review record for a document."""
    review_id = str(uuid.uuid4())
    status = ReviewStatus.MODIFICATIONS_NEEDED if modifications else ReviewStatus.PASSED

    record = ReviewRecord(
        review_id=review_id,
        document_id=document_id,
        status=status,
        reviewer_name=reviewer_name,
        reviewer_role=reviewer_role,
        modifications_required=modifications or [],
        comments=comments,
        approval_date=datetime.utcnow() if status == ReviewStatus.PASSED else None,
    )
    _review_store[review_id] = record
    logger.info("review_created", review_id=review_id, document_id=document_id, status=status)
    return record


def get_review(review_id: str) -> Optional[ReviewRecord]:
    """Retrieve a review by ID."""
    return _review_store.get(review_id)


def update_review_status(
    review_id: str, new_status: ReviewStatus, approver_name: Optional[str] = None
) -> Optional[ReviewRecord]:
    """Update the status of an existing review."""
    record = _review_store.get(review_id)
    if record is None:
        logger.warning("review_not_found", review_id=review_id)
        return None

    record.status = new_status
    if new_status == ReviewStatus.PASSED:
        record.approval_date = datetime.utcnow()

    logger.info("review_status_updated", review_id=review_id, new_status=new_status)
    return record


def list_reviews_for_document(document_id: str) -> list[ReviewRecord]:
    """List all reviews associated with a document."""
    return [r for r in _review_store.values() if r.document_id == document_id]
