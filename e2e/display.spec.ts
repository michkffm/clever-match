import { test, expect } from '@playwright/test';

test('language, dark mode and text preferences remain available before login', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  const dark = page.getByRole('button', { name: 'Dark mode', exact: true });
  await dark.click();
  await expect(dark).toHaveAttribute('aria-pressed', 'true');
  const light = page.getByRole('button', { name: 'Light mode', exact: true });
  await light.click();
  await expect(light).toHaveAttribute('aria-pressed', 'true');
  await expect(dark).toHaveAttribute('aria-pressed', 'false');
  const label = page.locator('label[for="email"]');
  const normalSize = await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await page.getByRole('button', { name: 'Text size: Standard', exact: true }).click();
  const largeSize = await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(largeSize / normalSize).toBeCloseTo(1.25, 2);
  await expect(page.locator('html')).toHaveClass(/large-text/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveClass(/large-text/);
  await expect(label).toHaveCSS('font-size', `${largeSize}px`);
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

test('enlarged text stays readable on narrow screens', async ({ page }) => {
  await page.goto('/login');
  const label = page.locator('label[for="email"]');
  const original = await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await page.getByRole('button', { name: 'Textgröße: Standard', exact: true }).click();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(original * 1.25);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Hellmodus', exact: true })).toBeVisible();
  }
});
