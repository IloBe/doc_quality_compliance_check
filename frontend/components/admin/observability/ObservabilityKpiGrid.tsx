import React from 'react';
import { QualitySummary } from '../../../lib/observabilityClient';

type ObservabilityKpiGridProps = {
  summary: QualitySummary;
  scorePct: string;
};

const ObservabilityKpiGrid = ({ summary, scorePct }: ObservabilityKpiGridProps) => {
  return (
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
  );
};

export default ObservabilityKpiGrid;
