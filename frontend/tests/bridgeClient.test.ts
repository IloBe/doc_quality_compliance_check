/// <reference path="./vitest.d.ts" />

describe('bridgeClient executeBridgeEuAiActRun', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('surfaces backend validation detail for failed runs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unprocessable Entity',
      json: async () => ({
        detail: [
          {
            loc: ['body', 'domain_info', 'description'],
            msg: 'Field required',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { executeBridgeEuAiActRun } = await import('../lib/bridgeClient');
      await expect(
        executeBridgeEuAiActRun('DOC-1', { domain: 'medical devices' }),
      ).rejects.toThrow(/domain_info\.description: Field required/i);
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });

  it('preserves stable policy error fields for UI guidance', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: new Headers({ 'X-Correlation-ID': 'corr-fallback' }),
      json: async () => ({
        error: {
          code: 'validation_error',
          error_code: 'validation_error',
          reason: 'bridge_policy_routing_denied',
          message: 'Bridge fail-closed routing denied this workflow run.',
          action_points: [
            'Set active model provider to on-prem ollama.',
            "Ensure selected_inference_location is 'on_prem' for all personal-data-possible steps.",
          ],
          correlation_id: 'corr-psc-42',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { executeBridgeEuAiActRun, BridgeApiError } = await import('../lib/bridgeClient');
      await expect(
        executeBridgeEuAiActRun('DOC-1', { domain: 'medical devices' }),
      ).rejects.toBeInstanceOf(BridgeApiError);

      try {
        await executeBridgeEuAiActRun('DOC-1', { domain: 'medical devices' });
      } catch (error) {
        expect(error).toBeInstanceOf(BridgeApiError);
        const typed = error as InstanceType<typeof BridgeApiError>;
        expect(typed.errorCode).toBe('validation_error');
        expect(typed.reason).toBe('bridge_policy_routing_denied');
        expect(typed.actionPoints.length).toBeGreaterThan(0);
        expect(typed.correlationId).toBe('corr-psc-42');
      }
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });
});

describe('bridgeClient fetchBridgeRuntimeTopology', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('surfaces backend topology detail for failed fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable',
      json: async () => ({
        error: {
          message: 'Bridge runtime self-check failed.',
          reason: 'bridge_runtime_not_ready',
          details: [
            'container runtime probe failed for agent inspection (bridge-agent-inspection); strict docker_inspect proof required',
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { fetchBridgeRuntimeTopology } = await import('../lib/bridgeClient');
      await expect(fetchBridgeRuntimeTopology()).rejects.toThrow(/runtime self-check failed/i);
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });
});

describe('bridgeClient fetchBridgeRunById', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('falls back to the latest run for a document id when exact run id is absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          run_id: 'RUN-001',
          document_id: 'DOC-XRAY',
          document_name: 'xray complaint',
          document_type: 'risk_assessment',
          project_id: 'AI-Diagnostics-Core',
          started_at: '2026-05-10T10:00:00Z',
          completed_at: '2026-05-10T10:05:00Z',
          status: 'completed',
          automatic_recommendation: 'rejected',
          human_review_required: true,
          human_review_status: 'pending',
          compliance_score: 0.61,
          checked_frameworks: ['eu_ai_act'],
        },
        {
          run_id: 'RUN-002',
          document_id: 'DOC-XRAY',
          document_name: 'xray complaint',
          document_type: 'risk_assessment',
          project_id: 'AI-Diagnostics-Core',
          started_at: '2026-05-11T10:00:00Z',
          completed_at: '2026-05-11T10:05:00Z',
          status: 'completed',
          automatic_recommendation: 'approved',
          human_review_required: true,
          human_review_status: 'pending',
          compliance_score: 0.77,
          checked_frameworks: ['eu_ai_act', 'gdpr'],
        },
      ]),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const previousMode = process.env.NEXT_PUBLIC_APP_MODE;
    process.env.NEXT_PUBLIC_APP_MODE = 'real';

    try {
      const { fetchBridgeRunById } = await import('../lib/bridgeClient');
      const result = await fetchBridgeRunById('DOC-XRAY');

      expect(result?.run_id).toBe('RUN-002');
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/bridge/runs', {
        method: 'GET',
        credentials: 'include',
      });
    } finally {
      process.env.NEXT_PUBLIC_APP_MODE = previousMode;
    }
  });
});
