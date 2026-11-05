import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_KEY = 'adigun.campaign.v1.goal-line';
const phase = page => page.locator('#phase');
const control = (page, name) => page.getByRole('button', { name, exact: true });
const activate = (button, keyboard) => keyboard ? button.press('Enter') : button.click();

async function noGraphics(page) {
  // TEST-ONLY failure fixture; scoring and progression still use the real game.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return /webgl/i.test(kind) ? null : original.call(this, kind, ...args);
    };
  });
}

async function manualTiming(page) {
  await page.getByRole('combobox', { name: 'Keeper timing', exact: true }).selectOption('manual');
}

async function prepareGoal(page, keyboard = false) {
  await activate(control(page, 'Middle left'), keyboard);
  await activate(control(page, 'Run-up feint'), keyboard);
  for (let i = 0; i < 4; i++) await activate(control(page, 'Advance keeper 0.1 s'), keyboard);
  await activate(control(page, 'Middle right'), keyboard);
}

async function playFive(page, { keyboard = false, lose = false } = {}) {
  for (let kick = 0; kick < 5; kick++) {
    await expect(phase(page)).toHaveAttribute('data-phase', 'ready');
    if (lose) await activate(control(page, 'Middle centre'), keyboard);
    else await prepareGoal(page, keyboard);
    await activate(control(page, 'Shoot penalty'), keyboard);
    await expect(phase(page)).toHaveAttribute('data-phase', kick === 4 ? lose ? 'lost' : 'won' : 'result', { timeout: 20000 });
    if (kick < 4) {
      // Partial success must never award the next challenge.
      expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
      await activate(control(page, 'Next kick'), keyboard);
    }
  }
}

async function reflowAndAxe(page, testInfo, name) {
  const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1] + 1);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true });
}

test('Goal Line renders actual 4K, wins five physical kicks through controls, saves and resumes', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game9/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2');
  await manualTiming(page);
  await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('4k');
  await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  const buffer = await canvas.evaluate(element => {
    const gl = element.getContext('webgl2');
    return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() };
  });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('goal-line-4k-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await canvas.screenshot({ path: testInfo.outputPath('goal-line-4k.png') });
  await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('auto');
  await page.setViewportSize({ width: 800, height: 1000 });
  await playFive(page);
  await expect(page.locator('#goals')).toHaveText('5 / 5');
  await expect(page.locator('#history li')).toHaveCount(5);
  await expect(page.locator('#save-status')).toContainText('saved on this device');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('goal-line-win.png'), fullPage: true });
  await control(page, 'Next challenge').click();
  await expect(page.getByRole('spinbutton', { name: 'Challenge', exact: true })).toHaveValue('2');
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Challenge', exact: true })).toHaveValue('2');
  await expect(phase(page)).toHaveAttribute('data-phase', 'ready');
  expect(errors).toEqual([]);
});

test('Goal Line keeps visible keyboard controls without WebGL, pauses preparation, rejects legacy saves and retries defeat at 320px', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await noGraphics(page);
  await page.addInitScript(key => {
    localStorage.setItem(key, '{broken');
    localStorage.setItem('hbgb.level.v1.game9', '10000');
  }, SAVE_KEY);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/game9/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('canvas')).not.toHaveAttribute('data-renderer', 'WebGL2');
  await expect(page.getByRole('spinbutton', { name: 'Challenge', exact: true })).toHaveValue('1');
  await manualTiming(page);
  const zone = control(page, 'Middle left');
  await zone.press('Enter');
  const focus = await zone.evaluate(element => ({ active: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus).toEqual({ active: true, outline: 'solid', width: 3 });
  await control(page, 'Run-up feint').press('Enter');
  await control(page, 'Advance keeper 0.1 s').press('Enter');
  await control(page, 'Pause').press('Enter');
  await expect(phase(page)).toHaveAttribute('data-phase', 'paused');
  await expect(control(page, 'Shoot penalty')).toBeDisabled();
  await expect(control(page, 'Advance keeper 0.1 s')).toBeDisabled();
  const paused = await page.locator('#keeper-readout').innerText();
  await page.waitForTimeout(350); // Observe frozen preparation, not a readiness delay.
  expect(await page.locator('#keeper-readout').innerText()).toBe(paused);
  await control(page, 'Resume').press('Enter');
  await control(page, 'Retry challenge').press('Enter');
  // The malformed record is retained rather than falsely treated as progress.
  await page.evaluate(key => localStorage.removeItem(key), SAVE_KEY);
  await playFive(page, { keyboard: true, lose: true });
  await expect(page.locator('#goals')).toHaveText('0 / 5');
  await expect(control(page, 'Next challenge')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await control(page, 'Retry challenge').press('Enter');
  await prepareGoal(page, true);
  await control(page, 'Shoot penalty').press('Enter');
  await expect(phase(page)).toHaveAttribute('data-phase', 'result');
  await expect(page.locator('#goals')).toHaveText('1 / 5');
  await reflowAndAxe(page, testInfo, 'goal-line-keyboard-320.png');
  const targets = await page.locator('[data-zone]').evaluateAll(elements => elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
  expect(targets).toHaveLength(9);
  for (const rect of targets) { expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44); }
  expect(errors).toEqual([]);
});

test('Goal Line keeps visible keyboard campaign play when storage writes fail and reports session-only progress', async ({ page }) => {
  test.setTimeout(120000);
  await noGraphics(page);
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Test storage failure', 'QuotaExceededError'); }; });
  await page.goto('/game9/'); await manualTiming(page);
  await playFive(page, { keyboard: true });
  await expect(page.locator('#save-status')).toContainText('session only');
  await expect(page.locator('#save-status')).not.toContainText('saved on this device');
  await control(page, 'Next challenge').press('Enter');
  await expect(page.getByRole('spinbutton', { name: 'Challenge', exact: true })).toHaveValue('2');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Challenge', exact: true })).toHaveValue('1');
});

test('Goal Line final challenge honours its power limits, finishes mastery and reflows on mobile', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  // TEST-ONLY setup: prior earned progress; all five final kicks still use UI.
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ version: 1, completed: 9999, unlocked: 10000 })), SAVE_KEY);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game9/'); await manualTiming(page);
  await expect(page.getByRole('spinbutton', { name: 'Challenge', exact: true })).toHaveValue('10000');
  for (let kick = 0; kick < 5; kick++) {
    const power = page.getByRole('slider', { name: 'Shot power', exact: true });
    expect(Number(await power.inputValue())).toBeLessThanOrEqual(Number(await power.getAttribute('max')));
    await prepareGoal(page);
    await control(page, 'Shoot penalty').click();
    await expect(phase(page)).toHaveAttribute('data-phase', kick === 4 ? 'won' : 'result');
    if (kick < 4) await control(page, 'Next kick').click();
  }
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 10000, unlocked: 10000 });
  await expect(control(page, 'Next challenge')).toBeHidden();
  await page.setViewportSize({ width: 320, height: 900 });
  await reflowAndAxe(page, testInfo, 'goal-line-mastered-320.png');
});

test('Goal Line survives actual WebGL context loss and preserves command scoring', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/game9/'); await manualTiming(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2');
  await prepareGoal(page);
  const before = await page.locator('#keeper-readout').innerText();
  const supported = await canvas.evaluate(element => {
    const extension = element.getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext(); return true;
  });
  expect(supported).toBe(true);
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(canvas).not.toHaveAttribute('data-renderer', 'WebGL2');
  expect(await page.locator('#keeper-readout').innerText()).toBe(before);
  await control(page, 'Shoot penalty').click();
  await expect(phase(page)).toHaveAttribute('data-phase', 'result');
  await expect(page.locator('#goals')).toHaveText('1 / 5');
});
