import React from 'react';
import { AdminCenterSummary } from '../../lib/adminCenterViewModel';

type AdminCenterSummaryGridProps = {
  summary: AdminCenterSummary;
};

const AdminCenterSummaryGrid = ({ summary }: AdminCenterSummaryGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Admin domains</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{summary.domains}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Observability signals</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{summary.observabilitySignals}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Stakeholder templates</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{summary.stakeholderProfiles}</div>
      </div>
    </div>
  );
};

export default AdminCenterSummaryGrid;
