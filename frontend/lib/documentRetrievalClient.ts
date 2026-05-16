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

export async function listDocuments(): Promise<{ ok: boolean; documents: RetrievedDocument[]; degradedToDemo?: boolean }> {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN?.trim();
  const endpoint = apiOrigin ? `${apiOrigin}/api/v1/documents` : '/api/v1/documents';

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
    return { ok: true, documents: [], degradedToDemo: true };
  }
}
