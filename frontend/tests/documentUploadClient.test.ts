/// <reference path="./vitest.d.ts" />

describe('documentUploadClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_ORIGIN;
  });

  it('uploads using backend endpoint and maps response payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        document_id: 'DOC-UP-001',
        filename: '07_bridge_gdpr_security_violation_xray_complaint.pdf',
        document_type: 'risk_assessment',
        status: 'pending',
      }),
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { uploadDocument } = await import('../lib/documentUploadClient');
    const file = new File(['hello'], '07_bridge_gdpr_security_violation_xray_complaint.pdf', {
      type: 'application/pdf',
    });

    const result = await uploadDocument(file, 'qm@example.invalid');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('/api/v1/documents/upload');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(options.body).toBeInstanceOf(FormData);

    expect(result.ok).toBe(true);
    expect(result.document?.id).toBe('DOC-UP-001');
    expect(result.document?.title).toBe('07_bridge_gdpr_security_violation_xray_complaint.pdf');
    expect(result.document?.type).toBe('risk_assessment');
    expect(result.document?.status).toBe('Draft');
    expect(result.document?.updatedBy).toBe('qm@example.invalid');
  });

  it('returns backend permission/detail error message on failed upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
      json: async () => ({ detail: 'Insufficient role permissions' }),
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { uploadDocument } = await import('../lib/documentUploadClient');
    const file = new File(['hello'], 'doc.md', { type: 'text/markdown' });

    const result = await uploadDocument(file, 'dev@example.invalid');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Insufficient role permissions');
  });

  it('returns service unavailable message when upload fetch throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('connection refused'));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const { uploadDocument } = await import('../lib/documentUploadClient');
    const file = new File(['hello'], 'doc.md', { type: 'text/markdown' });

    const result = await uploadDocument(file, 'user@example.invalid');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Upload service unavailable');
  });
});
