import { test, expect } from '@playwright/test';

test('incoming messages appear in the open chat and send failures are explained', async ({ page }) => {
  const user = { id: 'a', firstName: 'UI Test', email: 'ui@example.invalid' };
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.signature';
  const messages: { id: string; senderId: string; text: string; createdAt: string }[] = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = {};
    if (path === '/api/auth/refresh') data = { token, user };
    else if (path === '/api/matches') data = { data: [{ id: 'match', userId: 'b' }] };
    else if (path === '/api/profiles/b') data = { id: 'b', firstName: 'Partner' };
    else if (path === '/api/messages/match') data = { data: messages };
    else if (path === '/api/blocks') data = { data: [] };
    else if (path === '/api/notifications') data = { data: [], unreadMessages: 0 };
    if (path === '/api/messages' && route.request().method() === 'POST') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Conversation blocked' }) });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  let receive: (() => void) | undefined;
  await page.routeWebSocket(/\/ws\/chat\?/, socket => {
    socket.onMessage(() => socket.send(JSON.stringify({ type: 'joined' })));
    receive = () => socket.send(JSON.stringify({ type: 'messages:new' }));
  });
  await page.goto('/chat/match');
  await expect(page.getByRole('heading', { name: 'Partner', exact: true })).toBeVisible();
  await expect.poll(() => Boolean(receive)).toBe(true);
  messages.push({ id: 'message', senderId: 'b', text: 'Live-Nachricht im offenen Chat', createdAt: new Date().toISOString() });
  receive!();
  await expect(page.getByRole('log')).toContainText('Live-Nachricht im offenen Chat');
  await page.getByRole('textbox', { name: 'Deine Nachricht', exact: true }).fill('Nicht zustellbarer Test');
  await page.getByRole('button', { name: 'Send Message', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nachricht konnte nicht gesendet werden');
  await expect(page.getByRole('textbox', { name: 'Deine Nachricht', exact: true })).toHaveValue('Nicht zustellbarer Test');
});

test('settings toggles are reachable by keyboard and preserve privacy setting', async ({ page }) => {
  const user = { id: 'a', firstName: 'UI Test', email: 'ui@example.invalid' };
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.signature';
  let privateProfile = false;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/refresh') return route.fulfill({ json: { token, user } });
    if (path === '/api/profile') {
      if (route.request().method() === 'PUT') privateProfile = route.request().postDataJSON().privateProfile;
      return route.fulfill({ json: { ...user, privateProfile } });
    }
    return route.fulfill({ json: { data: [], unreadMessages: 0 } });
  });
  await page.goto('/settings');
  const checkbox = page.getByRole('checkbox', { name: 'Privates Profil', exact: true });
  await expect(checkbox).toBeVisible();
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await expect.poll(() => privateProfile).toBe(true);
  await page.reload();
  await expect(checkbox).toBeChecked();
});
