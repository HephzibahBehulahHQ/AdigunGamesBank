import { THREE, createStage, box, cylinder, material, line3 } from '../shared/three-stage.js';
import { hazardPosition } from './engine.js';

function label(parent, caption, position, width = 1, color = '#e3f6ff') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
  const context = canvas.getContext('2d'); context.fillStyle = '#142435'; context.fillRect(0, 0, 512, 160);
  context.strokeStyle = '#507287'; context.lineWidth = 5; context.strokeRect(3, 3, 506, 154);
  context.fillStyle = color; context.font = '700 68px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(caption, 256, 80, 480);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true })); sprite.position.set(...position); sprite.scale.set(width, width * 160 / 512, 1); parent.add(sprite); return sprite;
}
function release(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const mat of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) { materials.add(mat); if (mat.map) textures.add(mat.map); }
    if (object.isInstancedMesh) object.dispose();
  });
  textures.forEach(texture => texture.dispose()); materials.forEach(mat => mat.dispose()); geometries.forEach(geometry => geometry.dispose()); group.clear();
}
function instances(parent, geometry, positions, color, options = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material(color, options), positions.length), matrix = new THREE.Matrix4();
  positions.forEach((position, index) => { matrix.makeTranslation(...position); mesh.setMatrixAt(index, matrix); }); mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function torus(parent, radius, tube, position, color, options = {}) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 24), material(color, options)); mesh.position.set(...position); mesh.rotation.x = Math.PI / 2; parent.add(mesh); return mesh;
}
function makeRover(parent) {
  const group = new THREE.Group(); parent.add(group);
  box(group, [.37, .15, .43], [0, .2, 0], '#4c9fac', { metalness: .6, roughness: .35 });
  box(group, [.28, .11, .22], [0, .33, -.04], '#9ce5e9', { metalness: .4, roughness: .3 });
  box(group, [.23, .06, .1], [0, .36, .065], '#152e47', { metalness: .75, roughness: .2 });
  box(group, [.37, .04, .04], [0, .16, .23], '#cfbd87', { metalness: .85 });
  for (const x of [-.2, .2]) for (const z of [-.14, .14]) {
    const wheel = cylinder(group, .09, .07, [x, .13, z], '#151f2d', { roughness: .85 }); wheel.rotation.z = Math.PI / 2;
    const hub = cylinder(group, .04, .075, [x, .13, z], '#9ab3c0', { metalness: .8 }); hub.rotation.z = Math.PI / 2;
  }
  for (const x of [-.13, .13]) box(group, [.065, .045, .025], [x, .24, .223], '#e0f9de', { emissive: '#d1ffce', emissiveIntensity: .7 });
  cylinder(group, .018, .16, [0, .44, -.1], '#dce6e8', { metalness: .7 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.043, 12, 8), material('#77eef0', { emissive: '#77eef0', emissiveIntensity: .6 })); beacon.position.set(0, .55, -.1); group.add(beacon);
  const shield = torus(group, .29, .012, [0, .08, 0], '#95e7ed', { emissive: '#53bfcf', emissiveIntensity: .35 });
  return { group, shield, beacon };
}

/** Original procedural recovery floor. The world-space x/z coordinates match
 * the collision engine; camera changes never change the controls or physics. */
export function createScene({ canvas, qualitySelect, status }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [0, 13, 10], target: [0, 0, 0], shadows: true });
  stage.scene.fog = new THREE.Fog('#0B1220', 30, 70);
  stage.light.shadow.camera.left = stage.light.shadow.camera.bottom = -11; stage.light.shadow.camera.right = stage.light.shadow.camera.top = 11; stage.light.shadow.camera.updateProjectionMatrix();
  box(stage.scene, [80, .2, 80], [0, -.76, 0], '#0f1c2d', { roughness: .9 });
  const grid = new THREE.GridHelper(60, 40, '#224256', '#182b3b'); grid.position.y = -.65; stage.scene.add(grid);
  const root = new THREE.Group(); stage.scene.add(root);
  let config, center = 4, view = 'arena', rover, cores = [], sparks = [], gate;
  function world(point, height = 0) { return [point.x - center, height, point.z - center]; }
  function setView(next) {
    view = next;
    const side = config?.size || 9;
    if (view === 'top') { stage.camera.position.set(0, side * 1.65, .001); stage.camera.up.set(0, 0, -1); stage.camera.lookAt(0, 0, 0); }
    else { stage.camera.up.set(0, 1, 0); stage.camera.position.set(0, side * 1.3, side * .95); stage.camera.lookAt(0, 0, 0); }
  }
  function rebuild(nextConfig) {
    config = nextConfig; center = (config.size - 1) / 2; release(root); cores = []; sparks = [];
    const side = config.size;
    box(root, [side + .35, .34, side + .35], [0, -.25, 0], '#4e6478', { metalness: .68, roughness: .5 });
    box(root, [side + .1, .14, side + .1], [0, -.06, 0], '#1d3346', { metalness: .35 });
    const floors = [], walls = [], trims = [];
    for (let z = 0; z < side; z++) for (let x = 0; x < side; x++) floors.push(world({ x, z }, .005));
    for (const wall of config.walls) { walls.push(world(wall, .4)); trims.push(world(wall, .78)); }
    instances(root, new THREE.BoxGeometry(.97, .055, .97), floors, '#20394a', { roughness: .8, metalness: .12 });
    instances(root, new THREE.BoxGeometry(.99, .74, .99), walls, '#577081', { roughness: .6, metalness: .5 });
    instances(root, new THREE.BoxGeometry(.88, .025, .88), trims, '#78949f', { metalness: .65, roughness: .45 });
    // Clear axis markings stay fixed when the camera changes. DOM coordinates
    // expose every tile and the exact moving hazard/rover positions as well.
    for (let index = 1; index < side - 1; index++) {
      label(root, String(index), [index - center, .96, -center], .35, '#d4edf5');
      label(root, String(index), [-center, .96, index - center], .35, '#d4edf5');
    }
    label(root, 'N · RECOVERY FLOOR', [0, 1.15, -center - .3], 3.6, '#9eeaf1');
    label(root, `SECTOR ${String(config.level).padStart(4, '0')}`, [0, .3, center + .7], 3.4, '#d9e5ee');
    // The start plate is visual only; collection and exit require real contacts.
    const start = world(config.start, .05); cylinder(root, .31, .035, start, '#347081', { metalness: .5 });
    torus(root, .34, .018, world(config.start, .075), '#83d6e4', { emissive: '#4b9ead', emissiveIntensity: .25 });
    for (const core of config.cores) {
      const group = new THREE.Group(); group.position.set(...world(core)); root.add(group);
      cylinder(group, .21, .045, [0, .065, 0], '#6d603d', { metalness: .6 });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.2), material('#efc766', { metalness: .42, roughness: .3, emissive: '#ad7b23', emissiveIntensity: .25 })); crystal.position.y = .37; group.add(crystal);
      const ring = torus(group, .26, .015, [0, .12, 0], '#f8d07a', { emissive: '#d29e3a', emissiveIntensity: .35 });
      label(group, String.fromCharCode(65 + core.id), [0, .78, 0], .48, '#ffe5a3'); cores.push({ group, crystal, ring });
    }
    for (const hazard of config.hazards) {
      const a = world(hazard.a, .06), b = world(hazard.b, .06);
      line3(root, [a, b], '#ef9b68');
      for (const point of [a, b]) { const cap = torus(root, .19, .014, point, '#d4936a', { emissive: '#b96c38', emissiveIntensity: .15 }); cap.position.y = .06; }
      const group = new THREE.Group(); root.add(group);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.19, 1), material('#f5aa71', { emissive: '#e06c31', emissiveIntensity: .65, roughness: .3 })); orb.position.y = .29; group.add(orb);
      const halo = torus(group, .25, .018, [0, .29, 0], '#ffd8a6', { emissive: '#e48e4d', emissiveIntensity: .55 }); halo.rotation.x = .65;
      const halo2 = torus(group, .25, .013, [0, .29, 0], '#ffb67b', { emissive: '#d16c37', emissiveIntensity: .5 }); halo2.rotation.x = -.65; halo2.rotation.z = .7;
      sparks.push({ group, orb, halo, halo2 });
    }
    gate = new THREE.Group(); gate.position.set(...world(config.exit)); root.add(gate);
    gate.userData.plate = cylinder(gate, .36, .05, [0, .055, 0], '#8b743e', { emissive: '#755a25', emissiveIntensity: .15, metalness: .6 });
    box(gate, [.09, .65, .09], [-.36, .39, -.22], '#829caa', { metalness: .75 }); box(gate, [.09, .65, .09], [.36, .39, -.22], '#829caa', { metalness: .75 });
    gate.userData.bar = box(gate, [.8, .08, .11], [0, .75, -.22], '#d7b75e', { emissive: '#aa8439', emissiveIntensity: .25 });
    label(gate, 'EXIT', [0, 1.08, -.22], 1, '#bde7d1');
    rover = makeRover(root); setView(view);
  }
  function update(state, reducedMotion) {
    rover.group.position.set(...world(state.player)); rover.group.rotation.y = state.facing;
    const immune = state.time < state.invulnerableUntil, lost = state.phase === 'lost';
    rover.shield.material.color.set(lost ? '#f49cab' : immune ? '#ffffff' : '#88e5ed'); rover.beacon.material.color.set(lost ? '#f49cab' : '#77eef0');
    rover.shield.scale.setScalar(immune && !reducedMotion ? 1 + Math.sin(state.time * 12) * .08 : 1);
    cores.forEach((core, index) => { core.group.visible = !state.collected[index]; core.crystal.rotation.y = reducedMotion ? .4 : state.time * .9; core.crystal.position.y = .37 + (reducedMotion ? 0 : Math.sin(state.time * 2.1 + index) * .035); });
    sparks.forEach((spark, index) => {
      spark.group.position.set(...world(hazardPosition(config.hazards[index], state.time))); spark.orb.rotation.y = reducedMotion ? 0 : state.time * 1.6;
      spark.halo.rotation.z = reducedMotion ? .6 : state.time * 2; spark.halo2.rotation.z = reducedMotion ? .7 : -state.time * 1.4;
    });
    const open = state.collected.every(Boolean); gate.userData.plate.material.color.set(open ? '#43996c' : '#8b743e'); gate.userData.plate.material.emissive.set(open ? '#2d9c66' : '#755a25'); gate.userData.bar.material.color.set(open ? '#a1e9b9' : '#d7b75e'); gate.userData.bar.material.emissive.set(open ? '#65d58b' : '#aa8439');
  }
  return { rebuild, update, setView, render: () => stage.render(), dispose() { release(root); stage.dispose(); } };
}
