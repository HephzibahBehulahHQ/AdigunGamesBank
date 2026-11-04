import { test, expect } from '@playwright/test';

const SAVE_KEY = 'adigun.campaign.v1.genesis-ark';
const CARGO = ['Grain stores', 'Fresh-water casks', 'Fodder bundles', 'Animal shelter supplies', 'Repair timbers', 'Family provisions'];
const FIRST_PLACEMENT = [0, 1, 3, 2, 5, 4];

// Every change below is a player input. No campaign or engine state is injected.
async function loadFirstVoyage(page, keyboardOnly = false, ballasted = true) {
  for (const [index, bayIndex] of FIRST_PLACEMENT.entries()) {
    const cargo = page.locator(`#cargo-${index}`), bay = page.locator(`#bay-${bayIndex}`);
    if (keyboardOnly) {
      await cargo.press('Enter');
      await bay.press('Enter');
      await page.getByRole('button', { name: 'Load selected cargo', exact: true }).press('Enter');
    } else if (index === 0) {
      await cargo.press('Enter');
      const canvas = page.locator('#ark-canvas');
      await canvas.press('ArrowDown');
      await expect(page.locator('#selected-bay-label')).toHaveText('Aft port');
      await canvas.press('ArrowUp'); await canvas.press('ArrowUp'); await canvas.press('ArrowRight');
      await canvas.press('ArrowUp');
      await expect(page.locator('#selected-bay-label')).toHaveText('Fore starboard');
      await canvas.press('ArrowDown'); await canvas.press('ArrowDown'); await canvas.press('ArrowLeft');
      await canvas.press('ArrowRight');
      await expect(page.locator('#selected-bay-label')).toHaveText('Aft starboard');
      await canvas.press('ArrowLeft');
      await canvas.press('Enter');
      await expect(bay).toContainText(CARGO[index]);
      await canvas.press('Backspace');
      await expect(bay).toContainText('Empty bay');
      await canvas.press('Enter');
    } else {
      await cargo.click();
      await bay.click();
      await page.getByRole('button', { name: 'Load selected cargo', exact: true }).click();
    }
    await expect(bay).toContainText(CARGO[index]);
    await expect(page.locator('#manifest-count')).toHaveText(`${index + 1} / 6 loaded`);
  }
  for (const name of ['Aft port (t)', 'Aft starboard (t)']) {
    const tank = page.getByLabel(name, { exact: true });
    await tank.fill(ballasted ? '25' : '0');
    await tank.press('Tab'); // Commit the numeric field through its real change event.
    await expect(tank).toHaveValue(ballasted ? '25' : '0');
  }
  for (const name of ['Mid port (t)', 'Mid starboard (t)', 'Fore port (t)', 'Fore starboard (t)']) {
    await expect(page.getByLabel(name, { exact: true })).toHaveValue('0');
  }
  await expect(page.locator('#ballast-total')).toContainText(`Total: ${ballasted ? 50 : 0} /`);
  await expect(page.locator('#launch-checks')).toContainText('Manifest and loading checks passed');
}

test('Ark renders a real 4K frame and commissions a saved voyage through player controls', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game24/');
  const canvas = page.locator('#ark-canvas'), phase = page.locator('#phase');
  await expect(phase).toHaveAttribute('data-phase', 'loading');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 20000 });
  await page.locator('#quality').selectOption('4k');
  await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await canvas.screenshot({ path: testInfo.outputPath('ark-4k.png') });
  const buffer = await canvas.evaluate(element => {
    const gl = element.getContext('webgl2');
    return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() };
  });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('ark-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });

  // SwiftShader verifies rendering, not hardware 4K performance. Run physics at
  // adaptive resolution so a slow software frame does not dominate the trial.
  await page.setViewportSize({ width: 800, height: 900 });
  await page.locator('#quality').selectOption('auto');
  await expect(canvas).not.toHaveAttribute('data-resolution', '3840x2160');
  await page.getByRole('button', { name: 'Launch trial', exact: true }).click();
  await expect(page.locator('#message')).toContainText('Load all six stores');
  await expect(phase).toHaveAttribute('data-phase', 'loading');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();

  await loadFirstVoyage(page);
  await page.getByRole('button', { name: 'Launch trial', exact: true }).click();
  await expect(phase).toHaveAttribute('data-phase', 'sailing');
  await expect(page.locator('#trial-value')).not.toHaveText('0%', { timeout: 15000 });
  await page.getByRole('button', { name: 'Pause trial', exact: true }).click();
  await expect(phase).toHaveAttribute('data-phase', 'paused');
  const pausedTelemetry = await page.locator('.telemetry').innerText();
  await page.waitForTimeout(700); // A bounded observation that paused physics stays still.
  expect(await page.locator('.telemetry').innerText()).toBe(pausedTelemetry);
  await expect(phase).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('button', { name: 'Resume trial', exact: true }).press('Enter');
  await expect(phase).toHaveAttribute('data-phase', 'won', { timeout: 70000 });
  await expect(page.locator('#trial-value')).toHaveText('100%');
  await expect(page.locator('#message')).toContainText('Commission complete');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('ark-win.png'), fullPage: true });

  await page.getByRole('button', { name: 'Next voyage →', exact: true }).click();
  await expect(page.getByLabel('Voyage', { exact: true })).toHaveValue('2');
  await expect(page.locator('#manifest-count')).toHaveText('0 / 6 loaded');
  await page.reload();
  await expect(page.getByLabel('Voyage', { exact: true })).toHaveValue('2');
  await expect(page.locator('#unlock-status')).toContainText('Voyage 2 of 10,000 unlocked');
  await expect(phase).toHaveAttribute('data-phase', 'loading');
  expect(errors).toEqual([]);
});

test('Ark keeps visible keyboard focus without WebGL and completes the same voyage through commands', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Explicit graphics-capability failure only; this is never 3D render evidence.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return /webgl/i.test(kind) ? null : original.call(this, kind, ...args);
    };
  });
  await page.setViewportSize({ width: 800, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game24/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await expect(page.locator('#ark-canvas')).not.toHaveAttribute('data-renderer', 'WebGL2');
  await page.locator('#cargo-0').press('Enter');
  const focus = await page.locator('#cargo-0').evaluate(element => ({
    active: document.activeElement === element,
    outline: getComputedStyle(element).outlineStyle,
    width: parseFloat(getComputedStyle(element).outlineWidth),
    opacity: getComputedStyle(element).opacity
  }));
  expect(focus.active).toBe(true);
  expect(focus.outline).not.toBe('none');
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.opacity).toBe('1');
  await loadFirstVoyage(page, true, false);
  // A legal but unbalanced load must fail on the water, retain the plan on
  // return, and award no progress. Rebalancing then permits a genuine clear.
  for (const name of ['Aft port (t)', 'Mid port (t)']) {
    await page.getByLabel(name, { exact: true }).fill('33');
    await page.getByLabel(name, { exact: true }).press('Tab');
  }
  await page.getByRole('button', { name: 'Launch trial', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'lost', { timeout: 10000 });
  await expect(page.locator('#message')).toContainText('freeboard');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Return to quay', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'loading');
  await expect(page.locator('#manifest-count')).toHaveText('6 / 6 loaded');
  await expect(page.locator('#ballast-total')).toContainText('Total: 66 /');
  for (const [name, value] of [['Aft port (t)','25'], ['Mid port (t)','0'], ['Aft starboard (t)','25']]) {
    await page.getByLabel(name, { exact: true }).fill(value);
    await page.getByLabel(name, { exact: true }).press('Tab');
  }
  await page.getByRole('button', { name: 'Launch trial', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won', { timeout: 25000 });
  await expect(page.locator('#trial-value')).toHaveText('100%');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  await expect(page.locator('#next-level')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('ark-command-fallback.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('Ark commands reflow at 390 and 320 pixels with reduced motion and visible keyboard focus', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game24/');
  await expect(page.locator('#manifest-count')).toHaveText('0 / 6 loaded');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to game controls', exact: true })).toBeFocused();
  const outline = await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe('none');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      ballastRight: document.querySelector('#ballast-controls').getBoundingClientRect().right
    }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.viewport + 1);
    expect(bounds.ballastRight).toBeLessThanOrEqual(bounds.viewport + 1);
    await expect(page.locator('#bay-grid button')).toHaveCount(6);
    await expect(page.getByLabel('Aft port (t)', { exact: true })).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`ark-mobile-${width}.png`), fullPage: true });
  }
});
