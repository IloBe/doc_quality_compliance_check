"""Initial HITL reviews table for PostgreSQL persistence

Revision ID: 001
Revises: 
Create Date: 2026-03-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create hitl_reviews table."""
    op.create_table(
        "hitl_reviews",
        sa.Column("review_id", postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column("document_id", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("reviewer_name", sa.String(255), nullable=False),
        sa.Column("reviewer_role", sa.String(100), nullable=False),
        sa.Column("review_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("modifications_required", postgresql.JSON(), nullable=False, server_default="[]"),
        sa.Column("comments", sa.String(4000), nullable=False, server_default=""),
        sa.Column("approval_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    
    # Create indexes for query performance
    op.create_index("ix_hitl_reviews_document_id", "hitl_reviews", ["document_id"])
    op.create_index("ix_hitl_reviews_review_id", "hitl_reviews", ["review_id"])
    op.create_index("ix_hitl_reviews_created_at", "hitl_reviews", ["created_at"])


def downgrade() -> None:
    """Drop hitl_reviews table."""
    op.drop_table("hitl_reviews")
