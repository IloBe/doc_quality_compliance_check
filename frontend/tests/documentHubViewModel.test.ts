/// <reference path="./vitest.d.ts" />

import {
  buildDocumentHubQuery,
  filterDocuments,
  getDocumentHubFilters,
  type DocumentStatusFilter,
} from '../lib/documentHub';
import type { Document } from '../lib/mockStore';

const docs: Document[] = [
  {
    id: 'DOC-001',
    title: 'Quality Manual',
    type: 'SOP',
    product: 'AI-Diagnostics-Core',
    status: 'Approved',
    version: '1.0.0',
    lockedBy: undefined,
    updatedAt: '2026-04-05T12:00:00.000Z',
    updatedBy: 'maria@example.invalid',
    content: 'x',
  },
  {
    id: 'DOC-002',
    title: 'Risk Plan',
    type: 'RMF',
    product: 'AI-Diagnostics-Core',
    status: 'rework after review',
    version: '0.8.0',
    lockedBy: undefined,
    updatedAt: '2026-04-04T12:00:00.000Z',
    updatedBy: 'sven@example.invalid',
    content: 'y',
  },
];

describe('documentHub view-model helpers', () => {
  it('parses valid status filter from query', () => {
    const parsed = getDocumentHubFilters({ status: 'rework after review', q: 'risk', project: 'AI-Diagnostics-Core' });

    expect(parsed.statusFilter).toBe('rework after review');
    expect(parsed.queryFilter).toBe('risk');
    expect(parsed.projectFilter).toBe('AI-Diagnostics-Core');
  });

  it('falls back to All for invalid status filter', () => {
    const parsed = getDocumentHubFilters({ status: 'INVALID' });

    expect(parsed.statusFilter).toBe('All');
  });

  it('adds status to URL query only when non-default', () => {
    const allQuery = buildDocumentHubQuery('abc', 'AI-Diagnostics-Core', 'All');
    const reworkQuery = buildDocumentHubQuery('abc', 'AI-Diagnostics-Core', 'rework after review' as DocumentStatusFilter);

    expect(allQuery.status).toBeUndefined();
    expect(reworkQuery.status).toBe('rework after review');
  });

  it('filters by selected status', () => {
    const filtered = filterDocuments(docs, '', '', 'rework after review');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('DOC-002');
  });
});
