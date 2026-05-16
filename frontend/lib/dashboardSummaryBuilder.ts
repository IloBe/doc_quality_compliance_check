import type { Document, ExportJob, BridgeRun } from './mockStore';
import type { DashboardTimeframe, DashboardSummary } from './dashboardClient';

export function buildMockDashboardSummary(_documents: Document[], _exports: ExportJob[], _bridgeRuns: BridgeRun[], _timeframe?: DashboardTimeframe): DashboardSummary {
  return {
    kpis: {
      open_documents: 0,
      closed_documents: 0,
      active_jobs: 0,
      closed_jobs: 0,
      avg_cycle_days: 0,
      bridge_runs_done: 0,
      compliance_pass_rate: 0,
    },
    documents: [],
    risk_distribution: {
      high: 0,
      limited: 0,
      minimal: 0,
    },
  };
}

export function getRiskTotal(summary: any): number {
  const distribution = summary?.risk_distribution;
  if (!distribution) return 0;
  return Number(distribution.high || 0) + Number(distribution.limited || 0) + Number(distribution.minimal || 0);
}
