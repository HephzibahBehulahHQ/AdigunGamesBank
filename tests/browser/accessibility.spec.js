import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Automated checks are partial accessibility evidence, not a claim of complete
// screen-reader or physical touch-device conformance.
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function audit(page, testInfo) {
  const result = await new AxeBuilder({ page }).withTags(tags).analyze();
  await testInfo.attach('accessibility-scan', {
    body: JSON.stringify(result), contentType: 'application/json'
  });
  const issues = result.violations.map(({ id, impact, nodes }) => ({
    id, impact, targets: nodes.map(node => node.target)
  }));
  expect(issues).toEqual([]);
}

for (const route of ['/', '/game3/', '/game11/', '/game15/', '/game22/', '/game23/']) {
  test(`320px reflow, keyboard focus and automated accessibility: ${route}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth
    }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, outline: getComputedStyle(element).outlineStyle,
        top: rect.top, left: rect.left, right: rect.right };
    });
    expect(focus.tag).toBe('A');
    expect(focus.outline).not.toBe('none');
    expect(focus.top).toBeGreaterThanOrEqual(0);
    expect(focus.left).toBeGreaterThanOrEqual(0);
    expect(focus.right).toBeLessThanOrEqual(320);
    await audit(page, testInfo);
    await page.screenshot({ path: `test-results/reflow-320-${route.replaceAll('/', '') || 'catalog'}.png`, fullPage: true });
  });
}

test('catalog light theme passes automated contrast and control checks', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toHaveAttribute('aria-pressed', 'true');
  await audit(page, testInfo);
});
