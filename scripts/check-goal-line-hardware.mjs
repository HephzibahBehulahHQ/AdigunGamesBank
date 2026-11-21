import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { CLEARANCE_SPEED, makeDrill, planClearance, readContact } from '../game9/clearance.js';

const scenario = process.argv[4] ?? 'standard';
const camera = process.argv[5] ?? 'goal';
if (camera !== 'goal' && camera !== 'broadcast') throw new Error('Choose the goal or broadcast camera.');
const fixtures = {
  standard: { level: 2001, tick: 22, defender: 1.35, angle: 11 },
  heavy: { level: 8002, tick: 18, defender: -1.35, angle: -24 },
  loft: { level: 5092, tick: 20, defender: 0.45, angle: -28, speed: 6, loft: true },
};
if (!Object.hasOwn(fixtures, scenario)) throw new Error('Choose the standard, heavy or loft scenario.');
const { level, tick, defender, angle, speed = CLEARANCE_SPEED, loft = false } = fixtures[scenario];
const moveSide = defender < 0 ? 'left' : 'right';
const moveTarget = `${Math.abs(defender).toFixed(2)} m ${moveSide}`;
const feed = makeDrill(level)[0];
const delivery = readContact(feed, tick, defender);
const clearance = planClearance(feed, delivery, tick, angle, speed, loft);
if (!delivery.reachable || !clearance.atGate || clearance.interception) throw new Error('The benchmark clearance fixture is invalid.');
const clearanceMilliseconds = Math.ceil((Math.max(0.035, delivery.delay) + clearance.travelTime) * 1000) + (loft ? 260 : 100);

const mode = process.argv[2] ?? '16k';
if (mode !== '4k' && mode !== '16k') throw new Error('Choose 4k or 16k.');
const requested = mode === '4k' ? [3840, 2160] : [15360, 8640];
const rounds = Number(process.argv[3] ?? 1);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100) {
  throw new Error('Choose a workload of 1 to 100 live feeds.');
}
const headless = process.env.ADIGUN_HARDWARE_HEADLESS === '1';
const fullscreen = process.env.ADIGUN_HARDWARE_FULLSCREEN === '1';
const profileGpu = mode === '16k' && process.env.ADIGUN_PROFILE_GPU === '1';
const gpuPhase = process.env.ADIGUN_GPU_PHASE ?? 'combined';
if (!['combined', 'shadow', 'scene', 'presentation'].includes(gpuPhase)) {
  throw new Error('Choose combined, shadow, scene or presentation for ADIGUN_GPU_PHASE.');
}

const root = path.resolve(import.meta.dirname, '..', 'dist');
const output = path.resolve(import.meta.dirname, '..', 'test-results',
  ['goal-line-hardware', mode, scenario === 'standard' ? '' : scenario,
    camera === 'goal' ? '' : camera, fullscreen ? 'fullscreen' : '', profileGpu ? `gpu-${gpuPhase}` : ''].filter(Boolean).join('-'));
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
  await page.addInitScript(({ profileGpu, gpuPhase, level }) => {
    // Unlock the selected drill in the isolated test context.
    localStorage.setItem('adigun.campaign.v1.goal-line', JSON.stringify({
      version: 1, completed: level - 1, unlocked: level
    }));
    window.goalLineDrawTimes = [];
    window.goalLineCompletionTimes = [];
    window.goalLineGpuTimes = [];
    window.goalLineDepthAllocations = [];
    const allocateDepth = WebGL2RenderingContext.prototype.renderbufferStorage;
    WebGL2RenderingContext.prototype.renderbufferStorage = function (target, format, width, height) {
      if (width === 15360 && height === 8640 && (format === this.DEPTH_COMPONENT16 || format === this.DEPTH_COMPONENT24)) {
        window.goalLineDepthAllocations.push(format === this.DEPTH_COMPONENT16 ? 16 : 24);
      }
      return allocateDepth.call(this, target, format, width, height);
    };
    window.goalLineBrowserEvents = [];
    function recordBrowserEvent(event) {
      window.goalLineBrowserEvents.push({
        event: event.type, timeMs: document.timeline.currentTime, visibility: document.visibilityState,
      });
    }
    document.addEventListener('visibilitychange', recordBrowserEvent);
    window.addEventListener('blur', recordBrowserEvent);
    window.addEventListener('focus', recordBrowserEvent);
    if (profileGpu) {
      const clear = WebGL2RenderingContext.prototype.clear;
      const fenceSync = WebGL2RenderingContext.prototype.fenceSync;
      let timer, query;
      let active = false;
      let largeSceneStarted = false;
      function endTiming(gl) {
        if (!active) return;
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        active = false;
      }
      function beginTiming(gl) {
        if (!timer || query) return;
        query = gl.createQuery();
        if (!query) return;
        gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        active = true;
      }
      WebGL2RenderingContext.prototype.clear = function (mask) {
        if (!(mask & (this.COLOR_BUFFER_BIT | this.DEPTH_BUFFER_BIT))) return clear.call(this, mask);
        const offscreen = this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) !== null;
        const viewport = offscreen ? this.getParameter(this.VIEWPORT) : null;
        if (viewport?.[2] === 15360 && (mask & this.COLOR_BUFFER_BIT)) {
          largeSceneStarted = true;
          if (gpuPhase === 'shadow') endTiming(this);
          timer ??= this.getExtension('EXT_disjoint_timer_query_webgl2') ?? false;
          if (timer && query && !active && this.getQueryParameter(query, this.QUERY_RESULT_AVAILABLE)) {
            if (!this.getParameter(timer.GPU_DISJOINT_EXT)) {
              window.goalLineGpuTimes.push(this.getQueryParameter(query, this.QUERY_RESULT) / 1e6);
            }
            this.deleteQuery(query);
            query = null;
          }
          if (gpuPhase === 'scene' || gpuPhase === 'combined') beginTiming(this);
        } else if (gpuPhase === 'shadow' && viewport?.[2] === 2048 && viewport[3] === 2048 &&
                   (mask & this.DEPTH_BUFFER_BIT) && this.canvas.dataset.renderResolution === '15360x8640') {
          // The pitch uses one 2048² directional shadow target before the 16K scene clear.
          timer ??= this.getExtension('EXT_disjoint_timer_query_webgl2') ?? false;
          beginTiming(this);
        } else if (largeSceneStarted && !offscreen && (mask & this.COLOR_BUFFER_BIT)) {
          if (gpuPhase === 'scene') endTiming(this);
          if (gpuPhase === 'presentation') beginTiming(this);
        }
        return clear.call(this, mask);
      };
      WebGL2RenderingContext.prototype.fenceSync = function (...args) {
        endTiming(this);
        largeSceneStarted = false;
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
  }, { profileGpu, gpuPhase, level });
  await page.goto(`http://127.0.0.1:${server.address().port}/game9/`);
  const canvas = page.locator('#pitch');
  const graphics = page.getByRole('combobox', { name: 'Graphics' });
  await page.waitForFunction(() => document.querySelector('#pitch').dataset.renderer || document.querySelector('#pitch').hidden);
  if (await graphics.isEnabled()) {
    if (fullscreen) {
      await page.getByRole('button', { name: 'Enter full screen' }).click();
      await page.waitForFunction(() => document.fullscreenElement?.id === 'game');
    }
    await page.getByRole('combobox', { name: 'Camera' }).selectOption(camera);
    await graphics.selectOption(mode);
  }
  const readSurface = () => canvas.evaluate(element => {
    if (element.dataset.renderer !== 'WebGL2') return null;
    const graphicsContext = element.getContext('webgl2');
    if (!graphicsContext) return null;
    const debug = graphicsContext.getExtension('WEBGL_debug_renderer_info');
    return {
      drawingBuffer: [graphicsContext.drawingBufferWidth, graphicsContext.drawingBufferHeight],
      fullscreen: document.fullscreenElement?.contains(element) ?? false,
      canvasAntialias: graphicsContext.getContextAttributes()?.antialias ?? false,
      renderBuffer: element.dataset.renderResolution.split('x').map(Number),
      renderSurface: element.dataset.renderSurface,
      camera: element.dataset.camera,
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
  if (requestedBufferAllocated && before.camera === camera && before.fullscreen === fullscreen) {
    const frameIntervals = [];
    const completionIntervals = [];
    const longGaps = [];
    let completedFrames = 0;
    let frameCount = 0;
    let activeMilliseconds = 0;
    let completedRounds = 0;
    const started = performance.now();
    try {
      for (let round = 0; round < rounds; round++) {
        if (round) await page.getByRole('button', { name: 'Restart drill' }).press('Enter');
        const aim = page.getByRole('slider', { name: 'Clearance angle' });
        for (let step = 0; step < Math.abs(angle); step++) await aim.press(angle < 0 ? 'ArrowLeft' : 'ArrowRight');
        if (loft) await page.getByRole('checkbox', { name: 'Loft the clearance' }).check();
        const power = page.getByRole('slider', { name: 'Kick speed' });
        for (let step = 0; step < Math.abs(speed - CLEARANCE_SPEED); step++) {
          await power.press(speed < CLEARANCE_SPEED ? 'ArrowLeft' : 'ArrowRight');
        }
        await page.evaluate(() => {
          window.goalLineDrawTimes.length = 0;
          window.goalLineCompletionTimes.length = 0;
          window.goalLineBrowserEvents.length = 0;
          window.goalLineKickTime = null;
        });
        await page.getByRole('button', { name: 'Start live ball' }).press('Enter');
        await page.getByRole('button', { name: 'Pause live ball' }).waitFor({ timeout: 5000 });
        // React inside the page so a busy renderer cannot make Playwright miss a single live tick.
        const contact = page.evaluate(({ distance, moveTarget }) => new Promise((resolve, reject) => {
          const defender = document.querySelector('#defender');
          const ball = document.querySelector('#ball');
          let moved = false;
          const observer = new MutationObserver(() => {
            if (!moved && defender.textContent === moveTarget) {
              moved = true;
              document.querySelector('[data-move="0"]').click();
            }
            if (ball.textContent.includes(`, ${distance} m from goal line`)) {
              observer.disconnect();
              clearTimeout(deadline);
              window.goalLineKickTime = document.timeline.currentTime;
              document.querySelector('#clear').click();
              resolve();
            }
          });
          const deadline = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Clearance contact was missed: ${defender.textContent}; ${ball.textContent}`));
          }, 5000);
          observer.observe(defender, { childList: true });
          observer.observe(ball, { childList: true });
        }), { distance: delivery.ball.z.toFixed(2), moveTarget });
        const moveName = defender < 0 ? 'Left' : 'Right';
        await Promise.all([contact, page.getByRole('button', { name: moveName, exact: true }).press('Enter')]);
        const message = await page.locator('#message').textContent();
        if (!message?.includes('Safe clearance')) throw new Error(`Round ${round + 1}: ${message}`);
        await page.waitForFunction(duration => {
          window.goalLineClearanceObservedAt ??= performance.now();
          return performance.now() - window.goalLineClearanceObservedAt >= duration;
        }, clearanceMilliseconds, { timeout: 5000 });
        await page.evaluate(() => { delete window.goalLineClearanceObservedAt; });
        const { frames, completions, kickTime, browserEvents } = await page.evaluate(() => ({
          frames: window.goalLineDrawTimes, completions: window.goalLineCompletionTimes,
          kickTime: window.goalLineKickTime, browserEvents: window.goalLineBrowserEvents,
        }));
        for (let i = 1; i < frames.length; i++) {
          const start = frames[i - 1];
          const end = frames[i];
          const durationMs = end - start;
          frameIntervals.push(durationMs);
          if (durationMs >= 100) {
            longGaps.push({
              round: round + 1, durationMs, afterFirstDrawMs: start - frames[0],
              phase: end < kickTime ? 'approach' : start >= kickTime ? 'clearance' : 'contact',
              browserEvents: browserEvents.filter(event => event.timeMs >= start && event.timeMs <= end),
            });
          }
        }
        for (let i = 1; i < completions.length; i++) completionIntervals.push(completions[i] - completions[i - 1]);
        completedFrames += completions.length;
        frameCount += frames.length;
        if (frames.length) activeMilliseconds += frames.at(-1) - frames[0];
        after = await readSurface();
        if (!after || after.contextLost || after.error || after.camera !== camera || after.fullscreen !== fullscreen ||
            after.renderBuffer.some((dimension, index) => dimension !== requested[index])) {
          throw new Error(`Render target failed in round ${round + 1}.`);
        }
        completedRounds++;
      }
    } catch (error) {
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
      longGapCount: longGaps.length,
      longestGaps: longGaps.sort((a, b) => b.durationMs - a.durationMs).slice(0, 8),
      observedGpuCompletion: mode === '16k' ? {
        frames: completedFrames,
        medianMs: percentile(completionIntervals, 0.5),
        p95Ms: percentile(completionIntervals, 0.95),
      } : null,
      gpuRenderTime: gpuTimes.length ? {
        phase: gpuPhase,
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
    mode, scenario, camera, level, requested, requestedBufferAllocated, softwareRenderer, before, after, restored4K, sample, workloadError,
    browser: browser.version(), platform: process.platform, headless,
    graphicsStatus: await page.locator('#graphics').textContent(),
    fullResolutionDepthAllocations: await page.evaluate(() => window.goalLineDepthAllocations),
    capturedAt: new Date().toISOString()
  };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const restored = mode !== '16k' || (restored4K?.drawingBuffer.join('x') === '3840x2160' &&
    restored4K.renderSurface === 'drawing buffer' && restored4K.camera === camera && !restored4K.error && !restored4K.contextLost);
  const measuredCompletion = mode !== '16k' || sample?.observedGpuCompletion?.medianMs > 0;
  if (!requestedBufferAllocated || softwareRenderer || workloadError || !after || after.contextLost || after.error || !sample?.medianMs || !restored || !measuredCompletion ||
      after?.renderBuffer.some((dimension, index) => dimension !== requested[index])) process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
