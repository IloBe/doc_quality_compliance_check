# HITL Persistence Gap Fix - Implementation Summary

## Overview
This fix resolves **HITL Persistence Mismatch Issue #1**: replaced in-memory dictionary storage with PostgreSQL-backed persistence for all HITL review records.

### What Was Changed

**Before:**
- HITL reviews stored in module-level in-memory dictionary (`_review_store`)
- Data lost on application restart
- Violated SAD R-1/R-2 requirements (audit trail persistence)
- Contradicted backend.md documentation claim

**After:**
- HITL reviews persisted to PostgreSQL database
- All records survive application restarts
- Complies with SAD R-1/R-2 (high-priority audit requirements)
- Implementation now matches documentation

---

## Files Modified

### 1. **Dependencies Updated**
   - **requirements.txt**: Added SQLAlchemy, psycopg2-binary, Alembic
   - **pyproject.toml**: Added database dependencies to main dependencies

### 2. **Core Database Module**
   - **src/doc_quality/core/database.py** (NEW)
     - SQLAlchemy engine initialization using PostgreSQL connection string
     - Session factory for database operations
     - Dependency injection support for FastAPI routes
     - Connection pooling with health checks

### 3. **Configuration**
   - **src/doc_quality/core/config.py** (UPDATED)
     - Added `database_url` setting (configurable via .env)
     - Added `database_echo` setting for SQL query logging in dev

### 4. **ORM Models**
   - **src/doc_quality/models/orm.py** (NEW)
     - `ReviewRecordORM`: SQLAlchemy model for hitl_reviews table
     - UUID primary key (matches Pydantic model)
     - JSON column for complex modifications_required field
     - Timestamps: created_at, updated_at for audit

### 5. **HITL Workflow Service**
   - **src/doc_quality/services/hitl_workflow.py** (REWRITTEN)
     - Replaced in-memory `_review_store` dict with database queries
     - Added conversion functions: `_orm_to_model()` and `_model_to_orm()`
     - All functions now accept optional `db: Session` parameter
     - Automatic session management (creates/closes if not provided)
     - All functions: `create_review()`, `get_review()`, `update_review_status()`, `list_reviews_for_document()`

### 6. **Test Infrastructure**
   - **tests/conftest.py** (UPDATED)
     - Added `test_db_engine`: SQLite in-memory for fast testing
     - Added `test_db_session`: Transaction-scoped sessions for isolation
     - Updated `client` fixture to override FastAPI `get_db` dependency
   - **tests/test_hitl_workflow.py** (UPDATED)
     - All tests now accept `test_db_session` fixture
     - Pass `db=test_db_session` to HITL service functions

### 7. **Database Migrations**
   - **migrations/alembic.ini**: Alembic configuration
   - **migrations/env.py**: Migration environment setup
   - **migrations/script.py.mako**: Migration file template
   - **migrations/versions/001_initial_hitl_reviews.py**:
     - Creates `hitl_reviews` table with proper schema
     - Indexes on document_id, review_id, created_at for query performance

---

## Configuration

### Environment Variables
Add to `.env`:
```env
# Database (PostgreSQL)
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/doc_quality
DATABASE_ECHO=false  # Set to true in development for SQL logging
```

### Default Configuration
If not set, uses:
```
postgresql+psycopg2://postgres:postgres@localhost:5432/doc_quality
```

---

## Database Setup

### Prerequisites
- PostgreSQL 12+ running locally or remotely
- psycopg2-binary installed (included in requirements.txt)

### Initial Setup
```bash
# 1. Create database (from PostgreSQL CLI)
createdb doc_quality

# 2. Run migrations (from project root)
alembic upgrade head

# OR auto-initialize tables on app startup by calling:
from src.doc_quality.core.database import init_db
init_db()
```

### Verify Setup
```bash
# Connect to PostgreSQL
psql -U postgres -d doc_quality

# Check hitl_reviews table
\dt hitl_reviews
\d hitl_reviews  # View full schema
```

---

## Data Model

### hitl_reviews Table Schema
```sql
CREATE TABLE hitl_reviews (
    review_id UUID PRIMARY KEY,
    document_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_role VARCHAR(100) NOT NULL,
    review_date TIMESTAMP WITH TIME ZONE NOT NULL,
    modifications_required JSONB NOT NULL DEFAULT '[]',
    comments VARCHAR(4000) NOT NULL DEFAULT '',
    approval_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for query performance
CREATE INDEX ix_hitl_reviews_document_id ON hitl_reviews(document_id);
CREATE INDEX ix_hitl_reviews_review_id ON hitl_reviews(review_id);
CREATE INDEX ix_hitl_reviews_created_at ON hitl_reviews(created_at);
```

### modifications_required (JSONB)
Stores array of modification objects:
```json
[
  {
    "location": "Section 3",
    "description": "Add diagram",
    "importance": "major",
    "risk_if_not_done": "Audit failure",
    "responsible_role": "Architect",
    "responsible_person": "John Doe",
    "responsible_department": "Engineering"
  }
]
```

---

## API Integration

### FastAPI Dependency Injection
Services that need database access should receive `Session` via dependency:

```python
from fastapi import Depends
from src.doc_quality.core.database import get_db

@app.post("/reviews")
def create_review_endpoint(data: ReviewRequest, db: Session = Depends(get_db)):
    return create_review(
        document_id=data.document_id,
        reviewer_name=data.reviewer_name,
        reviewer_role=data.reviewer_role,
        db=db
    )
```

### Service Functions
Each HITL workflow function accepts optional `db` session:
```python
# Auto-manage session (creates connection)
review = create_review("doc-1", "Alice", "QA")

# Reuse existing session (efficient for batch operations)
review = create_review("doc-1", "Alice", "QA", db=session)
```

---

## Testing

### Run HITL Tests
```bash
pytest tests/test_hitl_workflow.py -v
```

### Test Features
- **Isolation**: Each test gets fresh in-memory SQLite database
- **No Setup/Teardown**: Automatic rollback after each test
- **No External Dependencies**: SQLite in-memory (:memory:) requires no PostgreSQL

### Test Example
```python
def test_create_review_persists(test_db_session):
    review = create_review(
        document_id="doc-1",
        reviewer_name="Alice",
        reviewer_role="QA",
        db=test_db_session
    )
    # Verify persisted to database
    retrieved = get_review(review.review_id, db=test_db_session)
    assert retrieved.review_id == review.review_id
```

---

## Backward Compatibility

### API Compatibility
- ✅ HITL workflow functions maintain same public interface
- ✅ Pydantic models (ReviewRecord) unchanged
- ✅ Database session is optional (auto-managed if not provided)

### Migration Path
Existing code calling HITL functions will continue working:
```python
# OLD (still works, auto-creates session)
review = create_review("doc-1", "Alice", "QA")

# NEW (recommended for batch operations)
review = create_review("doc-1", "Alice", "QA", db=session)
```

---

## Future Enhancements

### Planned (Phase 0)
- [ ] Implement audit_events log for compliance (SAD AD-13)
- [ ] Add snapshot mechanism for review state
- [ ] Implement retention policies (hot/warm/cold tiers)
- [ ] Add agentic data separation (audit_events vs agent_telemetry)

### Deferred (Phase 1+)
- [ ] Implement CrewAI orchestration with event logging
- [ ] Add OCR fallback with confidence gating (AD-12)
- [ ] Implement OAuth2/LDAP authentication (PRD F7)
- [ ] Add Nemotron-Parse for complex PDF handling

---

## Validation Checklist

- [x] In-memory `_review_store` removed from hitl_workflow.py
- [x] All reviews persisted to PostgreSQL hitl_reviews table
- [x] HITL workflow functions accept database session
- [x] Test database uses SQLite for isolation
- [x] Test suite passes with database persistence
- [x] Documentation claims now match implementation
- [x] SAD R-1/R-2 requirements satisfied (audit trail persists)
- [x] Dependencies (SQLAlchemy, psycopg2-binary, alembic) added
- [x] Configuration supports .env DATABASE_URL override

---

## References

- **Original Issue**: HITL Persistence Mismatch (#1 in gap analysis)
- **SAD References**: R-1, R-2, AD-13 (Append-only event log)
- **Backend.md Reference**: Line 320 (Persistent store claim)
- **Phase 0 DoD**: phase0_persistence_definition_of_done.md
