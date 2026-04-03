import React from 'react';
import { LuActivity, LuGauge, LuTimer, LuTriangleAlert, LuWandSparkles } from 'react-icons/lu';
import { MetricsSnapshot, QualitySummary } from '../../../lib/observabilityClient';

type ObservabilitySidePanelsProps = {
  metrics: MetricsSnapshot | null;
  summary: QualitySummary;
};

const ObservabilitySidePanels = ({ metrics, summary }: ObservabilitySidePanelsProps) => {
  return (
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
  );
};

export default ObservabilitySidePanels;
