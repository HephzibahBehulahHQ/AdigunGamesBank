import { circuitFor, projectToTrack, trackPoint } from './campaign.js';

const clamp = (n, low, high) => Math.max(low, Math.min(high, Number.isFinite(n) ? n : 0));
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
export const CAR_HALF_WIDTH = 0.85;
export const RECOVERY_PENALTY = 5;
export const TRACK_LIMIT_PENALTY = 3;

export function createRace(level = 1) {
  const config = circuitFor(level), start = trackPoint(config, 0);
  const car = { x: start.x, z: start.z, heading: level === 1 ? 0 : start.heading, speed: 0, steering: 0 };
  return { config, car, phase: 'ready', elapsed: 0, drivingTime: 0, penalty: 0, gatesPassed: 0,
    completedLaps: 0, nextGate: 1, sectorInvalid: false, offTrack: false, gripLimited: false,
    distanceDriven: 0, recoveries: 0, projection: projectToTrack(config, car.x, car.z),
    message: 'Set your controls, then start the qualifying run.', medal: null };
}

export function startRace(state) {
  if (state.phase !== 'ready') return false;
  state.phase = 'running'; state.message = 'Race clock running. Cross the illuminated gates in order.'; return true;
}
export function pauseRace(state) {
  if (state.phase !== 'running') return false;
  state.phase = 'paused'; state.message = 'Paused. Race time and controls are frozen.'; return true;
}
export function resumeRace(state) {
  if (state.phase !== 'paused') return false;
  state.phase = 'running'; state.message = state.sectorInvalid ? 'Recover to the last clean gate before continuing.' : 'Run resumed. The next gate is illuminated.'; return true;
}
export function restartRace(state) { return createRace(state.config.level); }

function timeExpired(state) {
  if (state.elapsed < state.config.timeLimit) return false;
  state.phase = 'lost'; state.car.speed = 0;
  state.message = 'Time expired. Retry this circuit; your completed races are safe.';
  return true;
}

/** Ordered gates plus a clean-sector latch prevent grass shortcuts and finish-line farming. */
export function crossedGate(from, to, gate, length) {
  const travel = ((to - from + length * 1.5) % length) - length / 2;
  const remaining = ((gate - from) % length + length) % length;
  return travel > 0 && travel < length / 4 && remaining > 1e-8 && remaining <= travel + 1e-8;
}

export function recoverCar(state) {
  if (!['running', 'paused'].includes(state.phase)) return false;
  const config = state.config;
  const lastGate = state.gatesPassed % config.gateCount;
  const point = trackPoint(config, lastGate * config.length / config.gateCount + 0.03);
  state.car = { x: point.x, z: point.z, heading: config.level === 1 ? point.distance / config.length * Math.PI * 2 : point.heading, speed: 0, steering: 0 };
  state.projection = projectToTrack(config, point.x, point.z);
  state.sectorInvalid = false; state.offTrack = false; state.gripLimited = false;
  state.elapsed += RECOVERY_PENALTY; state.penalty += RECOVERY_PENALTY; state.recoveries++;
  state.message = `Recovered to the last clean gate. ${RECOVERY_PENALTY}-second penalty added.`;
  timeExpired(state); return true;
}

function tick(state, controls, dt) {
  const config = state.config, car = state.car, previous = state.projection;
  const throttle = clamp(controls.throttle, 0, 1), brake = clamp(controls.brake, 0, 1), steer = clamp(controls.steer, -1, 1);
  const oldSpeed = car.speed;
  const resistance = 0.22 + car.speed * car.speed * 0.012 + (state.offTrack ? 7 : 0);
  car.speed = clamp(car.speed + ((brake > 0 ? 0 : throttle) * config.acceleration - brake * 17 - resistance) * dt, 0, config.maxSpeed);
  const speed = (oldSpeed + car.speed) / 2;
  const wantedCurve = steer / config.turnRadius, gripCurve = config.grip / Math.max(1, speed * speed);
  const curvature = clamp(wantedCurve, -gripCurve, gripCurve);
  state.gripLimited = Math.abs(wantedCurve) > gripCurve + 1e-6;
  car.steering = steer;
  const travel = speed * dt, turn = travel * curvature, half = turn / 2;
  const factor = Math.abs(half) > 1e-9 ? Math.sin(half) / half : 1;
  const dx = travel * factor * Math.cos(car.heading + half), dz = travel * factor * Math.sin(car.heading + half);
  car.x += dx; car.z += dz; car.heading = angle(car.heading + turn);
  state.distanceDriven += Math.hypot(dx, dz);
  state.elapsed += dt; state.drivingTime += dt;
  const projected = projectToTrack(config, car.x, car.z);
  const outside = projected.gap > config.width / 2 - CAR_HALF_WIDTH;
  if (outside && !state.sectorInvalid) {
    state.sectorInvalid = true; state.elapsed += TRACK_LIMIT_PENALTY; state.penalty += TRACK_LIMIT_PENALTY;
    state.message = 'Track limits exceeded. Gate credit is locked: recover to the last clean gate (+5 seconds).';
  }
  state.offTrack = outside;
  if (projected.gap > config.width / 2 + 4) car.speed = 0;
  const projectedTravel = ((projected.distance - previous.distance + config.length * 1.5) % config.length) - config.length / 2;
  const physical = projectedTravel >= 0 && projectedTravel <= travel * 1.6 + 0.08;
  const gateDistance = (state.nextGate % config.gateCount) * config.length / config.gateCount;
  if (!state.sectorInvalid && !outside && physical && crossedGate(previous.distance, projected.distance, gateDistance, config.length)) {
    state.gatesPassed++; state.nextGate = state.gatesPassed % config.gateCount + 1;
    state.completedLaps = Math.floor(state.gatesPassed / config.gateCount);
    state.message = state.completedLaps && state.gatesPassed % config.gateCount === 0
      ? `Lap ${state.completedLaps} complete. Keep the next sector clean.`
      : `Gate ${state.gatesPassed % config.gateCount || config.gateCount} cleared.`;
  }
  state.projection = projected;
  if (timeExpired(state)) return;
  if (state.gatesPassed === config.gateCount * config.laps) {
    state.phase = 'won'; car.speed = 0;
    state.medal = state.elapsed <= config.goldTime ? 'Gold' : state.elapsed <= config.silverTime ? 'Silver' : 'Bronze';
    state.message = `Qualified! ${state.medal} time: ${state.elapsed.toFixed(2)} seconds. All ${state.gatesPassed} gates verified.`;
  }
}

/** Fixed substeps, bounded catch-up and no reverse gear; a paused frame advances nothing. */
export function stepRace(state, controls = {}, duration = 0) {
  if (state.phase !== 'running' || !Number.isFinite(duration) || duration <= 0) return state;
  const dt = Math.min(duration, 0.25), steps = Math.ceil(dt / (1 / 60)), h = dt / steps;
  for (let i = 0; i < steps && state.phase === 'running'; i++) tick(state, controls, h);
  return state;
}

/** Read-only route guidance. It never changes the car, controls, clock or gate credit. */
export function drivingGuide(state) {
  const config = state.config, car = state.car;
  const lookAhead = 6 + car.speed * 0.45;
  const target = trackPoint(config, state.projection.distance + lookAhead);
  const dx = target.x - car.x, dz = target.z - car.z, distance = Math.max(1, Math.hypot(dx, dz));
  const error = angle(Math.atan2(dz, dx) - car.heading);
  const steer = clamp(2 * Math.sin(error) * config.turnRadius / distance, -1, 1);
  return { steer, suggestedSpeed: config.safeSpeed, offset: state.projection.offset,
    gateDistance: ((state.nextGate % config.gateCount) * config.length / config.gateCount - state.projection.distance + config.length) % config.length,
    heading: car.heading, target };
}
