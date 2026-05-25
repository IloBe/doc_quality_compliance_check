// Observability Client - API client for system observability metrics

type QualitySummaryApi = {
  window_start: string;
  window_end: string;
  total_observations: number;
  hallucination_reports: number;
  average_score: number | null;
  p95_latency_ms: number | null;
  aspects: QualityAspectRow[];
};

type LlmPromptOutputPairApi = {
  event_time: string;
  source_component: string;
  provider?: string | null;
  model_used?: string | null;
  prompt: string;
  output: string;
  rich_payload?: Record<string, unknown>;
};

type LlmPromptOutputPairsResponse = {
  items: LlmPromptOutputPairApi[];
};

type WorkflowComponentBreakdownApi = {
  window_start: string;
  window_end: string;
  total_observations: number;
  components: WorkflowComponent[];
};

export interface QualityAspectRow {
  aspect: string;
  total: number;
  pass_count: number;
  warn_count: number;
  fail_count: number;
  average_score: number | null;
  average_latency_ms: number | null;
}

export interface QualitySummary {
  aspectId: string;
  signalCount: number;
  healthScore: number;
  trend?: string;
  aspects: QualityAspectRow[];
  total_observations?: number;
  p95_latency_ms?: number | null;
  hallucination_reports?: number;
  window_start: string;
  window_end: string;
}

export interface LlmPromptOutputPair {
  id: string;
  prompt: string;
  output: string;
  timestamp: string;
  event_time: string;
  source_component: string;
  provider?: string;
  model_used?: string;
  rich_payload?: Record<string, any>;
}

export interface MetricsSnapshot {
  id?: string;
  timestamp?: string;
  cpu?: number;
  memory?: number;
  latency?: number;
  httpRequestsTotal?: number | null;
  hallucinationReportsTotal?: number | null;
  aiEvaluationsTotal?: number | null;
}

export interface WorkflowComponentBreakdown {
  window_start?: string;
  window_end?: string;
  total_observations?: number;
  components: WorkflowComponent[];
}

export interface WorkflowComponent {
  source_component: string;
  total: number;
  pass_count: number;
  warn_count: number;
  fail_count: number;
  info_count: number;
  average_latency_ms: number | null;
  latest_event_time: string | null;
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
    const payload = await response.json() as { detail?: string };
    if (typeof payload?.detail === 'string' && payload.detail.trim().length > 0) {
      return payload.detail;
    }
  } catch {
    // Ignore JSON parse errors and fall back to status text.
  }
  return response.statusText || fallback;
}

function buildHealthOrigin(): string {
  const healthOrigin = process.env.NEXT_PUBLIC_HEALTH_ORIGIN?.trim();
  if (healthOrigin) {
    return healthOrigin;
  }
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  return apiOrigin || 'http://127.0.0.1:8000';
}

function toHealthScore(averageScore: number | null | undefined): number {
  if (typeof averageScore !== 'number' || Number.isNaN(averageScore)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(averageScore * 100)));
}

function metricValueFromText(metricsText: string, metricName: string): number | null {
  const escapedMetricName = metricName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedMetricName}\\s+([0-9]+(?:\\.[0-9]+)?)$`, 'm');
  const match = metricsText.match(regex);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchQualityAspects(): Promise<QualityAspectRow[]> {
  const summary = await fetchQualitySummary(24);
  return summary.aspects;
}

export async function fetchQualitySummary(windowHours: number = 24): Promise<QualitySummary> {
  const url = buildApiUrl(`/api/v1/observability/quality-summary?window_hours=${windowHours}`);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to load quality summary.');
    throw new Error(`Failed to load quality summary: ${detail}`);
  }

  const payload = await response.json() as QualitySummaryApi;
  return {
    aspectId: 'overall',
    signalCount: payload.total_observations,
    healthScore: toHealthScore(payload.average_score),
    trend: 'stable',
    aspects: Array.isArray(payload.aspects) ? payload.aspects : [],
    total_observations: payload.total_observations,
    p95_latency_ms: payload.p95_latency_ms,
    hallucination_reports: payload.hallucination_reports,
    window_start: payload.window_start,
    window_end: payload.window_end,
  };
}

export async function fetchLlmPromptOutputPairs(limit: number = 15, windowHours: number = 24): Promise<{ items: LlmPromptOutputPair[] }> {
  const url = buildApiUrl(`/api/v1/observability/llm-traces?limit=${limit}&window_hours=${windowHours}`);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to load LLM prompt/output traces.');
    throw new Error(`Failed to load LLM prompt/output traces: ${detail}`);
  }

  const payload = await response.json() as LlmPromptOutputPairsResponse;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    items: items.map((item, index) => ({
      id: `${item.event_time}-${item.source_component}-${index}`,
      prompt: item.prompt,
      output: item.output,
      timestamp: item.event_time,
      event_time: item.event_time,
      source_component: item.source_component,
      provider: item.provider || undefined,
      model_used: item.model_used || undefined,
      rich_payload: item.rich_payload || {},
    })),
  };
}

export async function fetchMetricsSnapshot(_windowHours: number = 24): Promise<MetricsSnapshot | null> {
  const proxiedMetricsUrl = '/metrics';
  const directMetricsUrl = `${buildHealthOrigin()}/metrics`;
  const isDirectRequired = Boolean(process.env.NEXT_PUBLIC_API_ORIGIN?.trim());
  const requestUrl = isDirectRequired ? directMetricsUrl : proxiedMetricsUrl;

  const response = await fetch(requestUrl, {
    method: 'GET',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to load Prometheus metrics snapshot.');
    throw new Error(`Failed to load Prometheus metrics snapshot: ${detail}`);
  }

  const metricsText = await response.text();
  return {
    timestamp: new Date().toISOString(),
    httpRequestsTotal: metricValueFromText(metricsText, 'dq_http_requests_total'),
    hallucinationReportsTotal: metricValueFromText(metricsText, 'dq_ai_hallucination_reports_total'),
    aiEvaluationsTotal: metricValueFromText(metricsText, 'dq_ai_evaluations_total'),
  };
}

export async function fetchWorkflowComponentBreakdown(windowHours: number = 24): Promise<WorkflowComponentBreakdown> {
  const url = buildApiUrl(`/api/v1/observability/workflow-components?window_hours=${windowHours}`);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response, 'Failed to load workflow component breakdown.');
    throw new Error(`Failed to load workflow component breakdown: ${detail}`);
  }

  const payload = await response.json() as WorkflowComponentBreakdownApi;
  return {
    window_start: payload.window_start,
    window_end: payload.window_end,
    total_observations: payload.total_observations,
    components: Array.isArray(payload.components) ? payload.components : [],
  };
}
