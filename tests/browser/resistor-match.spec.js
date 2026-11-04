import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SAVE_KEY = 'adigun.campaign.v1.resistor-match';
const phase = page => page.locator('#phase');
const tray = (page, index) => page.locator(`#tray-${index + 1}`);

async function pressOrClick(locator, keyboard) { if (keyboard) await locator.press('Enter'); else await locator.click(); }

// The player learns only values that the interface has actually revealed.
// This never imports the engine, reads hidden component data or sets a score.
async function rememberAndMatch(page, keyboard = false) {
  const memory = new Map(); let comparisons = 0;
  while ((await phase(page).getAttribute('data-phase')) !== 'won') {
    expect(await phase(page).getAttribute('data-phase')).toBe('ready');
    const covered = await page.locator('.component-card[data-state="covered"]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.index)));
    const groups = new Map();
    for (const index of covered) if (memory.has(index)) { const value = memory.get(index); if (!groups.has(value)) groups.set(value, []); groups.get(value).push(index); }
    const knownPair = [...groups.values()].find(indices => indices.length >= 2);
    const first = knownPair?.[0] ?? covered.find(index => !memory.has(index)) ?? covered[0];
    await pressOrClick(tray(page, first), keyboard);
    const value = await tray(page, first).locator('.card-value').innerText(); memory.set(first, value);
    const candidates = covered.filter(index => index !== first);
    const second = knownPair?.[1] ?? candidates.find(index => memory.get(index) === value) ?? candidates.find(index => !memory.has(index)) ?? candidates[0];
    await pressOrClick(tray(page, second), keyboard);
    memory.set(second, await tray(page, second).locator('.card-value').innerText());
    await expect(phase(page)).toHaveAttribute('data-phase', 'compare');
    await pressOrClick(page.locator('#resolve'), keyboard); comparisons++;
    expect(comparisons).toBeLessThanOrEqual(14);
    expect(await phase(page).getAttribute('data-phase')).not.toBe('lost');
  }
  return comparisons;
}

async function removeGraphics(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
  });
}

test('Resistor Match renders actual 4K components, compares visible codes and clears a real memory game with reload', async ({ page }, testInfo) => {
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game5/');
  const canvas = page.locator('#resistor-canvas');
  await expect(canvas).toHaveAttribute('data-renderer', 'WebGL2');
  await expect(page.locator('.component-card')).toHaveCount(8);
  await expect(page.locator('.card-pattern')).toHaveCount(0);
  expect(await page.locator('.card-value').allTextContents()).toEqual(Array(8).fill('Reveal component'));
  await tray(page, 0).click(); await tray(page, 1).click();
  await expect(phase(page)).toHaveAttribute('data-phase', 'compare');
  await expect(page.locator('#inspection-a')).toContainText('10 Ω ±5%');
  await expect(page.locator('#inspection-b')).toContainText('100 Ω ±5%');
  await expect(tray(page, 0).locator('.card-pattern')).toHaveText('1 · 0 · ×1 · ±5%');
  await expect(tray(page, 1).locator('.card-colors')).toHaveText('Brown · Black · Brown · Gold');
  await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('4k');
  await expect(canvas).toHaveAttribute('data-resolution', '3840x2160');
  await page.waitForTimeout(500); // Capture the opened opaque covers after their transition.
  await canvas.screenshot({ path: testInfo.outputPath('resistor-match-4k.png') });
  const buffer = await canvas.evaluate(element => { const gl = element.getContext('webgl2'); return { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, error: gl.getError() }; });
  expect(buffer).toEqual({ width: 3840, height: 2160, error: 0 });
  await testInfo.attach('resistor-match-drawing-buffer', { body: JSON.stringify(buffer), contentType: 'application/json' });
  await page.getByRole('combobox', { name: 'Graphics', exact: true }).selectOption('auto');
  await page.setViewportSize({ width: 320, height: 900 });
  const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1] + 1);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('resistor-match-compare-320.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cover mismatched pair', exact: true }).click();
  await expect(tray(page, 0)).toHaveAttribute('data-state', 'covered');
  await expect(tray(page, 0).locator('.card-pattern')).toHaveCount(0);
  await page.setViewportSize({ width: 900, height: 900 });
  await rememberAndMatch(page);
  await expect(page.locator('#pairs')).toHaveText('4 / 4');
  await expect(page.locator('#message')).toContainText('Bench cleared');
  await expect(page.locator('.component-card[data-state="matched"]')).toHaveCount(8);
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)).toEqual({ version: 1, completed: 1, unlocked: 2 });
  await page.screenshot({ path: testInfo.outputPath('resistor-match-win.png'), fullPage: true });
  await page.getByRole('button', { name: 'Next challenge →', exact: true }).click();
  await expect(page.getByLabel('Challenge', { exact: true })).toHaveValue('2');
  await page.reload();
  await expect(page.getByLabel('Challenge', { exact: true })).toHaveValue('2');
  await expect(page.locator('#unlock-status')).toContainText('Challenge 2 of 10,000 unlocked');
  await expect(page.locator('#moves')).toHaveText('0 / 14');
  expect(errors).toEqual([]);
});

test('Resistor Match keeps visible keyboard controls without WebGL, loses at its budget and wins after retry at 390px', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await removeGraphics(page); await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/game5/');
  await expect(page.locator('#graphics-fallback')).toBeVisible();
  await expect(page.locator('#graphics-status')).toContainText('WebGL 2 unavailable');
  await expect(page.locator('#quality')).toBeDisabled();
  await expect(page.locator('#resistor-canvas')).not.toHaveAttribute('data-renderer', 'WebGL2');
  await tray(page, 0).focus(); await tray(page, 0).press('ArrowUp'); await expect(tray(page, 0)).toBeFocused();
  await tray(page, 0).press('ArrowLeft'); await expect(tray(page, 0)).toBeFocused();
  const focus = await tray(page, 0).evaluate(element => ({ active: document.activeElement === element, outline: getComputedStyle(element).outlineStyle, width: parseFloat(getComputedStyle(element).outlineWidth) }));
  expect(focus).toEqual({ active: true, outline: 'solid', width: 3 });
  for (let move = 0; move < 14; move++) {
    await tray(page, 0).press('Enter');
    if (move === 0) await expect(tray(page, 1)).toBeFocused();
    await tray(page, 1).press('Enter');
    await expect(page.getByRole('button', { name: 'Cover mismatched pair', exact: true })).toBeFocused();
    if (move === 0) {
      await page.waitForTimeout(700); // Mismatches remain readable; no timed concealment.
      await expect(tray(page, 0)).toHaveAttribute('data-state', 'revealed');
      await expect(tray(page, 1)).toHaveAttribute('data-state', 'revealed');
      await expect(page.locator('#moves')).toHaveText('1 / 14');
    }
    await page.getByRole('button', { name: 'Cover mismatched pair', exact: true }).press('Enter');
  }
  await expect(phase(page)).toHaveAttribute('data-phase', 'lost');
  await expect(page.locator('#moves')).toHaveText('14 / 14');
  await expect(page.locator('#pairs')).toHaveText('0 / 4');
  await expect(page.locator('#next-level')).toBeHidden();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Retry challenge', exact: true }).press('Enter');
  await expect(page.locator('#moves')).toHaveText('0 / 14');
  await expect(page.locator('.card-pattern')).toHaveCount(0);
  await rememberAndMatch(page, true);
  await expect(page.locator('#pairs')).toHaveText('4 / 4');
  await expect(page.locator('#save-status')).toContainText('Progress saved on this device.');
  const dimensions = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(dimensions[0]).toBeLessThanOrEqual(dimensions[1] + 1);
  await page.screenshot({ path: testInfo.outputPath('resistor-match-command-win-390.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('Resistor Match keeps visible keyboard focus aligned while skipping unavailable trays without crossing grid boundaries', async ({ page }) => {
  await removeGraphics(page); await page.goto('/game5/');
  // Create disabled trays through a real match in the introductory layout.
  await tray(page, 1).press('Enter'); await tray(page, 4).press('Enter');
  await expect(page.locator('#comparison')).toHaveText('Nominal resistance and tolerance match.');
  await page.getByRole('button', { name: 'Store matched pair', exact: true }).press('Enter');
  await expect(tray(page, 1)).toBeDisabled(); await expect(tray(page, 4)).toBeDisabled();
  const focused = async index => {
    await expect(tray(page, index)).toBeFocused();
    await expect(page.locator('.component-card.focus-card')).toHaveCount(1);
    await expect(page.locator('.component-card.focus-card')).toHaveAttribute('id', `tray-${index + 1}`);
  };
  const move = async (key, index) => { await page.keyboard.press(key); await focused(index); };
  await focused(0);
  // Use the actual active element for every key, so a selector cannot hide a
  // stalled arrow by focusing the expected destination on the test's behalf.
  await move('ArrowRight', 2); await move('ArrowLeft', 0);
  await move('ArrowLeft', 0); await move('ArrowUp', 0); await move('ArrowDown', 0);
  await move('ArrowRight', 2); await move('ArrowRight', 3); await move('ArrowRight', 3);
  await move('ArrowDown', 7); await move('ArrowDown', 7); await move('ArrowLeft', 6); await move('ArrowUp', 2);
  // A currently revealed tray is also skipped; Enter must activate the
  // highlighted, focused destination rather than the tray left behind.
  await page.keyboard.press('Enter'); await focused(3);
  await expect(tray(page, 2)).toHaveAttribute('data-state', 'revealed');
  await move('ArrowLeft', 0); await move('ArrowRight', 3);
  await page.keyboard.press('Enter');
  await expect(tray(page, 3)).toHaveAttribute('data-state', 'revealed');
  await expect(page.getByRole('button', { name: 'Cover mismatched pair', exact: true })).toBeFocused();
  await page.keyboard.press('Enter'); await focused(0);
  await expect(page.locator('#moves')).toHaveText('2 / 14');
  // The responsive two-column DOM grid has different neighbours from the
  // four-column 3D bench. Vertical skipping must use the visible DOM columns.
  await page.setViewportSize({ width: 320, height: 900 });
  await move('ArrowRight', 0); await move('ArrowDown', 2); await move('ArrowDown', 6);
  await move('ArrowUp', 2); await move('ArrowUp', 0);
  await move('ArrowDown', 2); await move('ArrowRight', 3); await move('ArrowRight', 3);
  await move('ArrowUp', 3); await move('ArrowDown', 5); await move('ArrowUp', 3);
});

test('Resistor Match keeps visible keyboard progress honest when storage silently rejects the save', async ({ page }) => {
  test.setTimeout(90000);
  await removeGraphics(page);
  await page.addInitScript(() => { Storage.prototype.setItem = function () {}; });
  await page.goto('/game5/'); await rememberAndMatch(page, true);
  await expect(page.locator('#save-status')).toContainText('session only');
  await expect(page.locator('#save-status')).not.toContainText('Progress saved on this device.');
  await expect(page.locator('#unlock-status')).toContainText('Challenge 2 of 10,000 unlocked');
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.reload();
  await expect(page.getByLabel('Challenge', { exact: true })).toHaveValue('1');
  await expect(page.locator('#unlock-status')).toContainText('Challenge 1 of 10,000 unlocked');
});
