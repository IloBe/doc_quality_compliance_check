# HITL Persistence Fix - Quick Reference

## What Was Fixed
**HITL reviews now persist to PostgreSQL** instead of being stored in memory.

### Before ❌
```python
_review_store: dict[str, ReviewRecord] = {}  # LOST ON RESTART
```

### After ✅
```python
# PostgreSQL via SQLAlchemy ORM
create_review(..., db=session)  # PERSISTS FOREVER
```

---

## Quick Start

### 1. Add .env Configuration
```env
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/doc_quality
DATABASE_ECHO=false
```

### 2. Initialize Database
```bash
# Create the database
createdb doc_quality

# Run migrations
alembic upgrade head
```

### 3. Test It
```bash
# Run HITL tests (uses in-memory SQLite, no PostgreSQL needed)
pytest tests/test_hitl_workflow.py -v
```

---

## Usage Examples

### Creating a Review
```python
from src.doc_quality.services.hitl_workflow import create_review
from sqlalchemy.orm import Session

# Auto-manage session
review = create_review(
    document_id="doc-1",
    reviewer_name="Alice",
    reviewer_role="QA"
)

# OR reuse session (recommended in API routes)
review = create_review(
    document_id="doc-1",
    reviewer_name="Alice",
    reviewer_role="QA",
    db=db_session  # Pass session from FastAPI dependency
)
```

### In FastAPI Routes
```python
from fastapi import Depends
from src.doc_quality.core.database import get_db

@app.post("/reviews")
def create_review_endpoint(data: ReviewRequest, db: Session = Depends(get_db)):
    return create_review(
        document_id=data.document_id,
        reviewer_name=data.reviewer_name,
        reviewer_role=data.reviewer_role,
        db=db  # Pass the injected session
    )
```

---

## Database Schema

### hitl_reviews Table
```
review_id          UUID       PRIMARY KEY
document_id        VARCHAR    NOT NULL (indexed)
status             VARCHAR    'pending|in_review|passed|modifications_needed|rejected'
reviewer_name      VARCHAR    NOT NULL
reviewer_role      VARCHAR    NOT NULL
review_date        TIMESTAMP  NOT NULL
modifications_required JSONB  Array of modification objects
comments           VARCHAR    
approval_date      TIMESTAMP  NULL (set when status=PASSED)
created_at         TIMESTAMP  Audit timestamp
updated_at         TIMESTAMP  Audit timestamp
```

---

## Functions (API Unchanged)
All functions accept optional `db: Session` parameter:

| Function | Purpose |
|----------|---------|
| `create_review(...)` | Create new review, returns ReviewRecord |
| `get_review(review_id, ...)` | Fetch review by ID |
| `update_review_status(review_id, new_status, ...)` | Update status, return updated record |
| `list_reviews_for_document(document_id, ...)` | List all reviews for a document |

---

## Testing

### Run Tests
```bash
pytest tests/test_hitl_workflow.py -v
```

### Test Database
Tests use **in-memory SQLite** (no PostgreSQL installation required):
- ✅ Fast execution
- ✅ Complete isolation (each test gets fresh DB)
- ✅ No cleanup needed (auto-rollback)

### Write New Tests
```python
def test_my_feature(test_db_session: Session):
    # test_db_session is automatically provided
    review = create_review("doc-1", "Alice", "QA", db=test_db_session)
    assert review.review_id is not None
```

---

## Troubleshooting

### Issue: "No module named 'sqlalchemy'"
**Fix**: Install dependencies
```bash
pip install -r requirements.txt
# OR if using uv:
uv pip install -r requirements.txt
```

### Issue: "Connection refused (PostgreSQL)"
**Fix**: Start PostgreSQL or update DATABASE_URL
```env
# Local dev (SQLite fallback - not recommended for production)
DATABASE_URL=sqlite:///./test.db
```

### Issue: "Table 'hitl_reviews' does not exist"
**Fix**: Run migrations
```bash
alembic upgrade head
```

### Issue: Tests still failing
**Fix**: Verify conftest.py fixtures are available
```bash
pytest --fixtures | grep test_db
```

---

## Impact on SAD Requirements

### ✅ R-1: HITL Approval Records
- **Status**: SATISFIED
- **Requirement**: "HITL approval records must be stored persistently"
- **Solution**: PostgreSQL hitl_reviews table with created_at/updated_at audit timestamps

### ✅ R-2: Audit Trail
- **Status**: SATISFIED
- **Requirement**: "All review decisions must be auditable"
- **Solution**: created_at/updated_at columns, all changes persist

### ✅ AD-13: Append-Only Event Log
- **Status**: FOUNDATION SET
- **Requirement**: "Event sourcing pattern for audit compliance"
- **Next Phase**: Implement audit_events table extending this schema

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Database connection (not in git) |
| `pyproject.toml` | Project dependencies + SQLAlchemy, psycopg2 |
| `requirements.txt` | Pip dependencies (includes DB packages) |
| `migrations/alembic.ini` | Alembic configuration |
| `migrations/env.py` | Database initialization for migrations |
| `migrations/versions/001_initial_hitl_reviews.py` | Create hitl_reviews table |

---

## Next Phase (Phase 0 Continuation)

- [ ] Add audit_events table (event sourcing)
- [ ] Implement snapshot mechanism
- [ ] Add retention policies (hot/warm/cold)
- [ ] Implement CrewAI with event logging

See `phase0_persistence_definition_of_done.md` for complete DoD.

---

## Support

For questions or issues:
1. Check `PERSISTENCE_FIX.md` for detailed documentation
2. Review `HITL_PERSISTENCE_FIX.md` for implementation details
3. Check test examples in `tests/test_hitl_workflow.py`
4. Run `pytest --help` for testing options
