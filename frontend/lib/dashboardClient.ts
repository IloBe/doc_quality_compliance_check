// Dashboard Client - API client for dashboard state

export type DashboardTimeframe = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface DashboardSummary {
  kpis: {
    open_documents: number;
    closed_documents: number;
    active_jobs: number;
    closed_jobs: number;
    avg_cycle_days: number;
    bridge_runs_done: number;
    compliance_pass_rate: number;
  };
  documents: Array<{
    document_id: string;
    title: string;
    owner: string;
    workflow_status: string;
    risk_class: 'High' | 'Limited' | 'Minimal';
    cycle_days: number;
    checks: Array<{
      standard: string;
      article: string;
      status: 'pass' | 'warn' | 'fail';
      passed: boolean;
    }>;
    standards_total: number;
    standards_met: number;
    coverage_pct: number;
    last_run_at?: string;
  }>;
  risk_distribution: {
    high: number;
    limited: number;
    minimal: number;
  };
}

export async function fetchDashboardSummary(_timeframe: DashboardTimeframe): Promise<DashboardSummary> {
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

export async function fetchDashboardData(timeframe: DashboardTimeframe): Promise<any> {
  return Promise.resolve({});
}
