"""Add provenance fields to audit_events table for multi-tenancy and compliance.

Revision ID: 003
Revises: 002
Create Date: 2026-03-23 00:00:00.000000

New fields for compliance audit trail:
- tenant_id: Tenant identifier (multi-tenancy support)
- org_id: Organization identifier within tenant
- project_id: Project identifier within organization
- event_time: Timestamp when event occurred (for range partitioning)

Backend.md requirements (line 693):
Event provenance fields: tenant_id, org_id, project_id, event_time, event_type,
actor_type, actor_id, correlation_id/trace_id, subject_type/subject_id, payload (jsonb)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add provenance fields to audit_events table."""
    # Add tenant_id column (required, indexed)
    op.add_column(
        "audit_events",
        sa.Column("tenant_id", sa.String(length=100), nullable=False, server_default="default_tenant"),
    )
    op.create_index("ix_audit_events_tenant_id", "audit_events", ["tenant_id"])

    # Add org_id column (optional, indexed)
    op.add_column(
        "audit_events",
        sa.Column("org_id", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_audit_events_org_id", "audit_events", ["org_id"])

    # Add project_id column (optional, indexed)
    op.add_column(
        "audit_events",
        sa.Column("project_id", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_audit_events_project_id", "audit_events", ["project_id"])

    # Add event_time column (required, indexed for range partitioning)
    op.add_column(
        "audit_events",
        sa.Column(
            "event_time",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_audit_events_event_time", "audit_events", ["event_time"])

    # Create composite index for multi-tenant access pattern
    op.create_index(
        "ix_audit_events_tenant_event_time",
        "audit_events",
        ["tenant_id", sa.desc("event_time")],
    )

    # Create composite index for correlation queries
    op.create_index(
        "ix_audit_events_tenant_correlation",
        "audit_events",
        ["tenant_id", "correlation_id"],
    )

    # Create composite index for subject queries
    op.create_index(
        "ix_audit_events_tenant_subject",
        "audit_events",
        ["tenant_id", "subject_type", "subject_id", sa.desc("event_time")],
    )


def downgrade() -> None:
    """Remove provenance fields from audit_events table."""
    # Drop indexes first
    op.drop_index("ix_audit_events_tenant_subject", table_name="audit_events")
    op.drop_index("ix_audit_events_tenant_correlation", table_name="audit_events")
    op.drop_index("ix_audit_events_tenant_event_time", table_name="audit_events")
    op.drop_index("ix_audit_events_event_time", table_name="audit_events")
    op.drop_index("ix_audit_events_project_id", table_name="audit_events")
    op.drop_index("ix_audit_events_org_id", table_name="audit_events")
    op.drop_index("ix_audit_events_tenant_id", table_name="audit_events")

    # Drop columns
    op.drop_column("audit_events", "event_time")
    op.drop_column("audit_events", "project_id")
    op.drop_column("audit_events", "org_id")
    op.drop_column("audit_events", "tenant_id")
