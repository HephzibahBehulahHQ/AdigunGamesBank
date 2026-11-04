import test from 'node:test';
import assert from 'node:assert/strict';
import { levelConfig, referenceProcedure, createCampaign, CAMPAIGN_ID, LEVEL_COUNT } from '../game6/campaign.js';
import { createExperiment, selectPart, electrical, inspectPlan, startCharge, captureTarget, startDischarge, stepExperiment,
  pauseExperiment, resumeExperiment, advancePaused, resetExperiment, evolveVoltage, timeToVoltage, energyAt } from '../game6/engine.js';
import { resistorCaption } from '../game6/scene.js';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
function prepared(level = 1) {
  const state = createExperiment(level), procedure = referenceProcedure(state.config);
  for (const key of ['capacitor', 'chargeResistor', 'dischargeResistor']) assert.equal(selectPart(state, key, procedure[key]), true);
  return state;
}
function advanceFor(state, seconds, dt = 1) {
  let remaining = seconds;
  while (remaining > 1e-9 && ['charging','holding','discharging'].includes(state.phase)) {
    const elapsed = Math.min(dt, remaining); stepExperiment(state, elapsed); remaining -= elapsed;
  }
}
function reachHold(state, voltage = state.config.target.centerVolts) {
  const circuit = electrical(state), time = timeToVoltage(0, voltage, circuit.chargeAsymptote, circuit.chargeTau);
  assert.equal(startCharge(state), true); advanceFor(state, time); assert.equal(state.phase, 'charging');
  near(state.voltage, voltage); assert.equal(captureTarget(state), true);
}
function reachDischarge(state) { reachHold(state); advanceFor(state, state.config.target.holdSeconds); assert.equal(state.phase, 'ready'); assert.equal(startDischarge(state), true); }

test('RC voltage and energy match independent closed-form reference values and reject invalid numerical inputs', () => {
  near(evolveVoltage(0, 12, 2, 2), 7.585446705942692);
  near(evolveVoltage(10, 0, 2, 2), 3.6787944117144233);
  near(energyAt(.0022, 8), .0704);
  near(timeToVoltage(0, 7.585446705942692, 12, 2), 2);
  assert.equal(timeToVoltage(0, 13, 12, 2), Infinity);
  assert.equal(timeToVoltage(Infinity, Infinity, 12, 2), Infinity);
  assert.throws(() => evolveVoltage(0, 12, 0, 1), RangeError); assert.throws(() => evolveVoltage(0, 12, 2, -1), RangeError);
});

test('Unbanded RC resistor captions preserve exact scenario resistance and power rather than rounded colour codes', () => {
  assert.equal(resistorCaption('R2', 2720, .125), 'R2 · 2720 Ω · 0.125 W');
  assert.equal(resistorCaption('LEAK', 32450, null), 'LEAK · 32450 Ω');
  assert.equal(resistorCaption('R1', 0), 'R1 · FIT PART');
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const config = levelConfig(level);
    const parts = [...config.chargeResistors, ...config.dischargeResistors, { ohms: config.leakageOhms }];
    for (const part of parts) {
      const caption = resistorCaption('R', part.ohms, part.watts);
      const reading = caption.match(/^R · ([\d.]+) Ω(?: · ([\d.]+) W)?$/);
      assert.ok(reading, `resistance must have an explicit unit: ${caption}`);
      assert.equal(Number(reading[1]), part.ohms, `experiment ${level}: printed and simulated resistance differ`);
      if (part.watts) assert.equal(Number(reading[2]), part.watts);
      else assert.equal(reading[2], undefined, 'leakage model must not invent a component power rating');
    }
  }
});

test('First experiment obeys leakage-aware KCL, measured current, capture energy, hold and release timing', () => {
  const state = prepared(), plan = inspectPlan(state);
  near(plan.circuit.capacitance, .0022); near(plan.circuit.chargeTau, 2.1782178217821784);
  near(plan.initialCurrent, .012); near(plan.initialPower, .144); near(plan.chargeTime, 2.4370227635330535);
  assert.deepEqual(plan.warnings, []); reachHold(state);
  near(state.captureEnergy, .0704); near(state.capturedVoltage, 8);
  advanceFor(state, 3); assert.equal(state.phase, 'ready'); near(state.voltage, 7.8916495231398684);
  const frozen = state.time; assert.equal(stepExperiment(state, 1), false); assert.equal(state.time, frozen);
  assert.equal(startDischarge(state), true); advanceFor(state, 10);
  assert.equal(state.phase, 'won'); near(state.voltage, .5); near(state.stageTime, 4.099516019537855);
  near(state.time, 9.53653878307091); assert.equal(state.holdPassed, true);
  near(electrical(state).storedEnergy, .000275);
});

test('Exact exponential integration agrees with independent fine-step Euler KCL for all switch positions', () => {
  const state = prepared(); startCharge(state);
  const C = .0022, R1 = 1000, R2 = 680, leak = 100000, source = 12, dt = .00002;
  let voltage = 0;
  for (let step = 0; step < 50000; step++) voltage += ((source - voltage) / R1 - voltage / leak) / C * dt;
  stepExperiment(state, 1); near(state.voltage, voltage, 2e-5);
  const measured = electrical(state);
  near(measured.sourceCurrent - measured.leakageCurrent, measured.capacitorCurrent);
  const holdState = prepared(); reachHold(holdState);
  voltage = 8;
  for (let step = 0; step < 50000; step++) voltage += (-voltage / leak) / C * dt;
  stepExperiment(holdState, 1); near(holdState.voltage, voltage, 1e-7);
  const bleedState = prepared(); reachDischarge(bleedState); voltage = bleedState.voltage;
  for (let step = 0; step < 50000; step++) voltage += (-voltage / R2 - voltage / leak) / C * dt;
  stepExperiment(bleedState, 1); near(bleedState.voltage, voltage, 2e-5);
});

test('All 10,000 distinct physical experiments are solvable through the real selection and switching engine', () => {
  const signatures = new Set();
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const state = prepared(level), config = state.config, plan = inspectPlan(state);
    assert.ok(plan.ready); assert.deepEqual(plan.warnings, [], `reference warning ${level}`);
    const caps = config.capacitors.map(({microfarads, voltageRating}) => [microfarads, voltageRating]).sort((a, b) => a[0] - b[0]);
    const resistors = list => list.map(({ohms, watts}) => [ohms, watts]).sort((a, b) => a[0] - b[0]);
    const signature = JSON.stringify([config.sourceVolts, config.leakageOhms, caps, resistors(config.chargeResistors), resistors(config.dischargeResistors), config.target, config.limits]);
    assert.equal(signatures.has(signature), false, `duplicate physical experiment ${level}`); signatures.add(signature);
    reachHold(state); advanceFor(state, config.target.holdSeconds);
    assert.equal(state.phase, 'ready', `hold ${level}: ${state.message}`); assert.equal(state.holdPassed, true);
    assert.ok(state.voltage >= config.target.holdFloor); assert.equal(startDischarge(state), true);
    advanceFor(state, config.limits.dischargeSeconds + 1);
    assert.equal(state.phase, 'won', `discharge ${level}: ${state.message}`); near(state.voltage, config.target.safeVolts);
    assert.ok(state.captureEnergy >= config.target.minEnergy && state.captureEnergy <= config.target.maxEnergy);
  }
  assert.equal(signatures.size, LEVEL_COUNT);
});

test('Generated scenarios and first/final tier boundaries are deterministic and physically bounded', () => {
  assert.deepEqual(levelConfig(8543), levelConfig(8543));
  assert.equal(levelConfig(0).level, 1); assert.equal(levelConfig(10001).level, 1); assert.equal(levelConfig(NaN).level, 1);
  assert.equal(levelConfig(10000).tier, 'Professional Master');
  const intro = levelConfig(1), mastery = levelConfig(10000);
  assert.ok((mastery.target.maxVolts - mastery.target.minVolts) / mastery.sourceVolts < (intro.target.maxVolts - intro.target.minVolts) / intro.sourceVolts);
  assert.ok(mastery.target.holdSeconds > intro.target.holdSeconds);
  for (const level of [1, 2000, 2001, 4001, 6001, 8001, 10000]) {
    const c = levelConfig(level);
    assert.ok(c.sourceVolts >= 5 && c.sourceVolts <= 24);
    assert.ok(c.target.holdFloor > c.target.safeVolts && c.target.minVolts < c.target.maxVolts && c.target.maxVolts < c.limits.ceilingVolts);
  }
});

test('Missing, foreign or live component edits cannot bypass experiment setup', () => {
  const state = createExperiment(1);
  assert.equal(startCharge(state), false); assert.match(state.message, /Fit all three parts/);
  assert.equal(selectPart(state, 'capacitor', 'foreign'), false); assert.equal(selectPart(state, 'unknown', 'c-reference'), false);
  const configured = prepared(); startCharge(configured); const selected = { ...configured.selected };
  assert.equal(selectPart(configured, 'capacitor', 'c-small'), false); assert.deepEqual(configured.selected, selected);
  assert.equal(startDischarge(configured), false); assert.equal(configured.holdPassed, false);
});

test('Early and late captures fail, overvoltage stops at the physical threshold and no phase auto-awards a win', () => {
  const early = prepared(); startCharge(early); stepExperiment(early, .1); assert.equal(captureTarget(early), false);
  assert.equal(early.phase, 'lost'); assert.equal(early.fault, 'capture-voltage');
  const late = prepared(); startCharge(late); advanceFor(late, 12);
  assert.equal(late.phase, 'lost'); assert.equal(late.fault, 'overvoltage'); near(late.voltage, late.config.limits.ceilingVolts);
  const hold = prepared(); reachHold(hold); advanceFor(hold, 10);
  assert.equal(hold.phase, 'ready'); assert.notEqual(hold.phase, 'won');
});

test('A correct voltage with either undersized or oversized capacitance still fails the stored-energy requirement', () => {
  for (const id of ['c-small', 'c-large']) {
    const state = prepared(); selectPart(state, 'capacitor', id);
    const circuit = electrical(state), target = id === 'c-small' ? 8 : 7.4;
    startCharge(state); advanceFor(state, timeToVoltage(0, target, circuit.chargeAsymptote, circuit.chargeTau));
    assert.equal(state.phase, 'charging'); near(state.voltage, target);
    assert.equal(captureTarget(state), false); assert.equal(state.fault, 'capture-energy'); assert.equal(state.phase, 'lost');
  }
});

test('Charge and discharge current limits and resistor power ratings each stop an unsafe model independently', () => {
  const current = prepared(); selectPart(current, 'chargeResistor', 'charge-fast'); startCharge(current); stepExperiment(current, .1);
  assert.equal(current.fault, 'charge-current'); near(current.time, 0);
  const power = prepared(); selectPart(power, 'chargeResistor', 'charge-fast'); power.config.limits.chargeAmps = 1;
  startCharge(power); stepExperiment(power, .1); assert.equal(power.fault, 'charge-power');
  const bleed = prepared(); selectPart(bleed, 'dischargeResistor', 'discharge-fast'); reachDischarge(bleed); stepExperiment(bleed, .1);
  assert.equal(bleed.fault, 'discharge-current');
  const bleedPower = prepared(); selectPart(bleedPower, 'dischargeResistor', 'discharge-fast'); bleedPower.config.limits.dischargeAmps = 1;
  reachDischarge(bleedPower); stepExperiment(bleedPower, .1); assert.equal(bleedPower.fault, 'discharge-power');
});

test('Excessive time constants fail their own deadlines and a changed leakage path causes a real hold failure', () => {
  const charge = prepared(); selectPart(charge, 'chargeResistor', 'charge-slow'); startCharge(charge); advanceFor(charge, 20);
  assert.equal(charge.phase, 'lost'); assert.equal(charge.fault, 'charge-timeout'); near(charge.stageTime, charge.config.limits.chargeSeconds);
  const discharge = prepared(); selectPart(discharge, 'dischargeResistor', 'discharge-slow'); reachDischarge(discharge); advanceFor(discharge, 20);
  assert.equal(discharge.phase, 'lost'); assert.equal(discharge.fault, 'discharge-timeout'); assert.ok(discharge.voltage > discharge.config.target.safeVolts);
  const leaky = prepared(); reachHold(leaky); leaky.config.leakageOhms = 1000; advanceFor(leaky, 3);
  assert.equal(leaky.phase, 'lost'); assert.equal(leaky.fault, 'hold-droop'); near(leaky.voltage, leaky.config.target.holdFloor);
});

test('Pause and 0.1-second stepping preserve the same physics and allow a full accessible switching procedure', () => {
  const state = prepared(); startCharge(state); pauseExperiment(state);
  const paused = { voltage: state.voltage, time: state.time };
  assert.equal(stepExperiment(state, 1), false); assert.deepEqual({ voltage: state.voltage, time: state.time }, paused);
  for (let i = 0; i < 24; i++) assert.equal(advancePaused(state), true);
  assert.equal(state.phase, 'paused'); assert.equal(state.resumePhase, 'charging'); near(state.time, 2.4);
  assert.ok(state.voltage >= 7.2 && state.voltage <= 8.8); assert.equal(captureTarget(state), true);
  assert.equal(state.phase, 'paused'); assert.equal(state.resumePhase, 'holding');
  for (let i = 0; i < 30; i++) advancePaused(state);
  assert.equal(state.phase, 'ready'); assert.equal(startDischarge(state), true); assert.equal(pauseExperiment(state), true);
  for (let i = 0; i < 60 && state.phase === 'paused'; i++) advancePaused(state);
  assert.equal(state.phase, 'won'); assert.equal(resumeExperiment(state), false);
});

test('Closed-form results and threshold event times are stable across coarse and fine frame sizes', () => {
  const coarse = prepared(8207), fine = prepared(8207);
  for (const [state, dt] of [[coarse, 1], [fine, .025]]) {
    startCharge(state); advanceFor(state, state.config.solution.chargeSeconds, dt); captureTarget(state);
    advanceFor(state, state.config.target.holdSeconds, dt); startDischarge(state); advanceFor(state, state.config.limits.dischargeSeconds, dt);
    assert.equal(state.phase, 'won');
  }
  near(fine.time, coarse.time, 1e-7); near(fine.voltage, coarse.voltage); near(fine.captureEnergy, coarse.captureEnergy, 1e-8);
  const state = prepared(); startCharge(state);
  for (const bad of [0, -1, NaN, Infinity]) assert.equal(stepExperiment(state, bad), false);
  stepExperiment(state, 1000); near(state.time, 1); assert.equal(state.phase, 'charging');
});

test('Reset retains selected parts but removes all completion prerequisites, trace and stored energy', () => {
  const state = prepared(); reachDischarge(state); advanceFor(state, 1);
  const reset = resetExperiment(state);
  assert.equal(reset.phase, 'planning'); assert.equal(reset.voltage, 0); assert.equal(reset.holdPassed, false); assert.equal(reset.captureEnergy, null);
  assert.deepEqual(reset.selected, state.selected); assert.equal(reset.trace.length, 1); assert.equal(startDischarge(reset), false);
  reachDischarge(reset); advanceFor(reset, 10); assert.equal(reset.phase, 'won');
});

test('Capacitor campaign validates sequential saves, corruption, disabled storage and final mastery', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const key = `adigun.campaign.v1.${CAMPAIGN_ID}`, progress = createCampaign(storage);
  assert.equal(progress.complete(2), false); assert.equal(progress.complete(1), true); assert.equal(progress.complete(1), false);
  assert.equal(createCampaign(storage).unlocked, 2); values.set(key, 'corrupt'); assert.equal(createCampaign(storage).completed, 0);
  values.set(key, JSON.stringify({ version: 1, completed: 9999, unlocked: 10000 })); const final = createCampaign(storage);
  assert.equal(final.complete(10000), true); assert.equal(final.mastered, true); assert.equal(final.complete(10001), false);
  const denied = createCampaign({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  assert.equal(denied.complete(1), true); assert.equal(denied.unlocked, 2);
});
