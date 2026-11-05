import { LEVEL_COUNT, randomFor, tierFor } from '../shared/progression.js';
import {
  GOAL, BALL_RADIUS, GRAVITY, KEEPER_PARTS,
  makeFlight, ballAt, resolveFlight, keeperPose
} from '../game17/penalty-engine.js';

// This title shares only the existing ball and capsule collision model with
// Penalty Pro. Its patrol, feint timing, five-kick rules and campaign are its own.
// Distances are metres; time is seconds; crosswind is lateral acceleration m/s².
export { LEVEL_COUNT, GOAL, BALL_RADIUS, GRAVITY, KEEPER_PARTS, ballAt };
export const CAMPAIGN_ID = 'goal-line';
export const POWER_MIN = 25;
export const REFERENCE_POWER = 85;

export const ZONES = Object.freeze([
  { id: 'top-left', label: 'Top left', x: -2.8, y: 1.95 },
  { id: 'top-centre', label: 'Top centre', x: 0, y: 1.95 },
  { id: 'top-right', label: 'Top right', x: 2.8, y: 1.95 },
  { id: 'middle-left', label: 'Middle left', x: -2.8, y: 1.15 },
  { id: 'middle-centre', label: 'Middle centre', x: 0, y: 1.15 },
  { id: 'middle-right', label: 'Middle right', x: 2.8, y: 1.15 },
  { id: 'low-left', label: 'Low left', x: -2.8, y: 0.4 },
  { id: 'low-centre', label: 'Low centre', x: 0, y: 0.4 },
  { id: 'low-right', label: 'Low right', x: 2.8, y: 0.4 }
].map(Object.freeze));

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = value => Number(value.toFixed(5));
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const direction = x => x < -0.0001 ? 'left' : x > 0.0001 ? 'right' : 'centre';
const upright = x => ({ x, y: 1, z: 0, angle: 0, fraction: 0 });
const restingBall = () => ({ x: 0, y: BALL_RADIUS, z: GOAL.distance });

function getZone(id) {
  const zone = ZONES.find(item => item.id === id);
  if (!zone) throw new RangeError('Choose one of the nine named target zones.');
  return zone;
}

/** Fixed launch angles put each zone at its labelled location in calm air at
 * 85% power. Different power changes gravity drop; wind changes placement.
 * The low-angle projectile solution is analytic, not an outcome correction. */
export function shotSettings(zoneId, power = REFERENCE_POWER) {
  const zone = getZone(zoneId);
  if (typeof power !== 'number' || !Number.isFinite(power) || power < POWER_MIN || power > 100) {
    throw new RangeError('Power must be a number between 25 and 100 percent.');
  }
  const speed = 8 + REFERENCE_POWER * 0.24;
  const distance = GOAL.distance + BALL_RADIUS;
  const range = Math.hypot(distance, zone.x), height = zone.y - BALL_RADIUS;
  const discriminant = speed ** 4 - GRAVITY * (GRAVITY * range ** 2 + 2 * height * speed ** 2);
  const elevation = Math.atan((speed ** 2 - Math.sqrt(discriminant)) / (GRAVITY * range)) * 180 / Math.PI;
  return { aim: Math.atan2(zone.x, distance) * 180 / Math.PI, elevation, power };
}

export function goalLineLevel(level = 1) {
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) throw new RangeError('Level must be an integer from 1 to 10,000.');
  const tierIndex = Math.floor((level - 1) / 2000), random = randomFor(900007 + level * 8191);
  const kicks = Array.from({ length: 5 }, (_, index) => ({
    index,
    wind: round((random() * 2 - 1) * (0.4 + tierIndex * 0.6)),
    powerMax: 100 - tierIndex * 2 - Math.floor(random() * (tierIndex * 2 + 1)),
    patrolAmplitude: round(1.05 + tierIndex * 0.16 + random() * 0.25),
    patrolRate: round(0.85 + tierIndex * 0.22 + random() * 0.3),
    patrolPhase: round(random() * Math.PI * 2),
    reaction: round(0.2 - tierIndex * 0.027 + random() * 0.025),
    diveSpeed: round(4.7 + tierIndex * 0.65 + random() * 0.5),
    feintDelay: round(0.22 + tierIndex * 0.018 + random() * 0.05),
    commitWindow: round(1.1 - tierIndex * 0.125 + random() * 0.12),
    recoveryTime: 0.55
  }));
  if (level === 1) kicks.forEach((kick, index) => {
    Object.assign(kick, { wind: [0, 0.15, -0.2, 0.3, -0.3][index], powerMax: 100,
      patrolAmplitude: 1.2, patrolRate: 1.05, patrolPhase: index % 2 ? -0.45 : 0.45,
      reaction: 0.2, diveSpeed: 5, feintDelay: 0.25, commitWindow: 1.1 });
  });
  return { version: 1, level, tier: tierFor(level), tierIndex, target: tierIndex < 2 ? 3 : tierIndex < 4 ? 4 : 5, kicks };
}

export function currentKick(state) { return state.config.kicks[Math.min(4, state.kickIndex)]; }

function patrolX(kick, time) { return kick.patrolAmplitude * Math.sin(kick.patrolPhase + kick.patrolRate * time); }
function commitmentPosition(kick, plan, time) {
  const travel = Math.max(0.16, Math.abs(plan.targetX - plan.startX) / kick.diveSpeed);
  return plan.startX + (plan.targetX - plan.startX) * smooth((time - plan.commitAt) / travel);
}
function readyKeeper(state, time = state.readTime) {
  const kick = currentKick(state), plan = state.feintPlan;
  if (!plan || time < plan.commitAt) return upright(patrolX(kick, time));
  if (time <= plan.expiresAt) return upright(commitmentPosition(kick, plan, time));
  const startX = commitmentPosition(kick, plan, plan.expiresAt);
  const fraction = smooth((time - plan.expiresAt) / kick.recoveryTime);
  return upright(startX + (patrolX(kick, time) - startX) * fraction);
}

/** All information needed for the readable timing controls; no hidden result. */
export function readKeeper(state) {
  const plan = state.feintPlan, time = state.readTime;
  let stage = 'patrolling';
  if (plan && time < plan.commitAt) stage = 'baiting';
  else if (plan && time < plan.expiresAt) stage = 'committed';
  else if (plan && time < plan.expiresAt + currentKick(state).recoveryTime) stage = 'recovering';
  const delta = readyKeeper(state, time + 0.001).x - readyKeeper(state, time).x;
  return { stage, x: state.keeper.x,
    direction: stage === 'committed' ? direction(plan.targetX) : direction(delta),
    committed: stage === 'committed',
    remaining: stage === 'committed' ? Math.max(0, plan.expiresAt - time) : 0,
    opensIn: stage === 'baiting' ? Math.max(0, plan.commitAt - time) : 0,
    feintUsed: state.feintUsed };
}

export function createShootout(level = 1) {
  const config = goalLineLevel(level);
  const state = { config, phase: 'ready', resumePhase: null, kickIndex: 0, goals: 0,
    zoneId: null, power: Math.min(REFERENCE_POWER, config.kicks[0].powerMax),
    readTime: 0, feintUsed: false, feintPlan: null, keeper: upright(0),
    ball: restingBall(), elapsed: 0, flight: null, result: null, log: [], event: 0 };
  state.keeper = readyKeeper(state);
  return state;
}

export function setAim(state, zoneId) {
  if (state.phase !== 'ready') return false;
  getZone(zoneId);
  if (state.zoneId !== zoneId) { state.zoneId = zoneId; state.event++; }
  return true;
}
export function setPower(state, power) {
  if (state.phase !== 'ready') return false;
  if (typeof power !== 'number' || !Number.isFinite(power) || power < POWER_MIN || power > currentKick(state).powerMax) {
    throw new RangeError(`This kick needs power between ${POWER_MIN} and ${currentKick(state).powerMax} percent.`);
  }
  if (state.power !== power) { state.power = power; state.event++; }
  return true;
}

export function feint(state) {
  if (state.phase !== 'ready' || state.feintUsed || !state.zoneId) return false;
  const kick = currentKick(state), zone = getZone(state.zoneId);
  const commitAt = state.readTime + kick.feintDelay;
  state.feintPlan = { commitAt, expiresAt: commitAt + kick.commitWindow,
    targetX: zone.x, high: zone.y >= 1, startX: patrolX(kick, commitAt), zoneId: zone.id };
  state.feintUsed = true; state.event++;
  return true;
}

export function shoot(state) {
  if (state.phase !== 'ready' || !state.zoneId) return false;
  const kick = currentKick(state), zone = getZone(state.zoneId), tell = readKeeper(state);
  const targetX = tell.committed ? state.feintPlan.targetX : zone.x;
  const high = tell.committed ? state.feintPlan.high : zone.y >= 1;
  const physicsKick = { wind: kick.wind, powerMax: kick.powerMax,
    keeper: { startX: state.keeper.x, targetX, high, side: Math.sign(targetX),
      reaction: tell.committed ? 0 : kick.reaction,
      duration: Math.max(0.16, Math.abs(targetX - state.keeper.x) / kick.diveSpeed) } };
  const flight = makeFlight(physicsKick, shotSettings(state.zoneId, state.power));
  const outcome = resolveFlight(flight);
  state.flight = { ...flight, zoneId: state.zoneId, readTime: state.readTime, usedCommitment: tell.committed };
  state.result = outcome; state.elapsed = 0; state.ball = ballAt(flight, 0);
  state.keeper = keeperPose(physicsKick, 0); state.phase = 'flight'; state.event++;
  return true;
}

export function stepShootout(state, seconds) {
  if (!['ready', 'flight'].includes(state.phase) || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return false;
  if (state.phase === 'ready') {
    const nextTime = state.readTime + seconds;
    if (!Number.isFinite(nextTime)) return false;
    const oldStage = readKeeper(state).stage;
    state.readTime = nextTime; state.keeper = readyKeeper(state);
    if (readKeeper(state).stage !== oldStage) state.event++;
    return true;
  }
  state.elapsed = Math.min(state.result.time, state.elapsed + seconds);
  state.ball = ballAt(state.flight, state.elapsed);
  state.keeper = keeperPose(state.flight.kick, state.elapsed);
  if (state.elapsed >= state.result.time) {
    const result = { ...state.result, kick: state.kickIndex + 1, zoneId: state.flight.zoneId,
      power: state.flight.settings.power, readTime: state.flight.readTime,
      usedCommitment: state.flight.usedCommitment, wind: state.flight.wind };
    state.log.push(result);
    if (result.outcome === 'goal') state.goals++;
    state.kickIndex++;
    state.phase = state.kickIndex === 5 ? state.goals >= state.config.target ? 'won' : 'lost' : 'result';
    state.event++;
  }
  return true;
}

/** Equivalent visible command for players who do not want real-time aiming. */
export function advanceRead(state, seconds = 0.1) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || seconds > 0.25) {
    throw new RangeError('Advance the keeper by more than zero and at most 0.25 seconds.');
  }
  return state.phase === 'ready' && stepShootout(state, seconds);
}

export function nextKick(state) {
  if (state.phase !== 'result') return false;
  state.phase = 'ready'; state.resumePhase = null; state.zoneId = null;
  state.power = Math.min(state.power, currentKick(state).powerMax);
  state.readTime = 0; state.feintUsed = false; state.feintPlan = null;
  state.ball = restingBall(); state.elapsed = 0; state.flight = null; state.result = null;
  state.keeper = readyKeeper(state); state.event++;
  return true;
}

export function pauseShootout(state) {
  if (!['ready', 'flight'].includes(state.phase)) return false;
  state.resumePhase = state.phase; state.phase = 'paused'; state.event++;
  return true;
}
export function resumeShootout(state) {
  if (state.phase !== 'paused' || !['ready', 'flight'].includes(state.resumePhase)) return false;
  state.phase = state.resumePhase; state.resumePhase = null; state.event++;
  return true;
}
