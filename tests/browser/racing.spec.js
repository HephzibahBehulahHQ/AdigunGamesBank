import { test, expect } from '@playwright/test';

const SAVE_KEY = 'adigun.campaign.v1.apex-circuit';

async function finishThroughStepControls(page) {
  for (let input = 0; input < 100 && await page.locator('#phase').getAttribute('data-phase') === 'running'; input++) {
    await page.getByRole('button', { name: 'Drive ½ second', exact: true }).press('Enter');
  }
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won');
}

test('APEX renders a real 4K frame and qualifies through keyboard and step driving', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game10/');
  const canvas = page.locator('#race-canvas');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'ready');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 20000 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-frame'))).toBeGreaterThan(0);
  const frameBefore = Number(await canvas.getAttribute('data-frame'));
  await page.locator('#quality').selectOption('4k');
  await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await expect.poll(async () => Number(await canvas.getAttribute('data-frame')), { timeout: 20000 }).toBeGreaterThan(frameBefore);
  await canvas.screenshot({ path: testInfo.outputPath('apex-4k.png') });
  const buffer = await canvas.evaluate(element => {
    const gl = element.getContext('webgl2');
    return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() };
  });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('apex-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });

  // Software rendering verifies the drawing buffer, not physical-device frame rate.
  await page.setViewportSize({ width: 800, height: 900 });
  await page.locator('#quality').selectOption('auto');
  await page.locator('#start').click();
  await expect(canvas).toBeFocused();
  await page.keyboard.down('ArrowUp'); await page.keyboard.down('ArrowRight');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(10);
  await page.keyboard.press('Space');
  await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowRight');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'paused');
  const time = await page.locator('#elapsed').textContent(), position = await page.locator('#map-car').getAttribute('transform');
  await page.waitForTimeout(350); // Bounded observation of a paused clock and vehicle.
  expect(await page.locator('#elapsed').textContent()).toBe(time);
  expect(await page.locator('#map-car').getAttribute('transform')).toBe(position);
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();

  await page.locator('#steering').press('End'); await page.locator('#throttle').press('End');
  await expect(page.locator('#steering-value')).toHaveText('+100%');
  await expect(page.locator('#throttle-value')).toHaveText('100%');
  await page.locator('#drive-mode').selectOption('step');
  await page.getByRole('button', { name: 'Resume race', exact: true }).press('Enter');
  await finishThroughStepControls(page);
  await expect(page.locator('#gate-count')).toHaveText('12 / 12 gates');
  await expect(page.locator('#penalty')).toHaveText('0.0 s penalty');
  await expect(page.locator('#message')).toContainText('All 12 gates verified');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('apex-qualified.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next race →', exact: true }).click();
  await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#gate-count')).toHaveText('0 / 12 gates');
  await page.reload();
  await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#unlock-status')).toContainText('Race 2 of 10,000 unlocked');
  expect(errors).toEqual([]);
});

test('APEX keeps visible keyboard controls without WebGL and rejects a grass shortcut before recovery', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
  });
  await page.setViewportSize({ width: 800, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game10/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await expect(page.locator('#drive-mode')).toHaveValue('step');
  await expect(page.locator('#race-canvas')).not.toHaveAttribute('data-renderer', 'WebGL2');
  await page.locator('#throttle').press('End');
  const focus = await page.locator('#throttle').evaluate(element => ({ active: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus.active).toBe(true); expect(focus.outline).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Start race', exact: true }).press('Enter');
  for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Drive ½ second', exact: true }).press('Enter');
  await expect(page.locator('#track-state')).toHaveText('RECOVER');
  await expect(page.locator('#message')).toContainText('Track limits exceeded');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  const gates = await page.locator('#gate-count').textContent(), before = Number(await page.locator('#elapsed').textContent());
  await page.getByRole('button', { name: 'Recover car (+5 s)', exact: true }).press('Enter');
  await expect(page.locator('#gate-count')).toHaveText(gates);
  expect(Number(await page.locator('#elapsed').textContent())).toBeCloseTo(before + 5, 1);
  await expect(page.locator('#track-state')).toHaveText('CLEAN');
  await page.locator('#steering').press('End');
  await finishThroughStepControls(page);
  await expect(page.locator('#penalty')).toHaveText('8.0 s penalty');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  await page.screenshot({ path: testInfo.outputPath('apex-command-recovery.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('APEX reflows at 390 and 320 pixels and offers a fixed reduced-motion camera', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game10/');
  await expect(page.locator('#camera')).toHaveValue('circuit');
  await expect(page.locator('#camera')).toBeDisabled();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to race controls', exact: true })).toBeFocused();
  expect(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.viewport + 1);
    for (const id of ['steer-left', 'steer-right', 'accelerate', 'brake']) {
      const rectangle = await page.locator(`#${id}`).boundingBox();
      expect(rectangle.width).toBeGreaterThanOrEqual(44); expect(rectangle.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.screenshot({ path: testInfo.outputPath('apex-mobile-320.png'), fullPage: true });
});
