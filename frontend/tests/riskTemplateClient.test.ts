/// <reference path="./vitest.d.ts" />

describe('riskTemplateClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('loads defaults from backend in real mode without demo degrade', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        template_id: 'tpl_1',
        template_type: 'RMF',
        template_title: 'Risk Management File',
        product: 'AI-Diagnostics-Core',
        version: '1.0.0',
        status: 'Draft',
        created_by: 'qm@example.com',
        metadata: { isDefault: true },
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:00Z',
        rows: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { ensureDefaultRiskTemplate } = await import('../lib/riskTemplateClient');
      const result = await ensureDefaultRiskTemplate({
        template_type: 'RMF',
        template_title: 'Risk Management File',
        product: 'AI-Diagnostics-Core',
        created_by: 'qm@example.com',
        rows: [],
      });

      expect(result.ok).toBe(true);
      expect(result.degradedToDemo).toBeUndefined();
      expect(result.data?.template_id).toBe('tpl_1');
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/risk-templates/defaults/RMF', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: 'AI-Diagnostics-Core',
          created_by: 'qm@example.com',
        }),
      });
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });

  it('fails closed in real mode when backend list fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
      json: async () => ({
        detail: 'database unavailable',
      }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { listRiskTemplates } = await import('../lib/riskTemplateClient');
      const result = await listRiskTemplates({ template_type: 'FMEA', product: 'XRay' });

      expect(result.ok).toBe(false);
      expect(result.degradedToDemo).toBeUndefined();
      expect(result.message).toMatch(/database unavailable/i);
      expect(result.data).toBeUndefined();
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });
});
