import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const user = { id: 'layout-user', firstName: 'Layout Test', email: 'layout@example.invalid' };
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64') + '.signature';
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/refresh') return route.fulfill({ json: { token, user } });
    if (path === '/api/profiles') return route.fulfill({ json: { data: [{ id: 'layout-partner', firstName: 'Layout Partner', age: 30, city: 'Testort', distance: 10, bio: 'Profil für die isolierte Layoutprüfung mit Foto und sichtbaren Aktionsschaltflächen.', hobbies: ['Musik'], photos: ['/clever-match.svg'], dances: [] }] } });
    return route.fulfill({ json: { data: [], unreadMessages: 0 } });
  });
});

for (const viewport of [{ width: 390, height: 664 }, { width: 844, height: 390 }]) {
  test(`distance slider and action buttons avoid overlap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.profile-card .photo-image')).toBeVisible();
    await expect(page.locator('dialog.filter-modal')).toBeHidden();
    await page.getByRole('button', { name: 'Textgröße: Standard', exact: true }).click();
    const actions = page.locator('.card-buttons');
    await actions.scrollIntoViewIfNeeded();
    const buttons = await actions.boundingBox();
    const tabs = await page.locator('.bottom-tabs').boundingBox();
    expect(buttons!.y + buttons!.height).toBeLessThanOrEqual(tabs!.y);
    await expect(page.getByRole('button', { name: 'Pass', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Suchkriterien', exact: true });
    await expect(dialog).toBeVisible();
    const slider = page.getByRole('slider', { name: 'Maximale Entfernung', exact: true });
    await slider.scrollIntoViewIfNeeded();
    await expect(slider).toBeVisible();
    expect(await slider.evaluate(element => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return top === element;
    })).toBe(true);
    await slider.focus();
    await page.keyboard.press('Home');
    await expect(slider).toHaveValue('1');
    await expect(slider).toHaveAttribute('aria-valuetext', '1 km');
    await page.getByRole('button', { name: 'Filter anwenden', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Keine Profile gefunden 🤔', exact: true })).toBeVisible();
  });
}
