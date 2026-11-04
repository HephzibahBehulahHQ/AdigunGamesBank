import { randomFor, tierFor, validLevel } from '../shared/progression.js';

// Metres and seconds. Clear goal opening: 7.32 × 2.44 m, penalty distance: 11 m.
export const GOAL = Object.freeze({ width: 7.32, height: 2.44, distance: 11, postRadius: 0.06 });
export const BALL_RADIUS = 0.11;
export const GRAVITY = 9.81;
export const CAMPAIGN_ID = 'penalty-pro';
export const SETTINGS = Object.freeze({ aim: [-24, 24], elevation: [0, 28], power: [25, 100] });
const radians = value => value * Math.PI / 180;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, digits = 4) => Number(value.toFixed(digits));

export function challengeFor(value = 1) {
  const level = validLevel(value), tierIndex = Math.floor((level - 1) / 2000);
  const random = randomFor(1700003 + level * 7919);
  const kicks = Array.from({ length: 5 }, (_, index) => {
    const side = random() < 0.5 ? -1 : 1;
    return {
      wind: round((random() - 0.5) * (0.8 + tierIndex * 3.5)),
      powerMax: 100 - tierIndex * 6 - Math.floor(random() * (tierIndex * 3 + 1)),
      keeper: {
        side, startX: round((random() - 0.5) * (0.35 + tierIndex * 0.12)),
        targetX: round(side * (1.8 + random() * 0.9)),
        high: random() < 0.5,
        reaction: round(0.16 - tierIndex * 0.018 + random() * 0.035),
        duration: round(0.24 - tierIndex * 0.021 + random() * 0.04)
      }, index
    };
  });
  // The opening five penalties teach both sides with very little wind.
  if (level === 1) kicks.forEach((kick, index) => {
    kick.wind = [0, 0.15, -0.2, 0.3, -0.3][index];
    Object.assign(kick.keeper, { side: index % 2 ? 1 : -1, startX: 0, targetX: index % 2 ? 2.4 : -2.4, high: index % 2 === 0, reaction: 0.15, duration: 0.24 });
  });
  return { version: 1, level, tier: tierFor(level), tierIndex, target: tierIndex < 2 ? 3 : tierIndex < 4 ? 4 : 5, kicks };
}

export function normalizeSettings(settings = {}) {
  const output = {};
  for (const [key, [low, high]] of Object.entries(SETTINGS)) {
    const value = Number(settings[key] ?? { aim: 0, elevation: 9, power: 75 }[key]);
    if (!Number.isFinite(value) || value < low || value > high) throw new RangeError(`${key} must be between ${low} and ${high}.`);
    output[key] = value;
  }
  return output;
}

export function keeperPose(kick, seconds = 0) {
  const k = kick.keeper;
  const fraction = clamp((seconds - k.reaction) / k.duration, 0, 1);
  const eased = fraction * fraction * (3 - 2 * fraction);
  return { x: k.startX + (k.targetX - k.startX) * eased,
    y: 1 + (k.high ? 0.3 : -0.44) * eased, z: 0.16,
    angle: -k.side * eased * (k.high ? 0.78 : 1.16), fraction: eased };
}

// Shared capsule segments make the visible goalkeeper agree with collisions.
export const KEEPER_PARTS = Object.freeze([
  { name: 'torso', a: [0, -0.25], b: [0, 0.28], radius: 0.22 },
  { name: 'left arm', a: [-0.2, 0.18], b: [-0.82, 0.2], radius: 0.105 },
  { name: 'right arm', a: [0.2, 0.18], b: [0.82, 0.2], radius: 0.105 },
  { name: 'left leg', a: [-0.12, -0.26], b: [-0.3, -0.88], radius: 0.12 },
  { name: 'right leg', a: [0.12, -0.26], b: [0.3, -0.88], radius: 0.12 },
  { name: 'head', a: [0, 0.58], b: [0, 0.58], radius: 0.19 }
]);

export function makeFlight(kick, input) {
  const settings = normalizeSettings(input), speed = 8 + settings.power * 0.24;
  if (settings.power > (kick.powerMax ?? 100)) throw new RangeError(`This kick allows at most ${kick.powerMax}% power.`);
  const elevation = radians(settings.elevation), aim = radians(settings.aim);
  const vx = speed * Math.cos(elevation) * Math.sin(aim);
  const vz = speed * Math.cos(elevation) * Math.cos(aim);
  const vy = speed * Math.sin(elevation), landAt = 2 * vy / GRAVITY;
  const retention = landAt > 0 ? 0.8 : 1;
  const landVx = (vx + kick.wind * landAt) * retention, landVz = vz * retention;
  const rollSpeed = Math.hypot(landVx, landVz), friction = 1.7;
  return { settings, kick, speed, vx, vy, vz, wind: kick.wind, landAt,
    landX: vx * landAt + 0.5 * kick.wind * landAt ** 2,
    landZ: GOAL.distance - vz * landAt, landVx, landVz,
    rollAx: -friction * landVx / rollSpeed, rollAz: -friction * landVz / rollSpeed,
    stopAt: landAt + rollSpeed / friction };
}

export function ballAt(flight, seconds) {
  const t = Math.max(0, seconds);
  if (t <= flight.landAt) return { x: flight.vx * t + 0.5 * flight.wind * t * t,
    y: Math.max(BALL_RADIUS, BALL_RADIUS + flight.vy * t - GRAVITY * t * t / 2), z: GOAL.distance - flight.vz * t };
  const roll = Math.min(t, flight.stopAt) - flight.landAt;
  return { x: flight.landX + flight.landVx * roll + 0.5 * flight.rollAx * roll * roll,
    y: BALL_RADIUS, z: flight.landZ - flight.landVz * roll - 0.5 * flight.rollAz * roll * roll };
}

export function planeTime(flight, z) {
  const airborne = (GOAL.distance - z) / flight.vz;
  if (airborne <= flight.landAt) return airborne;
  const distance = flight.landZ - z, acceleration = -flight.rollAz;
  const discriminant = flight.landVz ** 2 - 2 * acceleration * distance;
  if (discriminant < 0) return Infinity;
  return flight.landAt + 2 * distance / (flight.landVz + Math.sqrt(discriminant));
}

function distanceToSegment(point, start, end) {
  const delta = end.map((value, i) => value - start[i]);
  const length2 = delta.reduce((sum, value) => sum + value * value, 0);
  const t = length2 ? clamp(delta.reduce((sum, value, i) => sum + value * (point[i] - start[i]), 0) / length2, 0, 1) : 0;
  return Math.hypot(...point.map((value, i) => value - start[i] - delta[i] * t));
}

function keeperDistance(flight, time) {
  const ball = ballAt(flight, time), pose = keeperPose(flight.kick, time);
  const c = Math.cos(pose.angle), s = Math.sin(pose.angle);
  const transform = ([x, y]) => [pose.x + x * c - y * s, pose.y + x * s + y * c, pose.z];
  let result = { distance: Infinity, part: '' };
  for (const part of KEEPER_PARTS) {
    const distance = distanceToSegment([ball.x, ball.y, ball.z], transform(part.a), transform(part.b)) - part.radius - BALL_RADIUS;
    if (distance < result.distance) result = { distance, part: part.name };
  }
  return result;
}

// Sweep a bounded contact window, then bisect its first entry. The collision
// result is independent of the rendered frame rate, including a one-frame shot.
function firstContact(distance, start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const samples = 36;
  let previous = start;
  if (distance(previous) <= 0) return previous;
  for (let i = 1; i <= samples; i++) {
    const current = start + (end - start) * i / samples;
    if (distance(current) <= 0) {
      let low = previous, high = current;
      for (let j = 0; j < 18; j++) { const mid = (low + high) / 2; if (distance(mid) <= 0) high = mid; else low = mid; }
      return high;
    }
    previous = current;
  }
  return null;
}

export function resolveFlight(flight) {
  const h = GOAL.width / 2, frame = [
    { name: 'left post', a: [-h, 0, 0], b: [-h, GOAL.height, 0] },
    { name: 'right post', a: [h, 0, 0], b: [h, GOAL.height, 0] },
    { name: 'crossbar', a: [-h, GOAL.height, 0], b: [h, GOAL.height, 0] }
  ];
  const events = [];
  const keeperTime = firstContact(time => keeperDistance(flight, time).distance, planeTime(flight, 0.51), planeTime(flight, -0.19));
  if (keeperTime !== null) events.push({ time: keeperTime, outcome: 'saved', detail: keeperDistance(flight, keeperTime).part });
  const start = planeTime(flight, 0.18), end = planeTime(flight, -0.18);
  for (const part of frame) {
    const contact = firstContact(time => { const p = ballAt(flight, time); return distanceToSegment([p.x, p.y, p.z], part.a, part.b) - BALL_RADIUS - GOAL.postRadius; }, start, end);
    if (contact !== null) events.push({ time: contact, outcome: 'post', detail: part.name });
  }
  const crossing = planeTime(flight, -BALL_RADIUS);
  if (Number.isFinite(crossing)) {
    const p = ballAt(flight, crossing);
    const inside = Math.abs(p.x) + BALL_RADIUS < h && p.y + BALL_RADIUS < GOAL.height;
    events.push({ time: crossing, outcome: inside ? 'goal' : 'miss', detail: inside ? 'whole ball over the line' : p.y + BALL_RADIUS >= GOAL.height ? 'over the bar' : 'wide of the goal' });
  } else events.push({ time: Math.min(flight.stopAt, 5), outcome: 'miss', detail: 'short of the line' });
  events.sort((a, b) => a.time - b.time || ['saved', 'post', 'goal', 'miss'].indexOf(a.outcome) - ['saved', 'post', 'goal', 'miss'].indexOf(b.outcome));
  return { ...events[0], position: ballAt(flight, events[0].time) };
}

export function createShootout(level = 1) {
  const config = challengeFor(level);
  return { config, phase: 'ready', kickIndex: 0, goals: 0, elapsed: 0, flight: null,
    result: null, log: [], ball: { x: 0, y: BALL_RADIUS, z: GOAL.distance }, event: 0 };
}
export function currentKick(state) { return state.config.kicks[Math.min(state.kickIndex, state.config.kicks.length - 1)]; }

export function shoot(state, input) {
  if (state.phase !== 'ready') return false;
  const flight = makeFlight(currentKick(state), input);
  state.flight = flight; state.result = resolveFlight(flight); state.elapsed = 0;
  state.ball = ballAt(flight, 0); state.phase = 'flight'; state.event++; return true;
}
export function stepShootout(state, seconds) {
  if (state.phase !== 'flight' || !Number.isFinite(seconds) || seconds <= 0) return false;
  state.elapsed = Math.min(state.result.time, state.elapsed + seconds);
  state.ball = ballAt(state.flight, state.elapsed);
  if (state.elapsed >= state.result.time) {
    const result = { kick: state.kickIndex + 1, ...state.result, settings: { ...state.flight.settings } };
    state.log.push(result);
    if (result.outcome === 'goal') state.goals++;
    state.kickIndex++;
    state.phase = state.kickIndex === state.config.kicks.length ? (state.goals >= state.config.target ? 'won' : 'lost') : 'result';
    state.event++;
  }
  return true;
}
export function nextKick(state) {
  if (state.phase !== 'result') return false;
  state.phase = 'ready'; state.flight = null; state.result = null; state.elapsed = 0;
  state.ball = { x: 0, y: BALL_RADIUS, z: GOAL.distance }; state.event++; return true;
}
export function pauseShootout(state) {
  if (state.phase !== 'flight') return false;
  state.phase = 'paused'; state.event++; return true;
}
export function resumeShootout(state) {
  if (state.phase !== 'paused') return false;
  state.phase = 'flight'; state.event++; return true;
}
