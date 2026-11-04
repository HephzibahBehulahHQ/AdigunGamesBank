import { THREE, createStage, box, material, line3 } from '../shared/three-stage.js';
import { GOAL, BALL_RADIUS, KEEPER_PARTS, keeperPose, currentKick, makeFlight, ballAt } from './penalty-engine.js';

function capsule(parent, start, end, radius, color) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), delta = b.clone().sub(a);
  const group = new THREE.Group(), mat = material(color, { roughness: 0.78, metalness: 0.02 });
  const geometry = new THREE.CapsuleGeometry(radius, delta.length(), 5, 10);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(a.add(b).multiplyScalar(0.5));
  if (delta.length() > 0) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true; group.add(mesh); parent.add(group); return group;
}

function person(color, skin = '#8b624b') {
  const group = new THREE.Group();
  group.userData.jersey = [];
  for (const part of KEEPER_PARTS) {
    const jersey = part.name === 'torso' || part.name.includes('arm');
    const tone = part.name === 'head' ? skin : part.name.includes('leg') ? '#18273b' : part.name.includes('glove') ? '#ece8d2' : color;
    const mesh = capsule(group, [...part.a, 0], [...part.b, 0], part.radius, tone);
    if (jersey) group.userData.jersey.push(mesh.children[0].material);
  }
  box(group, [0.22, 0.12, 0.3], [-0.3, -0.9, 0.055], '#07111f');
  box(group, [0.22, 0.12, 0.3], [0.3, -0.9, 0.055], '#07111f');
  return group;
}

function sign(parent, text, width, height, position) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#0B1220'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#D4AF37'; context.fillRect(0, 112, 1024, 4);
  context.font = '700 44px system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = '#F8FAFC'; context.fillText(text, 512, 61);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(...position); parent.add(mesh); return texture;
}

export function createPenaltyScene(options) {
  const stage = createStage({ ...options, position: [0, 5.4, 21.4], target: [0, 1.1, 4.7], shadows: true });
  const { scene, camera } = stage; scene.background = new THREE.Color('#11273c');
  scene.fog = new THREE.Fog('#11273c', 32, 90); camera.fov = 40; camera.updateProjectionMatrix();
  const textures = [];
  box(scene, [28, 0.16, 36], [0, -0.1, 10], '#174d3d', { roughness: 1, metalness: 0 });
  for (let i = 0; i < 12; i++) box(scene, [22, 0.012, 2.5], [0, -0.008, -3 + i * 2.5], i % 2 ? '#1c5a45' : '#205f48', { roughness: 1, metalness: 0 });
  const chalk = '#dde7d3';
  for (const [size, position] of [ [[18.32, 0.018, 0.05], [0, 0.006, 5.5]], [[0.05, 0.018, 5.5], [-9.16, 0.006, 2.75]], [[0.05, 0.018, 5.5], [9.16, 0.006, 2.75]], [[22, 0.018, 0.06], [0, 0.006, 0]], [[22, 0.018, 0.06], [0, 0.006, 16.5]] ]) box(scene, size, position, chalk);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), material(chalk)); spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.018, GOAL.distance); scene.add(spot);
  const arc = [];
  for (let i = 0; i <= 80; i++) { const angle = Math.PI * 0.14 + i / 80 * Math.PI * 0.72; arc.push([Math.cos(angle) * 9.15, 0.02, GOAL.distance + Math.sin(angle) * 9.15]); }
  line3(scene, arc, chalk);

  const half = GOAL.width / 2 + GOAL.postRadius, bar = GOAL.height + GOAL.postRadius;
  capsule(scene, [-half, 0, 0], [-half, bar, 0], GOAL.postRadius, '#f0f2e7');
  capsule(scene, [half, 0, 0], [half, bar, 0], GOAL.postRadius, '#f0f2e7');
  capsule(scene, [-half, bar, 0], [half, bar, 0], GOAL.postRadius, '#f0f2e7');
  for (const side of [-1, 1]) {
    capsule(scene, [side * half, 0.035, 0], [side * half, 0.035, -1.7], 0.03, '#a3adb3');
    capsule(scene, [side * half, 0.035, -1.7], [side * half, bar, -0.65], 0.03, '#a3adb3');
    for (let y = 0; y <= bar; y += 0.22) line3(scene, [[side * half, y, 0], [side * half, y, -1.7 + y / bar * 1.05]], '#728f93');
  }
  for (let x = -half; x <= half; x += 0.24) line3(scene, [[x, 0.03, -1.7], [x, bar, -0.65], [x, bar, 0]], '#728f93');
  for (let y = 0; y <= bar; y += 0.22) line3(scene, [[-half, y, -1.7 + y / bar * 1.05], [half, y, -1.7 + y / bar * 1.05]], '#728f93');

  // Original training-ground architecture; no real clubs, kits or likenesses.
  box(scene, [25, 0.75, 0.45], [0, 0.35, -3.25], '#15233a');
  for (let row = 0; row < 5; row++) {
    box(scene, [26, 0.35, 1], [0, 0.7 + row * 0.4, -4.2 - row], '#263a50');
    for (let seat = 0; seat < 31; seat++) box(scene, [0.55, 0.16, 0.48], [-12 + seat * 0.8, 0.98 + row * 0.4, -4.08 - row], (seat + row) % 7 === 0 ? '#c2a651' : '#315a89');
  }
  box(scene, [28, 0.2, 5], [0, 4.3, -6.5], '#0b1728');
  for (const side of [-1, 1]) {
    box(scene, [0.18, 7.5, 0.18], [side * 11.8, 3.7, -2], '#8998a7');
    box(scene, [2.1, 0.75, 0.18], [side * 11.8, 7.5, -2], '#122139');
    for (let i = 0; i < 5; i++) box(scene, [0.27, 0.38, 0.04], [side * 11.8 - 0.75 + i * 0.38, 7.5, -1.88], '#ecf4e8', { emissive: '#d6e9e6', emissiveIntensity: 0.7 });
    box(scene, [0.4, 1, 22], [side * 12, 0.4, 10], '#122d37');
  }
  textures.push(sign(scene, 'ADIGUN ATHLETIC   /   TRAINING GROUND', 14, 1.75, [0, 3.5, -3.6]));
  textures.push(sign(scene, 'PENALTY PRO     •     MAKE EVERY KICK COUNT', 16, 0.85, [0, 0.54, -2.98]));

  const keeper = person('#d4af37'); scene.add(keeper);
  const striker = person('#2563eb', '#664333'); striker.position.set(-0.65, 1, 12.1); striker.rotation.y = Math.PI; scene.add(striker);
  const ball = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 24, 16), material('#f4f1df', { roughness: 0.55, metalness: 0 })); sphere.castShadow = true; ball.add(sphere);
  const phi = (1 + Math.sqrt(5)) / 2;
  const directions = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) directions.push([0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]);
  for (const direction of directions) {
    const normal = new THREE.Vector3(...direction).normalize();
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.033, 5), material('#122139', { roughness: 0.8 }));
    patch.position.copy(normal.clone().multiplyScalar(BALL_RADIUS + 0.001)); patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); ball.add(patch);
  }
  scene.add(ball);
  const reticle = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.013, 7, 24), new THREE.MeshBasicMaterial({ color: '#f1d67c' })); reticle.add(ring);
  line3(reticle, [[-0.21, 0, 0], [0.21, 0, 0]], '#f1d67c'); line3(reticle, [[0, -0.21, 0], [0, 0.21, 0]], '#f1d67c'); scene.add(reticle);
  const trailGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 37 }, () => new THREE.Vector3(0, BALL_RADIUS, GOAL.distance)));
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: '#f1d67c', transparent: true, opacity: 0.6 })); scene.add(trail);

  return {
    update(state, input, dive, reduceMotion) {
      const kick = state.flight?.kick || currentKick(state), pose = keeperPose(kick, state.flight ? state.elapsed : 0);
      if (state.role === 'keeper' && state.phase === 'ready') pose.x = 0;
      keeper.position.set(pose.x, pose.y, pose.z); keeper.rotation.z = pose.angle;
      keeper.userData.jersey.forEach(mat => mat.color.set(state.role === 'keeper' ? '#2563eb' : '#d4af37'));
      striker.userData.jersey.forEach(mat => mat.color.set(state.role === 'keeper' ? '#d4af37' : '#2563eb'));
      ball.position.set(state.ball.x, state.ball.y, state.ball.z);
      ball.rotation.x = state.elapsed * 12; ball.rotation.z = state.elapsed * -4;
      striker.rotation.z = state.flight && !reduceMotion ? Math.sin(Math.min(1, state.elapsed / 0.3) * Math.PI) * 0.13 : 0;
      reticle.visible = state.phase === 'ready';
      if (reticle.visible && state.role === 'keeper') reticle.position.set(dive.targetX, dive.high ? 1.3 : 0.56, 0.08);
      else if (reticle.visible) {
        // Shows the direction sight line only. Gravity and crosswind are not
        // compensated for the player; placement still depends on the physics.
        const flight = makeFlight(kick, input), time = GOAL.distance / flight.vz;
        reticle.position.set(flight.vx * time, BALL_RADIUS + flight.vy * time, 0.08);
      }
      trail.visible = Boolean(state.flight);
      if (state.flight) {
        const positions = trailGeometry.attributes.position;
        for (let i = 0; i < 37; i++) { const point = ballAt(state.flight, state.elapsed * i / 36); positions.setXYZ(i, point.x, point.y, point.z); }
        positions.needsUpdate = true; trailGeometry.computeBoundingSphere();
      }
    },
    render() { stage.render(); },
    dispose() { textures.forEach(texture => texture.dispose()); stage.dispose(); }
  };
}
