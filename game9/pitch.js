import { THREE, box, createStage, material } from '../shared/three-stage.js';
import { BALL_RADIUS, SAFETY_LINE, clearanceAt } from './clearance.js';

export function createPitch(options) {
  const stage = createStage({ ...options, position: [0, 15, -12], target: [0, 0, 11], shadows: false });
  const { scene, camera } = stage;
  scene.background = new THREE.Color('#182943');
  box(scene, [26, 0.2, 72], [0, -0.12, 24], '#214b3b');
  for (let z = -2; z < 57; z += 6) {
    box(scene, [22, 0.02, 3], [0, -0.01, z], '#29634a');
  }
  for (const x of [-11, 11]) box(scene, [0.07, 0.018, 56], [x, 0, 26], '#e0ebdb');
  box(scene, [22, 0.018, 0.08], [0, 0, 0], '#e0ebdb');
  box(scene, [22, 0.018, 0.05], [0, 0, SAFETY_LINE], '#adbcac');
  for (const x of [-3.72, 3.72]) box(scene, [0.12, 2.5, 0.12], [x, 1.25, 0], '#edf2f9');
  box(scene, [7.56, 0.12, 0.12], [0, 2.5, 0], '#edf2f9');
  box(scene, [7.32, 0.018, 2.3], [0, 0, 1.15], '#4a7344');
  const gate = new THREE.Group();
  scene.add(gate);
  const left = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const right = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const stripe = box(gate, [1, 0.025, 0.18], [0, 0.01, 0], '#f2c45f');
  gate.position.z = SAFETY_LINE;
  const defender = new THREE.Group();
  scene.add(defender);
  box(defender, [0.53, 0.63, 0.28], [0, 1.12, 0], '#2563eb');
  box(defender, [0.92, 0.19, 0.22], [0, 1.26, 0], '#2563eb');
  box(defender, [0.24, 0.26, 0.24], [0, 1.59, 0], '#a47054');
  for (const x of [-0.15, 0.15]) {
    box(defender, [0.16, 0.82, 0.19], [x, 0.43, 0], '#172d45');
    box(defender, [0.18, 0.12, 0.34], [x, 0.07, 0.08], '#e0ebdb');
  }
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 18, 14), material('#fff7dc'));
  scene.add(ballMesh);
  const coords = new Float32Array(13 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  const trail = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#f6dc86' }));
  trail.frustumCulled = false;
  scene.add(trail);

  return {
    draw(state, feed, ball, angle) {
      defender.position.x = -state.defender;
      gate.position.x = -feed.channel;
      left.position.x = -feed.halfWidth;
      right.position.x = feed.halfWidth;
      stripe.scale.x = feed.halfWidth * 2;
      const attempt = state.trajectory;
      const visibleBall = attempt?.end ?? ball;
      ballMesh.position.set(-visibleBall.x, BALL_RADIUS, visibleBall.z);
      trail.visible = Boolean(attempt) || (state.result === 'ready' && ball.z <= 2.3);
      if (trail.visible) {
        const contact = attempt?.contact ?? ball;
        for (let i = 0; i <= 12; i += 1) {
          const z = contact.z + (SAFETY_LINE - contact.z) * i / 12;
          const point = clearanceAt(contact, attempt?.angle ?? angle, feed.drift, z);
          coords.set([-point.x, 0.045, z], i * 3);
        }
        geometry.attributes.position.needsUpdate = true;
      }
      camera.lookAt(0, 0, 7 + Math.max(0, visibleBall.z - 14) * 0.2);
      stage.render();
    }
  };
}
