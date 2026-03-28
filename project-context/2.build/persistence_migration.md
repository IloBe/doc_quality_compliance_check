# Persistence Migration Plan: In-memory to PostgreSQL

<!-- markdownlint-disable MD022 MD032 MD058 MD060 -->

**Source Artifacts:** SAD.md, PRD.md
**Target Phase:** P0 (MVP Foundation for Scalability & Resilience)

## Problem Statement
Current HITL reviews and document analysis results are stored in dictionary-based in-memory stores. These are lost on server restart, violating audit traceability requirements.

## Proposed Approach
We will implement direct **PostgreSQL** persistence using **SQLAlchemy** (ORM) and **Alembic** (Migrations) to ensure compliance with EU AI Act Art. 12 from day one.

### Phase 0: PostgreSQL Implementation (MVP)
- Replace all dictionary-based stores with SQLAlchemy models.
- Purpose: Ensure permanent audit traceability.
- Benefit: Immediate scalability and compliance readiness.

### Phase 1: High Availability (Future)
- Database clustering and replicated backups.
- Advanced querying for complex audit analysis.

### Phase 2: Per Tenant DBs
- Changes partitioning and indexing recommendations

## Data Model (Summary)
| Entity | Storage Requirement |
|:---|:---|
| `ReviewRecord` | UUID, DocumentID, Status, AuditorName, ReviewTimestamp |
| `ModificationRequest` | ForeignKey(ReviewRecord), Section, TaskDescription, CreatorName, CreatedAt |
| `FixAction` | ForeignKey(ModificationRequest), RemedyDescription, ActorName, ActionDate |
| `DocumentMetadata` | Hash, Path, Type, AIActRiskLevel, LastAnalysisDate |

## Migration Steps
1. Add `sqlalchemy` and `psycopg2-binary` to `requirements.txt`.
2. Update `core/config.py` with `DATABASE_URL`.
3. Create `models/persistence.py` with SQLAlchemy Base.
4. Refactor `services/hitl_workflow.py` to use a Session factory.

## Audit Trail
- Timestamp: 2026-03-22
- Author: `@product-mgr` / GitHub Copilot
- Logic: Reproducibility and Audit Resilience.
