/// <reference path="./vitest.d.ts" />

describe('riskActionClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('maps persisted audit trail events in real mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            event_id: 'evt_1',
            event_type: 'risk.action.approve',
            actor_id: 'auditor@example.com',
            subject_id: 'RISK-1',
            event_time: '2026-01-01T10:00:00Z',
            created_at: '2026-01-01T10:00:00Z',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { fetchRiskActions } = await import('../lib/riskActionClient');
      const result = await fetchRiskActions(100);

      expect(result.degradedToDemo).toBeUndefined();
      expect(result.message).toBeUndefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.record_id).toBe('RISK-1');
      expect(result.items[0]?.action_type).toBe('approve');
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/audit-trail/events?limit=100&event_type=risk.action.', {
        method: 'GET',
        credentials: 'include',
      });
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });

  it('returns backend detail on append failure in real mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
      json: async () => ({
        detail: 'role not permitted',
      }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { appendRiskAction } = await import('../lib/riskActionClient');
      const result = await appendRiskAction({
        record_id: 'RISK-2',
        action_type: 'submit_for_review',
        actor_email: 'engineer@example.com',
      });

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/role not permitted/i);
      expect(result.degradedToDemo).toBeUndefined();
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });
});
