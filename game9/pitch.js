import { THREE, box, createStage, material } from '../shared/three-stage.js';
import { BALL_RADIUS, SAFETY_LINE, clearanceAt } from './clearance.js';
import { addGoal, addGround } from './ground.js';
import { loadDefender } from './defender.js';

export async function createPitch(options) {
  const defender = await loadDefender();
  const stage = createStage({ ...options, position: [0, 15, -12], target: [0, 0, 11], enable16K: true });
  const { scene, camera, light, renderer } = stage;
  scene.background = new THREE.Color('#9eabb2');
  scene.fog = new THREE.Fog('#9eabb2', 42, 96);
  light.position.set(-12, 19, 5);
  light.target.position.set(0, 0, 7);
  scene.add(light.target);
  light.shadow.camera.left = light.shadow.camera.bottom = -26;
  light.shadow.camera.right = light.shadow.camera.top = 26;
  light.shadow.camera.updateProjectionMatrix();
  addGround(scene, renderer);
  addGoal(scene);
  const gate = new THREE.Group();
  scene.add(gate);
  const left = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const right = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const stripe = box(gate, [1, 0.025, 0.18], [0, 0.01, 0], '#f2c45f');
  gate.position.z = SAFETY_LINE;
  scene.add(defender.mesh);
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 18, 14), material('#fff7dc'));
  ballMesh.castShadow = true;
  scene.add(ballMesh);
  const coords = new Float32Array(13 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  const trail = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#f6dc86' }));
  trail.frustumCulled = false;
  scene.add(trail);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame;
  let targetX = 0;
  let playedAttempt = null;

  return {
    draw(state, feed, ball, angle) {
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
      const previousTarget = targetX;
      targetX = -state.defender;
      const movement = Math.sign(targetX - previousTarget);
      const kick = attempt && attempt !== playedAttempt;
      playedAttempt = attempt;
      if (motion.matches || (!movement && !kick && frame === undefined)) {
        cancelAnimationFrame(frame);
        frame = undefined;
        defender.mesh.position.x = targetX;
        defender.pose(0, 0, 0);
        stage.render();
        return;
      }
      if (!movement && !kick) return;
      cancelAnimationFrame(frame);
      const from = defender.mesh.position.x;
      const started = performance.now();
      function animate(now) {
        const elapsed = Math.min(1, (now - started) / (kick ? 340 : 175));
        const step = Math.sin(Math.PI * elapsed);
        defender.mesh.position.x = THREE.MathUtils.lerp(from, targetX, elapsed);
        defender.pose(movement, step, kick ? step : 0);
        stage.render();
        frame = elapsed < 1 ? requestAnimationFrame(animate) : undefined;
      }
      frame = requestAnimationFrame(animate);
    }
  };
}
