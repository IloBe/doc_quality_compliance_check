"""Add risk_templates and risk_template_rows tables for Excel-like template management.

Revision ID: 011
Revises: 010
Create Date: 2026-04-02 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "risk_templates",
        sa.Column("template_id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("template_type", sa.String(length=10), nullable=False),  # 'RMF' | 'FMEA'
        sa.Column("template_title", sa.String(length=255), nullable=False),
        sa.Column("product", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=20), nullable=False, server_default="1.0.0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Draft"),
        sa.Column("created_by", sa.String(length=100), nullable=False),
        sa.Column("template_metadata", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )
    op.create_index("ix_risk_templates_template_id", "risk_templates", ["template_id"])
    op.create_index("ix_risk_templates_template_type", "risk_templates", ["template_type"])
    op.create_index("ix_risk_templates_product", "risk_templates", ["product"])
    op.create_index("ix_risk_templates_status", "risk_templates", ["status"])
    op.create_index("ix_risk_templates_created_at", "risk_templates", ["created_at"])

    op.create_table(
        "risk_template_rows",
        sa.Column("row_id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("template_id", sa.String(length=64), nullable=False),
        sa.Column("row_order", sa.Integer(), nullable=False),
        sa.Column("row_data", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["risk_templates.template_id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "ix_risk_template_rows_row_id", "risk_template_rows", ["row_id"]
    )
    op.create_index(
        "ix_risk_template_rows_template_id", "risk_template_rows", ["template_id"]
    )
    op.create_index(
        "ix_risk_template_rows_row_order", "risk_template_rows", ["row_order"]
    )


def downgrade() -> None:
    op.drop_table("risk_template_rows")
    op.drop_table("risk_templates")
