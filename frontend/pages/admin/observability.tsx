import React, { useEffect, useMemo, useState } from 'react';
import { LuActivity, LuGauge, LuInfo, LuLoader, LuMessagesSquare, LuRefreshCw, LuTimer, LuTriangleAlert, LuWandSparkles } from 'react-icons/lu';
import WhyThisPageMatters from '../../components/WhyThisPageMatters';
import {
  fetchLlmPromptOutputPairs,
  fetchMetricsSnapshot,
  fetchQualitySummary,
  fetchWorkflowComponentBreakdown,
  LlmPromptOutputPair,
  MetricsSnapshot,
  QualitySummary,
  WorkflowComponentBreakdown,
} from '../../lib/observabilityClient';

const windows = [
  { label: '24h', value: 24 },
  { label: '7d', value: 24 * 7 },
  { label: '30d', value: 24 * 30 },
];

const AdminObservabilityPage = () => {
  const [windowHours, setWindowHours] = useState(24);
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [promptPairs, setPromptPairs] = useState<LlmPromptOutputPair[]>([]);
  const [workflowBreakdown, setWorkflowBreakdown] = useState<WorkflowComponentBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);

  // Default to demo mode — the same pattern as Dashboard.
  // Set NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend to use live DB telemetry.
  const useBackendData = process.env.NEXT_PUBLIC_OBSERVABILITY_SOURCE === 'backend';

  const mockSummary = useMemo<QualitySummary>(() => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
    const base = windowHours <= 24 ? 143 : windowHours <= 168 ? 892 : 3241;
    return {
      window_start: windowStart.toISOString(),
      window_end: now.toISOString(),
      total_observations: base,
      hallucination_reports: windowHours <= 24 ? 3 : windowHours <= 168 ? 14 : 47,
      error_observations: windowHours <= 24 ? 7 : windowHours <= 168 ? 38 : 129,
      evaluation_observations: windowHours <= 24 ? 38 : windowHours <= 168 ? 210 : 741,
      average_score: 0.81,
      p95_latency_ms: 2340,
      aspects: [
        { aspect: 'performance', total: Math.round(base * 0.33), pass_count: Math.round(base * 0.28), warn_count: Math.round(base * 0.04), fail_count: Math.round(base * 0.01), info_count: 0, average_score: 0.87, average_latency_ms: 1820 },
        { aspect: 'accuracy',    total: Math.round(base * 0.27), pass_count: Math.round(base * 0.20), warn_count: Math.round(base * 0.05), fail_count: Math.round(base * 0.02), info_count: 0, average_score: 0.79, average_latency_ms: 2210 },
        { aspect: 'evaluation',  total: Math.round(base * 0.27), pass_count: Math.round(base * 0.17), warn_count: Math.round(base * 0.07), fail_count: Math.round(base * 0.03), info_count: 0, average_score: 0.75, average_latency_ms: 2890 },
        { aspect: 'hallucination', total: Math.round(base * 0.05), pass_count: Math.round(base * 0.02), warn_count: Math.round(base * 0.02), fail_count: Math.round(base * 0.01), info_count: 0, average_score: 0.62, average_latency_ms: 1540 },
        { aspect: 'error',       total: Math.round(base * 0.08), pass_count: 0,                       warn_count: Math.round(base * 0.03), fail_count: Math.round(base * 0.05), info_count: 0, average_score: null,  average_latency_ms: 980 },
      ],
    };
  }, [windowHours]);

  const mockMetrics = useMemo<MetricsSnapshot>(() => ({
    httpRequestsTotal:       windowHours <= 24 ? 1847  : windowHours <= 168 ? 11204 : 43891,
    hallucinationReportsTotal: windowHours <= 24 ? 3   : windowHours <= 168 ? 14    : 47,
    aiEvaluationsTotal:      windowHours <= 24 ? 143   : windowHours <= 168 ? 892   : 3241,
  }), [windowHours]);

  const mockWorkflowBreakdown = useMemo<WorkflowComponentBreakdown>(() => {
    const now = new Date();
    const base = windowHours <= 24 ? 143 : windowHours <= 168 ? 892 : 3241;
    return {
      window_start: new Date(now.getTime() - windowHours * 60 * 60 * 1000).toISOString(),
      window_end: now.toISOString(),
      total_observations: base,
      components: [
        { source_component: 'research_agent',    total: Math.round(base * 0.36), pass_count: Math.round(base * 0.31), warn_count: Math.round(base * 0.04), fail_count: Math.round(base * 0.01), info_count: 0, average_latency_ms: 1920, latest_event_time: new Date(now.getTime() - 1000 * 60 * 14).toISOString() },
        { source_component: 'document_analyzer', total: Math.round(base * 0.34), pass_count: Math.round(base * 0.28), warn_count: Math.round(base * 0.04), fail_count: Math.round(base * 0.02), info_count: 0, average_latency_ms: 2240, latest_event_time: new Date(now.getTime() - 1000 * 60 * 37).toISOString() },
        { source_component: 'compliance_checker', total: Math.round(base * 0.30), pass_count: Math.round(base * 0.18), warn_count: Math.round(base * 0.07), fail_count: Math.round(base * 0.05), info_count: 0, average_latency_ms: 2980, latest_event_time: new Date(now.getTime() - 1000 * 60 * 52).toISOString() },
      ],
    };
  }, [windowHours]);

  const mockPromptPairs = useMemo<LlmPromptOutputPair[]>(() => [
    {
      event_time: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      source_component: 'research_agent',
      provider: 'anthropic',
      model_used: 'claude-3-5-sonnet-20241022',
      prompt: 'Analyse the following SOP document for completeness and regulatory alignment with EU AI Act Art. 9 (Risk Management):\n\n[SOP-2024-0042: Pre-market Risk Validation — Medical Imaging Software]\n\nSection 1 covers system purpose and scope. Section 2 defines acceptance criteria referencing IEC 62304. Section 3 describes residual risk treatment without citing ISO 14971 thresholds.',
      output: 'The document provides a clear scope definition in Section 1. However, Section 3 (Residual Risk Acceptance Criteria) does not reference ISO 14971:2019 thresholds. Recommend adding a clause linking residual risk acceptance to the Clinical Evaluation Report. Completeness score: 0.82.',
      trace_id: 'trc-7f3a2c91-e1b4-4d08-9a5e-b82c3f0e1234',
      correlation_id: 'cor-arc42-2024-0042',
      subject_type: 'document',
      subject_id: 'SOP-2024-0042',
      rich_payload: { tokens_used: 1843, finish_reason: 'stop', temperature: 0.2, evaluation_aspect: 'performance', latency_ms: 1872, hallucination_flag: false },
    },
    {
      event_time: new Date(Date.now() - 1000 * 60 * 37).toISOString(),
      source_component: 'document_analyzer',
      provider: 'openai',
      model_used: 'gpt-4o-2024-08-06',
      prompt: 'Review this arc42 Architecture Document for clarity and technical accuracy. Focus on sections 5 (Building Block View) and 6 (Runtime View):\n\n[ARC42-2024-0017: AI-assisted Triage Decision Support System]\n\nSection 5 defines 7 building blocks. Section 6 has 3 runtime scenarios but omits failure paths.',
      output: 'Building Block View (Section 5) is complete and clearly structured. Runtime View (Section 6) lacks error-path scenarios for model inference timeout. Recommended: add at least one failure sequence diagram. Clarity score: 0.78. Accuracy: 0.85.',
      trace_id: 'trc-4a8c1e02-93d7-41bc-b3f0-7c90d2e45678',
      correlation_id: 'cor-arc42-2024-0017',
      subject_type: 'document',
      subject_id: 'ARC42-2024-0017',
      rich_payload: { tokens_used: 2197, finish_reason: 'stop', temperature: 0.1, evaluation_aspect: 'accuracy', latency_ms: 2341, hallucination_flag: false },
    },
    {
      event_time: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
      source_component: 'compliance_checker',
      provider: 'anthropic',
      model_used: 'claude-3-5-sonnet-20241022',
      prompt: 'Check the following FMEA document against ISO 14971:2019 and EU AI Act Annex IV requirements:\n\n[FMEA-2024-0008: Failure Mode Analysis for Automated Dose Calculation Module]\n\nRisk items 3, 7, and 11 are listed with severity ratings but without mitigation measures or clinical hazard IDs.',
      output: '⚠ WARNING: Risk items 3, 7, and 11 lack documented mitigation measures and do not reference the associated clinical hazard IDs. ISO 14971 Clause 5.4 (Risk Control) appears unaddressed for these items. Regulatory alignment score: 0.67. Recommend escalation to QM lead before release.',
      trace_id: 'trc-b2d9f441-07a3-4e51-c8b1-93e04c1a7890',
      correlation_id: 'cor-fmea-2024-0008',
      subject_type: 'document',
      subject_id: 'FMEA-2024-0008',
      rich_payload: { tokens_used: 2856, finish_reason: 'stop', temperature: 0.15, evaluation_aspect: 'evaluation', latency_ms: 2987, hallucination_flag: false, risk_items_flagged: [3, 7, 11], severity_estimate: 'high' },
    },
  ], []);

  const load = async () => {
    setIsLoading(true);
    setError(null);

    if (!useBackendData) {
      setSummary(mockSummary);
      setMetrics(mockMetrics);
      setPromptPairs(mockPromptPairs);
      setWorkflowBreakdown(mockWorkflowBreakdown);
      setIsLoading(false);
      return;
    }

    try {
      const [summaryPayload, metricsPayload, pairsPayload, workflowPayload] = await Promise.all([
        fetchQualitySummary(windowHours),
        fetchMetricsSnapshot().catch(() => ({
          httpRequestsTotal: null,
          hallucinationReportsTotal: null,
          aiEvaluationsTotal: null,
        })),
        fetchLlmPromptOutputPairs(15, windowHours).catch(() => ({ items: [] })),
        fetchWorkflowComponentBreakdown(windowHours).catch(() => ({
          window_start: new Date().toISOString(),
          window_end: new Date().toISOString(),
          total_observations: 0,
          components: [],
        })),
      ]);
      setSummary(summaryPayload);
      setMetrics(metricsPayload);
      setPromptPairs(pairsPayload.items || []);
      setWorkflowBreakdown(workflowPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load observability telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [windowHours]);

  const scorePct = useMemo(() => {
    if (!summary?.average_score && summary?.average_score !== 0) {
      return 'n/a';
    }
    return `${Math.round(summary.average_score * 100)}%`;
  }, [summary]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Admin / Observability</div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Observability</h1>
            <button
              type="button"
              onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
              title="Why this page matters"
            >
              <LuInfo className="w-4 h-4" />
            </button>
          </div>
          <p className="text-neutral-500 font-medium mt-1">Tracing and quality telemetry for technical monitoring, validation, and continuous improvement.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl p-1">
            {windows.map((option) => {
              const active = option.value === windowHours;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setWindowHours(option.value)}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide rounded-lg transition ${
                    active ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <LuRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {showWhyThisPageMatters && (
        <WhyThisPageMatters
          description="This page visualizes backend quality telemetry so engineers can detect latency regressions, track evaluation quality, monitor hallucination indicators, and correlate failures before they impact regulated production workflows."
        />
      )}

      {!useBackendData && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700 font-semibold">
          Demo mode · representative mock telemetry. Set{' '}
          <code className="font-mono bg-blue-100 px-1 rounded">NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend</code>{' '}
          to enable live data from the quality observations database.
        </div>
      )}

      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center gap-3 text-neutral-600">
          <LuLoader className="w-5 h-5 animate-spin" />
          Loading observability data...
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-700">{error}</div>
      )}

      {!isLoading && !error && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Total observations</div>
              <div className="text-3xl font-black text-neutral-900 mt-2">{summary.total_observations}</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Avg score</div>
              <div className="text-3xl font-black text-neutral-900 mt-2">{scorePct}</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="text-xs uppercase font-black tracking-widest text-neutral-400">P95 latency</div>
              <div className="text-3xl font-black text-neutral-900 mt-2">{summary.p95_latency_ms ? `${summary.p95_latency_ms} ms` : 'n/a'}</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl p-5">
              <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Hallucination reports</div>
              <div className="text-3xl font-black text-neutral-900 mt-2">{summary.hallucination_reports}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl p-5">
              <h2 className="text-lg font-black text-neutral-900 mb-4">Quality Aspect Breakdown</h2>
              {summary.aspects.length === 0 ? (
                <div className="text-sm text-neutral-500">No quality observations in this window.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-neutral-500 border-b border-neutral-200">
                        <th className="py-2 pr-3">Aspect</th>
                        <th className="py-2 pr-3">Total</th>
                        <th className="py-2 pr-3">Pass</th>
                        <th className="py-2 pr-3">Warn</th>
                        <th className="py-2 pr-3">Fail</th>
                        <th className="py-2 pr-3">Avg score</th>
                        <th className="py-2 pr-3">Avg latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.aspects.map((row) => (
                        <tr key={row.aspect} className="border-b border-neutral-100">
                          <td className="py-2 pr-3 font-semibold text-neutral-800 capitalize">{row.aspect}</td>
                          <td className="py-2 pr-3">{row.total}</td>
                          <td className="py-2 pr-3 text-emerald-700">{row.pass_count}</td>
                          <td className="py-2 pr-3 text-amber-700">{row.warn_count}</td>
                          <td className="py-2 pr-3 text-rose-700">{row.fail_count}</td>
                          <td className="py-2 pr-3">{row.average_score !== null ? `${Math.round(row.average_score * 100)}%` : 'n/a'}</td>
                          <td className="py-2 pr-3">{row.average_latency_ms !== null ? `${row.average_latency_ms} ms` : 'n/a'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5">
                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Prometheus Snapshot</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 inline-flex items-center gap-2"><LuGauge className="w-4 h-4" /> HTTP requests</span>
                    <span className="font-bold text-neutral-900">{metrics?.httpRequestsTotal ?? 'n/a'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 inline-flex items-center gap-2"><LuTriangleAlert className="w-4 h-4" /> Hallucination reports</span>
                    <span className="font-bold text-neutral-900">{metrics?.hallucinationReportsTotal ?? 'n/a'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 inline-flex items-center gap-2"><LuWandSparkles className="w-4 h-4" /> AI evaluations</span>
                    <span className="font-bold text-neutral-900">{metrics?.aiEvaluationsTotal ?? 'n/a'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-5 text-sm text-neutral-700">
                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Window details</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><LuTimer className="w-4 h-4 text-neutral-400" /> Start: {new Date(summary.window_start).toLocaleString()}</div>
                  <div className="flex items-center gap-2"><LuActivity className="w-4 h-4 text-neutral-400" /> End: {new Date(summary.window_end).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-lg font-black text-neutral-900 mb-4">Workflow Component Breakdown</h2>
            {!workflowBreakdown || workflowBreakdown.components.length === 0 ? (
              <div className="text-sm text-neutral-500">No component-level workflow telemetry in this window.</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-200">
                      <th className="py-2 pr-3">Component</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">Pass</th>
                      <th className="py-2 pr-3">Warn</th>
                      <th className="py-2 pr-3">Fail</th>
                      <th className="py-2 pr-3">Info</th>
                      <th className="py-2 pr-3">Avg latency</th>
                      <th className="py-2 pr-3">Latest event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflowBreakdown.components.map((component) => (
                      <tr key={component.source_component} className="border-b border-neutral-100">
                        <td className="py-2 pr-3 font-semibold text-neutral-800">{component.source_component}</td>
                        <td className="py-2 pr-3">{component.total}</td>
                        <td className="py-2 pr-3 text-emerald-700">{component.pass_count}</td>
                        <td className="py-2 pr-3 text-amber-700">{component.warn_count}</td>
                        <td className="py-2 pr-3 text-rose-700">{component.fail_count}</td>
                        <td className="py-2 pr-3 text-sky-700">{component.info_count}</td>
                        <td className="py-2 pr-3">{component.average_latency_ms !== null ? `${component.average_latency_ms} ms` : 'n/a'}</td>
                        <td className="py-2 pr-3">{component.latest_event_time ? new Date(component.latest_event_time).toLocaleString() : 'n/a'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-lg font-black text-neutral-900 mb-4">Recent GenAI Prompt / Output Pairs</h2>
            {promptPairs.length === 0 ? (
              <div className="text-sm text-neutral-500">No captured prompt/output pairs in this window. Pairs are listed when LLM-backed flows emit telemetry.</div>
            ) : (
              <div className="space-y-4">
                {promptPairs.map((item, idx) => (
                  <div key={`${item.event_time}-${idx}`} className="border border-neutral-200 rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 mb-3">
                      <span className="font-semibold text-neutral-700">{item.source_component}</span>
                      <span>Provider: {item.provider || 'n/a'}</span>
                      <span>Model: {item.model_used || 'n/a'}</span>
                      <span>{new Date(item.event_time).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1">Prompt</div>
                        <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap break-words max-h-48 overflow-auto">{item.prompt}</pre>
                      </div>
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1">Output</div>
                        <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 whitespace-pre-wrap break-words max-h-48 overflow-auto">{item.output}</pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-1">Rich GenAI Trace Payload</div>
                      {Object.keys(item.rich_payload || {}).length === 0 ? (
                        <div className="text-xs text-neutral-500">No additional payload fields captured for this trace.</div>
                      ) : (
                        <pre className="text-xs bg-indigo-50 border border-indigo-200 rounded p-3 whitespace-pre-wrap break-words max-h-56 overflow-auto">{JSON.stringify(item.rich_payload, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-sm text-indigo-800">
            <div className="font-bold inline-flex items-center gap-2 mb-1">
              <LuMessagesSquare className="w-4 h-4" />
              Future topic
            </div>
            A product-user chatbot can be added next to query documentation and workflow evidence via prompting, using the same observability stack for prompt/output traceability.
          </div>
        </>
      )}
    </div>
  );
};

export default AdminObservabilityPage;
