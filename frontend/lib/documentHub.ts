export function getDocumentStatusBadgeClass(_status: string): string {
  return 'bg-neutral-100 text-neutral-700';
}

export type DocumentStatusFilter = 'All' | 'Draft' | 'Review' | 'Approved' | 'rework after review';

export const DOCUMENT_STATUS_FILTERS: DocumentStatusFilter[] = ['All', 'Draft', 'Review', 'Approved', 'rework after review'];

const VALID_STATUS_FILTERS = new Set<DocumentStatusFilter>(DOCUMENT_STATUS_FILTERS);

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function buildDocumentHubQuery(filter: string, projectFilter: string, status: DocumentStatusFilter): Record<string, string> {
  const query: Record<string, string> = {};
  if (filter) query.q = filter;
  if (projectFilter) query.project = projectFilter;
  if (status && status !== 'All') query.status = status;
  return query;
}

export function getDocumentHubFilters(query: Record<string, unknown>): {
  queryFilter: string;
  projectFilter: string;
  statusFilter: DocumentStatusFilter;
} {
  const rawStatus = normalizeString(query.status) as DocumentStatusFilter;
  return {
    queryFilter: normalizeString(query.q),
    projectFilter: normalizeString(query.project),
    statusFilter: VALID_STATUS_FILTERS.has(rawStatus) ? rawStatus : 'All',
  };
}

export function filterDocuments<T extends { title: string; id: string; status: string }>(
  documents: T[],
  query: string,
  projectFilter: string,
  status: DocumentStatusFilter,
): T[] {
  const q = query.toLowerCase();
  const p = projectFilter.toLowerCase();

  return documents.filter((doc) => {
    const matchQuery = !q || doc.title.toLowerCase().includes(q) || doc.id.toLowerCase().includes(q);
    const matchProject = !p || doc.id.toLowerCase().includes(p);
    const matchStatus = status === 'All' || doc.status.toLowerCase() === status.toLowerCase();
    return matchQuery && matchProject && matchStatus;
  });
}
