import React from 'react';
import { AuditorQueueKpis } from '../../lib/auditorWorkstationViewModel';

type AuditorWorkstationKpiGridProps = {
  kpis: AuditorQueueKpis;
};

const AuditorWorkstationKpiGrid = ({ kpis }: AuditorWorkstationKpiGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Pending decisions</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.pendingCount}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Reviewed in window</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.reviewedCount}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Overdue (&gt;24h)</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.overdueCount}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Rejection rate</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.rejectionRate}%</div>
      </div>
    </div>
  );
};

export default AuditorWorkstationKpiGrid;
