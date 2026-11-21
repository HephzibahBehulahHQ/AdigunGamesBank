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
