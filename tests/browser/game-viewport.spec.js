import { expect, test } from '@playwright/test';

// Apex Strategy and Market Duel use chart canvases as part of their consoles.
const consoleOnly = new Set([12, 13, 14, 16, 18, 19, 20]);
const sizes = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];

for (let game = 1; game <= 24; game++) {
  test(`game ${game} stays inside one viewport on desktop and phone`, async ({ page }) => {
    const hasStage = !consoleOnly.has(game);
    await page.goto(`/game${game}/`);
    const main = page.locator('main.game-viewport');
    const studio = (await main.getAttribute('id')) === 'studio';
    const controls = main.locator(studio ? '.studio-dock, .neon-controls, .circuit-controls, .bench-studio-controls, .volt-controls, .tray-controls, .charge-controls, .register-studio-controls, .fuse-controls, .goal-controls, .apex-controls, .football-controls, .cortex-actions, .memory-controls, .quiz-controls' : '.game-console-content');
    const canvas = main.locator('.game-play-surface > canvas');
    const dock = main.locator('.game-dock');
    await expect(canvas).toHaveCount(hasStage ? 1 : 0);

    for (const size of sizes) {
      await page.setViewportSize(size);
      await expect.poll(() => main.boundingBox()).toEqual({ x: 0, y: 0, ...size });
      const documentSize = await page.evaluate(() => {
        window.scrollTo(1000, 1000);
        return [document.documentElement.scrollWidth, document.documentElement.scrollHeight, scrollX, scrollY];
      });
      expect(documentSize).toEqual([size.width, size.height, 0, 0]);

      if (hasStage) {
        await expect.poll(() => canvas.boundingBox()).toEqual({ x: 0, y: 0, ...size });
        const unobstructed = await canvas.evaluate(element =>
          document.elementFromPoint(innerWidth * 0.35, innerHeight * 0.45) === element,
        );
        expect(unobstructed).toBe(true);
      }

      const control = controls.locator('button:visible:enabled, select:visible:enabled, input:visible:enabled').first();
      await control.scrollIntoViewIfNeeded();
      await control.focus();
      await expect(control).toBeFocused();
      await control.click({ trial: true });
      expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
    }

    if (studio) {
      const help = main.locator('#help-open');
      await help.press('Enter');
      await expect(main.locator('#studio-help')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(main.locator('#studio-help')).toBeHidden();
      await expect(help).toBeFocused();
    } else if (hasStage) {
      const jump = dock.getByRole('link', { name: 'Jump to play controls' });
      const target = await jump.getAttribute('href');
      await expect(controls.locator(target)).toBeAttached();
      await jump.click();
      await expect.poll(() => new URL(page.url()).hash).toBe(target);
      expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);

      const toggle = dock.locator(':scope > summary');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(dock).not.toHaveAttribute('open', '');
      await page.keyboard.press('Enter');
      await expect(dock).toHaveAttribute('open', '');
    } else {
      await expect(main.locator('.game-console-nav a')).toBeInViewport();
    }
  });
}

test('Last Signal keeps its controls toggle and start button independent', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game21/');
  const toggle = page.getByText('Game controls and information', { exact: true });
  const start = page.getByRole('button', { name: 'Drop into the basin' });
  const again = page.getByRole('button', { name: 'Drop again' });
  await expect(again).toBeHidden();
  await toggle.press('Space');
  await expect(start).toBeVisible();
  await start.click();
  await expect(start).toBeHidden();
  await expect(page.locator('canvas#arena')).toBeFocused();
});

test('Cortex Prime and Billionaire Challenge put answers before reference content on phones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game12/');
  await expect(page.getByRole('button', { name: 'Lock answer' })).toBeInViewport({ ratio: 1 });
  await page.goto('/game14/');
  await expect(page.locator('#answers button').first()).toBeInViewport({ ratio: 1 });
});

test('Cortex Prime switches puzzles and saves a solved stage from its phone studio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game12/');
  await page.getByRole('button', { name: 'Matrix Vault' }).click();
  await expect(page.locator('#modeTitle')).toHaveText('MATRIX VAULT');
  await page.getByRole('button', { name: 'Rule Decoder' }).click();
  await expect(page.locator('#puzzle')).toContainText('INPUT');
  await page.getByRole('button', { name: 'Sequence Engine' }).click();
  const values = (await page.locator('#puzzle').innerText()).match(/\d+/g).map(Number);
  await page.getByRole('textbox', { name: 'Your answer' }).fill(String(values.at(-1) + values[1] - values[0]));
  await page.getByRole('button', { name: 'Lock answer' }).click();
  await expect(page.locator('#solved')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#level')).toHaveText('2');
});

test('Synapse Sprint displays numbered pulses and saves a keyboard recall', async ({ page }) => {
  await page.addInitScript(() => {
    window.pulses = [];
    new MutationObserver(() => {
      const pulse = document.querySelector('#lights .active');
      const digit = pulse?.textContent;
      if (digit && window.pulses.at(-1)?.element !== pulse) {
        window.pulses.push({ element: pulse, digit });
      }
    }).observe(document, { subtree: true, attributes: true, childList: true });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game13/');
  await page.getByRole('button', { name: 'Start sequence' }).press('Enter');
  const entry = page.getByRole('textbox', { name: /Recall the sequence/ });
  await expect(entry).toBeEnabled({ timeout: 10000 });
  const digits = await page.evaluate(() => window.pulses.map(pulse => pulse.digit).join(''));
  expect(digits).toMatch(/^[1-6]{3}$/);
  await entry.fill(digits);
  await entry.press('Enter');
  await expect(page.locator('#phase')).toHaveText('Correct');
  await expect(page.getByRole('button', { name: 'Next sequence' })).toBeFocused();
  await page.reload();
  await expect(page.locator('#level')).toHaveText('2');
  await expect(page.locator('#best')).toHaveText('1');
});

test('Billionaire Challenge can bank during feedback and restart without stale answers', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/game14/');
  await page.locator('#answers [data-correct="true"]').click();
  await page.getByRole('button', { name: 'Bank prize' }).click();
  await expect(page.locator('#best')).toHaveText('£100');
  await expect(page.getByRole('button', { name: 'New challenge' })).toBeFocused();
  await page.getByRole('button', { name: 'New challenge' }).press('Enter');
  await expect(page.locator('#question')).toBeFocused();
  await expect(page.locator('#qno')).toHaveText('1');
  await page.getByRole('button', { name: 'Remove two wrong answers' }).click();
  await expect(page.locator('#answers button:disabled')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('#best')).toHaveText('£100');
});
