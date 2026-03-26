"""Add app_users and password_recovery_tokens tables.

Revision ID: 005
Revises: 004
Create Date: 2026-03-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create app_users and password_recovery_tokens tables."""
    op.create_table(
        "app_users",
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("roles", sa.JSON(), nullable=False),
        sa.Column("org", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email"),
    )

    op.create_index("ix_app_users_user_id", "app_users", ["user_id"])
    op.create_index("ix_app_users_email", "app_users", ["email"], unique=True)
    op.create_index("ix_app_users_is_active", "app_users", ["is_active"])
    op.create_index("ix_app_users_is_locked", "app_users", ["is_locked"])
    op.create_index("ix_app_users_created_at", "app_users", ["created_at"])

    op.create_table(
        "password_recovery_tokens",
        sa.Column("token_id", sa.String(length=64), nullable=False),
        sa.Column("user_email", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("requested_ip", sa.String(length=64), nullable=True),
        sa.Column("requested_user_agent", sa.String(length=512), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("token_id"),
        sa.UniqueConstraint("token_hash"),
    )

    op.create_index("ix_password_recovery_tokens_token_id", "password_recovery_tokens", ["token_id"])
    op.create_index("ix_password_recovery_tokens_user_email", "password_recovery_tokens", ["user_email"])
    op.create_index("ix_password_recovery_tokens_token_hash", "password_recovery_tokens", ["token_hash"], unique=True)
    op.create_index("ix_password_recovery_tokens_requested_ip", "password_recovery_tokens", ["requested_ip"])
    op.create_index("ix_password_recovery_tokens_expires_at", "password_recovery_tokens", ["expires_at"])
    op.create_index("ix_password_recovery_tokens_used_at", "password_recovery_tokens", ["used_at"])
    op.create_index("ix_password_recovery_tokens_requested_at", "password_recovery_tokens", ["requested_at"])


def downgrade() -> None:
    """Drop app_users and password_recovery_tokens tables."""
    op.drop_index("ix_password_recovery_tokens_requested_at", table_name="password_recovery_tokens")
    op.drop_index("ix_password_recovery_tokens_used_at", table_name="password_recovery_tokens")
    op.drop_index("ix_password_recovery_tokens_expires_at", table_name="password_recovery_tokens")
    op.drop_index("ix_password_recovery_tokens_requested_ip", table_name="password_recovery_tokens")
    op.drop_index("ix_password_recovery_tokens_token_hash", table_name="password_recovery_tokens")
    op.drop_index("ix_password_recovery_tokens_user_email", table_name="password_recovery_tokens")
    op.drop_index("ix_password_recovery_tokens_token_id", table_name="password_recovery_tokens")
    op.drop_table("password_recovery_tokens")

    op.drop_index("ix_app_users_created_at", table_name="app_users")
    op.drop_index("ix_app_users_is_locked", table_name="app_users")
    op.drop_index("ix_app_users_is_active", table_name="app_users")
    op.drop_index("ix_app_users_email", table_name="app_users")
    op.drop_index("ix_app_users_user_id", table_name="app_users")
    op.drop_table("app_users")
