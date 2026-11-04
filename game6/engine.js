import { levelConfig } from './campaign.js';

const EPSILON = 1e-9;
const ACTIVE = ['charging', 'holding', 'discharging'];
export const parallel = (a, b) => a * b / (a + b);
export const energyAt = (capacitance, voltage) => .5 * capacitance * voltage * voltage;
/** Exact solution of dV/dt = (V_infinity - V) / tau for one switch topology. */
export function evolveVoltage(initial, asymptote, tau, seconds) {
  if (![initial, asymptote, tau, seconds].every(Number.isFinite) || tau <= 0 || seconds < 0) throw new RangeError('Finite voltage, positive time constant and nonnegative time are required.');
  return asymptote + (initial - asymptote) * Math.exp(-seconds / tau);
}
export function timeToVoltage(initial, target, asymptote, tau) {
  if (target === initial) return 0;
  const ratio = (target - asymptote) / (initial - asymptote);
  if (!(tau > 0) || !Number.isFinite(ratio) || ratio <= 0 || ratio > 1) return Infinity;
  return -tau * Math.log(ratio);
}
export function createExperiment(level = 1) {
  return { config: levelConfig(level), phase: 'planning', resumePhase: null, selected: { capacitor: '', chargeResistor: '', dischargeResistor: '' },
    voltage: 0, time: 0, stageTime: 0, capturedVoltage: null, captureEnergy: null, holdPassed: false, fault: null,
    trace: [{ time: 0, voltage: 0, phase: 'planning' }], message: 'Select a capacitor bank, charge resistor and discharge resistor before starting.' };
}
export function selectedParts(state) {
  return {
    capacitor: state.config.capacitors.find(part => part.id === state.selected.capacitor),
    charge: state.config.chargeResistors.find(part => part.id === state.selected.chargeResistor),
    discharge: state.config.dischargeResistors.find(part => part.id === state.selected.dischargeResistor)
  };
}
export function selectPart(state, kind, id) {
  if (state.phase !== 'planning' || !['capacitor', 'chargeResistor', 'dischargeResistor'].includes(kind)) return false;
  const list = kind === 'capacitor' ? state.config.capacitors : kind === 'chargeResistor' ? state.config.chargeResistors : state.config.dischargeResistors;
  if (id && !list.some(part => part.id === id)) return false;
  state.selected[kind] = id; state.message = id ? 'Part fitted. Review the time constants, energy and current limits before charging.' : 'Part removed. The bench needs all three parts before charging.'; return true;
}
export function electrical(state, requestedPhase) {
  const parts = selectedParts(state), phase = requestedPhase || (state.phase === 'paused' ? state.resumePhase : state.phase);
  if (!parts.capacitor || !parts.charge || !parts.discharge) return null;
  const capacitance = parts.capacitor.microfarads / 1e6, { sourceVolts, leakageOhms } = state.config;
  const chargeTau = capacitance * parallel(parts.charge.ohms, leakageOhms), holdTau = capacitance * leakageOhms;
  const dischargeTau = capacitance * parallel(parts.discharge.ohms, leakageOhms), chargeAsymptote = sourceVolts * leakageOhms / (parts.charge.ohms + leakageOhms);
  const sourceCurrent = phase === 'charging' ? (sourceVolts - state.voltage) / parts.charge.ohms : 0;
  const bleedCurrent = phase === 'discharging' ? state.voltage / parts.discharge.ohms : 0;
  const leakageCurrent = ACTIVE.includes(phase) ? state.voltage / leakageOhms : 0;
  return { ...parts, capacitance, chargeTau, holdTau, dischargeTau, chargeAsymptote, sourceCurrent, bleedCurrent, leakageCurrent,
    capacitorCurrent: sourceCurrent - bleedCurrent - leakageCurrent, chargePower: sourceCurrent ** 2 * parts.charge.ohms,
    dischargePower: bleedCurrent ** 2 * parts.discharge.ohms, storedEnergy: energyAt(capacitance, state.voltage) };
}
export function inspectPlan(state) {
  const circuit = electrical(state), warnings = [];
  if (!circuit) return { ready: false, warnings: ['Fit all three parts to inspect the RC circuit.'], circuit: null };
  const { config } = state, target = config.target;
  const initialCurrent = config.sourceVolts / circuit.charge.ohms, initialPower = config.sourceVolts ** 2 / circuit.charge.ohms;
  const targetEnergy = energyAt(circuit.capacitance, target.centerVolts);
  const chargeTime = timeToVoltage(0, target.centerVolts, circuit.chargeAsymptote, circuit.chargeTau);
  const heldVoltage = target.centerVolts * Math.exp(-target.holdSeconds / circuit.holdTau);
  const dischargeTime = circuit.dischargeTau * Math.log(heldVoltage / target.safeVolts);
  if (initialCurrent > config.limits.chargeAmps + EPSILON) warnings.push('Initial charge current exceeds the bench limit. Increase charge resistance.');
  if (initialPower > circuit.charge.watts + EPSILON) warnings.push('The charge resistor exceeds its power rating at startup.');
  if (targetEnergy < target.minEnergy || targetEnergy > target.maxEnergy) warnings.push('This capacitor bank misses the energy window at the target midpoint.');
  if (chargeTime > config.limits.chargeSeconds) warnings.push('Charging to the target midpoint takes longer than the charge deadline.');
  if (heldVoltage < target.holdFloor) warnings.push('Predicted leakage drops below the hold-voltage floor.');
  if (heldVoltage / circuit.discharge.ohms > config.limits.dischargeAmps + EPSILON) warnings.push('The discharge resistor draws too much initial current.');
  if (heldVoltage ** 2 / circuit.discharge.ohms > circuit.discharge.watts + EPSILON) warnings.push('The discharge resistor exceeds its initial power rating.');
  if (dischargeTime > config.limits.dischargeSeconds) warnings.push('The chosen discharge resistor misses the release deadline.');
  return { ready: true, warnings, circuit, initialCurrent, initialPower, targetEnergy, chargeTime, heldVoltage, dischargeTime };
}
function lose(state, code, message) {
  state.phase = 'lost'; state.resumePhase = null; state.fault = code; state.message = message + ' Reset the experiment to refit the parts or retry the switch timing.';
}
function record(state) {
  const last = state.trace.at(-1);
  if (!last || Math.abs(last.time - state.time) > .049 || last.phase !== state.phase) state.trace.push({ time: state.time, voltage: state.voltage, phase: state.phase });
  if (state.trace.length > 600) state.trace.splice(1, 1);
}
export function startCharge(state) {
  if (state.phase !== 'planning') return false;
  if (!inspectPlan(state).ready) { state.message = 'Fit all three parts before charging.'; return false; }
  state.phase = 'charging'; state.stageTime = 0; state.message = 'Source connected. Capture the target voltage and energy window to start the hold test.'; return true;
}
export function captureTarget(state) {
  const paused = state.phase === 'paused' && state.resumePhase === 'charging';
  if (state.phase !== 'charging' && !paused) return false;
  const circuit = electrical(state), target = state.config.target;
  if (state.voltage < target.minVolts - EPSILON || state.voltage > target.maxVolts + EPSILON) { lose(state, 'capture-voltage', `Capture failed: ${state.voltage.toFixed(3)} V is outside ${target.minVolts}–${target.maxVolts} V.`); return false; }
  if (circuit.storedEnergy < target.minEnergy - EPSILON || circuit.storedEnergy > target.maxEnergy + EPSILON) { lose(state, 'capture-energy', `Capture failed: ${(circuit.storedEnergy * 1000).toFixed(2)} mJ misses the stored-energy window. Select a different capacitor bank.`); return false; }
  state.capturedVoltage = state.voltage; state.captureEnergy = circuit.storedEnergy; state.stageTime = 0;
  state.phase = paused ? 'paused' : 'holding'; state.resumePhase = paused ? 'holding' : null;
  state.message = paused ? 'Target captured. Hold test paused; resume or advance 0.1 s.' : 'Target captured. Source disconnected; the capacitor must now hold above the voltage floor despite leakage.';
  record(state); return true;
}
export function startDischarge(state) {
  if (state.phase !== 'ready' || !state.holdPassed) return false;
  state.phase = 'discharging'; state.stageTime = 0;
  state.message = 'Discharge resistor connected. Reach the release voltage before the deadline without exceeding current or power limits.';
  return true;
}
export function stepExperiment(state, delta) {
  if (!ACTIVE.includes(state.phase) || !Number.isFinite(delta) || delta <= 0) return false;
  const dt = Math.min(delta, 1), circuit = electrical(state), { config } = state, phase = state.phase;
  if (!circuit) { lose(state, 'missing-part', 'The active circuit has a missing component.'); return true; }
  if (phase === 'charging') {
    if (circuit.sourceCurrent > config.limits.chargeAmps + EPSILON) { lose(state, 'charge-current', `Charge current ${(circuit.sourceCurrent * 1000).toFixed(2)} mA exceeds the bench limit.`); return true; }
    if (circuit.chargePower > circuit.charge.watts + EPSILON) { lose(state, 'charge-power', `Charge resistor power ${circuit.chargePower.toFixed(3)} W exceeds its ${circuit.charge.watts} W rating.`); return true; }
    const ceiling = Math.min(config.limits.ceilingVolts, circuit.capacitor.voltageRating);
    const ceilingTime = timeToVoltage(state.voltage, ceiling, circuit.chargeAsymptote, circuit.chargeTau);
    const deadline = Math.max(0, config.limits.chargeSeconds - state.stageTime);
    const elapsed = Math.min(dt, deadline, ceilingTime);
    state.voltage = evolveVoltage(state.voltage, circuit.chargeAsymptote, circuit.chargeTau, elapsed); state.time += elapsed; state.stageTime += elapsed;
    if (ceilingTime <= dt + EPSILON && ceilingTime <= deadline + EPSILON) lose(state, 'overvoltage', `Charge exceeded the ${ceiling.toFixed(3)} V trip threshold. Capture the target earlier.`);
    else if (deadline <= dt + EPSILON) lose(state, 'charge-timeout', 'The charge deadline expired before a valid capture. Check the RC time constant.');
  } else if (phase === 'holding') {
    const remaining = Math.max(0, config.target.holdSeconds - state.stageTime);
    const floorTime = timeToVoltage(state.voltage, config.target.holdFloor, 0, circuit.holdTau);
    const elapsed = Math.min(dt, remaining, floorTime);
    state.voltage = evolveVoltage(state.voltage, 0, circuit.holdTau, elapsed); state.time += elapsed; state.stageTime += elapsed;
    if (floorTime < remaining - EPSILON && floorTime <= dt + EPSILON) lose(state, 'hold-droop', 'Leakage pulled the voltage below the hold floor before the hold test finished.');
    else if (remaining <= dt + EPSILON) {
      state.phase = 'ready'; state.holdPassed = true; state.stageTime = config.target.holdSeconds;
      state.message = 'Hold test passed. The simulation is paused at this measurement. Connect the discharge resistor to run the release test.';
    }
  } else if (phase === 'discharging') {
    if (circuit.bleedCurrent > config.limits.dischargeAmps + EPSILON) { lose(state, 'discharge-current', `Discharge current ${(circuit.bleedCurrent * 1000).toFixed(2)} mA exceeds the bench limit.`); return true; }
    if (circuit.dischargePower > circuit.discharge.watts + EPSILON) { lose(state, 'discharge-power', `Discharge resistor power ${circuit.dischargePower.toFixed(3)} W exceeds its ${circuit.discharge.watts} W rating.`); return true; }
    const deadline = Math.max(0, config.limits.dischargeSeconds - state.stageTime);
    const releaseTime = state.voltage <= config.target.safeVolts ? 0 : timeToVoltage(state.voltage, config.target.safeVolts, 0, circuit.dischargeTau);
    const elapsed = Math.min(dt, deadline, releaseTime);
    state.voltage = evolveVoltage(state.voltage, 0, circuit.dischargeTau, elapsed); state.time += elapsed; state.stageTime += elapsed;
    if (releaseTime <= dt + EPSILON && releaseTime <= deadline + EPSILON) {
      state.voltage = config.target.safeVolts; state.phase = 'won';
      state.message = 'Commission complete. Target captured, hold verified, and discharge completed within every bench limit.';
    } else if (deadline <= dt + EPSILON) lose(state, 'discharge-timeout', 'The discharge deadline expired above the release voltage. Reduce discharge resistance or capacitance.');
  }
  record(state); return true;
}
export function pauseExperiment(state) {
  if (!ACTIVE.includes(state.phase)) return false;
  state.resumePhase = state.phase; state.phase = 'paused'; state.message = 'Simulation paused. Resume, capture a valid charging target, or advance by 0.1 s.'; return true;
}
export function resumeExperiment(state) {
  if (state.phase !== 'paused' || !ACTIVE.includes(state.resumePhase)) return false;
  state.phase = state.resumePhase; state.resumePhase = null; state.message = `Simulation resumed: ${state.phase}.`; return true;
}
export function advancePaused(state) {
  if (state.phase !== 'paused' || !ACTIVE.includes(state.resumePhase)) return false;
  state.phase = state.resumePhase; state.resumePhase = null; stepExperiment(state, .1);
  if (ACTIVE.includes(state.phase)) { state.resumePhase = state.phase; state.phase = 'paused'; state.message = 'Advanced 0.1 s. Simulation paused.'; }
  return true;
}
export function resetExperiment(state) {
  const fresh = createExperiment(state.config.level); fresh.selected = { ...state.selected };
  fresh.message = 'Experiment reset to zero charge. The selected parts are retained and may be changed.'; return fresh;
}
