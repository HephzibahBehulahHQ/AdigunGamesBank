import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_KEY = 'adigun.campaign.v1.penalty-pro';
const phase = page => page.locator('#phase');

async function shootFive(page, { miss = false, keyboard = false, pauseFirst = false } = {}) {
  for (let kick = 0; kick < 5; kick++) {
    await expect(phase(page)).toHaveAttribute('data-role', 'shoot');
    if (miss) await page.getByRole('slider', { name: 'Shot elevation', exact: true }).press('End');
    else {
      const text = await page.locator('#keeper-tell').innerText();
      const preset = page.getByRole('button', { name: text.includes('left') ? 'Low right' : 'Low left', exact: true });
      if (keyboard) await preset.press('Enter'); else await preset.click();
    }
    const trigger = page.getByRole('button', { name: 'Shoot penalty', exact: true });
    if (keyboard) await trigger.press('Enter'); else await trigger.click();
    if (kick === 0 && pauseFirst) {
      await page.getByRole('button', { name: 'Pause flight', exact: true }).press('Enter');
      await expect(phase(page)).toHaveAttribute('data-phase', 'paused');
      const before = await page.locator('.telemetry').innerText();
      await page.waitForTimeout(350); // Observe that a paused physical shot stays still.
      expect(await page.locator('.telemetry').innerText()).toBe(before);
      await page.getByRole('button', { name: 'Resume flight', exact: true }).press('Enter');
    }
    await expect(phase(page)).toHaveAttribute('data-phase', 'result', { timeout: 20000 });
    if (kick < 4) {
      const next = page.getByRole('button', { name: 'Next kick', exact: true });
      if (keyboard) await next.press('Enter'); else await next.click();
    }
  }
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  const gloves = page.getByRole('button', { name: 'Take the goalkeeper gloves', exact: true });
  if (keyboard) await gloves.press('Enter'); else await gloves.click();
  await expect(phase(page)).toHaveAttribute('data-role', 'keeper');
}

async function keepFive(page, { concede = false, keyboard = false, terminal = 'won' } = {}) {
  for (let kick = 0; kick < 5; kick++) {
    const direction = (await page.locator('#keeper-tell').innerText()).includes('left') ? 'left' : 'right';
    const selected = concede ? direction === 'left' ? 'right' : 'left' : direction;
    const dive = page.getByRole('button', { name: `Dive ${selected}`, exact: true });
    if (keyboard) await dive.press('Enter'); else await dive.click();
    const high = (await page.locator('#keeper-detail').innerText()).startsWith('Chest-high');
    await page.getByLabel('Dive height', { exact: true }).selectOption(high ? 'high' : 'low');
    const face = page.getByRole('button', { name: 'Face penalty', exact: true });
    if (keyboard) await face.press('Enter'); else await face.click();
    await expect(phase(page)).toHaveAttribute('data-phase', kick === 4 ? terminal : 'result', { timeout: 20000 });
    if (kick < 4) {
      const next = page.getByRole('button', { name: 'Next kick', exact: true });
      if (keyboard) await next.press('Enter'); else await next.click();
    }
  }
}

async function noGraphics(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
  });
}

test('Penalty Pro renders actual 4K and wins through five shots and five goalkeeper turns, then resumes', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game17/');
  const canvas = page.locator('#penalty-canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2');
  await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('4k');
  await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await canvas.screenshot({ path: testInfo.outputPath('penalty-4k.png') });
  const buffer = await canvas.evaluate(element => { const gl = element.getContext('webgl2'); return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() }; });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('penalty-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('auto');
  await page.setViewportSize({ width: 800, height: 900 });
  await shootFive(page);
  await expect(page.locator('#goals')).toHaveText('5 / 5');
  await expect(page.locator('#opponent-goals')).toHaveText('0 / 5');
  await expect(page.locator('#keeping-settings')).toBeVisible();
  // The separate keeper controls must remain accessible when they replace
  // the shot controls; the repository's generic route audit only sees kickoff.
  await page.setViewportSize({ width: 320, height: 900 });
  const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1] + 1);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('penalty-keeper-320.png'), fullPage: true });
  await page.setViewportSize({ width: 800, height: 900 });
  await keepFive(page);
  await expect(page.locator('#message')).toContainText('Shootout won 5–0');
  await expect(page.locator('#saves')).toHaveText('Your saves: 5');
  await expect(page.locator('#history li')).toHaveCount(10);
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('penalty-win.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next challenge →', exact: true }).click();
  await expect(page.getByLabel('Challenge', { exact: true })).toHaveValue('2');
  await page.reload();
  await expect(page.getByLabel('Challenge', { exact: true })).toHaveValue('2');
  await expect(page.locator('#unlock-status')).toContainText('Challenge 2 of 10,000 unlocked');
  await expect(phase(page)).toHaveAttribute('data-phase', 'ready');
  expect(errors).toEqual([]);
});

test('Penalty Pro keeps visible keyboard controls without WebGL, pauses, loses honestly and retries at 390px', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await noGraphics(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game17/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await expect(page.locator('#quality')).toBeDisabled();
  await expect(page.locator('#penalty-canvas')).not.toHaveAttribute('data-renderer', 'WebGL2');
  const lowRight = page.getByRole('button', { name: 'Low right', exact: true });
  await lowRight.press('Enter');
  const focus = await lowRight.evaluate(element => ({ active: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus).toEqual({ active: true, outline: 'solid', width: 3 });
  await shootFive(page, { miss: true, keyboard: true, pauseFirst: true });
  await keepFive(page, { concede: true, keyboard: true, terminal: 'lost' });
  await expect(page.locator('#message')).toContainText('Shootout lost: 0–5');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Retry challenge', exact: true }).press('Enter');
  await expect(page.locator('#goals')).toHaveText('0 / 5');
  await expect(phase(page)).toHaveAttribute('data-role', 'shoot');
  await lowRight.press('Enter');
  await page.getByRole('button', { name: 'Shoot penalty', exact: true }).press('Enter');
  await expect(phase(page)).toHaveAttribute('data-phase', 'result');
  await expect(page.locator('#goals')).toHaveText('1 / 5');
  const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1] + 1);
  await page.screenshot({ path: testInfo.outputPath('penalty-command-retry-390.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('Penalty Pro keeps visible keyboard campaign play when saves are rejected and reports session-only progress', async ({ page }) => {
  test.setTimeout(120000);
  await noGraphics(page);
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Storage disabled for this test', 'QuotaExceededError'); }; });
  await page.goto('/game17/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await shootFive(page, { keyboard: true }); await keepFive(page, { keyboard: true });
  await expect(page.locator('#save-status')).toContainText('session only');
  await expect(page.locator('#save-status')).not.toContainText('Progress saved on this device.');
  await expect(page.locator('#unlock-status')).toContainText('Challenge 2 of 10,000 unlocked');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.reload();
  await expect(page.getByLabel('Challenge', { exact: true })).toHaveValue('1');
  await expect(page.locator('#unlock-status')).toContainText('Challenge 1 of 10,000 unlocked');
});
