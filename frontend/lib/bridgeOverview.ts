import React from 'react';

export type BridgeOverviewTone = 'blue' | 'amber' | 'red' | 'emerald';

export interface BridgeOverviewStat {
  id: string;
  title: string;
  count: string | number;
  trendLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: BridgeOverviewTone;
}

export const bridgeToneClasses: Record<BridgeOverviewTone, { icon: string; trend: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-700', trend: 'bg-blue-50 text-blue-700' },
  amber: { icon: 'bg-amber-50 text-amber-700', trend: 'bg-amber-50 text-amber-700' },
  red: { icon: 'bg-red-50 text-red-700', trend: 'bg-red-50 text-red-700' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', trend: 'bg-emerald-50 text-emerald-700' },
};

export const bridgeOverviewStats: BridgeOverviewStat[] = [];
