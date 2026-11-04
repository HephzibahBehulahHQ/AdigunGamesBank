import { THREE, createStage, material, box, cylinder } from '../shared/three-stage.js';
import { TOPOLOGIES } from './circuit.js';

const DIGITS = ['#151515', '#754321', '#b73431', '#e27d2d', '#e3bf32', '#398855', '#3d69ac', '#9264aa', '#84898e', '#e8e8e0'];
const COMPONENTS = [[0, 0.85, -0.75], [3, 0.85, -0.75], [0, 0.85, 1.5], [3, 0.85, 1.5]];
const NODES = { 0: [4.7, 0.74, 2.7], 1: [2.3, 0.74, -2.65], 2: [-1.8, 0.74, 0.35], 3: [4.7, 0.74, 0.35] };

function textPlate(parent, text, size, position, { color = '#e5edf3', background = '#152535', front = false } = {}) {
  const image = document.createElement('canvas'); image.width = 768; image.height = 192;
  const ctx = image.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, image.width, image.height);
  ctx.fillStyle = color; ctx.font = '500 65px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 384, 98, 730);
  const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(...position); if (!front) mesh.rotation.x = -Math.PI / 2;
  parent.add(mesh); return mesh;
}

function cable(parent, from, to, color, lift = 0.12) {
  const points = [from, [from[0], from[1] + lift, from[2] + 0.1], [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + lift, (from[2] + to[2]) / 2], [to[0], to[1] + lift, to[2]], to].map(p => new THREE.Vector3(...p));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.035, 7, false), material(color, { roughness: 0.55, metalness: 0.02 }));
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

function terminal(parent, position, color = '#677b88') {
  cylinder(parent, 0.11, 0.1, position, color, { metalness: 0.65, roughness: 0.3 });
  cylinder(parent, 0.042, 0.105, [position[0], position[1] + 0.025, position[2]], '#263643', { metalness: 0.9 });
}

function disposeGroup(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    if (object.material) {
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) { mat.map?.dispose(); mat.dispose(); }
    }
  });
  group.clear();
}

export function createBench({ canvas, qualitySelect, status, onToggleLead }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [9, 13, 16], target: [0, 0.4, 0], shadows: true });
  const fixed = new THREE.Group(), changing = new THREE.Group();
  stage.scene.add(fixed, changing);
  box(fixed, [13, 0.28, 8], [0, -0.15, 0], '#182630', { metalness: 0.3, roughness: 0.85 });
  box(fixed, [12.3, 0.055, 7.3], [0, 0.02, 0], '#2e4949', { roughness: 1 });
  box(fixed, [8.1, 0.38, 6.8], [1.15, 0.24, 0], '#c5c6bd', { roughness: 0.95 });
  box(fixed, [7.8, 0.07, 6.5], [1.15, 0.47, 0], '#e1dfd4', { roughness: 0.95 });
  for (let x = -2.45; x <= 4.75; x += 0.3) for (const z of [-1.36, -1.08, 0.98, 1.26]) {
    const hole = cylinder(fixed, 0.025, 0.012, [x, 0.515, z], '#54574f'); hole.castShadow = false;
  }
  for (const z of [-3.12, 3.12]) {
    box(fixed, [7.6, 0.01, 0.027], [1.15, 0.52, z], z < 0 ? '#b24239' : '#2e659b');
    for (let x = -2.45; x <= 4.75; x += 0.3) { const hole = cylinder(fixed, 0.026, 0.012, [x, 0.515, z + (z < 0 ? 0.15 : -0.15)], '#53574e'); hole.castShadow = false; }
  }
  box(fixed, [2.5, 1.8, 3.2], [-4.25, 1.0, -0.15], '#a5afb6', { metalness: 0.65, roughness: 0.38 });
  box(fixed, [2.35, 1.6, 0.06], [-4.25, 1.0, 1.48], '#233340', { metalness: 0.65 });
  for (let x = -5.1; x <= -3.4; x += 0.18) box(fixed, [0.06, 0.015, 0.65], [x, 1.91, -0.6], '#33444e');
  for (const x of [-4.85, -3.9]) {
    const knob = cylinder(fixed, 0.19, 0.22, [x, 0.65, 1.65], '#a5afb1', { metalness: 0.8, roughness: 0.27 }); knob.rotation.x = Math.PI / 2;
  }
  terminal(fixed, [-3.15, 1.94, -0.7], '#b44438'); terminal(fixed, [-3.15, 1.94, 0.5], '#293136');
  textPlate(fixed, 'DC LAB / 0–15 V', [2, 0.3], [-4.25, 1.7, 1.52], { front: true });
  textPlate(fixed, 'ELECTRONICER · PATCH BENCH', [4.5, 0.38], [0.9, 0.56, 3.43], { background: '#263f40' });
  for (const [name, point] of Object.entries(NODES)) {
    terminal(fixed, point, name === '1' ? '#ac473c' : name === '0' ? '#26343b' : '#ac8d58');
    textPlate(fixed, name === '1' ? '+ BUS' : name === '0' ? '0 V' : `N${name}`, [0.6, 0.19], [point[0], 0.55, point[2] + 0.24], { background: '#dfddd0', color: '#26313b' });
  }

  let azimuth = 0.32, elevation = 0.95, distance = 15.4, frame = 0, count = 2;
  const requestRender = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; stage.render(); }); };
  function camera() {
    stage.camera.position.set(Math.sin(azimuth) * Math.cos(elevation) * distance, Math.sin(elevation) * distance + 0.4, Math.cos(azimuth) * Math.cos(elevation) * distance);
    stage.camera.lookAt(0, 0.4, 0); requestRender();
  }
  camera();
  const resize = new ResizeObserver(requestRender); resize.observe(canvas);
  qualitySelect.addEventListener('change', requestRender);

  function render(setup, result) {
    disposeGroup(changing);
    count = TOPOLOGIES[setup.topology].edges.length;
    cable(changing, [-3.15, 1.94, 0.5], NODES[0], '#242b31', 0.23);
    cable(changing, [-3.15, 1.94, -0.7], [-2.75, 0.8, -2.6], '#a8322d', 0.18);
    const fuse = cylinder(changing, 0.12, 0.68, [-2.38, 0.8, -2.6], result.tripped ? '#766354' : '#bcd0cd', { transparent: true, opacity: 0.7, roughness: 0.15 }); fuse.rotation.z = Math.PI / 2;
    for (const x of [-2.73, -2.03]) { const cap = cylinder(changing, 0.13, 0.14, [x, 0.8, -2.6], '#bbc3c6', { metalness: 0.9, roughness: 0.2 }); cap.rotation.z = Math.PI / 2; }
    if (!result.tripped) cable(changing, [-2.7, 0.8, -2.6], [-2.05, 0.8, -2.6], '#bbaa84', 0);
    textPlate(changing, `${Math.round(setup.fuse * 1000)} mA ${result.tripped ? 'OPEN' : 'FUSE'}`, [1.25, 0.25], [-2.35, 0.56, -2.15], { background: '#dfddd0', color: '#26313b' });
    const switches = [[-0.65, -2.6, setup.contactA, 'A'], [0.8, setup.contactMode === 'or' ? -1.9 : -2.6, setup.contactB, 'B']];
    for (const [x, z, closed, name] of switches) {
      box(changing, [0.75, 0.18, 0.48], [x, 0.66, z], '#54616b', { metalness: 0.5 });
      const lever = box(changing, [0.5, 0.05, 0.12], [x, closed ? 0.82 : 0.95, z], '#bdc6c9', { metalness: 0.85, roughness: 0.25 }); lever.rotation.z = closed ? 0 : -0.6;
      textPlate(changing, `${name} ${closed ? 'CLOSED' : 'OPEN'}`, [0.95, 0.22], [x, 0.54, z + 0.4], { background: '#dfddd0', color: '#26313b' });
    }
    const fuseOut = [-1.95, 0.8, -2.6];
    if (setup.contactMode === 'bypass') cable(changing, fuseOut, NODES[1], '#b04535', 0.3);
    else {
      cable(changing, fuseOut, [-0.95, 0.82, -2.6], '#b04535');
      if (setup.contactMode === 'and') { cable(changing, [-0.35, 0.82, -2.6], [0.5, 0.82, -2.6], '#b04535'); cable(changing, [1.1, 0.82, -2.6], NODES[1], '#b04535'); }
      else {
        cable(changing, [-0.35, 0.82, -2.6], NODES[1], '#b04535', 0.25);
        cable(changing, fuseOut, [0.5, 0.82, -1.9], '#b04535', 0.14);
        cable(changing, [1.1, 0.82, -1.9], NODES[1], '#b04535', 0.1);
      }
    }
    for (let i = 0; i < 4; i++) {
      const [x, y, z] = COMPONENTS[i], active = i < count;
      const component = new THREE.Group(); changing.add(component);
      const lead = cylinder(component, 0.032, 1.85, [x, y, z], '#b5bec3', { metalness: 0.9, roughness: 0.2 }); lead.rotation.z = Math.PI / 2;
      const body = cylinder(component, 0.2, 0.95, [x, y, z], active ? '#c3ad82' : '#9c9d95', { roughness: 0.9 }); body.rotation.z = Math.PI / 2;
      const digits = String(setup.resistances[i]);
      for (let band = 0; band < 3; band++) {
        const value = band < 2 ? Number(digits[band]) : digits.length - 2;
        const ring = cylinder(component, 0.204, 0.075, [x - 0.24 + band * 0.22, y, z], active ? DIGITS[value] : '#737d7e'); ring.rotation.z = Math.PI / 2;
      }
      terminal(component, [x - 0.95, y - 0.03, z]); terminal(component, [x + 0.95, y - 0.03, z]);
      textPlate(component, active ? `R${i + 1} ${setup.resistances[i]} Ω` : `R${i + 1} · spare`, [1.9, 0.32], [x, 0.57, z + 0.44], { background: '#dfddd0', color: '#26313b' });
      if (active) {
        component.traverse(object => { if (object.isMesh) object.userData.componentIndex = i; });
        const [a, b] = TOPOLOGIES[setup.topology].edges[i];
        const left = [x - 0.95, y, z + (setup.links[i] ? 0 : -0.28)];
        cable(changing, NODES[a], left, a === 1 ? '#ac3e35' : '#bd873b', 0.13 + i * 0.025);
        cable(changing, [x + 0.95, y, z], NODES[b], b === 0 ? '#263642' : '#38687b', 0.13 + i * 0.025);
        if (!setup.links[i]) terminal(changing, left, '#c04e3d');
      }
    }
    textPlate(changing, `${result.sourceVoltage.toFixed(2)} V`, [1.75, 0.4], [-4.25, 1.34, 1.52], { front: true, color: result.tripped ? '#ffaa89' : '#a7e9bc', background: '#071d20' });
    textPlate(changing, `${(result.current * 1000).toFixed(2)} mA`, [1.75, 0.35], [-4.25, 0.96, 1.52], { front: true, color: '#a7e9bc', background: '#071d20' });
    const lamp = cylinder(changing, 0.08, 0.03, [-3.45, 0.48, 1.53], result.tripped ? '#b45b37' : setup.power ? '#50c788' : '#394f4c'); lamp.rotation.x = Math.PI / 2;
    canvas.dataset.circuitState = result.status;
    requestRender();
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let drag = null;
  canvas.addEventListener('pointerdown', event => { drag = { x: event.clientX, y: event.clientY, moved: false }; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    azimuth -= dx * 0.006; elevation = Math.max(0.35, Math.min(1.5, elevation + dy * 0.005));
    drag.x = event.clientX; drag.y = event.clientY; camera();
  });
  canvas.addEventListener('pointerup', event => {
    if (drag && !drag.moved) {
      const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, stage.camera);
      const hit = raycaster.intersectObjects(changing.children, true).find(item => Number.isInteger(item.object.userData.componentIndex));
      if (hit) onToggleLead(hit.object.userData.componentIndex);
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('keydown', event => {
    if (/^[1-4]$/.test(event.key)) { const i = Number(event.key) - 1; if (i < count) onToggleLead(i); event.preventDefault(); return; }
    const moves = { ArrowLeft: () => { azimuth += 0.12; }, ArrowRight: () => { azimuth -= 0.12; }, ArrowUp: () => { elevation = Math.min(1.5, elevation + 0.1); }, ArrowDown: () => { elevation = Math.max(0.35, elevation - 0.1); }, '+': () => { distance = Math.max(10, distance - 0.8); }, '=': () => { distance = Math.max(10, distance - 0.8); }, '-': () => { distance = Math.min(23, distance + 0.8); } };
    if (moves[event.key]) { event.preventDefault(); moves[event.key](); camera(); }
  });
  return {
    render,
    view(mode) { azimuth = mode === 'top' ? 0 : 0.32; elevation = mode === 'top' ? 1.5 : 0.95; distance = 15.4; camera(); },
    dispose() { cancelAnimationFrame(frame); resize.disconnect(); qualitySelect.removeEventListener('change', requestRender); disposeGroup(fixed); disposeGroup(changing); stage.dispose(); }
  };
}
