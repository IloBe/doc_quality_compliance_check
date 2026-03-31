"""Add stakeholder_employee_assignments table for role-to-employee mapping.

Revision ID: 008
Revises: 007
Create Date: 2026-03-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create stakeholder_employee_assignments table and indexes."""
    op.create_table(
        "stakeholder_employee_assignments",
        sa.Column("assignment_id", sa.String(length=64), nullable=False),
        sa.Column("profile_id", sa.String(length=64), nullable=False),
        sa.Column("employee_name", sa.String(length=255), nullable=False),
        sa.Column("created_by", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("assignment_id"),
    )

    op.create_index("ix_stakeholder_employee_assignments_assignment_id", "stakeholder_employee_assignments", ["assignment_id"])
    op.create_index("ix_stakeholder_employee_assignments_profile_id", "stakeholder_employee_assignments", ["profile_id"])
    op.create_index("ix_stakeholder_employee_assignments_employee_name", "stakeholder_employee_assignments", ["employee_name"])
    op.create_index("ix_stakeholder_employee_assignments_created_at", "stakeholder_employee_assignments", ["created_at"])


def downgrade() -> None:
    """Drop stakeholder_employee_assignments table and indexes."""
    op.drop_index("ix_stakeholder_employee_assignments_created_at", table_name="stakeholder_employee_assignments")
    op.drop_index("ix_stakeholder_employee_assignments_employee_name", table_name="stakeholder_employee_assignments")
    op.drop_index("ix_stakeholder_employee_assignments_profile_id", table_name="stakeholder_employee_assignments")
    op.drop_index("ix_stakeholder_employee_assignments_assignment_id", table_name="stakeholder_employee_assignments")
    op.drop_table("stakeholder_employee_assignments")
