import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../../data/games.json', import.meta.url)));

test('catalog filters, search, empty results and persistent accessible theme', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.game-card')).toHaveCount(catalog.games.length);
  await page.getByRole('button', { name: 'Engineering', exact: true }).click();
  await expect(page.locator('.game-card')).toHaveCount(catalog.games.filter(g => g.genre === 'engineering').length);
  await page.locator('#search').fill('electronicer'); await expect(page.locator('.game-card')).toHaveCount(1);
  await page.locator('#search').fill('no-such-game'); await expect(page.getByText('No games match.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light theme' }).click(); await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.screenshot({ path: 'test-results/catalog-desktop.png', fullPage: true });
});

test('Electronicer renders actual 4K and completes a real circuit through controls', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game3/'); await expect(page.locator('#circuit-view')).toHaveAttribute('data-renderer', 'WebGL2');
  await page.locator('#quality').selectOption('4k');
  await expect(page.locator('#circuit-view')).toHaveAttribute('data-resolution', '3840x2160');
  expect(await page.locator('#circuit-view').evaluate(c => { const g = c.getContext('webgl2'); return [g.drawingBufferWidth, g.drawingBufferHeight, g.getError()]; })).toEqual([3840, 2160, 0]);
  await page.locator('#link1').check(); await page.locator('#link2').check();
  await page.getByRole('button', { name: 'Power on', exact: true }).click();
  await expect(page.locator('#meter-current')).toHaveText('15.000 mA');
  await page.getByRole('button', { name: 'Verify circuit targets' }).click();
  await expect(page.locator('#message')).toContainText('Level 1 commissioned');
  await page.getByRole('button', { name: 'Verify circuit targets' }).click();
  await expect(page.locator('#save-status')).toContainText('1 levels completed');
  await page.screenshot({ path: 'test-results/electronicer-4k.png', fullPage: true });
  await page.getByRole('button', { name: 'Next level →' }).click();
  await expect(page.locator('#level-label')).toContainText('Level 2'); await page.reload();
  await expect(page.locator('#level-label')).toContainText('Level 2'); expect(errors).toEqual([]);
});

test('Electronicer fuse trips, stays open and can be repaired without a false level award', async ({ page }) => {
  await page.goto('/game3/'); await page.locator('#link1').check(); await page.locator('#link2').check();
  await page.locator('#fuse').selectOption('0.01'); await page.getByRole('button', { name: 'Power on', exact: true }).click();
  await expect(page.locator('#circuit-state')).toHaveText('Fuse tripped');
  await page.getByRole('button', { name: 'Verify circuit targets' }).click(); await expect(page.locator('#next-level')).toBeDisabled();
  await page.getByRole('button', { name: 'Power off', exact: true }).click();
  await page.locator('#fuse').selectOption('0.025'); await page.getByRole('button', { name: 'Replace fuse', exact: true }).click();
  await page.getByRole('button', { name: 'Power on', exact: true }).click(); await expect(page.locator('#meter-current')).toHaveText('15.000 mA');
});

test('football renders 4K, accepts movement/shot input, pauses and reaches a full-time result', async ({ page }) => {
  test.setTimeout(300000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game11/'); await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#quality').selectOption('4k'); await expect(page.locator('#pitch')).toHaveAttribute('data-resolution', '3840x2160');
  expect(await page.locator('#pitch').evaluate(c => { const g = c.getContext('webgl2'); return [g.drawingBufferWidth, g.drawingBufferHeight, g.getError()]; })).toEqual([3840,2160,0]);
  await page.screenshot({ path: 'test-results/football-4k.png', fullPage: true });
  // The full match runs at adaptive resolution: a CPU rasterizer is not a 4K performance benchmark.
  await page.setViewportSize({width: 800, height: 900});
  await page.locator('#quality').selectOption('auto'); await page.locator('#start').click();
  await page.locator('#pause').click(); const paused = await page.locator('#clock').innerText();
  await page.waitForTimeout(1200); await expect(page.locator('#clock')).toHaveText(paused);
  await page.locator('#pause').click();
  await page.locator('#pitch').focus();
  // Only read player-visible telemetry and issue real keyboard inputs. No engine state mutation.
  let held = new Set(); const deadline = Date.now() + 250000;
  while (Date.now() < deadline) {
    const view = await page.evaluate(() => ({
      x: +document.querySelector('#player-x').textContent, y: +document.querySelector('#player-y').textContent,
      bx: +document.querySelector('#ball-x').textContent, by: +document.querySelector('#ball-y').textContent,
      possession: document.querySelector('#possession').textContent,
      clock: document.querySelector('#clock').textContent,
      situation: document.querySelector('#situation').textContent,
      controlled: document.querySelector('#controlled').textContent
    }));
    if (view.clock === '00:00') break;
    const owner = view.situation.match(/Adigun #(\d+) has/);
    const own = view.possession === 'Adigun XI' && owner && view.controlled === `#${owner[1]}`;
    if (view.possession === 'Adigun XI' && owner && !own) await page.keyboard.press('q');
    const dx = own ? 1 : view.bx - view.x, dy = own ? -view.y : view.by - view.y;
    const desired = new Set(['Shift']);
    if (dx > .6) desired.add('d'); else if (dx < -.6) desired.add('a');
    if (dy > .8) desired.add('s'); else if (dy < -.8) desired.add('w');
    for (const key of held) if (!desired.has(key)) await page.keyboard.up(key);
    for (const key of desired) if (!held.has(key)) await page.keyboard.down(key);
    held = desired;
    if (own && view.x > 29 && Math.abs(view.y) < 15) { await page.keyboard.press('j'); await page.keyboard.press('Space'); }
    else if (!own) await page.keyboard.press('e');
    await page.waitForTimeout(160);
  }
  for (const key of held) await page.keyboard.up(key);
  await expect(page.locator('#clock')).toHaveText('00:00');
  await expect(page.locator('#home-shots')).not.toHaveText('0');
  await expect(page.locator('#overlay-title')).toContainText(/Full.time|Objective|Win/i);
  await page.screenshot({ path: 'test-results/football-fulltime.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('AI Arena discloses missing live configuration and does not invent model answers', async ({ page }) => {
  await page.goto('/game22/');
  await expect(page.locator('body')).toContainText(/API|gateway|configured/i);
  expect(await page.locator('body').innerText()).not.toContain('sandboxed_tests');
  await page.screenshot({ path: 'test-results/ai-arena-unconfigured.png', fullPage: true });
});

for (const route of ['/', '/game3/', '/game11/', '/game22/']) {
  test(`390px responsive layout and visible focus: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route); await page.waitForLoadState('networkidle');
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1] + 1);
    await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('A');
    await page.screenshot({ path: `test-results/mobile-${route.replaceAll('/', '') || 'catalog'}.png`, fullPage: true });
  });
}
