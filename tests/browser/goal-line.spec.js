import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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

test('Goal Line exposes advanced drill controls and status at 320px with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: 8001, unlocked: 8002,
    }));
  });
  await page.goto('/game9/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to drill controls' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Start live ball' })).toBeFocused();
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Left', exact: true }).press('Enter');
  for (let step = 3; step < 18; step++) await page.getByRole('button', { name: 'Hold', exact: true }).press('Enter');
  await expect(page.getByRole('checkbox', { name: 'Loft the clearance' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear ball' })).toHaveAccessibleDescription('Ball in reach.');
  const angle = page.getByRole('slider', { name: 'Clearance angle', exact: true });
  await angle.press('ArrowLeft');
  await expect(angle).toHaveAttribute('aria-valuetext', '1 degree left');
  const speed = page.getByRole('slider', { name: 'Kick speed', exact: true });
  await speed.press('Home');
  await expect(speed).toHaveAttribute('aria-valuetext', '4 meters per second');
  await page.getByText('Drill rules', { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]);
});

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
  await expect(page.locator('#message')).toContainText('Ball 1 of 5. Heavy turf slows the clearance.');
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
  const graphicsRequests = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (/\/game9\/(pitch\.js|defender\.mesh\.bin|textures\/)|\/vendor\/three\//.test(path)) graphicsRequests.push(path);
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/game9/');
  await expect(page.locator('#graphics')).toContainText('3D unavailable');
  await expect(page.getByRole('combobox', { name: 'Camera' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Hold', exact: true })).toBeVisible();
  await expect(page.locator('#contact')).toHaveText('Wait for the ball to reach you.');
  const left = page.getByRole('button', { name: 'Left', exact: true });
  for (let step = 0; step < 3; step++) await left.press('Enter');
  await expect(page.locator('#contact')).toHaveText('Move right to meet the ball.');
  await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
  await completeDrill(page);
  expect(graphicsRequests).toEqual([]);
});

test('Goal Line keeps the drill playable when WebGL is lost mid-play', async ({ page }) => {
  await page.goto('/game9/');
  const pitch = page.locator('#pitch');
  await expect(pitch).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 15000 });
  await page.getByRole('button', { name: 'Right', exact: true }).press('Enter');
  const incoming = await page.locator('#ball').textContent();
  await pitch.evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('#graphics')).toContainText('3D unavailable');
  await expect(pitch).toBeHidden();
  await expect(page.locator('#defender')).toHaveText('0.45 m right');
  await expect(page.locator('#ball')).toHaveText(incoming);
  await page.getByRole('button', { name: 'Hold', exact: true }).press('Enter');
  await expect(page.locator('#ball')).not.toHaveText(incoming);
  await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
  await completeDrill(page);
});

test('Goal Line restores 3D without resetting the current feed', async ({ page }) => {
  await page.goto('/game9/');
  const pitch = page.locator('#pitch');
  await expect(pitch).toHaveAttribute('data-renderer', 'WebGL2', { timeout: 15000 });
  await page.getByRole('combobox', { name: 'Camera' }).selectOption('broadcast');
  const glLoss = await pitch.evaluateHandle(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context'));
  await glLoss.evaluate(extension => extension.loseContext());
  await expect(pitch).toBeHidden();
  await page.getByRole('button', { name: 'Right', exact: true }).press('Enter');
  const position = await page.locator('#ball').textContent();
  await glLoss.evaluate(extension => extension.restoreContext());
  await expect(pitch).toBeVisible({ timeout: 15000 });
  await expect(pitch).toHaveAttribute('data-camera', 'broadcast');
  await expect(page.locator('#defender')).toHaveText('0.45 m right');
  await expect(page.locator('#ball')).toHaveText(position);
  await page.getByRole('combobox', { name: 'Graphics' }).selectOption('4k');
  await expect(pitch).toHaveAttribute('data-resolution', '3840x2160');
  expect(await pitch.evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    return [gl.drawingBufferWidth, gl.drawingBufferHeight, gl.isContextLost(), gl.getError()];
  })).toEqual([3840, 2160, false, 0]);
});

test('Goal Line resets shin and boot angles after a reaching pose', async ({ page }) => {
  await page.goto('/game9/');
  const poses = await page.evaluate(async () => {
    const [{ loadPlayers }, { THREE }] = await Promise.all([
      import('/game9/defender.js'), import('/shared/three-stage.js'),
    ]);
    const { createReceiver } = await loadPlayers();
    const receiver = createReceiver();
    receiver.mesh.rotation.y = Math.PI;
    const joints = ['lowerleg01.L', 'foot.L'].map(name => receiver.mesh.skeleton.getBoneByName(name));
    const sample = () => joints.map(joint => joint.quaternion.toArray());
    receiver.settle(0);
    const neutral = sample();
    receiver.plantBoot(new THREE.Vector3(-0.25, 0.24, -0.44), 0.48, 0, 1);
    const reaching = sample();
    receiver.settle(0);
    return { neutral, reaching, reset: sample() };
  });
  expect(poses.reaching).not.toEqual(poses.neutral);
  expect(poses.reset).toEqual(poses.neutral);
});

test('Goal Line can enter and exit full screen during a drill', async ({ page }) => {
  await page.goto('/game9/');
  await expect(page.locator('#pitch')).toHaveAttribute('data-renderer', 'WebGL2');
  const enter = page.getByRole('button', { name: 'Enter full screen' });
  await enter.press('Enter');
  const exit = page.getByRole('button', { name: 'Exit full screen' });
  await expect(exit).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement?.id)).toBe('game');
  const ball = await page.locator('#ball').textContent();
  await page.getByRole('button', { name: 'Hold', exact: true }).press('Enter');
  await expect(page.locator('#ball')).not.toHaveText(ball);
  const advancedBall = await page.locator('#ball').textContent();
  await exit.press('Enter');
  await expect(enter).toBeVisible();
  await expect(page.locator('#ball')).toHaveText(advancedBall);
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
  const speed = page.getByRole('slider', { name: 'Kick speed' });
  await speed.focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#message')).toContainText('Live ball paused');
  await expect(speed).toBeFocused();
  await page.clock.runFor(4000);
  await expect(page.locator('#ball')).toContainText('22.00 m from goal line');
  const resume = page.getByRole('button', { name: 'Resume live ball' });
  await resume.press('Enter');
  const drill = page.getByRole('spinbutton', { name: 'Drill' });
  await drill.focus();
  await page.keyboard.press('Escape');
  await expect(resume).toBeEnabled();
  await expect(drill).toBeFocused();
  await resume.press('Enter');
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
  await expect(page.locator('#projection')).toContainText('On target');
  await kick.press('Enter');
  await expect(page.locator('#message')).toContainText('Safe clearance');
});

test('Goal Line can loft over the press if the ball drops for the receiver', async ({ page }) => {
  await disableWebGL(page);
  await page.addInitScript(() => localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
    version: 1, completed: 2000, unlocked: 2001,
  })));
  await page.goto('/game9/');
  const right = page.getByRole('button', { name: 'Right', exact: true });
  const hold = page.getByRole('button', { name: 'Hold', exact: true });
  const aim = page.getByRole('slider', { name: 'Clearance angle' });
  const loft = page.getByRole('checkbox', { name: 'Loft the clearance' });
  const kick = page.getByRole('button', { name: 'Clear ball', exact: true });
  async function approach() {
    for (let step = 0; step < 3; step++) await right.press('Enter');
    for (let step = 0; step < 19; step++) await hold.press('Enter');
    for (let degree = 0; degree < 7; degree++) await aim.press('ArrowRight');
  }
  await approach();
  await expect(page.locator('#projection')).toContainText('intercepted');
  await loft.check();
  await expect(page.locator('#projection')).toHaveText('Too high for the receiver');
  await kick.press('Enter');
  await expect(page.locator('#message')).toContainText('Clearance was too high');
  await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
  await expect(loft).not.toBeChecked();
  await approach();
  await loft.check();
  const speed = page.getByRole('slider', { name: 'Kick speed' });
  for (let step = 0; step < 8; step++) await speed.press('ArrowLeft');
  await expect(page.locator('#projection')).toContainText('On target');
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
  await expect(page.locator('#message')).toContainText('This feed bounces.');
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
  await page.getByRole('button', { name: 'Next ball' }).press('Enter');
  await expect(page.locator('#message')).toContainText('Ball 2 of 5. The receiver is moving.');
});

test('Goal Line audio starts on request and mutes without interrupting play', async ({ page }) => {
  await disableWebGL(page);
  await page.addInitScript(() => {
    window.goalLineAudioSources = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const sample = this.buffer.getChannelData(0);
      window.goalLineAudioSources.push({
        duration: this.buffer.duration,
        startsAt: args[0],
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

  await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  const start = new Date('2026-11-21T16:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.getByRole('button', { name: 'Start live ball' }).press('Enter');
  await page.clock.runFor(2300);
  await expect(page.locator('#contact')).toHaveText('Ball in reach.');
  await page.clock.runFor(100);
  expect(await page.evaluate(() => window.goalLineAudioSources)).toEqual([
    expect.objectContaining({ duration: expect.closeTo(0.11, 3) }),
    expect.objectContaining({ duration: expect.closeTo(0.16, 3), audibleSignal: true })
  ]);
  const aim = page.getByRole('slider', { name: 'Clearance angle', exact: true });
  for (let degree = 0; degree < 23; degree++) await aim.press('ArrowRight');
  await page.getByRole('button', { name: 'Clear ball' }).press('Enter');
  await expect(page.locator('#message')).toContainText('Safe clearance');
  const contacts = await page.evaluate(() => window.goalLineAudioSources.slice(2));
  expect(contacts).toEqual([
    expect.objectContaining({ duration: expect.closeTo(0.19, 3), audibleSignal: true }),
    expect.objectContaining({ duration: expect.closeTo(0.15, 3), audibleSignal: true })
  ]);
  const feed = makeDrill(1)[0];
  const shot = planClearance(feed, readContact(feed, 24, 0), 24, 23);
  expect(contacts[1].startsAt - contacts[0].startsAt).toBeCloseTo(shot.travelTime, 1);
});

test('Goal Line standard gamepad controls play and pauses on disconnect', async ({ page }) => {
  await disableWebGL(page);
  const start = new Date('2026-11-21T16:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.addInitScript(() => {
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({ version: 1, completed: 2000, unlocked: 2001 }));
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
  const loft = page.getByRole('checkbox', { name: 'Loft the clearance' });
  await page.getByRole('button', { name: 'Pause live ball' }).focus();
  await page.keyboard.press('v');
  await expect(loft).toBeChecked();
  await press(2);
  await expect(loft).not.toBeChecked();
  await press(2);
  await expect(loft).toBeChecked();
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
  await expect(loft).not.toBeChecked();
  await press(9);
  await page.clock.runFor(150);
  await page.evaluate(() => {
    const gamepad = window.goalLineTestPad;
    gamepad.connected = false;
    window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad }));
  });
  await expect(page.locator('#message')).toContainText('Controller disconnected. Live ball paused.');
  const ball = await page.locator('#ball').textContent();
  const defender = await page.locator('#defender').textContent();
  await page.clock.runFor(3000);
  await expect(page.locator('#ball')).toHaveText(ball);
  await expect(page.locator('#defender')).toHaveText(defender);
  const resume = page.getByRole('button', { name: 'Resume live ball' });
  await expect(resume).toBeEnabled();
  await page.evaluate(() => {
    const gamepad = window.goalLineTestPad;
    gamepad.connected = true;
    gamepad.buttons[9].pressed = true;
    window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad }));
  });
  await page.clock.runFor(100);
  await expect(resume).toBeEnabled();
  await page.evaluate(() => { window.goalLineTestPad.buttons[9].pressed = false; });
  await page.clock.runFor(32);
  await press(9);
  await expect(page.getByRole('button', { name: 'Pause live ball' })).toBeEnabled();
});
