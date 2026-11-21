import { THREE, box, createStage } from '../shared/three-stage.js';
import { BALL_RADIUS, SAFETY_LINE, STEP, clearanceAt, clearanceDistance, pressureAt, receiverAt } from './clearance.js';
import { addGoal, addGround, loadTurf } from './ground.js';
import { loadPlayers } from './defender.js';
import { createFootball } from './football.js';
import { addTrainingGround } from './training-ground.js';

export async function createPitch(options) {
  const [{ defender, createOpponent, createReceiver }, turf] = await Promise.all([loadPlayers(), loadTurf()]);
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
  addGround(scene, renderer, turf);
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
  let opponent;
  const receiver = createReceiver();
  receiver.mesh.rotation.y = Math.PI;
  receiver.mesh.position.z = SAFETY_LINE + 0.28;
  scene.add(receiver.mesh);

  function framePlayers(feed, time) {
    const outlet = -receiverAt(feed, time);
    if (motion.matches || !feed.receiver) receiver.settle(outlet);
    else receiver.stride(outlet);
    gate.position.x = outlet;
    const pressure = pressureAt(feed, time);
    if (!pressure) {
      if (opponent) opponent.mesh.visible = false;
      return;
    }
    if (!opponent) {
      opponent = createOpponent();
      opponent.mesh.rotation.y = Math.PI;
      scene.add(opponent.mesh);
    }
    opponent.mesh.position.z = pressure.z;
    opponent.mesh.visible = true;
    if (motion.matches) opponent.settle(-pressure.x);
    else opponent.stride(-pressure.x);
  }

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
    draw(state, feed, ball, angle, plannedContact, projection) {
      left.position.x = -feed.halfWidth;
      right.position.x = feed.halfWidth;
      stripe.scale.x = feed.halfWidth * 2;
      const attempt = state.trajectory;
      const visibleBall = attempt?.interception?.ball ?? attempt?.end ?? ball;
      trail.visible = Boolean(attempt) || (state.result === 'ready' && ball.z <= 2.3);
      if (trail.visible) {
        const contact = attempt?.contact ?? plannedContact;
        for (let i = 0; i <= 12; i += 1) {
          const previewEnd = projection.interception?.ball.z ?? projection.end.z;
          const z = contact.z + ((attempt ? visibleBall.z : previewEnd) - contact.z) * i / 12;
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
        const endTime = attempt ? attempt.delay + attempt.travelTime : 0;
        framePlayers(feed, state.tick * STEP + endTime);
        defender.mesh.position.z = 0;
        defender.settle(targetX);
        stage.render();
        return;
      }
      if (!travel && !movement && !kick) return;
      cancelAnimationFrame(frame);
      const from = defender.mesh.position.x;
      const ballFrom = ballMesh.position.clone();
      const started = performance.now();
      const windup = kick ? Math.max(0.035, attempt.delay) : 0;
      const flight = kick ? attempt.travelTime : 0;
      const duration = kick ? windup + flight : 0.095;
      const contactPoint = kick ? new THREE.Vector3(-attempt.contact.x, BALL_RADIUS, attempt.contact.z) : null;
      const kickingLeg = contactPoint && contactPoint.x >= targetX ? 0 : 1;
      const kickAngle = kick ? -attempt.angle * Math.PI / 180 : 0;
      const bootTarget = kick ? contactPoint.clone().add(
        new THREE.Vector3(-Math.sin(kickAngle) * BALL_RADIUS, -0.04, -Math.cos(kickAngle) * BALL_RADIUS)
      ) : null;
      let previousSeconds = -1;
      function animate(now) {
        const realSeconds = Math.max(0, (now - started) / 1000);
        const seconds = kick && previousSeconds < windup && realSeconds >= windup ? windup : realSeconds;
        previousSeconds = seconds;
        const elapsed = Math.min(1, seconds / duration);
        defender.mesh.position.x = THREE.MathUtils.lerp(from, targetX, elapsed);
        defender.mesh.position.z = 0;
        if (kick) {
          const strike = Math.max(0, 1 - Math.abs(seconds - windup) / 0.17);
          defender.pose(0, 0, strike, kickingLeg);
          if (strike > 0) {
            defender.mesh.position.x += (contactPoint.x - targetX) * strike * 0.36;
            defender.mesh.position.z = contactPoint.z * strike * 0.26;
            defender.plantBoot(bootTarget, kickAngle, kickingLeg, THREE.MathUtils.smoothstep(strike, 0.1, 1));
          }
          if (seconds < windup) {
            ballMesh.position.lerpVectors(ballFrom, contactPoint, Math.min(1, seconds / windup));
          } else {
            const z = Math.min(visibleBall.z, attempt.contact.z + clearanceDistance(attempt.speed, seconds - windup));
            const point = clearanceAt(attempt.contact, attempt.angle, attempt.drift, z);
            ballMesh.position.set(-point.x, BALL_RADIUS, z);
          }
        } else {
          defender.stride(defender.mesh.position.x);
          ballMesh.position.lerpVectors(ballFrom, targetBall, elapsed);
        }
        ballMesh.rotation.x = -ballMesh.position.z / BALL_RADIUS;
        framePlay(ballMesh.position.z);
        const time = kick
          ? state.tick * STEP + (seconds < windup
            ? attempt.delay * seconds / windup
            : attempt.delay + Math.min(seconds - windup, flight))
          : Math.max(0, (state.tick - 1 + elapsed) * STEP);
        framePlayers(feed, time);
        stage.render();
        frame = elapsed < 1 ? requestAnimationFrame(animate) : undefined;
      }
      frame = requestAnimationFrame(animate);
    }
  };
}
