import { levelConfig, breakerCost } from './campaign.js';

const EPSILON = 1e-8;
const finiteIndex = (index, array) => Number.isInteger(index) && index >= 0 && index < array.length;
const editable = state => state.phase === 'isolated' && state.isolated;
export const loadCurrent = (config, load, stage) => config.loads[load].powers[stage] / config.voltage;

export function createBoard(level = 1) {
  const config = levelConfig(level);
  return { config, phase: 'isolated', isolated: true, assignments: config.loads.map(() => -1), breakers: config.branches.map(() => 0),
    time: 0, stage: 0, passed: 0, energyWh: 0, fault: null, message: 'Supply isolated. Assign every load, fit breakers, then run the three-stage trial.' };
}
export function assignLoad(state, load, branch) {
  if (!editable(state) || !finiteIndex(load, state.assignments) || !(branch === -1 || finiteIndex(branch, state.breakers))) return false;
  state.assignments[load] = branch;
  state.message = branch === -1 ? `${state.config.loads[load].name} disconnected.` : `${state.config.loads[load].name} connected to ${state.config.branches[branch].name}.`;
  return true;
}
export function fitBreaker(state, branch, rating) {
  if (!editable(state) || !finiteIndex(branch, state.breakers) || !Number.isInteger(rating) || rating < 0) return false;
  if (rating && !state.config.inventory[rating]) { state.message = 'That breaker rating is not in the workshop stock.'; return false; }
  const used = state.breakers.filter((value, index) => index !== branch && value === rating).length;
  if (rating && used >= state.config.inventory[rating]) { state.message = `No spare ${rating} A breaker. Remove one from another branch before fitting it here.`; return false; }
  state.breakers[branch] = rating;
  state.message = rating ? `${state.config.branches[branch].name}: ${rating} A breaker fitted.` : `${state.config.branches[branch].name}: breaker removed.`;
  return true;
}
export function inspectBoard(state) {
  const { config, assignments, breakers } = state;
  const reasons = [], warnings = [], stock = {}, branchReadings = config.branches.map((branch, index) => {
    const connected = assignments.map((value, load) => value === index ? load : -1).filter(load => load >= 0);
    const demands = config.stages.map((_, stage) => connected.reduce((sum, load) => sum + loadCurrent(config, load, stage), 0));
    const peak = Math.max(...demands), rating = breakers[index];
    if (!connected.length) reasons.push(`${branch.name} has no assigned load.`);
    if (!rating) reasons.push(`${branch.name} needs a breaker.`);
    if (rating > branch.cableAmpacity + EPSILON) reasons.push(`${branch.name}: ${rating} A breaker exceeds its ${branch.cableAmpacity} A cable limit.`);
    if (rating && !Object.hasOwn(config.inventory, rating)) reasons.push(`${branch.name} uses a breaker outside the available stock.`);
    if (rating) stock[rating] = (stock[rating] || 0) + 1;
    if (rating && peak > rating + EPSILON) warnings.push(`${branch.name}: ${peak.toFixed(2)} A planned peak exceeds the ${rating} A breaker; the trial will trip.`);
    return { ...branch, connected, demands, peak, rating, liveCurrent: ['testing', 'paused'].includes(state.phase) ? demands[state.stage] : 0 };
  });
  const assigned = assignments.filter(value => finiteIndex(value, config.branches)).length;
  if (assigned !== config.loads.length) reasons.unshift(`Assign all ${config.loads.length} loads before energizing.`);
  for (const [rating, count] of Object.entries(stock)) if (count > (config.inventory[rating] || 0)) reasons.push(`Only ${config.inventory[rating] || 0} breaker(s) rated ${rating} A are available.`);
  const cost = breakers.reduce((sum, rating) => sum + breakerCost(rating), 0);
  if (cost > config.budget) reasons.push(`Breaker cost ${cost} exceeds the ${config.budget}-credit budget.`);
  return { ok: !reasons.length, reasons, warnings, branches: branchReadings, assigned, cost, stock };
}
export function startTrial(state) {
  if (!editable(state)) return false;
  const inspection = inspectBoard(state);
  if (!inspection.ok) { state.message = inspection.reasons[0]; return false; }
  state.phase = 'testing'; state.isolated = false; state.time = 0; state.stage = 0; state.passed = 0; state.energyWh = 0; state.fault = null;
  state.message = `Trial running: ${state.config.stages[0]}. Wiring and breaker changes are locked while the supply is on.`;
  return true;
}
function trip(state, branch, current, limit, type) {
  state.phase = 'tripped';
  state.fault = { branch, current, limit, type, stage: state.stage };
  const name = branch < 0 ? 'Supply' : state.config.branches[branch].name;
  state.message = `${name} tripped during ${state.config.stages[state.stage]}: ${current.toFixed(2)} A demand exceeds ${limit.toFixed(2)} A. Isolate the supply, reset the trip, then correct the plan.`;
}
export function stepTrial(state, delta) {
  if (state.phase !== 'testing' || !Number.isFinite(delta) || delta <= 0) return false;
  let remaining = Math.min(delta, 1);
  const { config } = state, totalDuration = config.stageDuration * config.stages.length;
  while (remaining > EPSILON && state.phase === 'testing') {
    const inspection = inspectBoard(state), readings = inspection.branches;
    // Revalidate the plan before every integration segment; malformed imported
    // or tampered state cannot bypass the same constraints used by player input.
    if (!inspection.ok) { trip(state, -1, 0, 0, 'invalid-plan'); return true; }
    const totalCurrent = readings.reduce((sum, branch) => sum + branch.demands[state.stage], 0);
    if (totalCurrent > config.mainAmpacity + EPSILON) { trip(state, -1, totalCurrent, config.mainAmpacity, 'supply-overload'); return true; }
    const overloaded = readings.find(branch => branch.demands[state.stage] > Math.min(branch.rating, branch.cableAmpacity) + EPSILON);
    if (overloaded) {
      trip(state, overloaded.id, overloaded.demands[state.stage], Math.min(overloaded.rating, overloaded.cableAmpacity), 'branch-overload');
      return true;
    }
    const boundary = (state.stage + 1) * config.stageDuration;
    const elapsed = Math.min(remaining, boundary - state.time);
    state.energyWh += totalCurrent * config.voltage * elapsed / 3600;
    state.time = Math.min(totalDuration, state.time + elapsed); remaining -= elapsed;
    if (state.time >= boundary - EPSILON) {
      state.time = boundary; state.passed = state.stage + 1;
      if (state.passed === config.stages.length) {
        state.phase = 'won'; state.isolated = true;
        state.message = `Commission complete. All three operating profiles passed within the cable limits and budget. Supply automatically isolated.`;
      } else {
        state.stage++; state.message = `Stage ${state.stage} passed. Testing ${config.stages[state.stage]}.`;
      }
    }
  }
  return true;
}
export function pauseTrial(state) {
  if (state.phase !== 'testing') return false;
  state.phase = 'paused'; state.message = 'Trial paused. Resume to continue, or isolate the supply to change the plan.'; return true;
}
export function resumeTrial(state) {
  if (state.phase !== 'paused') return false;
  state.phase = 'testing'; state.message = `Trial running: ${state.config.stages[state.stage]}.`; return true;
}
export function isolateSupply(state) {
  if (state.isolated || !['testing', 'paused', 'tripped'].includes(state.phase)) return false;
  state.isolated = true;
  if (state.phase === 'tripped') state.message = 'Supply isolated. Reset the trip before changing the wiring or breakers.';
  else { state.phase = 'isolated'; state.time = 0; state.passed = 0; state.stage = 0; state.energyWh = 0; state.message = 'Supply isolated. The trial was stopped; the current wiring plan is retained.'; }
  return true;
}
export function resetTrip(state) {
  if (state.phase !== 'tripped' || !state.isolated) return false;
  state.phase = 'isolated'; state.fault = null; state.time = 0; state.passed = 0; state.stage = 0; state.energyWh = 0;
  state.message = 'Trip reset. Correct the load distribution or protection, then run the full trial again.'; return true;
}
export function trialProgress(state) {
  return state.phase === 'won' ? 1 : Math.max(0, Math.min(1, state.time / (state.config.stageDuration * state.config.stages.length)));
}
