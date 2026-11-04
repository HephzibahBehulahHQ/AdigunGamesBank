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
  await page.locator('#sub-out').selectOption('h11'); await page.locator('#sub-in').selectOption('h12');
  await page.locator('#queue-sub').click(); await expect(page.locator('#sub-status')).toContainText('Queued for the next stoppage');
  await page.locator('#cancel-subs').click(); await expect(page.locator('#sub-status')).toContainText('No substitution queued');
  await page.locator('#queue-sub').click(); await expect(page.locator('#sub-status')).toContainText('Queued for the next stoppage');
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
  await expect(page.locator('#home-substitutions')).toHaveText('1');
  await expect(page.locator('#player-select option[value="h12"]')).toHaveCount(1);
  await expect(page.locator('#player-select option[value="h11"]')).toHaveCount(0);
  await expect(page.locator('#overlay-title')).toContainText(/Full.time|Objective|Win/i);
  await page.screenshot({ path: 'test-results/football-fulltime.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('AI Arena renders 4K and previews real challenges without inventing live results or progress', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game22/');
  await expect(page.locator('#arena-stage')).toHaveAttribute('data-renderer', 'WebGL2');
  await page.locator('#arena-quality').selectOption('4k');
  await expect(page.locator('#arena-stage')).toHaveAttribute('data-resolution', '3840x2160');
  expect(await page.locator('#arena-stage').evaluate(c => { const g = c.getContext('webgl2'); return [g.drawingBufferWidth,g.drawingBufferHeight,g.getError()]; })).toEqual([3840,2160,0]);
  await page.screenshot({ path: 'test-results/ai-arena-4k.png', fullPage: true });
  await page.locator('#arena-quality').selectOption('auto');
  await expect(page.locator('#configured-count')).toContainText('0');
  await expect(page.locator('#results')).toBeEmpty();
  await expect(page.locator('#lineup input[type="checkbox"]')).toHaveCount(8);
  for (const provider of ['openai','anthropic','gemini','deepseek','grok','kimi','adigun','ollama']) {
    await expect(page.locator(`#provider-${provider}`)).toBeDisabled();
  }
  await page.locator('#play-mode').selectOption('campaign');
  await expect(page.locator('#campaign-level-readout')).toHaveText('Level 1 / 10,000');
  const first = await page.locator('#challenge-prompt').textContent();
  await page.locator('#campaign-level').fill('10000'); await page.locator('#load-challenge').click();
  await expect(page.locator('#campaign-level-readout')).toHaveText('Level 10,000 / 10,000');
  await expect(page.locator('#campaign-tier')).toHaveText('Professional Master');
  expect(await page.locator('#challenge-prompt').textContent()).not.toBe(first);
  await expect(page.locator('#campaign-progress')).toContainText('Sign in to a configured gateway');
  await expect(page.locator('#next-challenge')).toBeHidden();
  await expect(page.locator('#results')).toBeEmpty();
  await expect(page.locator('#prompt-form')).toBeHidden();
  await page.screenshot({ path: 'test-results/ai-arena-unconfigured.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('TACTICS GRID renders 4K and wins a mission through real command controls with saved progression', async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/game15/'); await expect(page.locator('#board')).toHaveAttribute('data-renderer', 'WebGL2');
  await page.locator('#quality').selectOption('4k');
  await expect(page.locator('#board')).toHaveAttribute('data-resolution', '3840x2160');
  expect(await page.locator('#board').evaluate(c => { const g = c.getContext('webgl2'); return [g.drawingBufferWidth,g.drawingBufferHeight,g.getError()]; })).toEqual([3840,2160,0]);
  await page.screenshot({ path: 'test-results/tactics-4k.png', fullPage: true });
  await page.locator('#quality').selectOption('auto'); await page.locator('#start').click();
  const actions = [
    ['P1','move','2,2'], ['P2','move','3,5'], ['P3','move','2,3'],
    ['P1','attack','E1'], ['P2','attack','E2'], ['P3','move','1,2'],
    ['P1','attack','E1'], ['P2','attack','E2'], ['P3','move','2,1'],
    ['P1','attack','E1'], ['P3','move','4,2'], ['P1','attack','E3'],
    ['P3','attack','E2'], ['P1','attack','E3'], ['P3','move','3,2'],
    ['P3','move','2,3'], ['P3','attack','E3'],
  ];
  for (const [unit, command, target] of actions) {
    await expect(page.locator('#phase')).toHaveText('Your turn');
    await page.locator(`#unit-${unit}`).click();
    await page.locator(command === 'move' ? '#move-to' : '#target-select').selectOption(target);
    await page.locator(`#${command}`).click();
  }
  await expect(page.locator('#phase')).toHaveText('Mission cleared');
  await expect(page.locator('#next')).toBeVisible();
  await page.screenshot({ path: 'test-results/tactics-win.png', fullPage: true });
  await page.locator('#next').click(); await expect(page.locator('#level-readout')).toHaveText('Mission 2 / 10,000');
  await page.reload(); await expect(page.locator('#level-readout')).toHaveText('Mission 2 / 10,000');
  expect(errors).toEqual([]);
});

test('David chapter renders 4K and completes all targets using real aiming controls', async ({ page }) => {
  test.setTimeout(90000);
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/game23/'); await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#quality').selectOption('4k');
  await expect(page.locator('#valley')).toHaveAttribute('data-resolution','3840x2160');
  expect(await page.locator('#valley').evaluate(c=>{ const g=c.getContext('webgl2'); return [g.drawingBufferWidth,g.drawingBufferHeight,g.getError()]; })).toEqual([3840,2160,0]);
  await page.screenshot({path:'test-results/bible-4k.png',fullPage:true});
  await page.locator('#quality').selectOption('auto'); await page.locator('#start').click();
  async function aimControl(id,value) {
    const slider=page.locator(`#${id}`);
    await expect(slider).toBeEnabled({timeout:15000});
    const current=Number(await slider.inputValue());
    const steps=Math.round((value-current)/Number(await slider.getAttribute('step')));
    await slider.focus();
    for(let i=0;i<Math.abs(steps);i++) await slider.press(steps>0?'ArrowRight':'ArrowLeft');
    await expect(slider).toHaveValue(value.toFixed(1).replace(/\.0$/,''));
  }
  const shots=[[-1.3,44.9,12.6],[1.2,45.4,14.2],[1.2,45.4,15.5]];
  for(let i=0;i<shots.length;i++) {
    for(const [j,id] of ['yaw','elevation','speed'].entries()) await aimControl(id,shots[i][j]);
    await page.locator('#throw').click();
    await expect(page.locator('#hits-readout')).toHaveText(`${i+1} / 3`,{timeout:20000});
  }
  await expect(page.locator('#next')).toBeVisible();
  await page.screenshot({path:'test-results/bible-win.png',fullPage:true});
  await page.locator('#next').click(); await expect(page.locator('#level-readout')).toHaveText('2 / 10,000');
  await page.reload(); await expect(page.locator('#level-readout')).toHaveText('2 / 10,000'); expect(errors).toEqual([]);
});

for (const route of ['/', '/game3/', '/game11/', '/game15/', '/game22/', '/game23/']) {
  test(`390px responsive layout and visible focus: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route); await page.waitForLoadState('networkidle');
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1] + 1);
    await page.keyboard.press('Tab'); expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('A');
    await page.screenshot({ path: `test-results/mobile-${route.replaceAll('/', '') || 'catalog'}.png`, fullPage: true });
  });
}
