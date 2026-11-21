import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const mode = process.argv[2] ?? '16k';
if (mode !== '4k' && mode !== '16k') throw new Error('Choose 4k or 16k.');
const requested = mode === '4k' ? [3840, 2160] : [15360, 8640];
const rounds = Number(process.argv[3] ?? 1);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100) {
  throw new Error('Choose a workload of 1 to 100 live feeds.');
}

const root = path.resolve(import.meta.dirname, '..', 'dist');
const output = path.resolve(import.meta.dirname, '..', 'test-results', `goal-line-hardware-${mode}`);
const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png'
};
const server = createServer(async (request, response) => {
  try {
    const route = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, '.' + route, route.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(404).end();
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await readFile(path.join(root, 'game9', 'index.html'));
await mkdir(output, { recursive: true });
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    // Unlock one advanced drill in the isolated test context to exercise both players.
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: 2000, unlocked: 2001
    }));
    window.goalLineDrawTimes = [];
    let lastFrame = null;
    const drawElements = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      const frameTime = document.timeline.currentTime;
      if (frameTime !== lastFrame && frameTime !== null) {
        lastFrame = frameTime;
        window.goalLineDrawTimes.push(frameTime);
      }
      return drawElements.apply(this, args);
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/game9/`);
  const canvas = page.locator('#pitch');
  const graphics = page.getByRole('combobox', { name: 'Graphics' });
  await page.waitForFunction(() => document.querySelector('#pitch').dataset.renderer || document.querySelector('#pitch').hidden);
  if (await graphics.isEnabled()) await graphics.selectOption(mode);
  const readSurface = () => canvas.evaluate(element => {
    if (element.dataset.renderer !== 'WebGL2') return null;
    const graphicsContext = element.getContext('webgl2');
    if (!graphicsContext) return null;
    const debug = graphicsContext.getExtension('WEBGL_debug_renderer_info');
    return {
      drawingBuffer: [graphicsContext.drawingBufferWidth, graphicsContext.drawingBufferHeight],
      renderBuffer: element.dataset.renderResolution.split('x').map(Number),
      renderSurface: element.dataset.renderSurface,
      maxViewport: Array.from(graphicsContext.getParameter(graphicsContext.MAX_VIEWPORT_DIMS)),
      maxRenderbuffer: graphicsContext.getParameter(graphicsContext.MAX_RENDERBUFFER_SIZE),
      renderer: graphicsContext.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? graphicsContext.RENDERER),
      error: graphicsContext.getError(),
      contextLost: graphicsContext.isContextLost()
    };
  });
  const before = await readSurface();
  const requestedBufferAllocated = before?.renderBuffer.every((dimension, index) => dimension === requested[index]) ?? false;
  let after = null;
  let sample = null;
  let workloadError = null;
  if (requestedBufferAllocated) {
    const frameIntervals = [];
    let frameCount = 0;
    let activeMilliseconds = 0;
    let completedRounds = 0;
    const started = performance.now();
    try {
      for (let round = 0; round < rounds; round++) {
        if (round) await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
        await page.evaluate(() => { window.goalLineDrawTimes.length = 0; });
        await page.getByRole('button', { name: 'Start live ball' }).press('Enter');
        await page.getByRole('button', { name: 'Pause live ball' }).waitFor({ timeout: 5000 });
        await page.keyboard.down(round % 2 ? 'a' : 'd');
        await page.waitForFunction(() => document.querySelector('#defender').textContent !== 'centre', undefined, { timeout: 5000 });
        await page.keyboard.up(round % 2 ? 'a' : 'd');
        await page.waitForFunction(() =>
          Number(document.querySelector('#ball').textContent.match(/, ([\d.]+) m from goal line/)?.[1]) < 12,
        undefined, { timeout: 5000 });
        await page.keyboard.press('Escape');
        const frames = await page.evaluate(() => window.goalLineDrawTimes);
        for (let i = 1; i < frames.length; i++) frameIntervals.push(frames[i] - frames[i - 1]);
        frameCount += frames.length;
        if (frames.length) activeMilliseconds += frames.at(-1) - frames[0];
        after = await readSurface();
        if (!after || after.contextLost || after.error ||
            after.renderBuffer.some((dimension, index) => dimension !== requested[index])) {
          throw new Error(`Render target failed in round ${round + 1}.`);
        }
        completedRounds++;
      }
    } catch (error) {
      await page.keyboard.up('a');
      await page.keyboard.up('d');
      await page.keyboard.press('Escape');
      workloadError = String(error);
    }
    after = await readSurface();
    frameIntervals.sort((a, b) => a - b);
    const percentile = fraction => frameIntervals[Math.ceil(frameIntervals.length * fraction) - 1] ?? null;
    sample = {
      completedRounds, requestedRounds: rounds, frames: frameCount,
      activeMilliseconds, wallMilliseconds: performance.now() - started,
      medianMs: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99)
    };
    if (await canvas.isVisible()) await canvas.screenshot({ path: path.join(output, 'viewport.png'), timeout: 5000 });
  }
  const softwareRenderer = /swiftshader|llvmpipe|softpipe|software|basic render driver|warp/i.test(before?.renderer ?? '');
  const report = {
    mode, requested, requestedBufferAllocated, softwareRenderer, before, after, sample, workloadError,
    browser: browser.version(), platform: process.platform,
    graphicsStatus: await page.locator('#graphics').textContent(),
    capturedAt: new Date().toISOString()
  };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!requestedBufferAllocated || softwareRenderer || workloadError || !after || after.contextLost || after.error || !sample?.medianMs ||
      after?.renderBuffer.some((dimension, index) => dimension !== requested[index])) process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
