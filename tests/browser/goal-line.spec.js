import { test, expect } from '@playwright/test';
import { LEVEL_COUNT } from '../../shared/progression.js';
import { makeDrill, planClearance, readContact, SAFETY_LINE, STEP } from '../../game9/clearance.js';

async function disableWebGL(page) {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...options) {
      if (type.startsWith('webgl')) return null;
      return getContext.call(this, type, ...options);
    };
  });
}

async function completeDrill(page, level = 1) {
  const feeds = makeDrill(level);
  for (const [index, feed] of feeds.entries()) {
    const tick = Math.round(feed.approachTime / STEP);
    const moves = Math.round(feed.crossing / 0.45);
    const move = page.getByRole('button', { name: moves < 0 ? 'Left' : 'Right', exact: true });
    for (let i = 0; i < Math.abs(moves); i++) await move.press('Enter');
    for (let i = Math.abs(moves); i < tick; i++) await page.getByRole('button', { name: 'Hold', exact: true }).press('Enter');
    await expect(page.locator('#contact')).toHaveText('Ball in reach.');
    await expect(page.getByRole('button', { name: 'Clear ball', exact: true })).toHaveAccessibleDescription('Ball in reach.');
    const contact = readContact(feed, tick, moves * 0.45);
    const aim = Array.from({ length: 121 }, (_, angle) => angle - 60).find(angle => {
      const shot = planClearance(feed, contact, tick, angle);
      return shot.atGate && !shot.interception;
    });
    expect(aim).toBeDefined();
    const slider = page.getByRole('slider', { name: 'Clearance angle' });
    await slider.focus();
    for (let i = 0; i < Math.abs(aim); i++) await page.keyboard.press(aim < 0 ? 'ArrowLeft' : 'ArrowRight');
    await page.getByRole('button', { name: 'Clear ball', exact: true }).press('Enter');
    if (index < feeds.length - 1) {
      await expect(page.locator('#message')).toContainText('Safe clearance');
      await expect(page.locator('#ball')).toContainText(`${SAFETY_LINE.toFixed(2)} m from goal line`);
      await page.keyboard.press('Enter');
    }
  }
  const mastered = level === LEVEL_COUNT;
  await expect(page.locator('#message')).toContainText(mastered ? 'Campaign complete' : 'Drill cleared');
  if (mastered) {
    await expect(page.getByRole('button', { name: 'Next drill' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Restart drill' })).toBeFocused();
  }
  await page.reload();
  await expect(page.locator('#level')).toHaveValue(String(Math.min(level + 1, LEVEL_COUNT)));
  await expect(page.locator('#campaign')).toContainText(`${level} cleared`);
  if (mastered) await expect(page.locator('#campaign')).toContainText('Campaign complete');
}

test('Goal Line marks the campaign complete after the final drill', async ({ page }) => {
  await page.addInitScript(level => {
    const key = 'adigun.campaign.v1.goal-line';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({ version: 1, completed: level - 1, unlocked: level }));
    }
  }, LEVEL_COUNT);
  await page.goto('/game9/');
  await expect(page.locator('#campaign')).not.toContainText('Campaign complete');
  await completeDrill(page, LEVEL_COUNT);
});

test('Goal Line saves a complete final-tier drill and unlocks the next one', async ({ page }) => {
  await page.addInitScript(() => {
    const key = 'adigun.campaign.v1.goal-line';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({ version: 1, completed: 8001, unlocked: 8002 }));
    }
  });
  await page.goto('/game9/');
  await expect(page.locator('#pitch')).toHaveAttribute('data-renderer', 'WebGL2');
  await expect(page.locator('#level')).toHaveValue('8002');
  await completeDrill(page, 8002);
});

test('Goal Line renders actual 4K, recovers from failure and saves a complete keyboard drill', async ({ page }, info) => {
  await page.goto('/game9/');
  const pitch = page.locator('#pitch');
  await expect(pitch).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 15000 });
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
  await disableWebGL(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/game9/');
  await expect(page.locator('#graphics')).toContainText('3D unavailable');
  await expect(page.getByRole('combobox', { name: 'Camera' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Hold', exact: true })).toBeVisible();
  await completeDrill(page);
});

test('Goal Line can switch cameras without changing the drill state', async ({ page }) => {
  await page.goto('/game9/');
  const canvas = page.locator('#pitch');
  await expect(canvas).toHaveAttribute('data-camera', 'goal');
  const initialPosition = await page.locator('#ball').textContent();
  const camera = page.getByRole('combobox', { name: 'Camera' });
  await camera.selectOption('broadcast');
  await expect(canvas).toHaveAttribute('data-camera', 'broadcast');
  await expect(page.locator('#ball')).toHaveText(initialPosition);
  await page.getByRole('button', { name: 'Right', exact: true }).press('Enter');
  await expect(page.locator('#defender')).toHaveText('0.45 m right');
  await camera.selectOption('goal');
  await expect(canvas).toHaveAttribute('data-camera', 'goal');
  await expect(page.locator('#defender')).toHaveText('0.45 m right');
  await camera.selectOption('broadcast');
  await page.reload();
  await expect(camera).toHaveValue('broadcast');
  await expect(canvas).toHaveAttribute('data-camera', 'broadcast');
});

test.describe('Goal Line touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 800 } });

  test('play, retry and save a drill with taps', async ({ page }) => {
    await disableWebGL(page);
    await page.goto('/game9/');
    await expect(page.locator('#graphics')).toContainText('3D unavailable');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    const kick = page.getByRole('button', { name: 'Clear ball', exact: true });
    await kick.tap();
    await expect(page.locator('#message')).toContainText('Missed contact');
    await page.getByRole('button', { name: 'Restart drill' }).tap();

    const feeds = makeDrill(1);
    for (const [index, feed] of feeds.entries()) {
      const tick = Math.round(feed.approachTime / STEP);
      const moves = Math.round(feed.crossing / 0.45);
      const move = page.getByRole('button', { name: moves < 0 ? 'Left' : 'Right', exact: true });
      const hold = page.getByRole('button', { name: 'Hold', exact: true });
      for (let step = 0; step < Math.abs(moves); step++) await move.tap();
      for (let step = Math.abs(moves); step < tick; step++) await hold.tap();
      await expect(page.locator('#contact')).toHaveText('Ball in reach.');
      const aim = Math.atan((feed.channel - feed.crossing) / SAFETY_LINE) * 180 / Math.PI;
      const slider = page.getByRole('slider', { name: 'Clearance angle' });
      const { width, height } = await slider.boundingBox();
      await slider.tap({ position: { x: width * (aim + 60) / 120, y: height / 2 } });
      await kick.tap();
      if (index < feeds.length - 1) {
        await expect(page.locator('#message')).toContainText('Safe clearance');
        await page.getByRole('button', { name: 'Next ball' }).tap();
      }
    }
    await expect(page.locator('#message')).toContainText('Drill cleared');
    await page.reload();
    await expect(page.locator('#level')).toHaveValue('2');
  });
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
  await disableWebGL(page);
  const start = new Date('2026-11-21T16:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto('/game9/');
  const live = page.getByRole('button', { name: 'Start live ball' });
  await live.press('Enter');
  await page.keyboard.press('q');
  await expect(page.getByRole('slider', { name: 'Clearance angle' })).toHaveValue('-1');
  await page.keyboard.press('e');
  await page.keyboard.press('x');
  await expect(page.getByRole('slider', { name: 'Kick speed' })).toHaveValue('15');
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

test('Goal Line expert receiver changes the outlet and accepts a timed clearance', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: 6000, unlocked: 6001
    }));
  });
  await page.goto('/game9/');
  await expect(page.locator('#pitch')).toHaveAttribute('data-renderer', 'WebGL2');
  const gate = page.locator('#gate');
  await expect(gate).toHaveText('2.45 m right to 4.09 m right');
  await page.getByRole('button', { name: 'Right', exact: true }).press('Enter');
  const hold = page.getByRole('button', { name: 'Hold', exact: true });
  for (let i = 0; i < 18; i++) await hold.press('Enter');
  await expect(gate).toHaveText('2.74 m right to 4.38 m right');
  const aim = page.getByRole('slider', { name: 'Clearance angle' });
  for (let i = 0; i < 19; i++) await aim.press('ArrowRight');
  await page.getByRole('button', { name: 'Clear ball' }).press('Enter');
  await expect(page.locator('#message')).toContainText('Safe clearance');
});

test('Goal Line teaches the player to wait for a skipping feed to drop', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: 4043, unlocked: 4044
    }));
  });
  await page.goto('/game9/');
  await expect(page.locator('#pitch')).toHaveAttribute('data-renderer', 'WebGL2');
  const left = page.getByRole('button', { name: 'Left', exact: true });
  const hold = page.getByRole('button', { name: 'Hold', exact: true });
  for (let i = 0; i < 4; i++) await left.press('Enter');
  for (let i = 0; i < 17; i++) await hold.press('Enter');
  await expect(page.locator('#contact')).toContainText('Ball too high');
  await expect(page.locator('#ball')).toContainText('m high');
  await hold.press('Enter');
  await expect(page.locator('#contact')).toHaveText('Ball in reach.');
  const aim = page.getByRole('slider', { name: 'Clearance angle' });
  for (let i = 0; i < 36; i++) await aim.press('ArrowRight');
  await page.getByRole('button', { name: 'Clear ball' }).press('Enter');
  await expect(page.locator('#message')).toContainText('Safe clearance');
});

test('Goal Line kick speed controls rolling range and resets on retry', async ({ page }) => {
  await page.goto('/game9/');
  const hold = page.getByRole('button', { name: 'Hold', exact: true });
  for (let i = 0; i < 25; i++) await hold.press('Enter');
  const speed = page.getByRole('slider', { name: 'Kick speed' });
  await speed.press('Home');
  await expect(page.locator('#projection')).toContainText('Short');
  await page.getByRole('button', { name: 'Clear ball' }).press('Enter');
  await expect(page.locator('#message')).toContainText('Clearance fell short');
  await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
  await expect(speed).toHaveValue('14');
});

test('Goal Line heavy turf stops a soft clearance and rewards more power', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: 8001, unlocked: 8002
    }));
  });
  await page.goto('/game9/');
  await expect(page.locator('#pitch')).toHaveAttribute('data-renderer', 'WebGL2');
  await expect(page.locator('#surface')).toHaveText('SurfaceHeavy turf slows the clearance.');
  const left = page.getByRole('button', { name: 'Left', exact: true });
  const hold = page.getByRole('button', { name: 'Hold', exact: true });
  const aim = page.getByRole('slider', { name: 'Clearance angle' });
  const speed = page.getByRole('slider', { name: 'Kick speed' });
  const kick = page.getByRole('button', { name: 'Clear ball', exact: true });

  async function clearAt(power) {
    for (let step = 0; step < 3; step++) await left.press('Enter');
    for (let step = 0; step < 15; step++) await hold.press('Enter');
    await expect(page.locator('#contact')).toHaveText('Ball in reach.');
    for (let degree = 0; degree < 28; degree++) await aim.press('ArrowLeft');
    for (let current = 14; current > power; current--) await speed.press('ArrowLeft');
    await kick.press('Enter');
  }

  await clearAt(6);
  await expect(page.locator('#message')).toContainText('Clearance fell short');
  await expect(page.locator('#ball')).toContainText('6.43 m from goal line');
  await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
  await clearAt(10);
  await expect(page.locator('#message')).toContainText('Safe clearance');
  await expect(page.locator('#ball')).toContainText('8.00 m from goal line');
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

test('Goal Line standard gamepad starts play, moves, aims and restarts', async ({ page }) => {
  await disableWebGL(page);
  const start = new Date('2026-11-21T16:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.addInitScript(() => {
    window.goalLineTestPad = {
      connected: true, index: 0, mapping: 'standard', axes: [0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false }))
    };
    window.goalLinePadPolls = 0;
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => {
        window.goalLinePadPolls++;
        return [window.goalLineTestPad];
      }
    });
  });
  await page.goto('/game9/');
  await page.clock.runFor(50);
  await page.waitForFunction(() => window.goalLinePadPolls >= 2);
  async function press(index) {
    await page.evaluate(button => {
      window.goalLineTestPad.buttons[button].pressed = true;
    }, index);
    await page.clock.runFor(32);
    await page.evaluate(button => { window.goalLineTestPad.buttons[button].pressed = false; }, index);
    await page.clock.runFor(32);
  }
  await press(9);
  await expect(page.getByRole('button', { name: 'Pause live ball' })).toBeVisible();
  await press(15);
  await expect(page.getByRole('slider', { name: 'Clearance angle' })).toHaveValue('1');
  await press(5);
  await expect(page.getByRole('slider', { name: 'Kick speed' })).toHaveValue('15');
  await page.evaluate(() => { window.goalLineTestPad.axes[0] = -0.9; });
  await page.clock.runFor(150);
  await expect(page.locator('#defender')).toContainText('left');
  await press(0);
  await expect(page.locator('#message')).toContainText('Missed contact.');
  await press(3);
  await expect(page.getByRole('button', { name: 'Start live ball' })).toBeEnabled();
  await expect(page.locator('#defender')).toHaveText('centre');
});
