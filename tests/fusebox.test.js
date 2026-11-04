import test from 'node:test';
import assert from 'node:assert/strict';
import { levelConfig, referencePlan, createCampaign, CAMPAIGN_ID, LEVEL_COUNT } from '../game8/campaign.js';
import { createBoard, assignLoad, fitBreaker, inspectBoard, startTrial, stepTrial, pauseTrial, resumeTrial, isolateSupply, resetTrip, trialProgress, loadCurrent } from '../game8/engine.js';

function prepared(level = 1) {
  const board = createBoard(level), plan = referencePlan(board.config);
  plan.assignments.forEach((branch, load) => assert.equal(assignLoad(board, load, branch), true));
  plan.breakers.forEach((rating, branch) => assert.equal(fitBreaker(board, branch, rating), true));
  return board;
}
function finish(board, delta = 1) {
  for (let count = 0; count < 400 && board.phase === 'testing'; count++) stepTrial(board, delta);
  return board;
}
const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);

test('Fuse Box first board obeys independent DC power/current and energy calculations', () => {
  const board = prepared(), inspection = inspectBoard(board);
  assert.equal(board.config.voltage, 24);
  assert.equal(loadCurrent(board.config, 0, 0), 48 / 24);
  assert.deepEqual(inspection.branches.map(branch => branch.demands), [[5, 5, 5], [7, 7, 7], [11, 11, 11]]);
  assert.equal(inspection.cost, 25);
  assert.equal(inspection.ok, true);
  assert.equal(startTrial(board), true); finish(board);
  assert.equal(board.phase, 'won'); assert.equal(board.isolated, true); assert.equal(board.passed, 3);
  assert.equal(trialProgress(board), 1); near(board.energyWh, (48 + 72 + 72 + 96 + 120 + 144) * 6 / 3600);
});

test('All 10,000 distinct physical configurations have a legal solution and complete every operating profile', () => {
  const signatures = new Set();
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const board = prepared(level), { config } = board;
    assert.ok(config.loads.length >= 6 && config.loads.length <= 12, `load count ${level}`);
    assert.ok(config.branches.length >= 3 && config.branches.length <= 6, `branch count ${level}`);
    assert.ok(config.loads.every(load => load.powers.length === 3 && load.powers.every(power => Number.isFinite(power) && power > 0)), `powers ${level}`);
    const signature = JSON.stringify([config.voltage, config.branches.map(branch => branch.cableAmpacity), config.loads.map(load => load.powers), config.inventory, config.budget]);
    assert.equal(signatures.has(signature), false, `duplicate physical board ${level}`); signatures.add(signature);
    const inspection = inspectBoard(board);
    assert.equal(inspection.ok, true, `invalid reference plan ${level}: ${inspection.reasons.join(', ')}`);
    assert.deepEqual(inspection.warnings, [], `overload in reference plan ${level}`);
    assert.equal(startTrial(board), true); finish(board);
    assert.equal(board.phase, 'won', `board ${level}: ${board.message}`);
    assert.equal(board.passed, 3); assert.equal(trialProgress(board), 1);
    assert.ok(board.energyWh > 0, `energy ${level}`);
  }
  assert.equal(signatures.size, LEVEL_COUNT);
});

test('Seed and tier boundaries change the actual challenge and invalid levels cannot escape the campaign', () => {
  assert.deepEqual(levelConfig(8227), levelConfig(8227));
  assert.equal(levelConfig(0).level, 1); assert.equal(levelConfig(10001).level, 1); assert.equal(levelConfig(Infinity).level, 1);
  assert.deepEqual([1, 2001, 4001, 6001, 8001].map(level => levelConfig(level).branches.length), [3, 3, 4, 5, 6]);
  assert.equal(levelConfig(10000).tier, 'Professional Master');
  assert.ok(levelConfig(4001).loads.some(load => new Set(load.powers).size > 1));
  const expert = prepared(10000); assert.equal(inspectBoard(expert).cost, expert.config.budget);
});

test('Unassigned loads, empty circuits and breaker ratings above cable limits prevent energizing', () => {
  const board = createBoard(1);
  assert.equal(startTrial(board), false); assert.match(board.message, /Assign all 6 loads/); assert.equal(board.phase, 'isolated');
  for (let load = 0; load < 6; load++) assignLoad(board, load, 0);
  fitBreaker(board, 0, 16);
  const inspection = inspectBoard(board);
  assert.ok(inspection.reasons.some(reason => /exceeds its 6 A cable limit/.test(reason)));
  assert.ok(inspection.reasons.some(reason => /Branch B has no assigned load/.test(reason)));
  assert.equal(startTrial(board), false);
});

test('Breaker inventory, workshop budget and bounded indices are enforced independently', () => {
  const board = createBoard(1);
  assert.equal(fitBreaker(board, 0, 6), true); assert.equal(fitBreaker(board, 1, 6), false);
  assert.deepEqual(board.breakers, [6, 0, 0]);
  assert.equal(fitBreaker(board, 0, 0), true); assert.equal(fitBreaker(board, 1, 6), true);
  for (const invalid of [3, 7, -1, NaN, 6.5, Infinity]) assert.equal(fitBreaker(board, 0, invalid), false);
  for (const invalid of [-1, 6, .5, NaN]) assert.equal(assignLoad(board, invalid, 0), false);
  for (const invalid of [-2, 3, .5, NaN]) assert.equal(assignLoad(board, 0, invalid), false);
  const overBudget = prepared(); overBudget.config.budget = 24;
  assert.equal(startTrial(overBudget), false); assert.match(overBudget.message, /budget/);
});

test('Overload trips preserve the plan, require supply isolation before reset, and permit a repaired win', () => {
  const board = prepared();
  [0, 1, 1, 2, 2, 0].forEach((branch, load) => assignLoad(board, load, branch));
  assert.equal(inspectBoard(board).ok, true);
  assert.ok(inspectBoard(board).warnings.some(reason => /Branch A/.test(reason)));
  assert.equal(startTrial(board), true); stepTrial(board, .01);
  assert.equal(board.phase, 'tripped'); assert.equal(board.fault.branch, 0); assert.equal(board.fault.current, 8); assert.equal(board.fault.limit, 6);
  assert.equal(board.isolated, false); assert.equal(resetTrip(board), false); assert.equal(startTrial(board), false);
  assert.equal(assignLoad(board, 5, 2), false); assert.equal(fitBreaker(board, 0, 2), false);
  assert.equal(isolateSupply(board), true); assert.equal(board.phase, 'tripped'); assert.equal(board.isolated, true);
  assert.equal(assignLoad(board, 5, 2), false); assert.equal(resetTrip(board), true);
  assert.deepEqual(board.assignments, [0, 1, 1, 2, 2, 0]);
  referencePlan(board.config).assignments.forEach((branch, load) => assignLoad(board, load, branch));
  assert.equal(startTrial(board), true); finish(board);
  assert.equal(board.phase, 'won'); assert.equal(board.fault, null); assert.equal(trialProgress(board), 1);
});

test('Pause, isolation and invalid elapsed times cannot award a partial or untested completion', () => {
  const board = prepared(); startTrial(board); stepTrial(board, .5);
  const plan = [...board.assignments];
  assert.equal(assignLoad(board, 0, 2), false); assert.equal(fitBreaker(board, 0, 0), false); assert.deepEqual(board.assignments, plan);
  assert.equal(pauseTrial(board), true);
  const time = board.time, energy = board.energyWh;
  assert.equal(stepTrial(board, 1), false); assert.equal(board.time, time); assert.equal(board.energyWh, energy);
  assert.equal(resumeTrial(board), true);
  for (const bad of [NaN, Infinity, -1, 0]) assert.equal(stepTrial(board, bad), false);
  assert.equal(board.time, time); assert.equal(isolateSupply(board), true); assert.equal(board.phase, 'isolated'); assert.equal(board.time, 0); assert.equal(board.passed, 0);
  assert.equal(startTrial(board), true); stepTrial(board, 1000); assert.equal(board.time, 1); assert.notEqual(board.phase, 'won');
  finish(board); assert.equal(board.phase, 'won');
});

test('Every profile is evaluated at its boundary and energy is stable across timestep sizes', () => {
  const fine = prepared(6301), coarse = prepared(6301);
  startTrial(fine); startTrial(coarse); finish(fine, .05); finish(coarse, 1);
  assert.equal(fine.phase, 'won'); assert.equal(coarse.phase, 'won'); near(fine.energyWh, coarse.energyWh, 1e-8);
  const changed = prepared();
  // A documented second-stage demand spike: 96 W -> 240 W at 24 V on B,
  // independent of the generator and the first-stage commissioning values.
  changed.config.loads[3].powers[1] = 240; changed.config.mainAmpacity = 40;
  startTrial(changed); stepTrial(changed, 1); stepTrial(changed, 1); stepTrial(changed, .01);
  assert.equal(changed.passed, 1); assert.equal(changed.phase, 'tripped'); assert.equal(changed.fault.stage, 1); assert.equal(changed.fault.current, 13);
});

test('A tampered over-budget plan or supply limit is revalidated during a running trial', () => {
  const board = prepared(); startTrial(board); board.config.budget = 1;
  stepTrial(board, .1); assert.equal(board.phase, 'tripped'); assert.equal(board.fault.type, 'invalid-plan');
  const overloadedSupply = prepared(); overloadedSupply.config.mainAmpacity = 20; startTrial(overloadedSupply); stepTrial(overloadedSupply, .1);
  assert.equal(overloadedSupply.phase, 'tripped'); assert.equal(overloadedSupply.fault.type, 'supply-overload'); assert.equal(overloadedSupply.fault.current, 23);
});

test('Fuse Box saves its own sequential campaign, recovers corrupt storage and records final mastery', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const key = `adigun.campaign.v1.${CAMPAIGN_ID}`;
  const progress = createCampaign(storage);
  assert.equal(progress.complete(2), false); assert.equal(progress.complete(1), true); assert.equal(progress.complete(1), false);
  assert.equal(createCampaign(storage).unlocked, 2); assert.equal(createCampaign(storage).completed, 1);
  values.set(key, '{broken'); assert.equal(createCampaign(storage).unlocked, 1);
  values.set(key, JSON.stringify({ version: 1, completed: 9999, unlocked: 10000 }));
  const final = createCampaign(storage); assert.equal(final.complete(10000), true); assert.equal(final.mastered, true); assert.equal(final.unlocked, 10000);
  assert.equal(final.complete(10001), false);
  const unavailable = createCampaign({ getItem() { throw new Error('disabled'); }, setItem() { throw new Error('disabled'); } });
  assert.equal(unavailable.complete(1), true); assert.equal(unavailable.unlocked, 2);
});
