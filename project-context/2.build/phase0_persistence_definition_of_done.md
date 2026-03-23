# Backend: Phase 0 Persistence Definition of Done (DoD)

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2026-03-22  
**Author persona:** `@backend-eng`  
**AAMAD phase:** 2.build  
**Related artifacts:** `project-context/1.define/sad.md`, `project-context/2.build/backend.md`, `project-context/2.build/persistence_migration.md`

---

## Purpose

This DoD defines implementable **Phase 0** acceptance criteria for PostgreSQL persistence with long-lived auditability:

- append-only event provenance,
- immutable snapshots,
- tiered retention (hot/warm/cold),
- compliant archival and retrieval,
- scalable partition/index strategy.

This content is aligned with SAD requirements and assumptions (PostgreSQL in P0, no approval-critical in-memory persistence).

---

## Decisions frozen for Phase 0

- **Retention defaults (with per-tenant/project override):**
  - Hot: `0–90 days` (OLTP, full indexes)
  - Warm: `90 days–24 months` (OLTP, reduced indexes)
  - Cold: `24+ months` (Parquet in object storage + manifest)
  - `legal_hold=true` always overrides deletion
- **Canonical schema:**
  - `audit_events` (append-only, partitioned)
  - `review_snapshots` (immutable, workflow-completion and nightly)
  - `archive_catalog` (archive location, checksum, time ranges, schema version)
  - optional `agent_telemetry` (short retention, non-compliance-critical)
- **Partitioning:** monthly range partitioning by `event_time`; optional tenant hash subpartitioning deferred until scale threshold is met.
- **Cold query strategy (chosen now):** **on-demand restore into temporary PostgreSQL tables** for Phase 0. Federated query is a Phase 1+ enhancement.

---

## DoD A — Canonical persistence schema

- [ ] `audit_events` table exists and is append-only by service contract (no update/delete path in application layer).
- [ ] `audit_events` contains required provenance fields:
  - `tenant_id`, `org_id`, `project_id`
  - `event_time` (`timestamptz`)
  - `event_type`, `actor_type`, `actor_id`
  - `correlation_id` / `trace_id`
  - `subject_type`, `subject_id`
  - `payload` (`jsonb`), optional `payload_hash`
- [ ] `review_snapshots` table exists and stores immutable state snapshots (workflow completion + nightly).
- [ ] `archive_catalog` table exists with object key, checksum, time range, partition id, tenant id, encryption reference, schema version.
- [ ] ORM models and migrations are present (SQLAlchemy + Alembic) and reproducible on clean DB bootstrap.

## DoD B — Retention and legal hold policy

- [ ] Retention policy is implemented as config + DB policy records (defaults + tenant/project overrides).
- [ ] Effective policy supports hot/warm/cold boundaries exactly as defined above.
- [ ] Legal hold flag prevents deletion/archive-drop actions.
- [ ] Redaction rules are policy-driven and auditable (who changed policy, when, why).

## DoD C — Partitioning and indexing baseline

- [ ] Monthly range partitions on `audit_events.event_time` are created and managed automatically.
- [ ] Baseline indexes exist and are validated:
  - `(tenant_id, event_time desc)`
  - `(tenant_id, correlation_id)`
  - `(tenant_id, subject_type, subject_id, event_time desc)`
- [ ] JSONB indexing is selective:
  - generated columns for frequently queried payload attributes
  - no blanket global GIN on all payload fields
- [ ] Additional/partial indexes are added only when justified by measured query patterns (`pg_stat_statements` evidence).

## DoD D — Archival pipeline (cold tier)

- [ ] Archival job exports eligible partitions to compressed Parquet.
- [ ] Manifest is generated per archive object with:
  - `row_count`, `min_event_time`, `max_event_time`, `sha256`, `schema_version`
- [ ] Archive objects are stored in KMS-encrypted object storage.
- [ ] WORM/Object Lock is configurable for regulated tenants.
- [ ] PostgreSQL partition drop is blocked when legal hold is active.
- [ ] `archive_catalog` is updated transactionally with archive metadata.

## DoD E — Integrity and non-repudiation

- [ ] Hash-chain is implemented per `correlation_id` (or per tenant/day if configured).
- [ ] Chain head is stored and verifiable.
- [ ] Manifest signature is stored and verifiable.
- [ ] Verification command/job exists and reports integrity status.

## DoD F — Cold data retrieval

- [ ] Retrieval endpoint/job restores archived partitions (or bounded time slices) into temporary PostgreSQL tables.
- [ ] Access control and audit logging are enforced for restore operations.
- [ ] SLA for restore path is documented (expected latency + size limits).

## DoD G — Agentic data separation and traceability

- [ ] Compliance-critical audit stream (`audit_events`) is separated from `agent_telemetry` stream.
- [ ] `agent_telemetry` has shorter retention than `audit_events`.
- [ ] Audit events include prompt/template version, model/provider metadata, and deterministic `trace_id`.
- [ ] Tool-call inputs/outputs are stored with redaction policy applied where required.

## DoD H — Operational readiness

- [ ] Background jobs exist for:
  - partition pre-creation,
  - snapshot creation,
  - archive export + checksum,
  - retention enforcement + legal hold checks.
- [ ] Autovacuum and ANALYZE strategy is documented for high-ingest partitions.
- [ ] Monitoring dashboard/alerts cover ingestion lag, archival lag, failed integrity checks, and retention job failures.

## DoD I — Test and compliance evidence

- [ ] Integration tests cover event append, snapshot creation, archive export, legal hold behavior, and restore flow.
- [ ] Migration tests verify upgrade from empty DB and from previous migration baseline.
- [ ] Compliance evidence bundle includes policy config, sample manifests, integrity verification output, and audit logs.

---

## Out of Scope for Phase 0

- Federated cold-query analytics (Trino/Athena/BigQuery)
- Multi-region active-active DB topology
- Tenant-hash subpartitioning (unless objective scale threshold is reached)

---

## Audit

```text
persona=backend-eng
action=define-phase0-persistence-dod
timestamp=2026-03-22
adapter=AAMAD-vscode
artifact=project-context/2.build/phase0_persistence_definition_of_done.md
version=0.1.0
status=complete
```