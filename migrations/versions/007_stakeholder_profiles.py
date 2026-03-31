"""Add stakeholder_profiles table for persistent admin role templates.

Revision ID: 007
Revises: 006
Create Date: 2026-03-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create stakeholder_profiles table and indexes."""
    op.create_table(
        "stakeholder_profiles",
        sa.Column("profile_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("permissions", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_by", sa.String(length=255), nullable=True),
        sa.Column("updated_by", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("profile_id"),
    )

    op.create_index("ix_stakeholder_profiles_profile_id", "stakeholder_profiles", ["profile_id"])
    op.create_index("ix_stakeholder_profiles_is_active", "stakeholder_profiles", ["is_active"])
    op.create_index("ix_stakeholder_profiles_created_at", "stakeholder_profiles", ["created_at"])
    op.create_index("ix_stakeholder_profiles_updated_at", "stakeholder_profiles", ["updated_at"])


def downgrade() -> None:
    """Drop stakeholder_profiles table and indexes."""
    op.drop_index("ix_stakeholder_profiles_updated_at", table_name="stakeholder_profiles")
    op.drop_index("ix_stakeholder_profiles_created_at", table_name="stakeholder_profiles")
    op.drop_index("ix_stakeholder_profiles_is_active", table_name="stakeholder_profiles")
    op.drop_index("ix_stakeholder_profiles_profile_id", table_name="stakeholder_profiles")
    op.drop_table("stakeholder_profiles")
