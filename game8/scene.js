import { THREE, createStage, box, cylinder, material } from '../shared/three-stage.js';
import { inspectBoard } from './engine.js';

const COLORS = ['#22d3ee', '#d4af37', '#a78bfa', '#22c55e', '#f97316', '#60a5fa'];
function label(parent, text, position, width = 2, color = '#d7eff7') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#0e1b2b'; context.fillRect(0, 0, 512, 128);
  context.strokeStyle = '#3f647d'; context.lineWidth = 3; context.strokeRect(2, 2, 508, 124);
  context.fillStyle = color; context.font = '600 40px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, 256, 64, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true }));
  sprite.scale.set(width, width / 4, 1); sprite.position.set(...position); parent.add(sprite);
  return sprite;
}
function release(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    for (const mat of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
      mat.map?.dispose(); mat.dispose();
    }
  });
  group.clear();
}
function cable(parent, points, color, radius = .045) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, radius, 7, false), material(color, { roughness: .7, metalness: .05 }));
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
function device(parent, kind, position, color) {
  const unit = new THREE.Group(); unit.position.set(...position); parent.add(unit);
  box(unit, [1.35, .18, 1.2], [0, .08, 0], '#37485c', { metalness: .6 });
  let rotor = null;
  if (kind === 'fan' || kind === 'motor' || kind === 'pump') {
    const body = cylinder(unit, .42, .7, [0, .52, 0], kind === 'pump' ? '#377f89' : '#4c667e', { metalness: .65 });
    body.rotation.x = Math.PI / 2;
    const hub = cylinder(unit, .12, .11, [0, .52, .4], '#bfccd4', { metalness: .8 }); hub.rotation.x = Math.PI / 2;
    rotor = new THREE.Group(); rotor.position.set(0, .52, .46); unit.add(rotor);
    if (kind === 'fan') {
      for (let i = 0; i < 4; i++) {
        const blade = box(rotor, [.13, .48, .04], [0, .19, 0], '#bdced5', { metalness: .6 });
        const pivot = new THREE.Group(); rotor.remove(blade); pivot.add(blade); pivot.rotation.z = i * Math.PI / 2; rotor.add(pivot);
      }
    } else if (kind === 'pump') {
      cable(unit, [[.28, .6, 0], [.55, .8, 0], [.68, .75, .38]], '#8dabbc', .09);
      box(unit, [.23, .23, .23], [-.44, .54, 0], '#252f3d');
    } else {
      for (let i = 0; i < 5; i++) box(unit, [.65, .08, .72], [0, .2 + i * .13, 0], '#60798c', { metalness: .8 });
    }
  } else if (kind === 'lamp') {
    box(unit, [1, .24, .7], [0, .43, 0], '#172332');
    const lens = box(unit, [.88, .08, .58], [0, .6, 0], '#d6edf1', { emissive: '#b7d9de', emissiveIntensity: .08 });
    unit.userData.lens = lens;
    box(unit, [.13, .3, .18], [0, .23, 0], '#8fa0ab', { metalness: .8 });
  } else if (kind === 'heater') {
    box(unit, [1.1, .6, .8], [0, .45, 0], '#3e4e61');
    for (let i = 0; i < 5; i++) box(unit, [.1, .44, .82], [-.4 + i * .2, .48, 0], '#99a6af', { metalness: .75 });
  } else {
    box(unit, [1.12, .55, .7], [0, .4, 0], '#253f59');
    box(unit, [.72, .06, .4], [0, .71, 0], color, { emissive: color, emissiveIntensity: .08 });
  }
  const indicator = cylinder(unit, .065, .045, [.48, .22, .45], color, { emissive: color, emissiveIntensity: .04 });
  return { group: unit, rotor, indicator };
}

export function createScene({ canvas, qualitySelect, status, onSelect }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [11.4, 14.5, 17], target: [0, 0, .4], shadows: true });
  stage.scene.fog = new THREE.Fog('#0B1220', 28, 65);
  const root = new THREE.Group(), wires = new THREE.Group(); stage.scene.add(root, wires);
  const floor = box(stage.scene, [90, .25, 70], [0, -.65, 0], '#101c2c', { roughness: .85 }); floor.receiveShadow = true;
  const grid = new THREE.GridHelper(50, 50, '#244254', '#182b3c'); grid.position.y = -.51; stage.scene.add(grid);
  let branchMeshes = [], devices = [], positions = [], branchX = [], planSignature = '', config, lastSelected = -1;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const onPointer = event => {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    const hit = raycaster.intersectObjects(branchMeshes.map(branch => branch.housing), false)[0];
    if (hit) { canvas.focus({ preventScroll: true }); onSelect(hit.object.userData.branch); }
  };
  canvas.addEventListener('pointerup', onPointer);
  function rebuild(nextConfig) {
    config = nextConfig; release(root); release(wires); branchMeshes = []; devices = []; positions = []; branchX = []; planSignature = ''; lastSelected = -1;
    const width = 12.4;
    // Open cutaway enclosure, mounting rails and copper supply distribution.
    box(root, [width, .45, 6.1], [0, -.1, -1.15], '#687b8b', { metalness: .8, roughness: .45 });
    box(root, [width - .45, .09, 5.65], [0, .18, -1.15], '#243448', { metalness: .65 });
    box(root, [width, .7, .17], [0, .33, -4.13], '#6e8394', { metalness: .8 });
    box(root, [.18, .7, 6.1], [-width / 2, .33, -1.15], '#6e8394', { metalness: .8 });
    box(root, [.18, .7, 6.1], [width / 2, .33, -1.15], '#6e8394', { metalness: .8 });
    box(root, [10.8, .09, .19], [0, .35, -.9], '#bac5cc', { metalness: .9 });
    box(root, [10.8, .09, .19], [0, .35, -.2], '#bac5cc', { metalness: .9 });
    box(root, [10.8, .16, .27], [0, .43, -2.6], '#bb8051', { metalness: .75, roughness: .35 });
    box(root, [10.8, .16, .19], [0, .4, 1.1], '#586b80', { metalness: .75 });
    label(root, `${config.voltage} V DC  ·  ISOLATED WORKSHOP`, [0, 1.05, -3.45], 6.3, '#a9eff7');
    for (const x of [-5.7, 5.7]) for (const z of [-3.7, 1.35]) cylinder(root, .1, .12, [x, .27, z], '#b7bec8', { metalness: .95 });
    const spacing = 10 / config.branches.length;
    config.branches.forEach((branch, index) => {
      const x = -5 + spacing / 2 + index * spacing; branchX.push(x);
      const group = new THREE.Group(); group.position.set(x, 0, -.65); root.add(group);
      const housing = box(group, [1.24, 1.27, 1.58], [0, .98, 0], '#c8d2d9', { roughness: .5, metalness: .15 });
      housing.userData.branch = index;
      box(group, [.91, .16, .49], [0, 1.69, 0], '#273746', { roughness: .45 });
      const lever = box(group, [.61, .17, .34], [0, 1.83, 0], '#1d2b3d');
      const marker = box(group, [1.04, .04, .13], [0, 1.65, .55], COLORS[index]);
      const halo = box(group, [1.4, .05, 1.74], [0, .32, 0], '#28435a', { emissive: COLORS[index], emissiveIntensity: 0 });
      for (const z of [-.59, .59]) {
        const terminal = cylinder(group, .095, .04, [0, 1.64, z], '#8599a8', { metalness: .9 }); terminal.receiveShadow = true;
      }
      cable(root, [[x, .52, -2.6], [x, .65, -2.25], [x, 1.64, -1.24]], '#c18960', .065);
      label(group, `${branch.name.replace('Branch ', '')}  ·  ${branch.cableAmpacity} A CABLE`, [0, 2.2, -.2], Math.min(2.45, spacing * 1.12));
      const ratingLabel = label(group, 'NO BREAKER', [0, .86, .89], 1.5);
      branchMeshes.push({ housing, lever, marker, halo, ratingLabel, rating: 0, x });
    });
    const columns = Math.min(6, config.loads.length), rows = Math.ceil(config.loads.length / columns);
    config.loads.forEach((load, index) => {
      const col = index % columns, row = Math.floor(index / columns);
      const x = (col - (columns - 1) / 2) * 2.05, z = 3.65 + row * 2.05;
      positions.push([x, .28, z]);
      const unit = device(root, load.kind, [x, -.1, z], COLORS[index % COLORS.length]); devices.push(unit);
      label(root, `${index + 1} · ${load.name}`, [x, .07, z + .85], 1.94);
    });
    stage.camera.position.set(10.8, 14.4 + rows * 1.1, 16.5 + rows * 1.5); stage.camera.lookAt(0, 0, rows > 1 ? 1.5 : .55);
  }
  function update(state, selectedBranch, reduceMotion) {
    const inspection = inspectBoard(state);
    const signature = state.assignments.join(',') + '|' + state.breakers.join(',');
    if (signature !== planSignature) {
      release(wires); planSignature = signature;
      state.assignments.forEach((branch, load) => {
        if (branch < 0) return;
        const [x, y, z] = positions[load], branchPosition = branchX[branch];
        const lane = 1.5 + load * .047;
        cable(wires, [[branchPosition, 1.5, -.04], [branchPosition + .2, .8, .65], [branchPosition + .12, .32, lane], [x - .13, .2, lane + .2], [x - .13, y, z - .55]], COLORS[branch]);
        cable(wires, [[branchPosition + .23, .5, 1.1], [branchPosition + .28, .22, lane - .08], [x + .13, .16, lane + .3], [x + .13, y, z - .55]], '#758596', .032);
      });
      branchMeshes.forEach((branch, index) => {
        if (branch.rating === state.breakers[index]) return;
        const old = branch.ratingLabel, parent = old.parent;
        parent.remove(old); old.material.map.dispose(); old.material.dispose();
        branch.rating = state.breakers[index];
        branch.ratingLabel = label(parent, branch.rating ? `${branch.rating} A` : 'NO BREAKER', [0, .86, .89], 1.5);
      });
    }
    const live = state.phase === 'testing' || state.phase === 'paused';
    branchMeshes.forEach((branch, index) => {
      const faulted = state.fault?.branch === index;
      branch.housing.material.color.set(faulted ? '#bb8888' : '#c8d2d9');
      branch.lever.material.color.set(faulted ? '#e07070' : live ? '#38afc1' : '#25384a');
      branch.lever.position.z = live ? -.15 : faulted ? .04 : .18;
      branch.halo.material.emissiveIntensity = selectedBranch === index ? .75 : 0;
      branch.halo.material.color.set(selectedBranch === index ? COLORS[index] : '#28435a');
      branch.marker.material.color.set(state.breakers[index] ? COLORS[index] : '#48566b');
    });
    devices.forEach((unit, index) => {
      const active = live && state.assignments[index] >= 0;
      unit.indicator.material.emissiveIntensity = active ? .8 : .03;
      if (unit.group.userData.lens) unit.group.userData.lens.material.emissiveIntensity = active ? .8 : .04;
      if (unit.rotor) unit.rotor.rotation.z = active && !reduceMotion ? state.time * 4 : 0;
    });
    lastSelected = selectedBranch;
    return inspection;
  }
  return {
    rebuild, update, render: () => stage.render(),
    dispose() { canvas.removeEventListener('pointerup', onPointer); release(root); release(wires); stage.dispose(); }
  };
}
