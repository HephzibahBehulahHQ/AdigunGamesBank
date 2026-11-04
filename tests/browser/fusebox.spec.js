import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_KEY = 'adigun.campaign.v1.fuse-box';
const FIRST_ASSIGNMENTS = [0, 0, 1, 1, 2, 2];
async function wireBoard(page, assignments = FIRST_ASSIGNMENTS, keyboard = false) {
  for (const [index, branch] of assignments.entries()) {
    if (keyboard) {
      await page.locator(`#load-${index}`).press('Enter'); await page.locator(`#branch-${branch}`).press('Enter');
      await page.getByRole('button', { name: 'Connect selected load', exact: true }).press('Enter');
    } else {
      await page.locator(`#load-${index}`).click(); await page.locator(`#branch-${branch}`).click();
      await page.getByRole('button', { name: 'Connect selected load', exact: true }).click();
    }
    await expect(page.locator(`#load-${index}`)).toContainText(`Connected · Branch ${String.fromCharCode(65 + branch)}`);
  }
  for (const [branch, rating] of [6, 10, 16].entries()) await page.getByLabel(`Branch ${String.fromCharCode(65 + branch)} breaker`, { exact: true }).selectOption(String(rating));
}
async function noWebGL(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
  });
}

test('Fuse Box renders an actual 4K cabinet and commissions, saves and reloads a board through player inputs', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game8/');
  const canvas = page.locator('#fusebox-canvas'), phase = page.locator('#phase');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 20000 });
  await page.locator('#quality').selectOption('4k'); await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await canvas.screenshot({ path: testInfo.outputPath('fusebox-4k.png') });
  const buffer = await canvas.evaluate(element => { const gl = element.getContext('webgl2'); return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() }; });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('fusebox-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await page.setViewportSize({ width: 800, height: 1000 }); await page.locator('#quality').selectOption('auto');
  await page.getByRole('button', { name: 'Energize and test', exact: true }).click();
  await expect(phase).toHaveAttribute('data-phase', 'isolated'); await expect(page.locator('#message')).toContainText('Assign all 6 loads');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await canvas.press('ArrowLeft'); await expect(page.locator('#selected-branch')).toHaveText('Branch A');
  await canvas.press('ArrowRight'); await canvas.press('ArrowRight'); await canvas.press('ArrowRight');
  await expect(page.locator('#selected-branch')).toHaveText('Branch C');
  await canvas.press('ArrowLeft'); await canvas.press('ArrowLeft'); await canvas.press('Enter');
  await expect(page.locator('#load-0')).toContainText('Connected · Branch A');
  await wireBoard(page); await expect(page.locator('#inspection')).toContainText('Plan within stock, budget');
  await page.getByRole('button', { name: 'Energize and test', exact: true }).click();
  await expect(phase).toHaveAttribute('data-phase', 'testing');
  await page.getByRole('button', { name: 'Pause trial', exact: true }).click(); await expect(phase).toHaveAttribute('data-phase', 'paused');
  const paused = await page.locator('.telemetry').innerText(); await page.waitForTimeout(400);
  expect(await page.locator('.telemetry').innerText()).toBe(paused);
  await page.getByRole('button', { name: 'Resume trial', exact: true }).press('Enter');
  await expect(phase).toHaveAttribute('data-phase', 'won', { timeout: 40000 });
  await expect(page.locator('#trial-progress')).toHaveText('100%'); await expect(page.locator('#energy')).toHaveText('0.920 Wh');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('fusebox-commissioned.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next board →', exact: true }).click();
  await expect(page.getByLabel('Board', { exact: true })).toHaveValue('2'); await expect(page.locator('#connected')).toHaveText('0 / 6');
  await page.reload(); await expect(page.getByLabel('Board', { exact: true })).toHaveValue('2');
  await expect(page.locator('#unlock-status')).toContainText('Board 2 of 10,000 unlocked'); expect(errors).toEqual([]);
});

test('Fuse Box keeps visible keyboard controls without WebGL and recovers a genuine overload trip', async ({ page }, testInfo) => {
  test.setTimeout(60000); await noWebGL(page); await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game8/'); await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await page.locator('#load-0').press('Enter');
  const focus = await page.locator('#load-0').evaluate(element => ({ focused: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus.focused).toBe(true); expect(focus.outline).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  await wireBoard(page, [0, 1, 1, 2, 2, 0], true);
  await expect(page.locator('#inspection')).toContainText('8.00 A planned peak exceeds the 6 A breaker');
  await page.getByRole('button', { name: 'Energize and test', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'tripped'); await expect(page.locator('#message')).toContainText('Branch A tripped');
  await expect(page.getByRole('button', { name: 'Reset trip', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Branch A breaker', { exact: true })).toBeDisabled();
  await expect(page.locator('#next-level')).toBeHidden(); expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Isolate supply', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveText('TRIPPED · ISOLATED');
  await page.getByRole('button', { name: 'Reset trip', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'isolated');
  await wireBoard(page, FIRST_ASSIGNMENTS, true); await page.getByRole('button', { name: 'Energize and test', exact: true }).press('Enter');
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won', { timeout: 20000 });
  await expect(page.locator('#trial-progress')).toHaveText('100%');
  await page.screenshot({ path: testInfo.outputPath('fusebox-command-recovery.png'), fullPage: true }); expect(errors).toEqual([]);
});

test('Fuse Box reflows at 390 and 320 pixels with reduced motion and accessible commands', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/game8/');
  await expect(page.locator('#connected')).toHaveText('0 / 6');
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to game controls', exact: true })).toBeFocused();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.viewport + 1);
  }
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await testInfo.attach('fusebox-accessibility', { body: JSON.stringify(result), contentType: 'application/json' });
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('fusebox-mobile-320.png'), fullPage: true });
});

test('Fuse Box reports session-only completion when browser storage silently rejects the campaign save', async ({ page }) => {
  test.setTimeout(45000); await noWebGL(page);
  await page.addInitScript(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'adigun.campaign.v1.fuse-box') return; return original.call(this, key, value); }; });
  await page.goto('/game8/'); await wireBoard(page); await page.getByRole('button', { name: 'Energize and test', exact: true }).click();
  await expect(page.locator('#phase')).toHaveAttribute('data-phase', 'won', { timeout: 20000 });
  await expect(page.locator('#save-status')).toContainText('session only');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await expect(page.getByRole('button', { name: 'Next board →', exact: true })).toBeVisible();
});
