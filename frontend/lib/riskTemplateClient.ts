import { isDemoMode } from './appMode';

type TemplateType = 'RMF' | 'FMEA';

type ApiResult<T> = {
  ok: boolean;
  message: string;
  data?: T;
  degradedToDemo?: boolean;
};

export interface RiskTemplateRow {
  row_id: string;
  template_id: string;
  row_order: number;
  row_data: Record<string, unknown>;
  created_at: string;
}

export interface RiskTemplate {
  template_id: string;
  template_type: TemplateType;
  template_title: string;
  product: string;
  version: string;
  status: string;
  created_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  rows: RiskTemplateRow[];
}

export const DEFAULT_TEMPLATE_TITLES: Record<TemplateType, string> = {
  RMF: 'Risk Management File',
  FMEA: 'FMEA - Product Risk Documentation',
};

interface BackendTemplateSummary {
  template_id: string;
  template_type: TemplateType;
  template_title: string;
  product: string;
  version: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  row_count: number;
}

interface BackendTemplateList {
  items?: BackendTemplateSummary[];
  total?: number;
}

interface BackendTemplateRow {
  row_id: string;
  template_id: string;
  row_order: number;
  row_data: Record<string, unknown>;
  created_at: string;
}

interface BackendTemplate {
  template_id: string;
  template_type: TemplateType;
  template_title: string;
  product: string;
  version?: string;
  status?: string;
  created_by: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  rows?: BackendTemplateRow[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}`;
}

function toRows(templateId: string, rows: Record<string, unknown>[]): RiskTemplateRow[] {
  const createdAt = nowIso();
  return rows.map((row, index) => ({
    row_id: `${templateId}-row-${index + 1}`,
    template_id: templateId,
    row_order: index,
    row_data: row,
    created_at: createdAt,
  }));
}

function cloneTemplate(template: RiskTemplate): RiskTemplate {
  return {
    ...template,
    metadata: { ...template.metadata },
    rows: template.rows.map((row) => ({ ...row, row_data: { ...row.row_data } })),
  };
}

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN?.trim() || '';
}

function buildApiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { detail?: string; error?: { message?: string } };
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore parse errors and use fallback.
  }
  return response.statusText || fallback;
}

function normalizeFullTemplate(raw: BackendTemplate): RiskTemplate {
  return {
    template_id: raw.template_id,
    template_type: raw.template_type,
    template_title: raw.template_title,
    product: raw.product,
    version: raw.version || '1.0.0',
    status: raw.status || 'Draft',
    created_by: raw.created_by,
    metadata: { ...(raw.metadata || {}) },
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    rows: (raw.rows || []).map((row) => ({
      row_id: row.row_id,
      template_id: row.template_id,
      row_order: row.row_order,
      row_data: { ...(row.row_data || {}) },
      created_at: row.created_at,
    })),
  };
}

function normalizeSummaryTemplate(raw: BackendTemplateSummary): RiskTemplate {
  return {
    template_id: raw.template_id,
    template_type: raw.template_type,
    template_title: raw.template_title,
    product: raw.product,
    version: raw.version || '1.0.0',
    status: raw.status || 'Draft',
    created_by: raw.created_by,
    metadata: {},
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    rows: [],
  };
}

const demoStore = new Map<string, RiskTemplate>();

function demoEnsureDefaultTemplate(payload: {
  template_type: TemplateType;
  template_title: string;
  product: string;
  created_by: string;
  rows: Record<string, unknown>[];
}): ApiResult<RiskTemplate> {
  const key = `default:${payload.template_type}:${payload.product}`;
  const existing = demoStore.get(key);
  if (existing) {
    return { ok: true, message: 'Default template already exists.', data: cloneTemplate(existing), degradedToDemo: true };
  }

  const templateId = newId('risk_tpl_default');
  const template: RiskTemplate = {
    template_id: templateId,
    template_type: payload.template_type,
    template_title: payload.template_title,
    product: payload.product,
    version: '1.0.0',
    status: 'Draft',
    created_by: payload.created_by,
    metadata: { isDefault: true },
    created_at: nowIso(),
    updated_at: nowIso(),
    rows: toRows(templateId, payload.rows),
  };

  demoStore.set(key, template);
  return { ok: true, message: 'Default template seeded.', data: cloneTemplate(template), degradedToDemo: true };
}

export async function ensureDefaultRiskTemplate(payload: {
  template_type: TemplateType;
  template_title: string;
  product: string;
  created_by: string;
  rows: Record<string, unknown>[];
}): Promise<ApiResult<RiskTemplate>> {
  if (isDemoMode()) {
    return demoEnsureDefaultTemplate(payload);
  }

  const endpoint = buildApiUrl(`/api/v1/risk-templates/defaults/${payload.template_type}`);
  const response = await fetch(endpoint, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: payload.product,
      created_by: payload.created_by,
    }),
  });

  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response, 'Failed to ensure default risk template.') };
  }

  const data = normalizeFullTemplate(await response.json() as BackendTemplate);
  return { ok: true, message: 'Default template loaded.', data };
}

export async function getDefaultRiskTemplate(payload: {
  template_type: TemplateType;
  product: string;
}): Promise<ApiResult<RiskTemplate>> {
  if (isDemoMode()) {
    const key = `default:${payload.template_type}:${payload.product}`;
    const existing = demoStore.get(key);
    if (!existing) {
      return { ok: false, message: 'Default template not found.', degradedToDemo: true };
    }
    return { ok: true, message: 'Default template loaded.', data: cloneTemplate(existing), degradedToDemo: true };
  }

  const query = new URLSearchParams({ product: payload.product });
  const endpoint = buildApiUrl(`/api/v1/risk-templates/defaults/${payload.template_type}?${query.toString()}`);
  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response, 'Failed to load default risk template.') };
  }

  const data = normalizeFullTemplate(await response.json() as BackendTemplate);
  return { ok: true, message: 'Default template loaded.', data };
}

export async function listRiskTemplates(payload?: {
  template_type?: TemplateType;
  product?: string;
}): Promise<ApiResult<RiskTemplate[]>> {
  if (isDemoMode()) {
    let list = Array.from(demoStore.values());
    if (payload?.template_type) {
      list = list.filter((tpl) => tpl.template_type === payload.template_type);
    }
    if (payload?.product) {
      list = list.filter((tpl) => tpl.product === payload.product);
    }
    return { ok: true, message: 'Templates loaded.', data: list.map(cloneTemplate), degradedToDemo: true };
  }

  const query = new URLSearchParams();
  if (payload?.template_type) {
    query.set('template_type', payload.template_type);
  }
  if (payload?.product) {
    query.set('product', payload.product);
  }
  const endpoint = buildApiUrl(`/api/v1/risk-templates${query.toString() ? `?${query.toString()}` : ''}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response, 'Failed to list risk templates.') };
  }

  const payloadList = await response.json() as BackendTemplateList;
  const data = (payloadList.items || []).map(normalizeSummaryTemplate);
  return { ok: true, message: 'Templates loaded.', data };
}

export async function getRiskTemplate(templateId: string): Promise<ApiResult<RiskTemplate>> {
  if (isDemoMode()) {
    const found = Array.from(demoStore.values()).find((tpl) => tpl.template_id === templateId);
    if (!found) {
      return { ok: false, message: 'Template not found.', degradedToDemo: true };
    }
    return { ok: true, message: 'Template loaded.', data: cloneTemplate(found), degradedToDemo: true };
  }

  const endpoint = buildApiUrl(`/api/v1/risk-templates/${encodeURIComponent(templateId)}`);
  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response, 'Failed to load risk template.') };
  }

  const data = normalizeFullTemplate(await response.json() as BackendTemplate);
  return { ok: true, message: 'Template loaded.', data };
}

export async function createRiskTemplate(payload: {
  template_type: TemplateType;
  template_title: string;
  product: string;
  created_by: string;
  rationale?: string;
  rows: Record<string, unknown>[];
}): Promise<ApiResult<RiskTemplate>> {
  if (isDemoMode()) {
    const templateId = newId('risk_tpl');
    const template: RiskTemplate = {
      template_id: templateId,
      template_type: payload.template_type,
      template_title: payload.template_title,
      product: payload.product,
      version: '1.0.0',
      status: 'Draft',
      created_by: payload.created_by,
      metadata: { rationale: payload.rationale },
      created_at: nowIso(),
      updated_at: nowIso(),
      rows: toRows(templateId, payload.rows),
    };

    demoStore.set(templateId, template);
    return { ok: true, message: 'Template created.', data: cloneTemplate(template), degradedToDemo: true };
  }

  const endpoint = buildApiUrl('/api/v1/risk-templates');
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response, 'Failed to create risk template.') };
  }

  const data = normalizeFullTemplate(await response.json() as BackendTemplate);
  return { ok: true, message: 'Template created.', data };
}

export async function updateRiskTemplate(
  templateId: string,
  patch: { rows?: Record<string, unknown>[] },
): Promise<ApiResult<RiskTemplate>> {
  if (isDemoMode()) {
    const existing = Array.from(demoStore.values()).find((tpl) => tpl.template_id === templateId);
    if (!existing) {
      return { ok: false, message: 'Template not found.', degradedToDemo: true };
    }

    const updated: RiskTemplate = {
      ...existing,
      updated_at: nowIso(),
      rows: patch.rows ? toRows(existing.template_id, patch.rows) : existing.rows,
    };

    const key = Array.from(demoStore.entries()).find(([, tpl]) => tpl.template_id === templateId)?.[0] || templateId;
    demoStore.set(key, updated);
    return { ok: true, message: 'Template updated.', data: cloneTemplate(updated), degradedToDemo: true };
  }

  const endpoint = buildApiUrl(`/api/v1/risk-templates/${encodeURIComponent(templateId)}`);
  const response = await fetch(endpoint, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: patch.rows }),
  });

  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response, 'Failed to update risk template.') };
  }

  const data = normalizeFullTemplate(await response.json() as BackendTemplate);
  return { ok: true, message: 'Template updated.', data };
}

export async function aiSuggestRiskRow(payload: {
  template_type: TemplateType;
  partial_row: Record<string, unknown>;
  context?: string;
}): Promise<ApiResult<{ suggestions: Record<string, unknown>; explanation: string }>> {
  if (isDemoMode()) {
    return {
      ok: true,
      message: 'AI suggestion generated (demo).',
      data: {
        suggestions: {
          notes: 'Suggested by demo AI assist. Review before saving.',
        },
        explanation: 'Demo suggestion generated from current row context.',
      },
      degradedToDemo: true,
    };
  }

  const endpoint = buildApiUrl('/api/v1/risk-templates/ai-suggest');
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await parseErrorMessage(response, 'AI suggestion failed.') };
  }

  const data = await response.json() as { suggestions: Record<string, unknown>; explanation: string };
  return {
    ok: true,
    message: 'AI suggestion generated.',
    data,
  };
}

export function downloadTemplateCsv(template: RiskTemplate): void {
  const headers = new Set<string>();
  template.rows.forEach((row) => Object.keys(row.row_data || {}).forEach((k) => headers.add(k)));
  const columns = Array.from(headers);
  const lines = [columns.join(',')];

  template.rows.forEach((row) => {
    const values = columns.map((column) => {
      const value = row.row_data[column];
      const text = value == null ? '' : String(value);
      return `"${text.replaceAll('"', '""')}"`;
    });
    lines.push(values.join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${template.template_type.toLowerCase()}-template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function pushTemplateToRemote(
  template: RiskTemplate,
  remoteUrl: string,
): Promise<{ ok: boolean; message: string }> {
  if (!remoteUrl) {
    return { ok: false, message: 'Remote URL is required.' };
  }

  try {
    await fetch(remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    return { ok: true, message: 'Template pushed to remote endpoint.' };
  } catch (error) {
    return {
      ok: false,
      message: `Remote push failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
