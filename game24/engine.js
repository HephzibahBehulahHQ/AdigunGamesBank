import { levelConfig, solutionFor, MODEL_NOTICE } from './campaign.js';
export { levelConfig, solutionFor, MODEL_NOTICE };

/** Stable scene API: createGame(level), startGame(state), loadCargo(state,cargoIndex,slotIndex),
 * unloadCargo(state,cargoIndex), setBallast(state,slotIndex,tonnes), launch(state),
 * stepGame(state,seconds), pauseGame(state), resumeGame(state), retryGame(state).
 * Controls mutate state and return true/false. stepGame mutates and returns state.
 * phase: ready | loading | sailing | paused | won | lost. Six cargo IDs and slots 0..5.
 * Measurements are tonnes (mass), metres, seconds and degrees; moments are kN m.
 * placement[cargoIndex] = slotIndex or -1; ballast[slotIndex] is integer tonnes.
 */
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const FIXED_STEP = 1 / 120;
const MAX_FRAME = 0.25;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const validIndex = value => Number.isInteger(value) && value >= 0 && value < 6;
function announce(state, text) { state.message = text; state.event++; }
function allowed(state) { return state.phase === 'loading'; }

/** Box-barge hydrostatics. Positive x=fore; positive y=starboard; z above keel. */
export function hydrostatics(config, placement, ballast, heel = 0, trim = 0, wave = 0) {
  const hull = config.hull;
  let mass = hull.lightshipMass, verticalMoment = mass * hull.lightshipKG, momentX = 0, momentY = 0;
  let cargoMass = 0, ballastMass = 0, loaded = 0;
  const slotMass = Array(6).fill(0);
  for (let index = 0; index < 6; index++) {
    const slotIndex = placement[index];
    if (validIndex(slotIndex)) {
      const cargo = config.cargo[index], slot = config.slots[slotIndex];
      mass += cargo.mass; cargoMass += cargo.mass; loaded++;
      verticalMoment += cargo.mass * (slot.z + cargo.height / 2);
      momentX += cargo.mass * slot.x; momentY += cargo.mass * slot.y;
      slotMass[slotIndex] += cargo.mass;
    }
    const amount = Number.isFinite(ballast[index]) ? ballast[index] : 0;
    mass += amount; ballastMass += amount;
    verticalMoment += amount * config.ballast.kg;
    momentX += amount * config.slots[index].x; momentY += amount * config.slots[index].y;
  }
  const displacement = mass / hull.waterDensity;
  const draft = displacement / (hull.length * hull.beam);
  const kg = verticalMoment / mass;
  const kb = draft / 2;
  const bm = hull.beam ** 2 / (12 * draft);
  const bmLongitudinal = hull.length ** 2 / (12 * draft);
  const gm = kb + bm - kg;
  const gmLongitudinal = kb + bmLongitudinal - kg;
  const heelMoment = momentY * hull.gravity + config.environment.windMoment;
  const trimMoment = momentX * hull.gravity + config.environment.trimMoment;
  const equilibriumHeel = Math.atan2(heelMoment, Math.max(0.01, mass * hull.gravity * gm)) * DEG;
  const equilibriumTrim = Math.atan2(trimMoment, Math.max(0.01, mass * hull.gravity * gmLongitudinal)) * DEG;
  const freeboard = hull.depth - draft;
  const edgeFreeboard = freeboard - Math.abs(Math.sin(heel * RAD)) * hull.beam / 2 - Math.abs(Math.sin(trim * RAD)) * hull.length / 2 - Math.max(0, wave);
  return { mass, totalMass: mass, cargoMass, ballastMass, loaded, displacement, buoyancy: mass * hull.gravity,
    draft, freeboard, edgeFreeboard, kg, kb, bm, gm, gmLongitudinal, momentX, momentY, heelMoment, trimMoment,
    equilibriumHeel, equilibriumTrim, heel, trim, wave, slotMass };
}
function updateMeasurements(state) {
  const c = state.config;
  const wave = (state.phase === 'sailing' || state.phase === 'won' || state.phase === 'lost' || (state.phase === 'paused' && state.previousPhase === 'sailing')) ? c.environment.waveHeight * Math.sin(state.time * 2 * Math.PI / c.environment.wavePeriod + c.environment.phase) : 0;
  state.metrics = hydrostatics(c, state.placement, state.ballast, state.heel, state.trim, wave);
  state.metrics.heelRate = state.heelRate;
  state.metrics.trimRate = state.trimRate;
  state.metrics.progress = clamp(state.time / c.limits.launchDuration, 0, 1);
  return state.metrics;
}
export function createGame(level = 1) {
  const config = typeof level === 'object' ? level : levelConfig(level);
  const state = { config, level: config.level, phase: 'ready', previousPhase: null,
    placement: Array(6).fill(-1), ballast: Array(6).fill(0), selectedCargo: 0,
    time: 0, elapsed: 0, accumulator: 0, heel: 0, trim: 0, heelRate: 0, trimRate: 0,
    breachTime: 0, damage: 0, attempts: 0, moves: 0, event: 0,
    message: 'Commission the ark: load six stores, balance the deck, then launch.',
    result: null, metrics: null };
  updateMeasurements(state);
  return state;
}
export function startGame(state) {
  if (state.phase !== 'ready') return false;
  state.phase = 'loading'; announce(state, state.config.lesson); return true;
}
export function loadCargo(state, cargoIndex, slotIndex) {
  if (!allowed(state) || !validIndex(cargoIndex) || !validIndex(slotIndex)) return false;
  if (state.placement[cargoIndex] === slotIndex) return false;
  const occupant = state.placement.indexOf(slotIndex);
  const oldSlot = state.placement[cargoIndex];
  // An occupied destination swaps the two stores, making every permutation reachable.
  if (occupant !== -1) state.placement[occupant] = oldSlot;
  state.placement[cargoIndex] = slotIndex; state.moves++;
  updateMeasurements(state);
  announce(state, `${state.config.cargo[cargoIndex].name} moved to ${state.config.slots[slotIndex].name}.`);
  return true;
}
export const moveCargo = loadCargo;
export function unloadCargo(state, cargoIndex) {
  if (!allowed(state) || !validIndex(cargoIndex) || state.placement[cargoIndex] === -1) return false;
  state.placement[cargoIndex] = -1; state.moves++; updateMeasurements(state);
  announce(state, `${state.config.cargo[cargoIndex].name} returned to the quay.`); return true;
}
export function setBallast(state, slotIndex, tonnes) {
  if (!allowed(state) || !validIndex(slotIndex) || !Number.isFinite(tonnes) || !Number.isInteger(tonnes) || tonnes < 0 || tonnes > state.config.ballast.capacity || tonnes === state.ballast[slotIndex]) return false;
  if (state.ballast.reduce((sum, mass, index) => sum + (index === slotIndex ? tonnes : mass), 0) > state.config.ballast.budget) return false;
  state.ballast[slotIndex] = tonnes; state.moves++; updateMeasurements(state);
  announce(state, `${state.config.slots[slotIndex].name} ballast: ${tonnes} tonnes.`); return true;
}
export function adjustBallast(state, slotIndex, change) {
  if (!validIndex(slotIndex) || !Number.isFinite(change)) return false;
  return setBallast(state, slotIndex, state.ballast[slotIndex] + change);
}
export function inspectLoading(state) {
  const m = updateMeasurements(state), c = state.config, reasons = [];
  if (m.loaded !== 6) reasons.push('Load all six stores before departure.');
  for (let i = 0; i < 6; i++) {
    const slotIndex = state.placement[i];
    if (slotIndex < 0) continue;
    const cargo = c.cargo[i], slot = c.slots[slotIndex];
    if (cargo.destination !== slot.accepts) reasons.push(`${cargo.name} requires ${cargo.stationLabel.toLowerCase()}.`);
    if (cargo.mass > slot.capacity) reasons.push(`${slot.name} exceeds its cargo capacity.`);
  }
  if (m.gm < c.limits.minGM) reasons.push('The transverse stability reserve is too small. Add low ballast or revise the load.');
  if (m.draft > c.limits.maxDraft) reasons.push('Draft exceeds the launch-channel depth allowance.');
  return { ok: reasons.length === 0, reasons, metrics: m };
}
export function launch(state) {
  if (!allowed(state)) return false;
  const loading = inspectLoading(state);
  if (!loading.ok) { announce(state, loading.reasons[0]); return false; }
  state.phase = 'sailing'; state.attempts++; state.time = 0; state.elapsed = 0;
  state.accumulator = 0; state.breachTime = 0; state.damage = 0;
  state.heel = 0; state.trim = 0; state.heelRate = 0; state.trimRate = 0; state.result = null;
  announce(state, 'Launch trial underway. Watch heel, trim and the lowest freeboard.');
  updateMeasurements(state); return true;
}
function finish(state, success, reason) {
  state.phase = success ? 'won' : 'lost';
  state.result = { success, reason, time: state.time, moves: state.moves, attempts: state.attempts };
  announce(state, reason); updateMeasurements(state);
}
/** Damped roll and pitch under restoring gravity, steady moments and periodic wave torque.
 * Semi-implicit Euler at 120 Hz; caller frame gaps are capped at 0.25 s.
 * Sealed tanks omit free-surface slosh; the rigid hull omits leaks, structural flex,
 * animals' movement, propulsion, full CFD and historical reconstruction.
 */
export function stepGame(state, seconds) {
  if (state.phase !== 'sailing' || !Number.isFinite(seconds) || seconds <= 0) return state;
  state.accumulator += Math.min(seconds, MAX_FRAME);
  while (state.accumulator + 1e-12 >= FIXED_STEP && state.phase === 'sailing') {
    state.accumulator -= FIXED_STEP; state.time += FIXED_STEP; state.elapsed = state.time;
    const c = state.config, h = c.hull, m = state.metrics;
    const rollRadius2 = (h.beam ** 2 + h.depth ** 2) / 12;
    const pitchRadius2 = (h.length ** 2 + h.depth ** 2) / 12;
    const rollOmega2 = h.gravity * Math.max(0.01, m.gm) / rollRadius2;
    const pitchOmega2 = h.gravity * Math.max(0.01, m.gmLongitudinal) / pitchRadius2;
    const frequency = state.time * 2 * Math.PI / c.environment.wavePeriod + c.environment.phase;
    const waveRoll = c.environment.rollExcitation * c.environment.waveHeight * Math.sin(frequency);
    const wavePitch = c.environment.pitchExcitation * c.environment.waveHeight * Math.cos(frequency * 0.83);
    const rollAngle = state.heel * RAD, pitchAngle = state.trim * RAD;
    const rollVelocity = state.heelRate * RAD, pitchVelocity = state.trimRate * RAD;
    const rollAcceleration = (m.heelMoment / (m.mass * rollRadius2)) * Math.cos(rollAngle) - rollOmega2 * Math.sin(rollAngle) - 1.30 * Math.sqrt(rollOmega2) * rollVelocity + waveRoll;
    const pitchAcceleration = (m.trimMoment / (m.mass * pitchRadius2)) * Math.cos(pitchAngle) - pitchOmega2 * Math.sin(pitchAngle) - 1.4 * Math.sqrt(pitchOmega2) * pitchVelocity + wavePitch;
    state.heelRate = clamp(state.heelRate + rollAcceleration * DEG * FIXED_STEP, -35, 35);
    state.trimRate = clamp(state.trimRate + pitchAcceleration * DEG * FIXED_STEP, -20, 20);
    state.heel = clamp(state.heel + state.heelRate * FIXED_STEP, -60, 60);
    state.trim = clamp(state.trim + state.trimRate * FIXED_STEP, -35, 35);
    const current = updateMeasurements(state);
    const problems = [];
    if (current.edgeFreeboard < c.limits.freeboard) problems.push('The low deck edge lost its required freeboard.');
    if (Math.abs(state.heel) > c.limits.heel) problems.push('Heel exceeded the commissioning limit.');
    if (Math.abs(state.trim) > c.limits.trim) problems.push('Trim exceeded the commissioning limit.');
    if (current.gm < c.limits.minGM) problems.push('The stability reserve fell below its limit.');
    if (current.edgeFreeboard <= 0 || Math.abs(state.heel) >= 40 || Math.abs(state.trim) >= 20) {
      finish(state, false, 'Launch abandoned: the hull reached an unsafe attitude or an immersed deck edge.'); break;
    }
    state.breachTime = problems.length ? state.breachTime + FIXED_STEP : Math.max(0, state.breachTime - FIXED_STEP * 0.6);
    state.damage = clamp(state.breachTime / c.limits.breachDuration, 0, 1);
    if (state.breachTime >= c.limits.breachDuration) { finish(state, false, `${problems[0]} Return to the quay and rebalance.`); break; }
    if (state.time + 1e-9 >= c.limits.launchDuration) { finish(state, true, 'Commission complete: all stores remained within the launch stability envelope.'); break; }
  }
  return state;
}
export function pauseGame(state) {
  if (!['loading', 'sailing'].includes(state.phase)) return false;
  state.previousPhase = state.phase; state.phase = 'paused'; announce(state, 'Commission paused.'); return true;
}
export function resumeGame(state) {
  if (state.phase !== 'paused') return false;
  state.phase = state.previousPhase || 'loading'; state.previousPhase = null;
  announce(state, state.phase === 'sailing' ? 'Launch trial resumed.' : 'Cargo commissioning resumed.'); return true;
}
export function retryGame(state) {
  if (!['lost', 'won', 'sailing'].includes(state.phase)) return false;
  state.phase = 'loading'; state.previousPhase = null; state.time = 0; state.elapsed = 0;
  state.accumulator = 0; state.breachTime = 0; state.damage = 0;
  state.heel = 0; state.trim = 0; state.heelRate = 0; state.trimRate = 0; state.result = null;
  updateMeasurements(state); announce(state, 'Back at the quay. Adjust the stored load and try again.'); return true;
}
