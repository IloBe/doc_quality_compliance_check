import React from 'react';
import { LuShield } from 'react-icons/lu';
import { DashboardSummary } from '../../lib/dashboardClient';

type RiskDistributionCardProps = {
  summary: DashboardSummary;
  riskTotal: number;
};

const RiskDistributionCard = ({ summary, riskTotal }: RiskDistributionCardProps) => {
  return (
    <div className="xl:col-span-1 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-5 flex items-center gap-2">
        <LuShield className="w-4 h-4 text-blue-600" />
        Risk Classification
      </h2>

      {riskTotal === 0 ? (
        <p className="text-sm text-neutral-500">No classified documents in this timeframe.</p>
      ) : (
        <div className="space-y-4">
          {([
            ['High', summary.risk_distribution.high, 'bg-rose-500'],
            ['Limited', summary.risk_distribution.limited, 'bg-amber-500'],
            ['Minimal', summary.risk_distribution.minimal, 'bg-emerald-500'],
          ] as const).map(([label, value, colorClass]) => {
            const width = Math.max(6, Math.round((value / riskTotal) * 100));
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-neutral-700">{label}</span>
                  <span className="text-neutral-500">{value}</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div className={`h-full ${colorClass}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-neutral-400 mt-6 leading-relaxed">
        Classification aligns with internal EU AI Act screening categories for audit preparation.
      </p>
    </div>
  );
};

export default RiskDistributionCard;
