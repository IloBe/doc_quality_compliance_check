/// <reference path="./vitest.d.ts" />

describe('documentRetrievalClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_ORIGIN;
  });

  it('calls backend via proxy path when NEXT_PUBLIC_API_ORIGIN is unset', async () => {
    delete process.env.NEXT_PUBLIC_API_ORIGIN;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [
          {
            document_id: 'DOC-101',
            filename: 'architecture.md',
            document_type: 'arc42',
            product: 'AI-Diagnostics-Core',
            status: 'Draft',
            version: '0.1.0',
            locked_by: null,
            updated_at: '2026-04-04T10:00:00Z',
            updated_by: 'mvp-user@example.invalid',
            extracted_text: '# sample',
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { listDocuments } = await import('../lib/documentRetrievalClient');
    const result = await listDocuments();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/documents', {
      method: 'GET',
      credentials: 'include',
    });
    expect(result.ok).toBe(true);
    expect(result.degradedToDemo).toBeUndefined();
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].id).toBe('DOC-101');
    expect(result.documents[0].type).toBe('arc42');
  });

  it('falls back to demo mode when backend retrieval throws', async () => {
    delete process.env.NEXT_PUBLIC_API_ORIGIN;

    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { listDocuments } = await import('../lib/documentRetrievalClient');
    const result = await listDocuments();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.degradedToDemo).toBe(true);
    expect(result.documents).toEqual([]);
  });

  it('loads document summary by id for bridge route resolution', async () => {
    delete process.env.NEXT_PUBLIC_API_ORIGIN;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        document_id: 'DOC-707',
        filename: 'xray-complaint.pdf',
        document_type: 'risk_assessment',
        status: 'Draft',
      }),
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { getDocumentSummaryById } = await import('../lib/documentRetrievalClient');
    const result = await getDocumentSummaryById('DOC-707');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/documents/DOC-707/summary', {
      method: 'GET',
      credentials: 'include',
    });
    expect(result.ok).toBe(true);
    expect(result.document?.id).toBe('DOC-707');
    expect(result.document?.title).toBe('xray-complaint.pdf');
    expect(result.document?.type).toBe('risk_assessment');
  });
});
