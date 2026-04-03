import React from 'react';
import { AuditTrailKpis } from '../../lib/auditTrailViewModel';

type AuditTrailKpiGridProps = {
  kpis: AuditTrailKpis;
};

const AuditTrailKpiGrid = ({ kpis }: AuditTrailKpiGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Events in window</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.total}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Unique actors</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.uniqueActors}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">HITL review events</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.hitlReviews}</div>
      </div>
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="text-xs uppercase font-black tracking-widest text-neutral-400">Approval events</div>
        <div className="text-3xl font-black text-neutral-900 mt-2">{kpis.approvals}</div>
      </div>
    </div>
  );
};

export default AuditTrailKpiGrid;
