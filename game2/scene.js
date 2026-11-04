import { THREE, createStage, material, box, cylinder, line3 } from '../shared/three-stage.js';
import { DIRECTIONS, cellName } from './campaign.js';

const SPACING = 2.22;

function labelAtlas(config) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  context.fillStyle = '#C7D5E7'; context.font = '600 21px system-ui';
  for (let i = 0; i < config.tiles.length; i++) context.fillText(cellName(i, config.size), i % 8 * 128 + 9, Math.floor(i / 8) * 128 + 27);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function labelPlane(parent, index, atlas) {
  const geometry = new THREE.PlaneGeometry(1.88, 1.88), uv = geometry.attributes.uv;
  const column = index % 8, row = Math.floor(index / 8);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (column + uv.getX(i)) / 8, 1 - (row + 1 - uv.getY(i)) / 8);
  const plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; plane.position.y = 0.35; parent.add(plane);
}
function contacts(parent, mask) {
  const color = material('#CE9454', { metalness: 0.85, roughness: 0.28 });
  const meshes = [];
  for (const direction of DIRECTIONS) if (mask & direction.bit) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(direction.dc ? 0.96 : 0.17, 0.13, direction.dr ? 0.96 : 0.17), color);
    arm.position.set(direction.dc * 0.48, 0.48, direction.dr * 0.48); arm.castShadow = true; parent.add(arm); meshes.push(arm);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.15, 12), color);
    pad.position.set(direction.dc * 0.98, 0.47, direction.dr * 0.98); parent.add(pad); meshes.push(pad);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.15, 16), color); hub.position.y = 0.48; parent.add(hub);
  return color;
}

export function createCircuitScene({ canvas, qualitySelect, status, select }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [12, 17, 18], target: [0, 0.3, 0] });
  stage.scene.background = new THREE.Color('#142236');
  stage.light.position.set(-9, 24, 14);
  let panel = null, atlas = null, level = null, cells = [], selectedRing = null, view = 'bench';
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const onPointer = event => {
    if (!panel || event.button > 0) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    ray.setFromCamera(pointer, stage.camera);
    for (const hit of ray.intersectObject(panel, true)) {
      let node = hit.object;
      while (node && node !== panel) {
        if (Number.isInteger(node.userData.cell)) { select(node.userData.cell); canvas.focus(); return; }
        node = node.parent;
      }
    }
  };
  canvas.addEventListener('pointerdown', onPointer);

  function clear() {
    if (!panel) return;
    const geometries = new Set(), materials = new Set();
    panel.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      for (const mat of node.material ? Array.isArray(node.material) ? node.material : [node.material] : []) materials.add(mat);
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(mat => mat.dispose()); atlas?.dispose(); panel.removeFromParent();
  }
  function build(config) {
    clear(); level = config.level; cells = []; atlas = labelAtlas(config);
    panel = new THREE.Group(); stage.scene.add(panel);
    const span = config.size * SPACING, offset = (config.size - 1) * SPACING / 2;
    box(panel, [span + 4, 0.65, span + 4], [0, -0.5, 0], '#111C2C', { metalness: 0.55, roughness: 0.4 });
    box(panel, [span + 0.8, 0.18, span + 0.8], [0, -0.08, 0], '#26444B', { roughness: 0.88 });
    box(panel, [span + 3, 0.08, 0.24], [0, 0, span / 2 + 1.1], '#2563EB', { metalness: 0.6 });
    // This insulated rail represents the explicitly prewired return under the panel.
    for (const z of [-1, 1]) for (const x of [-1, 1]) {
      cylinder(panel, 0.18, 0.12, [x * (span / 2 + 1.3), -0.1, z * (span / 2 + 1.3)], '#A2ACB6', { metalness: 0.85 });
      line3(panel, [[x * (span / 2 + 1.3) - 0.11, -0.03, z * (span / 2 + 1.3)], [x * (span / 2 + 1.3) + 0.11, -0.03, z * (span / 2 + 1.3)]], '#283443');
    }
    config.tiles.forEach((tile, index) => {
      const cell = new THREE.Group(); cell.userData.cell = index;
      cell.position.set(index % config.size * SPACING - offset, 0, Math.floor(index / config.size) * SPACING - offset); panel.add(cell);
      const plateColor = tile.kind === 'source' ? '#193D45' : tile.kind === 'ground' ? '#482B35' : tile.kind === 'load' ? '#304039' : tile.kind === 'spare' ? '#463C2B' : '#192C40';
      box(cell, [1.94, 0.3, 1.94], [0, 0.17, 0], plateColor, { metalness: 0.25 });
      labelPlane(cell, index, atlas);
      const conductor = new THREE.Group(); cell.add(conductor);
      const copper = contacts(conductor, tile.mask);
      let bulb = null, supply = null;
      if (tile.kind === 'source') {
        box(cell, [1.08, 0.8, 1.02], [0, 0.84, 0], '#1B344B', { metalness: 0.5 });
        box(cell, [0.82, 0.055, 0.5], [0, 1.27, -0.08], '#0B1220');
        box(cell, [0.42, 0.06, 0.09], [-0.15, 1.31, -0.08], '#90F0D0', { emissive: '#197665', emissiveIntensity: 0.5 });
        box(cell, [0.09, 0.06, 0.3], [-0.15, 1.31, -0.08], '#90F0D0', { emissive: '#197665', emissiveIntensity: 0.5 });
        supply = cylinder(cell, 0.13, 0.09, [0.3, 1.3, 0.27], '#7C98AD');
        cylinder(cell, 0.13, 0.09, [-0.3, 1.3, 0.27], '#2563EB');
      } else if (tile.kind === 'load' || tile.kind === 'spare') {
        cylinder(cell, 0.42, 0.27, [0, 0.58, 0], '#9AA8B4', { metalness: 0.85, roughness: 0.3 });
        cylinder(cell, 0.28, 0.2, [0, 0.8, 0], '#8B795E', { metalness: 0.8 });
        bulb = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 12), material(tile.kind === 'spare' ? '#8B795E' : '#77918A', { roughness: 0.2, metalness: 0.15 }));
        bulb.position.y = 1.15; cell.add(bulb);
        box(cell, [0.13, 0.04, 0.42], [0.58, 0.35, 0.35], '#2563EB');
      } else if (tile.kind === 'ground') {
        for (const [width, z] of [[0.86, -0.1], [0.58, 0.15], [0.3, 0.4]]) box(cell, [width, 0.08, 0.1], [0, 0.68, z], '#FFB5B5');
        box(cell, [0.1, 0.08, 0.58], [0, 0.68, -0.39], '#FFB5B5');
      } else if (tile.kind === 'blank') {
        cylinder(cell, 0.11, 0.04, [0, 0.35, 0], '#3B5065');
      }
      cells.push({ group: cell, conductor, copper, bulb, supply });
    });
    selectedRing = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.06, 2.08), new THREE.MeshBasicMaterial({ color: '#D4AF37', wireframe: true }));
    selectedRing.position.y = 0.36; panel.add(selectedRing);
  }
  function draw(state, selected = 0) {
    if (level !== state.config.level) build(state.config);
    const reached = new Set(state.inspection?.energized || []), live = state.phase === 'won';
    cells.forEach((cell, index) => {
      cell.conductor.rotation.y = -state.rotations[index] * Math.PI / 2;
      cell.copper.color.set(reached.has(index) ? live ? '#79EFBD' : '#A4D2E8' : '#CE9454');
      cell.copper.emissive.set(reached.has(index) && live ? '#21664A' : '#000000');
      if (cell.bulb) {
        const powered = live && reached.has(index);
        cell.bulb.material.color.set(powered ? '#FFF1B1' : state.config.tiles[index].kind === 'spare' ? '#8B795E' : '#77918A');
        cell.bulb.material.emissive.set(powered ? '#D4AF37' : '#000000'); cell.bulb.material.emissiveIntensity = 0.7;
      }
      if (cell.supply) cell.supply.material.color.set(live ? '#86EFAC' : state.phase === 'lost' ? '#FF7B8D' : '#7C98AD');
    });
    selectedRing.position.x = cells[selected].group.position.x; selectedRing.position.z = cells[selected].group.position.z;
    const span = state.config.size * SPACING;
    if (view === 'overhead') stage.camera.position.set(0, span * 2.25, 0.01);
    else stage.camera.position.set(span * 0.8, span * 1.25, span * 1.45);
    stage.camera.lookAt(0, 0.35, 0); stage.render(); canvas.dataset.frame = String((Number(canvas.dataset.frame) || 0) + 1);
  }
  return { draw, setView(value) { view = value === 'overhead' ? 'overhead' : 'bench'; }, dispose() { canvas.removeEventListener('pointerdown', onPointer); atlas?.dispose(); stage.dispose(); } };
}
