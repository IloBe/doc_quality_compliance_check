"""Add model_policy_configs table for runtime model selection policy.

Revision ID: 015
Revises: 014
Create Date: 2026-05-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create model_policy_configs table and indexes."""
    op.create_table(
        "model_policy_configs",
        sa.Column("config_id", sa.String(length=64), nullable=False),
        sa.Column("default_model_id", sa.String(length=120), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("updated_by", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("config_id"),
    )

    op.create_index("ix_model_policy_configs_config_id", "model_policy_configs", ["config_id"])
    op.create_index("ix_model_policy_configs_created_at", "model_policy_configs", ["created_at"])
    op.create_index("ix_model_policy_configs_updated_at", "model_policy_configs", ["updated_at"])


def downgrade() -> None:
    """Drop model_policy_configs table and indexes."""
    op.drop_index("ix_model_policy_configs_updated_at", table_name="model_policy_configs")
    op.drop_index("ix_model_policy_configs_created_at", table_name="model_policy_configs")
    op.drop_index("ix_model_policy_configs_config_id", table_name="model_policy_configs")
    op.drop_table("model_policy_configs")
