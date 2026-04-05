"""Compliance alert archive service backed by append-only audit events."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..models.compliance_alerts import ComplianceAlertRecord
from ..models.orm import AuditEventORM

ALERT_EVENT_TYPE = "research.compliance_alert.detected"
ALERT_SUBJECT_TYPE = "compliance_alert"
ALERT_TENANT_ID = "demo-tenant"
ALERT_ORG_ID = "governance"
ALERT_PROJECT_ID = "compliance-archive"

_DEMO_ALERT_FIXTURES: list[dict[str, object]] = [
    {
        "alert_id": "alert-eu-ai-act-20260405-01",
        "framework": "EU AI Act",
        "title": "Annex III review note added for high-risk workflow evidence",
        "summary": "Monitoring detected updated emphasis on linking high-risk AI workflow documentation with human-oversight evidence and risk-management rationale.",
        "severity": "info",
        "source_label": "Official Journal monitoring snapshot",
        "source_url": "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
        "provider": "perplexity_demo_seed",
        "model_used": "sonar-pro",
        "search_query": "EU AI Act Annex III high-risk documentation oversight update April 2026",
        "jurisdiction": "EU",
        "observed_at": "2026-04-05T08:10:00+00:00",
        "event_time": "2026-04-05T08:10:00+00:00",
    },
    {
        "alert_id": "alert-gdpr-20260404-01",
        "framework": "GDPR",
        "title": "AI data-minimization guidance tightened for review pipelines",
        "summary": "Privacy monitoring flagged stricter supervisory language around minimization and purpose limitation for AI-supported document review operations.",
        "severity": "warning",
        "source_label": "EDPB policy watch",
        "source_url": "https://www.edpb.europa.eu/",
        "provider": "perplexity_demo_seed",
        "model_used": "sonar-pro",
        "search_query": "GDPR AI data minimization guidance review workflow April 2026",
        "jurisdiction": "EU",
        "observed_at": "2026-04-04T16:40:00+00:00",
        "event_time": "2026-04-04T16:40:00+00:00",
    },
    {
        "alert_id": "alert-hipaa-20260404-01",
        "framework": "HIPAA",
        "title": "Access-log completeness reminder issued for PHI workflow reviews",
        "summary": "Healthcare privacy monitoring highlighted renewed attention on complete PHI access traces, reviewer accountability, and breach-assessment evidence retention.",
        "severity": "warning",
        "source_label": "HHS advisory digest",
        "source_url": "https://www.hhs.gov/hipaa/index.html",
        "provider": "perplexity_demo_seed",
        "model_used": "sonar-pro",
        "search_query": "HIPAA access log completeness reviewer audit trail April 2026",
        "jurisdiction": "US",
        "observed_at": "2026-04-04T09:25:00+00:00",
        "event_time": "2026-04-04T09:25:00+00:00",
    },
    {
        "alert_id": "alert-eu-ai-act-20260403-01",
        "framework": "EU AI Act",
        "title": "Conformity-assessment note reinforces traceability to risk decisions",
        "summary": "Research monitoring surfaced guidance language emphasizing that technical documentation should be directly traceable to risk acceptance and mitigation decisions.",
        "severity": "info",
        "source_label": "Regulatory research digest",
        "source_url": "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
        "provider": "perplexity_demo_seed",
        "model_used": "sonar-pro",
        "search_query": "EU AI Act conformity assessment technical documentation risk traceability April 2026",
        "jurisdiction": "EU",
        "observed_at": "2026-04-03T13:05:00+00:00",
        "event_time": "2026-04-03T13:05:00+00:00",
    },
    {
        "alert_id": "alert-gdpr-20260402-01",
        "framework": "GDPR",
        "title": "Controller accountability bulletin stresses retention logic for reviewer actions",
        "summary": "Monitoring highlighted that approval, remediation, and reviewer action history should remain audit-ready under documented retention controls.",
        "severity": "info",
        "source_label": "Privacy operations brief",
        "source_url": "https://gdpr-info.eu/",
        "provider": "perplexity_demo_seed",
        "model_used": "sonar-pro",
        "search_query": "GDPR controller accountability retention reviewer action audit April 2026",
        "jurisdiction": "EU",
        "observed_at": "2026-04-02T11:15:00+00:00",
        "event_time": "2026-04-02T11:15:00+00:00",
    },
]


def _parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _parse_filter_datetime(value: str, *, end_of_day: bool = False) -> datetime | None:
    """Parse ISO-8601 or YYYY-MM-DD filter input into timezone-aware datetime."""
    candidate = value.strip()
    if not candidate:
        return None

    try:
        if len(candidate) == 10 and candidate.count("-") == 2:
            parsed_date = datetime.fromisoformat(candidate)
            if end_of_day:
                return parsed_date.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            return parsed_date.replace(tzinfo=timezone.utc)

        normalized = candidate.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def _to_record(row: AuditEventORM) -> ComplianceAlertRecord:
    payload = row.payload or {}
    return ComplianceAlertRecord(
        alert_id=row.subject_id,
        framework=str(payload.get("framework") or "Unknown"),
        title=str(payload.get("title") or ""),
        summary=str(payload.get("summary") or ""),
        severity=str(payload.get("severity") or "info"),
        source_label=str(payload.get("source_label") or "Unknown source"),
        source_url=str(payload.get("source_url")) if payload.get("source_url") else None,
        provider=str(payload.get("provider") or "unknown"),
        model_used=str(payload.get("model_used")) if payload.get("model_used") else None,
        search_query=str(payload.get("search_query")) if payload.get("search_query") else None,
        jurisdiction=str(payload.get("jurisdiction")) if payload.get("jurisdiction") else None,
        observed_at=(str(payload.get("observed_at")) if payload.get("observed_at") else row.event_time.isoformat()),
        event_time=row.event_time.isoformat(),
        is_demo=bool(payload.get("is_demo", False)),
        payload_snapshot=payload,
    )


def ensure_demo_compliance_alerts(db: Session) -> None:
    """Persist deterministic demo alert events when archive storage is empty."""
    existing = (
        db.query(AuditEventORM)
        .filter(AuditEventORM.event_type == ALERT_EVENT_TYPE)
        .count()
    )
    if existing > 0:
        return

    now = datetime.now(timezone.utc)
    for fixture in _DEMO_ALERT_FIXTURES:
        event_time = _parse_dt(str(fixture["event_time"]))
        payload = {
            "framework": fixture["framework"],
            "title": fixture["title"],
            "summary": fixture["summary"],
            "severity": fixture["severity"],
            "source_label": fixture["source_label"],
            "source_url": fixture["source_url"],
            "provider": fixture["provider"],
            "model_used": fixture["model_used"],
            "search_query": fixture["search_query"],
            "jurisdiction": fixture["jurisdiction"],
            "observed_at": fixture["observed_at"],
            "is_demo": True,
            "snapshot_version": "2026-04-05-demo-seed-v1",
        }
        db.add(
            AuditEventORM(
                event_id=f"evt-{str(fixture['alert_id']).replace('alert-', '')}",
                tenant_id=ALERT_TENANT_ID,
                org_id=ALERT_ORG_ID,
                project_id=ALERT_PROJECT_ID,
                event_time=event_time,
                event_type=ALERT_EVENT_TYPE,
                actor_type="system",
                actor_id="research_agent",
                subject_type=ALERT_SUBJECT_TYPE,
                subject_id=str(fixture["alert_id"]),
                trace_id=None,
                correlation_id="demo-seed-compliance-alert-archive",
                payload=payload,
                created_at=now,
            )
        )

    db.commit()


def list_compliance_alerts(
    db: Session,
    *,
    framework: str | None = None,
    severity: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 50,
) -> list[ComplianceAlertRecord]:
    """Return persisted compliance alerts with optional framework filtering."""
    ensure_demo_compliance_alerts(db)

    rows = (
        db.query(AuditEventORM)
        .filter(
            AuditEventORM.event_type == ALERT_EVENT_TYPE,
            AuditEventORM.subject_type == ALERT_SUBJECT_TYPE,
        )
        .order_by(desc(AuditEventORM.event_time))
        .all()
    )

    records = [_to_record(row) for row in rows]
    if framework:
        framework_lower = framework.casefold()
        records = [record for record in records if record.framework.casefold() == framework_lower]

    if severity:
        severity_lower = severity.casefold()
        records = [record for record in records if record.severity.casefold() == severity_lower]

    start_dt = _parse_filter_datetime(start_date) if start_date else None
    end_dt = _parse_filter_datetime(end_date, end_of_day=True) if end_date else None

    if start_dt:
        records = [
            record
            for record in records
            if (parsed := _parse_filter_datetime(record.observed_at)) is not None and parsed >= start_dt
        ]
    if end_dt:
        records = [
            record
            for record in records
            if (parsed := _parse_filter_datetime(record.observed_at)) is not None and parsed <= end_dt
        ]

    return records[: max(1, min(limit, 200))]
