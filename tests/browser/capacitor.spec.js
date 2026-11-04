import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_KEY = 'adigun.campaign.v1.capacitor-charge';
async function fitReferenceParts(page) {
  await page.getByLabel('Capacitor bank C', { exact: true }).selectOption('c-reference');
  await page.getByLabel('Charge resistor R1', { exact: true }).selectOption('charge-reference');
  await page.getByLabel('Discharge resistor R2', { exact: true }).selectOption('discharge-reference');
}
async function chargeThroughControls(page, keyboard = false) {
  const start = page.getByRole('button', { name: 'Start charge', exact: true });
  if (keyboard) await start.press('Enter'); else await start.click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'charging');
  await page.getByRole('button', { name: 'Pause experiment', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'paused');
  // Read only the displayed voltmeter; every numerical step is a real control.
  // No engine object, elapsed-time patch or campaign state is injected.
  const voltage = async () => Number.parseFloat(await page.locator('#voltage').innerText());
  for (let step = 0; step < 40 && await voltage() < 7.7; step++) {
    await page.getByRole('button', { name: 'Advance 0.1 s', exact: true }).press('Enter');
  }
  expect(await voltage()).toBeGreaterThanOrEqual(7.7); expect(await voltage()).toBeLessThanOrEqual(8.8);
}
async function completeFromPausedCharge(page) {
  await page.getByRole('button', { name: 'Capture & hold', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'paused'); await expect(page.locator('#phase')).toHaveAttribute('data-circuit', 'holding');
  await page.getByRole('button', { name: 'Resume experiment', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'ready', { timeout: 25000 });
  await expect(page.locator('#capture-status')).toContainText('Simulated time is paused');
  await page.getByRole('button', { name: 'Start discharge', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won', { timeout: 30000 });
  await expect(page.locator('#stage-progress')).toHaveText('3 / 3 passed'); await expect(page.locator('#voltage')).toHaveText('0.500 V');
}
async function noWebGL(page) {
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); }; });
}

test('Capacitor Charge renders a real 4K RC bench and completes a saved experiment using physical switch controls', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/game6/');
  await page.getByRole('button', { name: 'Start charge', exact: true }).click(); await expect(page.locator('#message')).toContainText('Fit all three parts');
  await fitReferenceParts(page); await expect(page.locator('#plan-warnings')).toContainText('meet the predicted bench limits');
  const canvas = page.locator('#capacitor-canvas'); await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 20000 });
  await page.locator('#quality').selectOption('4k'); await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await canvas.screenshot({ path: testInfo.outputPath('capacitor-4k.png') });
  const buffer = await canvas.evaluate(element => { const gl = element.getContext('webgl2'); return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() }; });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('capacitor-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await page.setViewportSize({ width: 800, height: 1000 }); await page.locator('#quality').selectOption('auto');
  await page.getByRole('button', { name: 'Top view', exact: true }).click(); await page.getByRole('button', { name: 'Bench view', exact: true }).click();
  await chargeThroughControls(page);
  const paused = await page.locator('.telemetry').innerText(); await page.waitForTimeout(400); expect(await page.locator('.telemetry').innerText()).toBe(paused);
  await expect(page.locator('#capture-status')).toContainText('Voltage and energy are in the target window');
  await completeFromPausedCharge(page); await expect(page.locator('#energy')).toHaveText('0.275 mJ');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('capacitor-commissioned.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next experiment →', exact: true }).click(); await expect(page.getByLabel('Experiment', { exact: true })).toHaveValue('2');
  await page.reload(); await expect(page.getByLabel('Experiment', { exact: true })).toHaveValue('2'); await expect(page.locator('#unlock-status')).toContainText('Experiment 2 of 10,000 unlocked');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'planning'); expect(errors).toEqual([]);
});

test('Capacitor Charge keeps visible keyboard controls without WebGL and repairs an actual current-limit failure', async ({ page }, testInfo) => {
  test.setTimeout(90000); await noWebGL(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message)); await page.goto('/game6/');
  await expect(page.locator('#graphics-fallback')).toBeVisible(); await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await fitReferenceParts(page); await page.getByLabel('Charge resistor R1', { exact: true }).selectOption('charge-fast');
  await page.getByRole('button', { name: 'Start charge', exact: true }).press('Enter'); await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'lost');
  await expect(page.locator('#message')).toContainText('Charge current'); await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).press('Enter');
  await expect(page.getByLabel('Charge resistor R1', { exact: true })).toHaveValue('charge-fast');
  await page.getByLabel('Charge resistor R1', { exact: true }).selectOption('charge-reference');
  await page.getByRole('button', { name: 'Start charge', exact: true }).focus();
  const focus = await page.locator('#start-charge').evaluate(element => ({ active: document.activeElement === element, style: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus.active).toBe(true); expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await chargeThroughControls(page, true); await completeFromPausedCharge(page);
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  await page.screenshot({ path: testInfo.outputPath('capacitor-command-recovery.png'), fullPage: true }); expect(errors).toEqual([]);
});

test('Capacitor Charge has responsive accessible controls and a readable trace at 390 and 320 pixels', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/game6/');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'planning'); await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to game controls', exact: true })).toBeFocused();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 }); const bounds = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(bounds[0]).toBeLessThanOrEqual(bounds[1] + 1);
  }
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('capacitor-accessibility', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('capacitor-mobile-320.png'), fullPage: true });
});

test('Capacitor Charge discloses session-only progress when completed campaign storage is silently rejected', async ({ page }) => {
  test.setTimeout(90000); await noWebGL(page);
  await page.addInitScript(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'adigun.campaign.v1.capacitor-charge') return; return original.call(this, key, value); }; });
  await page.goto('/game6/'); await fitReferenceParts(page); await chargeThroughControls(page, true); await completeFromPausedCharge(page);
  await expect(page.locator('#save-status')).toContainText('session only'); expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await expect(page.getByRole('button', { name: 'Next experiment →', exact: true })).toBeVisible();
});
