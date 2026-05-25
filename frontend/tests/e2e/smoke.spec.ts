import { expect, test } from '@playwright/test';

async function installSmokeMockApiRoutes(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  await page.route('**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });

  await page.route('**/api/v1/admin/model-policy/active', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        model_id: 'llama3.1:8b',
        provider: 'ollama',
        params: { temperature: 0.2, top_p: 0.9, top_k: 40 },
      }),
    });
  });

  await page.route('**/api/v1/bridge/runtime/topology', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checked_at: new Date().toISOString(),
        orchestrator_name: 'bridge-workflow-orchestrator',
        orchestrator_mode: 'containerized-sandbox',
        topology_source: 'metadata',
        explicitly_proven: true,
        isolated_deployments: true,
        all_agents_healthy: true,
        agents: [],
        issues: [],
      }),
    });
  });
}

async function mockAuthenticatedSession(
  page: import('@playwright/test').Page,
  documents: Array<Record<string, unknown>> = [],
): Promise<void> {
  await page.route('**/api/v1/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'smoke-user@example.invalid',
        roles: ['qm_lead'],
        org: 'smoke-org',
      }),
    });
  });

  await page.route('**/api/v1/documents**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ documents }),
    });
  });
}

test.describe('Critical browser smoke', () => {
  test.beforeEach(async ({ page }) => {
    await installSmokeMockApiRoutes(page);
  });

  test('login page renders and shows authentication affordances', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login/);
    // Button label is "Station Authentication" (not "Sign In")
    await expect(page.getByRole('button', { name: /station authentication/i })).toBeVisible();
    // Inputs use label associations (htmlFor/id), not placeholder attributes
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible();
  });

  test('forgot-access page renders recovery controls', async ({ page }) => {
    await page.goto('/forgot-access');

    await expect(page).toHaveURL(/\/forgot-access/);
    // Button label is "Send Recovery Link"
    await expect(page.getByRole('button', { name: /send recovery link/i })).toBeVisible();
    // Input uses label association (htmlFor/id), not placeholder attribute
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('app root renders document hub', async ({ page }) => {
    await mockAuthenticatedSession(page, []);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /document hub/i })).toBeVisible();
  });

  test('bridge orchestration shows renamed action and no-document guidance', async ({ page }) => {
    await mockAuthenticatedSession(page, []);
    await page.goto('/bridge');

    await expect(page.getByRole('heading', { name: /workflow orchestration/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /open bridge run/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /select local file/i })).toBeVisible();

    await expect(
      page.getByText(/no documents available\. select a local document/i),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /open bridge run/i })).toBeDisabled();
  });

  test('doc bridge page shows actionable policy denial guidance', async ({ page }) => {
    await mockAuthenticatedSession(page, [
      {
        id: 'DOC-BRIDGE-FAIL-1',
        title: 'policy-denial.md',
        type: 'sop',
      },
    ]);

    await page.route('**/api/v1/bridge/alerts/eu-ai-act/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          regulatory_update: {
            requires_document_update: false,
            message: 'No requirement drift detected.',
          },
        }),
      });
    });

    await page.route('**/api/v1/bridge/run/eu-ai-act', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'validation_error',
            error_code: 'validation_error',
            reason: 'bridge_policy_routing_denied',
            message: 'Bridge fail-closed routing denied this workflow run.',
            action_points: [
              'Set active model provider to on-prem ollama.',
              "Ensure selected_inference_location is 'on_prem' for sensitive steps.",
            ],
            correlation_id: 'corr-smoke-bridge-denied',
          },
        }),
      });
    });

    await page.goto('/doc/DOC-BRIDGE-FAIL-1/bridge');

    await expect(page.getByText(/fail-closed routing denied this run/i)).toBeVisible();
    await expect(page.getByText(/set active model provider to on-prem ollama/i).first()).toBeVisible();
    await expect(page.getByText(/correlation id: corr-smoke-bridge-denied/i).first()).toBeVisible();
  });
});
