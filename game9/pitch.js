import { THREE, box, createStage } from '../shared/three-stage.js';
import { BALL_RADIUS, SAFETY_LINE, clearanceAt } from './clearance.js';
import { addGoal, addGround } from './ground.js';
import { loadDefender } from './defender.js';
import { createFootball } from './football.js';
import { addTrainingGround } from './training-ground.js';

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
  addTrainingGround(scene);
  const gate = new THREE.Group();
  scene.add(gate);
  const left = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const right = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const stripe = box(gate, [1, 0.025, 0.18], [0, 0.01, 0], '#f2c45f');
  gate.position.z = SAFETY_LINE;
  scene.add(defender.mesh);
  const ballMesh = createFootball();
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
  let targetBall = new THREE.Vector3();
  let hasFrame = false;

  function framePlay(z) {
    const wide = motion.matches ? 1 : THREE.MathUtils.smoothstep(z, 3, 25);
    camera.position.set(
      THREE.MathUtils.lerp(-4.5, -1.5, wide),
      THREE.MathUtils.lerp(5.9, 13, wide),
      THREE.MathUtils.lerp(-6.7, -12.7, wide)
    );
    camera.lookAt(0, 0.3, THREE.MathUtils.lerp(4.1, 9.5, wide));
  }

  return {
    draw(state, feed, ball, angle, plannedContact) {
      gate.position.x = -feed.channel;
      left.position.x = -feed.halfWidth;
      right.position.x = feed.halfWidth;
      stripe.scale.x = feed.halfWidth * 2;
      const attempt = state.trajectory;
      const visibleBall = attempt?.end ?? ball;
      trail.visible = Boolean(attempt) || (state.result === 'ready' && ball.z <= 2.3);
      if (trail.visible) {
        const contact = attempt?.contact ?? plannedContact;
        for (let i = 0; i <= 12; i += 1) {
          const z = contact.z + (SAFETY_LINE - contact.z) * i / 12;
          const point = clearanceAt(contact, attempt?.angle ?? angle, feed.drift, z);
          coords.set([-point.x, 0.045, z], i * 3);
        }
        geometry.attributes.position.needsUpdate = true;
      }
      const previousTarget = targetX;
      targetX = -state.defender;
      const movement = Math.sign(targetX - previousTarget);
      const kick = attempt && attempt !== playedAttempt;
      playedAttempt = attempt;
      const nextBall = new THREE.Vector3(-visibleBall.x, BALL_RADIUS, visibleBall.z);
      const travel = !nextBall.equals(targetBall);
      targetBall = nextBall;
      if (!hasFrame || motion.matches || (!travel && !movement && !kick && frame === undefined)) {
        cancelAnimationFrame(frame);
        frame = undefined;
        hasFrame = true;
        ballMesh.position.copy(targetBall);
        framePlay(ballMesh.position.z);
        defender.mesh.position.x = targetX;
        defender.pose(0, 0, 0);
        stage.render();
        return;
      }
      if (!travel && !movement && !kick) return;
      cancelAnimationFrame(frame);
      const from = defender.mesh.position.x;
      const ballFrom = ballMesh.position.clone();
      const started = performance.now();
      const windup = kick ? Math.max(0.035, attempt.delay) : 0;
      const flight = kick ? (attempt.end.z - attempt.contact.z) / 14 : 0;
      const duration = kick ? windup + flight : 0.095;
      const contactPoint = kick ? new THREE.Vector3(-attempt.contact.x, BALL_RADIUS, attempt.contact.z) : null;
      const kickingLeg = contactPoint && contactPoint.x >= targetX ? 0 : 1;
      function animate(now) {
        const seconds = Math.max(0, (now - started) / 1000);
        const elapsed = Math.min(1, seconds / duration);
        const step = Math.sin(Math.PI * elapsed);
        defender.mesh.position.x = THREE.MathUtils.lerp(from, targetX, elapsed);
        if (kick) {
          const strike = Math.max(0, 1 - Math.abs(seconds - windup) / 0.17);
          defender.pose(0, 0, strike, kickingLeg);
          if (seconds < windup) {
            ballMesh.position.lerpVectors(ballFrom, contactPoint, Math.min(1, seconds / windup));
          } else {
            const z = THREE.MathUtils.lerp(attempt.contact.z, attempt.end.z, Math.min(1, (seconds - windup) / flight));
            const point = clearanceAt(attempt.contact, attempt.angle, attempt.drift, z);
            ballMesh.position.set(-point.x, BALL_RADIUS, z);
          }
        } else {
          defender.pose(movement, step, 0);
          ballMesh.position.lerpVectors(ballFrom, targetBall, elapsed);
        }
        ballMesh.rotation.x = -ballMesh.position.z / BALL_RADIUS;
        framePlay(ballMesh.position.z);
        stage.render();
        frame = elapsed < 1 ? requestAnimationFrame(animate) : undefined;
      }
      frame = requestAnimationFrame(animate);
    }
  };
}
