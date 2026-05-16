// Artifact Lab ViewModel - Full implementation

import type { BridgeRun, Document } from './mockStore';

export type ArtifactKind = 'arc42' | 'risk' | 'sop' | 'generic';

export interface ArtifactCitation {
  id: string;
  source: string;
  section: string;
  note: string;
  status: 'mapped' | 'pending';
}

export interface ArtifactDraft {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  citations: ArtifactCitation[];
}

export interface ArtifactChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
}

export interface ArtifactRunCard {
  runId: string;
  product: string;
  status: string;
  startedAt: string;
  latestDocId: string;
  latestDocTitle: string;
  evidenceCount: number;
}

// Helpers

function sortDocsByDate(docs: Document[]): Document[] {
  return [...docs].sort((a, b) => {
    const da = a.updatedAt ?? '';
    const db = b.updatedAt ?? '';
    return db.localeCompare(da);
  });
}

export function resolveRunLinkedDocuments(
  run: BridgeRun | null | undefined,
  documents: Document[],
): { linkedDocuments: Document[]; primaryDocument: Document | null } {
  if (!run) {
    return { linkedDocuments: [], primaryDocument: null };
  }

  const productDocs = run.product
    ? sortDocsByDate(documents.filter((doc) => doc.product === run.product))
    : sortDocsByDate(documents);

  const primary = productDocs[0] ?? null;
  return { linkedDocuments: productDocs, primaryDocument: primary };
}

export function resolveWorkflowDocumentForArtifact(
  kind: ArtifactKind,
  docs: Document[],
  primaryDoc: Document | null,
): Document | null {
  const typeMap: Record<ArtifactKind, string[]> = {
    arc42: ['arc42', 'architecture'],
    risk: ['RMF', 'FMEA', 'risk'],
    sop: ['SOP'],
    generic: [],
  };

  const types = typeMap[kind];
  if (types.length > 0) {
    const specific = docs.find((doc) =>
      types.some((type) => doc.type?.toLowerCase() === type.toLowerCase()),
    );
    if (specific) return specific;
  }

  return primaryDoc;
}

export function buildArtifactRunCards(runs: BridgeRun[], documents: Document[]): ArtifactRunCard[] {
  return runs.map((run) => {
    const { linkedDocuments } = resolveRunLinkedDocuments(run, documents);
    const latest = linkedDocuments[0];
    return {
      runId: run.id,
      product: run.product ?? 'Unknown',
      status: run.status,
      startedAt: run.startedAt ?? run.createdAt ?? '-',
      latestDocId: latest?.id ?? '-',
      latestDocTitle: latest?.title ?? 'No document linked',
      evidenceCount: run.evidenceCount ?? 0,
    };
  });
}

function buildCitations(kind: ArtifactKind): ArtifactCitation[] {
  const base: ArtifactCitation[] = [
    { id: 'c1', source: 'EU AI Act', section: 'Art. 11 - Technical Documentation', note: 'Requires full lifecycle documentation.', status: 'mapped' },
    { id: 'c2', source: 'ISO 14971', section: '§6 - Risk Assessment', note: 'Risk estimation must be traceable.', status: 'pending' },
  ];
  if (kind === 'risk') {
    return [...base, { id: 'c3', source: 'ISO 14971', section: '§7 - Risk Control', note: 'Controls must be evidenced.', status: 'pending' }];
  }
  return base;
}

export function buildInitialArtifactDrafts(): ArtifactDraft[] {
  return [
    {
      id: 'art-arc42',
      kind: 'arc42',
      title: 'Arc42 Architecture Documentation',
      content: '# Arc42 Architecture Documentation\n\n## Context and Scope\n\n_Describe system context here._\n\n## Solution Strategy\n\n_Describe the key solution decisions here._\n',
      citations: buildCitations('arc42'),
    },
    {
      id: 'art-risk',
      kind: 'risk',
      title: 'Risk Management Summary',
      content: '# Risk Management Summary\n\n## Risk Overview\n\n_Describe identified risks here._\n\n## Mitigations\n\n_Describe controls here._\n',
      citations: buildCitations('risk'),
    },
    {
      id: 'art-sop',
      kind: 'sop',
      title: 'Operating Procedure Draft',
      content: '# Standard Operating Procedure\n\n## Purpose\n\n_State the purpose of this SOP._\n\n## Procedure\n\n1. Step one\n2. Step two\n',
      citations: buildCitations('sop'),
    },
  ];
}

export function computeCitationCoverage(citations: ArtifactCitation[]): { pct: number; mapped: number; all: number } {
  const all = citations.length;
  const mapped = citations.filter((c) => c.status === 'mapped').length;
  const pct = all > 0 ? Math.round((mapped / all) * 100) : 0;
  return { pct, mapped, all };
}

export function createAskAuthorAssistantReply(artifactTitle: string): string {
  return `I've reviewed your request for "${artifactTitle}". Here is a suggested revision addressing the identified gap. Please review and apply if suitable, then finalize the session outcome.`;
}

export function applyLatestProposalToDrafts(
  drafts: ArtifactDraft[],
  selectedId: string,
  _stamp: string,
): ArtifactDraft[] {
  return drafts.map((draft) => {
    if (draft.id !== selectedId) return draft;
    const appendix = '\n\n---\n\n_Author Agent proposal applied. Review and adjust before final approval._\n';
    return { ...draft, content: draft.content + appendix };
  });
}
