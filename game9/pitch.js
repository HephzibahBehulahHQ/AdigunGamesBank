import { THREE, box, createStage } from '../shared/three-stage.js';
import { BALL_RADIUS, SAFETY_LINE, STEP, clearanceAt, clearanceDistance, clearanceHeight, goalNetImpact, goalNetRest, incomingAt, pressureAt, receiverAt } from './clearance.js';
import { addGoal, addGround, loadTurf } from './ground.js';
import { loadPlayers } from './defender.js';
import { createFootball } from './football.js';
import { addTrainingGround } from './training-ground.js';

export async function createPitch(options) {
  const skyUrl = new URL('./textures/training-sky.jpg', import.meta.url);
  const [{ defender, createOpponent, createReceiver }, turf, sky] = await Promise.all([
    loadPlayers(),
    loadTurf(),
    new THREE.TextureLoader().loadAsync(skyUrl.href).catch(() => null),
  ]);
  const stage = createStage({ ...options, position: [0, 15, -12], target: [0, 0, 11], enable16K: true });
  const { scene, camera, light, renderer } = stage;
  scene.background = new THREE.Color('#9eabb2');
  if (sky) {
    sky.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(220, 64, 32), new THREE.MeshBasicMaterial({
      map: sky, side: THREE.BackSide, depthWrite: false, fog: false,
    }));
    // Let opaque pitch geometry reject sky fragments before sampling the panorama.
    dome.renderOrder = 1;
    scene.add(dome);
  }
  scene.fog = new THREE.Fog('#9eabb2', 42, 96);
  light.position.set(-12, 19, 5);
  light.target.position.set(0, 0, 7);
  scene.add(light.target);
  light.shadow.camera.left = light.shadow.camera.bottom = -26;
  light.shadow.camera.right = light.shadow.camera.top = 26;
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.autoUpdate = false;
  const setHeavyTurf = addGround(scene, renderer, turf);
  const net = addGoal(scene);
  addTrainingGround(scene);
  const gate = new THREE.Group();
  scene.add(gate);
  const left = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const right = box(gate, [0.11, 0.8, 0.11], [0, 0.4, 0], '#f2c45f');
  const stripe = box(gate, [1, 0.025, 0.18], [0, 0.01, 0], '#f2c45f');
  gate.position.z = SAFETY_LINE;
  scene.add(defender.mesh);
  const ballMesh = createFootball();
  const rollingAxis = new THREE.Vector3();
  scene.add(ballMesh);
  const coords = new Float32Array(13 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(coords, 3));
  const trail = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#f6dc86' }));
  trail.frustumCulled = false;
  scene.add(trail);
  const { motion } = options;
  let frame;
  let targetX = 0;
  let playedAttempt = null;
  let playedConcession = false;
  let targetBall = new THREE.Vector3();
  let hasFrame = false;
  let previousFeed;
  let settledShadow = null;
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

  function controlClearance(attempt, readiness) {
    const player = attempt.interception ? opponent : receiver;
    const ball = attempt.interception?.ball ?? attempt.end;
    const ballX = -ball.x;
    const gap = ballX - player.mesh.position.x;
    // Step toward the ball, then extend the nearer boot to cushion it.
    player.mesh.position.x += THREE.MathUtils.clamp(gap, -0.55, 0.55) * readiness;
    const leg = gap < 0 ? 0 : 1;
    const trap = new THREE.Vector3(ballX, ball.y - BALL_RADIUS * 0.68, ball.z + BALL_RADIUS * 0.55);
    player.plantBoot(trap, 0, leg, readiness);
  }

  function trackBall() {
    defender.watchBall(ballMesh.position);
    receiver.watchBall(ballMesh.position);
    if (opponent?.mesh.visible) opponent.watchBall(ballMesh.position);
  }

  function framePlay(z) {
    const wide = motion.matches ? 1 : THREE.MathUtils.smoothstep(z, 3, 25);
    const broadcast = options.view() === 'broadcast';
    options.canvas.dataset.camera = broadcast ? 'broadcast' : 'goal';
    if (broadcast) {
      camera.position.set(
        THREE.MathUtils.lerp(-11.2, -20.5, wide),
        THREE.MathUtils.lerp(3.45, 7.5, wide),
        THREE.MathUtils.lerp(3.2, 2, wide)
      );
      camera.lookAt(0.65, 1.02, THREE.MathUtils.lerp(4.4, 11.7, wide));
      return;
    }
    camera.position.set(
      THREE.MathUtils.lerp(-4.5, -1.5, wide),
      THREE.MathUtils.lerp(5.9, 13, wide),
      THREE.MathUtils.lerp(-6.7, -12.7, wide)
    );
    camera.lookAt(0, 0.3, THREE.MathUtils.lerp(4.1, 9.5, wide));
  }

  return {
    draw(state, feed, ball, angle, plannedContact, projection) {
      const newFeed = feed !== previousFeed;
      if (newFeed) ballMesh.quaternion.identity();
      previousFeed = feed;
      setHeavyTurf(Boolean(feed.resistance));
      left.position.x = -feed.halfWidth;
      right.position.x = feed.halfWidth;
      stripe.scale.x = feed.halfWidth * 2;
      const attempt = state.trajectory;
      const controlled = state.result === 'cleared' || state.result === 'intercepted';
      const netHit = state.result === 'conceded' ? goalNetImpact(feed) : null;
      const concession = Boolean(netHit) && !playedConcession;
      playedConcession = Boolean(netHit);
      if (!netHit) net.settle();
      const restingBall = netHit && goalNetRest(netHit);
      const visibleBall = attempt?.interception?.ball ?? attempt?.end ?? restingBall ?? ball;
      trail.visible = Boolean(attempt) || (state.result === 'ready' && ball.z <= 2.3);
      if (trail.visible) {
        const shot = attempt ?? projection;
        const safe = shot.atGate && !shot.interception;
        trail.material.color.set(safe ? '#f1ffe2' : '#ffc287');
        const contact = attempt?.contact ?? plannedContact;
        const destination = shot.interception?.ball ?? shot.end;
        for (let i = 0; i <= 12; i += 1) {
          const z = contact.z + (destination.z - contact.z) * i / 12;
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
      const nextBall = new THREE.Vector3(-visibleBall.x, visibleBall.y, visibleBall.z);
      const travel = !nextBall.equals(targetBall);
      targetBall = nextBall;
      if (!hasFrame || newFeed || motion.matches || (!travel && !movement && !kick && !concession && frame === undefined)) {
        cancelAnimationFrame(frame);
        frame = undefined;
        hasFrame = true;
        ballMesh.position.copy(targetBall);
        framePlay(ballMesh.position.z);
        const endTime = attempt ? attempt.delay + attempt.travelTime : 0;
        const sceneTime = state.tick * STEP + endTime;
        framePlayers(feed, sceneTime);
        if (controlled) controlClearance(attempt, 1);
        defender.mesh.position.z = 0;
        defender.settle(targetX);
        trackBall();
        // Camera and aim changes leave a settled scene's shadow casters in place.
        if (!settledShadow || settledShadow.feed !== feed || settledShadow.time !== sceneTime || travel || movement) {
          light.shadow.needsUpdate = true;
          settledShadow = { feed, time: sceneTime };
        }
        stage.render();
        return;
      }
      if (!travel && !movement && !kick && !concession) return;
      cancelAnimationFrame(frame);
      const from = defender.mesh.position.x;
      const ballFrom = ballMesh.position.clone();
      const started = performance.now();
      const windup = kick ? Math.max(0.035, attempt.delay) : 0;
      const flight = kick ? attempt.travelTime : 0;
      const netTransit = concession ? Math.max(0.045, (ballFrom.z - netHit.z) / feed.pace) : 0;
      const netContact = concession ? new THREE.Vector3(-netHit.x, netHit.y, netHit.z) : null;
      const duration = concession ? netTransit + 0.65 : kick ? windup + flight : 0.095;
      const contactPoint = kick ? new THREE.Vector3(-attempt.contact.x, attempt.contact.y, attempt.contact.z) : null;
      const kickingLeg = contactPoint && contactPoint.x >= targetX ? 0 : 1;
      const kickAngle = kick ? -attempt.angle * Math.PI / 180 : 0;
      const bootTarget = kick ? contactPoint.clone().add(
        new THREE.Vector3(-Math.sin(kickAngle) * BALL_RADIUS, -0.04, -Math.cos(kickAngle) * BALL_RADIUS)
      ) : null;
      const supportBoot = kick ? new THREE.Vector3(targetX + (kickingLeg === 0 ? -0.21 : 0.21), 0.035, 0.13) : null;
      const swingBoot = kick ? bootTarget.clone() : null;
      let previousSeconds = -1;
      function animate(now) {
        const previousX = ballMesh.position.x;
        const previousZ = ballMesh.position.z;
        const realSeconds = THREE.MathUtils.clamp((now - started) / 1000, 0, duration);
        const seconds = kick && previousSeconds < windup && realSeconds >= windup ? windup : realSeconds;
        previousSeconds = seconds;
        const elapsed = Math.min(1, seconds / duration);
        defender.mesh.position.x = THREE.MathUtils.lerp(from, targetX, elapsed);
        defender.mesh.position.z = 0;
        if (kick) {
          const afterContact = seconds - windup;
          const strike = afterContact < 0
            ? THREE.MathUtils.smoothstep(seconds, 0, windup)
            : 1 - THREE.MathUtils.smoothstep(afterContact, 0.065, 0.26);
          defender.pose(0, 0, strike, kickingLeg);
          if (strike > 0) {
            defender.mesh.position.x += (contactPoint.x - targetX) * strike * 0.36;
            defender.mesh.position.z = contactPoint.z * strike * 0.26;
            const followThrough = THREE.MathUtils.smoothstep(afterContact, 0, 0.11);
            swingBoot.copy(bootTarget);
            swingBoot.x += Math.sin(kickAngle) * followThrough * 0.22;
            swingBoot.y += followThrough * 0.17;
            swingBoot.z += Math.cos(kickAngle) * followThrough * 0.22;
            const plantedWeight = THREE.MathUtils.smoothstep(strike, 0, 0.55);
            defender.plantBoot(supportBoot, 0, 1 - kickingLeg, plantedWeight);
            defender.plantBoot(swingBoot, kickAngle, kickingLeg, strike);
          }
          if (seconds < windup) {
            ballMesh.position.lerpVectors(ballFrom, contactPoint, Math.min(1, seconds / windup));
          } else {
            const z = Math.min(visibleBall.z, attempt.contact.z + clearanceDistance(attempt.speed, seconds - windup, attempt.resistance));
            const point = clearanceAt(attempt.contact, attempt.angle, attempt.drift, z);
            ballMesh.position.set(-point.x, clearanceHeight(attempt.contact.y, seconds - windup), z);
          }
        } else if (concession) {
          defender.settle(targetX);
          if (seconds < netTransit) {
            ballMesh.position.lerpVectors(ballFrom, netContact, seconds / netTransit);
          } else {
            const reboundTime = seconds - netTransit;
            const roll = 1 - (1 - Math.min(1, reboundTime / 0.5)) ** 2;
            ballMesh.position.lerpVectors(netContact, targetBall, roll);
            ballMesh.position.y = clearanceHeight(netHit.y, reboundTime);
            if (elapsed === 1) net.settle();
            else net.impact(netHit, reboundTime);
          }
        } else {
          defender.stride(defender.mesh.position.x);
          ballMesh.position.lerpVectors(ballFrom, targetBall, elapsed);
          if (feed.bounces && state.tick > 0) ballMesh.position.y = incomingAt(feed, (state.tick - 1 + elapsed) * STEP).y;
        }
        // Leave the exact simulation endpoint ready for a deferred 16K paint.
        if (elapsed === 1) ballMesh.position.copy(targetBall);
        const dx = ballMesh.position.x - previousX;
        const dz = ballMesh.position.z - previousZ;
        const distance = Math.hypot(dx, dz);
        if (distance > 0) {
          rollingAxis.set(dz / distance, 0, -dx / distance);
          ballMesh.rotateOnWorldAxis(rollingAxis, distance / BALL_RADIUS);
        }
        framePlay(ballMesh.position.z);
        const time = kick
          ? state.tick * STEP + (seconds < windup
            ? attempt.delay * seconds / windup
            : attempt.delay + Math.min(seconds - windup, flight))
          : Math.max(0, (state.tick - 1 + elapsed) * STEP);
        framePlayers(feed, time);
        if (kick && controlled) {
          const readiness = THREE.MathUtils.smoothstep(seconds, Math.max(windup, duration - 0.24), duration);
          if (readiness > 0) controlClearance(attempt, readiness);
        }
        trackBall();
        settledShadow = null;
        light.shadow.needsUpdate = true;
        stage.render();
        frame = elapsed < 1 ? requestAnimationFrame(animate) : undefined;
      }
      frame = requestAnimationFrame(animate);
    }
  };
}
