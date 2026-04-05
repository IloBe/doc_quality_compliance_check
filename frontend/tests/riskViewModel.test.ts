/// <reference path="./vitest.d.ts" />

import {
  buildRiskRows,
  buildRiskStats,
  filterRiskRows,
  type RiskRecordRow,
} from '../lib/riskViewModel';
import type { Document } from '../lib/mockStore';

const docs: Document[] = [
  {
    id: 'DOC-RISK-001',
    title: 'RMF Core',
    type: 'RMF',
    product: 'AI-Diagnostics-Core',
    status: 'Draft',
    version: '0.1.0',
    updatedAt: '2026-04-05T12:00:00.000Z',
    updatedBy: 'maria@example.invalid',
    content: 'risk hazard mitigation control severity probability',
  },
  {
    id: 'DOC-RISK-002',
    title: 'FMEA Gateway',
    type: 'FMEA',
    product: 'AI-Diagnostics-Core',
    status: 'rework after review',
    version: '0.2.0',
    updatedAt: '2026-04-04T12:00:00.000Z',
    updatedBy: 'sven@example.invalid',
    content: 'risk hazard failure mitigation control',
  },
  {
    id: 'DOC-OTHER-001',
    title: 'Architecture Note',
    type: 'arc42',
    product: 'AI-Diagnostics-Core',
    status: 'Approved',
    version: '1.0.0',
    updatedAt: '2026-04-03T12:00:00.000Z',
    updatedBy: 'jan@example.invalid',
    content: 'not a risk template',
  },
];

describe('riskViewModel', () => {
  it('keeps rework-after-review rows in buildRiskRows output', () => {
    const rows = buildRiskRows(docs);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.id)).toContain('DOC-RISK-002');
    expect(rows.find((row) => row.id === 'DOC-RISK-002')?.status).toBe('rework after review');
  });

  it('supports filtering by rework-after-review status', () => {
    const rows = buildRiskRows(docs);

    const filtered = filterRiskRows(rows, '', 'All', 'rework after review', 'All');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('DOC-RISK-002');
  });

  it('counts rework-after-review in risk stats and keeps drafts aggregate', () => {
    const rows: RiskRecordRow[] = [
      {
        id: 'A',
        title: 'Draft Record',
        type: 'RMF',
        product: 'P',
        status: 'Draft',
        version: '0.1.0',
        updatedAt: '2026-04-01T00:00:00.000Z',
        updatedBy: 'x',
        hazardCount: 1,
        mitigationCount: 1,
        residualRisk: 'Low',
        mutable: true,
      },
      {
        id: 'B',
        title: 'Rework Record',
        type: 'FMEA',
        product: 'P',
        status: 'rework after review',
        version: '0.1.0',
        updatedAt: '2026-04-01T00:00:00.000Z',
        updatedBy: 'y',
        hazardCount: 1,
        mitigationCount: 1,
        residualRisk: 'High',
        mutable: true,
      },
    ];

    const stats = buildRiskStats(rows);

    expect(stats.reworkAfterReview).toBe(1);
    expect(stats.drafts).toBe(2);
  });
});
