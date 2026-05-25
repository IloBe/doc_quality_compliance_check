// Auditor Vault ViewModel - Evidence inventory for audit readiness

import type { Document, ExportJob, BridgeRun } from './mockStore';
import type { DashboardTimeframe } from './dashboardClient';
import { formatDateTime } from './dateTime';

export interface VaultEvidenceRow {
  id: string;
  title: string;
  source: 'document' | 'export' | 'bridge';
  product: string;
  status: string;
  health: 'Fresh' | 'Stale' | 'Unknown';
  updatedAt: string;
  updatedBy: string;
}

export interface VaultSnapshot {
  totalEvidence: number;
  approvedArtifacts: number;
  pendingReviews: number;
  staleEvidence: number;
  readinessScore: number;
}

function windowMs(timeframe: DashboardTimeframe): number {
  const day = 86400_000;
  switch (timeframe) {
    case 'week': return 7 * day;
    case 'month': return 30 * day;
    case 'quarter': return 90 * day;
    case 'year': return 365 * day;
    default: return 30 * day;
  }
}

function healthOf(updatedAt: string | undefined, windowMs: number): 'Fresh' | 'Stale' | 'Unknown' {
  if (!updatedAt) return 'Unknown';
  const age = Date.now() - new Date(updatedAt).getTime();
  return age < windowMs ? 'Fresh' : 'Stale';
}

export function buildVaultEvidenceRows(
  documents: Document[],
  exports: ExportJob[],
  bridgeRuns: BridgeRun[],
  timeframe: DashboardTimeframe,
): VaultEvidenceRow[] {
  const wMs = windowMs(timeframe);
  const rows: VaultEvidenceRow[] = [];

  for (const doc of documents) {
    rows.push({
      id: doc.id,
      title: doc.title,
      source: 'document',
      product: doc.product ?? '-',
      status: doc.status,
      health: healthOf(doc.updatedAt, wMs),
      updatedAt: formatDateTime(doc.updatedAt, '-'),
      updatedBy: doc.updatedBy ?? '-',
    });
  }

  for (const exp of exports) {
    rows.push({
      id: exp.id,
      title: `Export ${exp.id}`,
      source: 'export',
      product: '-',
      status: exp.status,
      health: 'Unknown',
      updatedAt: '-',
      updatedBy: '-',
    });
  }

  for (const run of bridgeRuns) {
    rows.push({
      id: run.id,
      title: `Bridge Run ${run.id}`,
      source: 'bridge',
      product: run.product ?? '-',
      status: run.status,
      health: healthOf(run.startedAt ?? run.createdAt, wMs),
      updatedAt: formatDateTime(run.startedAt, '-'),
      updatedBy: '-',
    });
  }

  return rows;
}

export function buildVaultSnapshot(rows: VaultEvidenceRow[]): VaultSnapshot {
  const total = rows.length;
  const approved = rows.filter((r) => r.status?.toLowerCase().includes('approv') || r.status === 'ready').length;
  const pending = rows.filter((r) => r.status?.toLowerCase().includes('review') || r.status?.toLowerCase().includes('draft')).length;
  const stale = rows.filter((r) => r.health === 'Stale').length;
  const score = total > 0 ? Math.round(((total - stale) / total) * 100) : 0;
  return {
    totalEvidence: total,
    approvedArtifacts: approved,
    pendingReviews: pending,
    staleEvidence: stale,
    readinessScore: score,
  };
}

export function getHealthBadgeClass(health: VaultEvidenceRow['health']): string {
  switch (health) {
    case 'Fresh': return 'bg-emerald-100 text-emerald-700';
    case 'Stale': return 'bg-amber-100 text-amber-700';
    default: return 'bg-neutral-100 text-neutral-600';
  }
}
