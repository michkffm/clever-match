import { test, expect } from '@playwright/test';

test('language, dark mode and text preferences remain available before login', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  const dark = page.getByRole('button', { name: 'Dark mode', exact: true });
  const before = await dark.getAttribute('aria-pressed');
  await dark.click();
  await expect(dark).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  await page.getByRole('button', { name: 'Larger text', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/large-text/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveClass(/large-text/);
});

test('mobile controls and form fit the viewport and offer keyboard navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('Passwort anzeigen', { exact: true })).toBeVisible();
});
