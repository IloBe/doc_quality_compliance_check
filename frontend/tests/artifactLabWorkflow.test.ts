/// <reference path="./vitest.d.ts" />

import {
  buildArtifactRunCards,
  buildArtifactRunCardsFromBridgeApi,
  resolveRunLinkedDocuments,
  resolveWorkflowDocumentForArtifact,
} from '../lib/artifactLabViewModel';
import type { BridgeRunListItem } from '../lib/bridgeClient';
import type { BridgeRun, Document } from '../lib/mockStore';

const docs: Document[] = [
  {
    id: 'DOC-001',
    title: 'Quality Management Manual',
    type: 'SOP',
    product: 'AI-Diagnostics-Core',
    status: 'Approved',
    version: '2.1.0',
    updatedAt: '2026-03-10 14:30',
    updatedBy: 'Maria',
    content: 'x',
  },
  {
    id: 'DOC-003',
    title: 'Neural Engine Architecture',
    type: 'arc42',
    product: 'AI-Diagnostics-Core',
    status: 'Draft',
    version: '1.0.0',
    updatedAt: '2026-03-15 11:00',
    updatedBy: 'Jan',
    content: 'x',
  },
  {
    id: 'DOC-009',
    title: 'Other Product Spec',
    type: 'Generic',
    product: 'Other-Product',
    status: 'Draft',
    version: '0.1.0',
    updatedAt: '2026-03-16 09:00',
    updatedBy: 'Ari',
    content: 'x',
  },
];

const runs: BridgeRun[] = [
  {
    id: 'RUN-201',
    product: 'AI-Diagnostics-Core',
    status: 'Done',
    startedAt: '2026-03-15 10:00',
    verdict: 'High',
    classificationWhy: 'x',
    evidenceCount: 15,
  },
];

const backendRuns: BridgeRunListItem[] = [
  {
    run_id: 'RUN-BACKEND-1',
    document_id: 'DOC-003',
    document_name: 'Neural Engine Architecture',
    document_type: 'arc42',
    project_id: 'AI-Diagnostics-Core',
    started_at: '2026-03-15T10:00:00Z',
    completed_at: '2026-03-15T10:04:00Z',
    status: 'completed',
    automatic_recommendation: 'approved',
    human_review_required: true,
    human_review_status: 'pending',
    compliance_score: 0.86,
    checked_frameworks: ['eu_ai_act', 'gdpr', 'iso_13485'],
  },
];

describe('artifact workflow document resolution', () => {
  it('buildArtifactRunCards selects the latest product-linked document', () => {
    const cards = buildArtifactRunCards(runs, docs);

    expect(cards).toHaveLength(1);
    expect(cards[0].latestDocId).toBe('DOC-003');
    expect(cards[0].latestDocTitle).toBe('Neural Engine Architecture');
  });

  it('resolveRunLinkedDocuments keeps product scoping and recent-first order', () => {
    const resolved = resolveRunLinkedDocuments(runs[0], docs);

    expect(resolved.linkedDocuments.map((doc) => doc.id)).toEqual(['DOC-003', 'DOC-001']);
    expect(resolved.primaryDocument?.id).toBe('DOC-003');
  });

  it('resolveRunLinkedDocuments includes run-associated fallback document when store is not hydrated', () => {
    const runWithDetachedDoc: BridgeRun = {
      id: 'RUN-DETACHED-1',
      documentId: 'DOC-XRAY-404',
      documentTitle: 'xray-complaint.pdf',
      product: 'AI-Diagnostics-Core',
      status: 'In Review',
      startedAt: '2026-03-16 13:00',
    };

    const resolved = resolveRunLinkedDocuments(runWithDetachedDoc, docs);

    expect(resolved.primaryDocument?.id).toBe('DOC-XRAY-404');
    expect(resolved.primaryDocument?.title).toBe('xray-complaint.pdf');
    expect(resolved.linkedDocuments[0].id).toBe('DOC-XRAY-404');
  });

  it('resolveWorkflowDocumentForArtifact chooses associated type-specific document', () => {
    const resolved = resolveRunLinkedDocuments(runs[0], docs);

    const arc42Doc = resolveWorkflowDocumentForArtifact('arc42', resolved.linkedDocuments, resolved.primaryDocument);
    expect(arc42Doc?.id).toBe('DOC-003');

    const rmfDoc = resolveWorkflowDocumentForArtifact('risk', resolved.linkedDocuments, resolved.primaryDocument);
    expect(rmfDoc?.id).toBe('DOC-003'); // no RMF exists in scope, so falls back to primary
  });

  it('buildArtifactRunCardsFromBridgeApi exposes pre-HITL runs as In Review', () => {
    const cards = buildArtifactRunCardsFromBridgeApi(backendRuns);

    expect(cards).toHaveLength(1);
    expect(cards[0].runId).toBe('RUN-BACKEND-1');
    expect(cards[0].status).toBe('In Review');
    expect(cards[0].latestDocId).toBe('DOC-003');
    expect(cards[0].latestDocTitle).toBe('Neural Engine Architecture');
    expect(cards[0].evidenceCount).toBe(3);
  });
});
