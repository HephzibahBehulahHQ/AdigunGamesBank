import { randomFor, tierFor, validLevel } from '../shared/progression.js';

export const GRAVITY = 9.81;
export const RELEASE_HEIGHT = 1.55;
export const STONE_RADIUS = 0.045;
export const CONTROLS = Object.freeze({ yaw: [-25, 25], elevation: [12, 62], speed: [8, 36] });
const radians = degrees => degrees * Math.PI / 180;
const degrees = radians => radians * 180 / Math.PI;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, precision = 1000) => Math.round(value * precision) / precision;

/** Three mechanically distinct shots per level, not three separate games. */
export function levelConfig(input = 1) {
  const level = validLevel(input), difficulty = (level - 1) / 9999;
  const random = randomFor(0xE1A40000 + level * 104729);
  const baseRange = 16 + 25 * difficulty + random() * 4;
  const targets = [0, 1, 2].map(index => ({
    name: ['Riverbank practice', 'Uphill practice', 'The champion’s shield'][index],
    type: index < 2 ? 'practice' : 'encounter',
    x: round((random() * 2 - 1) * (0.7 + 3 * difficulty)),
    z: round(baseRange + index * (4 + difficulty * 2)),
    y: index === 2 ? 1.9 : round(1.4 + random() * 0.45),
    radius: round((index === 2 ? 0.84 : 1.04) - difficulty * (index === 2 ? 0.56 : 0.70)),
    wind: round((random() * 2 - 1) * (level === 1 ? 0 : 0.15 + difficulty * 2.2)),
  }));
  return { level, tier: tierFor(level), difficulty, stones: 5, targets };
}

export function normalizeAim(input = {}) {
  const defaults = { yaw: 0, elevation: 35, speed: 18 };
  return Object.fromEntries(Object.entries(CONTROLS).map(([key, [low, high]]) => [key, round(clamp(Number.isFinite(input[key]) ? input[key] : defaults[key], low, high), 10)]));
}

export function launch(aim, wind) {
  const controls = normalizeAim(aim), elevation = radians(controls.elevation), yaw = radians(controls.yaw);
  return {
    vx: controls.speed * Math.cos(elevation) * Math.sin(yaw),
    vy: controls.speed * Math.sin(elevation),
    vz: controls.speed * Math.cos(elevation) * Math.cos(yaw),
    wind: Number.isFinite(wind) ? wind : 0,
  };
}

/** Exact constant-acceleration trajectory. World axes: x across, y up, z downrange. */
export function positionAt(velocity, seconds) {
  const t = Math.max(0, seconds);
  return { x: velocity.vx * t + 0.5 * velocity.wind * t * t,
    y: RELEASE_HEIGHT + velocity.vy * t - 0.5 * GRAVITY * t * t,
    z: velocity.vz * t };
}

export function groundTime(velocity) {
  return (velocity.vy + Math.sqrt(velocity.vy ** 2 + 2 * GRAVITY * RELEASE_HEIGHT)) / GRAVITY;
}

export function predict(target, aim) {
  const velocity = launch(aim, target.wind);
  const arrival = target.z / velocity.vz;
  const landing = groundTime(velocity);
  const crossing = positionAt(velocity, arrival);
  const dx = crossing.x - target.x, dy = crossing.y - target.y;
  const distance = Math.hypot(dx, dy);
  return { velocity, arrival, landing, crossing, dx, dy, distance,
    shortBy: Math.max(0, target.z - velocity.vz * landing),
    hit: arrival <= landing && distance <= target.radius + STONE_RADIUS };
}

/** Verification oracle, not a player control. All generated shots admit a legal solution. */
export function solveTarget(target) {
  const time = Math.sqrt(2 * target.z / GRAVITY);
  const vx = (target.x - 0.5 * target.wind * time * time) / time;
  const vy = (target.y - RELEASE_HEIGHT + 0.5 * GRAVITY * time * time) / time;
  const vz = target.z / time;
  return normalizeAim({ yaw: degrees(Math.atan2(vx, vz)), elevation: degrees(Math.atan2(vy, Math.hypot(vx, vz))), speed: Math.hypot(vx, vy, vz) });
}

function announce(state, text) { state.message = text; state.event += 1; }
export function createGame(level = 1) {
  const config = levelConfig(level);
  return { config, phase: 'ready', previousPhase: null, targetIndex: 0, stones: config.stones,
    hits: 0, throws: 0, elapsed: 0, shot: null, lastResult: null, feedbackTime: 0,
    event: 0, message: 'Five stones. Two practice shields, then the champion’s shield. Begin when ready.' };
}
export const currentTarget = state => state.config.targets[Math.min(state.targetIndex, state.config.targets.length - 1)];
export function startGame(state) {
  if (state.phase !== 'ready') return false;
  state.phase = 'aim'; announce(state, 'Aim at the riverbank practice shield. Set direction, elevation and release speed.'); return true;
}
export function throwStone(state, aim) {
  if (state.phase !== 'aim' || state.stones <= 0) return false;
  const prediction = predict(currentTarget(state), aim);
  state.shot = { ...prediction, t: 0, position: positionAt(prediction.velocity, 0), passedTarget: false, hit: false };
  state.stones -= 1; state.throws += 1; state.phase = 'flight';
  announce(state, `Stone ${state.throws} released. ${state.stones} remaining.`); return true;
}
function resolveShot(state, hit) {
  const shot = state.shot;
  state.lastResult = { hit, dx: shot.dx, dy: shot.dy, distance: shot.distance, shortBy: shot.shortBy, targetIndex: state.targetIndex };
  if (hit) state.hits += 1;
  state.phase = 'feedback'; state.feedbackTime = 0;
  if (hit) announce(state, state.targetIndex === 2 ? 'The bronze target rings. The standoff is complete.' : 'Practice shield struck. Prepare for the next distance.');
  else if (shot.shortBy > 0) announce(state, `The stone landed ${shot.shortBy.toFixed(1)} metres short. Increase the range of your throw.`);
  else announce(state, `Missed by ${shot.distance.toFixed(2)} metres: ${Math.abs(shot.dx).toFixed(2)} ${shot.dx < 0 ? 'left' : 'right'}, ${Math.abs(shot.dy).toFixed(2)} ${shot.dy < 0 ? 'low' : 'high'}.`);
}
export function stepGame(state, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0 || !['aim', 'flight', 'feedback'].includes(state.phase)) return false;
  const dt = Math.min(seconds, 0.1);
  state.elapsed += dt;
  if (state.phase === 'flight') {
    const shot = state.shot;
    shot.t += dt;
    if (!shot.passedTarget && shot.t >= shot.arrival && shot.arrival <= shot.landing) {
      shot.passedTarget = true;
      if (shot.distance <= currentTarget(state).radius + STONE_RADIUS) {
        shot.t = shot.arrival; shot.position = shot.crossing; shot.hit = true;
        resolveShot(state, true); return true;
      }
    }
    if (shot.t >= shot.landing) {
      shot.t = shot.landing; shot.position = positionAt(shot.velocity, shot.landing); shot.position.y = STONE_RADIUS;
      resolveShot(state, false); return true;
    }
    shot.position = positionAt(shot.velocity, shot.t);
  } else if (state.phase === 'feedback') {
    state.feedbackTime += dt;
    if (state.feedbackTime >= 0.85) {
      if (state.hits === state.config.targets.length) {
        state.phase = 'won'; announce(state, `Level ${state.config.level} cleared in ${state.throws} throws. This chapter is an original adaptation of 1 Samuel 17.`);
      } else if (state.stones === 0) {
        state.phase = 'lost'; announce(state, 'Your five stones are spent. Retry with a new aim; your earlier campaign progress is safe.');
      } else {
        if (state.lastResult.hit) state.targetIndex += 1;
        state.phase = 'aim';
        announce(state, `${currentTarget(state).name}. ${state.stones} stones remain. Read the distance and crosswind before throwing.`);
      }
      return true;
    }
  }
  return false;
}
export function pauseGame(state) {
  if (!['aim', 'flight', 'feedback'].includes(state.phase)) return false;
  state.previousPhase = state.phase; state.phase = 'paused'; announce(state, 'Paused. Your current stone and aim are preserved.'); return true;
}
export function resumeGame(state) {
  if (state.phase !== 'paused') return false;
  state.phase = state.previousPhase; state.previousPhase = null; announce(state, 'Resumed.'); return true;
}
