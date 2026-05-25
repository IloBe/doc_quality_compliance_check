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

    const previousSource = process.env.NEXT_PUBLIC_BRIDGE_SOURCE;
    process.env.NEXT_PUBLIC_BRIDGE_SOURCE = 'backend';

    try {
      const { executeBridgeEuAiActRun } = await import('../lib/bridgeClient');
      await expect(
        executeBridgeEuAiActRun('DOC-1', { domain: 'medical devices' }),
      ).rejects.toThrow(/domain_info\.description: Field required/i);
    } finally {
      process.env.NEXT_PUBLIC_BRIDGE_SOURCE = previousSource;
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

    const previousSource = process.env.NEXT_PUBLIC_BRIDGE_SOURCE;
    process.env.NEXT_PUBLIC_BRIDGE_SOURCE = 'backend';

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
      process.env.NEXT_PUBLIC_BRIDGE_SOURCE = previousSource;
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

    const previousSource = process.env.NEXT_PUBLIC_BRIDGE_SOURCE;
    process.env.NEXT_PUBLIC_BRIDGE_SOURCE = 'backend';

    try {
      const { fetchBridgeRuntimeTopology } = await import('../lib/bridgeClient');
      await expect(fetchBridgeRuntimeTopology()).rejects.toThrow(/runtime self-check failed/i);
    } finally {
      process.env.NEXT_PUBLIC_BRIDGE_SOURCE = previousSource;
    }
  });
});
