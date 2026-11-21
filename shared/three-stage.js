import * as THREE from '../vendor/three/three.module.js';

export { THREE };

/** A real WebGL surface, with an optional measured 16K scene framebuffer. */
export function createStage({ canvas, context, qualitySelect, status, position = [12, 15, 18], target = [0, 0, 0], shadows = true, enable16K = false }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: !enable16K, alpha: false, powerPreference: 'high-performance' });
  } catch {
    const message = 'This 3D game needs WebGL 2. Enable hardware acceleration or use a compatible browser.';
    if (status) status.textContent = message;
    throw new Error(message);
  }
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0B1220');
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 700);
  camera.position.set(...position);
  camera.lookAt(...target);
  scene.add(new THREE.HemisphereLight(0xd9eeff, 0x252b38, 2.3));
  const light = new THREE.DirectionalLight(0xfff4df, 3.2);
  light.position.set(-14, 32, 16);
  light.castShadow = shadows;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = light.shadow.camera.bottom = -65;
  light.shadow.camera.right = light.shadow.camera.top = 65;
  light.shadow.camera.far = 150;
  light.shadow.normalBias = 0.035;
  scene.add(light);
  let quality = 'auto', lost = false;
  const gl = renderer.getContext();
  const maxBuffer = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), renderer.capabilities.maxTextureSize);
  const [maxViewportWidth, maxViewportHeight] = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  const modes = { '1080': [1920, '1080p'], '4k': [3840, '4K UHD'] };
  if (enable16K) modes['16k'] = [15360, '16K UHD'];
  const maxWidth = Math.min(maxBuffer, maxViewportWidth, Math.floor(maxViewportHeight * 16 / 9));
  let largeFrame = null;
  let largeFrameFence = null;
  let deferredPaint;
  let direct16KRejected = false;

  function allocateLargeFrame(width, height) {
    if (width > maxWidth) return null;
    const framebuffer = new THREE.WebGLRenderTarget(width, height, {
      colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false
    });
    // Attach the verified 16-bit buffer directly, without allocating the renderer's default depth surface.
    const depth = gl.createRenderbuffer();
    if (!depth) {
      framebuffer.dispose();
      return null;
    }
    renderer.setRenderTarget(framebuffer);
    const previous = gl.getParameter(gl.RENDERBUFFER_BINDING);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    const allocatedWidth = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_WIDTH);
    const allocatedHeight = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_HEIGHT);
    const depthBits = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_DEPTH_SIZE);
    gl.bindRenderbuffer(gl.RENDERBUFFER, previous);
    const finalized = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    renderer.setRenderTarget(null);
    if (gl.getError() !== gl.NO_ERROR || !finalized || depthBits !== 16 || allocatedWidth !== width || allocatedHeight !== height) {
      gl.deleteRenderbuffer(depth);
      framebuffer.dispose();
      return null;
    }
    const presentation = new THREE.Scene();
    const presentationMaterial = new THREE.MeshBasicMaterial({
      map: framebuffer.texture, depthTest: false, depthWrite: false
    });
    // Integrate a display-pixel footprint so thin scene lines survive the downsample.
    presentationMaterial.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec2 footprint = vec2(length(dFdx(vMapUv)), length(dFdy(vMapUv)));
        vec4 filtered = vec4(0.0);
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y)) * footprint / 3.0;
            filtered += texture2D(map, vMapUv + offset);
          }
        }
        diffuseColor *= filtered / 9.0;
      `);
    };
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      presentationMaterial
    );
    presentation.add(quad);
    return {
      framebuffer, depth, presentation, quad,
      camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      resolution: `${allocatedWidth}x${allocatedHeight}`
    };
  }

  function releaseLargeFrame() {
    clearTimeout(deferredPaint);
    deferredPaint = undefined;
    if (largeFrameFence) gl.deleteSync(largeFrameFence);
    largeFrameFence = null;
    if (!largeFrame) return;
    gl.deleteRenderbuffer(largeFrame.depth);
    largeFrame.framebuffer.dispose();
    largeFrame.quad.material.dispose();
    largeFrame.quad.geometry.dispose();
    largeFrame = null;
  }

  function paintLargeFrame() {
    if (lost || quality !== '16k') return;
    if (largeFrameFence) {
      const state = gl.clientWaitSync(largeFrameFence, 0, 0);
      if (state === gl.TIMEOUT_EXPIRED) {
        if (deferredPaint === undefined) {
          // Check only while a newer frame is waiting, without waiting for another display refresh.
          deferredPaint = setTimeout(() => {
            deferredPaint = undefined;
            paintLargeFrame();
          }, 4);
        }
        return;
      }
      gl.deleteSync(largeFrameFence);
    }
    clearTimeout(deferredPaint);
    deferredPaint = undefined;
    if (largeFrame) renderer.setRenderTarget(largeFrame.framebuffer);
    renderer.render(scene, camera);
    if (largeFrame) {
      renderer.setRenderTarget(null);
      renderer.render(largeFrame.presentation, largeFrame.camera);
    }
    // Coalesce updates until the graphics device finishes the previous large frame.
    largeFrameFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
  }

  function resize() {
    if (lost) return;
    const rect = canvas.getBoundingClientRect();
    const density = globalThis.devicePixelRatio || 1;
    const adaptive = Math.min(maxWidth, Math.max(320, Math.min(2560, Math.round(rect.width * Math.min(density, 2)))));
    const requested = modes[quality];
    const large = quality === '16k';
    const direct = large && !direct16KRejected && requested[0] <= maxWidth && document.fullscreenElement?.contains(canvas) &&
      rect.width * density >= requested[0] && Math.min(rect.height, globalThis.innerHeight) * density >= 8640;
    if (!large || (direct && largeFrame)) releaseLargeFrame();
    let width = large && !direct ? adaptive : requested?.[0] ?? adaptive;
    let height = Math.round(width * 9 / 16);
    if (width <= maxWidth && (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height)) {
      renderer.setSize(width, height, false);
    }
    if (direct) {
      canvas.dataset.direct16kAttempt = `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
      if ((gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) && !gl.isContextLost()) {
        // A viewport resize should not repeat a native allocation the browser already reduced.
        direct16KRejected = true;
        width = adaptive;
        height = Math.round(width * 9 / 16);
        renderer.setSize(width, height, false);
      }
    }
    if (large && width !== requested[0]) largeFrame ??= allocateLargeFrame(requested[0], 8640);
    const rejected = (large && !largeFrame && gl.drawingBufferWidth !== requested[0]) ||
      width > maxWidth || gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height;
    if (rejected) {
      releaseLargeFrame();
      quality = 'auto';
      if (qualitySelect) qualitySelect.value = 'auto';
      width = adaptive;
      height = Math.round(width * 9 / 16);
      if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) renderer.setSize(width, height, false);
    }
    camera.aspect = gl.drawingBufferHeight ? gl.drawingBufferWidth / gl.drawingBufferHeight : width / height;
    // Keep ground markings distinguishable from the turf in the 16-bit depth mode.
    if (enable16K) camera.near = largeFrame ? 1.25 : 0.1;
    camera.updateProjectionMatrix();
    canvas.dataset.renderer = 'WebGL2';
    canvas.dataset.resolution = `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
    canvas.dataset.renderResolution = largeFrame?.resolution ?? canvas.dataset.resolution;
    canvas.dataset.renderSurface = largeFrame ? 'scene framebuffer' : 'drawing buffer';
    if (status) {
      const prefix = rejected && requested ? `${requested[1]} unavailable on this device. ` : '';
      const presentation = `${gl.drawingBufferWidth.toLocaleString()} × ${gl.drawingBufferHeight.toLocaleString()}`;
      status.textContent = largeFrame
        ? `15,360 × 8,640 · 16K UHD scene framebuffer · ${presentation} canvas`
        : `${prefix}${presentation} · WebGL 2 · ${modes[quality]?.[1] ?? '3D'}`;
    }
  }
  const setQuality = (value) => {
    const next = Object.hasOwn(modes, value) ? value : 'auto';
    if (next !== quality) {
      direct16KRejected = false;
      delete canvas.dataset.direct16kAttempt;
    }
    quality = next;
    resize();
  };
  const onQuality = () => setQuality(qualitySelect.value);
  qualitySelect?.addEventListener('change', onQuality);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const onLost = (event) => {
    event.preventDefault(); lost = true;
    releaseLargeFrame();
    if (status) status.textContent = 'Graphics connection lost. Your saved progress is safe. Reload to resume.';
    canvas.dispatchEvent(new CustomEvent('stage-lost'));
  };
  canvas.addEventListener('webglcontextlost', onLost);
  resize();
  return {
    renderer, scene, camera, light, setQuality,
    render() {
      if (lost) return;
      if (quality !== '16k') {
        renderer.render(scene, camera);
        return;
      }
      paintLargeFrame();
    },
    dispose() {
      observer.disconnect(); qualitySelect?.removeEventListener('change', onQuality);
      canvas.removeEventListener('webglcontextlost', onLost);
      releaseLargeFrame();
      scene.traverse((object) => {
        object.geometry?.dispose();
        const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
        for (const material of materials) material.dispose();
      });
      renderer.dispose();
    }
  };
}

export function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.1, ...options });
}

export function box(parent, size, position, color, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, options));
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

export function cylinder(parent, radius, height, position, color, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), material(color, options));
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

export function line3(parent, points, color = '#F8FAFC') {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  parent.add(line); return line;
}
