"""Add tenant scope columns for document, finding, and quality tables.

Revision ID: 016
Revises: 015
Create Date: 2026-05-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tenant/org/project scope columns to runtime tables."""
    # skill_documents
    op.add_column(
        "skill_documents",
        sa.Column("tenant_id", sa.String(length=100), nullable=False, server_default="default_tenant"),
    )
    op.add_column("skill_documents", sa.Column("org_id", sa.String(length=100), nullable=True))
    op.add_column("skill_documents", sa.Column("project_id", sa.String(length=100), nullable=True))
    op.create_index("ix_skill_documents_tenant_id", "skill_documents", ["tenant_id"])
    op.create_index("ix_skill_documents_org_id", "skill_documents", ["org_id"])
    op.create_index("ix_skill_documents_project_id", "skill_documents", ["project_id"])

    # skill_findings
    op.add_column(
        "skill_findings",
        sa.Column("tenant_id", sa.String(length=100), nullable=False, server_default="default_tenant"),
    )
    op.add_column("skill_findings", sa.Column("org_id", sa.String(length=100), nullable=True))
    op.add_column("skill_findings", sa.Column("project_id", sa.String(length=100), nullable=True))
    op.create_index("ix_skill_findings_tenant_id", "skill_findings", ["tenant_id"])
    op.create_index("ix_skill_findings_org_id", "skill_findings", ["org_id"])
    op.create_index("ix_skill_findings_project_id", "skill_findings", ["project_id"])

    # quality_observations
    op.add_column(
        "quality_observations",
        sa.Column("tenant_id", sa.String(length=100), nullable=False, server_default="default_tenant"),
    )
    op.add_column("quality_observations", sa.Column("org_id", sa.String(length=100), nullable=True))
    op.add_column("quality_observations", sa.Column("project_id", sa.String(length=100), nullable=True))
    op.create_index("ix_quality_observations_tenant_id", "quality_observations", ["tenant_id"])
    op.create_index("ix_quality_observations_org_id", "quality_observations", ["org_id"])
    op.create_index("ix_quality_observations_project_id", "quality_observations", ["project_id"])


def downgrade() -> None:
    """Drop tenant/org/project scope columns from runtime tables."""
    op.drop_index("ix_quality_observations_project_id", table_name="quality_observations")
    op.drop_index("ix_quality_observations_org_id", table_name="quality_observations")
    op.drop_index("ix_quality_observations_tenant_id", table_name="quality_observations")
    op.drop_column("quality_observations", "project_id")
    op.drop_column("quality_observations", "org_id")
    op.drop_column("quality_observations", "tenant_id")

    op.drop_index("ix_skill_findings_project_id", table_name="skill_findings")
    op.drop_index("ix_skill_findings_org_id", table_name="skill_findings")
    op.drop_index("ix_skill_findings_tenant_id", table_name="skill_findings")
    op.drop_column("skill_findings", "project_id")
    op.drop_column("skill_findings", "org_id")
    op.drop_column("skill_findings", "tenant_id")

    op.drop_index("ix_skill_documents_project_id", table_name="skill_documents")
    op.drop_index("ix_skill_documents_org_id", table_name="skill_documents")
    op.drop_index("ix_skill_documents_tenant_id", table_name="skill_documents")
    op.drop_column("skill_documents", "project_id")
    op.drop_column("skill_documents", "org_id")
    op.drop_column("skill_documents", "tenant_id")