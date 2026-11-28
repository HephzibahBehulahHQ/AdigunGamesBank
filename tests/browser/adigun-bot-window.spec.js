import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const key = 'hb:adigun-bot:gamesbank:guest:window:v1';
    const marker = 'hb:adigun-bot:gamesbank:test-storage-reset:v1';
    if (!sessionStorage.getItem(marker)) {
      localStorage.removeItem(key);
      sessionStorage.setItem(marker, '1');
    }
  });
});

test('floating Adigun BOT keeps the engineering canvas interactive and exposes window controls', async ({ page }) => {
  await page.goto('/game3/', { waitUntil: 'commit' });
  await page.getByRole('button', { name: 'Open Adigun BOT' }).click();
  const panel = page.getByRole('region', { name: 'Adigun BOT' });
  await expect(panel).toBeVisible();
  await expect(page.locator('#circuit-view')).toBeVisible();

  await page.evaluate(() => {
    window.__canvasPointerDowns = 0;
    document.querySelector('#circuit-view').addEventListener('pointerdown', () => { window.__canvasPointerDowns += 1; });
  });
  const canvas = await page.locator('#circuit-view').boundingBox();
  await page.mouse.click(canvas.x + canvas.width * 0.25, canvas.y + canvas.height * 0.25);
  await expect.poll(() => page.evaluate(() => window.__canvasPointerDowns)).toBe(1);

  await page.getByRole('button', { name: 'Minimize Adigun BOT' }).click();
  await expect(panel.locator('[data-intro]')).toBeHidden();
  await page.getByRole('button', { name: 'Restore Adigun BOT' }).click();
  await expect(panel.locator('[data-intro]')).toBeVisible();

  await page.getByRole('button', { name: 'Maximize Adigun BOT' }).click();
  await expect(panel).toHaveClass(/is-maximized/);
  await page.getByRole('button', { name: 'Restore Adigun BOT size' }).click();
  await expect(panel).not.toHaveClass(/is-maximized/);

  await panel.locator('[data-close]').click();
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Open Adigun BOT' }).click();
  await expect(panel).toBeVisible();
});

test('dragged and resized window geometry survives reload and remains in the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/game1/');
  await page.getByRole('button', { name: 'Open Adigun BOT' }).click();
  const panel = page.getByRole('region', { name: 'Adigun BOT' });

  const beforeDrag = await panel.boundingBox();
  const handle = await panel.locator('[data-drag-handle]').boundingBox();
  await page.mouse.move(handle.x + 80, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 80, handle.y + handle.height / 2 + 80);
  await page.mouse.up();
  const afterDrag = await panel.boundingBox();
  expect(afterDrag.x).toBeLessThan(beforeDrag.x - 40);
  expect(afterDrag.y).toBeGreaterThan(beforeDrag.y + 40);

  const grip = await panel.locator('[data-resize]').boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 80, grip.y - 60);
  await page.mouse.up();
  const afterResize = await panel.boundingBox();
  expect(afterResize.width).toBeGreaterThan(420);
  expect(afterResize.height).toBeLessThan(beforeDrag.height);

  await page.reload();
  await page.getByRole('button', { name: 'Open Adigun BOT' }).click();
  const restored = await page.getByRole('region', { name: 'Adigun BOT' }).boundingBox();
  expect(restored.x).toBeCloseTo(afterResize.x, 0);
  expect(restored.y).toBeCloseTo(afterResize.y, 0);
  expect(restored.width).toBeCloseTo(afterResize.width, 0);
  expect(restored.height).toBeCloseTo(afterResize.height, 0);
  expect(restored.x + restored.width).toBeLessThanOrEqual(1440);
  expect(restored.y + restored.height).toBeLessThanOrEqual(1000);
});

test('mobile Adigun BOT fits the viewport and localizes its window controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game2/');
  await page.getByRole('button', { name: 'Open Adigun BOT' }).click();
  const panel = page.getByRole('region', { name: 'Adigun BOT' });
  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);

  await panel.getByRole('combobox', { name: 'Assistant language' }).selectOption('de');
  await expect(panel.getByRole('button', { name: 'Adigun BOT minimieren' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adigun BOT minimieren' })).toHaveAttribute('title', 'Adigun BOT minimieren');
});
