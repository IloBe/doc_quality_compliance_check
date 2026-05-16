// Compliance Alert ViewModel - Models and utilities for compliance alerts

export type ComplianceAlertSeverity = 'All' | 'info' | 'warning' | 'critical';

export interface ComplianceAlertFilters {
  framework: string;
  severity: ComplianceAlertSeverity;
  startDate: string;
  endDate: string;
}

export function filterComplianceAlerts<T>(alerts: T[], _filters: ComplianceAlertFilters): T[] {
  return alerts;
}

export function normalizeDateRange(startDate?: string, endDate?: string): { startDate: string; endDate: string } {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    startDate: startDate || thirtyDaysAgo.toISOString().slice(0, 10),
    endDate: endDate || now.toISOString().slice(0, 10),
  };
}
