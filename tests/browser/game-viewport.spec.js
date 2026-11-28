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
    const controls = main.locator(studio ? '.studio-dock, .neon-controls, .circuit-controls, .bench-studio-controls, .volt-controls, .tray-controls, .charge-controls, .register-studio-controls, .fuse-controls, .goal-controls, .apex-controls, .football-controls, .cortex-actions, .memory-controls, .quiz-controls, .tactics-controls, .strategy-controls, .pitch-action, .debate-controls, .case-controls, .market-controls, .signal-controls, .arena-controls, .valley-controls' : '.game-console-content');
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

test('Last Signal keeps help independent of the match and accepts touch input', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/game21/');
  const toggle = page.getByRole('button', { name: 'Help and match information' });
  const start = page.getByRole('button', { name: 'Drop into the basin' });
  const again = page.getByRole('button', { name: 'Drop again' });
  await expect(again).toBeHidden();
  await toggle.press('Space');
  await expect(page.locator('#studio-help')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(start).toBeVisible();
  await start.tap();
  await expect(start).toBeHidden();
  const arena = page.locator('canvas#arena');
  await expect(arena).toBeFocused();
  await expect(page.getByRole('button', { name: 'Move right' })).toBeVisible();
  const ammo = Number(await page.locator('#ammo').textContent());
  await arena.tap({ position: { x: 310, y: 508 } });
  await expect(page.locator('#ammo')).toHaveText(String(ammo - 1));
  await toggle.tap();
  await expect(page.locator('#studio-help')).toBeVisible();
  const clock = await page.locator('#clock').textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator('#clock')).toHaveText(clock);
  await context.close();
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

test('APEX Strategy applies a driver setup, charts a full race and restarts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game16/');
  const chart = page.locator('#chart');
  await expect.poll(() => chart.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
  await page.getByRole('button', { name: 'Driver strategy' }).click();
  await page.locator('#tyre-hb1').selectOption('hard');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start race' }).click();
  await expect(page.locator('#lap-label')).toHaveText('1/10');
  await page.getByRole('button', { name: 'Race data' }).click();
  await expect(page.locator('#standings tr').filter({ hasText: /HARD/ }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  for (let lap = 2; lap <= 10; lap++) {
    await page.getByRole('button', { name: 'Run lap ' + lap, exact: true }).click();
  }
  await expect(page.locator('#overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Race again' }).click();
  await expect(page.locator('#lap-label')).toHaveText('0/10');
  await expect(page.getByRole('button', { name: 'Start race' })).toBeVisible();
});

test('Debate Arena validates arguments, reviews three rounds and starts a new debate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game18/');
  await page.getByRole('button', { name: 'Begin debate' }).press('Enter');
  const submit = page.getByRole('button', { name: 'Submit argument' });
  await submit.click();
  await expect(page.locator('#validation')).not.toBeEmpty();
  for (let round = 1; round <= 3; round++) {
    await page.getByRole('textbox', { name: /Your argument/ }).fill('A controlled trial would measure costs, access and quality because all three matter to this decision.');
    await submit.click();
    await expect(page.locator('#round-result')).toContainText('Round ' + round);
    await expect(page.locator('#ai-text')).not.toBeEmpty();
    if (round === 1) {
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Review result' }).press('Enter');
      await expect(page.locator('#result')).toBeVisible();
    }
    await page.getByRole('button', { name: round === 3 ? 'Final result' : 'Next round' }).click();
  }
  await expect(page.locator('#finish')).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.getByRole('button', { name: 'Begin debate' })).toBeFocused();
});

test('Casefile interviews a suspect, preserves literal notes and resolves an accusation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/game19/');
  await page.getByRole('button', { name: 'Open case' }).press('Enter');
  await page.getByRole('button', { name: /Interview Lena Cho/ }).click();
  await page.getByRole('textbox', { name: 'Your question' }).fill('Where was the <em>service key</em>?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.locator('#left')).toHaveText('9');
  await page.getByRole('button', { name: 'Case notes' }).click();
  await expect(page.locator('#log')).toContainText('<em>service key</em>');
  await expect(page.locator('#log em')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Accuse', exact: true }).click();
  await page.getByLabel('Suspect', { exact: true }).selectOption('lena');
  await page.getByRole('button', { name: 'Confirm accusation' }).click();
  await expect(page.locator('#end-title')).toHaveText('Case solved');
  await page.getByRole('button', { name: 'Next case', exact: true }).click();
  await expect(page.locator('#case-title')).toHaveText('Blackout at Meridian');
  await expect(page.locator('#left')).toHaveText('10');
});

test('Market Duel selects a stock, settles an order and completes the market', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/game20/');
  await page.getByRole('button', { name: 'Open market' }).press('Enter');
  await page.getByRole('button', { name: 'QuantaForge Systems' }).click();
  await page.getByRole('button', { name: 'Trade shares' }).click();
  await page.getByRole('spinbutton', { name: 'Shares' }).fill('2');
  await page.getByRole('button', { name: 'Buy', exact: true }).click();
  await expect(page.locator('#order-status')).toContainText('$78.20');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Portfolio and market log/ }).click();
  await expect(page.locator('#holdings')).toContainText('QuantaForge Systems · 2 shares');
  await page.keyboard.press('Escape');
  for (let day = 0; day < 30; day++) await page.getByRole('button', { name: 'Next day' }).click();
  await expect(page.locator('#day')).toHaveText('30');
  await expect(page.locator('#end-screen')).toBeVisible();
  await page.getByRole('button', { name: 'Trade again' }).click();
  await expect(page.locator('#day')).toHaveText('0');
});
