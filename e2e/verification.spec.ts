import { test, expect } from '@playwright/test';

test('registration remains signed out until email is confirmed', async ({ page }) => {
  await page.route('**/api/auth/register', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ verificationRequired: true, verificationSent: true }) }));
  await page.goto('/register');
  await page.getByLabel('E-Mail Adresse', { exact: true }).fill('verification@example.invalid');
  await page.getByLabel('Vorname', { exact: true }).fill('Test');
  await page.getByLabel('Nachname', { exact: true }).fill('Account');
  await page.getByLabel('Postleitzahl', { exact: true }).fill('60311');
  await page.getByLabel('Passwort', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: 'Konto erstellen', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Bitte bestätige deine E-Mail-Adresse');
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('user_data'))).toBeNull();
});

test('confirmation needs an explicit action and handles expired links', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/auth/verify-email', route => { calls++; return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid or expired verification link' }) }); });
  await page.goto('/verify-email#token=' + 'a'.repeat(64));
  await expect(page.getByRole('button', { name: 'E-Mail bestätigen', exact: true })).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'E-Mail bestätigen', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('ungültig oder abgelaufen');
  expect(calls).toBe(1);
});


test('rejected legacy session clears stored account and stays signed out after reload', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('user_data', JSON.stringify({ id: 'legacy-user', email: 'legacy@example.invalid' })); });
  await page.route('**/api/auth/refresh', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 'EMAIL_NOT_VERIFIED', error: 'Please verify your email address before signing in.' }) }));
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('user_data'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('user_data'))).toBeNull();
});
