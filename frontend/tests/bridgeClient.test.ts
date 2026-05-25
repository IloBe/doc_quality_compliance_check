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
      await expect(fetchBridgeRuntimeTopology()).rejects.toThrow(/bridge_runtime_not_ready/i);
    } finally {
      process.env.NEXT_PUBLIC_BRIDGE_SOURCE = previousSource;
    }
  });
});
