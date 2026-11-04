import { THREE, createStage, box, cylinder, line3, material } from '../shared/three-stage.js';

// All models below are original procedural geometry. The open port wall is a
// cutaway so the loading stations remain visible; the engine owns hull physics.
const WOOD = ['#81502f', '#9a663d', '#ad7749', '#75462c'];
const GOLD = '#D4AF37';
const RAD = Math.PI / 180;

function clearGroup(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    for (const value of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) value.dispose();
  });
  group.clear();
}

function beam(parent, from, to, width, color = WOOD[0]) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const piece = box(parent, [width, a.distanceTo(b), width], [0, 0, 0], color);
  piece.position.copy(a).add(b).multiplyScalar(0.5);
  piece.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return piece;
}

function crate(parent, x, y, z, color, size = 1) {
  box(parent, [size, size * 0.8, size], [x, y + size * 0.4, z], color);
  for (const dx of [-0.34, 0.34]) box(parent, [size * 0.09, size * 0.85, size * 1.02], [x + dx * size, y + size * 0.4, z], '#553b29');
  box(parent, [size * 1.04, size * 0.09, size * 0.12], [x, y + size * 0.83, z], '#dbc38b');
}

function barrel(parent, x, y, z, color) {
  cylinder(parent, 0.56, 1.25, [x, y + 0.625, z], color, { roughness: 0.9 });
  for (const h of [0.19, 1.02]) cylinder(parent, 0.58, 0.09, [x, y + h, z], '#4a5056', { metalness: 0.6 });
  cylinder(parent, 0.48, 0.04, [x, y + 1.27, z], '#d6aa6b');
}

function makeCargo(item) {
  const group = new THREE.Group();
  const color = item.color;
  if (item.kind === 'water') {
    barrel(group, -0.65, 0, -0.4, '#8d6241');
    barrel(group, 0.65, 0, -0.4, '#8d6241');
    barrel(group, 0, 0, 0.7, '#9c7046');
    box(group, [1.75, 0.13, 0.18], [0, 1.27, -0.4], color);
  } else if (item.kind === 'grain') {
    for (const [x, z] of [[-0.64, -0.45], [0.64, -0.45], [0, 0.65]]) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 8), material(color, { roughness: 1 }));
      sack.scale.set(0.8, 1.1, 0.8); sack.position.set(x, 0.7, z); sack.castShadow = true;
      group.add(sack);
      cylinder(group, 0.18, 0.15, [x, 1.36, z], '#58432b');
    }
  } else if (item.kind === 'fodder') {
    for (const [x, y, z] of [[-0.56, 0, 0], [0.56, 0, 0], [0, 0.75, 0]]) {
      box(group, [1.02, 0.7, 1.35], [x, y + 0.35, z], color, { roughness: 1 });
      for (const offset of [-0.4, 0.4]) box(group, [1.05, 0.74, 0.07], [x, y + 0.35, z + offset], '#d5bc80');
    }
  } else if (item.kind === 'shelter') {
    crate(group, 0, 0, 0, color, 1.15);
    for (const x of [-1, 1]) for (const z of [-1, 1]) box(group, [0.14, 1.75, 0.14], [x, 0.875, z], '#d6b380');
    for (const x of [-1, 1]) box(group, [0.14, 0.18, 2.2], [x, 1.45, 0], '#d6b380');
    for (const z of [-1, 1]) box(group, [2.2, 0.18, 0.14], [0, 1.45, z], '#d6b380');
  } else if (item.kind === 'timber') {
    for (let i = 0; i < 6; i++) {
      const log = cylinder(group, 0.24, 2.7, [(i % 3 - 1) * 0.5, 0.26 + Math.floor(i / 3) * 0.45, 0], WOOD[i % WOOD.length]);
      log.rotation.x = Math.PI / 2;
    }
    for (const z of [-0.8, 0.8]) box(group, [1.65, 1.04, 0.07], [0, 0.5, z], '#b69c6c');
  } else {
    crate(group, -0.62, 0, -0.3, color, 1.05);
    crate(group, 0.62, 0, -0.3, '#d5b58e', 1.05);
    crate(group, 0, 0.85, -0.3, color, 0.86);
    barrel(group, 0, 0, 1.1, '#9b744f');
  }
  // Cargo height participates in the stability calculation; show that same
  // height above the actual cargo-deck elevation instead of a fixed icon size.
  const bounds = new THREE.Box3().setFromObject(group);
  for (const child of group.children) child.position.y -= bounds.min.y;
  group.scale.y = item.height / Math.max(0.01, bounds.max.y - bounds.min.y);
  return group;
}

/**
 * A real WebGL scene. Creation throws when WebGL cannot start; the caller must
 * disclose the unavailable view while retaining the equivalent DOM commands.
 * update accepts engine state plus an optional selectedBay (0–5) UI field.
 * Quality and drawing-buffer data are supplied by shared/three-stage.js.
 */
export function createScene(canvas, { onSelectBay = () => {}, onSelectCargo = () => {} } = {}) {
  const status = canvas.ownerDocument?.getElementById('graphics-status');
  const qualitySelect = canvas.ownerDocument?.getElementById('quality');
  const stage = createStage({ canvas, status, qualitySelect, position: [-27, 32, 40], target: [0, 1, 0] });
  const { scene, camera } = stage;
  scene.background = new THREE.Color('#0B1220');
  scene.fog = new THREE.Fog('#0B1220', 80, 180);
  const motionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const ark = new THREE.Group();
  const dock = new THREE.Group();
  scene.add(ark, dock);
  const waterGeometry = new THREE.PlaneGeometry(240, 240, 40, 40);
  waterGeometry.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeometry, material('#173e50', { roughness: 0.47, metalness: 0.25 }));
  water.receiveShadow = true; scene.add(water);
  const waterPosition = waterGeometry.attributes.position;
  const waterBase = waterPosition.array.slice();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const bayMeshes = [], bayEdges = [], cargoGroups = [], tankFills = [], pickables = [];
  let currentConfig = null, latestState = null, selectedBay = 0, disposed = false;
  let lastWaterFrame = -1;

  function build(config) {
    clearGroup(ark); clearGroup(dock);
    bayMeshes.length = bayEdges.length = cargoGroups.length = tankFills.length = pickables.length = 0;
    const { beam: width, length, depth } = config.hull;
    const deckY = config.slots[0].z;
    // A keel, staggered floorboards, individual side strakes and visible ribs.
    box(ark, [width * 0.79, 0.45, length * 0.96], [0, 0.3, 0], '#563922');
    box(ark, [0.65, 0.7, length + 0.4], [0, 0.25, 0], '#4c321f');
    for (let i = 0; i < 24; i++) {
      const z = (i / 24 - 0.5) * length + length / 48;
      box(ark, [width * 0.94, 0.2, length / 24 - 0.035], [0, deckY - 0.1, z], WOOD[i % WOOD.length]);
    }
    for (const side of [-1, 1]) {
      // The near side is cut away at deck height; far side retains full framing.
      const top = side < 0 ? deckY + 0.4 : depth;
      const rows = Math.ceil((top - 0.35) / 0.43);
      for (let row = 0; row < rows; row++) {
        const y = 0.35 + (row + 0.5) * (top - 0.35) / rows;
        const x = side * (width * 0.42 + Math.min(y / depth, 1) * width * 0.07);
        box(ark, [0.24, (top - 0.35) / rows - 0.025, length], [x, y, 0], WOOD[(row + 1) % WOOD.length]);
      }
      for (let rib = 0; rib < 9; rib++) {
        const z = (rib / 8 - 0.5) * length * 0.94;
        beam(ark, [side * width * 0.41, 0.45, z], [side * width * 0.49, top, z], 0.25, '#543923');
      }
      box(ark, [0.42, 0.24, length + 0.2], [side * width * 0.485, top, 0], '#c59a5e');
    }
    for (const end of [-1, 1]) {
      for (let row = 0; row < 7; row++) box(ark, [width * 0.94, 0.39, 0.26], [0, 0.54 + row * 0.43, end * length * 0.5], WOOD[(row + 2) % WOOD.length]);
      box(ark, [width, 0.22, 0.4], [0, 3.38, end * length * 0.5], '#c59a5e');
    }
    // Narrow central passage and framed fore shelter evoke a working timber ark.
    box(ark, [1.05, 0.08, length * 0.9], [0, deckY + 0.04, 0], '#d1ac70');
    const fore = -length * 0.43;
    for (const x of [-width * 0.43, width * 0.43]) beam(ark, [x, deckY, fore], [x, 6.2, fore], 0.23, '#d0a16b');
    beam(ark, [-width * 0.43, 6.2, fore], [0, 7.5, fore], 0.25, '#d0a16b');
    beam(ark, [0, 7.5, fore], [width * 0.43, 6.2, fore], 0.25, '#d0a16b');
    box(ark, [0.3, 0.3, 3.5], [0, 7.5, fore + 0.25], '#d0a16b');
    for (const side of [-1, 1]) {
      const roof = box(ark, [width * 0.46, 0.15, 3.5], [side * width * 0.22, 6.85, fore + 0.25], '#765136');
      roof.rotation.z = side * -Math.atan2(1.3, width * 0.43);
    }
    // Six genuine raycast targets; their colours distinguish cargo station types.
    for (let index = 0; index < 6; index++) {
      const slot = config.slots[index], x = slot.y, z = -slot.x;
      const bayWidth = width * 0.33, bayLength = length * 0.22;
      const pad = box(ark, [bayWidth, 0.055, bayLength], [x, deckY + 0.07, z], ['#668f9f', '#8a9874', '#9a849f'][slot.accepts], { transparent: true, opacity: 0.47, roughness: 0.9 });
      pad.userData.bay = index; bayMeshes.push(pad); pickables.push(pad);
      const edge = line3(ark, [[x - bayWidth / 2, deckY + 0.12, z - bayLength / 2], [x + bayWidth / 2, deckY + 0.12, z - bayLength / 2], [x + bayWidth / 2, deckY + 0.12, z + bayLength / 2], [x - bayWidth / 2, deckY + 0.12, z + bayLength / 2], [x - bayWidth / 2, deckY + 0.12, z - bayLength / 2]], '#c9c3aa');
      bayEdges.push(edge);
      // Low tanks are shown as inset cyan gauges beside each cargo station.
      box(ark, [0.24, 0.16, bayLength], [Math.sign(x) * width * 0.46, deckY + 0.13, z], '#233b43');
      const tank = box(ark, [0.2, 0.12, bayLength], [Math.sign(x) * width * 0.46, deckY + 0.24, z], '#22D3EE', { emissive: '#164e63', emissiveIntensity: 0.4 });
      tank.userData.fullLength = bayLength; tank.userData.baseZ = z; tankFills.push(tank);
    }
    for (let index = 0; index < config.cargo.length; index++) {
      const group = makeCargo(config.cargo[index]);
      group.userData.cargo = index;
      group.traverse(object => { if (object.isMesh) { object.userData.cargo = index; pickables.push(object); } });
      group.visible = false; ark.add(group); cargoGroups.push(group);
    }
    // A loading pier gives the commissioning phase a place, then clears at sea.
    const pierX = -width * 0.5 - 3.7;
    for (let i = 0; i < 15; i++) box(dock, [3.6, 0.25, 1.05], [pierX, 1.3, (i - 7) * 1.1], WOOD[(i + 2) % WOOD.length]);
    for (const z of [-6.6, 0, 6.6]) for (const x of [-1.25, 1.25]) cylinder(dock, 0.24, 4.5, [pierX + x, -0.25, z], '#65432c');
    crate(dock, pierX, 1.45, 5.3, '#b79360', 1.3);
    barrel(dock, pierX + 0.5, 1.45, -5.3, '#8b6346');
    camera.position.set(-width * 2.6, length * 0.95, length * 1.2);
    camera.lookAt(0, 1.2, 0);
    camera.updateProjectionMatrix();
    currentConfig = config;
  }

  function onPointer(event) {
    if (!latestState || disposed) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    const hit = hits.find(({ object }) => {
      let parent = object;
      while (parent) { if (!parent.visible) return false; parent = parent.parent; }
      return true;
    });
    if (!hit) return;
    const cargo = hit.object.userData.cargo;
    const slot = Number.isInteger(cargo) ? latestState.placement[cargo] : hit.object.userData.bay;
    if (Number.isInteger(slot) && slot >= 0) { selectedBay = slot; onSelectBay(slot); }
    if (Number.isInteger(cargo)) onSelectCargo(cargo);
  }
  canvas.addEventListener('click', onPointer);

  function update(state) {
    if (disposed || !state?.config) return;
    latestState = state;
    if (currentConfig !== state.config) build(state.config);
    if (Number.isInteger(state.selectedBay) && state.selectedBay >= 0 && state.selectedBay < 6) selectedBay = state.selectedBay;
    const reducedMotion = Boolean(motionQuery?.matches);
    const underway = state.phase === 'sailing' || state.phase === 'won' || state.phase === 'lost' || (state.phase === 'paused' && state.previousPhase === 'sailing');
    const metrics = state.metrics || {};
    // Physics angles remain visible with reduced motion; only decorative motion stops.
    ark.position.y = -(metrics.draft || 0.7);
    const heel = underway ? state.heel || 0 : metrics.equilibriumHeel || 0;
    const trim = underway ? state.trim || 0 : metrics.equilibriumTrim || 0;
    ark.rotation.set(-THREE.MathUtils.clamp(trim, -20, 20) * RAD, 0, -THREE.MathUtils.clamp(heel, -40, 40) * RAD);
    dock.visible = !underway;
    for (let index = 0; index < cargoGroups.length; index++) {
      const slotIndex = state.placement[index], group = cargoGroups[index];
      group.visible = Number.isInteger(slotIndex) && slotIndex >= 0;
      if (group.visible) {
        const slot = state.config.slots[slotIndex];
        group.position.set(slot.y, slot.z, -slot.x);
        group.rotation.y = index % 2 ? Math.PI / 2 : 0;
      }
    }
    for (let index = 0; index < 6; index++) {
      const selected = index === selectedBay;
      bayEdges[index].material.color.set(selected ? GOLD : '#c9c3aa');
      bayMeshes[index].material.emissive.set(selected ? '#725b13' : '#000000');
      bayMeshes[index].material.emissiveIntensity = selected ? 0.45 : 0;
      const fill = Math.max(0, Math.min(1, (state.ballast[index] || 0) / state.config.ballast.capacity));
      const tank = tankFills[index];
      tank.visible = fill > 0;
      tank.scale.z = Math.max(0.001, fill);
      tank.position.z = tank.userData.baseZ + tank.userData.fullLength * (1 - fill) / 2;
    }
    const t = reducedMotion ? 0 : state.time || 0;
    const waterFrame = Math.floor(t * 12);
    if (waterFrame !== lastWaterFrame) {
      for (let index = 0; index < waterPosition.count; index++) {
        const x = waterBase[index * 3], z = waterBase[index * 3 + 2];
        waterPosition.setY(index, Math.sin(x * 0.2 + t * 0.7) * 0.1 + Math.cos(z * 0.16 - t * 0.8) * 0.09);
      }
      waterPosition.needsUpdate = true; waterGeometry.computeVertexNormals(); lastWaterFrame = waterFrame;
    }
    stage.render();
  }

  return {
    update,
    setQuality(value) { if (!disposed) { stage.setQuality(value); if (latestState) update(latestState); } },
    dispose() { if (disposed) return; disposed = true; canvas.removeEventListener('click', onPointer); stage.dispose(); }
  };
}
