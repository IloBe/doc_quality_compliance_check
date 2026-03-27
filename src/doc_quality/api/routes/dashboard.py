"""Dashboard aggregation endpoints for quality/audit analytics."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...models.orm import AuditEventORM, FindingORM, ReviewRecordORM, SkillDocumentORM

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

Timeframe = Literal["week", "month", "year"]


class DashboardCheck(BaseModel):
    standard: str
    article: str
    passed: bool


class DashboardDocumentRow(BaseModel):
    document_id: str
    title: str
    risk_class: Literal["High", "Limited", "Minimal"]
    cycle_days: float
    passed_checks: int
    failed_checks: int
    checks: list[DashboardCheck] = Field(default_factory=list)


class DashboardKpis(BaseModel):
    open_documents: int
    closed_documents: int
    active_jobs: int
    closed_jobs: int
    avg_cycle_days: float
    compliance_pass_rate: int
    bridge_runs_done: int


class DashboardRiskDistribution(BaseModel):
    high: int
    limited: int
    minimal: int


class DashboardSummaryResponse(BaseModel):
    timeframe: Timeframe
    window_start: datetime
    window_end: datetime
    kpis: DashboardKpis
    risk_distribution: DashboardRiskDistribution
    documents: list[DashboardDocumentRow] = Field(default_factory=list)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _window_start(now: datetime, timeframe: Timeframe) -> datetime:
    if timeframe == "week":
        return now - timedelta(days=7)
    if timeframe == "month":
        return now - timedelta(days=30)
    return now - timedelta(days=365)


def _is_closed_review_status(status: str | None) -> bool:
    normalized = (status or "").strip().lower()
    return normalized in {"approved", "closed", "done", "completed", "accepted"}


def _is_active_review_status(status: str | None) -> bool:
    normalized = (status or "").strip().lower()
    return normalized in {"pending", "in_review", "in-review", "open", "requested_changes", "requested-changes"}


def _derive_standard_and_article(finding: FindingORM) -> tuple[str, str]:
    evidence = finding.evidence or {}
    standard = (
        evidence.get("standard")
        or evidence.get("framework")
        or evidence.get("regulation")
        or evidence.get("norm")
    )
    article = (
        evidence.get("article")
        or evidence.get("clause")
        or evidence.get("requirement")
        or evidence.get("control")
    )

    text = f"{finding.title} {finding.description}".lower()
    if not standard:
        if "eu ai act" in text or "ai act" in text:
            standard = "EU AI Act"
        elif "iso 9001" in text:
            standard = "ISO 9001"
        elif "iso 27001" in text:
            standard = "ISO 27001"
        elif "gdpr" in text:
            standard = "GDPR"

    return str(standard or "Unmapped"), str(article or "n/a")


def _derive_pass_fail(finding: FindingORM) -> bool:
    evidence = finding.evidence or {}

    if isinstance(evidence.get("passed"), bool):
        return bool(evidence.get("passed"))

    status_value = str(evidence.get("status") or evidence.get("compliance_status") or "").strip().lower()
    if status_value:
        return status_value in {"pass", "passed", "met", "ok", "compliant", "fulfilled"}

    finding_type = (finding.finding_type or "").lower()
    title = (finding.title or "").lower()
    description = (finding.description or "").lower()
    text = f"{finding_type} {title} {description}"

    if any(keyword in text for keyword in ["fail", "failed", "gap", "missing", "non-compliant"]):
        return False
    if any(keyword in text for keyword in ["pass", "passed", "met", "compliant", "fulfilled"]):
        return True

    return finding.severity in {"low", "medium"}


def _derive_risk_class(findings: list[FindingORM], events: list[AuditEventORM]) -> Literal["High", "Limited", "Minimal"]:
    # Prefer explicit evidence fields when available.
    for finding in findings:
        evidence = finding.evidence or {}
        value = evidence.get("risk_class") or evidence.get("risk_level") or evidence.get("classification") or evidence.get("verdict")
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized.startswith("high"):
                return "High"
            if normalized.startswith("limit"):
                return "Limited"
            if normalized.startswith("min"):
                return "Minimal"

    for finding in findings:
        text = f"{finding.finding_type} {finding.title} {finding.description}".lower()
        if "high" in text:
            return "High"
        if "limited" in text:
            return "Limited"
        if "minimal" in text:
            return "Minimal"

    for event in events:
        payload = event.payload or {}
        verdict = payload.get("verdict") or payload.get("risk")
        if isinstance(verdict, str):
            normalized = verdict.strip().lower()
            if normalized.startswith("high"):
                return "High"
            if normalized.startswith("limit"):
                return "Limited"
            if normalized.startswith("min"):
                return "Minimal"

    return "Limited"


@router.get("/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary(
    timeframe: Timeframe = Query(default="month"),
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    """Return dashboard analytics aggregated from persisted backend records."""
    now = _now_utc()
    start = _window_start(now, timeframe)

    docs = (
        db.query(SkillDocumentORM)
        .filter(SkillDocumentORM.updated_at >= start, SkillDocumentORM.updated_at <= now)
        .all()
    )

    reviews = (
        db.query(ReviewRecordORM)
        .filter(ReviewRecordORM.created_at >= start, ReviewRecordORM.created_at <= now)
        .all()
    )
    reviews_by_doc: dict[str, list[ReviewRecordORM]] = {}
    for review in reviews:
        reviews_by_doc.setdefault(review.document_id, []).append(review)

    findings = (
        db.query(FindingORM)
        .filter(FindingORM.created_at >= start, FindingORM.created_at <= now)
        .all()
    )
    findings_by_doc: dict[str, list[FindingORM]] = {}
    for finding in findings:
        findings_by_doc.setdefault(finding.document_id, []).append(finding)

    events = (
        db.query(AuditEventORM)
        .filter(AuditEventORM.event_time >= start, AuditEventORM.event_time <= now)
        .all()
    )
    events_by_doc: dict[str, list[AuditEventORM]] = {}
    bridge_runs_done = 0
    for event in events:
        payload = event.payload or {}
        event_type = (event.event_type or "").lower()
        status_value = str(payload.get("status") or "").lower()
        if "bridge" in event_type and ("done" in event_type or status_value == "done"):
            bridge_runs_done += 1
        if event.subject_type in {"document", "doc", "skill_document"}:
            events_by_doc.setdefault(event.subject_id, []).append(event)

    # Jobs are mapped to review tasks for now.
    active_jobs = sum(1 for review in reviews if _is_active_review_status(review.status))
    closed_jobs = sum(1 for review in reviews if _is_closed_review_status(review.status))

    rows: list[DashboardDocumentRow] = []
    all_checks: list[DashboardCheck] = []

    for doc in docs:
        doc_reviews = sorted(reviews_by_doc.get(doc.document_id, []), key=lambda r: r.created_at)
        latest_review = doc_reviews[-1] if doc_reviews else None

        if latest_review and latest_review.approval_date:
            cycle_days = max(
                0.0,
                round((latest_review.approval_date - latest_review.created_at).total_seconds() / 86400.0, 1),
            )
        else:
            cycle_days = max(0.0, round((doc.updated_at - doc.created_at).total_seconds() / 86400.0, 1))

        doc_findings = findings_by_doc.get(doc.document_id, [])
        doc_events = events_by_doc.get(doc.document_id, [])

        checks = [
            DashboardCheck(
                standard=standard,
                article=article,
                passed=_derive_pass_fail(finding),
            )
            for finding in doc_findings
            for (standard, article) in [_derive_standard_and_article(finding)]
        ]

        passed = sum(1 for check in checks if check.passed)
        failed = len(checks) - passed
        all_checks.extend(checks)

        rows.append(
            DashboardDocumentRow(
                document_id=doc.document_id,
                title=doc.filename,
                risk_class=_derive_risk_class(doc_findings, doc_events),
                cycle_days=cycle_days,
                passed_checks=passed,
                failed_checks=failed,
                checks=checks,
            )
        )

    open_documents = 0
    closed_documents = 0
    for row in rows:
        latest_review = None
        doc_reviews = sorted(reviews_by_doc.get(row.document_id, []), key=lambda r: r.created_at)
        if doc_reviews:
            latest_review = doc_reviews[-1]

        if latest_review is not None and _is_closed_review_status(latest_review.status):
            closed_documents += 1
        else:
            open_documents += 1

    avg_cycle_days = round(sum(row.cycle_days for row in rows) / len(rows), 1) if rows else 0.0
    compliance_pass_rate = round((sum(1 for check in all_checks if check.passed) / len(all_checks)) * 100) if all_checks else 0

    risk_distribution = DashboardRiskDistribution(
        high=sum(1 for row in rows if row.risk_class == "High"),
        limited=sum(1 for row in rows if row.risk_class == "Limited"),
        minimal=sum(1 for row in rows if row.risk_class == "Minimal"),
    )

    return DashboardSummaryResponse(
        timeframe=timeframe,
        window_start=start,
        window_end=now,
        kpis=DashboardKpis(
            open_documents=open_documents,
            closed_documents=closed_documents,
            active_jobs=active_jobs,
            closed_jobs=closed_jobs,
            avg_cycle_days=avg_cycle_days,
            compliance_pass_rate=compliance_pass_rate,
            bridge_runs_done=bridge_runs_done,
        ),
        risk_distribution=risk_distribution,
        documents=rows,
    )
