import { test, expect } from '@playwright/test';
import { makeDrill, STEP } from '../../game9/clearance.js';

async function completeDrill(page) {
  for (const [index, feed] of makeDrill(1).entries()) {
    const tick = Math.round(feed.approachTime / STEP);
    const moves = Math.round(feed.crossing / 0.45);
    const move = page.getByRole('button', { name: moves < 0 ? 'Left' : 'Right', exact: true });
    for (let i = 0; i < Math.abs(moves); i++) await move.press('Enter');
    for (let i = Math.abs(moves); i < tick; i++) await page.getByRole('button', { name: 'Hold', exact: true }).press('Enter');
    await expect(page.locator('#contact')).toHaveText('Ball in reach.');
    const aim = Math.round(Math.atan((feed.channel - feed.crossing - 8 * feed.drift) / 8) * 180 / Math.PI);
    const slider = page.getByRole('slider', { name: 'Clearance angle' });
    await slider.focus();
    for (let i = 0; i < Math.abs(aim); i++) await page.keyboard.press(aim < 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.getByRole('button', { name: 'Clear ball', exact: true }).press('Enter');
    if (index < 2) {
      await expect(page.locator('#message')).toContainText('Safe clearance');
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.locator('#message')).toContainText('Drill cleared');
  await page.reload();
  await expect(page.locator('#level')).toHaveValue('2');
  await expect(page.locator('#campaign')).toContainText('1 cleared');
}

test('Goal Line renders actual 4K, recovers from failure and saves a complete keyboard drill', async ({ page }, info) => {
  await page.goto('/game9/');
  const pitch = page.locator('#pitch');
  await expect(pitch).toHaveAttribute('data-renderer', 'WebGL2');
  await page.getByRole('combobox', { name: 'Graphics' }).selectOption('4k');
  await expect(pitch).toHaveAttribute('data-resolution', '3840x2160');
  const drawingBuffer = await pitch.evaluate((canvas) => {
    const gl = canvas.getContext('webgl2');
    return [gl.drawingBufferWidth, gl.drawingBufferHeight, gl.getError()];
  });
  expect(drawingBuffer).toEqual([3840, 2160, 0]);
  await info.attach('goal-line-4k-pitch', { body: await pitch.screenshot(), contentType: 'image/png' });
  await page.getByRole('combobox', { name: 'Graphics' }).selectOption('auto');
  await page.getByRole('button', { name: 'Clear ball', exact: true }).press('Enter');
  await expect(page.locator('#message')).toContainText('Missed contact');
  await expect(page.getByRole('button', { name: 'Restart drill' })).toBeFocused();
  await page.keyboard.press('Enter');
  await completeDrill(page);
});

test('Goal Line keeps visible keyboard controls and saves without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...options) {
      if (type.startsWith('webgl')) return null;
      return getContext.call(this, type, ...options);
    };
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/game9/');
  await expect(page.locator('#graphics')).toContainText('3D unavailable');
  await expect(page.getByRole('button', { name: 'Hold', exact: true })).toBeVisible();
  await completeDrill(page);
});

test('Goal Line rejects 16K when the device viewport limit is too small', async ({ page }) => {
  await page.addInitScript(() => {
    const getParameter = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === this.MAX_VIEWPORT_DIMS) return new Int32Array([8192, 8192]);
      return getParameter.call(this, parameter);
    };
  });
  await page.goto('/game9/');
  const pitch = page.locator('#pitch');
  await expect(pitch).toHaveAttribute('data-renderer', 'WebGL2');
  const graphics = page.getByRole('combobox', { name: 'Graphics' });
  await graphics.selectOption('16k');
  await expect(graphics).toHaveValue('auto');
  await expect(page.locator('#graphics')).toContainText('16K UHD unavailable on this device.');
  await expect(pitch).not.toHaveAttribute('data-resolution', '15360x8640');
});

test('Goal Line runs a timed feed with held keys, pauses and resets cleanly', async ({ page }) => {
  const start = new Date('2026-11-21T16:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto('/game9/');
  const live = page.getByRole('button', { name: 'Start live ball' });
  await live.press('Enter');
  await page.keyboard.down('d');
  await page.clock.runFor(300);
  await page.keyboard.up('d');
  await expect(page.locator('#defender')).toHaveText('1.35 m right');
  await expect(page.locator('#ball')).toContainText('22.00 m from goal line');
  await page.keyboard.press('Escape');
  await expect(page.locator('#message')).toContainText('Live ball paused');
  await page.clock.runFor(4000);
  await expect(page.locator('#ball')).toContainText('22.00 m from goal line');
  await page.getByRole('button', { name: 'Resume live ball' }).press('Enter');
  await page.clock.runFor(3000);
  await expect(page.locator('#message')).toContainText('Goal conceded');
  await page.keyboard.press('Enter');
  await expect(page.locator('#defender')).toHaveText('centre');
  await expect(live).toBeEnabled();
});

test('Goal Line advanced pressure punishes a blocked lane and allows a wider angle', async ({ page }) => {
  // Seed progression only. Interception and retry run through the actual game controls.
  await page.addInitScript(() => {
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: 2000, unlocked: 2001
    }));
  });
  await page.goto('/game9/');
  await expect(page.locator('#pitch')).toHaveAttribute('data-renderer', 'WebGL2');
  await expect(page.locator('#pressing')).toBeVisible();
  const right = page.getByRole('button', { name: 'Right', exact: true });
  const hold = page.getByRole('button', { name: 'Hold', exact: true });
  const aim = page.getByRole('slider', { name: 'Clearance angle' });
  const kick = page.getByRole('button', { name: 'Clear ball' });
  async function play(angle) {
    for (let i = 0; i < 3; i++) await right.press('Enter');
    for (let i = 0; i < 19; i++) await hold.press('Enter');
    for (let i = 0; i < angle; i++) await aim.press('ArrowRight');
  }
  await play(7);
  await expect(page.locator('#projection')).toContainText('intercepted');
  await kick.press('Enter');
  await expect(page.locator('#message')).toContainText('The pressing player intercepted');
  await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
  await play(11);
  await expect(page.locator('#projection')).not.toContainText('intercepted');
  await kick.press('Enter');
  await expect(page.locator('#message')).toContainText('Safe clearance');
});

test('Goal Line audio starts on request and mutes without interrupting play', async ({ page }) => {
  await page.addInitScript(() => {
    window.goalLineAudioSources = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const sample = this.buffer.getChannelData(0);
      window.goalLineAudioSources.push({
        duration: this.buffer.duration,
        audibleSignal: sample.some(value => Math.abs(value) > 0.01)
      });
      return start.apply(this, args);
    };
  });
  await page.goto('/game9/');
  const sound = page.getByRole('button', { name: 'Sound', exact: true });
  const right = page.getByRole('button', { name: 'Right', exact: true });
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await right.press('Enter');
  expect(await page.evaluate(() => window.goalLineAudioSources)).toEqual([]);
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 3; i++) await right.press('Enter');
  expect(await page.evaluate(() => window.goalLineAudioSources)).toEqual([
    expect.objectContaining({ audibleSignal: true })
  ]);
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  for (let i = 0; i < 3; i++) await right.press('Enter');
  await expect(page.locator('#defender')).toHaveText('3.15 m right');
  expect(await page.evaluate(() => window.goalLineAudioSources)).toHaveLength(1);
});
