"""SQLAlchemy ORM models for database persistence."""
from datetime import datetime, timezone
import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, Integer, String, Text

from ..core.database import Base


class ReviewRecordORM(Base):
    """SQLAlchemy ORM model for HITL review records (persistent storage)."""

    __tablename__ = "hitl_reviews"

    review_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    document_id = Column(String(255), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending")  # ReviewStatus enum as string
    reviewer_name = Column(String(255), nullable=False)
    reviewer_role = Column(String(100), nullable=False)
    review_date = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    modifications_required = Column(JSON, nullable=False, default=list)  # List of ModificationRequest dicts
    comments = Column(String(4000), nullable=False, default="")
    approval_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        """Convert ORM model to dictionary."""
        return {
            "review_id": str(self.review_id),
            "document_id": self.document_id,
            "status": self.status,
            "reviewer_name": self.reviewer_name,
            "reviewer_role": self.reviewer_role,
            "review_date": self.review_date,
            "modifications_required": self.modifications_required,
            "comments": self.comments,
            "approval_date": self.approval_date,
        }


class SkillDocumentORM(Base):
    """Persistent document record used by the Skills API."""

    __tablename__ = "skill_documents"

    document_id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(255), nullable=False, index=True)
    content_type = Column(String(100), nullable=False)
    document_type = Column(String(50), nullable=False, default="unknown", index=True)
    extracted_text = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, default="analyze_text")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class FindingORM(Base):
    """Persistent finding record created through the Skills API."""

    __tablename__ = "skill_findings"

    finding_id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), nullable=False, index=True)
    finding_type = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, default="medium")
    evidence = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class AuditEventORM(Base):
    """Persistent audit event record used by orchestrator and skills workflows.
    
    Append-only audit trail with provenance fields for compliance audit trail.
    Schema (from backend.md):
    - tenant_id: Tenant identifier (multi-tenancy support)
    - org_id: Organization identifier within tenant
    - project_id: Project identifier within organization
    - event_time: Timestamp when event occurred (for range partitioning)
    - event_type: Type of audit event
    - actor_type: Type of actor (agent, user, system)
    - actor_id: Actor identifier
    - subject_type: Type of subject being acted upon
    - subject_id: Subject identifier
    - trace_id: Distributed trace identifier
    - correlation_id: Request correlation identifier
    - payload: Event-specific data (JSONB)
    """

    __tablename__ = "audit_events"

    event_id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)  # NEW: Multi-tenancy support
    org_id = Column(String(100), nullable=True, index=True)  # NEW: Organization identifier
    project_id = Column(String(100), nullable=True, index=True)  # NEW: Project identifier
    event_time = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)  # NEW: Event timestamp (for partitioning)
    event_type = Column(String(100), nullable=False, index=True)
    actor_type = Column(String(50), nullable=False)
    actor_id = Column(String(100), nullable=False)
    subject_type = Column(String(50), nullable=False)
    subject_id = Column(String(100), nullable=False, index=True)
    trace_id = Column(String(64), nullable=True, index=True)
    correlation_id = Column(String(64), nullable=True, index=True)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class AuditScheduleORM(Base):
    """Persistent governance audit schedule configuration."""

    __tablename__ = "audit_schedules"

    schedule_id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(100), nullable=False, index=True)
    org_id = Column(String(100), nullable=True, index=True)
    project_id = Column(String(100), nullable=True, index=True)
    internal_audit_date = Column(DateTime(timezone=True), nullable=True, index=True)
    external_audit_date = Column(DateTime(timezone=True), nullable=True, index=True)
    external_notified_body = Column(String(255), nullable=True)
    updated_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), index=True)


class BridgeHumanReviewORM(Base):
    """Persistent HITL decision for a specific bridge run and document."""

    __tablename__ = "bridge_human_reviews"

    review_id = Column(String(64), primary_key=True, index=True)
    run_id = Column(String(64), nullable=False, index=True)
    document_id = Column(String(64), nullable=False, index=True)
    decision = Column(String(32), nullable=False, index=True)  # approved|rejected
    reason = Column(String(4000), nullable=False)
    reviewer_email = Column(String(255), nullable=False, index=True)
    reviewer_roles = Column(JSON, nullable=False, default=list)
    reviewed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    next_task_type = Column(String(64), nullable=True, index=True)  # rerun_bridge|manual_follow_up
    next_task_assignee = Column(String(255), nullable=True, index=True)
    next_task_instructions = Column(String(4000), nullable=True)
    assignee_notified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class UserSessionORM(Base):
    """Persistent server-side user session (email/password MVP)."""

    __tablename__ = "user_sessions"

    session_id = Column(String(64), primary_key=True, index=True)
    session_token_hash = Column(String(128), nullable=False, unique=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    user_roles = Column(JSON, nullable=False, default=list)
    user_org = Column(String(255), nullable=True)
    is_revoked = Column(Boolean, nullable=False, default=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class AppUserORM(Base):
    """Application user record with hashed password."""

    __tablename__ = "app_users"

    user_id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(512), nullable=False)
    roles = Column(JSON, nullable=False, default=list)
    org = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    is_locked = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PasswordRecoveryTokenORM(Base):
    """Single-use password recovery tokens (only hashed token stored)."""

    __tablename__ = "password_recovery_tokens"

    token_id = Column(String(64), primary_key=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    token_hash = Column(String(128), nullable=False, unique=True, index=True)
    requested_ip = Column(String(64), nullable=True, index=True)
    requested_user_agent = Column(String(512), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True, index=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    requested_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class QualityObservationORM(Base):
    """Persistent quality and evaluation telemetry for production monitoring."""

    __tablename__ = "quality_observations"

    observation_id = Column(String(64), primary_key=True, index=True)
    event_time = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    source_component = Column(String(100), nullable=False, index=True)
    aspect = Column(String(50), nullable=False, index=True)
    outcome = Column(String(20), nullable=False, index=True)
    score = Column(Float, nullable=True)
    latency_ms = Column(Float, nullable=True)
    error_type = Column(String(100), nullable=True, index=True)
    hallucination_flag = Column(Boolean, nullable=False, default=False, index=True)
    evaluation_dataset = Column(String(100), nullable=True, index=True)
    evaluation_metric = Column(String(100), nullable=True)
    subject_type = Column(String(50), nullable=True, index=True)
    subject_id = Column(String(100), nullable=True, index=True)
    trace_id = Column(String(64), nullable=True, index=True)
    correlation_id = Column(String(64), nullable=True, index=True)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class StakeholderProfileORM(Base):
    """Persistent stakeholder role template and rights matrix profile."""

    __tablename__ = "stakeholder_profiles"

    profile_id = Column(String(64), primary_key=True, index=True)
    title = Column(String(120), nullable=False)
    description = Column(String(2000), nullable=False)
    permissions = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_by = Column(String(255), nullable=True)
    updated_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), index=True)


class StakeholderEmployeeAssignmentORM(Base):
    """Persistent assignment of named employees to stakeholder role profiles."""

    __tablename__ = "stakeholder_employee_assignments"

    assignment_id = Column(String(64), primary_key=True, index=True)
    profile_id = Column(String(64), nullable=False, index=True)
    employee_name = Column(String(255), nullable=False, index=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
