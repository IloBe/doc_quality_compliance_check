"""Unit tests for the HITL workflow service."""
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


def test_create_review_without_modifications():
    review = create_review(
        document_id="doc-1",
        reviewer_name="Alice Smith",
        reviewer_role="Quality Manager",
    )
    assert review.status == ReviewStatus.PASSED
    assert review.approval_date is not None
    assert review.document_id == "doc-1"


def test_create_review_with_modifications():
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
    )
    assert review.status == ReviewStatus.MODIFICATIONS_NEEDED
    assert len(review.modifications_required) == 1
    assert review.approval_date is None


def test_get_review_by_id():
    review = create_review("doc-3", "Carol White", "QA Lead")
    retrieved = get_review(review.review_id)
    assert retrieved is not None
    assert retrieved.review_id == review.review_id


def test_update_review_status():
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
    )
    assert review.status == ReviewStatus.MODIFICATIONS_NEEDED
    updated = update_review_status(review.review_id, ReviewStatus.PASSED)
    assert updated is not None
    assert updated.status == ReviewStatus.PASSED
    assert updated.approval_date is not None


def test_list_reviews_for_document():
    doc_id = "doc-list-test"
    create_review(doc_id, "Reviewer1", "QA")
    create_review(doc_id, "Reviewer2", "QA")
    reviews = list_reviews_for_document(doc_id)
    assert len(reviews) >= 2


def test_update_nonexistent_review():
    result = update_review_status("nonexistent-id", ReviewStatus.PASSED)
    assert result is None
