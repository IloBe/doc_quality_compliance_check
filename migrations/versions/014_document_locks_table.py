"""Add document_locks table for document editing lock state.

Revision ID: 014
Revises: 013
Create Date: 2026-05-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create document_locks table and indexes."""
    op.create_table(
        "document_locks",
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("locked_by", sa.String(length=255), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("document_id"),
    )

    op.create_index("ix_document_locks_document_id", "document_locks", ["document_id"])
    op.create_index("ix_document_locks_locked_by", "document_locks", ["locked_by"])
    op.create_index("ix_document_locks_locked_at", "document_locks", ["locked_at"])
    op.create_index("ix_document_locks_expires_at", "document_locks", ["expires_at"])


def downgrade() -> None:
    """Drop document_locks table and indexes."""
    op.drop_index("ix_document_locks_expires_at", table_name="document_locks")
    op.drop_index("ix_document_locks_locked_at", table_name="document_locks")
    op.drop_index("ix_document_locks_locked_by", table_name="document_locks")
    op.drop_index("ix_document_locks_document_id", table_name="document_locks")
    op.drop_table("document_locks")
