import * as THREE from '../vendor/three/three.module.js';

export { THREE };

/** A real WebGL render surface. Resolution labels always describe its drawing buffer. */
export function createStage({ canvas, qualitySelect, status, position = [12, 15, 18], target = [0, 0, 0], shadows = true }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
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

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const density = Math.min(globalThis.devicePixelRatio || 1, 2);
    let width = quality === '4k' ? 3840 : quality === '1080' ? 1920 : Math.max(320, Math.min(2560, Math.round(rect.width * density)));
    if (width > maxBuffer) {
      quality = 'auto';
      if (qualitySelect) qualitySelect.value = 'auto';
      width = Math.min(maxBuffer, Math.max(320, Math.round(rect.width)));
    }
    const height = Math.round(width * 9 / 16);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    canvas.dataset.renderer = 'WebGL2';
    canvas.dataset.resolution = `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`;
    if (status) status.textContent = `${gl.drawingBufferWidth.toLocaleString()} × ${gl.drawingBufferHeight.toLocaleString()} · WebGL 2 · ${quality === '4k' ? '4K UHD' : '3D'}`;
  }
  const setQuality = (value) => { quality = ['auto', '1080', '4k'].includes(value) ? value : 'auto'; resize(); };
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
    render() { if (!lost) renderer.render(scene, camera); },
    dispose() {
      observer.disconnect(); qualitySelect?.removeEventListener('change', onQuality);
      canvas.removeEventListener('webglcontextlost', onLost);
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
