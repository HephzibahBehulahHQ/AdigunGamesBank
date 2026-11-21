import { WebGPURenderer, UnsignedByteType } from '/three/three.webgpu.js';
import { THREE, createStageScene } from '/shared/three-stage.js';
import { createPitch } from '/game9/pitch.js';

// Served only by the hardware benchmark. The built game imports its WebGL backend.
export function createGamePitch(options) {
  return createPitch(options, createBenchmarkStage);
}

async function createBenchmarkStage(options) {
  const { canvas, qualitySelect, status } = options;
  const { mode, requested, profilePasses } = window.goalLineWebGpuMode;
  const [width, height] = requested;
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter || adapter.info.isFallbackAdapter || adapter.limits.maxTextureDimension2D < width) {
    throw new Error('No hardware WebGPU adapter for the requested canvas size.');
  }
  const timestamps = profilePasses && adapter.features.has('timestamp-query');
  const device = await adapter.requestDevice({
    requiredLimits: { maxTextureDimension2D: width },
    requiredFeatures: timestamps ? ['timestamp-query'] : [],
  });
  const context = canvas.getContext('webgpu');
  const renderer = new WebGPURenderer({ canvas, context, device, antialias: false, alpha: false,
    outputBufferType: UnsignedByteType, trackTimestamp: timestamps });
  try {
    await renderer.init();
    if (!renderer.backend.isWebGPUBackend) throw new Error('The renderer fell back to WebGL.');
  } catch (error) {
    device.destroy();
    throw error;
  }
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const stage = createStageScene(options);
  const surface = {
    renderer: [adapter.info.vendor, adapter.info.architecture, adapter.info.description].filter(Boolean).join(' '),
    drawingBuffer: null, contextLost: false, error: null, gpuTimerAvailable: timestamps,
  };
  window.goalLineWebGpuSurface = surface;
  if (timestamps) {
    const passes = new Map();
    const backend = renderer.backend;
    const beginRender = backend.beginRender.bind(backend);
    backend.beginRender = renderContext => {
      beginRender(renderContext);
      let phase = 'auxiliary';
      if (renderContext.fullscreenPass) phase = 'output';
      else if (renderContext.width === width && renderContext.height === height) phase = 'scene';
      passes.set(backend.getTimestampUID(renderContext), phase);
    };
    window.goalLineReadWebGpuPasses = async () => {
      const batch = [...passes];
      if (!batch.length) return [];
      passes.clear();
      await renderer.resolveTimestampsAsync();
      return batch.map(([uid, phase]) => ({ phase, milliseconds: backend.getTimestamp(uid) }))
        .filter(({ milliseconds }) => Number.isFinite(milliseconds) && milliseconds > 0);
    };
  }
  const getCurrentTexture = context.getCurrentTexture.bind(context);
  context.getCurrentTexture = () => {
    const texture = getCurrentTexture();
    surface.drawingBuffer = [texture.width, texture.height];
    canvas.dataset.renderResolution = surface.drawingBuffer.join('x');
    canvas.dataset.renderer = 'WebGPU';
    return texture;
  };
  qualitySelect.value = mode;
  for (const option of qualitySelect.options) option.disabled = option.value !== mode;
  status.textContent = `${width.toLocaleString()} × ${height.toLocaleString()} · WebGPU benchmark`;
  let pending = false;
  let drawing = false;
  let disposed = false;

  function fail(error) {
    if (disposed) return;
    surface.contextLost = true;
    surface.error = error;
    canvas.dispatchEvent(new Event('stage-lost'));
  }

  function paint() {
    if (disposed || drawing || !pending) return;
    pending = false;
    drawing = true;
    try {
      renderer.render(stage.scene, stage.camera);
      window.goalLineDrawTimes.push(performance.now());
      device.queue.onSubmittedWorkDone().then(() => {
        if (disposed) return;
        window.goalLineCompletionTimes.push(performance.now());
        drawing = false;
        paint();
      }).catch(error => fail(String(error)));
    } catch (error) {
      fail(String(error));
    }
  }

  device.lost.then(info => fail(info.message || 'WebGPU device lost.'));
  device.addEventListener('uncapturederror', event => fail(event.error.message));
  return {
    ...stage, renderer,
    render() { pending = true; paint(); },
    dispose() {
      disposed = true;
      renderer.dispose();
      device.destroy();
    },
  };
}
