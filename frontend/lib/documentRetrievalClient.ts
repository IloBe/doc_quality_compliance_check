import { isDemoMode } from './appMode';

export interface RetrievedDocument {
  id: string;
  title: string;
  type: string;
  product: string;
  status: string;
  version: string;
  lockedBy: string | null;
  updatedAt: string;
  updatedBy: string;
  content: string;
}

interface BackendDocument {
  document_id: string;
  filename?: string;
  document_type?: string;
  product?: string;
  status?: string;
  version?: string;
  locked_by?: string | null;
  updated_at?: string;
  updated_by?: string;
  extracted_text?: string;
}

interface ListDocumentsResponse {
  documents?: BackendDocument[];
}

interface BackendDocumentSummary {
  document_id: string;
  filename?: string;
  document_type?: string;
  status?: string;
  updated_at?: string;
  locked_by?: string | null;
}

interface BackendDocumentDetail {
  document_id: string;
  filename?: string;
  document_type?: string;
  status?: string;
  version?: string;
  product?: string;
  updated_at?: string;
  updated_by?: string;
  locked_by?: string | null;
  extracted_text?: string;
}

interface BackendErrorEnvelope {
  error?: {
    message?: string;
    action_points?: string[];
    reason?: string;
  };
}

async function parseBackendErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as BackendErrorEnvelope;
    const message = payload.error?.message?.trim();
    const actionPoints = Array.isArray(payload.error?.action_points)
      ? payload.error?.action_points.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : [];

    if (message && actionPoints.length > 0) {
      return `${message} Next steps: ${actionPoints.join(' ')}`;
    }
    if (message) {
      return message;
    }
  } catch {
    // Fall back to default text when payload parsing is not available.
  }
  return fallback;
}

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_ORIGIN?.trim() || '';
}

function buildApiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

export async function listDocuments(): Promise<{ ok: boolean; documents: RetrievedDocument[]; degradedToDemo?: boolean; message?: string }> {
  const endpoint = buildApiUrl('/api/v1/documents');

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const payload = (await response.json()) as ListDocumentsResponse;
    const documents = (payload.documents ?? []).map((doc): RetrievedDocument => ({
      id: doc.document_id,
      title: doc.filename ?? doc.document_id,
      type: doc.document_type ?? 'generic',
      product: doc.product ?? '',
      status: doc.status ?? 'Draft',
      version: doc.version ?? '0.1.0',
      lockedBy: doc.locked_by ?? null,
      updatedAt: doc.updated_at ?? new Date().toISOString(),
      updatedBy: doc.updated_by ?? 'system',
      content: doc.extracted_text ?? '',
    }));

    return { ok: true, documents };
  } catch {
    if (isDemoMode()) {
      return { ok: true, documents: [], degradedToDemo: true };
    }
    return { ok: false, documents: [], message: 'Unable to load documents from backend in real mode.' };
  }
}

export async function getDocumentSummaryById(documentId: string): Promise<{ ok: boolean; document?: RetrievedDocument; message?: string }> {
  const normalizedId = (documentId || '').trim();
  if (!normalizedId) {
    return { ok: false, message: 'Missing document id.' };
  }

  const endpoint = buildApiUrl(`/api/v1/documents/${encodeURIComponent(normalizedId)}/summary`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const fallback = `Unable to load document ${normalizedId} (status ${response.status}).`;
      return { ok: false, message: await parseBackendErrorMessage(response, fallback) };
    }

    const payload = (await response.json()) as BackendDocumentSummary;
    return {
      ok: true,
      document: {
        id: payload.document_id,
        title: payload.filename ?? payload.document_id,
        type: payload.document_type ?? 'generic',
        product: '',
        status: payload.status ?? 'Draft',
        version: '0.1.0',
        lockedBy: payload.locked_by ?? null,
        updatedAt: payload.updated_at ?? new Date().toISOString(),
        updatedBy: 'system',
        content: '',
      },
    };
  } catch {
    return { ok: false, message: 'Unable to load selected document from backend.' };
  }
}

export async function getDocumentById(documentId: string): Promise<{ ok: boolean; document?: RetrievedDocument; message?: string }> {
  const normalizedId = (documentId || '').trim();
  if (!normalizedId) {
    return { ok: false, message: 'Missing document id.' };
  }

  const endpoint = buildApiUrl(`/api/v1/documents/${encodeURIComponent(normalizedId)}`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const fallback = `Unable to load document ${normalizedId} (status ${response.status}).`;
      return { ok: false, message: await parseBackendErrorMessage(response, fallback) };
    }

    const payload = (await response.json()) as BackendDocumentDetail;
    return {
      ok: true,
      document: {
        id: payload.document_id,
        title: payload.filename ?? payload.document_id,
        type: payload.document_type ?? 'generic',
        product: payload.product ?? '',
        status: payload.status ?? 'Draft',
        version: payload.version ?? '0.1.0',
        lockedBy: payload.locked_by ?? null,
        updatedAt: payload.updated_at ?? new Date().toISOString(),
        updatedBy: payload.updated_by ?? 'system',
        content: payload.extracted_text ?? '',
      },
    };
  } catch {
    return { ok: false, message: 'Unable to load selected document from backend.' };
  }
}
