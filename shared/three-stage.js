import * as THREE from '../vendor/three/three.module.js';

export { THREE };

/** A real WebGL surface, with an optional measured 16K scene framebuffer. */
export function createStage({ canvas, qualitySelect, status, position = [12, 15, 18], target = [0, 0, 0], shadows = true, enable16K = false }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !enable16K, alpha: false, powerPreference: 'high-performance' });
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

  function allocateLargeFrame(width, height) {
    if (width > maxWidth) return null;
    const framebuffer = new THREE.WebGLRenderTarget(width, height, {
      colorSpace: THREE.LinearSRGBColorSpace,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true
    });
    renderer.setRenderTarget(framebuffer);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    const depth = complete && gl.getFramebufferAttachmentParameter(
      gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME
    );
    let allocatedWidth = 0, allocatedHeight = 0;
    if (depth) {
      const previous = gl.getParameter(gl.RENDERBUFFER_BINDING);
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      allocatedWidth = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_WIDTH);
      allocatedHeight = gl.getRenderbufferParameter(gl.RENDERBUFFER, gl.RENDERBUFFER_HEIGHT);
      gl.bindRenderbuffer(gl.RENDERBUFFER, previous);
    }
    renderer.setRenderTarget(null);
    if (gl.getError() !== gl.NO_ERROR || allocatedWidth !== width || allocatedHeight !== height) {
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
        for (int y = 0; y < 4; y++) {
          for (int x = 0; x < 4; x++) {
            vec2 offset = (vec2(float(x), float(y)) - 1.5) * footprint * 0.25;
            filtered += texture2D(map, vMapUv + offset);
          }
        }
        diffuseColor *= filtered * 0.0625;
      `);
    };
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      presentationMaterial
    );
    presentation.add(quad);
    return {
      framebuffer, presentation, quad,
      camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      resolution: `${allocatedWidth}x${allocatedHeight}`
    };
  }

  function releaseLargeFrame() {
    if (!largeFrame) return;
    largeFrame.framebuffer.dispose();
    largeFrame.quad.material.dispose();
    largeFrame.quad.geometry.dispose();
    largeFrame = null;
  }

  function resize() {
    if (lost) return;
    const rect = canvas.getBoundingClientRect();
    const density = Math.min(globalThis.devicePixelRatio || 1, 2);
    const adaptive = Math.min(maxWidth, Math.max(320, Math.min(2560, Math.round(rect.width * density))));
    const requested = modes[quality];
    const large = quality === '16k';
    if (large) largeFrame ??= allocateLargeFrame(requested[0], 8640);
    else releaseLargeFrame();
    let width = large ? adaptive : requested?.[0] ?? adaptive;
    let height = Math.round(width * 9 / 16);
    if (width <= maxWidth) renderer.setSize(width, height, false);
    const rejected = (large && !largeFrame) || width > maxWidth || gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height;
    if (rejected) {
      releaseLargeFrame();
      quality = 'auto';
      if (qualitySelect) qualitySelect.value = 'auto';
      width = adaptive;
      height = Math.round(width * 9 / 16);
      renderer.setSize(width, height, false);
    }
    camera.aspect = gl.drawingBufferHeight ? gl.drawingBufferWidth / gl.drawingBufferHeight : width / height;
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
        : `${prefix}${presentation} · WebGL 2 · ${quality === '4k' ? '4K UHD' : '3D'}`;
    }
  }
  const setQuality = (value) => { quality = Object.hasOwn(modes, value) ? value : 'auto'; resize(); };
  const onQuality = () => setQuality(qualitySelect.value);
  qualitySelect?.addEventListener('change', onQuality);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const onLost = (event) => {
    event.preventDefault(); lost = true;
    if (status) status.textContent = 'Graphics connection lost. Your saved progress is safe. Reload to resume.';
    canvas.dispatchEvent(new CustomEvent('stage-lost'));
  };
  canvas.addEventListener('webglcontextlost', onLost);
  resize();
  return {
    renderer, scene, camera, light, setQuality,
    render() {
      if (lost) return;
      if (!largeFrame) {
        renderer.render(scene, camera);
        return;
      }
      renderer.setRenderTarget(largeFrame.framebuffer);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(largeFrame.presentation, largeFrame.camera);
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
