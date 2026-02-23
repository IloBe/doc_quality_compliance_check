/**
 * Doc Quality & Compliance Check — Frontend Application
 * Communicates with the FastAPI backend at /api/v1
 */

const API_BASE = '/api/v1';

// ─── Utilities ────────────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = loading;
        btn.textContent = loading ? '⏳ Processing...' : btn.dataset.originalText || btn.textContent;
    }
}

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

// ─── Health Check ─────────────────────────────────────────────────────────────

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

// ─── Document Analysis ────────────────────────────────────────────────────────

async function analyzeText() {
    const content = document.getElementById('docContent').value.trim();
    const filename = document.getElementById('docFilename').value.trim() || 'document.md';
    const docType = document.getElementById('docType').value || null;

    if (!content) {
        showToast('Please enter document content', 'warning');
        return;
    }

    const btn = document.getElementById('btnAnalyze');
    btn.disabled = true;
    btn.textContent = '⏳ Analyzing...';

    try {
        const result = await apiFetch('/documents/analyze', {
            method: 'POST',
            body: JSON.stringify({ content, filename, doc_type: docType || undefined }),
        });
        displayAnalysisResult(result);
        document.getElementById('reportDocId').value = result.document_id;
        updateStats(result.overall_score);
        showToast('Analysis complete!', 'success');
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔍 Analyze Document';
    }
}

async function uploadFile(file) {
    if (!file) return;

    const zone = document.getElementById('uploadZone');
    const progress = document.getElementById('uploadProgress');
    const fill = document.getElementById('progressFill');

    progress.classList.remove('hidden');
    fill.style.width = '20%';

    const formData = new FormData();
    formData.append('file', file);

    try {
        fill.style.width = '60%';
        const res = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            body: formData,
        });
        fill.style.width = '100%';
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const result = await res.json();
        displayAnalysisResult(result);
        document.getElementById('reportDocId').value = result.document_id;
        updateStats(result.overall_score);
        showToast('Upload and analysis complete!', 'success');
    } catch (err) {
        showToast(`Upload error: ${err.message}`, 'error');
    } finally {
        setTimeout(() => {
            progress.classList.add('hidden');
            fill.style.width = '0%';
        }, 1000);
    }
}

function displayAnalysisResult(result) {
    const panel = document.getElementById('analysisResult');
    const badge = document.getElementById('resultBadge');
    const body = document.getElementById('resultBody');

    // Badge
    const statusMap = {
        passed: { text: '✅ Passed', cls: 'passed' },
        modifications_needed: { text: '⚠️ Modifications Needed', cls: 'warning' },
        failed: { text: '❌ Failed', cls: 'failed' },
        pending: { text: '⏳ Pending', cls: 'warning' },
    };
    const statusInfo = statusMap[result.status] || { text: result.status, cls: '' };
    badge.textContent = statusInfo.text;
    badge.className = `result-badge ${statusInfo.cls}`;

    // Score circle color
    const scoreColor = result.overall_score >= 0.8 ? '#27AE60'
        : result.overall_score >= 0.6 ? '#F39C12' : '#E74C3C';

    let html = `
        <div class="score-display">
            <div class="score-circle" style="border-color:${scoreColor};color:${scoreColor}">
                ${Math.round(result.overall_score * 100)}%
            </div>
            <div class="score-details">
                <h4>${result.filename} <small style="color:#999;font-weight:normal">(${result.document_type})</small></h4>
                <p>Document ID: <code>${result.document_id}</code></p>
            </div>
        </div>
    `;

    // Sections
    if (result.sections_found && result.sections_found.length > 0) {
        html += `<h4 style="margin-bottom:8px">Section Checklist</h4>
        <div class="section-grid">`;
        result.sections_found.forEach(sec => {
            const cls = sec.present ? 'present' : 'missing';
            const icon = sec.present ? '✅' : '❌';
            html += `<div class="section-item ${cls}">${icon} ${sec.name}</div>`;
        });
        html += `</div>`;
    }

    // Issues
    if (result.issues && result.issues.length > 0) {
        html += `<h4 style="margin:12px 0 8px">Issues Found (${result.issues.length})</h4>
        <ul class="issue-list">`;
        result.issues.forEach(issue => {
            html += `<li>⚠️ ${escapeHtml(issue)}</li>`;
        });
        html += `</ul>`;
    }

    // Recommendations
    if (result.recommendations && result.recommendations.length > 0) {
        html += `<h4 style="margin:12px 0 8px">Recommendations</h4>
        <ul class="rec-list">`;
        result.recommendations.forEach(rec => {
            html += `<li>💡 ${escapeHtml(rec)}</li>`;
        });
        html += `</ul>`;
    }

    body.innerHTML = html;
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadZone').classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadZone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
}

// ─── Compliance Check ─────────────────────────────────────────────────────────

async function checkCompliance() {
    const domain = document.getElementById('compDomain').value.trim();
    const description = document.getElementById('compDescription').value.trim();
    const usesAI = document.getElementById('compUsesAI').checked;
    const intendedUse = document.getElementById('compIntendedUse').value.trim();
    const content = document.getElementById('compContent').value.trim();

    if (!domain || !description) {
        showToast('Please fill in the product domain and description', 'warning');
        return;
    }

    try {
        const result = await apiFetch('/compliance/check/eu-ai-act', {
            method: 'POST',
            body: JSON.stringify({
                document_content: content || 'No content provided.',
                document_id: `check-${Date.now()}`,
                domain_info: {
                    domain,
                    description,
                    uses_ai_ml: usesAI,
                    intended_use: intendedUse || null,
                },
            }),
        });
        displayComplianceResult(result);
        showToast('Compliance check complete!', 'success');
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

function displayComplianceResult(result) {
    const panel = document.getElementById('complianceResult');
    const riskColorMap = { high: 'risk-high', limited: 'risk-limited', low: 'risk-low' };
    const riskCls = riskColorMap[result.risk_level] || '';

    let html = `
        <div class="result-header">
            <h3>EU AI Act Compliance Results</h3>
            <span class="result-badge ${result.compliance_score >= 0.7 ? 'passed' : 'warning'}">
                Score: ${Math.round(result.compliance_score * 100)}%
            </span>
        </div>
        <div class="result-body">
            <div class="compliance-summary ${riskCls}">
                ${escapeHtml(result.summary)}
            </div>
    `;

    // Requirements table
    if (result.requirements && result.requirements.length > 0) {
        html += `<h4 style="margin-bottom:8px">Requirements Checklist</h4>
        <div class="section-grid">`;
        result.requirements.forEach(req => {
            const cls = req.met ? 'present' : 'missing';
            const icon = req.met ? '✅' : '❌';
            html += `<div class="section-item ${cls}" title="${escapeHtml(req.description)}">
                ${icon} <strong>${req.requirement_id}</strong>: ${escapeHtml(req.title)}
            </div>`;
        });
        html += `</div>`;
    }

    // Mandatory gaps
    if (result.mandatory_gaps && result.mandatory_gaps.length > 0) {
        html += `<h4 style="margin:12px 0 8px;color:#E74C3C">⛔ Mandatory Gaps (${result.mandatory_gaps.length})</h4>
        <ul class="issue-list">`;
        result.mandatory_gaps.forEach(gap => {
            html += `<li>${escapeHtml(gap)}</li>`;
        });
        html += `</ul>`;
    }

    html += `</div>`;
    panel.innerHTML = html;
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Templates ────────────────────────────────────────────────────────────────

async function loadTemplates() {
    const container = document.getElementById('templatesList');
    try {
        const data = await apiFetch('/templates/');
        if (!data.templates || data.templates.length === 0) {
            container.innerHTML = '<p class="loading">No templates available.</p>';
            return;
        }

        container.innerHTML = data.templates.map(tmpl => `
            <div class="template-card ${tmpl.active ? '' : 'inactive'}">
                <h4>${escapeHtml(tmpl.title)}</h4>
                <div class="template-id">${tmpl.id}</div>
                ${tmpl.active
                    ? `<button class="btn btn-primary" onclick="viewTemplate('${tmpl.id}', '${escapeHtml(tmpl.title)}')">
                        📄 View Template
                    </button>`
                    : `<button class="btn btn-secondary" disabled>🔒 Coming Soon</button>`
                }
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<p class="loading">Could not load templates: ${escapeHtml(err.message)}</p>`;
    }
}

async function viewTemplate(templateId, title) {
    const viewer = document.getElementById('templateContent');
    const titleEl = document.getElementById('templateTitle');
    const body = document.getElementById('templateBody');

    titleEl.textContent = title;
    body.textContent = 'Loading...';
    viewer.classList.remove('hidden');
    viewer.scrollIntoView({ behavior: 'smooth' });

    try {
        const res = await fetch(`${API_BASE}/templates/${templateId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        body.textContent = text;
    } catch (err) {
        body.textContent = `Error loading template: ${err.message}`;
    }
}

function closeTemplate() {
    document.getElementById('templateContent').classList.add('hidden');
}

// ─── Reports ──────────────────────────────────────────────────────────────────

async function generateReport() {
    const docId = document.getElementById('reportDocId').value.trim();
    const reportType = document.getElementById('reportType').value;
    const reportFormat = document.getElementById('reportFormat').value;
    const reviewerName = document.getElementById('reviewerName').value.trim();

    if (!docId) {
        showToast('Please enter a document ID (run an analysis first)', 'warning');
        return;
    }

    try {
        const result = await apiFetch('/reports/generate', {
            method: 'POST',
            body: JSON.stringify({
                document_id: docId,
                report_type: reportType,
                report_format: reportFormat,
                include_recommendations: true,
                reviewer_name: reviewerName || null,
            }),
        });
        displayReportResult(result);
        showToast('Report generated!', 'success');
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

function displayReportResult(result) {
    const panel = document.getElementById('reportResult');
    panel.innerHTML = `
        <div class="result-header">
            <h3>Report Generated</h3>
            <span class="result-badge passed">✅ Ready</span>
        </div>
        <div class="result-body">
            <p><strong>Report ID:</strong> <code>${result.report_id}</code></p>
            <p><strong>Format:</strong> ${result.report_format.toUpperCase()}</p>
            <p><strong>Summary:</strong> ${escapeHtml(result.summary)}</p>
            <p style="margin-top:12px">
                <a href="/api/v1/reports/download/${result.report_id}"
                   class="btn btn-primary" target="_blank" download>
                    ⬇️ Download Report
                </a>
            </p>
        </div>
    `;
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

let totalDocs = 0;
let totalScore = 0;

function updateStats(score) {
    totalDocs++;
    totalScore += score;
    document.getElementById('statDocs').textContent = totalDocs;
    document.getElementById('statScore').textContent =
        `${Math.round((totalScore / totalDocs) * 100)}%`;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// ─── Security: escape HTML ────────────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    loadTemplates();
    initNavigation();

    // Poll health every 30 seconds
    setInterval(checkHealth, 30000);
});
