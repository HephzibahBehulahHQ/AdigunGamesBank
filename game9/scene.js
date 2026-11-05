import { THREE, createStage, material, box, line3 } from '../shared/three-stage.js';
import { GOAL, BALL_RADIUS, KEEPER_PARTS, ZONES, ballAt, readKeeper, currentKick } from './goal-line-engine.js';

const PALETTE = { navy: '#0B1220', blue: '#2563EB', gold: '#D4AF37', ivory: '#F8FAFC', muted: '#A8BBC7' };

// The endpoints and radii are the actual collision primitives, including the
// goal tubes and keeper's limbs. Cosmetic silhouettes do not enlarge a save.
function capsule(parent, start, end, radius, color) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), axis = b.clone().sub(a);
  const length = axis.length();
  const geometry = length < 1e-8 ? new THREE.SphereGeometry(radius, 18, 12) : new THREE.CapsuleGeometry(radius, length, 5, 12);
  const mesh = new THREE.Mesh(geometry, material(color, { roughness: 0.72, metalness: 0.025 }));
  mesh.position.copy(a.add(b).multiplyScalar(0.5));
  if (length) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

function segmentLines(parent, segments, color, opacity = 1) {
  const points = segments.flatMap(segment => segment.map(point => new THREE.Vector3(...point)));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  parent.add(mesh); return mesh;
}

function makeKeeper() {
  const group = new THREE.Group();
  for (const part of KEEPER_PARTS) {
    const tone = part.name === 'head' ? '#81533d' : part.name.includes('glove') ? PALETTE.ivory : part.name.includes('leg') ? '#182a42' : PALETTE.gold;
    capsule(group, [...part.a, 0], [...part.b, 0], part.radius, tone);
  }
  return group;
}

function makeStriker() {
  const group = new THREE.Group();
  capsule(group, [0, -0.22, 0], [0, 0.3, 0], 0.23, PALETTE.blue);
  capsule(group, [0, 0.63, 0], [0, 0.63, 0], 0.19, '#6b4332');
  for (const side of [-1, 1]) {
    capsule(group, [side * 0.2, 0.23, 0], [side * 0.35, -0.3, -0.06], 0.09, PALETTE.blue);
    capsule(group, [side * 0.35, -0.3, -0.06], [side * 0.35, -0.44, -0.12], 0.075, '#6b4332');
    capsule(group, [side * 0.12, -0.28, 0], [side * 0.2, -0.85, side * 0.1], 0.125, '#182a42');
    box(group, [0.19, 0.12, 0.3], [side * 0.2, -0.91, side * 0.1 - 0.07], '#ecedf0');
  }
  return group;
}

function makeBall() {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 24, 18), material('#f5f5ea', { roughness: 0.58, metalness: 0 }));
  sphere.castShadow = true; group.add(sphere);
  // Original pentagonal panels; no photograph, brand mark or external texture.
  const phi = (1 + Math.sqrt(5)) / 2, directions = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) directions.push([0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]);
  for (const direction of directions) {
    const normal = new THREE.Vector3(...direction).normalize();
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.032, 5), material(PALETTE.navy, { roughness: 0.8 }));
    patch.position.copy(normal.clone().multiplyScalar(BALL_RADIUS + 0.0005));
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); group.add(patch);
  }
  return group;
}

function board(parent, width, height, position, textures) {
  const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The stadium sign could not be created.');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  textures.push(texture);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(...position); parent.add(mesh);
  return {
    write(title, detail) {
      context.fillStyle = PALETTE.navy; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = PALETTE.gold; context.fillRect(40, 211, 1200, 5);
      context.textAlign = 'left'; context.textBaseline = 'middle';
      context.font = '800 84px system-ui, sans-serif'; context.fillStyle = PALETTE.ivory; context.fillText(title, 48, 91);
      context.font = '600 32px system-ui, sans-serif'; context.fillStyle = '#B7C8D8'; context.fillText(detail, 52, 168);
      texture.needsUpdate = true;
    }
  };
}

export function createGoalLineScene({ canvas, qualitySelect, status }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [5.4, 5.9, 20.4], target: [0, 1.1, 3.8], shadows: true });
  const { scene, camera } = stage;
  scene.background = new THREE.Color('#101e31'); scene.fog = new THREE.Fog('#101e31', 35, 95);
  camera.fov = 42; camera.updateProjectionMatrix();
  const textures = [];

  box(scene, [34, 0.16, 42], [0, -0.11, 9.5], '#164d3d', { roughness: 1, metalness: 0 });
  for (let stripe = 0; stripe < 14; stripe++) {
    box(scene, [30, 0.012, 2.65], [0, -0.02, -7 + stripe * 2.65], stripe % 2 ? '#205b43' : '#194f3d', { roughness: 1, metalness: 0 });
  }
  const chalk = '#e6e9dc';
  for (const [size, position] of [
    [[30, 0.014, 0.08], [0, 0.003, 0]],
    [[18.32, 0.014, 0.07], [0, 0.003, 5.5]],
    [[0.07, 0.014, 5.5], [-9.16, 0.003, 2.75]],
    [[0.07, 0.014, 5.5], [9.16, 0.003, 2.75]],
    [[30, 0.014, 0.07], [0, 0.003, 16.5]]
  ]) box(scene, size, position, chalk, { roughness: 1, metalness: 0 });
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 20), material(chalk));
  spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.018, GOAL.distance); scene.add(spot);
  const arc = [];
  for (let i = 0; i <= 72; i++) {
    const angle = 0.14 * Math.PI + i / 72 * 0.72 * Math.PI;
    arc.push([Math.cos(angle) * 9.15, 0.016, GOAL.distance + Math.sin(angle) * 9.15]);
  }
  line3(scene, arc, chalk);

  const half = GOAL.width / 2 + GOAL.postRadius, bar = GOAL.height + GOAL.postRadius;
  capsule(scene, [-half, 0, 0], [-half, bar, 0], GOAL.postRadius, PALETTE.ivory);
  capsule(scene, [half, 0, 0], [half, bar, 0], GOAL.postRadius, PALETTE.ivory);
  capsule(scene, [-half, bar, 0], [half, bar, 0], GOAL.postRadius, PALETTE.ivory);
  const net = [], backZ = y => -1.9 + y / bar * 1.05;
  for (const side of [-1, 1]) {
    capsule(scene, [side * half, 0.04, 0], [side * half, 0.04, -1.9], 0.028, '#a0b3ba');
    capsule(scene, [side * half, 0.04, -1.9], [side * half, bar, -0.85], 0.028, '#a0b3ba');
    for (let y = 0.08; y <= bar; y += 0.18) net.push([[side * half, y, 0], [side * half, y, backZ(y)]]);
    for (let row = 0; row <= 10; row++) net.push([[side * half, 0.04, -1.9 * row / 10], [side * half, bar, -0.85 * row / 10]]);
  }
  for (let x = -half; x <= half; x += 0.18) net.push([[x, 0.04, -1.9], [x, bar, -0.85]], [[x, bar, -0.85], [x, bar, 0]]);
  for (let y = 0.08; y <= bar; y += 0.18) net.push([[-half, y, backZ(y)], [half, y, backZ(y)]]);
  segmentLines(scene, net, '#aec4c6', 0.4);

  // A compact original stand, lit service towers and a continuous perimeter.
  box(scene, [30, 0.8, 0.4], [0, 0.35, -3.2], '#101b2d');
  box(scene, [31.2, 0.18, 5.6], [0, 4.8, -7.0], '#13253b');
  for (let row = 0; row < 5; row++) box(scene, [29, 0.32, 0.95], [0, 0.7 + row * 0.5, -4.4 - row], '#26384b');
  const seating = new THREE.InstancedMesh(new THREE.BoxGeometry(0.49, 0.21, 0.52), material('#315783'), 180);
  const matrix = new THREE.Matrix4(), color = new THREE.Color();
  for (let row = 0; row < 5; row++) for (let seat = 0; seat < 36; seat++) {
    const index = row * 36 + seat;
    matrix.makeTranslation(-13.8 + seat * 0.79, 1.0 + row * 0.5, -4.35 - row);
    seating.setMatrixAt(index, matrix); seating.setColorAt(index, color.set(seat % 12 === 0 ? '#c6aa52' : row % 2 ? '#284b74' : '#356693'));
  }
  seating.castShadow = true; seating.receiveShadow = true; scene.add(seating);
  for (const side of [-1, 1]) {
    box(scene, [0.23, 4.8, 0.23], [side * 14.2, 2.4, -4.2], '#40556a');
    box(scene, [0.34, 0.8, 28], [side * 15.2, 0.35, 10.8], '#102b34');
    box(scene, [0.2, 8.7, 0.2], [side * 12.4, 4.3, -2.5], '#65798b');
    box(scene, [2.1, 0.7, 0.25], [side * 12.4, 8.55, -2.5], '#142238');
    for (let lamp = 0; lamp < 5; lamp++) box(scene, [0.3, 0.36, 0.05], [side * 12.4 - 0.78 + lamp * 0.39, 8.55, -2.34], '#ecf4e4', { emissive: '#d8e8dd', emissiveIntensity: 0.65 });
  }
  const mastLines = [];
  for (const side of [-1, 1]) mastLines.push([[side * 14.2, 4.65, -4.2], [side * 14.2, 4.65, -9.8]]);
  segmentLines(scene, mastLines, '#51637b');
  const banner = board(scene, 15.5, 3.1, [0, 5.5, -7.3], textures);
  banner.write('GOAL LINE / FIELD 09', 'READ THE KEEPER. MAKE YOUR MOMENT.');
  const scoreBoard = board(scene, 9.5, 1.9, [0, 1.0, -3.0], textures);

  const keeper = makeKeeper(); scene.add(keeper);
  const striker = makeStriker(); striker.position.set(-0.55, 1.0, 12.05); scene.add(striker);
  const ball = makeBall(); scene.add(ball);

  const markers = ZONES.map(zone => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.013, 7, 24), new THREE.MeshBasicMaterial({ color: PALETTE.muted, transparent: true, opacity: 0.45, depthWrite: false }));
    mesh.position.set(zone.x, zone.y, 0.23); scene.add(mesh);
    return { zone, mesh };
  });
  const feintMarker = new THREE.Mesh(new THREE.RingGeometry(0.21, 0.24, 32), new THREE.MeshBasicMaterial({ color: '#77a5ff', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  scene.add(feintMarker);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 28), new THREE.MeshBasicMaterial({ color: '#03150c', transparent: true, opacity: 0.42, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  const trailGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 42 }, () => new THREE.Vector3(0, BALL_RADIUS, GOAL.distance)));
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: '#f3d785', transparent: true, opacity: 0.72 })); scene.add(trail);
  let lastBoard = '';

  return {
    update(state, reducedMotion = false) {
      const pose = state.keeper, reading = state.phase === 'ready' || state.phase === 'paused' && state.resumePhase === 'ready';
      keeper.position.set(pose.x, pose.y, pose.z); keeper.rotation.z = pose.angle;
      ball.position.set(state.ball.x, state.ball.y, state.ball.z);
      ball.rotation.set(reducedMotion ? 0 : state.elapsed * 11, 0, reducedMotion ? 0 : -state.elapsed * 3.5);
      shadow.position.set(state.ball.x, 0.02, state.ball.z); shadow.material.opacity = Math.max(0.1, 0.44 - state.ball.y * 0.11);
      for (const { zone, mesh } of markers) {
        mesh.visible = reading;
        const selected = state.zoneId === zone.id;
        mesh.material.color.set(selected ? '#ffe49a' : PALETTE.muted);
        mesh.material.opacity = selected ? 1 : 0.32; mesh.scale.setScalar(selected ? 1.45 : 1);
      }
      const tell = readKeeper(state), fakeZone = state.feintPlan && ZONES.find(zone => zone.id === state.feintPlan.zoneId);
      feintMarker.visible = reading && Boolean(fakeZone) && ['baiting', 'committed'].includes(tell.stage);
      if (fakeZone) feintMarker.position.set(fakeZone.x, fakeZone.y, 0.25);
      trail.visible = Boolean(state.flight);
      if (state.flight) {
        const positions = trailGeometry.attributes.position;
        for (let index = 0; index < positions.count; index++) {
          const point = ballAt(state.flight, state.elapsed * index / (positions.count - 1));
          positions.setXYZ(index, point.x, point.y, point.z);
        }
        positions.needsUpdate = true; trailGeometry.computeBoundingSphere();
      }
      const fieldPhase = ({ ready: tell.stage.toUpperCase(), flight: 'BALL IN FLIGHT', paused: 'PAUSED', result: state.log.at(-1)?.outcome.toUpperCase(), won: 'CHALLENGE WON', lost: 'RETRY CHALLENGE' })[state.phase];
      const boardKey = `${state.config.level}:${state.kickIndex}:${state.goals}:${fieldPhase}`;
      if (boardKey !== lastBoard) {
        scoreBoard.write(`${String(state.goals).padStart(2, '0')} / ${state.config.target} GOALS`, `CHALLENGE ${state.config.level.toLocaleString()}   /   ${fieldPhase}`);
        lastBoard = boardKey;
      }
    },
    render() { stage.render(); },
    dispose() { textures.forEach(texture => texture.dispose()); stage.dispose(); }
  };
}
