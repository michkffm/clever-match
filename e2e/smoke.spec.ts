import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' }),
    });
  });

  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Willkommen zurück')).toBeVisible();
});

test('protected route redirects to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
