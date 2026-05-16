// Admin Observability ViewModel - Models for observability dashboard

export interface ObservabilityAspect {
  id: string;
  name: string;
  description: string;
  kpis: any[];
}

export const OBSERVABILITY_ASPECTS: ObservabilityAspect[] = [
  { id: 'asp_1', name: 'System Performance', description: 'CPU, memory, latency metrics', kpis: [] },
  { id: 'asp_2', name: 'Availability', description: 'Uptime and SLA metrics', kpis: [] },
  { id: 'asp_3', name: 'Security', description: 'Security incidents and breach detection', kpis: [] },
];

export const OBSERVABILITY_WINDOWS = [
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
];

export function createMockQualitySummary(windowHours: number = 24): any {
  const now = new Date();
  const yesterday = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
  return {
    aspectId: 'asp_1',
    signalCount: 42,
    healthScore: 87,
    trend: 'improving',
    aspects: [],
    total_observations: 1250,
    p95_latency_ms: 145,
    hallucination_reports: 3,
    window_start: yesterday.toISOString(),
    window_end: now.toISOString(),
  };
}

export function createMockMetrics(_windowHours: number = 24): any {
  return {
    id: 'metrics_1',
    timestamp: new Date().toISOString(),
    cpu: 65,
    memory: 78,
    latency: 120,
  };
}

export function createMockPromptPairs(): any[] {
  return [
    {
      id: 'pair_1',
      prompt: 'What is the security policy?',
      output: 'The security policy is...',
      timestamp: new Date().toISOString(),
      event_time: new Date().toISOString(),
      source_component: 'auth',
      provider: 'OpenAI',
      model_used: 'gpt-4',
      rich_payload: {},
    },
  ];
}

export function createMockWorkflowBreakdown(_windowHours: number = 24): any {
  return {
    components: [
      {
        source_component: 'auth',
        total: 450,
        pass_count: 440,
        warn_count: 8,
        fail_count: 2,
        info_count: 0,
        average_latency_ms: 25,
        latest_event_time: new Date().toISOString(),
      },
      {
        source_component: 'validation',
        total: 420,
        pass_count: 415,
        warn_count: 4,
        fail_count: 1,
        info_count: 0,
        average_latency_ms: 15,
        latest_event_time: new Date().toISOString(),
      },
    ],
  };
}

export function getObservabilityScorePct(summary: { healthScore?: number } | number | null = 87): string {
  const score = typeof summary === 'number' ? summary : summary?.healthScore ?? 0;
  return `${score}%`;
}

export function buildPromptPairsCsv(pairs: any[]): string {
  return pairs.map((p) => `"${p.prompt}","${p.output}"`).join('\n');
}
