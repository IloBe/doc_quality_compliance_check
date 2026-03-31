"""Add bridge_human_reviews table for mandatory HITL bridge decisions.

Revision ID: 010
Revises: 009
Create Date: 2026-03-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create bridge_human_reviews table and indexes."""
    op.create_table(
        "bridge_human_reviews",
        sa.Column("review_id", sa.String(length=64), nullable=False),
        sa.Column("run_id", sa.String(length=64), nullable=False),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("decision", sa.String(length=32), nullable=False),
        sa.Column("reason", sa.String(length=4000), nullable=False),
        sa.Column("reviewer_email", sa.String(length=255), nullable=False),
        sa.Column("reviewer_roles", sa.JSON(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("next_task_type", sa.String(length=64), nullable=True),
        sa.Column("next_task_assignee", sa.String(length=255), nullable=True),
        sa.Column("next_task_instructions", sa.String(length=4000), nullable=True),
        sa.Column("assignee_notified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("review_id"),
    )

    op.create_index("ix_bridge_human_reviews_review_id", "bridge_human_reviews", ["review_id"])
    op.create_index("ix_bridge_human_reviews_run_id", "bridge_human_reviews", ["run_id"])
    op.create_index("ix_bridge_human_reviews_document_id", "bridge_human_reviews", ["document_id"])
    op.create_index("ix_bridge_human_reviews_decision", "bridge_human_reviews", ["decision"])
    op.create_index("ix_bridge_human_reviews_reviewer_email", "bridge_human_reviews", ["reviewer_email"])
    op.create_index("ix_bridge_human_reviews_reviewed_at", "bridge_human_reviews", ["reviewed_at"])
    op.create_index("ix_bridge_human_reviews_next_task_type", "bridge_human_reviews", ["next_task_type"])
    op.create_index("ix_bridge_human_reviews_next_task_assignee", "bridge_human_reviews", ["next_task_assignee"])
    op.create_index("ix_bridge_human_reviews_created_at", "bridge_human_reviews", ["created_at"])


def downgrade() -> None:
    """Drop bridge_human_reviews table and indexes."""
    op.drop_index("ix_bridge_human_reviews_created_at", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_next_task_assignee", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_next_task_type", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_reviewed_at", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_reviewer_email", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_decision", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_document_id", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_run_id", table_name="bridge_human_reviews")
    op.drop_index("ix_bridge_human_reviews_review_id", table_name="bridge_human_reviews")
    op.drop_table("bridge_human_reviews")
