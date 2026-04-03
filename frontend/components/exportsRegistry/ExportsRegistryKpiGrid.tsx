import React from 'react';
import { LuFileText } from 'react-icons/lu';
import { ExportRegistryStats } from '../../lib/exportRegistryViewModel';

type ExportsRegistryKpiGridProps = {
  stats: ExportRegistryStats;
};

const ExportsRegistryKpiGrid = ({ stats }: ExportsRegistryKpiGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Exports</span>
          <LuFileText className="w-4 h-4 text-neutral-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{stats.total}</div>
        <div className="text-xs text-neutral-500 mt-1">All time</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Ready</span>
          <div className="w-4 h-4 rounded-full bg-emerald-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{stats.ready}</div>
        <div className="text-xs text-neutral-500 mt-1">Available for download</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Running</span>
          <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{stats.running}</div>
        <div className="text-xs text-neutral-500 mt-1">In progress</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Queued</span>
          <div className="w-4 h-4 rounded-full bg-amber-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{stats.queued}</div>
        <div className="text-xs text-neutral-500 mt-1">Awaiting processing</div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Failed</span>
          <div className="w-4 h-4 rounded-full bg-rose-500" />
        </div>
        <div className="text-3xl font-black text-neutral-900">{stats.failed}</div>
        <div className="text-xs text-neutral-500 mt-1">Retry or review</div>
      </div>
    </div>
  );
};

export default ExportsRegistryKpiGrid;
