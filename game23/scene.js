import { THREE, material, box, cylinder } from '../shared/three-stage.js';
import { randomFor } from '../shared/progression.js';
import { currentTarget, positionAt, predict, RELEASE_HEIGHT } from './engine.js';

const EARTH = ['#766c4c', '#93805b', '#a28b61', '#68704a', '#807b53'];

function mesh(parent, geometry, finish, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, typeof finish === 'string' ? material(finish, { roughness: 0.95, metalness: 0 }) : finish);
  object.position.set(...position); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
}
function disposeObject(object) {
  object.traverse(child => { child.geometry?.dispose(); if (Array.isArray(child.material)) child.material.forEach(value => value.dispose()); else child.material?.dispose(); });
  object.removeFromParent();
}
function terrainHeight(x, z) {
  const bank = -10 + Math.sin(z * 0.1) * 1.5;
  const side = Math.max(0, Math.abs(x) - 7);
  return -0.08 + Math.sin(x * 0.22 + z * 0.08) * 0.025 + side * side / 115 * (0.65 + Math.sin(z * 0.035) * 0.2 + Math.cos(x * 0.08) * 0.15) - Math.exp(-((x - bank) ** 2) / 3) * 0.2;
}
function landscape(scene) {
  const ground = new THREE.PlaneGeometry(140, 160, 100, 112);
  ground.rotateX(-Math.PI / 2); ground.translate(0, 0, 55);
  const positions = ground.getAttribute('position'), colors = new Float32Array(positions.count * 3);
  const random = randomFor(17040);
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), z = positions.getZ(index), height = terrainHeight(x, z);
    positions.setY(index, height);
    const color = new THREE.Color(EARTH[Math.floor(random() * EARTH.length)]);
    color.multiplyScalar(0.85 + random() * 0.25);
    colors.set([color.r, color.g, color.b], index * 3);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(colors, 3)); ground.computeVertexNormals();
  const land = mesh(scene, ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })); land.castShadow = false;

  const waterPositions = [], waterIndices = [];
  for (let index = 0; index <= 60; index++) {
    const z = -16 + index * 1.8, x = -10 + Math.sin(z * 0.1) * 1.5;
    waterPositions.push(x - 0.7, -0.12, z, x + 0.7, -0.12, z);
    if (index < 60) { const offset = index * 2; waterIndices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3); }
  }
  const waterGeometry = new THREE.BufferGeometry(); waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3)); waterGeometry.setIndex(waterIndices); waterGeometry.computeVertexNormals();
  const water = mesh(scene, waterGeometry, material('#6c8988', { roughness: 0.22, metalness: 0.35, side: THREE.DoubleSide })); water.castShadow = false;

  const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), material('#7c8176', { roughness: 0.96, metalness: 0 }), 110);
  const transform = new THREE.Object3D();
  for (let index = 0; index < 110; index++) {
    const z = -5 + random() * 89, bank = -10 + Math.sin(z * 0.1) * 1.5;
    const x = bank + (random() < 0.5 ? -1 : 1) * (0.8 + random() * 1.3);
    const size = 0.08 + random() * 0.32;
    transform.position.set(x, terrainHeight(x, z) + size * 0.25, z);
    transform.scale.set(size, size * (0.35 + random() * 0.4), size * (0.6 + random() * 0.5)); transform.rotation.set(random(), random() * 3, random()); transform.updateMatrix();
    stones.setMatrixAt(index, transform.matrix); stones.setColorAt(index, new THREE.Color().setHSL(0.12, 0.06 + random() * 0.08, 0.35 + random() * 0.22));
  }
  stones.castShadow = true; stones.receiveShadow = true; scene.add(stones);

  const grasses = new THREE.InstancedMesh(new THREE.ConeGeometry(0.055, 0.35, 4), material('#697442', { roughness: 1, metalness: 0 }), 1700);
  for (let index = 0; index < 1700; index++) {
    const x = (random() < 0.5 ? -1 : 1) * (5.8 + random() * 22), z = -5 + random() * 102;
    transform.position.set(x, terrainHeight(x, z) + 0.12, z); transform.scale.set(1 + random(), 0.7 + random(), 1); transform.rotation.set((random() - 0.5) * 0.4, random() * Math.PI, (random() - 0.5) * 0.25); transform.updateMatrix(); grasses.setMatrixAt(index, transform.matrix);
    grasses.setColorAt(index, new THREE.Color().setHSL(0.18 + random() * 0.035, 0.2, 0.25 + random() * 0.15));
  }
  grasses.receiveShadow = true; scene.add(grasses);

  for (const [x, z, size] of [[-21, 17, 1.1], [24, 38, 1.25], [-30, 62, 1.5], [34, 72, 1.3]]) {
    const tree = new THREE.Group(); tree.position.set(x, terrainHeight(x, z), z); tree.scale.setScalar(size); scene.add(tree);
    const trunk = cylinder(tree, 0.18, 2.7, [0, 1.35, 0], '#64543c', { roughness: 1, metalness: 0 }); trunk.rotation.z = 0.12;
    for (let crown = 0; crown < 5; crown++) {
      const foliage = mesh(tree, new THREE.SphereGeometry(0.95, 12, 10), material('#53654b', { roughness: 1, metalness: 0 }), [Math.sin(crown * 2.3) * 0.9, 2.65 + (crown % 2) * 0.45, Math.cos(crown * 2.3) * 0.8]);
      foliage.scale.set(1.3, 0.7, 1.1);
    }
  }
}

function character(champion = false) {
  const root = new THREE.Group();
  const skin = material(champion ? '#927052' : '#aa7951', { roughness: 0.94, metalness: 0 });
  const cloth = material(champion ? '#544c3b' : '#c9b897', { roughness: 1, metalness: 0 });
  const bronze = material('#897044', { roughness: 0.44, metalness: 0.72 });
  const leather = material('#4b3829', { roughness: 0.94, metalness: 0 });
  mesh(root, new THREE.CapsuleGeometry(0.21, 0.33, 6, 14), champion ? bronze : cloth, [0, 1.19, 0]);
  mesh(root, new THREE.CylinderGeometry(0.22, 0.32, 0.43, 16), cloth, [0, 0.82, 0]);
  mesh(root, new THREE.CylinderGeometry(0.225, 0.23, 0.065, 16), leather, [0, 0.99, 0]);
  for (const sign of [-1, 1]) {
    mesh(root, new THREE.CylinderGeometry(0.075, 0.06, 0.4, 12), skin, [sign * 0.13, 0.48, 0]);
    mesh(root, new THREE.CylinderGeometry(0.062, 0.045, 0.39, 12), champion ? bronze : skin, [sign * 0.13, 0.21, 0]);
    mesh(root, new THREE.BoxGeometry(0.13, 0.07, 0.26), leather, [sign * 0.13, 0.055, 0.06]);
  }
  mesh(root, new THREE.CylinderGeometry(0.068, 0.075, 0.15, 12), skin, [0, 1.51, 0]);
  const head = mesh(root, new THREE.SphereGeometry(0.135, 18, 14), skin, [0, 1.68, 0]); head.scale.set(0.92, 1.1, 1);
  mesh(root, new THREE.SphereGeometry(0.14, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), champion ? bronze : material('#2a251e', { roughness: 1, metalness: 0 }), [0, 1.7, -0.005]);
  mesh(root, new THREE.SphereGeometry(0.025, 8, 6), skin, [0, 1.66, 0.13]);
  const eyes = material('#271f18', { roughness: 1 });
  for (const sign of [-1, 1]) mesh(root, new THREE.SphereGeometry(0.008, 6, 4), eyes, [sign * 0.044, 1.70, 0.121]);
  const arms = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sign * 0.25, 1.40, 0); root.add(arm); arms.push(arm);
    mesh(arm, new THREE.CylinderGeometry(0.073, 0.055, 0.3, 12), champion ? bronze : cloth, [0, -0.12, 0]);
    mesh(arm, new THREE.CylinderGeometry(0.054, 0.036, 0.27, 12), skin, [0, -0.39, 0.025]);
    mesh(arm, new THREE.SphereGeometry(0.047, 10, 8), skin, [0, -0.55, 0.04]);
    arm.rotation.z = -sign * 0.14;
  }
  if (champion) {
    mesh(root, new THREE.BoxGeometry(0.023, 0.2, 0.04), bronze, [0, 1.72, 0.14]);
    root.scale.setScalar(1.58);
  } else {
    const bag = mesh(root, new THREE.SphereGeometry(0.16, 16, 10), leather, [-0.28, 0.78, 0.02]); bag.scale.set(1, 1.2, 0.55);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.28, 0.78, 0.03), new THREE.Vector3(0.18, 1.4, 0.19), new THREE.Vector3(0.24, 1.38, -0.12), new THREE.Vector3(-0.28, 0.78, -0.05)]), 16, 0.018, 6, false), leather);
    root.add(strap);
  }
  return { root, arms };
}

function shield(target, final) {
  const root = new THREE.Group(), radius = Math.max(final ? 0.62 : 0.55, target.radius + 0.14);
  const finish = material(final ? '#9e7c42' : '#796042', { roughness: final ? 0.46 : 0.94, metalness: final ? 0.76 : 0 });
  const disc = mesh(root, new THREE.CylinderGeometry(radius, radius, 0.095, 64), finish); disc.rotation.x = Math.PI / 2;
  const rim = mesh(root, new THREE.TorusGeometry(radius - 0.025, 0.038, 10, 64), material(final ? '#b69a61' : '#4b3a2c', { roughness: 0.52, metalness: final ? 0.7 : 0 }), [0, 0, -0.06]);
  const painted = mesh(root, new THREE.CircleGeometry(target.radius, 64), material('#373b31', { roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide }), [0, 0, -0.059]);
  const ring = mesh(root, new THREE.TorusGeometry(target.radius, 0.022, 8, 64), material('#D4AF37', { roughness: 0.35, metalness: 0.45, emissive: '#D4AF37', emissiveIntensity: 0.15 }), [0, 0, -0.07]);
  const bull = mesh(root, new THREE.CircleGeometry(Math.max(0.055, target.radius * 0.12), 24), material('#e3d6af', { roughness: 0.9, side: THREE.DoubleSide }), [0, 0, -0.075]);
  if (final) {
    const boss = mesh(root, new THREE.SphereGeometry(0.105, 18, 12), finish, [0, 0, -0.075]); boss.scale.z = 0.65;
    for (let index = 0; index < 16; index++) mesh(root, new THREE.SphereGeometry(0.018, 6, 5), material('#c6ad70', { metalness: 0.8, roughness: 0.4 }), [Math.cos(index / 16 * Math.PI * 2) * radius * 0.86, Math.sin(index / 16 * Math.PI * 2) * radius * 0.86, -0.07]);
  } else {
    for (let index = -2; index <= 2; index++) {
      const width = Math.sqrt(Math.max(0, radius * radius - (index * radius / 3) ** 2)) * 1.8;
      box(root, [0.012, width, 0.008], [index * radius / 3, 0, -0.049], '#4f402f', { roughness: 1, metalness: 0 });
    }
  }
  root.position.set(target.x, target.y, target.z + 0.075);
  return { root, ring, painted, rim, bull };
}

function sling(scene) {
  const root = new THREE.Group(); root.position.set(-0.5, RELEASE_HEIGHT, 0); scene.add(root);
  const leather = material('#543b28', { roughness: 0.94, metalness: 0 });
  const pouch = mesh(root, new THREE.SphereGeometry(0.12, 18, 10), leather, [0.5, 0, 0]); pouch.scale.set(1.3, 0.3, 0.72);
  for (const sign of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.25, -0.03, sign * 0.06), new THREE.Vector3(0.48, 0, sign * 0.065)]);
    mesh(root, new THREE.TubeGeometry(curve, 12, 0.007, 6, false), leather);
  }
  return root;
}
function trajectoryLine(color) {
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(73 * 3), 3));
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }));
  line.frustumCulled = false; return line;
}
function updatePath(line, velocity, end) {
  const positions = line.geometry.getAttribute('position');
  for (let index = 0; index <= 72; index++) { const point = positionAt(velocity, end * index / 72); positions.setXYZ(index, point.x, Math.max(0.04, point.y), point.z); }
  positions.needsUpdate = true;
}

export function buildValleyScene(stage) {
  const { scene, camera } = stage;
  scene.background = new THREE.Color('#c4c6b4'); scene.fog = new THREE.Fog('#c4c6b4', 85, 185);
  stage.light.position.set(-22, 44, -15); stage.light.intensity = 3.15;
  landscape(scene);
  const david = character(false); david.root.position.set(-0.85, 0, -0.2); david.root.rotation.y = -0.22; scene.add(david.root);
  const leatherSling = sling(scene);
  const stone = mesh(scene, new THREE.IcosahedronGeometry(0.07, 2), material('#b0aba0', { roughness: 0.94, metalness: 0 })); stone.visible = false;
  const preview = trajectoryLine('#D4AF37'), trail = trajectoryLine('#F8FAFC'); scene.add(preview, trail);
  let targets = [], champion = null, previousConfig = null, previousState = null, lastCamera = '';
  const impact = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.16, 32), new THREE.MeshBasicMaterial({ color: '#F8FAFC', side: THREE.DoubleSide })); scene.add(impact); impact.visible = false;

  function rebuild(config) {
    targets.forEach(value => disposeObject(value.group)); targets = [];
    if (champion) disposeObject(champion.root);
    champion = character(true);
    const final = config.targets[2]; champion.root.position.set(final.x, 0, final.z + 0.6); champion.root.rotation.y = Math.PI; scene.add(champion.root);
    champion.arms[0].rotation.x = -0.75; champion.arms[1].rotation.x = -0.6;
    for (const target of config.targets) {
      const group = new THREE.Group(), face = shield(target, target.type === 'encounter'); group.add(face.root);
      if (target.type === 'practice') {
        for (const sign of [-1, 1]) {
          const post = cylinder(group, 0.055, target.y + 0.28, [target.x + sign * 0.38, (target.y + 0.28) / 2, target.z + 0.13], '#5e4d32', { roughness: 1, metalness: 0 }); post.rotation.z = sign * 0.07;
        }
      }
      scene.add(group); targets.push({ group, face });
    }
    previousConfig = config; lastCamera = '';
  }
  return {
    update(state, aim, assists = true, reducedMotion = false, cameraMode = 'sling') {
      if (state.config !== previousConfig) rebuild(state.config);
      if (state !== previousState) { previousState = state; impact.visible = false; }
      const target = currentTarget(state);
      targets.forEach((value, index) => {
        value.group.visible = index === state.targetIndex;
        const hit = state.lastResult?.hit && state.lastResult.targetIndex === index;
        value.face.ring.material.color.set(hit ? '#7de6ab' : '#D4AF37');
        value.face.root.rotation.y = hit && !reducedMotion && state.phase === 'feedback' ? Math.sin(state.feedbackTime * 16) * 0.07 * (1 - state.feedbackTime) : 0;
      });
      champion.root.visible = state.targetIndex === 2;
      champion.root.position.y = state.phase === 'won' ? -0.20 : 0;
      champion.root.rotation.x = state.phase === 'won' ? -0.12 : 0;
      const cameraKey = `${cameraMode}:${state.targetIndex}:${state.config.level}`;
      if (cameraKey !== lastCamera) {
        if (cameraMode === 'overview') { camera.position.set(24, 22, target.z * 0.36 - 11); camera.lookAt(0, 1, target.z * 0.48); }
        else if (cameraMode === 'target') { camera.position.set(target.x + 5.5, 4.5, target.z - 10); camera.lookAt(target.x, target.y, target.z); }
        else { camera.position.set(4.5, 4.2, -8); camera.lookAt(target.x * 0.4, 2.2, target.z * 0.47); }
        lastCamera = cameraKey;
      }
      const flight = state.phase === 'flight' || state.phase === 'feedback' || (state.phase === 'paused' && ['flight', 'feedback'].includes(state.previousPhase));
      stone.visible = Boolean(state.shot) && (flight || ['won', 'lost'].includes(state.phase));
      if (stone.visible) { stone.position.set(state.shot.position.x, state.shot.position.y, state.shot.position.z); stone.rotation.set(state.shot.t * 5, state.shot.t * 7, state.shot.t * 2); }
      leatherSling.visible = state.phase !== 'flight' || state.shot?.t > 0.2;
      leatherSling.rotation.z = state.phase === 'flight' ? -Math.min(state.shot.t * 4, 1.3) : 0;
      david.arms[1].rotation.x = state.phase === 'flight' ? -1.5 + Math.min(state.shot.t, 1) : -1.25;
      david.arms[1].rotation.z = -0.48;
      preview.visible = assists && ['aim', 'ready', 'paused'].includes(state.phase) && !flight;
      if (preview.visible) { const prediction = predict(target, aim); updatePath(preview, prediction.velocity, Math.min(prediction.landing, prediction.arrival)); }
      trail.visible = assists && flight && Boolean(state.shot);
      if (trail.visible) updatePath(trail, state.shot.velocity, state.shot.t);
      impact.visible = state.lastResult?.hit && ['feedback', 'won'].includes(state.phase);
      if (impact.visible) impact.position.set(state.shot.crossing.x, state.shot.crossing.y, target.z - 0.02);
    },
  };
}
