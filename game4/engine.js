import { levelConfig } from './campaign.js';

const EPSILON = 1e-9;
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Earliest point/expanded-box contact along a segment, including its normal. */
export function sweepBox(from, to, minX, maxX, minZ, maxZ) {
  let enter = -Infinity, leave = Infinity, normal = { x: 0, z: 0 };
  for (const [axis, minimum, maximum] of [['x', minX, maxX], ['z', minZ, maxZ]]) {
    const delta = to[axis] - from[axis];
    if (Math.abs(delta) < EPSILON) { if (from[axis] < minimum || from[axis] > maximum) return null; continue; }
    const first = (minimum - from[axis]) / delta, second = (maximum - from[axis]) / delta;
    const entry = Math.min(first, second), exit = Math.max(first, second);
    if (entry > enter) { enter = entry; normal = { x: 0, z: 0 }; normal[axis] = delta > 0 ? -1 : 1; }
    leave = Math.min(leave, exit);
    if (enter > leave) return null;
  }
  if (leave < 0 || enter > 1 || !Number.isFinite(enter)) return null;
  return { time: Math.max(0, enter), normal };
}
/** Exact relative swept-circle contact: both the rover and spark may move. */
export function sweepCircle(from, to, otherFrom, otherTo, radius) {
  const x = from.x - otherFrom.x, z = from.z - otherFrom.z;
  const dx = (to.x - from.x) - (otherTo.x - otherFrom.x), dz = (to.z - from.z) - (otherTo.z - otherFrom.z);
  const c = x * x + z * z - radius * radius;
  if (c <= EPSILON) return 0;
  const a = dx * dx + dz * dz;
  if (a < EPSILON) return null;
  const b = 2 * (x * dx + z * dz), discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const time = (-b - Math.sqrt(discriminant)) / (2 * a);
  return time >= -EPSILON && time <= 1 + EPSILON ? Math.max(0, Math.min(1, time)) : null;
}
export function hazardPosition(hazard, time) {
  const length = distance(hazard.a, hazard.b);
  if (length < EPSILON || hazard.speed <= 0) return { ...hazard.a };
  const phase = ((hazard.offset + time * hazard.speed) % (length * 2) + length * 2) % (length * 2);
  return lerp(hazard.a, hazard.b, (phase <= length ? phase : length * 2 - phase) / length);
}
function nextTurn(hazard, time) {
  const length = distance(hazard.a, hazard.b);
  if (length < EPSILON || hazard.speed <= 0) return Infinity;
  const phase = ((hazard.offset + time * hazard.speed) % length + length) % length;
  const remaining = length - phase;
  return remaining < 1e-8 ? length / hazard.speed : remaining / hazard.speed;
}
function collision(config, from, to) {
  const r = config.playerRadius, padding = .5 + r;
  const minX = Math.max(0, Math.floor(Math.min(from.x, to.x) - padding));
  const maxX = Math.min(config.size - 1, Math.ceil(Math.max(from.x, to.x) + padding));
  const minZ = Math.max(0, Math.floor(Math.min(from.z, to.z) - padding));
  const maxZ = Math.min(config.size - 1, Math.ceil(Math.max(from.z, to.z) + padding));
  let first = null;
  for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) if (config.blocked[z][x]) {
    const hit = sweepBox(from, to, x - padding, x + padding, z - padding, z + padding);
    if (hit && (!first || hit.time < first.time)) first = hit;
  }
  return first;
}
/** Piecewise continuous path with conservative wall corners and tangential slide. */
export function moveAlongWalls(config, from, delta) {
  const segments = []; let position = { ...from }, displacement = { ...delta }, elapsed = 0, fraction = 1, blocked = false;
  for (let contact = 0; contact < 3 && fraction > EPSILON; contact++) {
    if (Math.hypot(displacement.x, displacement.z) < EPSILON) { segments.push({ from: { ...position }, to: { ...position }, start: elapsed, end: 1 }); return { position, segments, blocked }; }
    const target = { x: position.x + displacement.x, z: position.z + displacement.z }, hit = collision(config, position, target);
    if (!hit) { segments.push({ from: { ...position }, to: target, start: elapsed, end: 1 }); return { position: target, segments, blocked }; }
    blocked = true;
    const safeFraction = Math.max(0, hit.time - 1e-7), stop = lerp(position, target, safeFraction), end = elapsed + fraction * hit.time;
    segments.push({ from: { ...position }, to: stop, start: elapsed, end }); position = stop;
    const left = 1 - hit.time; displacement.x *= left; displacement.z *= left;
    if (hit.normal.x) displacement.x = 0; if (hit.normal.z) displacement.z = 0;
    elapsed = end; fraction *= left;
  }
  if (elapsed < 1) segments.push({ from: { ...position }, to: { ...position }, start: elapsed, end: 1 });
  return { position, segments, blocked };
}
export function createGame(level = 1) {
  const config = levelConfig(level);
  return { config, phase: 'ready', player: { ...config.start }, facing: 0, time: 0, shields: config.shields, collected: config.cores.map(() => false),
    invulnerableUntil: -1, blocked: false, fault: null, events: [], message: 'Recover every core, then reach the exit. Start the mission when ready.' };
}
function event(state, text) { state.message = text; state.events.push({ time: state.time, text }); if (state.events.length > 8) state.events.shift(); }
export function startGame(state) {
  if (state.phase !== 'ready') return false;
  state.phase = 'running'; event(state, 'Mission started. Recover all cores and reach the exit before time runs out.'); return true;
}
function finish(state, phase, reason, text) { state.phase = phase; state.fault = reason; event(state, text); }
export function stepGame(state, input = {}, delta = 0) {
  if (state.phase !== 'running' || !Number.isFinite(delta) || delta <= 0) return false;
  let x = Number(input.x), z = Number(input.z);
  x = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0; z = Number.isFinite(z) ? Math.max(-1, Math.min(1, z)) : 0;
  const magnitude = Math.hypot(x, z); if (magnitude > 1) { x /= magnitude; z /= magnitude; }
  if (magnitude > EPSILON) state.facing = Math.atan2(x, z);
  let remaining = Math.min(1, delta); state.blocked = false;
  while (remaining > EPSILON && state.phase === 'running') {
    const timeLeft = state.config.timeLimit - state.time;
    if (timeLeft <= EPSILON) { finish(state, 'lost', 'timeout', 'Mission time expired. Every core and the exit must be reached before the deadline.'); break; }
    let dt = Math.min(.05, remaining, timeLeft);
    for (const hazard of state.config.hazards) dt = Math.min(dt, nextTurn(hazard, state.time));
    if (state.invulnerableUntil > state.time + EPSILON) dt = Math.min(dt, state.invulnerableUntil - state.time);
    if (dt < EPSILON) dt = Math.min(.000001, remaining, timeLeft);
    const startTime = state.time, trajectory = moveAlongWalls(state.config, state.player, { x: x * state.config.speed * dt, z: z * state.config.speed * dt });
    state.blocked ||= trajectory.blocked;
    const events = [];
    for (const segment of trajectory.segments) {
      const duration = segment.end - segment.start;
      for (const core of state.config.cores) if (!state.collected[core.id]) {
        const contact = sweepCircle(segment.from, segment.to, core, core, state.config.playerRadius + .18);
        if (contact !== null) events.push({ kind: 'core', at: segment.start + duration * contact, core, point: lerp(segment.from, segment.to, contact) });
      }
      for (const hazard of state.config.hazards) {
        const a = hazardPosition(hazard, startTime + dt * segment.start), b = hazardPosition(hazard, startTime + dt * segment.end);
        const contact = sweepCircle(segment.from, segment.to, a, b, state.config.playerRadius + hazard.radius);
        if (contact !== null) events.push({ kind: 'hazard', at: segment.start + duration * contact, hazard, point: lerp(segment.from, segment.to, contact) });
      }
      const exit = sweepCircle(segment.from, segment.to, state.config.exit, state.config.exit, state.config.playerRadius + .2);
      if (exit !== null) events.push({ kind: 'exit', at: segment.start + duration * exit, point: lerp(segment.from, segment.to, exit) });
    }
    events.sort((a, b) => a.at - b.at || ({ hazard: 0, core: 1, exit: 2 }[a.kind] - { hazard: 0, core: 1, exit: 2 }[b.kind]));
    for (const item of events) {
      const eventTime = startTime + dt * item.at;
      if (item.kind === 'core' && !state.collected[item.core.id]) {
        state.collected[item.core.id] = true; state.time = eventTime;
        event(state, `${item.core.name} secured. ${state.collected.filter(Boolean).length} / ${state.config.cores.length} cores recovered.`);
      } else if (item.kind === 'hazard' && eventTime >= state.invulnerableUntil - EPSILON) {
        state.shields--; state.invulnerableUntil = eventTime + state.config.hitCooldown; state.time = eventTime;
        if (state.shields <= 0) { state.player = item.point; finish(state, 'lost', 'shields', 'Shields depleted by a spark collision. Retry the sector and choose a clear route.'); break; }
        event(state, `Spark collision. ${state.shields} shield${state.shields === 1 ? '' : 's'} remaining.`);
      } else if (item.kind === 'exit' && state.collected.every(Boolean)) {
        state.time = eventTime; state.player = item.point; finish(state, 'won', null, 'Sector clear. Every core recovered and the exit reached.'); break;
      }
    }
    if (state.phase !== 'running') break;
    state.player = trajectory.position; state.time = startTime + dt; remaining -= dt;
    if (state.time >= state.config.timeLimit - EPSILON) finish(state, 'lost', 'timeout', 'Mission time expired. Every core and the exit must be reached before the deadline.');
  }
  return true;
}
export function pauseGame(state) { if (state.phase !== 'running') return false; state.phase = 'paused'; event(state, 'Mission paused. Resume when ready.'); return true; }
export function resumeGame(state) { if (state.phase !== 'paused') return false; state.phase = 'running'; event(state, 'Mission resumed.'); return true; }
export function commandMove(state, direction) {
  const directions = { north: { x: 0, z: -1 }, east: { x: 1, z: 0 }, south: { x: 0, z: 1 }, west: { x: -1, z: 0 } };
  if (state.phase !== 'running' || !Object.hasOwn(directions, direction)) return false;
  stepGame(state, directions[direction], 1 / state.config.speed); return true;
}
export function commandWait(state) { return stepGame(state, { x: 0, z: 0 }, .5); }
export function nearby(state) {
  const x = Math.round(state.player.x), z = Math.round(state.player.z);
  return [['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]].map(([name, dx, dz]) => ({ name, blocked: !state.config.blocked[z + dz] || state.config.blocked[z + dz][x + dx] !== false }));
}
