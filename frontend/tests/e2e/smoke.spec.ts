import { expect, test } from '@playwright/test';

test.describe('Critical browser smoke', () => {
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

  // NOTE: authClient.ts is currently a mocked stub that always returns a default user.
  // Root therefore always renders the Document Hub rather than redirecting to /login.
  // This test verifies the current actual behavior; update when real auth is wired in.
  test('app root renders document hub', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /document hub/i })).toBeVisible();
  });
});
