import { test, expect } from '@playwright/test';

const SAVE_KEY = 'adigun.campaign.v1.binary-flash';

async function stageNine(page, keyboard = false) {
  for (const bit of [3, 0]) {
    if (keyboard) await page.locator(`#bit-${bit}`).press('Enter');
    else await page.locator(`#bit-${bit}`).click();
  }
  await page.locator('#latch').press('Enter');
  await expect(page.locator('#register-word')).toHaveText('1001');
  await expect(page.locator('#register-value')).toHaveText('9');
}

async function serialSeven(page) {
  await page.locator('#serial-data').press('Enter');
  await page.locator('#clock').press('Enter');
  await expect(page.locator('#register-word')).toHaveText('0011');
  await page.locator('#clock').press('Enter');
  await expect(page.locator('#register-word')).toHaveText('0111');
  await expect(page.locator('#input-word')).toHaveText('1001');
  await page.locator('#parity').press('Enter');
  await page.locator('#transmit').press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won');
}

test('Binary Flash renders a real 4K register and saves an ordered packet through parallel and serial controls', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game7/');
  const canvas = page.locator('#binary-canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 20000 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-frame'))).toBeGreaterThan(0);
  const previous = Number(await canvas.getAttribute('data-frame'));
  await page.locator('#quality').selectOption('4k');
  await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await expect.poll(async () => Number(await canvas.getAttribute('data-frame')), { timeout: 20000 }).toBeGreaterThan(previous);
  await canvas.screenshot({ path: testInfo.outputPath('binary-flash-4k.png') });
  const buffer = await canvas.evaluate(element => {
    const gl = element.getContext('webgl2');
    return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() };
  });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('binary-flash-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await page.setViewportSize({ width: 800, height: 900 });
  await page.locator('#quality').selectOption('auto');
  await page.locator('#start').click();
  await expect(page.locator('#bit-3')).toBeFocused();

  // These actual canvas commands exercise bounded selection and two reversible
  // bit changes. They do not install or inject a winning game state.
  await canvas.press('ArrowLeft'); await canvas.press('ArrowUp');
  await expect(page.locator('#bit-3')).toHaveAttribute('data-selected', 'true');
  await canvas.press('ArrowRight'); await canvas.press('Enter');
  await expect(page.locator('#input-word')).toHaveText('0100');
  await canvas.press('Enter');
  await expect(page.locator('#input-word')).toHaveText('0000');
  await stageNine(page);
  await expect(page.locator('#operations-used')).toHaveText('5 used');
  await page.locator('#pause').click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('#transmit')).toBeDisabled();
  await canvas.press('t'); await canvas.press('Enter');
  await expect(page.locator('#operations-used')).toHaveText('5 used');
  await expect(page.locator('#received-count')).toHaveText('0 / 2');
  await page.locator('#pause').press('Enter');
  await page.locator('#transmit').click();
  await expect(page.locator('#received-count')).toHaveText('1 / 2');
  await expect(page.locator('#target-value')).toHaveText('7');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await serialSeven(page);
  await expect(page.locator('#received-count')).toHaveText('2 / 2');
  await expect(page.locator('#clock-count')).toHaveText('2');
  await expect(page.locator('#operations-used')).toHaveText('11 used');
  await expect(page.locator('#fault-count')).toHaveText('0 rejected frames');
  await expect(page.locator('#packet-list li[data-state="received"]')).toHaveCount(2);
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('binary-flash-commissioned.png'), fullPage: true });
  await page.locator('#next-level').click();
  await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'ready');
  await page.reload();
  await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#unlock-status')).toContainText('Mission 2 of 10,000 unlocked');
  expect(errors).toEqual([]);
});

test('Binary Flash keeps visible keyboard controls without WebGL and rejects bad values and parity before a complete retry', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game7/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await expect(page.locator('#binary-canvas')).not.toHaveAttribute('data-renderer', 'WebGL2');
  await page.locator('#start').press('Enter');
  await page.locator('#transmit').press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'working');
  await expect(page.locator('#received-count')).toHaveText('0 / 2');
  await page.locator('#transmit').press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'lost');
  await expect(page.locator('#fault-count')).toHaveText('2 rejected frames');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.locator('#retry').press('Enter');
  await expect(page.locator('#operations-used')).toHaveText('0 used');
  await expect(page.locator('#level')).toHaveValue('1');
  await page.locator('#start').press('Enter');
  await page.locator('#bit-3').press('ArrowUp'); await page.locator('#bit-3').press('ArrowLeft');
  await expect(page.locator('#bit-3')).toBeFocused();
  const focus = await page.locator('#bit-3').evaluate(element => ({ active: document.activeElement === element, style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus.active).toBe(true); expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await stageNine(page, true);
  await page.locator('#parity').press('Space');
  await page.locator('#transmit').press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'working');
  await expect(page.locator('#received-count')).toHaveText('0 / 2');
  await expect(page.locator('#fault-count')).toHaveText('1 rejected frame');
  await expect(page.locator('#message')).toContainText('parity');
  await page.locator('#parity').press('Enter');
  await page.locator('#transmit').press('Enter');
  await expect(page.locator('#received-count')).toHaveText('1 / 2');
  for (const bit of [3, 2, 1]) await page.locator(`#bit-${bit}`).press('Enter');
  await page.locator('#latch').press('Enter');
  await page.locator('#parity').press('Enter');
  await page.locator('#transmit').press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won');
  await expect(page.locator('#register-word')).toHaveText('0111');
  await expect(page.locator('#operations-used')).toHaveText('13 used');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  await page.screenshot({ path: testInfo.outputPath('binary-flash-keyboard-win.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('Binary Flash reports session-only packet progress when storage silently refuses writes', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
    Storage.prototype.setItem = function () {};
  });
  await page.goto('/game7/');
  await page.locator('#start').press('Enter');
  await stageNine(page, true);
  await page.locator('#transmit').press('Enter');
  await serialSeven(page);
  await expect(page.locator('#save-status')).toContainText('session only');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.locator('#next-level').click();
  await expect(page.locator('#level')).toHaveValue('2');
  await page.reload(); await expect(page.locator('#level')).toHaveValue('1');
});

test('Binary Flash contains a sixteen-bit saved-layout fixture at 390 and 320 pixel widths', async ({ page }, testInfo) => {
  // This valid-save fixture opens the widest layout. It does not demonstrate
  // completion of 8,000 missions; completion coverage uses real engine commands.
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, completed: 8000, unlocked: 8001 })), SAVE_KEY);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game7/');
  await expect(page.locator('.bit-button')).toHaveCount(16);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to register controls', exact: true })).toBeFocused();
  expect(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.locator('#start').click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.viewport + 1);
    const target = await page.locator('#bit-15').boundingBox();
    expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44);
  }
  await page.locator('#bit-0').press('ArrowDown'); await page.locator('#bit-0').press('ArrowRight');
  await expect(page.locator('#bit-0')).toBeFocused();
  await expect(page.locator('#bit-0')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#operations-used')).toHaveText('0 used');
  await page.screenshot({ path: testInfo.outputPath('binary-flash-mobile-320.png'), fullPage: true });
});
