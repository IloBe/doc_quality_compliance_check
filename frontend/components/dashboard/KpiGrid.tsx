import React from 'react';
import { LuBriefcase, LuClock3, LuFileText, LuTrendingUp } from 'react-icons/lu';
import { DashboardSummary } from '../../lib/dashboardClient';

type KpiGridProps = {
  summary: DashboardSummary;
};

const KpiGrid = ({ summary }: KpiGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Open Documents</span>
          <LuFileText className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{summary.kpis.open_documents}</div>
        <div className="text-xs text-neutral-500 mt-1">Closed: {summary.kpis.closed_documents}</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Active Jobs</span>
          <LuBriefcase className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{summary.kpis.active_jobs}</div>
        <div className="text-xs text-neutral-500 mt-1">Closed: {summary.kpis.closed_jobs}</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Avg. Cycle Time</span>
          <LuClock3 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{summary.kpis.avg_cycle_days}d</div>
        <div className="text-xs text-neutral-500 mt-1">Bridge runs done: {summary.kpis.bridge_runs_done}</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Compliance Pass Rate</span>
          <LuTrendingUp className="w-4 h-4 text-violet-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{summary.kpis.compliance_pass_rate}%</div>
        <div className="text-xs text-neutral-500 mt-1">Within selected timeframe</div>
      </div>
    </div>
  );
};

export default KpiGrid;
