"""Add workflow_status to skill_documents for cross-page workflow consistency.

Revision ID: 012
Revises: 011
Create Date: 2026-04-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add persisted workflow status and index to skill_documents."""
    op.add_column(
        "skill_documents",
        sa.Column("workflow_status", sa.String(length=50), nullable=False, server_default="draft"),
    )
    op.create_index("ix_skill_documents_workflow_status", "skill_documents", ["workflow_status"])


def downgrade() -> None:
    """Remove workflow status column and index from skill_documents."""
    op.drop_index("ix_skill_documents_workflow_status", table_name="skill_documents")
    op.drop_column("skill_documents", "workflow_status")
