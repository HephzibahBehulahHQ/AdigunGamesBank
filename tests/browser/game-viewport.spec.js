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
    const controls = main.locator(studio ? '.studio-dock, .neon-controls, .circuit-controls, .bench-studio-controls, .volt-controls' : '.game-console-content');
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
