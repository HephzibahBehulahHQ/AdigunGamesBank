import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { makeDrill, planClearance, readContact } from '../game9/clearance.js';

const feed = makeDrill(2001)[0];
const delivery = readContact(feed, 22, 1.35);
const clearance = planClearance(feed, delivery, 22, 11);
const clearanceMilliseconds = Math.ceil((Math.max(0.035, delivery.delay) + clearance.travelTime) * 1000);

const mode = process.argv[2] ?? '16k';
if (mode !== '4k' && mode !== '16k') throw new Error('Choose 4k or 16k.');
const requested = mode === '4k' ? [3840, 2160] : [15360, 8640];
const rounds = Number(process.argv[3] ?? 1);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100) {
  throw new Error('Choose a workload of 1 to 100 live feeds.');
}
const headless = process.env.ADIGUN_HARDWARE_HEADLESS === '1';

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
  browser = await chromium.launch({ channel: 'chrome', headless });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(profileGpu => {
    // Unlock one advanced drill in the isolated test context to exercise both players.
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: 2000, unlocked: 2001
    }));
    window.goalLineDrawTimes = [];
    window.goalLineCompletionTimes = [];
    window.goalLineGpuTimes = [];
    if (profileGpu) {
      const clear = WebGL2RenderingContext.prototype.clear;
      const fenceSync = WebGL2RenderingContext.prototype.fenceSync;
      let timer, query;
      let active = false;
      WebGL2RenderingContext.prototype.clear = function (mask) {
        if ((mask & this.COLOR_BUFFER_BIT) && this.getParameter(this.VIEWPORT)[2] === 15360) {
          timer ??= this.getExtension('EXT_disjoint_timer_query_webgl2') ?? false;
          if (timer && query && !active && this.getQueryParameter(query, this.QUERY_RESULT_AVAILABLE)) {
            if (!this.getParameter(timer.GPU_DISJOINT_EXT)) {
              window.goalLineGpuTimes.push(this.getQueryParameter(query, this.QUERY_RESULT) / 1e6);
            }
            this.deleteQuery(query);
            query = null;
          }
          if (timer && !query) {
            query = this.createQuery();
            if (query) {
              this.beginQuery(timer.TIME_ELAPSED_EXT, query);
              active = true;
            }
          }
        }
        return clear.call(this, mask);
      };
      WebGL2RenderingContext.prototype.fenceSync = function (...args) {
        if (active) {
          this.endQuery(timer.TIME_ELAPSED_EXT);
          active = false;
        }
        return fenceSync.apply(this, args);
      };
    }
    const observed = new WeakSet();
    const waitForSync = WebGL2RenderingContext.prototype.clientWaitSync;
    WebGL2RenderingContext.prototype.clientWaitSync = function (sync, ...args) {
      const result = waitForSync.call(this, sync, ...args);
      if ((result === this.ALREADY_SIGNALED || result === this.CONDITION_SATISFIED) && !observed.has(sync)) {
        observed.add(sync);
        window.goalLineCompletionTimes.push(performance.now());
      }
      return result;
    };
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
  }, mode === '16k' && process.env.ADIGUN_PROFILE_GPU === '1');
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
      gpuTimerAvailable: graphicsContext.getSupportedExtensions()?.includes('EXT_disjoint_timer_query_webgl2') ?? false,
      renderer: graphicsContext.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? graphicsContext.RENDERER),
      error: graphicsContext.getError(),
      contextLost: graphicsContext.isContextLost()
    };
  });
  const before = await readSurface();
  const requestedBufferAllocated = before?.renderBuffer.every((dimension, index) => dimension === requested[index]) ?? false;
  let after = null;
  let restored4K = null;
  let sample = null;
  let workloadError = null;
  if (requestedBufferAllocated) {
    const frameIntervals = [];
    const completionIntervals = [];
    let completedFrames = 0;
    let frameCount = 0;
    let activeMilliseconds = 0;
    let completedRounds = 0;
    const started = performance.now();
    try {
      for (let round = 0; round < rounds; round++) {
        if (round) await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
        const aim = page.getByRole('slider', { name: 'Clearance angle' });
        for (let step = 0; step < 11; step++) await aim.press('ArrowRight');
        await page.evaluate(() => {
          window.goalLineDrawTimes.length = 0;
          window.goalLineCompletionTimes.length = 0;
        });
        await page.getByRole('button', { name: 'Start live ball' }).press('Enter');
        await page.getByRole('button', { name: 'Pause live ball' }).waitFor({ timeout: 5000 });
        await page.keyboard.down('d');
        await page.waitForFunction(() => document.querySelector('#defender').textContent === '1.35 m right', undefined, { timeout: 5000 });
        await page.keyboard.up('d');
        await page.waitForFunction(distance =>
          document.querySelector('#ball').textContent.includes(`, ${distance} m from goal line`),
        delivery.ball.z.toFixed(2), { timeout: 5000 });
        await page.keyboard.press('f');
        const message = await page.locator('#message').textContent();
        if (!message?.includes('Safe clearance')) throw new Error(`Round ${round + 1}: ${message}`);
        await page.waitForFunction(duration => {
          window.goalLineClearanceObservedAt ??= performance.now();
          return performance.now() - window.goalLineClearanceObservedAt >= duration;
        }, clearanceMilliseconds + 100, { timeout: 5000 });
        await page.evaluate(() => { delete window.goalLineClearanceObservedAt; });
        const [frames, completions] = await page.evaluate(() => [window.goalLineDrawTimes, window.goalLineCompletionTimes]);
        for (let i = 1; i < frames.length; i++) frameIntervals.push(frames[i] - frames[i - 1]);
        for (let i = 1; i < completions.length; i++) completionIntervals.push(completions[i] - completions[i - 1]);
        completedFrames += completions.length;
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
      await page.keyboard.up('d');
      await page.keyboard.press('Escape');
      workloadError = String(error);
    }
    after = await readSurface();
    frameIntervals.sort((a, b) => a - b);
    completionIntervals.sort((a, b) => a - b);
    const percentile = (intervals, fraction) => intervals[Math.ceil(intervals.length * fraction) - 1] ?? null;
    const gpuTimes = await page.evaluate(() => window.goalLineGpuTimes.sort((a, b) => a - b));
    sample = {
      completedRounds, requestedRounds: rounds, frames: frameCount,
      activeMilliseconds, wallMilliseconds: performance.now() - started,
      medianMs: percentile(frameIntervals, 0.5), p95Ms: percentile(frameIntervals, 0.95), p99Ms: percentile(frameIntervals, 0.99),
      observedGpuCompletion: mode === '16k' ? {
        frames: completedFrames,
        medianMs: percentile(completionIntervals, 0.5),
        p95Ms: percentile(completionIntervals, 0.95),
      } : null,
      gpuRenderTime: gpuTimes.length ? {
        frames: gpuTimes.length,
        medianMs: percentile(gpuTimes, 0.5),
        p95Ms: percentile(gpuTimes, 0.95),
      } : null,
    };
    if (await canvas.isVisible()) await canvas.screenshot({ path: path.join(output, 'viewport.png'), timeout: 5000 });
    if (mode === '16k' && !workloadError && !after?.contextLost) {
      await graphics.selectOption('4k');
      restored4K = await readSurface();
    }
  }
  const softwareRenderer = /swiftshader|llvmpipe|softpipe|software|basic render driver|warp/i.test(before?.renderer ?? '');
  const report = {
    mode, requested, requestedBufferAllocated, softwareRenderer, before, after, restored4K, sample, workloadError,
    browser: browser.version(), platform: process.platform, headless,
    graphicsStatus: await page.locator('#graphics').textContent(),
    capturedAt: new Date().toISOString()
  };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const restored = mode !== '16k' || (restored4K?.drawingBuffer.join('x') === '3840x2160' &&
    restored4K.renderSurface === 'drawing buffer' && !restored4K.error && !restored4K.contextLost);
  const measuredCompletion = mode !== '16k' || sample?.observedGpuCompletion?.medianMs > 0;
  if (!requestedBufferAllocated || softwareRenderer || workloadError || !after || after.contextLost || after.error || !sample?.medianMs || !restored || !measuredCompletion ||
      after?.renderBuffer.some((dimension, index) => dimension !== requested[index])) process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
