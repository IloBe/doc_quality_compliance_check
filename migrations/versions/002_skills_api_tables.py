"""Add Skills API tables for documents, findings, and audit events.

Revision ID: 002
Revises: 001
Create Date: 2026-03-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "skill_documents",
        sa.Column("document_id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("document_type", sa.String(length=50), nullable=False, server_default="unknown"),
        sa.Column("extracted_text", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="analyze_text"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skill_documents_document_id", "skill_documents", ["document_id"])
    op.create_index("ix_skill_documents_filename", "skill_documents", ["filename"])
    op.create_index("ix_skill_documents_document_type", "skill_documents", ["document_type"])
    op.create_index("ix_skill_documents_created_at", "skill_documents", ["created_at"])

    op.create_table(
        "skill_findings",
        sa.Column("finding_id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("finding_type", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("evidence", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_skill_findings_finding_id", "skill_findings", ["finding_id"])
    op.create_index("ix_skill_findings_document_id", "skill_findings", ["document_id"])
    op.create_index("ix_skill_findings_finding_type", "skill_findings", ["finding_type"])
    op.create_index("ix_skill_findings_created_at", "skill_findings", ["created_at"])

    op.create_table(
        "audit_events",
        sa.Column("event_id", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("actor_type", sa.String(length=50), nullable=False),
        sa.Column("actor_id", sa.String(length=100), nullable=False),
        sa.Column("subject_type", sa.String(length=50), nullable=False),
        sa.Column("subject_id", sa.String(length=100), nullable=False),
        sa.Column("trace_id", sa.String(length=64), nullable=True),
        sa.Column("correlation_id", sa.String(length=64), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_events_event_id", "audit_events", ["event_id"])
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"])
    op.create_index("ix_audit_events_subject_id", "audit_events", ["subject_id"])
    op.create_index("ix_audit_events_trace_id", "audit_events", ["trace_id"])
    op.create_index("ix_audit_events_correlation_id", "audit_events", ["correlation_id"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_events")
    op.drop_table("skill_findings")
    op.drop_table("skill_documents")
