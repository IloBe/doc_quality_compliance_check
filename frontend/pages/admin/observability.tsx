import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LuLoader } from 'react-icons/lu';
import ObservabilityAspectTable from '../../components/admin/observability/ObservabilityAspectTable';
import ObservabilityControls from '../../components/admin/observability/ObservabilityControls';
import ObservabilityKpiGrid from '../../components/admin/observability/ObservabilityKpiGrid';
import ObservabilityPromptPairsPanel from '../../components/admin/observability/ObservabilityPromptPairsPanel';
import ObservabilitySidePanels from '../../components/admin/observability/ObservabilitySidePanels';
import ObservabilityWorkflowTable from '../../components/admin/observability/ObservabilityWorkflowTable';
import FooterInfoCard from '../../components/FooterInfoCard';
import PageHeaderWithWhy from '../../components/PageHeaderWithWhy';
import {
  OBSERVABILITY_WINDOWS,
  buildPromptPairsCsv,
  createMockMetrics,
  createMockPromptPairs,
  createMockQualitySummary,
  createMockWorkflowBreakdown,
  getObservabilityScorePct,
} from '../../lib/adminObservabilityViewModel';
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

const AdminObservabilityPage = () => {
  // Default to demo mode — the same pattern as Dashboard.
  // Set NEXT_PUBLIC_OBSERVABILITY_SOURCE=backend to use live DB telemetry.
  const useBackendData = process.env.NEXT_PUBLIC_OBSERVABILITY_SOURCE === 'backend';

  const [windowHours, setWindowHours] = useState(24);
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [promptPairs, setPromptPairs] = useState<LlmPromptOutputPair[]>([]);
  const [workflowBreakdown, setWorkflowBreakdown] = useState<WorkflowComponentBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(useBackendData);
  const [error, setError] = useState<string | null>(null);

  const mockSummary = useMemo<QualitySummary>(() => createMockQualitySummary(windowHours), [windowHours]);
  const mockMetrics = useMemo<MetricsSnapshot>(() => createMockMetrics(windowHours), [windowHours]);
  const mockWorkflowBreakdown = useMemo<WorkflowComponentBreakdown>(() => createMockWorkflowBreakdown(windowHours), [windowHours]);
  const mockPromptPairs = useMemo<LlmPromptOutputPair[]>(() => createMockPromptPairs(), []);

  const load = useCallback(async () => {
    if (!useBackendData) {
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

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
  }, [useBackendData, windowHours]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [load]);

  const effectiveSummary = useMemo(() => (useBackendData ? summary : mockSummary), [mockSummary, summary, useBackendData]);
  const effectiveMetrics = useMemo(() => (useBackendData ? metrics : mockMetrics), [metrics, mockMetrics, useBackendData]);
  const effectivePromptPairs = useMemo(() => (useBackendData ? promptPairs : mockPromptPairs), [mockPromptPairs, promptPairs, useBackendData]);
  const effectiveWorkflowBreakdown = useMemo(
    () => (useBackendData ? workflowBreakdown : mockWorkflowBreakdown),
    [mockWorkflowBreakdown, useBackendData, workflowBreakdown],
  );

  const scorePct = useMemo(() => getObservabilityScorePct(effectiveSummary), [effectiveSummary]);

  const exportPromptPairsCsv = () => {
    const csv = buildPromptPairsCsv(effectivePromptPairs);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.setAttribute('download', `observability_prompt_output_pairs_${windowHours}h_${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Admin / Observability"
        title="Observability"
        subtitle="Tracing and quality telemetry for technical monitoring, validation, and continuous improvement."
        whyDescription="This page visualizes backend quality telemetry so engineers can detect latency regressions, track evaluation quality, monitor hallucination indicators, and correlate failures before they impact regulated production workflows."
        rightContent={
          <ObservabilityControls
            windows={OBSERVABILITY_WINDOWS}
            windowHours={windowHours}
            onWindowChange={setWindowHours}
            onRefresh={() => void load()}
          />
        }
      />

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

      {!isLoading && !error && effectiveSummary && (
        <>
          <ObservabilityKpiGrid summary={effectiveSummary} scorePct={scorePct} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <ObservabilityAspectTable summary={effectiveSummary} />
            <ObservabilitySidePanels metrics={effectiveMetrics} summary={effectiveSummary} />
          </div>

          <ObservabilityWorkflowTable workflowBreakdown={effectiveWorkflowBreakdown} />

          <ObservabilityPromptPairsPanel promptPairs={effectivePromptPairs} onExportCsv={exportPromptPairsCsv} />

          <FooterInfoCard title="Future topic" accent="indigo">
            A product-user chatbot can be added next to query documentation and workflow evidence via prompting, using the same observability stack for prompt/output traceability.
          </FooterInfoCard>
        </>
      )}
    </div>
  );
};

export default AdminObservabilityPage;
