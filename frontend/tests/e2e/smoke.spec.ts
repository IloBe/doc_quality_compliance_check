import { expect, test } from '@playwright/test';

test.describe('Critical browser smoke', () => {
  test('login page renders and shows authentication affordances', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible();
  });

  test('forgot-access page renders recovery controls', async ({ page }) => {
    await page.goto('/forgot-access');

    await expect(page).toHaveURL(/\/forgot-access/);
    await expect(page.getByRole('button', { name: /send reset|request/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('unauthenticated access to app root redirects to login', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
