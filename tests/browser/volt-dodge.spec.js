import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_KEY = 'adigun.campaign.v1.volt-dodge';
const move = (page, direction) => page.getByRole('button', { name: `Move ${direction}`, exact: true });
async function clearFirstSector(page, keyboard = false) {
  const start = page.getByRole('button', { name: 'Start mission', exact: true });
  if (keyboard) await start.press('Enter'); else await start.click();
  // These are the same visible commands available to a player. No position,
  // timer, pickup, shield or campaign state is injected into the application.
  for (const [direction, count] of [['east', 6], ['south', 6], ['west', 6]]) for (let step = 0; step < count; step++) {
    if (keyboard) await move(page, direction).press('Enter'); else await move(page, direction).click();
  }
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won');
  await expect(page.locator('#core-count')).toHaveText('3 / 3');
  await expect(page.locator('#shields')).toHaveText('3 / 3');
  await expect(page.locator('#exit-status')).toContainText('Exit reached');
}
async function noWebGL(page) {
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); }; });
}

test('Volt Dodge renders an actual 4K arena, moves with keyboard, requires every core and saves a control-driven exit', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/game4/');
  const canvas = page.locator('#volt-canvas'); await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 20000 });
  await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('4k'); await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await canvas.screenshot({ path: testInfo.outputPath('volt-dodge-4k.png') });
  const buffer = await canvas.evaluate(element => { const gl = element.getContext('webgl2'); return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() }; });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 }); await testInfo.attach('volt-dodge-4k-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await page.setViewportSize({ width: 800, height: 1000 }); await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('auto');
  await page.getByRole('button', { name: 'Top view', exact: true }).click(); await page.getByRole('button', { name: 'Arena view', exact: true }).click();
  await page.getByRole('button', { name: 'Start mission', exact: true }).click(); await expect(canvas).toBeFocused();
  await page.keyboard.down('d');
  try { await expect.poll(async () => Number(await page.locator('#position').getAttribute('data-x')), { timeout: 10000 }).toBeGreaterThan(1.15); }
  finally { await page.keyboard.up('d'); }
  await canvas.press('Space'); await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'paused');
  const paused = await page.locator('.telemetry').innerText(); await page.waitForTimeout(400); expect(await page.locator('.telemetry').innerText()).toBe(paused);
  await page.getByRole('button', { name: 'Retry sector', exact: true }).click(); await page.getByRole('combobox', { name: 'Control mode', exact: true }).selectOption('step');
  await page.getByRole('button', { name: 'Start mission', exact: true }).click();
  for (let step = 0; step < 6; step++) await move(page, 'south').click();
  await expect(page.locator('#position')).toHaveText('1.00, 7.00'); await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'running');
  await expect(page.locator('#core-count')).toHaveText('0 / 3'); await expect(page.locator('#exit-status')).toContainText('Locked');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Retry sector', exact: true }).click(); await clearFirstSector(page);
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('volt-dodge-sector-clear.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next sector →', exact: true }).click(); await expect(page.getByRole('spinbutton', { name: 'Sector', exact: true })).toHaveValue('2');
  await page.reload(); await expect(page.getByRole('spinbutton', { name: 'Sector', exact: true })).toHaveValue('2'); await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'ready');
  await expect(page.getByRole('combobox', { name: 'Control mode', exact: true })).toHaveValue('step'); expect(errors).toEqual([]);
});

test('Volt Dodge keeps visible keyboard commands without WebGL and retries a real spark failure', async ({ page }, testInfo) => {
  test.setTimeout(60000); await noWebGL(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/game4/');
  await expect(page.locator('#graphics-fallback')).toBeVisible(); await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await expect(page.locator('#map-details')).toHaveAttribute('open', ''); await expect(page.getByRole('combobox', { name: 'Control mode', exact: true })).toHaveValue('step');
  const start = page.getByRole('button', { name: 'Start mission', exact: true }); await start.focus();
  const focus = await start.evaluate(element => ({ active: document.activeElement === element, style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus.active).toBe(true); expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await start.press('Enter'); await move(page, 'east').press('Enter'); await move(page, 'south').press('Enter');
  await expect(page.locator('#shields')).toHaveText('2 / 3');
  for (let wait = 0; wait < 4 && await page.locator('#phase').getAttribute('data-phase') !== 'lost'; wait++) await page.locator('#wait').press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'lost'); await expect(page.locator('#shields')).toHaveText('0 / 3'); await expect(page.locator('#message')).toContainText('spark collision');
  await expect(page.locator('#next-level')).toBeHidden(); expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Retry sector', exact: true }).press('Enter'); await expect(page.locator('#shields')).toHaveText('3 / 3'); await expect(page.locator('#time-left')).toHaveText('25.0 s');
  await clearFirstSector(page, true); await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  await page.screenshot({ path: testInfo.outputPath('volt-dodge-command-recovery.png'), fullPage: true }); expect(errors).toEqual([]);
});

test('Volt Dodge has accessible controls and a coordinate map without overflow at 390 and 320 pixels', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/game4/');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'ready'); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to game controls', exact: true })).toBeFocused();
  await page.getByText('Coordinate map and route inspection', { exact: true }).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 }); const bounds = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(bounds[0]).toBeLessThanOrEqual(bounds[1] + 1);
  }
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('volt-dodge-accessibility', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('volt-dodge-mobile-320.png'), fullPage: true });
});

test('Volt Dodge discloses session-only progress when campaign storage silently rejects a completed sector', async ({ page }) => {
  await noWebGL(page);
  await page.addInitScript(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'adigun.campaign.v1.volt-dodge') return; return original.call(this, key, value); }; });
  await page.goto('/game4/'); await expect(page.locator('#graphics-fallback')).toBeVisible(); await clearFirstSector(page, true);
  await expect(page.locator('#save-status')).toContainText('session only'); expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull(); await expect(page.getByRole('button', { name: 'Next sector →', exact: true })).toBeVisible();
});
