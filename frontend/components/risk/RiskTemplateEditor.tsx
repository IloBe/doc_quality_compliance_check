/**
 * RiskTemplateEditor.tsx
 *
 * Container component for the Excel-like risk template editor.
 * Supports:
 *   - Tabbed view: RMF (Table 1) | FMEA (Table 2)
 *   - Load default template pre-populated from reference images
 *   - Inline cell editing, add/remove rows
 *   - 🤖 AI-Assist via Anthropic Claude (per selected row)
 *   - Save to PostgreSQL (falls back to localStorage)
 *   - Export as CSV (client-side download)
 *   - Push to remote storage / server (optional URL)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  LuBrain,
  LuCircleCheck,
  LuChevronDown,
  LuCloudUpload,
  LuDownload,
  LuFileSpreadsheet,
  LuInfo,
  LuLoader,
  LuSave,
  LuTableProperties,
  LuX,
} from 'react-icons/lu';
import { getButtonClass } from '../buttonStyles';
import FmeaTemplateTable, { FmeaRow, makeEmptyFmeaRow } from './FmeaTemplateTable';
import RmfTemplateTable, { RmfRow } from './RmfTemplateTable';
import {
  aiSuggestRiskRow,
  createRiskTemplate,
  DEFAULT_TEMPLATE_TITLES,
  downloadTemplateCsv,
  ensureDefaultRiskTemplate,
  getDefaultRiskTemplate,
  getRiskTemplate,
  listRiskTemplates,
  pushTemplateToRemote,
  RiskTemplate,
  updateRiskTemplate,
} from '../../lib/riskTemplateClient';

// ---------------------------------------------------------------------------
// Default seed data — mirrors content from the two reference images
// ---------------------------------------------------------------------------

function buildDefaultRmfRows(): RmfRow[] {
  const seed: Omit<RmfRow, '_key' | 'nr'>[] = [
    {
      risk_category: 'Riskmanagement-Process',
      activity: 'Reference to Qualitymanagement-Policy / Compendium',
      owner_role: 'QM Lead',
      qualification_required: 'ISO 14971 certified; medical device QM background',
      target_date: '2026-Q1',
      regulatory_ref: 'ISO 14971:2019 §4',
      status: 'Completed',
      control_measure: 'Process definition baselined and approved',
      verification: 'Management review + process audit',
      evidence_ref: 'QMP-COMPENDIUM-001',
      notes: '',
    },
    {
      risk_category: 'Responsibility of Management',
      activity: 'Management responsibility matrix and sign-off responsibilities',
      owner_role: 'QM Lead',
      qualification_required: 'Management accountability for QM and risk governance',
      target_date: '2026-Q1',
      regulatory_ref: 'ISO 14971:2019 §4.2',
      status: 'Completed',
      control_measure: 'Formal role assignment and escalation paths',
      verification: 'Signed RACI + governance review',
      evidence_ref: 'MGMT-RACI-2026',
      notes: '',
    },
    {
      risk_category: 'Staff Qualifications (Target/Actual)',
      activity: 'Qualification matrix (target vs actual) for risk-relevant roles',
      owner_role: 'QM Lead',
      qualification_required: 'Training records + competency evidence',
      target_date: '2026-Q1',
      regulatory_ref: 'ISO 13485:2016 §6.2',
      status: 'In Progress',
      control_measure: 'Gap closure plan for missing competencies',
      verification: 'Training completion records',
      evidence_ref: 'HR-QUAL-MATRIX-2026',
      notes: '',
    },
    {
      risk_category: 'Riskmanagement-Plan',
      activity: 'Risk management plan and lifecycle scope definition',
      owner_role: 'Risk Manager',
      qualification_required: 'Risk planning and regulatory documentation skills',
      target_date: '2026-Q1',
      regulatory_ref: 'ISO 14971:2019 §4.4',
      status: 'In Progress',
      control_measure: 'Plan versioning + approval gate',
      verification: 'Signed RMP and version control log',
      evidence_ref: 'RMP-2026-v1.1',
      notes: '',
    },
    {
      risk_category: 'Intended Use of Product',
      activity: 'Intended use statement, users, environments, and misuse boundaries',
      owner_role: 'Product Manager',
      qualification_required: 'Clinical and user-context understanding',
      target_date: '2026-Q2',
      regulatory_ref: 'ISO 14971:2019 §5.2',
      status: 'In Progress',
      control_measure: 'Scope and contraindication definition',
      verification: 'Clinical and stakeholder review',
      evidence_ref: 'INTENDED-USE-2026',
      notes: '',
    },
    {
      risk_category: 'Hazardous Situation',
      activity: 'Hazardous situation register and scenario descriptions',
      owner_role: 'Risk Manager',
      qualification_required: 'Hazard analysis expertise',
      target_date: '2026-Q3',
      regulatory_ref: 'ISO 14971:2019 §5.4',
      status: 'Open',
      control_measure: 'Scenario-based hazard capture',
      verification: 'Cross-functional hazard workshop',
      evidence_ref: 'HAZARD-REGISTER-2026',
      notes: '',
    },
    {
      risk_category: 'Risk Assessments',
      activity: 'Risk estimation and evaluation records per hazardous situation',
      owner_role: 'Risk Manager',
      qualification_required: 'Risk scoring method competence',
      target_date: '2026-Q3',
      regulatory_ref: 'ISO 14971:2019 §6',
      status: 'Open',
      control_measure: 'Severity/probability scoring + acceptance criteria',
      verification: 'Peer review of risk matrix',
      evidence_ref: 'RISK-ASSESSMENT-2026',
      notes: '',
    },
    {
      risk_category: 'Risk Mitigations',
      activity: 'identified risk mitigation tasks; implemented risk mitigation measures; new identified risks as consequence of mitigation task',
      owner_role: 'Architect',
      qualification_required: 'Safety engineering and implementation control',
      target_date: '2026-Q3',
      regulatory_ref: 'ISO 14971:2019 §7',
      status: 'Open',
      control_measure: 'Mitigation tracking with verification evidence',
      verification: 'Test evidence and effectiveness review',
      evidence_ref: 'MITIGATION-TASKS-2026; MITIGATION-MEASURES-2026; NEW-RISKS-LOG-2026',
      notes: '',
    },
    {
      risk_category: 'Completeness',
      activity: 'Completeness check of RMF artifacts and traceability links',
      owner_role: 'Auditor',
      qualification_required: 'Audit readiness and document traceability skills',
      target_date: '2026-Q4',
      regulatory_ref: 'EU AI Act Art.11 / Annex IV',
      status: 'Open',
      control_measure: 'Checklist-based completeness validation',
      verification: 'Internal audit and gap closure',
      evidence_ref: 'RMF-COMPLETENESS-CHECKLIST-2026',
      notes: '',
    },
    {
      risk_category: 'Assessed Total Risk',
      activity: 'Overall assessed total risk and benefit-risk conclusion',
      owner_role: 'QM Lead',
      qualification_required: 'Risk acceptance authority',
      target_date: '2026-Q4',
      regulatory_ref: 'ISO 14971:2019 §8',
      status: 'Open',
      control_measure: 'Total risk statement and acceptance rationale',
      verification: 'Top management sign-off',
      evidence_ref: 'TOTAL-RISK-STATEMENT-2026',
      notes: '',
    },
    {
      risk_category: 'Risk Management Report',
      activity: 'Final risk management report with linked evidence and conclusions',
      owner_role: 'QM Lead',
      qualification_required: 'Regulatory affairs; MDR / IVDR knowledge',
      target_date: '2026-Q4',
      regulatory_ref: 'ISO 14971:2019 §10',
      status: 'Open',
      control_measure: 'Risk management report linked to DHF and technical file',
      verification: 'Regulatory submission review',
      evidence_ref: 'RMR-2026-v1.0',
      notes: '',
    },
    {
      risk_category: 'Post-Market Phase',
      activity: 'Post-market surveillance feedback loop and risk update triggers',
      owner_role: 'Regulatory Affairs',
      qualification_required: 'PMS / vigilance process expertise',
      target_date: 'Ongoing',
      regulatory_ref: 'ISO 14971:2019 §10.2',
      status: 'Open',
      control_measure: 'Complaint and incident trend monitoring',
      verification: 'Periodic PMS review report',
      evidence_ref: 'PMS-RISK-REVIEW-2026',
      notes: '',
    },
  ];
  return seed.map((s, i) => ({
    ...s,
    _key: `rmf-seed-${i}-${Math.random().toString(36).slice(2)}`,
    nr: i + 1,
  }));
}

function buildDefaultFmeaRows(): FmeaRow[] {
  const seed: Omit<FmeaRow, '_key' | 'nr' | 'rpn' | 'post_rpn'>[] = [
    {
      system_element: 'Data Preprocessing Pipeline',
      root_cause: 'Upstream ETL schema drift and missing input guards',
      failure_mode: 'Corrupt or missing input data passed to model',
      hazard_impact: 'Patient safety and diagnostic confidence',
      effect: 'False/misleading diagnostic prediction; patient safety risk',
      severity: 4,
      probability: 3,
      mitigation: 'Input schema validation + anomaly detection; reject malformed inputs with alert',
      verification: 'Unit + integration tests; negative-input test suite',
      post_severity: 2,
      post_probability: 2,
      residual_risk: 'Medium',
      status: 'In Progress',
      post_effect_risk: 'Residual delay risk with reduced patient safety impact',
      new_risks: 'Potential false reject of borderline valid data',
      notes: 'Linked to TEST-NEG-042',
    },
    {
      system_element: 'AI Inference Engine',
      root_cause: 'Insufficient OOD handling and calibration drift over time',
      failure_mode: 'Model overconfidence / hallucination on out-of-distribution inputs',
      hazard_impact: 'Clinical decision quality and patient outcome',
      effect: 'Misleading high-confidence output; delayed correct diagnosis',
      severity: 5,
      probability: 2,
      mitigation: 'Calibrated softmax + OOD detector; mandatory HITL review for confidence < 0.85',
      verification: 'Model evaluation suite; clinical evaluation study',
      post_severity: 3,
      post_probability: 2,
      residual_risk: 'Medium',
      status: 'Open',
      post_effect_risk: 'Reduced but still relevant risk in edge OOD scenarios',
      new_risks: 'Operational overhead due to increased HITL escalations',
      notes: 'ISO 14971 §7.4 — human oversight required',
    },
    {
      system_element: 'API Gateway',
      root_cause: 'Weak session hardening and incomplete authorization checks',
      failure_mode: 'Authentication bypass or session fixation',
      hazard_impact: 'Confidentiality of patient data and legal compliance',
      effect: 'Unauthorized access to patient data; GDPR/HIPAA violation',
      severity: 5,
      probability: 1,
      mitigation: 'JWT + HttpOnly session cookies; RBAC; rate limiting; HSTS',
      verification: 'Penetration test; automated auth test suite (100 % pass)',
      post_severity: 2,
      post_probability: 1,
      residual_risk: 'Low',
      status: 'Mitigated',
      post_effect_risk: 'Localized security risk with constrained blast radius',
      new_risks: 'Token refresh race conditions under high concurrency',
      notes: 'Verified Q1-2026 pentest report',
    },
    {
      system_element: 'Database / Persistence Layer',
      root_cause: 'Incomplete transaction safeguards and backup verification gaps',
      failure_mode: 'Audit trail record loss or silent data corruption',
      hazard_impact: 'Auditability and traceability evidence integrity',
      effect: 'Non-traceability; regulatory non-compliance',
      severity: 4,
      probability: 2,
      mitigation: 'Append-only audit_events table; DB checksums; daily backup + point-in-time recovery',
      verification: 'Backup restore drill; data integrity checks',
      post_severity: 2,
      post_probability: 1,
      residual_risk: 'Low',
      status: 'Verified',
      post_effect_risk: 'Low remaining impact due to rapid recovery capability',
      new_risks: 'Backup storage growth and retention policy tuning needs',
      notes: '',
    },
    {
      system_element: 'HITL Review Gate',
      root_cause: 'Workflow policy checks not enforced strongly enough server-side',
      failure_mode: 'Reviewer bypasses mandatory approval step',
      hazard_impact: 'Clinical governance and approval chain integrity',
      effect: 'Unapproved AI output enters clinical workflow',
      severity: 5,
      probability: 2,
      mitigation: 'Workflow enforces HITL gate server-side; UI cannot submit without reviewer token',
      verification: 'Workflow integration tests; RBAC audit',
      post_severity: 3,
      post_probability: 1,
      residual_risk: 'Medium',
      status: 'Open',
      post_effect_risk: 'Reduced governance breach risk, still sensitive for critical paths',
      new_risks: 'Approval latency during peak reviewer workload',
      notes: '',
    },
  ];
  return seed.map((s, i) => {
    const rpn = s.severity * s.probability;
    const post_rpn = s.post_severity * s.post_probability;
    return {
      ...s,
      _key: `fmea-seed-${i}-${Math.random().toString(36).slice(2)}`,
      nr: i + 1,
      rpn,
      post_rpn,
    };
  });
}

function buildBlankFmeaRows(rowCount: number = buildDefaultFmeaRows().length): FmeaRow[] {
  return Array.from({ length: Math.max(1, rowCount) }, (_, index) => makeEmptyFmeaRow(index + 1));
}

// ---------------------------------------------------------------------------
// Helpers: convert table rows ↔ API row_data dicts
// ---------------------------------------------------------------------------

function rmfRowsToDict(rows: RmfRow[]): Record<string, unknown>[] {
  return rows.map(({ _key: _k, ...rest }) => rest as unknown as Record<string, unknown>);
}

function fmeaRowsToDict(rows: FmeaRow[]): Record<string, unknown>[] {
  return rows.map(({ _key: _k, ...rest }) => ({
    ...rest,
    rpn: rest.severity * rest.probability,
    post_rpn: rest.post_severity * rest.post_probability,
  })) as unknown as Record<string, unknown>[];
}

function dictToRmfRows(dicts: Record<string, unknown>[]): RmfRow[] {
  return dicts.map((d, i) => ({
    _key: `rmf-loaded-${i}-${Math.random().toString(36).slice(2)}`,
    nr: Number(d.nr ?? i + 1),
    risk_category: String(d.risk_category ?? ''),
    activity: String(d.activity ?? ''),
    owner_role: String(d.owner_role ?? ''),
    qualification_required: String(d.qualification_required ?? ''),
    target_date: String(d.target_date ?? ''),
    regulatory_ref: String(d.regulatory_ref ?? ''),
    status: String(d.status ?? 'Open'),
    control_measure: String(d.control_measure ?? ''),
    verification: String(d.verification ?? ''),
    evidence_ref: String(d.evidence_ref ?? ''),
    notes: String(d.notes ?? ''),
  }));
}

function dictToFmeaRows(dicts: Record<string, unknown>[]): FmeaRow[] {
  return dicts.map((d, i) => {
    const s = Math.max(1, Math.min(5, Number(d.severity ?? 1)));
    const p = Math.max(1, Math.min(5, Number(d.probability ?? 1)));
    const ps = Math.max(1, Math.min(5, Number(d.post_severity ?? s)));
    const pp = Math.max(1, Math.min(5, Number(d.post_probability ?? p)));
    return {
      _key: `fmea-loaded-${i}-${Math.random().toString(36).slice(2)}`,
      nr: Number(d.nr ?? i + 1),
      system_element: String(d.system_element ?? ''),
      root_cause: String(d.root_cause ?? ''),
      failure_mode: String(d.failure_mode ?? ''),
      hazard_impact: String(d.hazard_impact ?? ''),
      effect: String(d.effect ?? ''),
      severity: s,
      probability: p,
      rpn: s * p,
      mitigation: String(d.mitigation ?? ''),
      verification: String(d.verification ?? ''),
      post_severity: ps,
      post_probability: pp,
      post_rpn: ps * pp,
      residual_risk: String(d.residual_risk ?? (ps * pp <= 4 ? 'Low' : ps * pp <= 12 ? 'Medium' : 'High')),
      status: String(d.status ?? 'Open'),
      post_effect_risk: String(d.post_effect_risk ?? ''),
      new_risks: String(d.new_risks ?? ''),
      notes: String(d.notes ?? ''),
    };
  });
}

function pickLinkedRmfRowKey(rows: RmfRow[], selectedTitle?: string): string | null {
  const normalizedTitle = (selectedTitle || '').trim().toLowerCase();
  if (!normalizedTitle) return null;

  if (normalizedTitle.includes('risk management plan')) {
    const preferred = rows.find(
      (row) =>
        row.risk_category === 'Riskmanagement-Plan' ||
        row.activity.toLowerCase().includes('risk management plan'),
    );
    if (preferred) return preferred._key;
  }

  const exact = rows.find((row) => {
    const blob = `${row.risk_category} ${row.activity} ${row.evidence_ref}`.toLowerCase();
    return blob.includes(normalizedTitle);
  });
  if (exact) return exact._key;

  const keywords = normalizedTitle.split(/\s+/).filter((word) => word.length >= 4);
  const partial = rows.find((row) => {
    const blob = `${row.risk_category} ${row.activity} ${row.evidence_ref}`.toLowerCase();
    return keywords.some((word) => blob.includes(word));
  });
  return partial?._key ?? null;
}

function normalizeLinkText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function pickLinkedFmeaRowKey(rows: FmeaRow[], selectedTitle?: string): string | null {
  const title = normalizeLinkText(selectedTitle || '');
  if (!title) return null;

  const compactTitle = title.replace(/\s+/g, '');

  const exact = rows.find((row) => {
    const blob = normalizeLinkText(
      `${row.system_element} ${row.failure_mode} ${row.root_cause} ${row.hazard_impact} ${row.effect} ${row.notes}`,
    );
    const compactBlob = blob.replace(/\s+/g, '');
    return compactBlob.includes(compactTitle) || compactTitle.includes(compactBlob);
  });
  if (exact) return exact._key;

  const keywords = title.split(/\s+/).filter((word) => word.length >= 3);
  let bestKey: string | null = null;
  let bestScore = 0;

  rows.forEach((row) => {
    const blob = normalizeLinkText(
      `${row.system_element} ${row.failure_mode} ${row.root_cause} ${row.hazard_impact} ${row.effect} ${row.notes}`,
    );
    const score = keywords.reduce((acc, word) => (blob.includes(word) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestKey = row._key;
    }
  });

  return bestScore > 0 ? bestKey : null;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface Props {
  actorEmail: string;
  canEdit: boolean;
  product?: string;
  selectedRecordType?: 'RMF' | 'FMEA';
  selectedRecordTitle?: string;
  selectedRecordProduct?: string;
}

type Tab = 'RMF' | 'FMEA';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const RiskTemplateEditor: React.FC<Props> = ({
  actorEmail,
  canEdit,
  product = 'AI-Diagnostics-Core',
  selectedRecordType,
  selectedRecordTitle,
  selectedRecordProduct,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('RMF');

  // Template state
  const [rmfRows, setRmfRows] = useState<RmfRow[]>([]);
  const [fmeaRows, setFmeaRows] = useState<FmeaRow[]>([]);
  const [rmfTemplateId, setRmfTemplateId] = useState<string | null>(null);
  const [fmeaTemplateId, setFmeaTemplateId] = useState<string | null>(null);
  const [linkedRmfRowKey, setLinkedRmfRowKey] = useState<string | null>(null);
  const [linkedFmeaRowKey, setLinkedFmeaRowKey] = useState<string | null>(null);
  const [defaultRmfRows, setDefaultRmfRows] = useState<Record<string, unknown>[]>([]);
  const [defaultFmeaRows, setDefaultFmeaRows] = useState<Record<string, unknown>[]>([]);

  // AI-assist
  const [aiHighlightKey, setAiHighlightKey] = useState<string | null>(null);
  const [aiSelectedRowKey, setAiSelectedRowKey] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Remote push
  const [showRemotePush, setShowRemotePush] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [pushLoading, setPushLoading] = useState(false);

  // Feedback
  const [saveLoading, setSaveLoading] = useState(false);
  const [loadDefaultLoading, setLoadDefaultLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [infoDialog, setInfoDialog] = useState<'table1' | 'table2' | null>(null);

  // Load defaults on mount
  useEffect(() => {
    setRmfRows(buildDefaultRmfRows());
    setFmeaRows(buildDefaultFmeaRows());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const seededRmfRows = rmfRowsToDict(buildDefaultRmfRows());
    const seededFmeaRows = fmeaRowsToDict(buildDefaultFmeaRows());

    async function ensureCanonicalDefaults(): Promise<void> {
      const [rmfResult, fmeaResult] = await Promise.all([
        ensureDefaultRiskTemplate({
          template_type: 'RMF',
          template_title: DEFAULT_TEMPLATE_TITLES.RMF,
          product,
          created_by: actorEmail,
          rows: seededRmfRows,
        }),
        ensureDefaultRiskTemplate({
          template_type: 'FMEA',
          template_title: DEFAULT_TEMPLATE_TITLES.FMEA,
          product,
          created_by: actorEmail,
          rows: seededFmeaRows,
        }),
      ]);

      if (cancelled) return;

      const persistedRmfRows = rmfResult.ok && rmfResult.data
        ? rmfResult.data.rows.map((row) => row.row_data)
        : seededRmfRows;
      const persistedFmeaRows = fmeaResult.ok && fmeaResult.data
        ? fmeaResult.data.rows.map((row) => row.row_data)
        : seededFmeaRows;

      setDefaultRmfRows(persistedRmfRows);
      setDefaultFmeaRows(persistedFmeaRows);
      setRmfRows(dictToRmfRows(persistedRmfRows));
      setFmeaRows(dictToFmeaRows(persistedFmeaRows));
      setIsDemoMode(Boolean(rmfResult.degradedToDemo || fmeaResult.degradedToDemo));
    }

    void ensureCanonicalDefaults();

    return () => {
      cancelled = true;
    };
  }, [actorEmail, product]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedRecordTemplate(): Promise<void> {
      if (!selectedRecordType || !selectedRecordTitle) return;

      const targetTab: Tab = selectedRecordType;
      const targetProduct = selectedRecordProduct || product;
      setActiveTab(targetTab);
      if (targetTab !== 'RMF') setLinkedRmfRowKey(null);
      if (targetTab !== 'FMEA') setLinkedFmeaRowKey(null);

      const listResult = await listRiskTemplates({
        template_type: targetTab,
        product: targetProduct,
      });
      if (!listResult.ok || !listResult.data) return;

      const exact = listResult.data.find(
        (template) =>
          template.template_type === targetTab &&
          template.product === targetProduct &&
          template.template_title === selectedRecordTitle,
      );
      const fallback = listResult.data.find(
        (template) => template.template_type === targetTab && template.product === targetProduct,
      );
      const picked = exact ?? fallback;
      if (!picked) return;

      const full = await getRiskTemplate(picked.template_id);
      if (cancelled || !full.ok || !full.data) return;

      const rowDicts = full.data.rows.map((row) => row.row_data);
      if (targetTab === 'RMF') {
        const mapped = dictToRmfRows(rowDicts);
        setRmfTemplateId(full.data.template_id);
        setRmfRows(mapped);
        setLinkedRmfRowKey(pickLinkedRmfRowKey(mapped, selectedRecordTitle));
      } else {
        const mapped = dictToFmeaRows(rowDicts);
        setFmeaTemplateId(full.data.template_id);
        setFmeaRows(mapped);
        setLinkedFmeaRowKey(pickLinkedFmeaRowKey(mapped, selectedRecordTitle));
      }

      setIsDemoMode(Boolean(full.degradedToDemo));
      setInfoMessage(
        targetTab === 'RMF'
          ? 'RMF template loaded and linked plan item highlighted for the selected workflow record.'
          : 'FMEA template loaded and linked row highlighted for the selected workflow record.',
      );
      setErrorMessage(null);
    }

    void loadSelectedRecordTemplate();

    return () => {
      cancelled = true;
    };
  }, [selectedRecordType, selectedRecordTitle, selectedRecordProduct, product]);

  useEffect(() => {
    if (selectedRecordType !== 'RMF' || !selectedRecordTitle) {
      if (linkedRmfRowKey !== null) setLinkedRmfRowKey(null);
      return;
    }
    if (rmfRows.length === 0) {
      if (linkedRmfRowKey !== null) setLinkedRmfRowKey(null);
      return;
    }

    const nextKey = pickLinkedRmfRowKey(rmfRows, selectedRecordTitle);
    if (nextKey !== linkedRmfRowKey) {
      setLinkedRmfRowKey(nextKey);
    }
  }, [rmfRows, selectedRecordType, selectedRecordTitle, linkedRmfRowKey]);

  useEffect(() => {
    if (selectedRecordType !== 'FMEA' || !selectedRecordTitle) {
      if (linkedFmeaRowKey !== null) setLinkedFmeaRowKey(null);
      return;
    }
    if (fmeaRows.length === 0) {
      if (linkedFmeaRowKey !== null) setLinkedFmeaRowKey(null);
      return;
    }

    const nextKey = pickLinkedFmeaRowKey(fmeaRows, selectedRecordTitle);
    if (nextKey !== linkedFmeaRowKey) {
      setLinkedFmeaRowKey(nextKey);
    }
  }, [fmeaRows, selectedRecordType, selectedRecordTitle, linkedFmeaRowKey]);

  // Helper: build RiskTemplate shape for download
  const buildRiskTemplateForDownload = useCallback(
    (type: Tab): RiskTemplate => {
      const rows = type === 'RMF' ? rmfRows : fmeaRows;
      const rowDicts = type === 'RMF' ? rmfRowsToDict(rmfRows) : fmeaRowsToDict(fmeaRows);
      const id = type === 'RMF' ? (rmfTemplateId ?? 'local') : (fmeaTemplateId ?? 'local');
      const now = new Date().toISOString();
      return {
        template_id: id,
        template_type: type,
        template_title: type === 'RMF' ? 'Risk Management File' : 'FMEA — Product Risk Documentation',
        product,
        version: '1.0.0',
        status: 'Draft',
        created_by: actorEmail,
        metadata: {},
        created_at: now,
        updated_at: now,
        rows: rowDicts.map((d, i) => ({
          row_id: `local-${i}`,
          template_id: id,
          row_order: i,
          row_data: d,
          created_at: now,
        })),
      };
    },
    [rmfRows, fmeaRows, rmfTemplateId, fmeaTemplateId, actorEmail, product],
  );

  // ---------------------------------------------------------------------------
  // Save to database
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(
    async (type: Tab) => {
      if (!canEdit) {
        setErrorMessage('Your role is read-only.');
        return;
      }
      setSaveLoading(true);
      setErrorMessage(null);
      setInfoMessage(null);

      const rowDicts = type === 'RMF' ? rmfRowsToDict(rmfRows) : fmeaRowsToDict(fmeaRows);
      const existingId = type === 'RMF' ? rmfTemplateId : fmeaTemplateId;

      try {
        if (existingId) {
          const result = await updateRiskTemplate(existingId, { rows: rowDicts });
          if (!result.ok) throw new Error(result.message);
          setIsDemoMode(Boolean(result.degradedToDemo));
          setInfoMessage(result.message);
          if (result.data) {
            if (type === 'RMF') setRmfRows(dictToRmfRows(result.data.rows.map((r) => r.row_data)));
            else setFmeaRows(dictToFmeaRows(result.data.rows.map((r) => r.row_data)));
          }
        } else {
          const title = type === 'RMF' ? 'Risk Management File' : 'FMEA — Product Risk Documentation';
          const result = await createRiskTemplate({
            template_type: type,
            template_title: title,
            product,
            created_by: actorEmail,
            rows: rowDicts,
          });
          if (!result.ok || !result.data) throw new Error(result.message);
          setIsDemoMode(Boolean(result.degradedToDemo));
          setInfoMessage(result.message);
          if (type === 'RMF') {
            setRmfTemplateId(result.data.template_id);
            setRmfRows(dictToRmfRows(result.data.rows.map((r) => r.row_data)));
          } else {
            setFmeaTemplateId(result.data.template_id);
            setFmeaRows(dictToFmeaRows(result.data.rows.map((r) => r.row_data)));
          }
        }
      } catch (err) {
        setErrorMessage(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setSaveLoading(false);
      }
    },
    [canEdit, rmfRows, fmeaRows, rmfTemplateId, fmeaTemplateId, product, actorEmail],
  );

  // ---------------------------------------------------------------------------
  // Export CSV
  // ---------------------------------------------------------------------------
  const handleExportCsv = useCallback(
    (type: Tab) => {
      downloadTemplateCsv(buildRiskTemplateForDownload(type));
    },
    [buildRiskTemplateForDownload],
  );

  const handleLoadDefault = useCallback(async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoadDefaultLoading(true);

    try {
      const liveDefault = await getDefaultRiskTemplate({
        template_type: activeTab,
        product,
      });

      const liveRows = liveDefault.ok && liveDefault.data
        ? liveDefault.data.rows.map((row) => row.row_data)
        : null;

      if (activeTab === 'RMF') {
        const sourceRows = liveRows ?? (defaultRmfRows.length > 0 ? defaultRmfRows : rmfRowsToDict(buildDefaultRmfRows()));
        const mapped = dictToRmfRows(sourceRows);
        setDefaultRmfRows(sourceRows);
        setRmfRows(mapped);
        setLinkedRmfRowKey(pickLinkedRmfRowKey(mapped, selectedRecordTitle));
        setRmfTemplateId(null);
        setIsDemoMode(Boolean(liveDefault.degradedToDemo));
        setInfoMessage(liveRows
          ? 'Live RMF default baseline loaded from the server. Save to create a working copy.'
          : 'Stored RMF default baseline loaded from fallback storage. Save to create a working copy.');
        return;
      }

      const sourceRows = liveRows ?? defaultFmeaRows;
      const rowCount = sourceRows.length > 0 ? sourceRows.length : buildDefaultFmeaRows().length;
      if (liveRows) {
        setDefaultFmeaRows(sourceRows);
      }
      const mapped = buildBlankFmeaRows(rowCount);
      setFmeaRows(mapped);
      setLinkedFmeaRowKey(pickLinkedFmeaRowKey(mapped, selectedRecordTitle));
      setFmeaTemplateId(null);
      setIsDemoMode(Boolean(liveDefault.degradedToDemo));
      setInfoMessage(liveRows
        ? 'Blank FMEA structure loaded from the live server baseline. Save to create a working copy.'
        : 'Blank FMEA structure loaded from fallback storage. Save to create a working copy.');
    } catch (err) {
      if (activeTab === 'RMF') {
        const sourceRows = defaultRmfRows.length > 0 ? defaultRmfRows : rmfRowsToDict(buildDefaultRmfRows());
        const mapped = dictToRmfRows(sourceRows);
        setRmfRows(mapped);
        setLinkedRmfRowKey(pickLinkedRmfRowKey(mapped, selectedRecordTitle));
        setRmfTemplateId(null);
      } else {
        const rowCount = defaultFmeaRows.length > 0 ? defaultFmeaRows.length : buildDefaultFmeaRows().length;
        const mapped = buildBlankFmeaRows(rowCount);
        setFmeaRows(mapped);
        setLinkedFmeaRowKey(pickLinkedFmeaRowKey(mapped, selectedRecordTitle));
        setFmeaTemplateId(null);
      }
      setErrorMessage(`Live default fetch unavailable: ${err instanceof Error ? err.message : String(err)}`);
      setInfoMessage('Loaded the last known default baseline instead.');
    } finally {
      setLoadDefaultLoading(false);
    }
  }, [activeTab, defaultFmeaRows, defaultRmfRows, product, selectedRecordTitle]);

  // ---------------------------------------------------------------------------
  // Remote push
  // ---------------------------------------------------------------------------
  const handleRemotePush = useCallback(
    async (type: Tab) => {
      if (!remoteUrl.trim()) {
        setErrorMessage('Remote URL is required.');
        return;
      }
      setPushLoading(true);
      setErrorMessage(null);
      const result = await pushTemplateToRemote(buildRiskTemplateForDownload(type), remoteUrl.trim());
      if (result.ok) {
        setInfoMessage(result.message);
        setShowRemotePush(false);
      } else {
        setErrorMessage(result.message);
      }
      setPushLoading(false);
    },
    [remoteUrl, buildRiskTemplateForDownload],
  );

  // ---------------------------------------------------------------------------
  // AI-assist
  // ---------------------------------------------------------------------------
  const handleAiAssist = useCallback(
    async (type: Tab) => {
      const rowKey = aiSelectedRowKey;
      if (!rowKey) {
        setAiMessage('Select a row to run AI-assist on it (click a row first).');
        return;
      }
      setAiLoading(true);
      setAiMessage(null);
      setAiHighlightKey(rowKey);

      let partial: Record<string, unknown> = {};
      if (type === 'RMF') {
        const row = rmfRows.find((r) => r._key === rowKey);
        if (row) partial = { activity: row.activity, risk_category: row.risk_category, notes: row.notes };
      } else {
        const row = fmeaRows.find((r) => r._key === rowKey);
        if (row) partial = { system_element: row.system_element, failure_mode: row.failure_mode, effect: row.effect };
      }

      const result = await aiSuggestRiskRow({
        template_type: type,
        partial_row: partial,
        context: `Product: ${product}. Actor: ${actorEmail}.`,
      });

      if (result.ok && result.data) {
        const suggestions = result.data.suggestions;
        if (type === 'RMF') {
          setRmfRows((prev) =>
            prev.map((r) => (r._key === rowKey ? { ...r, ...suggestions } : r)),
          );
        } else {
          setFmeaRows((prev) =>
            prev.map((r) => {
              if (r._key !== rowKey) return r;
              const updated = { ...r, ...suggestions };
              const s = Math.max(1, Math.min(5, Number(updated.severity)));
              const p = Math.max(1, Math.min(5, Number(updated.probability)));
              return { ...updated, severity: s, probability: p, rpn: s * p };
            }),
          );
        }
        setAiMessage(result.data.explanation);
      } else {
        setAiMessage(result.message);
        setAiHighlightKey(null);
      }

      setAiLoading(false);
    },
    [aiSelectedRowKey, rmfRows, fmeaRows, product, actorEmail],
  );

  // Click a row to select it for AI-assist
  const selectRowForAi = useCallback((key: string) => {
    setAiSelectedRowKey((prev) => (prev === key ? null : key));
    setAiHighlightKey(null);
    setAiMessage(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tabIs = (t: Tab) => activeTab === t;

  const tabClass = (t: Tab) =>
    [
      'px-4 py-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition',
      tabIs(t)
        ? t === 'RMF'
          ? 'border-blue-600 text-blue-700'
          : 'border-emerald-600 text-emerald-700'
        : 'border-transparent text-neutral-400 hover:text-neutral-700',
    ].join(' ');

  const currentRows = tabIs('RMF') ? rmfRows : fmeaRows;
  const savedId = tabIs('RMF') ? rmfTemplateId : fmeaTemplateId;
  const loadDefaultVariant = activeTab === 'RMF' ? 'soft-blue' : 'soft-emerald';

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white space-y-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <LuFileSpreadsheet className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-700">
            Risk Templates
          </h2>
          {isDemoMode && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Demo storage
            </span>
          )}
          {savedId && (
            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              <LuCircleCheck className="inline h-3 w-3 mr-0.5" />
              Saved
            </span>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* AI-assist */}
          {canEdit && (
            <button
              type="button"
              disabled={aiLoading || !aiSelectedRowKey}
              onClick={() => handleAiAssist(activeTab)}
              title={aiSelectedRowKey ? 'Run Claude AI-assist on selected row' : 'Click a row number first to select it'}
              className={getButtonClass({
                variant: aiSelectedRowKey ? 'soft-violet' : 'neutral',
                size: 'sm',
                extra: 'gap-1.5',
              })}
            >
              {aiLoading ? (
                <LuLoader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LuBrain className="h-3.5 w-3.5" />
              )}
              AI-Assist
            </button>
          )}

          {/* Save */}
          {canEdit && (
            <button
              type="button"
              disabled={saveLoading || currentRows.length === 0}
              onClick={() => handleSave(activeTab)}
              className={getButtonClass({ variant: 'primary', size: 'sm' })}
            >
              {saveLoading ? (
                <LuLoader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LuSave className="h-3.5 w-3.5" />
              )}
              Save to DB
            </button>
          )}

          {/* Export CSV */}
          <button
            type="button"
            disabled={currentRows.length === 0}
            onClick={() => handleExportCsv(activeTab)}
            className={getButtonClass({ variant: 'soft-emerald', size: 'sm' })}
          >
            <LuDownload className="h-3.5 w-3.5" />
            Export CSV
          </button>

          {/* Remote push */}
          <button
            type="button"
            onClick={() => setShowRemotePush((v) => !v)}
            className={getButtonClass({ variant: 'neutral', size: 'sm' })}
            title="Push template to a remote URL / storage server"
          >
            <LuCloudUpload className="h-3.5 w-3.5" />
            Push
            <LuChevronDown className={['h-3 w-3 transition', showRemotePush ? 'rotate-180' : ''].join(' ')} />
          </button>

          {/* Load defaults */}
          {canEdit && (
            <button
              type="button"
              disabled={loadDefaultLoading}
              onClick={handleLoadDefault}
              className={getButtonClass({ variant: loadDefaultVariant, size: 'sm' })}
              title={activeTab === 'RMF' ? 'Load the stored RMF default baseline' : 'Load the stored blank FMEA structure'}
            >
              {loadDefaultLoading ? (
                <LuLoader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LuTableProperties className="h-3.5 w-3.5" />
              )}
              Load Default
            </button>
          )}
        </div>
      </div>

      {/* Remote push panel */}
      {showRemotePush && (
        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 border-b border-neutral-100">
          <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide whitespace-nowrap">
            Target URL
          </label>
          <input
            type="url"
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            placeholder="https://storage.example.com/api/risk"
            className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
          />
          <button
            type="button"
            disabled={pushLoading || !remoteUrl.trim()}
            onClick={() => handleRemotePush(activeTab)}
            className={getButtonClass({ variant: 'primary', size: 'sm' })}
          >
            {pushLoading ? <LuLoader className="h-3.5 w-3.5 animate-spin" /> : <LuCloudUpload className="h-3.5 w-3.5" />}
            Push
          </button>
        </div>
      )}

      {/* Feedback messages */}
      {(infoMessage || errorMessage || aiMessage) && (
        <div className="px-4 py-2 border-b border-neutral-100 space-y-1">
          {infoMessage && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <LuCircleCheck className="h-3.5 w-3.5 flex-shrink-0" />
              {infoMessage}
            </p>
          )}
          {errorMessage && (
            <p className="text-xs text-rose-700">{errorMessage}</p>
          )}
          {aiMessage && (
            <p className="flex items-center gap-1.5 text-xs text-violet-700">
              <LuBrain className="h-3.5 w-3.5 flex-shrink-0" />
              {aiMessage}
            </p>
          )}
        </div>
      )}

      {/* AI-assist row selection hint */}
      {canEdit && !aiSelectedRowKey && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-50 border-b border-violet-100 text-[11px] text-violet-600">
          <LuInfo className="h-3.5 w-3.5 flex-shrink-0" />
          Click a row&rsquo;s <strong>Nr.</strong> cell to select it, then press <strong>AI-Assist</strong> for Claude suggestions on that row.
        </div>
      )}
      {aiSelectedRowKey && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-100 border-b border-violet-200 text-[11px] text-violet-700">
          <LuBrain className="h-3.5 w-3.5 flex-shrink-0" />
          Row selected for AI-assist. Press <strong>AI-Assist</strong> to get Claude&rsquo;s suggestions.
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-white">
        {(['RMF', 'FMEA'] as Tab[]).map((t) => (
          <button key={t} type="button" className={tabClass(t)} onClick={() => setActiveTab(t)}>
            {t === 'RMF' ? '📋 RMF — Risk Management File' : '🔬 FMEA — Product Risk Analysis'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="p-4">
        {/* Intercept nr-cell click for AI row selection */}
        <div
          onClick={(e) => {
            const td = (e.target as HTMLElement).closest('td');
            if (!td) return;
            const tr = td.closest('tr');
            if (!tr) return;
            const nrTd = tr.querySelector('td:first-child');
            if (nrTd !== td) return;
            // Find the row key from the parent table row index
            const tbody = tr.closest('tbody');
            if (!tbody) return;
            const allTrs = Array.from(tbody.querySelectorAll('tr'));
            const idx = allTrs.indexOf(tr as HTMLTableRowElement);
            if (activeTab === 'RMF' && rmfRows[idx]) selectRowForAi(rmfRows[idx]._key);
            else if (activeTab === 'FMEA' && fmeaRows[idx]) selectRowForAi(fmeaRows[idx]._key);
          }}
        >
          {activeTab === 'RMF' ? (
            <RmfTemplateTable
              rows={rmfRows}
              canEdit={canEdit}
              aiHighlightKey={aiHighlightKey}
              linkedHighlightKey={linkedRmfRowKey}
              onChange={setRmfRows}
            />
          ) : (
            <FmeaTemplateTable
              rows={fmeaRows}
              canEdit={canEdit}
              aiHighlightKey={aiHighlightKey}
              linkedHighlightKey={linkedFmeaRowKey}
              onChange={setFmeaRows}
            />
          )}
        </div>

        {/* Reference image thumbnails */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <figure className="rounded-xl overflow-hidden border border-neutral-200">
            <img
              src="/images/risk/table1-riskmanagement-file.jpg"
              alt="Reference: Table 1 — Risk Management File"
              className="w-full h-auto opacity-60 hover:opacity-100 transition cursor-zoom-in"
              title="Reference image: Table 1 — Risk Management File"
            />
            <figcaption className="px-2 py-1 text-[10px] text-neutral-500 bg-neutral-50 flex items-center justify-between gap-2">
              <span>Reference: Table 1 — Risk Management File</span>
              <button
                type="button"
                title="Show Table 1 information"
                aria-label="Show Table 1 information"
                onClick={() => setInfoDialog('table1')}
                className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white p-1 text-neutral-500 hover:text-blue-700 hover:border-blue-300 transition"
              >
                <LuInfo className="h-3.5 w-3.5" />
              </button>
            </figcaption>
          </figure>
          <figure className="rounded-xl overflow-hidden border border-neutral-200">
            <img
              src="/images/risk/table2-product-risks-documentation.jpg"
              alt="Reference: Table 2 — Product Risks Documentation"
              className="w-full h-auto opacity-60 hover:opacity-100 transition cursor-zoom-in"
              title="Reference image: Table 2 — Product Risks Documentation"
            />
            <figcaption className="px-2 py-1 text-[10px] text-neutral-500 bg-neutral-50 flex items-center justify-between gap-2">
              <span>Reference: Table 2 — Product-Specific Risk Documentation</span>
              <button
                type="button"
                title="Show Table 2 information"
                aria-label="Show Table 2 information"
                onClick={() => setInfoDialog('table2')}
                className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white p-1 text-neutral-500 hover:text-blue-700 hover:border-blue-300 transition"
              >
                <LuInfo className="h-3.5 w-3.5" />
              </button>
            </figcaption>
          </figure>
        </div>
      </div>

      {infoDialog ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setInfoDialog(null)}>
          <article
            className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-700">
                {infoDialog === 'table2' ? 'Table 2 — Product FMEA Example' : 'Table 1 — Risk Management File Reference'}
              </h3>
              <button
                type="button"
                onClick={() => setInfoDialog(null)}
                className="rounded-full border border-neutral-200 p-1 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
                aria-label="Close information dialog"
              >
                <LuX className="h-4 w-4" />
              </button>
            </header>

            <div className="p-4 space-y-4 text-sm text-neutral-700">
              {infoDialog === 'table2' ? (
                <>
                  <p className="font-semibold">Table 2 shows a product FMEA example</p>

                  <section>
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">General links</h4>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      <li><a href="https://www.youtube.com/watch?v=THO9syzEVYk" target="_blank" rel="noreferrer" className="text-blue-700 underline">https://www.youtube.com/watch?v=THO9syzEVYk</a></li>
                      <li><a href="https://quality-one.com/fmea/" target="_blank" rel="noreferrer" className="text-blue-700 underline">https://quality-one.com/fmea/</a></li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">Detailed information</h4>

                    <p className="mt-2"><strong>What is it?</strong><br />
                      A Failure Mode and Effects Analysis (FMEA) file is structured as a hierarchical spreadsheet or database, designed to analyze potential failures from left to right. According to the harmonized AIAG/VDA FMEA standard, the structure typically follows a 7-step process that links structure, function, and failure.
                    </p>

                    <p className="mt-3"><strong>What are core FMEA File Components?</strong></p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li><strong>Header Information:</strong> Project scope, part/process name, team members, and responsibility.</li>
                      <li><strong>Structural Analysis (System/Process Elements):</strong> Identifies the system, subsystems, or process steps.</li>
                      <li><strong>Functional Analysis:</strong> Defines what the product or process is supposed to do (Function), the ways it can fail (Failure Mode), the consequences (Effects), and the root causes.</li>
                      <li><strong>Risk Analysis (Evaluation):</strong> Ranks the risks using:
                        <ul className="mt-1 list-disc pl-5 space-y-1">
                          <li><strong>Severity (S):</strong> How serious the effect is.</li>
                          <li><strong>Occurrence (O):</strong> How often the cause happens.</li>
                          <li><strong>Detection (D):</strong> How well current controls detect the failure.</li>
                          <li><strong>AP/RPN:</strong> Action Priority or Risk Priority Number (S x O x D).</li>
                        </ul>
                      </li>
                      <li><strong>Optimization/Action Plan:</strong> Recommended actions, responsible person, status, and target date.</li>
                    </ul>

                    <p className="mt-3"><strong>What are typical file columns?</strong></p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li><strong>Item/Process Step:</strong> The component or process step.</li>
                      <li><strong>Function:</strong> The function of the item/step.</li>
                      <li><strong>Potential Failure Mode:</strong> How it could fail.</li>
                      <li><strong>Potential Effect(s) of Failure:</strong> The result of the failure on the system/customer.</li>
                      <li><strong>Severity (S):</strong> Ranking (1-10).</li>
                      <li><strong>Potential Cause(s) of Failure:</strong> What causes the failure mode.</li>
                      <li><strong>Occurrence (O):</strong> Likelihood of occurrence (1-10).</li>
                      <li><strong>Current Prevention/Detection Controls:</strong> Existing controls.</li>
                      <li><strong>Detection (D):</strong> Likelihood of detection (1-10).</li>
                      <li><strong>Action Priority (AP) or RPN:</strong> Risk score.</li>
                      <li><strong>Recommended Action(s) &amp; Responsibility:</strong> Actions to reduce risk.</li>
                    </ul>

                    <p className="mt-3"><strong>What is its structural hierarchy (One-to-Many Relationships)?</strong></p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li><strong>One Component:</strong> Can have Multiple Functions.</li>
                      <li><strong>One Function:</strong> Can have Multiple Failure Modes.</li>
                      <li><strong>One Failure Mode:</strong> Can have Multiple Effects AND Multiple Causes.</li>
                      <li><strong>One Cause:</strong> Can have Multiple Controls/Actions.</li>
                    </ul>
                    <p className="mt-2">In software, this is often displayed as a hierarchical &ldquo;tree&rdquo; structure:<br />
                      <strong>Item -&gt; Function -&gt; Failure Mode -&gt; Effect/Cause</strong>
                    </p>

                    <p className="mt-3"><strong>Are there different types of FMEA Structures?</strong></p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li><strong>Design FMEA (DFMEA):</strong> Focuses on design, assemblies, and components.</li>
                      <li><strong>Process FMEA (PFMEA):</strong> Focuses on process steps, manufacturing, or assembly, usually following a Process Flow Diagram.</li>
                    </ul>
                  </section>
                </>
              ) : (
                <>
                  <p className="font-semibold">Table 1 shows a product RMF example.</p>

                  <section>
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">General links (medical domain)</h4>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      <li><a href="https://www.achievexl.com/blog/risk-management-file-structure-made-easy" target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">https://www.achievexl.com/blog/risk-management-file-structure-made-easy</a></li>
                      <li>German: <a href="https://www.johner-institut.de/blog/iso-14971-risikomanagement/risikomanagementplan/" target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">https://www.johner-institut.de/blog/iso-14971-risikomanagement/risikomanagementplan/</a></li>
                    </ul>
                  </section>

                  <section>
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">Detailed information</h4>

                    <p className="mt-2"><strong>What is it?</strong><br />
                      A <strong>Risk Management File (RMF)</strong> structure is a centralized repository—often a folder system or a
                      database—containing documentation that proves risks are identified, analyzed, and controlled throughout a product&apos;s
                      lifecycle. It typically includes a risk management plan, risk analysis, evaluation, control, and final reporting,
                      usually compliant with standards like <strong>ISO 14971</strong>.
                    </p>

                    <p className="mt-3"><strong>What are core components of a Risk Management File structure?</strong><br />
                      A robust risk management file typically includes the following documentation, organized in a centralized location:
                    </p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li><strong>Risk Management Plan (RMP):</strong> Defines the roles, responsibilities, risk acceptability criteria, and scope of activities.</li>
                      <li><strong>Risk Assessment/Analysis Records:</strong> Documents identification, probability, and severity of potential hazards.</li>
                      <li><strong>Risk Control/Mitigation Report:</strong> Tracks measures taken to reduce risks, including verification of those measures.</li>
                      <li><strong>Risk Management Report:</strong> A final report summarizing the overall risk posture and concluding if the risk is acceptable.</li>
                      <li><strong>Risk Register/Log:</strong> A live spreadsheet or database listing every risk, its owner, severity, mitigation actions, and status (e.g., open, closed).</li>
                      <li><strong>Production/Post-Production Data:</strong> Data gathered after the product is on the market to update the risk profile.</li>
                    </ul>

                    <p className="mt-3"><strong>What is the typical file hierarchy structure?</strong><br />
                      A well-organized digital file structure looks like this:
                    </p>
                    <pre className="mt-2 text-[11px] bg-neutral-50 border border-neutral-200 rounded-xl p-3 overflow-x-auto whitespace-pre">{`/00_Risk_Management_File_Main_Document
/01_Risk_Management_Plan
/02_Risk_Analysis_Datasets
    /Hazard_Identification
    /Risk_Evaluation_Matrices
/03_Risk_Control_Documentation
    /Mitigation_Plans
    /Verification_Records
/04_Risk_Management_Reports
/05_Post_Market_Surveillance_Data
/06_Related_Documents_and_References`}</pre>

                    <p className="mt-3"><strong>What are the Risk Register Components?</strong><br />
                      The core of the RMF is the risk register, which often contains:
                    </p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li><strong>Risk ID &amp; Date Raised:</strong> Unique identifier.</li>
                      <li><strong>Risk Description:</strong> &ldquo;If&hellip; then&rdquo; format.</li>
                      <li><strong>Likelihood &amp; Severity:</strong> Pre- and post-mitigation scores.</li>
                      <li><strong>Risk Owner &amp; Response Plan:</strong> Who is responsible and how to mitigate (transfer, accept, mitigate, avoid).</li>
                      <li><strong>Status &amp; Review Date:</strong> Open/closed and upcoming review date.</li>
                    </ul>
                    <p className="mt-2 text-xs text-neutral-500">
                      This structured approach ensures compliance, accountability, and traceability.
                    </p>
                  </section>
                </>
              )}
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
};

export default RiskTemplateEditor;
