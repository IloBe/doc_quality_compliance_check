"""Add quality_observations table for tracing and AI quality telemetry.

Revision ID: 006
Revises: 005
Create Date: 2026-03-31
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create quality_observations table and indexes."""
    op.create_table(
        "quality_observations",
        sa.Column("observation_id", sa.String(length=64), nullable=False),
        sa.Column("event_time", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("source_component", sa.String(length=100), nullable=False),
        sa.Column("aspect", sa.String(length=50), nullable=False),
        sa.Column("outcome", sa.String(length=20), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("latency_ms", sa.Float(), nullable=True),
        sa.Column("error_type", sa.String(length=100), nullable=True),
        sa.Column("hallucination_flag", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("evaluation_dataset", sa.String(length=100), nullable=True),
        sa.Column("evaluation_metric", sa.String(length=100), nullable=True),
        sa.Column("subject_type", sa.String(length=50), nullable=True),
        sa.Column("subject_id", sa.String(length=100), nullable=True),
        sa.Column("trace_id", sa.String(length=64), nullable=True),
        sa.Column("correlation_id", sa.String(length=64), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("observation_id"),
    )

    op.create_index("ix_quality_observations_observation_id", "quality_observations", ["observation_id"])
    op.create_index("ix_quality_observations_event_time", "quality_observations", ["event_time"])
    op.create_index("ix_quality_observations_source_component", "quality_observations", ["source_component"])
    op.create_index("ix_quality_observations_aspect", "quality_observations", ["aspect"])
    op.create_index("ix_quality_observations_outcome", "quality_observations", ["outcome"])
    op.create_index("ix_quality_observations_error_type", "quality_observations", ["error_type"])
    op.create_index("ix_quality_observations_hallucination_flag", "quality_observations", ["hallucination_flag"])
    op.create_index("ix_quality_observations_evaluation_dataset", "quality_observations", ["evaluation_dataset"])
    op.create_index("ix_quality_observations_subject_type", "quality_observations", ["subject_type"])
    op.create_index("ix_quality_observations_subject_id", "quality_observations", ["subject_id"])
    op.create_index("ix_quality_observations_trace_id", "quality_observations", ["trace_id"])
    op.create_index("ix_quality_observations_correlation_id", "quality_observations", ["correlation_id"])
    op.create_index("ix_quality_observations_created_at", "quality_observations", ["created_at"])


def downgrade() -> None:
    """Drop quality_observations table and indexes."""
    op.drop_index("ix_quality_observations_created_at", table_name="quality_observations")
    op.drop_index("ix_quality_observations_correlation_id", table_name="quality_observations")
    op.drop_index("ix_quality_observations_trace_id", table_name="quality_observations")
    op.drop_index("ix_quality_observations_subject_id", table_name="quality_observations")
    op.drop_index("ix_quality_observations_subject_type", table_name="quality_observations")
    op.drop_index("ix_quality_observations_evaluation_dataset", table_name="quality_observations")
    op.drop_index("ix_quality_observations_hallucination_flag", table_name="quality_observations")
    op.drop_index("ix_quality_observations_error_type", table_name="quality_observations")
    op.drop_index("ix_quality_observations_outcome", table_name="quality_observations")
    op.drop_index("ix_quality_observations_aspect", table_name="quality_observations")
    op.drop_index("ix_quality_observations_source_component", table_name="quality_observations")
    op.drop_index("ix_quality_observations_event_time", table_name="quality_observations")
    op.drop_index("ix_quality_observations_observation_id", table_name="quality_observations")
    op.drop_table("quality_observations")
