import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const mode = process.argv[2] ?? '16k';
if (mode !== '4k' && mode !== '16k') throw new Error('Choose 4k or 16k.');
const resolution = mode === '16k' ? [15360, 8640] : [3840, 2160];
const root = path.resolve(import.meta.dirname, '..', 'dist');
const three = path.resolve(import.meta.dirname, '..', 'node_modules', 'three', 'build');
const output = path.resolve(import.meta.dirname, '..', 'test-results', `goal-line-webgpu-scene-${mode}`);
const modules = new Set(['three.core.js', 'three.module.js', 'three.tsl.js', 'three.webgpu.js']);
const mime = { '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  try {
    const route = new URL(request.url, 'http://127.0.0.1').pathname;
    if (route === '/favicon.ico') return response.writeHead(204).end();
    if (route === '/') {
      return response.writeHead(200, { 'Content-Type': 'text/html' })
        .end('<!doctype html><style>body{margin:0}canvas{display:block;width:960px;height:540px}</style><canvas id="pitch"></canvas>');
    }
    if (route === '/vendor/three/three.module.js') {
      // The renderer and scene must share the same Three.js classes.
      return response.writeHead(200, { 'Content-Type': 'text/javascript' })
        .end('export * from "/three/three.webgpu.js"; export { ShaderChunk, WebGLRenderer } from "/three/three.module.js";');
    }
    const module = route.slice('/three/'.length);
    const file = route.startsWith('/three/') && modules.has(module)
      ? path.join(three, module) : path.resolve(root, '.' + route);
    if (!file.startsWith(root + path.sep) && !file.startsWith(three + path.sep)) throw new Error('Unavailable route.');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: false });
  const page = await browser.newPage({ viewport: { width: 1000, height: 650 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async resolution => {
    const [{ WebGPURenderer, UnsignedByteType }, { THREE, createStageScene }, { createPitch }, physics] = await Promise.all([
      import('/three/three.webgpu.js'), import('/shared/three-stage.js'), import('/game9/pitch.js'), import('/game9/clearance.js'),
    ]);
    const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter || adapter.info.isFallbackAdapter || adapter.limits.maxTextureDimension2D < resolution[0]) {
      throw new Error('The WebGPU adapter cannot allocate the requested hardware surface.');
    }
    const device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: resolution[0] } });
    const canvas = document.querySelector('#pitch');
    const context = canvas.getContext('webgpu');
    const drawTextures = [];
    const getCurrentTexture = context.getCurrentTexture.bind(context);
    context.getCurrentTexture = () => {
      const texture = getCurrentTexture();
      drawTextures.push([texture.width, texture.height]);
      return texture;
    };
    const renderer = new WebGPURenderer({ canvas, context, device, antialias: false, alpha: false, outputBufferType: UnsignedByteType });
    await renderer.init();
    if (!renderer.backend.isWebGPUBackend) throw new Error('The renderer fell back to WebGL.');
    renderer.setSize(...resolution, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const pitch = await createPitch({ canvas, view: () => 'broadcast', motion: { matches: true } }, options => {
      const stage = createStageScene(options);
      return { ...stage, renderer, render: () => renderer.render(stage.scene, stage.camera), dispose: () => renderer.dispose() };
    });
    window.disposeGoalLineProbe = () => { pitch.dispose(); device.destroy(); };
    const state = physics.createDrill(8002);
    const feed = state.feeds[0];
    const angle = -24;
    async function draw() {
      const delivery = physics.readContact(feed, state.tick, state.defender);
      const projection = physics.planClearance(feed, delivery, state.tick, angle);
      pitch.draw(state, feed, delivery.ball, angle, delivery.contact, projection);
      await device.queue.onSubmittedWorkDone();
    }
    await draw();
    for (let tick = 0; tick < 18; tick++) physics.advance(state, tick < 3 ? -1 : 0);
    await draw();
    if (!physics.clear(state, angle)) throw new Error(`The clearance failed: ${state.result}`);
    await draw();
    return { vendor: adapter.info.vendor, architecture: adapter.info.architecture, drawTextures, result: state.result };
  }, resolution);
  await page.locator('#pitch').screenshot({ path: path.join(output, 'viewport.png') });
  await page.evaluate(() => window.disposeGoalLineProbe());
  const report = { mode, browser: browser.version(), resolution, ...result, errors, workload: 'stepped' };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length || result.drawTextures.length < 3 ||
      !result.drawTextures.every(size => size.every((dimension, index) => dimension === resolution[index]))) process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
