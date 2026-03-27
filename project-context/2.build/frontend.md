# Frontend Implementation Documentation — Doc Quality Compliance Check

**Product:** Document Quality & Compliance Check System  
**Version:** 0.4.0  
**Date:** 2026-3-23  
**Author persona:** `@frontend-eng`  
**AAMAD phase:** 2.build  

---

## Overview

The frontend is a multi-page application built with SOTA UI frameworks and modern style. Create a polished product like layout that fits to production-grade “Q&R workstation”. A growing UI complexity is expected (e.g. workflow runs, approvals, diffing, audit trail explorations). 

Modern UI principles are:
- Workflow-first navigation: users should start tasks, not hunt documents.
- Strong structure + templates: reduce free-text chaos.
- Explainability panel: every agent conclusion must show “why” + missing info.
- One-click exports: auditors love printable packs.
- Versioning everywhere: templates/SOPs/case decisions.
- UI shall express trust, clarity, traceability, and speed—while still feeling modern and “uplifting”.

**CORS note:** All API calls use relative URLs (e.g., `/api/v1/documents/analyze`) because the FastAPI backend serves the frontend via `StaticFiles`. No CORS issues arise in this configuration — the frontend and API share the same origin (`localhost:8000`).

**Business insights including but not limited to:**
- Cycle-time reduction for first-pass risk classification and documentation preparation.
- Improved audit confidence through consistent structure and traceable history.
- Higher adoption by engineering teams due to clear SOP guidance and ready-to-use templates.
- A scalable foundation for expanding to additional workflows (requirements engineering templates, security assessments, DPIA support, supplier documentation, post-market monitoring, complaint handling evidence).

So, this is a  multi-agent, audit-ready governance automation focused on Germany/EU reality with a 'regulatory-to-workflow' bridge and a clean workflow separation. Unlike generic document generators, this capstone emphasizes:

   - Explainable outcomes (risk class + reasoning + cited sources/criteria),
   - Actionable artifacts (templates + SOPs, not just text answers),
   - Reproducibility (history and versioning for audit defense),
   - EU/Germany-first governance framing (security lifecycle expectations + EU legal ecosystem),
   - Designed for Q&R workflows rather than developer-only tooling.

---

## Document Scope (General Frontend Requirements)

This file is the **general frontend requirements baseline** across all pages.

Page-specific requirements and properties are maintained in dedicated files:

- [frontend_dochub.md](frontend_dochub.md)
- [frontend_dashboard.md](frontend_dashboard.md)
- [frontend_bridge_overview.md](frontend_bridge_overview.md)
- [frontend_bridge_run.md](frontend_bridge_run.md)
- [frontend_compliance.md](frontend_compliance.md)
- [frontend_login.md](frontend_login.md)
- [frontend_forgot_access.md](frontend_forgot_access.md)
- [frontend_reset_access.md](frontend_reset_access.md)

### General requirements that apply to every page

- **Role-aware behavior:** UI actions must respect role permissions from authenticated session context; disabled actions must provide clear reason text/tooltips.

- **Auditability and traceability:** User-facing workflows must expose status, decision context, and outcome history; critical actions should support evidence-first review (what, why, who, when).

- **Help and explainability:** Each page must provide a concise contextual purpose (“Why this page matters”); guidance must remain domain-oriented (SOP/ISO/regulatory interpretation support).

- **Consistent information architecture:** Header label style must be consistent with dashboard conventions; primary title, optional info icon, and supporting description should be visually aligned.

- **Operational resilience for demo + production:** Demo mode must use mock workflows without breaking backend-integrated behavior; backend mode must remain available via existing API contracts and environment switches.

- **Accessibility and clarity:** Controls must be keyboard reachable, with semantic labels and readable contrast; status indicators should use icon + text semantics (not color-only signaling).

- **No-regression policy:** New UI changes must not break active routes, navigation, auth flows, or existing tests; frontend changes should preserve current visual language unless explicitly revised.


---

## Section 1 – File Structure

```Python
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
**Stats Bar (Backend-powered):**

Leverages backend PostgreSQL database to display real-time statistics:

```html
<div id="statsBar">
  <h3>Statistics</h3>
  <ul>
    <li>Total Documents Analyzed: <span id="totalDocs">0</span></li>
    <li>Average Compliance Score: <span id="avgScore">0.0</span></li>
    <li>Reports by Risk Classification:
      <ul>
        <li>Low Risk: <span id="lowRiskCount">0</span></li>
        <li>Medium Risk: <span id="mediumRiskCount">0</span></li>
        <li>High Risk: <span id="highRiskCount">0</span></li>
      </ul>
    </li>
  </ul>
</div>
```

**Example JS fetch (stub):**
```javascript
async function updateStatsBar() {
  const response = await fetch(`${API_BASE}/stats/overview`);
  const stats = await response.json();
  document.getElementById('totalDocs').textContent = stats.totalDocs;
  document.getElementById('avgScore').textContent = stats.avgScore.toFixed(2);
  document.getElementById('lowRiskCount').textContent = stats.lowRisk;
  document.getElementById('mediumRiskCount').textContent = stats.mediumRisk;
  document.getElementById('highRiskCount').textContent = stats.highRisk;
}
// Call updateStatsBar() on page load
```

**Purpose:** Generate a PDF audit report combining document analysis, compliance check results, and a traceable HITL review record, fully aligned with regulatory and audit requirements.

**Generate form:**
```html
<input id="reportDocId" placeholder="Document Analysis ID (auto-filled)" />
<input id="reportComplianceId" placeholder="Compliance Check ID (optional)" />
<input id="reportReviewer" placeholder="Reviewer name (required for traceability)" />
<input id="reviewerRole" placeholder="Reviewer role (QM Lead, Riskmanager, Auditor, etc.)" />
<input id="reviewActionDate" placeholder="Action Date (auto-filled)" />
<button onclick="generateReport()">📄 Generate PDF Audit Report</button>
```

**HITL Review form (Mandatory, with role separation and closed-loop fixes):**
```html
<input id="reviewDocId" placeholder="Document ID" />
<input id="reviewerName" placeholder="Your name (required)" />
<input id="reviewerRole" placeholder="Your role (QM Lead, Riskmanager, Auditor, etc.)" />
<input id="reviewActionDate" placeholder="Action Date (auto-filled)" />
<select id="reviewVerdict">
  <option value="pass">✅ Pass</option>
  <option value="modifications_needed">🔄 Modifications Needed</option>
</select>
<textarea id="reviewComments" placeholder="Overall comments... (required for traceability)"></textarea>
<input id="modificationRequest" placeholder="Modification Request (if needed)" />
<input id="modificationFix" placeholder="Fix Description (if applicable)" />
<input id="approverName" placeholder="Approver name (if required for high risk)" />
<input id="approverRole" placeholder="Approver role (Riskmanager, QM Admin, etc.)" />
<button onclick="submitReview()">Submit Review Record</button>
```

**Audit Trail (Mandatory):**
```html
<div id="auditTrail">
  <h3>Audit Trail</h3>
  <table>
    <thead>
      <tr><th>Action</th><th>Date</th><th>User</th><th>Role</th><th>Details</th></tr>
    </thead>
    <tbody id="auditTrailRows">
      <!-- Populated with review, modification, approval, and fix records -->
    </tbody>
  </table>
</div>
```

**Model Selection & Cost Control UI:**
```html
<div id="modelCostControl">
  <h3>Model Selection & Cost Control</h3>
  <select id="modelType">
    <option value="llm">LLM</option>
    <option value="vlm">vLM</option>
    <option value="moe">MoE</option>
    <option value="classical">Classical ML</option>
  </select>
  <input id="modelName" placeholder="Model Name" />
  <input id="modelQuota" placeholder="Usage Quota" />
  <input id="modelCost" placeholder="Cost Estimate" />
  <button onclick="logModelUsage()">Log Model Usage</button>
</div>
```

**Risk Management Documentation UI:**
```html
<div id="riskManagement">
  <h3>Risk Management Documentation</h3>
  <input id="riskType" placeholder="Risk Type (e.g. FMEA, RMF)" />
  <input id="riskManager" placeholder="Riskmanager name (required for high risk)" />
  <textarea id="riskDescription" placeholder="Risk Description"></textarea>
  <button onclick="submitRiskDoc()">Submit Risk Management Record</button>
</div>
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
/* Additional Design Tokens for Dark Mode (user-selectable, not default) */
:root[data-theme="dark"] {
  --primary: #1a6a8a;
  --primary-dark: #12344a;
  --secondary: #6C2A4C;
  --success: #218c5c;
  --warning: #b37c12;
  --danger: #b33c3c;
  --bg: #181A1B;
  --surface: #232526;
  --border: #2C2F34;
  --text: #E0E0E0;
  --text-muted: #A0A0A0;
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0,0,0,0.16);
  --shadow-lg: 0 4px 20px rgba(0,0,0,0.24);
}

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

## Section 7 - Phase 0 “Happy Path” Demos (User Acceptance Tests)

### Mocked Service Endpoints for Testing

For acceptance tests and unit tests, the frontend uses promise-based mocked endpoints provided in `frontend/js/services/mockApi.js`. These functions return stable, predictable mock data for all key flows (document analysis, compliance check, template loading, report generation, stats, review submission).

This approach enables:
- Reliable happy path demos
- Isolated unit tests in the tests directory
- Seamless transition to real CrewAI backend endpoints

Mocked endpoints match the real API shape, so swapping to production services is straightforward.

These demos illustrate the main user acceptance scenarios for the app, validating core governance and compliance flows:

### 7.1 **Bridge Run → Artifact Lab → governed SOP draft → export draft PDF**
  - User initiates a Bridge Run, generates an artifact in Artifact Lab, drafts a governed SOP, and exports a draft PDF.

### 7.2 **Locking**
  - User A edits SOP; User B sees read-only mode with a lock chip and cannot edit the document concurrently.

### 7.3 **Exports registry**
  - User finds an existing Ready export in the registry and avoids redundant export actions.

### 7.4 **Workflow**
  - User requests review, comments are added in Workflow, document is approved, and an approved PDF is exported.

### 7.5 **Audit Trail**
  - Run created, artifact updated, and export created events are logged and searchable in the audit trail.

---

## Section 8 - Phase 0 Simplification Checklist

- [x] Projects contain exactly **one** Product (Phase 0).
- [x] Bridge Run targets exactly **one** Product (Phase 0).
- [x] Each governed Document/Artifact belongs to exactly **one** Product.
- [x] Open is **read-only** by default; Edit requires **exclusive lock**.
- [x] Exit/Sign out is **blocked** while operations are running.
- [x] Org-wide Exports page shows **Ready-only** exports, inheriting document permissions.
- [x] Draft/In Review exports show **DRAFT** watermark + banner.

---

## Section 9 - Additional UX Spec Proposal for Phase 0 MVP

### 9.1 Multi-Page & Deep-Link Routing (Phase 0)

Regarding Focus&Flow of the SOTA multi-page app, each high-intent user step must be an isolated page/route.
Each Document Hub tab must map to a dedicated route for direct linking and navigation:

- `/doc/:id/content` — Document content view
- `/doc/:id/workflow` — Workflow/comments view
- `/doc/:id/links` — Document links view
- `/doc/:id/exports` — Export history for document
- `/doc/:id/help` — Contextual help for document

Navigation should update the browser URL and allow direct access to each page/tab.

### 9.2 Provenance Chip (Bridge Run)

Artifacts affected by a Bridge Run must display a provenance chip near the top of the page:

- “Generated/updated by Bridge Run #…” chip on artifacts affected by Bridge.
- Chip should include Run ID and timestamp
- Displayed in metadata strip or header of artifact/document views

This makes provenance explicit and traceable for compliance.

### 9.3 Stable IDs Top of Page
- All artifact and document views must display stable identifiers (Doc ID, Version, Run ID) near the top of the page for traceability.
- Default to **read-only** viewing for artifacts as one aspect of being trustworthy, calm and traceable.

### 9.4 Performance & Responsiveness
- All long-running actions (PDF export, Excel import, ingestion jobs) run as **background operations** with visible progress.
- UI must remain usable while operations run (users can continue reading/editing other unlocked documents).

### 9.5 Strict Color Semantics & Layout
UI must follow strict color rules:
- **Blue:** primary actions + navigation
  - Examples: Start Bridge Run, Edit, Request review, Export PDF
- **Green:** success/completion only
  - Examples: Approved, Export Ready, Run Completed, Checks Passed
- **Amber:** attention / needs action / warnings
  - Examples: Needs revision, Missing required sections, Validation warnings
- **Red:** errors/blocked only
  - Examples: Export failed, Import failed, Permission denied
- **Surfaces & Layout:**
  - Backgrounds: white/off-white; subtle gray borders for structure.
  - Cards: light elevation (minimal shadow), rounded corners (subtle).
  - Tables: crisp borders, high readability, no heavy styling.
  - No glassmorphism.

Rule: Do not use green for navigation or “normal” states. Do not use red for “busy” states.

### 9.6 Typography Hierarchy
- Primary font: modern sans-serif (e.g., Inter / Open Sans).
- Clear hierarchy: H1/H2/H3 + body + captions.
- Monospace optional only for IDs/codes (Doc ID, Run ID).

### 9.7 Micro-interactions (Mood-enhancing, not distracting)
- Autosave state changes: “Saving…” → “Saved HH:MM”
- Lock chips animate subtly on acquisition/release.
- Operations indicator animates during work; never flashes or “jumps”.

### 9.8 Global App Shell (After Login)

#### 9.8.1 Top Bar (Persistent)
**Must include:**
- Project selector (Phase 0: informational; Projects contain exactly 1 Product)
- Global search (Doc ID/title)
- Operations indicator (ring + badge + drawer)
- Help (opens contextual help drawer)
- Focus mode toggle (collapse chrome; “minimize equivalent”)
- Fullscreen toggle (“maximize equivalent”)
- User menu:
  - Exit to login
  - Sign out

#### 9.8.2 Sidebar Navigation
Sidebar Navigation (Persistent)
- Dashboard
- Bridge (Runs)
- Artifact Lab
- Auditor Vault
- Documents
- SOPs
- Forms & Records
- Risk (RMF / FMEA)
- Architecture (arc42)
- Reviews
- Exports (Org-wide registry; Ready-only)
- Audit Trail
- Help
- Admin

#### 9.8.3 Operations & Exit Blocking
- Exit to login / Sign out MUST be blocked while any operation is running.
- If user attempts exit:
  - Show blocking modal: “Please wait—operations in progress”
  - List running operations with progress bar or stepper
  - Buttons:
    - “Open Operations”
    - “Keep working”
- Busy states use neutral/blue styling (not red).

### 9.9 Security, Authentication, Authorization (UX)

#### 9.9.1 Login (`/login`)
- Branded, calm page (no app shell visible).
- Only authenticated users can access app shell routes.

#### 9.9.2 Authorization
- Restricted actions should be disabled with tooltips rather than hidden (Phase 0).
- Permissions apply consistently to:
  - document view/edit
  - exports visibility
  - workflow approvals

###  9.10 Concurrency & Locking (Scalability Requirement)

#### 9.10.1 Read vs Edit
- **Readable:** allowed for permitted users even if locked.
- **Editable:** only if unlocked OR locked by the current user.

#### 9.10.2 Lock Acquisition
- Documents open in read-only mode by default.
- Clicking **Edit** requests an exclusive lock.
- If lock denied:
  - remain read-only
  - show banner: “Read-only — locked by {User} since {Time}”
  - disable Edit with tooltip

#### 9.10.3 Lock Safety
- Locks are server-enforced with TTL + heartbeat renewal.
- If lock expires, editor switches to read-only and offers “Reacquire lock”.

#### 9.10.4 Lock Display
- All list rows show lock chip when locked (e.g., “Locked by Alex”).
- Document header shows lock chip + tooltip with timestamp.

### 9.11 Export System (PDF Required)

#### 9.11.1 Export Types (Phase 0)
- PDF export required for:
  - SOP
  - Forms/Records templates
  - RMF
  - FMEA
  - arc42

Optional (Phase 0):
- Excel export for FMEA (recommended if Excel import exists).

#### 9.11.2 Draft Export Watermark
- If document status is **Draft** or **In Review**, PDF MUST be watermarked:
  - Large diagonal repeated “DRAFT”
  - Header banner text: “DRAFT — Not approved”
- Approved exports have no watermark.

#### 9.11.3 Export Surfaces
1) **Per-document Exports page** (`/doc/:id/exports`)
   - shows only exports for that document
2) **Top-bar Exports/Operations drawer**
   - personal view: queued/running + recently ready jobs
3) **Sidebar Exports registry page** (`/exports`)
   - org-wide view of **Ready exports only**

#### 9.11.4 Exports Registry (Org-wide)
- Shows Ready exports only.
- Search/filter by:
  - Project, Product
  - Doc type
  - Export type
  - Date range
  - Source status (Draft/Approved)
- Exports inherit document permissions (no leakage).

#### 9.11.5 Redundancy Prevention
- When user clicks Export PDF:
  - if a Ready export exists for same **document version** and same **source status** (Draft vs Approved),
  - prompt to reuse:
    - Open existing export
    - Export anyway
    - Cancel

### 9.12 Core Pages — Phase 0 Requirements

#### 9.12.1 Dashboard (Command Center) — `/dashboard`
**Must include:**
- Primary CTA: “Start New Bridge Run”
- Quick create: SOP, Form/Record, RMF, FMEA, arc42
- Tiles:
  - runs needing attention
  - my reviews
  - high-risk flags (from FMEA/RMF)
  - recent documents
  - latest Ready exports (filtered by project)

**Session restore:**
- Banner offering restore with explicit timestamp.

#### 9.12.2 Bridge (Orchestration & Intake) — `/bridge`, `/bridge/new`, `/bridge/runs/:runId`
##### Phase 0 Simplification
- One Project contains exactly one Product.
- One Bridge Run targets exactly one Product.
- Stepper: Intake → Classification → Result (Branching deferred).

**Intake**
- Upload/select inputs (regulatory PDFs, QM docs, technical reports).
- Show ingestion progress in Operations drawer.

**Classification**
- Verdict card (High/Limited/Minimal)
- “Why?” explanation with citations
- Right panel: “Steps & evidence” run log (not chain-of-thought)

**Result**
- Next actions:
  - Open Artifact Lab
  - Open Auditor Vault

#### 9.12.3 Artifact Lab (Generation / Push) — `/artifact-lab/:runId`
**Layout**
- Left: artifact list for run (SOP/RMF/FMEA/arc42/Forms)
- Center: type-aware editor workspace
- Right: citations panel + “Ask the Author” overlay (suggestions only)

**Governance**
- Artifacts open read-only by default.
- Edit requires lock.
- Generated changes are proposed/accepted (no silent edits).

**Export**
- Export actions enqueue jobs → Exports tab + registry.

#### 9.12.4 Auditor Vault (Compliance Check / Pull) — `/auditor-vault/:runId`
**Phase 0 View**
- Side-by-side comparison:
  - artifact section or FMEA subset
  - obligations/excerpts from inputs
- Gap list table (no heatmap in Phase 0)
  - obligation
  - evidence status
  - linked artifact
  - action: open artifact / create task / request revision

**Verdict Controls**
- Approve run outcome
- Request revision
- Escalate (Phase 0 can create a task for a role)

#### 9.12.5 Audit Trail — `/audit-trail` and run-specific views
**Global**
- Timeline list + filters: project/product/run/doc/date
- Events captured (Phase 0):
  - run started/completed
  - classification saved
  - artifact created/updated by run
  - user accepted/rejected suggestion
  - export ready/failed
  - workflow transitions
  - lock override events (if enabled)

### 9.13 Governance Documents (QMS) — Lists + Document Hub

#### 9.13.1 Lists
Routes:
- `/documents`, `/sops`, `/forms`, `/risk/rmf`, `/risk/fmea`, `/architecture`

**List row requirements**
- Doc ID, Title, Type, Product, Status, Lock chip, Updated at/by
- Actions:
  - Open (always)
  - Edit (disabled if locked by other; tooltip)

#### 9.13.2 Document Hub Header (All doc types)
- Breadcrumb
- Title
- Metadata strip:
  - Doc ID (copy)
  - Type chip
  - Product chip
  - Status chip
  - Version
  - Lock chip
- Actions:
  - Edit (lock)
  - Export PDF (enqueue)
  - Overflow menu

#### 9.13.3 Document Hub Pages (Routes)
- Content: `/doc/:id/content`
- Workflow (comments live here): `/doc/:id/workflow`
- Links: `/doc/:id/links`
- Exports (per-doc): `/doc/:id/exports`
- Help: `/doc/:id/help`

#### 9.13.4 Workflow Page (All doc types)
- Status: Draft → In Review → Approved
- Request review, Approve, Request changes (role-based)
- Comments & threads live only here (Phase 0)

#### 9.13.5 Links Page
- Outgoing + incoming links
- Link picker search by Doc ID/title

#### 9.13.6 Help (Tab + Drawer)
- Help page includes recommended wording snippets (copy).
- Contextual help drawer opens from section/field icons in Content.

### 9.14 Admin (Phase 0 Minimum)

#### 9.14.1 Products
- SOP autonumbering rule per product (prefix + digits + next number preview)
- Forms autonumbering rule per product (prefix + digits + next number preview)

#### 9.14.2 Risk Scales (Per Product)
- Severity scale editor (labels + definitions)
- Probability scale editor (labels + definitions)
- Scale version displayed (used by FMEA + exports)

### 9.15 Make Crew Status Obvious

UI requirement: Crew status must be clearly visible and legible.

- Status banner: Show a banner at the top with current crew status and a short label (e.g., “Crew: running”, “Crew: done”, “Crew: idle”).
- Status indicator: Include a small colored pill or icon next to the label (gray for idle, blue for running, green for done, red for error) to make state legible at a glance.
- Last updated: Display a “last updated” timestamp near the status label so users can tell stubs are working and the UI is responsive.
- Consistent phrasing: Use the same wording for statuses in the banner, buttons, and inline messages to reduce cognitive load and avoid mismatches.

### 9.17 Future Work (Backlog, beyond Phase 0)

#### 9.17.1 Topic List
- Projects containing multiple Products (true 1-to-many)
- Bridge Runs targeting multiple Products
- Branching step with multiple workflow paths
- Gap heatmap matrix visualization
- Provenance search by model/tool + reproducibility repository
- Cryptographically signed compliance certificates
- Row-level locking for FMEA
- Advanced notifications (unlock requests, export ready push, etc.)
- Audit bundles / packaged exports
- Enterprise SSO via OIDC (future step after email/password MVP with backend-managed sessions in Postgres/Redis)

#### 9.17.2 Engineering-ready backlog epics (suggested)
- Epic A: App shell + auth + project selector + navigation
- Epic B: Document model + product autonumbering + list pages
- Epic C: Document hub routing (content/workflow/links/exports/help)
- Epic D: Lock service (server-enforced TTL + heartbeat) + UI chips/banners
- Epic E: Export pipeline (server jobs) + DRAFT watermark + per-doc exports + org registry
- Epic F: Bridge run intake + classification + run log + citations scaffold
- Epic G: Artifact Lab (type-aware editors scaffold) + “suggestion” accept/reject
- Epic H: Auditor Vault (side-by-side + gap list + tasks)
- Epic I: Audit Trail (timeline + filters)
- Epic J: Identity & access hardening (email/password MVP now with backend sessions; OIDC SSO provider integration later)

### 9.18 Definition-of-Done and Route Map of Tasks (additional build .md files)
Notes aligned to repo’s build docs:
- Frontend is intended to be **Next.js + Tailwind** (per `.cursor/agents/frontend-eng.md` in the repo).
- Backend is **FastAPI Python 3.12** and serves `frontend/` as static in MVP (per `project-context/2.build/setup.md`).
- File upload uses `multipart/form-data` and must not manually set `Content-Type` (per `project-context/2.build/integration.md`).

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

1. The frontend is served by FastAPI `StaticFiles` — no separate web server needed for development.
2. All API calls use relative URLs (`/api/v1/...`) — frontend and API share the same origin.
3. JavaScript runs in modern browsers (ES2020+) — no polyfills or transpilation required.
4. The Reports tab form auto-populates `document_id`, `compliance_check_id`, and reviewer/session fields after each analysis; additional HITL and audit fields are now included for traceability.
5. Template download uses the Blob API (modern browsers only); no fallback for legacy browsers is required.
6. The stats bar (docs analyzed, avg score, risk classification) is now backend-powered and persists across sessions; real-time statistics are fetched from PostgreSQL.
7. Authentication/login UI is expanded beyond stub and uses backend-owned session management; only authenticated users can access app shell routes.
8. Locking, exclusive edit, and exit blocking modal are enforced in the UI; open is read-only by default, edit requires exclusive lock, and exit/sign out is blocked during operations.
9. Sidebar navigation and top bar features are documented and must be implemented for persistent navigation and app shell functionality.
10. UI follows strict color semantics and typography hierarchy as specified; micro-interactions and tooltips are used for disabled actions and lock states.

---

## Open Questions

1. **Mobile navigation:** Sidebar and top bar navigation are now required; should a hamburger menu or drawer be added for mobile?
2. **Form validation:** Should HTML5 `required` attributes and constraint validation be added for all forms, including HITL review, audit, and login?
3. **Accessibility:** Are ARIA labels and keyboard navigation implemented for new sidebar, top bar, and modal components? (Phase 2 candidate)
4. **Session persistence (Decision):** Do not use `localStorage` for user session/auth tokens; session/auth state is backend-owned via HTTP-only, `Secure` cookie. Frontend keeps only non-sensitive UI state in memory, and stats/last-analysis views are reloaded from backend APIs after refresh (optional TTL caching is limited to non-sensitive view state).
5. **Authentication (Decision):** Login UI shall be expanded beyond stub, and session management shall be backend-owned with HTTP-only, `Secure` cookies validated by FastAPI on each request; rationale includes XSS risk reduction, centralized revocation/logout/expiry, legal-hold/audit-grade server identity, and easier RBAC/ABAC at the API boundary. Frontend responsibilities are calling `/auth/login`, `/auth/logout`, and `/auth/me`, while keeping only non-sensitive UI state in memory.
6. **Locking:** Should lock status and chips be updated in real time (e.g., via WebSocket), and should lock expiry/reacquire be user-notified?
7. **Audit Trail:** Should audit events be filterable/searchable by user, doc, run, and operation type in the UI?
8. **Export registry:** Should export redundancy prevention prompt be expanded to cover all export types and statuses?

---

## Audit

```Python
persona=frontend-eng
action=develop-fe
timestamp=2026-3-23
adapter=AAMAD-vscode
artifact=project-context/2.build/frontend.md
version=0.4.0
status=complete
```
