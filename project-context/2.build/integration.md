# Integration Documentation — Doc Quality Compliance Check

<!-- markdownlint-disable MD022 MD031 MD032 MD034 MD040 MD058 MD060 -->

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@integration-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The system integrates a vanilla JavaScript single-page frontend with a Python FastAPI backend via HTTP/JSON REST calls. The FastAPI application serves the frontend as static files, so both the UI and API share a single origin (`localhost:8000`) — no cross-origin issues arise in development. In production, CORS configuration is required if a separate web server is used.

---

## Section 1 – Frontend ↔ Backend API Integration

### 1.1 Base URL and Content Type

```javascript
// frontend/js/app.js
const API_BASE = '/api/v1';

// All JSON API calls use the apiFetch utility
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
}
```

**File uploads** use `fetch()` directly with `FormData` (no `Content-Type` header override — browser sets `multipart/form-data; boundary=...` automatically).

### 1.2 CORS Configuration

Defined in `src/doc_quality/api/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)
```

| Environment | Allowed Origins | Notes |
|-------------|----------------|-------|
| Development (FastAPI serving frontend) | `localhost:8000` | Same-origin; CORS not triggered |
| Development (separate frontend server) | `localhost:3000` | Explicit allow; e.g. `python -m http.server 3000` |
| Production | TBD | Must be updated before production deployment |

**Known issue:** The `allow_origins` list is hardcoded. For production deployment behind a reverse proxy, this list must be updated to include the public domain name. This is a documented configuration change, not a code change.

---

## Section 2 – Request/Response Flow by Tab

### 2.1 Document Analysis Tab

**Flow:**

```
User enters text / uploads file
    │
    ├── Text input path:
    │   JS: POST /api/v1/documents/analyze
    │       Body: {"content": "...", "filename": "doc.md", "doc_type": "arc42" | null}
    │   FastAPI: validates body as AnalyzeTextRequest (Pydantic)
    │   → sanitize_text(content), validate_filename(filename)
    │   → document_analyzer.analyze_document(content, filename, doc_type)
    │   → returns DocumentAnalysisResult JSON
    │
    └── File upload path:
        JS: POST /api/v1/documents/upload  (multipart/form-data)
        FastAPI: reads UploadFile, validate_filename, validate_file_size
        → decodes bytes → sanitize_text → analyze_document
        → returns DocumentAnalysisResult JSON
```

**DocumentAnalysisResult JSON structure:**

```json
{
  "document_id": "uuid-string",
  "filename": "architecture.md",
  "document_type": "arc42",
  "status": "partial",
  "sections_found": [
    {"name": "Introduction and Goals", "present": true, "content_snippet": null},
    {"name": "Constraints", "present": false, "content_snippet": null}
  ],
  "uml_diagrams": ["system context diagram", "component diagram"],
  "overall_score": 0.75,
  "issues": ["Missing section: Constraints", "Missing section: Glossary"],
  "recommendations": ["Add a Constraints section (arc42 Section 2)", "..."],
  "analyzed_at": "2025-02-23T10:00:00+00:00"
}
```

**Frontend rendering:**
1. Section table: iterate `sections_found` → green row (present=true) / red row (present=false)
2. Score badge: `Math.round(overall_score * 100) + "%"`
3. Issues list: iterate `issues` → `<li>` elements
4. Recommendations list: iterate `recommendations` → `<li>` elements
5. Auto-populate: `document.getElementById('reportDocId').value = result.document_id`

### 2.2 Compliance Check Tab

**Flow:**

```
User fills in domain form
    │
    JS: POST /api/v1/compliance/check/eu-ai-act
        Body: {
          "domain_name": "Medical AI Diagnostics",
          "domain_description": "...",
          "uses_ai_ml": true,
          "intended_use": "..."
        }
    FastAPI: validates as ProductDomainInfo (Pydantic)
    → compliance_checker.check_eu_ai_act_compliance(domain_info)
    → returns ComplianceCheckResult JSON
```

**ComplianceCheckResult JSON structure:**

```json
{
  "check_id": "uuid-string",
  "framework": "EU AI Act",
  "risk_level": "high",
  "role": "provider",
  "requirements": [
    {
      "id": "EUAIA-1",
      "title": "Risk Management System",
      "mandatory": true,
      "description": "Establish, implement, document and maintain a risk management system (Art. 9)",
      "met": true,
      "evidence": null,
      "gap_description": null
    },
    {
      "id": "EUAIA-6",
      "title": "Human Oversight",
      "mandatory": true,
      "met": false,
      "gap_description": "No human oversight mechanisms described in the provided information"
    }
  ],
  "compliance_score": 0.67,
  "gaps": ["EUAIA-6: Human Oversight", "EUAIA-8: Conformity Assessment"],
  "met_requirements": ["EUAIA-1: Risk Management System", "..."],
  "applicable_regulations": ["EU AI Act", "MDR"],
  "checked_at": "2025-02-23T10:05:00+00:00"
}
```

**Frontend rendering:**
1. Risk badge: `result.risk_level` → CSS class `risk-${result.risk_level}` (colour-coded)
2. Role badge: `result.role.toUpperCase()`
3. Score: `Math.round(result.compliance_score * 100) + "%"`
4. Requirements table: iterate `requirements` → "✅ Met" / "❌ Gap" with `gap_description`
5. Gaps list: iterate `result.gaps`
6. Auto-populate: `document.getElementById('reportComplianceId').value = result.check_id`

**Applicable Regulations sub-flow:**

```
JS: POST /api/v1/compliance/applicable-regulations
    Body: ProductDomainInfo (same as above)
→ compliance_checker.get_applicable_regulations(domain_info)
→ returns ["EU AI Act", "MDR", "GDPR"] (list of strings)
```

Displayed as an expandable list below the main compliance results panel.

### 2.3 Templates Tab

**Flow:**

```
Page load:
    JS: GET /api/v1/templates/
    → template_manager.list_templates()
    → returns list of template metadata dicts

User clicks "View Template":
    JS: GET /api/v1/templates/{template_id}
    → template_manager.get_template_by_id(template_id)
    → returns {"id": "...", "title": "...", "content": "# SOP ...\n...", "active": true}
    → displayed in modal
```

**Template list item JSON structure:**

```json
{
  "id": "business_goals",
  "title": "Business and Product Goals",
  "file": "sop_business_goals.md",
  "active": true
}
```

**Template detail JSON structure:**

```json
{
  "id": "business_goals",
  "title": "Business and Product Goals",
  "content": "# Business and Product Goals SOP\n\n## Purpose\n...",
  "active": true
}
```

**Inactive template behaviour:**  
Inactive templates return `active: false` and content is the placeholder text:  
`"# Test Strategy\n\n*This template is inactive and not yet available.*\n"`

Frontend shows "Coming Soon" badge for inactive templates and disables the download button.

### 2.4 Reports Tab

**Flow:**

```
User fills report form (IDs auto-populated from previous tabs):
    JS: POST /api/v1/reports/generate
        Body: {
          "document_analysis_id": "uuid-from-analysis",
          "compliance_check_id": "uuid-from-compliance",  (optional)
          "reviewer_name": "Maria Schmidt"               (optional)
        }
    → report_generator.generate_report(...)
    → PDF written to reports/report_{uuid}.pdf
    → returns {"id": "uuid", "file_path": "reports/report_uuid.pdf", "generated_at": "..."}

User clicks "Download":
    JS: GET /api/v1/reports/download/{report_id}
    → FileResponse(path, media_type="application/pdf")
    → Browser triggers PDF download
```

**HITL Review flow:**

```
User submits review form:
    JS: POST /api/v1/compliance/review
        Body: {
          "document_id": "uuid",
          "reviewer_name": "Maria Schmidt",
          "reviewer_role": "QM Lead",
          "comments": "Section 11 needs more detail",
          "modifications": [
            {
              "section_name": "Risks and Technical Debt",
              "description": "Missing probability/impact matrix",
              "priority": "high"
            }
          ]
        }
    → hitl_workflow.create_review(...)
    → returns ReviewRecord JSON
    → Frontend shows confirmation toast with review ID
```

---

## Section 3 – Static File Serving

The FastAPI application serves the frontend directly via `StaticFiles`:

```python
# src/doc_quality/api/main.py
try:
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
except RuntimeError:
    pass  # frontend/ directory not found; API-only mode
```

**Routing precedence:** FastAPI evaluates API routes before the static file mount. The mount at `/` only matches requests that do not match any explicit API route.

**File resolution:**
| URL | Resolved to | Notes |
|-----|-------------|-------|
| `GET /` | `frontend/index.html` | `html=True` enables `index.html` fallback |
| `GET /css/styles.css` | `frontend/css/styles.css` | |
| `GET /js/app.js` | `frontend/js/app.js` | |
| `GET /api/v1/health` | FastAPI route | API routes take precedence |
| `GET /health` | FastAPI route | Health check |
| `GET /docs` | FastAPI Swagger UI | Built-in auto-documentation |

---

## Section 4 – Health Check

```python
@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "version": settings.app_version}
```

**Response:**
```json
{"status": "healthy", "version": "0.1.0"}
```

The frontend calls `GET /health` on page load (not via `apiFetch` because it's not under `/api/v1`):
```javascript
async function checkHealth() {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    try {
        const data = await fetch('/health').then(r => r.json());
        dot.className = 'status-dot online';
        text.textContent = `API v${data.version}`;
    } catch {
        dot.className = 'status-dot offline';
        text.textContent = 'API offline';
    }
}
```

---

## Section 5 – Request Logging Middleware

Every HTTP request through the FastAPI app is logged with structlog:

```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000, 1),
    )
    return response
```

**Sample log output (JSON format):**
```json
{"event": "http_request", "method": "POST", "path": "/api/v1/documents/analyze", "status": 200, "duration_ms": 245.3, "level": "info", "timestamp": "2025-02-23T10:00:00+00:00"}
```

This log stream provides an audit trail for all API operations, satisfying EU AI Act Art. 12 logging requirements for the compliance check tool itself.

---

## Section 6 – Error Handling

### 6.1 FastAPI Error Responses

All error responses from the API use the FastAPI default format:
```json
{"detail": "Human-readable error message"}
```

| HTTP Status | Condition | Example |
|-------------|-----------|---------|
| 400 Bad Request | Invalid filename or request validation error | `"Unsafe filename: '../etc/passwd'"` |
| 404 Not Found | Report or template not found | `"Report not found: {report_id}"` |
| 413 Request Entity Too Large | File exceeds `MAX_FILE_SIZE_MB` | `"File size 12MB exceeds 10 MB limit"` |
| 422 Unprocessable Entity | Pydantic model validation failure | FastAPI auto-generated field error details |
| 500 Internal Server Error | Unhandled exception | `"Internal server error"` |

### 6.2 Frontend Error Handling

```javascript
try {
    const result = await apiFetch('/documents/analyze', { method: 'POST', body: JSON.stringify(body) });
    displayAnalysisResult(result);
    showToast('Analysis complete!', 'success');
} catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    // err.message contains the FastAPI `detail` field value
}
```

All errors are shown as toast notifications. The UI does not crash on API errors.

---

## Section 7 – Known Integration Issues

### 7.1 PDF Download Requires Filesystem Persistence

Generated PDF reports are stored in the `reports/` directory on the server filesystem. If:
- The server restarts between generation and download
- The `reports/` directory is cleared

Then `GET /api/v1/reports/download/{report_id}` returns HTTP 404.

**Mitigation:** Download reports immediately after generation. Phase 2 will add persistent storage.

### 7.2 In-Memory Review Store

HITL review records are stored in memory. Review IDs embedded in the frontend session are invalid after server restart.

**Mitigation:** SQLite persistence in Phase 2.

### 7.3 CORS Origins for Production

The current CORS allow list (`localhost:3000`, `localhost:8000`) must be updated for any non-localhost deployment. This is a configuration change in `main.py`.

### 7.4 Authentication and Authorization Status

Protected API endpoints are **not public anymore**. The backend now enforces authentication on protected routes via backend-owned session handling for browser users and API key / bearer-token access for explicit service clients.

Current implemented state:

- Browser users authenticate with email/password via `/api/v1/auth/login`.
- The backend issues an HTTP-only session cookie and validates it on subsequent requests.
- `/api/v1/auth/me` is session-only and returns the authenticated browser user.
- Service-to-service access is available for explicit machine endpoints and does not act as a blanket authorization bypass.
- Route-level RBAC is enforced on critical areas such as documents, compliance, research, reports, bridge, and skills.

Current integration limitation:

- Enterprise SSO (OIDC/OAuth2/LDAP/SAML) is not implemented yet and remains a later-phase enhancement.

### 7.5 File Upload Content-Type

When using `multipart/form-data` (file upload), the JavaScript code intentionally does NOT set a `Content-Type` header on the `fetch()` call. The browser must set this header automatically to include the multipart boundary. If `Content-Type: multipart/form-data` is set manually (without the boundary), the upload will fail with a 422 validation error.

---

## Section 8 – Future Integration Work

| Feature | Description | Phase |
| --- | --- | --- |
| WebSocket streaming | Stream LLM analysis progress to frontend in real time | Phase 3 |
| Enterprise SSO integration | OIDC/OAuth2/LDAP/SAML for organization-managed login, keeping backend session abstraction | Phase 2+ |
| Database webhook | Notify frontend when review status changes | Phase 2 |
| File storage backend | Object storage (S3/MinIO) for PDF reports | Phase 3 |
| Persistent distributed rate limiting | Replace process-local limiter with shared multi-instance throttling / lockout state | Phase 2+ |
| OpenTelemetry tracing | Distributed tracing for agent → service calls | Phase 3 |

---

## Sources

- FastAPI — CORS Middleware, https://fastapi.tiangolo.com/tutorial/cors/
- FastAPI — StaticFiles, https://fastapi.tiangolo.com/tutorial/static-files/
- FastAPI — Request Body, https://fastapi.tiangolo.com/tutorial/body/
- MDN Web Docs — Using Fetch, https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN Web Docs — FormData, https://developer.mozilla.org/en-US/docs/Web/API/FormData
- Starlette — Middleware, https://www.starlette.io/middleware/

---

## Assumptions

1. The frontend and API are always served from the same origin in MVP deployment (FastAPI StaticFiles). Separate server deployment requires CORS origin update.
2. `GET /health` is the canonical health check endpoint used by the frontend and any external monitoring.
3. All API responses use JSON content type (`application/json`) except PDF download (`application/pdf`).
4. The `document_id` and `check_id` fields auto-populate from analysis/compliance results in the frontend session only — they are not persisted across page refreshes.
5. FastAPI Pydantic validation errors (HTTP 422) are surfaced to the user via toast notifications as the `detail` field content.

---

## Open Questions

1. **WebSocket streaming:** When LLM analysis is enabled, users may wait 10–30 seconds. Should a WebSocket connection stream intermediate analysis results?
2. **Pagination:** Template list and review history will grow over time. Should pagination be added to `GET /api/v1/templates/` and `GET /api/v1/compliance/reviews`?
3. **API versioning strategy:** Should `v2` API routes maintain backward compatibility with `v1`, or is breaking change acceptable?
4. **Frontend build pipeline:** When should a build pipeline (Vite/esbuild) be introduced to support TypeScript, bundling, and tree-shaking?
5. **Health check depth:** Should `/health` perform a deep health check (filesystem write test, optional Claude API ping) or remain a shallow check (always returns healthy)?

---

## Audit

```
persona=integration-eng
action=integrate-api
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/2.build/integration.md
version=0.1.0
status=complete
```
