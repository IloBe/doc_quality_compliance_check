"""Add user_sessions table for backend-owned session authentication.

Revision ID: 004
Revises: 003
Create Date: 2026-03-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_sessions table."""
    op.create_table(
        "user_sessions",
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("session_token_hash", sa.String(length=128), nullable=False),
        sa.Column("user_email", sa.String(length=255), nullable=False),
        sa.Column("user_roles", sa.JSON(), nullable=False),
        sa.Column("user_org", sa.String(length=255), nullable=True),
        sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("session_id"),
    )

    op.create_index("ix_user_sessions_session_id", "user_sessions", ["session_id"])
    op.create_index("ix_user_sessions_session_token_hash", "user_sessions", ["session_token_hash"], unique=True)
    op.create_index("ix_user_sessions_user_email", "user_sessions", ["user_email"])
    op.create_index("ix_user_sessions_is_revoked", "user_sessions", ["is_revoked"])
    op.create_index("ix_user_sessions_expires_at", "user_sessions", ["expires_at"])


def downgrade() -> None:
    """Drop user_sessions table."""
    op.drop_index("ix_user_sessions_expires_at", table_name="user_sessions")
    op.drop_index("ix_user_sessions_is_revoked", table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_email", table_name="user_sessions")
    op.drop_index("ix_user_sessions_session_token_hash", table_name="user_sessions")
    op.drop_index("ix_user_sessions_session_id", table_name="user_sessions")
    op.drop_table("user_sessions")
