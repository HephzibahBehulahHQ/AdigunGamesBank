import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const output = path.resolve(import.meta.dirname, '..', 'test-results', 'goal-line-webgpu-surface');
const modes = [[3840, 2160], [15360, 8640]];
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end('<!doctype html><title>Goal Line WebGPU surface diagnostic</title>');
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: false });
  const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async modes => {
    if (!navigator.gpu) return { error: 'WebGPU is unavailable.' };
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return { error: 'No WebGPU adapter was returned.' };
    const { vendor, architecture, description, isFallbackAdapter } = adapter.info;
    const limit = adapter.limits.maxTextureDimension2D;
    const hardware = { vendor, architecture, description, isFallbackAdapter, limit };
    const requiredWidth = modes.at(-1)[0];
    if (limit < requiredWidth) return { ...hardware, error: 'The adapter texture limit is below 16K width.' };
    const device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: requiredWidth } });
    const samples = [];
    try {
      for (const [width, height] of modes) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.cssText = 'width: 960px; height: 540px;';
        document.body.replaceChildren(canvas);
        const context = canvas.getContext('webgpu');
        const format = navigator.gpu.getPreferredCanvasFormat();
        const buffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        device.pushErrorScope('validation');
        const sample = { requested: [width, height], format, texture: null, pixel: null, error: null };
        try {
          context.configure({ device, format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
          const texture = context.getCurrentTexture();
          sample.texture = [texture.width, texture.height];
          const encoder = device.createCommandEncoder();
          const render = encoder.beginRenderPass({
            colorAttachments: [{ view: texture.createView(), loadOp: 'clear', storeOp: 'store',
              clearValue: { r: 0.1, g: 0.4, b: 0.2, a: 1 } }],
          });
          render.end();
          encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow: 256 }, [1, 1]);
          device.queue.submit([encoder.finish()]);
          await buffer.mapAsync(GPUMapMode.READ);
          sample.pixel = Array.from(new Uint8Array(buffer.getMappedRange(), 0, 4));
        } catch (error) {
          sample.error = String(error);
        } finally {
          const validation = await device.popErrorScope();
          sample.error ??= validation?.message ?? null;
          buffer.destroy();
          context.unconfigure();
        }
        samples.push(sample);
      }
    } finally {
      device.destroy();
    }
    return { ...hardware, samples };
  }, modes);
  const report = { browser: browser.version(), platform: process.platform, ...result };
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const matches = result.samples?.length === modes.length && result.samples.every(sample => {
    const expected = sample.format === 'bgra8unorm' ? [51, 102, 26, 255] : [26, 102, 51, 255];
    return !sample.error && sample.texture?.every((value, index) => value === sample.requested[index]) &&
      sample.pixel?.every((value, index) => Math.abs(value - expected[index]) <= 1);
  });
  if (result.error || result.isFallbackAdapter || !matches) process.exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
