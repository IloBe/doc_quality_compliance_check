# Document Upload & Persistence Implementation

## Overview

Users can now upload documents through the home (Document Hub) page, and those documents are **persistently stored in PostgreSQL** instead of being lost on page reload. This implementation follows SOLID principles and SAD Section 1 guiding principles.

## Architecture

### Data Flow

```
User uploads file
     ↓
DocumentHubPage component
     ↓
documentUploadClient.uploadDocument() 
     ↓
POST /api/v1/documents/upload (backend)
     ↓
Backend: extract text → analyze → persist to SkillDocumentORM (PostgreSQL)
     ↓
Return DocumentAnalysisResult
     ↓
Frontend: add document to mock store (for UI state cache)
     ↓
Document card appears on hub
```

### On Page Reload

```
DocumentHubPage mounts
     ↓
Call listDocuments() from documentRetrievalClient
     ↓
GET /api/v1/documents (backend)
     ↓
Backend: query SkillDocumentORM from PostgreSQL
     ↓
Return list of persisted documents
     ↓
Frontend: add each document to mock store
     ↓
User sees all uploaded documents (restored from database)
```

## Key Components

### Backend

**New Endpoints:**

1. **GET `/api/v1/documents`** — List all documents in PostgreSQL
   - Calls `search_documents(db, SkillsSearchRequest(query="", limit=1000))`
   - Returns `DocumentListResponse` with array of documents
   - SOLID: Single Responsibility (retrieval only), Open/Closed (extensible for filters)

2. **GET `/api/v1/documents/{document_id}`** — Get a single document
   - Calls `get_document_from_db(db, document_id)`
   - Returns `DocumentAnalysisResult`
   - Error: HTTP 404 if not found

**Persistence Mechanism:**

- Existing `POST /api/v1/documents/upload` already persists to `skill_documents` table via `persist_document()` service
- Uses `SkillDocumentORM` model (defined in `src/doc_quality/models/orm.py`)
- Stores: `document_id`, `filename`, `document_type`, `extracted_text`, `source="upload"`, timestamps

### Frontend

**New Client Module: `documentRetrievalClient.ts`**

- **Single Responsibility:** Document fetching/retrieval only
- **Functions:**
  - `listDocuments()` — Fetch all documents from backend, with demo-mode fallback
  - `getDocument(documentId)` — Fetch a single document by ID

- **Design Principles:**
  - Graceful degradation: Falls back to empty list if backend unavailable (demo mode)
  - Consistent error handling: Returns `{ok, message, documents?}` structure
  - Semantic clarity: Only retrieval operations (no upload/creation logic)

**Updated Component: `DocumentHubPage.tsx`**

- Added `useEffect` hook that runs on mount
- Calls `listDocuments()` to restore persisted documents
- Adds each document to mock store if not already present
- Mock store acts as UI-state cache, not source of truth
- New state: `isLoadingPersistent` for loading indicator (optional)

**Existing Upload Flow: `documentUploadClient.ts`**

- Already maps backend response correctly
- Already handles demo-mode fallback if backend unavailable
- No changes needed; already working with persistent backend

## SOLID Principles Alignment

### Single Responsibility Principle (SRP)

- **`documentUploadClient.ts`** → Handles file upload to backend only
- **`documentRetrievalClient.ts`** → Handles document retrieval from backend only
- **`DocumentHubPage.tsx`** → Orchestrates upload/retrieval and UI state
- **Backend `/documents` routes** → Document upload/retrieval/analysis only
- **Backend `skills_service`** → Document persistence and search only

Each module has one reason to change: upload/retrieval/presentation logic changes independently.

### Open/Closed Principle (OCP)

- **Frontend clients:** Can extend with new retrieval filters (e.g., `getDocumentsByType()`) without modifying existing functions
- **Backend routes:** Can add new search/filter endpoints without changing existing upload logic
- **Mock store:** Remains extensible for new document types/metadata

### Liskov Substitution Principle (LSP)

- Both `uploadDocument()` and `listDocuments()` return consistent `{ok, message, ...}` response structures
- Callers can treat success/failure uniformly regardless of backend availability (demo fallback applies same contract)

### Interface Segregation Principle (ISP)

- `documentRetrievalClient` exports only `listDocuments()` and `getDocument()` — no upload/create operations
- `documentUploadClient` exports only `uploadDocument()` — no retrieval operations
- Clients depend only on the operations they need

### Dependency Inversion Principle (DIP)

- Frontend depends on API contracts (`/api/v1/documents`), not implementation details
- Backend service functions (`persist_document`, `get_document`) are abstractions, not tied to specific ORMs
- Database details (PostgreSQL, SQLAlchemy) are isolated in ORM/session layer

## SAD Section 1 Alignment

### Traceability

- Every uploaded document gets a `document_id` (UUID) and audit trail via `skill_documents.source="upload"`
- Timestamp metadata (`created_at`, `updated_at`) recorded automatically by ORM
- Backend logs document persistence: `logger.info("skill_document_persisted", document_id=..., source="upload")`

### Least Surprise

- Upload endpoint is POST (creates resource) ✓
- Retrieval endpoints are GET (read-only) ✓
- Documents appear in list after successful upload ✓
- Reload page → documents persist (not lost) ✓
- Backend unavailable → demo mode fallback (transparent to user) ✓

### Graceful Degradation

- `documentRetrievalClient.listDocuments()` gracefully handles backend unavailability
- Falls back to empty list with `degradedToDemo: true` flag
- UI can show info message: "Backend unavailable; no persistent documents loaded"
- Users can still use mock documents for testing

### SOLID Compliance

- Code organized into single-responsibility modules ✓
- Open for extension (new retrieval methods), closed for modification ✓
- Consistent response contracts (LSP) ✓
- Clients depend only on what they use (ISP) ✓
- API contracts abstracted from implementation (DIP) ✓

## Persistence Guarantees

| Scenario | Behavior |
|----------|----------|
| Upload → Backend success | Document in PostgreSQL ✓ + mock store (UI cache) ✓ |
| Upload → Backend fail | Demo mode: mock store only (fallback) + message to user |
| Page reload (backend online) | Documents restored from PostgreSQL + added to mock store |
| Page reload (backend offline) | Mock store only (empty unless other uploads in session) |
| Multi-user upload | PostgreSQL enforces ACID; each upload gets unique `document_id` |

## API Contract Examples

### List Documents (GET /api/v1/documents)

**Request:**
```bash
GET /api/v1/documents HTTP/1.1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "documents": [
    {
      "document_id": "a1b2c3d4-e5f6-...",
      "filename": "architecture.md",
      "document_type": "arc42",
      "overall_score": 0.0
    },
    {
      "document_id": "x9y8z7w6-...",
      "filename": "requirements.pdf",
      "document_type": "requirements",
      "overall_score": 0.0
    }
  ]
}
```

### Get Single Document (GET /api/v1/documents/{id})

**Response (200 OK):**
```json
{
  "document_id": "a1b2c3d4-e5f6-...",
  "filename": "architecture.md",
  "document_type": "arc42",
  "overall_score": 0.0
}
```

**Response (404 Not Found):**
```json
{
  "detail": "Document not found: a1b2c3d4-e5f6-..."
}
```

## Testing Persistence

1. **Local Dev (Backend Online):**
   - Upload a document on home page
   - Document card appears
   - Reload page (F5)
   - **Expected:** Document still visible (restored from PostgreSQL)

2. **Backend Offline Mode:**
   - Stop backend server
   - Upload a document
   - See: "Backend unavailable... Stored in demo workspace"
   - Reload page
   - **Expected:** Document visible (mock store cached it for session)

3. **Multi-Session:**
   - Session A: Uploads document X
   - Session B: Fresh browser tab, loads home page
   - **Expected:** Document X appears in Session B (from PostgreSQL)

## Future Enhancements

- **Document Metadata:** Store upload date, file size, uploader email in additional columns
- **Search/Filter:** Add `GET /api/v1/documents?query=...&type=arc42` for advanced queries
- **Pagination:** Add `limit` and `offset` parameters for large document lists
- **Soft Deletes:** Add `deleted_at` column instead of hard delete for audit trail preservation
- **Versioning:** Track document versions with version control system
