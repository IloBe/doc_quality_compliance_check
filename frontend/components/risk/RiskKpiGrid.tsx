import React from 'react';
import { RiskStats } from '../../lib/riskViewModel';

type RiskKpiGridProps = {
  stats: RiskStats;
};

const RiskKpiGrid = ({ stats }: RiskKpiGridProps) => {
  const cards = [
    { label: 'Total records', value: stats.total, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
    { label: 'RMF records', value: stats.rmf, tone: 'text-violet-700 bg-violet-50 border-violet-100' },
    { label: 'FMEA records', value: stats.fmea, tone: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
    { label: 'In Review', value: stats.inReview, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
    { label: 'High residual risk', value: stats.highResidual, tone: 'text-rose-700 bg-rose-50 border-rose-100' },
  ];

  return (
    <section className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      {cards.map((card) => (
        <article key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
          <p className="text-[11px] font-black uppercase tracking-widest">{card.label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{card.value}</p>
        </article>
      ))}
    </section>
  );
};

export default RiskKpiGrid;
