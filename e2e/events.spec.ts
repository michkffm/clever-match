import { test, expect } from '@playwright/test';

test('singles events have bilingual empty states and hide legacy dance events', async ({ page }) => {
  const user = { id: 'event-user', firstName: 'Test', email: 'event@example.invalid' };
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.signature';
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/refresh') return route.fulfill({ json: { token, user } });
    if (path === '/api/events') return route.fulfill({ json: { data: [{ id: 'legacy-event', title: 'Salsa Night', danceStyle: 'salsa' }] } });
    return route.fulfill({ json: { data: [], unreadMessages: 0 } });
  });
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Single-Events', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Aktuell sind keine Single-Events veröffentlicht.');
  await expect(page.getByText('Salsa Night')).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByRole('heading', { name: 'Singles events', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('No singles events are currently published.');
});

test('published singles events support search, details and registration', async ({ page }) => {
  const user = { id: 'event-user', firstName: 'Test', email: 'event@example.invalid' };
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.signature';
  const event = { id: 'singles-event', category: 'singles', title: 'Singles meetup', description: 'Isolated event fixture', location: 'Test location', date: '2099-01-15T18:00:00Z', organizer: { id: 'organizer', name: 'Test organizer' }, registered: false };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/refresh') return route.fulfill({ json: { token, user } });
    if (path.endsWith('/register')) { event.registered = route.request().method() === 'POST'; return route.fulfill({ json: event }); }
    if (path === '/api/events') return route.fulfill({ json: { data: [event] } });
    return route.fulfill({ json: { data: [], unreadMessages: 0 } });
  });
  await page.goto('/events');
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  const details = page.getByRole('dialog', { name: 'Singles meetup' });
  await expect(details).toContainText('Test organizer');
  await details.getByRole('button', { name: 'Schließen' }).click();
  await page.getByRole('button', { name: 'Zum Event anmelden' }).click();
  await page.getByRole('button', { name: 'Anmeldung zurücknehmen' }).click();
  await expect(page.getByRole('button', { name: 'Zum Event anmelden' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Single-Events suchen' }).fill('unmatched');
  await expect(page.getByRole('status')).toHaveText('Keine Single-Events passen zu deiner Suche.');
});
