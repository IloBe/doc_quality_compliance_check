"""Add audit_schedules table for persistent governance audit planning.

Revision ID: 009
Revises: 008
Create Date: 2026-03-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create audit_schedules table and indexes."""
    op.create_table(
        "audit_schedules",
        sa.Column("schedule_id", sa.String(length=64), nullable=False),
        sa.Column("tenant_id", sa.String(length=100), nullable=False),
        sa.Column("org_id", sa.String(length=100), nullable=True),
        sa.Column("project_id", sa.String(length=100), nullable=True),
        sa.Column("internal_audit_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("external_audit_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("external_notified_body", sa.String(length=255), nullable=True),
        sa.Column("updated_by", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("schedule_id"),
    )

    op.create_index("ix_audit_schedules_schedule_id", "audit_schedules", ["schedule_id"])
    op.create_index("ix_audit_schedules_tenant_id", "audit_schedules", ["tenant_id"])
    op.create_index("ix_audit_schedules_org_id", "audit_schedules", ["org_id"])
    op.create_index("ix_audit_schedules_project_id", "audit_schedules", ["project_id"])
    op.create_index("ix_audit_schedules_internal_audit_date", "audit_schedules", ["internal_audit_date"])
    op.create_index("ix_audit_schedules_external_audit_date", "audit_schedules", ["external_audit_date"])
    op.create_index("ix_audit_schedules_created_at", "audit_schedules", ["created_at"])
    op.create_index("ix_audit_schedules_updated_at", "audit_schedules", ["updated_at"])


def downgrade() -> None:
    """Drop audit_schedules table and indexes."""
    op.drop_index("ix_audit_schedules_updated_at", table_name="audit_schedules")
    op.drop_index("ix_audit_schedules_created_at", table_name="audit_schedules")
    op.drop_index("ix_audit_schedules_external_audit_date", table_name="audit_schedules")
    op.drop_index("ix_audit_schedules_internal_audit_date", table_name="audit_schedules")
    op.drop_index("ix_audit_schedules_project_id", table_name="audit_schedules")
    op.drop_index("ix_audit_schedules_org_id", table_name="audit_schedules")
    op.drop_index("ix_audit_schedules_tenant_id", table_name="audit_schedules")
    op.drop_index("ix_audit_schedules_schedule_id", table_name="audit_schedules")
    op.drop_table("audit_schedules")
