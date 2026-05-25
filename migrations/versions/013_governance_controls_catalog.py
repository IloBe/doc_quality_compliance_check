"""Add governance_controls table for persisted admin governance catalog.

Revision ID: 013
Revises: 012
Create Date: 2026-05-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create governance_controls table and indexes."""
    op.create_table(
        "governance_controls",
        sa.Column("control_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("framework_id", sa.String(length=160), nullable=False),
        sa.Column("framework_label", sa.String(length=240), nullable=False),
        sa.Column("control_type", sa.String(length=32), nullable=False, server_default="directive"),
        sa.Column("activation_mode", sa.String(length=32), nullable=False, server_default="baseline"),
        sa.Column("domain_tags", sa.JSON(), nullable=False),
        sa.Column("market_tags", sa.JSON(), nullable=False),
        sa.Column("objective", sa.String(length=2000), nullable=False),
        sa.Column("implementation", sa.String(length=2000), nullable=False),
        sa.Column("evidence", sa.String(length=1000), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.String(length=255), nullable=True),
        sa.Column("updated_by", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("control_id"),
    )

    op.create_index("ix_governance_controls_control_id", "governance_controls", ["control_id"])
    op.create_index("ix_governance_controls_framework_id", "governance_controls", ["framework_id"])
    op.create_index("ix_governance_controls_control_type", "governance_controls", ["control_type"])
    op.create_index("ix_governance_controls_activation_mode", "governance_controls", ["activation_mode"])
    op.create_index("ix_governance_controls_status", "governance_controls", ["status"])
    op.create_index("ix_governance_controls_is_active", "governance_controls", ["is_active"])
    op.create_index("ix_governance_controls_created_at", "governance_controls", ["created_at"])
    op.create_index("ix_governance_controls_updated_at", "governance_controls", ["updated_at"])


def downgrade() -> None:
    """Drop governance_controls table and indexes."""
    op.drop_index("ix_governance_controls_updated_at", table_name="governance_controls")
    op.drop_index("ix_governance_controls_created_at", table_name="governance_controls")
    op.drop_index("ix_governance_controls_is_active", table_name="governance_controls")
    op.drop_index("ix_governance_controls_status", table_name="governance_controls")
    op.drop_index("ix_governance_controls_activation_mode", table_name="governance_controls")
    op.drop_index("ix_governance_controls_control_type", table_name="governance_controls")
    op.drop_index("ix_governance_controls_framework_id", table_name="governance_controls")
    op.drop_index("ix_governance_controls_control_id", table_name="governance_controls")
    op.drop_table("governance_controls")
