# Frontend Implementation Documentation — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.1.0  
**Date:** 2025-02-23  
**Author persona:** `@frontend-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The frontend is a single-page application built with **vanilla HTML5, CSS3, and JavaScript** — no framework, no build toolchain, no npm. This follows the KISS principle for MVP: the tab-based dashboard is simple enough for plain JavaScript, and eliminating a build pipeline reduces maintenance overhead and deployment friction.

**CORS note:** All API calls use relative URLs (e.g., `/api/v1/documents/analyze`) because the FastAPI backend serves the frontend via `StaticFiles`. No CORS issues arise in this configuration — the frontend and API share the same origin (`localhost:8000`).

---

## Section 1 – File Structure

```
frontend/
├── index.html          — Single HTML file: all four section tabs + modals
├── css/
│   └── styles.css      — All styles: variables, layout, components, responsive
└── js/
    └── app.js          — All JavaScript: API calls, DOM updates, event handlers
```

The entire frontend is three files. FastAPI mounts `frontend/` at `/` via `StaticFiles(directory="frontend", html=True)`, so:
- `http://localhost:8000/` → serves `index.html`
- `http://localhost:8000/css/styles.css` → serves the stylesheet
- `http://localhost:8000/js/app.js` → serves the JavaScript

---

## Section 2 – HTML Structure (`frontend/index.html`)

### 2.1 Page Layout

```html
<body>
  <header class="header">              <!-- Sticky top nav bar -->
    <nav class="nav">                  <!-- Tab links (hash navigation) -->
    <div class="header-status">        <!-- Live API health indicator -->
  </header>

  <main class="main">
    <section class="hero">             <!-- Product headline -->
    <section class="stats-bar">        <!-- Live stats: docs analyzed, avg score, templates, framework -->

    <section id="analyze">             <!-- Tab 1: Document Analysis -->
    <section id="compliance">          <!-- Tab 2: EU AI Act Compliance Check -->
    <section id="templates">           <!-- Tab 3: SOP Templates -->
    <section id="reports">             <!-- Tab 4: Reports & HITL -->
  </main>

  <div id="templateModal">             <!-- Modal for template detail view -->
  <div id="toast">                     <!-- Toast notification overlay -->

  <script src="/js/app.js"></script>
</body>
```

### 2.2 Navigation

Navigation uses hash-based section anchors (`href="#analyze"`, `href="#compliance"`, etc.). The `nav-link active` class on the currently visible section is managed by a scroll-intersection observer and click handlers in `app.js`.

Header includes a live API status indicator:
```html
<div class="header-status" id="apiStatus">
  <span class="status-dot"></span>           <!-- CSS circle: green=online, red=offline -->
  <span class="status-text">Connecting...</span>
</div>
```
On page load, `checkHealth()` calls `GET /health` and updates the dot colour and text.

### 2.3 Statistics Bar

```html
<section class="stats-bar">
  <div class="stat-item">
    <span class="stat-value" id="statDocs">—</span>
    <span class="stat-label">Documents Analyzed</span>
  </div>
  <div class="stat-item">
    <span class="stat-value" id="statScore">—</span>
    <span class="stat-label">Avg. Quality Score</span>
  </div>
  <div class="stat-item">
    <span class="stat-value">6</span>
    <span class="stat-label">Active Templates</span>
  </div>
  <div class="stat-item">
    <span class="stat-value">EU AI Act</span>
    <span class="stat-label">Compliance Framework</span>
  </div>
</section>
```

`statDocs` and `statScore` are updated via `updateStats(score)` in `app.js` after each analysis.

---

## Section 3 – Tab Sections

### 3.1 Document Analysis Tab (`#analyze`)

**Purpose:** Upload a document file or paste text content, receive a section completeness check, quality score, issues, and recommendations.

**Input card — Text Input:**
```html
<textarea id="docContent" placeholder="Paste your arc42, Model Card, or SOP document here..."></textarea>
<input id="docFilename" placeholder="filename.md" />
<select id="docType">
  <option value="">Auto-detect</option>
  <option value="arc42">arc42 Architecture</option>
  <option value="model_card">Model Card</option>
  <option value="sop">SOP</option>
</select>
<button id="btnAnalyze" onclick="analyzeText()">🔍 Analyze Document</button>
```

**Input card — File Upload:**
```html
<div id="uploadZone" ondrop="handleDrop(event)" ondragover="...">
  <input type="file" id="fileInput" accept=".md,.txt,.pdf,.docx" />
</div>
<div id="uploadProgress" class="hidden">
  <div id="progressFill"></div>
</div>
```

File upload uses `FormData` with `multipart/form-data` (no Content-Type header override — browser sets boundary automatically).

**Results panel:**
```html
<div id="analysisResult" class="hidden">
  <div class="result-header">
    <span id="resultDocType">arc42</span>
    <span id="resultStatus" class="badge">Complete</span>
    <span id="resultScore" class="score-badge">95%</span>
  </div>
  <table id="sectionsTable">           <!-- Section name | Present/Missing rows -->
  <div id="issuesList">               <!-- Bulleted issues -->
  <div id="recommendationsList">      <!-- Bulleted recommendations -->
  <div id="umlDiagramsList">         <!-- Detected UML diagram types -->
</div>
```

Results are hidden until the first analysis completes. The `document_id` from the result is automatically populated into the Reports tab form.

### 3.2 Compliance Check Tab (`#compliance`)

**Purpose:** Submit domain information to receive EU AI Act compliance assessment: risk level, role, 9 requirements status, gaps.

**Input form:**
```html
<input id="domainName" placeholder="e.g. Medical AI Diagnostics System" />
<textarea id="domainDescription" placeholder="Describe your AI system..."></textarea>
<input type="checkbox" id="usesAiMl" checked />
<textarea id="intendedUse" placeholder="What is the intended use of the system?"></textarea>
<button id="btnCheckCompliance" onclick="checkCompliance()">🔎 Check EU AI Act Compliance</button>
```

**Results panel:**
```html
<div id="complianceResult" class="hidden">
  <div class="badges-row">
    <span id="riskLevelBadge" class="risk-badge risk-high">HIGH RISK</span>
    <span id="roleBadge" class="role-badge">PROVIDER</span>
    <span id="complianceScore">67%</span>
  </div>
  <table id="requirementsTable">     <!-- EUAIA-1..9: ID | Title | Met/Gap -->
  <div id="gapsList">               <!-- Unmet requirements list -->
  <div id="metRequirementsList">    <!-- Met requirements list -->
  <div id="applicableRegsList">     <!-- Detected applicable regulations -->
</div>
```

**Risk level badge colours** (applied via CSS class):
- `risk-prohibited` → red (#E74C3C)
- `risk-high` → orange (#E67E22)
- `risk-limited` → yellow (#F39C12)
- `risk-minimal` → green (#27AE60)

The `compliance_check_id` from the result is automatically populated into the Reports tab form.

### 3.3 Templates Tab (`#templates`)

**Purpose:** Browse and download all 6 active SOP templates. View inactive templates with coming-soon placeholder.

**Load on page init:**
```javascript
async function loadTemplates() {
    const templates = await apiFetch('/templates/');
    const container = document.getElementById('templatesGrid');
    templates.forEach(tmpl => {
        const card = createTemplateCard(tmpl);
        container.appendChild(card);
    });
}
```

**Template card structure:**
```html
<div class="template-card">
  <div class="template-header">
    <span class="template-icon">📄</span>
    <span class="template-badge active">Active</span>   <!-- or "Coming Soon" -->
  </div>
  <h3>Business and Product Goals</h3>
  <p class="template-desc">SOP template for documenting business goals and product vision</p>
  <button onclick="viewTemplate('business_goals')">👁 View Template</button>
</div>
```

**Template detail modal:**
```javascript
async function viewTemplate(templateId) {
    const data = await apiFetch(`/templates/${templateId}`);
    document.getElementById('modalTitle').textContent = data.title;
    document.getElementById('modalContent').textContent = data.content;
    document.getElementById('templateModal').classList.remove('hidden');
}
```

The modal displays raw markdown content in a `<pre>` element. A "Download" button constructs a `Blob` from the content and triggers a browser download.

### 3.4 Reports Tab (`#reports`)

**Purpose:** Generate a PDF audit report combining document analysis and compliance check results.

**Generate form:**
```html
<input id="reportDocId" placeholder="Document Analysis ID (auto-filled)" />
<input id="reportComplianceId" placeholder="Compliance Check ID (optional)" />
<input id="reportReviewer" placeholder="Reviewer name (optional)" />
<button onclick="generateReport()">📄 Generate PDF Report</button>
```

**HITL Review form:**
```html
<input id="reviewDocId" placeholder="Document ID" />
<input id="reviewerName" placeholder="Your name" />
<input id="reviewerRole" placeholder="Your role (e.g. QM Lead)" />
<select id="reviewVerdict">
  <option value="pass">✅ Pass</option>
  <option value="modifications_needed">🔄 Modifications Needed</option>
</select>
<textarea id="reviewComments" placeholder="Overall comments..."></textarea>
<button onclick="submitReview()">Submit Review</button>
```

**Download button:**
```javascript
async function downloadReport(reportId) {
    const response = await fetch(`${API_BASE}/reports/download/${reportId}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${reportId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
}
```

**UI stubs for future features (Phase 2):**
```html
<!-- Review History Table — Coming in next milestone -->
<div class="coming-soon-notice">
  <p>📋 Review history and filtering coming in the next milestone.</p>
</div>
```

---

## Section 4 – CSS Design (`frontend/css/styles.css`)

### 4.1 Design Tokens (CSS Custom Properties)

```css
:root {
    --primary: #2E86AB;           /* Brand blue */
    --primary-dark: #1a6a8a;
    --secondary: #A23B72;         /* Accent purple */
    --success: #27AE60;           /* Green for pass/complete */
    --warning: #F39C12;           /* Amber for partial/limited */
    --danger: #E74C3C;            /* Red for fail/prohibited */
    --bg: #F8F9FA;                /* Page background */
    --surface: #FFFFFF;           /* Card/surface background */
    --border: #DEE2E6;
    --text: #212529;
    --text-muted: #6C757D;
    --radius: 8px;
    --shadow: 0 2px 8px rgba(0,0,0,0.08);
    --shadow-lg: 0 4px 20px rgba(0,0,0,0.12);
}
```

### 4.2 Key Component Styles

**Status dot:** CSS circle with colour-coded state
```css
.status-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--text-muted);  /* default: grey */
}
.status-dot.online  { background: var(--success); }  /* green */
.status-dot.offline { background: var(--danger); }   /* red */
```

**Risk level badges:**
```css
.risk-badge { padding: 4px 12px; border-radius: 4px; font-weight: 700; }
.risk-high       { background: #E67E22; color: white; }
.risk-limited    { background: #F39C12; color: white; }
.risk-minimal    { background: var(--success); color: white; }
.risk-prohibited { background: var(--danger); color: white; }
```

**Section checklist rows:**
```css
tr.section-present { background: rgba(39,174,96,0.08); }  /* light green */
tr.section-missing  { background: rgba(231,76,60,0.08); }   /* light red */
```

### 4.3 Responsive Design

The layout uses CSS Grid with responsive breakpoints:
```css
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }

@media (max-width: 768px) {
    .nav { display: none; }           /* Mobile: hide horizontal nav */
    .stats-bar { grid-template-columns: 1fr 1fr; }
    .card-grid { grid-template-columns: 1fr; }
}
```

---

## Section 5 – JavaScript Architecture (`frontend/js/app.js`)

### 5.1 API Utility

```javascript
const API_BASE = '/api/v1';

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

All API calls go through `apiFetch()`. Errors are caught as `Error` objects with the FastAPI `detail` field as the message, and shown as toast notifications.

### 5.2 Loading State Management

```javascript
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = loading;
        btn.textContent = loading ? '⏳ Processing...' : btn.dataset.originalText || btn.textContent;
    }
}
```

All async operations disable the triggering button and show a spinner text during the request.

### 5.3 Toast Notifications

```javascript
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;   // info | success | warning | error
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}
```

Toast types: `success` (green), `warning` (amber), `error` (red), `info` (blue).

### 5.4 Page Initialization

```javascript
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();      // GET /health — update status dot
    loadTemplates();    // GET /templates/ — populate templates tab
});
```

### 5.5 File Upload with Drag-and-Drop

```javascript
function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) uploadFile(file);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,    // No Content-Type header — browser sets multipart boundary
    });
    // ...
}
```

Note: `Content-Type` header is intentionally NOT set for `FormData` uploads — the browser must set the `multipart/form-data; boundary=...` header automatically.

### 5.6 Template Download (Client-Side)

```javascript
function downloadTemplate(templateId, title, content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
```

Template downloads are handled client-side using the `Blob` API. No separate download endpoint is needed for templates.

---

## Section 6 – Known Limitations and UI Stubs

| Feature | Status | Phase |
|---------|--------|-------|
| Document Analysis (text + file upload) | ✅ Implemented | MVP |
| EU AI Act Compliance Check | ✅ Implemented | MVP |
| Applicable Regulations display | ✅ Implemented | MVP |
| Template browsing + detail modal | ✅ Implemented | MVP |
| Template client-side download | ✅ Implemented | MVP |
| PDF Report generation + download | ✅ Implemented | MVP |
| HITL Review submission form | ✅ Implemented | MVP |
| API health status indicator | ✅ Implemented | MVP |
| Session stats (docs analyzed, avg score) | ✅ Implemented (session-only) | MVP |
| Review history table | 🔲 UI stub / "Coming Soon" | Phase 2 |
| Full review list with filtering | 🔲 Not implemented | Phase 2 |
| WebSocket streaming for LLM analysis | 🔲 Not implemented | Phase 3 |
| Authentication UI (login/logout) | 🔲 Not implemented | Phase 2 |
| Dark mode | 🔲 Not implemented | Backlog |
| Multi-language support | 🔲 Not implemented | Backlog |

---

## Sources

- MDN Web Docs — Fetch API, https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- MDN Web Docs — FormData, https://developer.mozilla.org/en-US/docs/Web/API/FormData
- MDN Web Docs — Blob API, https://developer.mozilla.org/en-US/docs/Web/API/Blob
- MDN Web Docs — CSS Custom Properties, https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- CSS Grid Layout Guide, https://css-tricks.com/snippets/css/complete-guide-grid/
- FastAPI Static Files, https://fastapi.tiangolo.com/tutorial/static-files/

---

## Assumptions

1. The frontend is served by the FastAPI `StaticFiles` mount — no separate web server (nginx, etc.) is needed for development.
2. All API calls use relative URLs (`/api/v1/...`) — this works because frontend and API share the same origin.
3. JavaScript runs in modern browsers (ES2020+) — no polyfills or transpilation required.
4. The `document_id` and `compliance_check_id` fields auto-populate the Reports tab form after each analysis — this is a session-level convenience, not persistence.
5. Template download uses the Blob API (available in all modern browsers); no fallback for IE is required.
6. The stats bar (docs analyzed, avg score) resets on page refresh — this is intentional for MVP; persistent stats require backend database storage (Phase 2).

---

## Open Questions

1. **Dark mode:** Should a CSS `prefers-color-scheme: dark` media query be added? (Low effort, high user value)
2. **Mobile navigation:** Currently the nav links are hidden on mobile (`display: none`). Should a hamburger menu be added?
3. **Form validation:** Currently form validation is minimal (empty string check). Should HTML5 `required` attributes and constraint validation be added?
4. **Accessibility:** Are ARIA labels and keyboard navigation implemented? (Current status: not systematically; candidate for Phase 2 accessibility audit)
5. **Session persistence:** Should `localStorage` be used to persist the last analysis result across page refreshes?

---

## Audit

```
persona=frontend-eng
action=develop-fe
timestamp=2025-02-23
adapter=AAMAD-vscode
artifact=project-context/2.build/frontend.md
version=0.1.0
status=complete
```
