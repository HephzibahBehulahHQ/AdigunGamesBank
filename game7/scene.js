import { THREE, createStage, material, box, cylinder, line3 } from '../shared/three-stage.js';
import { binaryWord, decodeWord } from './campaign.js';
import { currentFrame } from './engine.js';

export function createRegisterScene({ canvas, qualitySelect, status, action }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [10, 14, 15], target: [0, 0.4, 0] });
  stage.scene.background = new THREE.Color('#15233A');
  let rig = null, level = null, bits = [], receiptLamps = [], paritySwitch, serialSwitch, activeMarker, display, displayContext, displayTexture, displayKey = '', view = 'bench';
  const textures = new Set(), pointer = new THREE.Vector2(), ray = new THREE.Raycaster();

  function label(parent, text, size, position, tint = '#CDD9E9') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const context = c.getContext('2d'); context.fillStyle = tint; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = '600 44px ui-monospace,monospace'; context.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2; plane.position.set(...position); parent.add(plane); return plane;
  }
  function switchModule(parent, x, z, descriptor, text) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.userData.action = descriptor; parent.add(group);
    box(group, [0.86, 0.34, 1.05], [0, 0.44, 0], '#0B1524', { metalness: 0.45 });
    box(group, [0.55, 0.07, 0.62], [0, 0.64, 0], '#68798B', { metalness: 0.8 });
    const lever = new THREE.Group(); lever.position.y = 0.71; group.add(lever);
    cylinder(lever, 0.055, 0.64, [0, 0.3, 0], '#D1DAE2', { metalness: 0.9, roughness: 0.25 });
    box(lever, [0.3, 0.16, 0.22], [0, 0.62, 0], '#D4AF37', { metalness: 0.6 });
    const lamp = cylinder(group, 0.095, 0.04, [0.28, 0.66, 0.35], '#345B6B');
    label(group, text, [0.9, 0.22], [0, 0.28, 0.8]);
    return { group, lever, lamp };
  }
  function button(parent, x, z, text, type, color) {
    const group = new THREE.Group(); group.position.set(x, 0.1, z); group.userData.action = { type }; parent.add(group);
    cylinder(group, 0.42, 0.18, [0, 0.2, 0], '#61758A', { metalness: 0.8 });
    cylinder(group, 0.33, 0.18, [0, 0.36, 0], color, { roughness: 0.4 });
    label(group, text, [1.45, 0.28], [0, 0.2, 0.75]);
  }
  function clear() {
    if (!rig) return;
    const geometries = new Set(), materials = new Set();
    rig.traverse(node => { if (node.geometry) geometries.add(node.geometry); for (const mat of node.material ? Array.isArray(node.material) ? node.material : [node.material] : []) materials.add(mat); });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(mat => mat.dispose()); textures.forEach(texture => texture.dispose()); textures.clear(); rig.removeFromParent();
  }
  function build(config) {
    clear(); level = config.level; bits = []; receiptLamps = []; displayKey = '';
    const columns = Math.min(config.width, 8), rows = Math.ceil(config.width / 8), span = columns * 1.35 + 4, depth = 9 + (rows - 1) * 3.5;
    rig = new THREE.Group(); stage.scene.add(rig);
    box(rig, [span, 0.75, depth], [0, -0.5, 0.15], '#152337', { metalness: 0.65, roughness: 0.4 });
    box(rig, [span - 0.45, 0.12, depth - 0.45], [0, -0.04, 0.15], '#244048', { roughness: 0.85 });
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      cylinder(rig, 0.18, 0.1, [x * (span / 2 - 0.35), 0.08, z * (depth / 2 - 0.25) + 0.15], '#A7B4C0', { metalness: 0.9 });
    }
    for (let visual = 0; visual < config.width; visual++) {
      const bit = config.width - 1 - visual, x = (visual % 8 - (columns - 1) / 2) * 1.35, z = Math.floor(visual / 8) * 3.5 - 0.1;
      const control = switchModule(rig, x, z + 0.65, { type: 'bit', bit }, `B${bit}`);
      box(rig, [0.72, 0.2, 0.7], [x, 0.15, z - 0.65], '#101B2B');
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), material('#244755', { roughness: 0.23, metalness: 0.2 }));
      lens.position.set(x, 0.43, z - 0.65); rig.add(lens);
      line3(rig, [[x, 0.07, z - 0.5], [x, 0.07, z + 0.2]], '#75A0A6');
      label(rig, '0 / 1', [0.68, 0.17], [x, 0.08, z - 1.18], '#94B2C8');
      bits[bit] = { control, lens, x, z };
    }
    const serialZ = depth / 2 - 1.35;
    serialSwitch = switchModule(rig, -span / 2 + 1.25, serialZ - 0.1, { type: 'serial' }, 'DATA');
    paritySwitch = switchModule(rig, span / 2 - 1.25, serialZ - 0.1, { type: 'parity' }, 'PARITY');
    button(rig, -2, serialZ, 'CLOCK', 'clock', '#2563EB');
    button(rig, 0, serialZ, 'LATCH', 'latch', '#D4AF37');
    button(rig, 2, serialZ, 'SEND', 'transmit', '#2B9D70');
    const screenWidth = Math.min(span - 3, 8.5);
    box(rig, [screenWidth + 0.3, 0.38, 1.65], [0, 0.28, -3.15], '#0B1423', { metalness: 0.5 });
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; displayContext = c.getContext('2d');
    displayTexture = new THREE.CanvasTexture(c); displayTexture.colorSpace = THREE.SRGBColorSpace; textures.add(displayTexture);
    display = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, 1.4), new THREE.MeshBasicMaterial({ map: displayTexture }));
    display.rotation.x = -Math.PI / 2; display.position.set(0, 0.49, -3.15); rig.add(display);
    for (let index = 0; index < config.frames.length; index++) {
      const x = (index - (config.frames.length - 1) / 2) * 0.65;
      const indicator = cylinder(rig, 0.12, 0.07, [x, 0.15, -depth / 2 + 0.65], '#364859'); receiptLamps.push(indicator);
    }
    label(rig, 'FRAME RECEIVER', [3.4, 0.28], [0, 0.08, -depth / 2 + 0.28], '#C1D1E3');
    activeMarker = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.06, 1.45), new THREE.MeshBasicMaterial({ color: '#D4AF37', wireframe: true }));
    activeMarker.position.y = 0.25; rig.add(activeMarker);
  }
  function draw(state, selectedBit = 0) {
    if (level !== state.config.level) build(state.config);
    for (let bit = 0; bit < state.config.width; bit++) {
      const current = state.word >> bit & 1, staged = state.draft >> bit & 1, item = bits[bit];
      item.control.lever.rotation.x = staged ? -0.42 : 0.42;
      item.control.lamp.material.color.set(staged ? '#D4AF37' : '#345B6B');
      item.lens.material.color.set(current ? '#9CF3E0' : '#244755');
      item.lens.material.emissive.set(current ? '#1F6D65' : '#000000');
    }
    serialSwitch.lever.rotation.x = state.serialBit ? -0.42 : 0.42; paritySwitch.lever.rotation.x = state.parityBit ? -0.42 : 0.42;
    serialSwitch.lamp.material.color.set(state.serialBit ? '#D4AF37' : '#345B6B'); paritySwitch.lamp.material.color.set(state.parityBit ? '#D4AF37' : '#345B6B');
    receiptLamps.forEach((lamp, index) => lamp.material.color.set(index < state.received.length ? '#86EFAC' : '#364859'));
    const selected = bits[selectedBit]; activeMarker.position.x = selected.x; activeMarker.position.z = selected.z + 0.65;
    const frame = currentFrame(state), key = `${state.word}|${frame.signed}|${state.frameIndex}|${state.phase}`;
    if (key !== displayKey) {
      displayKey = key; const context = displayContext;
      context.fillStyle = '#07111B'; context.fillRect(0, 0, 1024, 256);
      context.fillStyle = '#8BA7BF'; context.font = '500 34px ui-monospace,monospace'; context.fillText(`REGISTER / ${frame.signed ? 'SIGNED' : 'UNSIGNED'} / ${state.config.width} BIT`, 35, 48);
      context.fillStyle = '#91F1DC'; context.font = '600 66px ui-monospace,monospace'; context.fillText(binaryWord(state.word, state.config.width), 35, 133);
      context.fillStyle = '#F8FAFC'; context.font = '600 49px ui-monospace,monospace'; context.fillText(`DEC ${decodeWord(state.word, state.config.width, frame.signed)}`, 35, 215);
      context.fillStyle = '#D4AF37'; context.font = '500 34px ui-monospace,monospace'; context.fillText(`${state.received.length}/${state.config.frames.length} FRAMES`, 680, 215);
      displayTexture.needsUpdate = true;
    }
    const span = Math.min(state.config.width, 8) * 1.35 + 4, depth = 9 + (Math.ceil(state.config.width / 8) - 1) * 3.5;
    if (view === 'overhead') stage.camera.position.set(0, Math.max(span, depth) * 1.8, 0.01);
    else stage.camera.position.set(span * 0.72, Math.max(span, depth) * 1.28, depth * 1.65);
    stage.camera.lookAt(0, 0.3, 0.25); stage.render(); canvas.dataset.frame = String((Number(canvas.dataset.frame) || 0) + 1);
  }
  const onPointer = event => {
    if (!rig || event.button > 0) return;
    const bounds = canvas.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2); ray.setFromCamera(pointer, stage.camera);
    for (const hit of ray.intersectObject(rig, true)) {
      let node = hit.object;
      while (node && node !== rig) { if (node.userData.action) { action(node.userData.action); canvas.focus(); return; } node = node.parent; }
    }
  };
  canvas.addEventListener('pointerdown', onPointer);
  return { draw, setView(value) { view = value === 'overhead' ? 'overhead' : 'bench'; }, dispose() { canvas.removeEventListener('pointerdown', onPointer); textures.forEach(texture => texture.dispose()); stage.dispose(); } };
}
