// Observability Client - API client for system observability metrics

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

export async function fetchQualityAspects(): Promise<any[]> {
  return Promise.resolve([]);
}

export async function fetchQualitySummary(windowHours: number = 24): Promise<QualitySummary | null> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
  return Promise.resolve({
    aspectId: 'overall',
    signalCount: 0,
    healthScore: 100,
    trend: 'stable',
    aspects: [],
    total_observations: 0,
    p95_latency_ms: null,
    hallucination_reports: 0,
    window_start: yesterday.toISOString(),
    window_end: now.toISOString(),
  });
}

export async function fetchLlmPromptOutputPairs(limit: number = 15, windowHours: number = 24): Promise<{ items: LlmPromptOutputPair[] }> {
  void limit;
  void windowHours;
  return Promise.resolve({ items: [] });
}

export async function fetchMetricsSnapshot(windowHours: number = 24): Promise<MetricsSnapshot | null> {
  void windowHours;
  return Promise.resolve({
    id: 'metrics_1',
    timestamp: new Date().toISOString(),
    cpu: 45,
    memory: 62,
    latency: 120,
    httpRequestsTotal: 1250,
    hallucinationReportsTotal: 3,
    aiEvaluationsTotal: 890,
  });
}

export async function fetchWorkflowComponentBreakdown(windowHours: number = 24): Promise<WorkflowComponentBreakdown | null> {
  const now = new Date();
  const start = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
  return Promise.resolve({
    window_start: start.toISOString(),
    window_end: now.toISOString(),
    total_observations: 0,
    components: [],
  });
}
