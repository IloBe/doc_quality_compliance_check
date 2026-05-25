import type { Document } from './mockStore';
import { formatDateTime } from './dateTime';

export type RiskStatusFilter = 'All' | 'Draft' | 'In Review' | 'Approved' | 'rework after review';
export type RiskTypeFilter = 'All' | 'RMF' | 'FMEA';

export interface RiskStats {
  total: number;
  rmf: number;
  fmea: number;
  inReview: number;
  highResidual: number;
  drafts: number;
  reworkAfterReview: number;
}

export interface RiskRecordRow {
  id: string;
  title: string;
  type: 'RMF' | 'FMEA';
  product: string;
  status: 'Draft' | 'In Review' | 'Approved' | 'rework after review';
  version: string;
  updatedAt: string;
  updatedBy: string;
  hazardCount: number;
  mitigationCount: number;
  residualRisk: 'Low' | 'Medium' | 'High';
  mutable: boolean;
}

function normalizeRiskType(type: Document['type']): 'RMF' | 'FMEA' | null {
  if (type === 'RMF' || type === 'FMEA') {
    return type;
  }
  return null;
}

function normalizeRiskStatus(status: string): RiskRecordRow['status'] {
  if (status === 'Draft' || status === 'In Review' || status === 'Approved' || status === 'rework after review') {
    return status;
  }
  return 'Draft';
}

function deriveRiskSignals(content: string): {
  hazardCount: number;
  mitigationCount: number;
  residualRisk: RiskRecordRow['residualRisk'];
} {
  const text = content.toLowerCase();
  const hazardCount = (text.match(/hazard/g) || []).length;
  const mitigationCount = (text.match(/mitigation|control/g) || []).length;

  const signal = hazardCount - mitigationCount;
  const residualRisk: RiskRecordRow['residualRisk'] = signal >= 2 ? 'High' : signal === 1 ? 'Medium' : 'Low';

  return {
    hazardCount: Math.max(1, hazardCount),
    mitigationCount: Math.max(1, mitigationCount),
    residualRisk,
  };
}

export function buildRiskRows(documents: Document[]): RiskRecordRow[] {
  return documents
    .map((doc) => {
      const type = normalizeRiskType(doc.type);
      if (!type) {
        return null;
      }

      const signals = deriveRiskSignals(doc.content || '');

      return {
        id: doc.id,
        title: doc.title,
        type,
        product: doc.product,
        status: normalizeRiskStatus(doc.status),
        version: doc.version,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
        hazardCount: signals.hazardCount,
        mitigationCount: signals.mitigationCount,
        residualRisk: signals.residualRisk,
        mutable: true,
      } as RiskRecordRow;
    })
    .filter((row): row is RiskRecordRow => row !== null)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function buildSeededRiskRows(documents: Document[]): RiskRecordRow[] {
  return buildRiskRows(documents);
}

export function buildRiskStats(rows: RiskRecordRow[]): RiskStats {
  return {
    total: rows.length,
    rmf: rows.filter((row) => row.type === 'RMF').length,
    fmea: rows.filter((row) => row.type === 'FMEA').length,
    inReview: rows.filter((row) => row.status === 'In Review').length,
    highResidual: rows.filter((row) => row.residualRisk === 'High').length,
    drafts: rows.filter((row) => row.status === 'Draft' || row.status === 'rework after review').length,
    reworkAfterReview: rows.filter((row) => row.status === 'rework after review').length,
  };
}

export function filterRiskRows(
  rows: RiskRecordRow[],
  query: string,
  typeFilter: RiskTypeFilter,
  statusFilter: RiskStatusFilter,
  productFilter: string,
): RiskRecordRow[] {
  const q = query.trim().toLowerCase();
  const product = productFilter.trim().toLowerCase();

  return rows.filter((row) => {
    if (typeFilter !== 'All' && row.type !== typeFilter) {
      return false;
    }

    if (statusFilter !== 'All' && row.status !== statusFilter) {
      return false;
    }

    if (productFilter !== 'All' && row.product.toLowerCase() !== product) {
      return false;
    }

    if (!q) {
      return true;
    }

    return `${row.id} ${row.title} ${row.product} ${row.updatedBy}`.toLowerCase().includes(q);
  });
}

export function formatRiskDate(ts: string): string {
  return formatDateTime(ts, ts);
}

export function buildRiskDocId(type: 'RMF' | 'FMEA'): string {
  const prefix = type === 'RMF' ? 'DOC-RISK-RMF' : 'DOC-RISK-FMEA';
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${stamp}`;
}
