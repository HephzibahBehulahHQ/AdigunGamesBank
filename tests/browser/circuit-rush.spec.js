import { test, expect } from '@playwright/test';

const SAVE_KEY = 'adigun.campaign.v1.circuit-rush';
const FIRST_ROUTE = [1, 2, 7, 12, 13, 14, 19];

async function solveFirstJob(page, keyboard = false) {
  for (const index of FIRST_ROUTE) {
    if (keyboard) await page.locator(`#cell-${index}`).press('r');
    else { await page.locator(`#cell-${index}`).click(); await page.getByRole('button', { name: 'Rotate clockwise', exact: true }).click(); }
  }
  await page.getByRole('button', { name: 'Test circuit', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won');
}

test('Circuit Rush renders a real 4K frame and commissions a saved job through actual terminal controls', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game2/');
  const canvas = page.locator('#circuit-canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 20000 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-frame'))).toBeGreaterThan(0);
  const previous = Number(await canvas.getAttribute('data-frame'));
  await page.locator('#quality').selectOption('4k');
  await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await expect.poll(async () => Number(await canvas.getAttribute('data-frame')), { timeout: 20000 }).toBeGreaterThan(previous);
  await canvas.screenshot({ path: testInfo.outputPath('circuit-rush-4k.png') });
  const buffer = await canvas.evaluate(element => {
    const gl = element.getContext('webgl2'); return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() };
  });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('circuit-rush-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await page.setViewportSize({ width: 800, height: 900 });
  await page.locator('#quality').selectOption('auto');
  await page.getByRole('button', { name: 'Begin job', exact: true }).click();
  await page.getByRole('button', { name: 'Test circuit', exact: true }).click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'editing');
  await expect(page.locator('#network-status')).toHaveText('OPEN');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();

  // Check boundary navigation and both real canvas rotation commands, leaving
  // the first wire in its original orientation before solving normally.
  await canvas.press('ArrowUp'); await canvas.press('ArrowLeft');
  await expect(page.locator('#selected-label')).toHaveText('A1 · Supply');
  await canvas.press('ArrowRight'); await canvas.press('Enter');
  await expect(page.locator('#selected-label')).toHaveText('B1 · Wire');
  await canvas.press('Backspace');
  await expect(page.locator('#turns-used')).toHaveText('2 quarter-turns used');
  await page.getByRole('button', { name: 'Pause job', exact: true }).click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('#rotate-cw')).toBeDisabled();
  await page.locator('#cell-1').press('r');
  await expect(page.locator('#turns-used')).toHaveText('2 quarter-turns used');
  await page.getByRole('button', { name: 'Resume job', exact: true }).press('Enter');
  await solveFirstJob(page);
  await expect(page.locator('#loads-powered')).toHaveText('1 / 1');
  await expect(page.locator('#current')).toHaveText('100.0');
  await expect(page.locator('#network-status')).toHaveText('PASSED');
  await expect(page.locator('#supply-state')).toHaveText('SUPPLY ENERGIZED');
  await expect(page.locator('#turns-used')).toHaveText('9 quarter-turns used');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('circuit-rush-commissioned.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next job →', exact: true }).click();
  await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'ready');
  await page.reload(); await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#unlock-status')).toContainText('Job 2 of 10,000 unlocked');
  expect(errors).toEqual([]);
});

test('Circuit Rush keeps visible keyboard controls without WebGL and retries a real short-circuit failure', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game2/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await expect(page.locator('#circuit-canvas')).not.toHaveAttribute('data-renderer', 'WebGL2');
  await page.getByRole('button', { name: 'Begin job', exact: true }).press('Enter');
  await page.locator('#cell-0').press('ArrowUp');
  await expect(page.locator('#cell-0')).toBeFocused();
  await page.locator('#cell-0').press('ArrowLeft');
  await expect(page.locator('#cell-0')).toBeFocused();
  for (const index of [1, 2, 7]) await page.locator(`#cell-${index}`).press('r');
  const focus = await page.locator('#cell-7').evaluate(element => ({ active: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus.active).toBe(true); expect(focus.outline).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Test circuit', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'lost');
  await expect(page.locator('#network-status')).toHaveText('SHORT');
  await expect(page.locator('#message')).toContainText('short to return at B3');
  await expect(page.locator('#current')).toHaveText('TRIP');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Restart job', exact: true }).press('Enter');
  await expect(page.locator('#level')).toHaveValue('1');
  await expect(page.locator('#turns-used')).toHaveText('0 quarter-turns used');
  await page.getByRole('button', { name: 'Begin job', exact: true }).press('Enter');
  await solveFirstJob(page, true);
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  await expect(page.locator('#turns-used')).toHaveText('7 quarter-turns used');
  await page.screenshot({ path: testInfo.outputPath('circuit-rush-command-win.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('Circuit Rush reports session-only progress when browser storage silently rejects writes', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
    Storage.prototype.setItem = function () {};
  });
  await page.goto('/game2/');
  await page.getByRole('button', { name: 'Begin job', exact: true }).press('Enter');
  await solveFirstJob(page, true);
  await expect(page.locator('#save-status')).toContainText('session only');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Next job →', exact: true }).click();
  await expect(page.locator('#level')).toHaveValue('2');
  await page.reload(); await expect(page.locator('#level')).toHaveValue('1');
});

test('Circuit Rush keeps a seven-column saved-layout fixture inside 390 and 320 pixel screens', async ({ page }, testInfo) => {
  // A previously completed-save fixture tests the largest layout only. It is
  // not evidence that a user completed 6,000 jobs or that those jobs ran here.
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, completed: 6000, unlocked: 6001 })), SAVE_KEY);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game2/');
  await expect(page.locator('.terminal-cell')).toHaveCount(49);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to routing controls', exact: true })).toBeFocused();
  expect(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.viewport + 1);
    const target = await page.locator('#cell-0').boundingBox();
    expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44);
  }
  await page.locator('#cell-48').press('ArrowDown'); await page.locator('#cell-48').press('ArrowRight');
  await expect(page.locator('#cell-48')).toBeFocused();
  await expect(page.locator('#selected-label')).toHaveText('G7 · Required load');
  await page.screenshot({ path: testInfo.outputPath('circuit-rush-mobile-320.png'), fullPage: true });
});
