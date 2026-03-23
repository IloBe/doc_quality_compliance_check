"""Unit tests for the HITL workflow service with database persistence."""
from sqlalchemy.orm import Session
from src.doc_quality.models.review import (
    ModificationImportance,
    ModificationRequest,
    ReviewStatus,
)
from src.doc_quality.services.hitl_workflow import (
    create_review,
    get_review,
    list_reviews_for_document,
    update_review_status,
)


def test_create_review_without_modifications(test_db_session: Session):
    review = create_review(
        document_id="doc-1",
        reviewer_name="Alice Smith",
        reviewer_role="Quality Manager",
        db=test_db_session,
    )
    assert review.status == ReviewStatus.PASSED
    assert review.approval_date is not None
    assert review.document_id == "doc-1"


def test_create_review_with_modifications(test_db_session: Session):
    mod = ModificationRequest(
        location="Section 3: Context",
        description="Missing system context diagram",
        importance=ModificationImportance.MAJOR,
        risk_if_not_done="Auditor cannot understand system boundaries",
        responsible_role="System Architect",
    )
    review = create_review(
        document_id="doc-2",
        reviewer_name="Bob Jones",
        reviewer_role="Quality Manager",
        modifications=[mod],
        db=test_db_session,
    )
    assert review.status == ReviewStatus.MODIFICATIONS_NEEDED
    assert len(review.modifications_required) == 1
    assert review.approval_date is None


def test_get_review_by_id(test_db_session: Session):
    review = create_review(
        document_id="doc-3",
        reviewer_name="Carol White",
        reviewer_role="QA Lead",
        db=test_db_session,
    )
    retrieved = get_review(review.review_id, db=test_db_session)
    assert retrieved is not None
    assert retrieved.review_id == review.review_id


def test_update_review_status(test_db_session: Session):
    review = create_review(
        document_id="doc-4",
        reviewer_name="Dave Brown",
        reviewer_role="Tech Lead",
        modifications=[
            ModificationRequest(
                location="Glossary",
                description="Add missing terms",
                importance=ModificationImportance.MINOR,
                risk_if_not_done="Low - terms can be understood from context",
            )
        ],
        db=test_db_session,
    )
    assert review.status == ReviewStatus.MODIFICATIONS_NEEDED
    updated = update_review_status(review.review_id, ReviewStatus.PASSED, db=test_db_session)
    assert updated is not None
    assert updated.status == ReviewStatus.PASSED
    assert updated.approval_date is not None


def test_list_reviews_for_document(test_db_session: Session):
    doc_id = "doc-list-test"
    create_review(doc_id, "Reviewer1", "QA", db=test_db_session)
    create_review(doc_id, "Reviewer2", "QA", db=test_db_session)
    reviews = list_reviews_for_document(doc_id, db=test_db_session)
    assert len(reviews) >= 2


def test_update_nonexistent_review(test_db_session: Session):
    result = update_review_status("nonexistent-id", ReviewStatus.PASSED, db=test_db_session)
    assert result is None
