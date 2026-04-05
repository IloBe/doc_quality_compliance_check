"""Backend Skills API service.

This service is the current system-of-record boundary for orchestrator tool calls.
It persists documents, findings, and audit events behind explicit backend endpoints
so agents never need direct database credentials.
"""
from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
import uuid

from docx import Document as DocxDocument
from pypdf import PdfReader
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from ..core.logging_config import get_logger
from ..core.security import sanitize_text, validate_filename, validate_file_size
from ..models.document import DocumentType
from ..models.orm import AuditEventORM, AuditScheduleORM, FindingORM, SkillDocumentORM
from ..models.skills import (
    AuditEventRecord,
    AuditEventListResponse,
    AuditScheduleRecord,
    ExtractTextRequest,
    ExtractTextResponse,
    FindingRecord,
    LogEventRequest,
    SearchDocumentsRequest,
    SearchDocumentsResponse,
    SkillDocumentRecord,
    UpsertAuditScheduleRequest,
    WriteFindingRequest,
)
from .ocr_fallback import extract_text_with_fallback

logger = get_logger(__name__)


_SUPPORTED_TEXT_TYPES = {".md", ".txt"}

WORKFLOW_STATUS_DRAFT = "draft"
WORKFLOW_STATUS_IN_REVIEW = "in_review"
WORKFLOW_STATUS_APPROVED = "approved"
WORKFLOW_STATUS_REWORK_AFTER_REVIEW = "rework_after_review"

_VALID_WORKFLOW_STATUSES = {
    WORKFLOW_STATUS_DRAFT,
    WORKFLOW_STATUS_IN_REVIEW,
    WORKFLOW_STATUS_APPROVED,
    WORKFLOW_STATUS_REWORK_AFTER_REVIEW,
}


def _detect_content_type(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    return {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".md": "text/markdown",
        ".txt": "text/plain",
    }.get(extension, "application/octet-stream")


def _extract_text_from_bytes(content_bytes: bytes, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension in _SUPPORTED_TEXT_TYPES:
        try:
            return content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return content_bytes.decode("latin-1")
    if extension == ".pdf":
        # Use confidence-gated OCR fallback pipeline
        result = extract_text_with_fallback(content_bytes, filename)
        logger.info(
            "pdf_extraction_complete",
            filename=filename,
            method=result.method,
            confidence=result.confidence,
        )
        return result.text
    if extension == ".docx":
        document = DocxDocument(BytesIO(content_bytes))
        return "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    raise ValueError(f"Unsupported file type: {extension!r}")


def _to_document_record(record: SkillDocumentORM) -> SkillDocumentRecord:
    return SkillDocumentRecord(
        document_id=record.document_id,
        filename=record.filename,
        content_type=record.content_type,
        document_type=DocumentType(record.document_type),
        workflow_status=(record.workflow_status or WORKFLOW_STATUS_DRAFT),
        extracted_text=record.extracted_text,
        source=record.source,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def persist_document(
    db: Session,
    *,
    filename: str,
    content_type: str,
    extracted_text: str,
    document_type: DocumentType = DocumentType.UNKNOWN,
    source: str = "analyze_text",
    document_id: str | None = None,
) -> SkillDocumentRecord:
    """Persist or update a document record for Skills API access."""
    sanitized_filename = validate_filename(filename)
    sanitized_text = sanitize_text(extracted_text)
    resolved_document_id = document_id or str(uuid.uuid4())

    existing = db.query(SkillDocumentORM).filter(SkillDocumentORM.document_id == resolved_document_id).first()
    if existing is None:
        existing = SkillDocumentORM(
            document_id=resolved_document_id,
            filename=sanitized_filename,
            content_type=content_type,
            document_type=document_type.value,
            workflow_status=WORKFLOW_STATUS_DRAFT,
            extracted_text=sanitized_text,
            source=source,
        )
        db.add(existing)
    else:
        existing.filename = sanitized_filename
        existing.content_type = content_type
        existing.document_type = document_type.value
        existing.extracted_text = sanitized_text
        existing.source = source

    db.commit()
    db.refresh(existing)
    logger.info("skill_document_persisted", document_id=existing.document_id, source=source)
    return _to_document_record(existing)


def set_document_workflow_status(db: Session, document_id: str, workflow_status: str) -> SkillDocumentRecord:
    """Update persisted workflow status for a document."""
    normalized = sanitize_text(workflow_status).strip().lower()
    if normalized not in _VALID_WORKFLOW_STATUSES:
        raise ValueError(f"Unsupported workflow status: {workflow_status}")

    record = db.query(SkillDocumentORM).filter(SkillDocumentORM.document_id == document_id).first()
    if record is None:
        raise ValueError(f"Document not found: {document_id}")

    record.workflow_status = normalized
    db.flush()
    db.refresh(record)
    logger.info("skill_document_workflow_status_updated", document_id=document_id, workflow_status=normalized)
    return _to_document_record(record)


def get_document(db: Session, document_id: str) -> SkillDocumentRecord | None:
    """Retrieve a stored document by id."""
    record = db.query(SkillDocumentORM).filter(SkillDocumentORM.document_id == document_id).first()
    if record is None:
        return None
    return _to_document_record(record)


def search_documents(db: Session, request: SearchDocumentsRequest) -> SearchDocumentsResponse:
    """Search stored documents by filename or extracted text."""
    query = db.query(SkillDocumentORM)
    if request.document_type is not None:
        query = query.filter(SkillDocumentORM.document_type == request.document_type.value)
    if request.query.strip():
        search_term = f"%{sanitize_text(request.query).lower()}%"
        query = query.filter(
            or_(
                SkillDocumentORM.filename.ilike(search_term),
                SkillDocumentORM.extracted_text.ilike(search_term),
            )
        )
    results = query.order_by(SkillDocumentORM.created_at.desc()).limit(request.limit).all()
    return SearchDocumentsResponse(results=[_to_document_record(item) for item in results])


def extract_text(db: Session, request: ExtractTextRequest, max_file_size_mb: int) -> ExtractTextResponse:
    """Extract text from stored or inline document content."""
    if request.document_id is not None:
        document = get_document(db, request.document_id)
        if document is None:
            raise ValueError(f"Document not found: {request.document_id}")
        return ExtractTextResponse(
            extracted_text=document.extracted_text,
            filename=document.filename,
            content_type=document.content_type,
            document_id=document.document_id,
        )

    if request.filename is None or request.content_base64 is None:
        raise ValueError("Either document_id or filename + content_base64 must be provided")

    filename = validate_filename(request.filename)
    content_bytes = base64.b64decode(request.content_base64)
    validate_file_size(len(content_bytes), max_file_size_mb)
    extracted_text = sanitize_text(_extract_text_from_bytes(content_bytes, filename))
    content_type = request.content_type or _detect_content_type(filename)

    document_id: str | None = None
    if request.store_document:
        record = persist_document(
            db,
            filename=filename,
            content_type=content_type,
            extracted_text=extracted_text,
            document_type=request.document_type or DocumentType.UNKNOWN,
            source="skills_extract",
        )
        document_id = record.document_id

    logger.info("skill_text_extracted", filename=filename, stored=bool(document_id))
    return ExtractTextResponse(
        extracted_text=extracted_text,
        filename=filename,
        content_type=content_type,
        document_id=document_id,
    )


def write_finding(db: Session, request: WriteFindingRequest) -> FindingRecord:
    """Persist a finding tied to a document."""
    if get_document(db, request.document_id) is None:
        raise ValueError(f"Document not found: {request.document_id}")

    record = FindingORM(
        finding_id=str(uuid.uuid4()),
        document_id=request.document_id,
        finding_type=sanitize_text(request.finding_type),
        title=sanitize_text(request.title),
        description=sanitize_text(request.description),
        severity=request.severity,
        evidence=request.evidence,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("skill_finding_written", finding_id=record.finding_id, document_id=record.document_id)
    return FindingRecord(
        finding_id=record.finding_id,
        document_id=record.document_id,
        finding_type=record.finding_type,
        title=record.title,
        description=record.description,
        severity=record.severity,
        evidence=record.evidence,
        created_at=record.created_at,
    )


def log_event(db: Session, request: LogEventRequest) -> AuditEventRecord:
    """Persist an audit event for orchestrator/tool activity.
    
    Persists events to append-only audit_events table with provenance fields
    (tenant_id, org_id, project_id, event_time) for compliance audit trail.
    """
    record = AuditEventORM(
        event_id=str(uuid.uuid4()),
        event_type=sanitize_text(request.event_type),
        actor_type=sanitize_text(request.actor_type),
        actor_id=sanitize_text(request.actor_id),
        subject_type=sanitize_text(request.subject_type),
        subject_id=sanitize_text(request.subject_id),
        trace_id=sanitize_text(request.trace_id) if request.trace_id else None,
        correlation_id=sanitize_text(request.correlation_id) if request.correlation_id else None,
        tenant_id=sanitize_text(request.tenant_id),  # NEW: Multi-tenancy support
        org_id=sanitize_text(request.org_id) if request.org_id else None,  # NEW: Organization identifier
        project_id=sanitize_text(request.project_id) if request.project_id else None,  # NEW: Project identifier
        payload=request.payload,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("skill_event_logged", event_id=record.event_id, event_type=record.event_type, tenant_id=record.tenant_id)
    return AuditEventRecord(
        event_id=record.event_id,
        event_type=record.event_type,
        actor_type=record.actor_type,
        actor_id=record.actor_id,
        subject_type=record.subject_type,
        subject_id=record.subject_id,
        trace_id=record.trace_id,
        correlation_id=record.correlation_id,
        tenant_id=record.tenant_id,  # NEW: Multi-tenancy support
        org_id=record.org_id,  # NEW: Organization identifier
        project_id=record.project_id,  # NEW: Project identifier
        event_time=record.event_time,  # NEW: Event timestamp
        payload=record.payload,
        created_at=record.created_at,
    )


def list_audit_events(
    db: Session,
    *,
    window_hours: int = 24 * 30,
    limit: int = 200,
    event_type: str | None = None,
    actor_id: str | None = None,
    subject_type: str | None = None,
    subject_id: str | None = None,
) -> AuditEventListResponse:
    """Return recent audit events for governance and compliance review pages."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=window_hours)

    query = db.query(AuditEventORM).filter(AuditEventORM.event_time >= window_start)

    if event_type:
        query = query.filter(AuditEventORM.event_type.ilike(f"%{sanitize_text(event_type)}%"))
    if actor_id:
        query = query.filter(AuditEventORM.actor_id.ilike(f"%{sanitize_text(actor_id)}%"))
    if subject_type:
        query = query.filter(AuditEventORM.subject_type.ilike(f"%{sanitize_text(subject_type)}%"))
    if subject_id:
        query = query.filter(AuditEventORM.subject_id.ilike(f"%{sanitize_text(subject_id)}%"))

    rows = query.order_by(desc(AuditEventORM.event_time)).limit(limit).all()

    return AuditEventListResponse(
        items=[
            AuditEventRecord(
                event_id=row.event_id,
                event_type=row.event_type,
                actor_type=row.actor_type,
                actor_id=row.actor_id,
                subject_type=row.subject_type,
                subject_id=row.subject_id,
                trace_id=row.trace_id,
                correlation_id=row.correlation_id,
                tenant_id=row.tenant_id,
                org_id=row.org_id,
                project_id=row.project_id,
                event_time=row.event_time,
                payload=row.payload,
                created_at=row.created_at,
            )
            for row in rows
        ]
    )


def get_audit_event_by_id(db: Session, event_id: str) -> AuditEventRecord | None:
    """Return one audit event by id for row-level drilldown views."""
    row = db.query(AuditEventORM).filter(AuditEventORM.event_id == sanitize_text(event_id)).first()
    if row is None:
        return None

    return AuditEventRecord(
        event_id=row.event_id,
        event_type=row.event_type,
        actor_type=row.actor_type,
        actor_id=row.actor_id,
        subject_type=row.subject_type,
        subject_id=row.subject_id,
        trace_id=row.trace_id,
        correlation_id=row.correlation_id,
        tenant_id=row.tenant_id,
        org_id=row.org_id,
        project_id=row.project_id,
        event_time=row.event_time,
        payload=row.payload,
        created_at=row.created_at,
    )


def get_audit_schedule(
    db: Session,
    *,
    tenant_id: str = "default_tenant",
    org_id: str | None = None,
    project_id: str | None = None,
) -> AuditScheduleRecord:
    """Return persistent audit schedule; create a default record when missing."""
    normalized_tenant = sanitize_text(tenant_id).strip() or "default_tenant"
    normalized_org = sanitize_text(org_id).strip() if org_id else None
    normalized_project = sanitize_text(project_id).strip() if project_id else None

    row = (
        db.query(AuditScheduleORM)
        .filter(
            AuditScheduleORM.tenant_id == normalized_tenant,
            AuditScheduleORM.org_id == normalized_org,
            AuditScheduleORM.project_id == normalized_project,
        )
        .first()
    )

    if row is None:
        row = AuditScheduleORM(
            schedule_id=str(uuid.uuid4()),
            tenant_id=normalized_tenant,
            org_id=normalized_org,
            project_id=normalized_project,
            internal_audit_date=None,
            external_audit_date=None,
            external_notified_body=None,
            updated_by="system",
        )
        db.add(row)
        db.commit()
        db.refresh(row)

    return AuditScheduleRecord(
        schedule_id=row.schedule_id,
        tenant_id=row.tenant_id,
        org_id=row.org_id,
        project_id=row.project_id,
        internal_audit_date=row.internal_audit_date,
        external_audit_date=row.external_audit_date,
        external_notified_body=row.external_notified_body,
        updated_by=row.updated_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def upsert_audit_schedule(
    db: Session,
    *,
    request: UpsertAuditScheduleRequest,
    updated_by: str,
) -> AuditScheduleRecord:
    """Create or update persistent governance audit schedule."""
    normalized_tenant = sanitize_text(request.tenant_id).strip() or "default_tenant"
    normalized_org = sanitize_text(request.org_id).strip() if request.org_id else None
    normalized_project = sanitize_text(request.project_id).strip() if request.project_id else None
    normalized_notified_body = sanitize_text(request.external_notified_body).strip() if request.external_notified_body else None

    row = (
        db.query(AuditScheduleORM)
        .filter(
            AuditScheduleORM.tenant_id == normalized_tenant,
            AuditScheduleORM.org_id == normalized_org,
            AuditScheduleORM.project_id == normalized_project,
        )
        .first()
    )

    if row is None:
        row = AuditScheduleORM(
            schedule_id=str(uuid.uuid4()),
            tenant_id=normalized_tenant,
            org_id=normalized_org,
            project_id=normalized_project,
        )
        db.add(row)

    row.internal_audit_date = request.internal_audit_date
    row.external_audit_date = request.external_audit_date
    row.external_notified_body = normalized_notified_body
    row.updated_by = sanitize_text(updated_by)

    db.commit()
    db.refresh(row)

    return AuditScheduleRecord(
        schedule_id=row.schedule_id,
        tenant_id=row.tenant_id,
        org_id=row.org_id,
        project_id=row.project_id,
        internal_audit_date=row.internal_audit_date,
        external_audit_date=row.external_audit_date,
        external_notified_body=row.external_notified_body,
        updated_by=row.updated_by,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
