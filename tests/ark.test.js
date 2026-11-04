import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, startGame, loadCargo, moveCargo, unloadCargo, setBallast,
  adjustBallast, inspectLoading, launch, stepGame, pauseGame, resumeGame,
  retryGame, hydrostatics,
} from '../game24/engine.js';
import { levelConfig, solutionFor, LEVEL_COUNT } from '../game24/campaign.js';

const near = (actual, expected, tolerance = 1e-7) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} ± ${tolerance}`);
};
function commission(level) {
  const state = createGame(level);
  assert.equal(startGame(state), true);
  const solution = solutionFor(state.config);
  for (let cargo = 0; cargo < 6; cargo++) assert.equal(loadCargo(state, cargo, solution.placement[cargo]), true);
  for (let slot = 0; slot < 6; slot++) {
    if (solution.ballast[slot] !== 0) assert.equal(setBallast(state, slot, solution.ballast[slot]), true);
  }
  return state;
}
function sail(state, dt = 0.25) {
  assert.equal(launch(state), true, `Level ${state.level}: ${state.message}`);
  let frames = 0;
  while (state.phase === 'sailing' && frames++ < 1000) stepGame(state, dt);
  return state;
}

test('ark configurations are deterministic and cover all five difficulty tiers', () => {
  assert.equal(LEVEL_COUNT, 10000);
  for (const level of [1, 2000, 2001, 4001, 6001, 8001, 10000]) {
    const config = levelConfig(level);
    assert.deepEqual(config, levelConfig(level));
    assert.equal(config.level, level);
    assert.equal(config.tierIndex, Math.floor((level - 1) / 2000));
    assert.equal(config.slots.length, 6);
    assert.equal(config.cargo.length, 6);
  }
  assert.equal(levelConfig(0).level, 1);
  assert.equal(levelConfig(NaN).level, 1);
  const solution = solutionFor(1);
  solution.ballast[0] = 999;
  assert.notDeepEqual(solution, solutionFor(1));
});

test('ark hydrostatics use tonnes, metres and kilonewtons coherently', () => {
  const config = levelConfig(1);
  config.hull = { length: 30, beam: 10, depth: 6, lightshipMass: 300, lightshipKG: 2, waterDensity: 1, gravity: 9.81 };
  config.environment.windMoment = 0;
  config.environment.trimMoment = 0;
  const metrics = hydrostatics(config, Array(6).fill(-1), Array(6).fill(0));
  near(metrics.mass, 300);
  near(metrics.displacement, 300);
  near(metrics.draft, 1);
  near(metrics.buoyancy, 2943);
  near(metrics.freeboard, 5);
  near(metrics.kg, 2);
  near(metrics.kb, 0.5);
  near(metrics.bm, 100 / 12);
  near(metrics.gm, 0.5 + 100 / 12 - 2);
  near(metrics.gmLongitudinal, 0.5 + 900 / 12 - 2);
  near(metrics.equilibriumHeel, 0);
  near(metrics.equilibriumTrim, 0);
  const inclined = hydrostatics(config, Array(6).fill(-1), Array(6).fill(0), 6, 2, 0.2);
  near(inclined.edgeFreeboard, 5 - Math.sin(6 * Math.PI / 180) * 5 - Math.sin(2 * Math.PI / 180) * 15 - 0.2);
  const ballast = hydrostatics(config, Array(6).fill(-1), [10, 0, 0, 0, 0, 0]);
  near(ballast.mass, 310);
  near(ballast.draft, 310 / 300);
  near(ballast.kg, (300 * 2 + 10 * config.ballast.kg) / 310);
  assert.ok(ballast.equilibriumHeel < 0);
  assert.ok(ballast.equilibriumTrim < 0);
});

test('ark loading controls preserve cargo identity, permit swaps and reject invalid input', () => {
  const state = createGame(1);
  assert.equal(loadCargo(state, 0, 0), false);
  assert.equal(startGame(state), true);
  assert.equal(startGame(state), false);
  assert.equal(loadCargo(state, 0, 0), true);
  assert.equal(loadCargo(state, 1, 1), true);
  assert.equal(moveCargo(state, 0, 1), true);
  assert.deepEqual(state.placement.slice(0, 2), [1, 0]);
  assert.equal(loadCargo(state, 2, 1), true);
  assert.equal(state.placement[0], -1);
  assert.equal(state.placement[2], 1);
  assert.equal(unloadCargo(state, 2), true);
  assert.equal(unloadCargo(state, 2), false);
  for (const input of [-1, 6, 0.5, NaN, Infinity, '1']) {
    assert.equal(loadCargo(state, input, 0), false);
    assert.equal(loadCargo(state, 0, input), false);
    assert.equal(setBallast(state, input, 1), false);
  }
  for (const amount of [-1, 0.5, Infinity, NaN, state.config.ballast.capacity + 1]) {
    assert.equal(setBallast(state, 0, amount), false);
  }
  assert.equal(setBallast(state, 0, 1), true);
  assert.equal(adjustBallast(state, 0, 1), true);
  assert.equal(state.ballast[0], 2);
  assert.equal(launch(state), false);
  assert.equal(state.phase, 'loading');
});

test('ark commissioning enforces station, deck capacity and total ballast constraints', () => {
  const state = commission(10000);
  assert.equal(inspectLoading(state).ok, true);
  const otherStationCargo = state.config.cargo.findIndex(c => c.destination !== state.config.cargo[0].destination);
  assert.equal(moveCargo(state, 0, state.placement[otherStationCargo]), true);
  assert.equal(inspectLoading(state).ok, false);
  assert.equal(launch(state), false);
  const overloaded = commission(1);
  overloaded.config.slots[overloaded.placement[0]].capacity = overloaded.config.cargo[0].mass - 0.1;
  assert.equal(inspectLoading(overloaded).ok, false);
  assert.equal(launch(overloaded), false);
  const bounded = createGame(10000);
  startGame(bounded);
  let total = 0;
  for (let slot = 0; slot < 6; slot++) {
    const amount = Math.min(bounded.config.ballast.capacity, bounded.config.ballast.budget - total);
    if (amount) assert.equal(setBallast(bounded, slot, amount), true);
    total += amount;
  }
  near(total, bounded.config.ballast.budget);
  const room = bounded.ballast.findIndex(x => x < bounded.config.ballast.capacity);
  assert.equal(adjustBallast(bounded, room, 1), false);
});

test('ark launches use fixed numerical steps, pause safely and limit oversized frame input', () => {
  const a = commission(5000), b = commission(5000);
  launch(a); launch(b);
  for (let i = 0; i < 120; i++) stepGame(a, 1 / 120);
  for (let i = 0; i < 4; i++) stepGame(b, 0.25);
  near(a.time, b.time);
  near(a.heel, b.heel);
  near(a.trim, b.trim);
  assert.equal(pauseGame(a), true);
  const snapshot = [a.time, a.heel, a.trim, a.metrics.wave];
  stepGame(a, 1000);
  assert.deepEqual([a.time, a.heel, a.trim, a.metrics.wave], snapshot);
  assert.equal(loadCargo(a, 0, 0), false);
  assert.equal(setBallast(a, 0, 1), false);
  assert.equal(resumeGame(a), true);
  const before = a.time;
  for (const dt of [NaN, Infinity, -1, 0]) stepGame(a, dt);
  near(a.time, before);
  stepGame(a, 1000);
  near(a.time - before, 0.25);
  assert.ok(Number.isFinite(a.heel));
  assert.ok(Number.isFinite(a.trim));
});

test('ark unbalanced commissioning can fail during numerical launch and retry keeps the plan', () => {
  const config = levelConfig(10000);
  config.environment.waveHeight = 0;
  config.limits.heel = 0.01;
  config.limits.trim = 0.01;
  const state = commission(config);
  const tank = state.ballast.findIndex(x => x > 0);
  assert.notEqual(tank, -1);
  assert.equal(setBallast(state, tank, 0), true);
  sail(state);
  assert.equal(state.phase, 'lost');
  assert.equal(state.result.success, false);
  assert.ok(state.time > 0);
  assert.ok(Math.abs(state.heel) > 0 || Math.abs(state.trim) > 0);
  const plan = [...state.placement], ballast = [...state.ballast];
  assert.equal(retryGame(state), true);
  assert.equal(state.phase, 'loading');
  assert.deepEqual(state.placement, plan);
  assert.deepEqual(state.ballast, ballast);
  near(state.time, 0);
  assert.equal(state.result, null);
  assert.equal(state.attempts, 1);
});

test('all 10,000 ark challenges have distinct physical constraints and complete a numerical launch through public controls', () => {
  const fingerprints = new Set();
  let frames = 0;
  let greatestHeel = 0, greatestTrim = 0, leastReserve = Infinity;
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const state = commission(level);
    const c = state.config;
    fingerprints.add(JSON.stringify([c.hull, c.cargo.map(({ mass, height, destination }) => [mass, height, destination]), c.slots.map(({ capacity, accepts }) => [capacity, accepts]), c.ballast, c.environment, c.limits]));
    const inspection = inspectLoading(state);
    assert.equal(inspection.ok, true, `Level ${level}: ${JSON.stringify(inspection)}`);
    near(state.metrics.heelMoment, 0, 1e-6);
    near(state.metrics.trimMoment, 0, 1e-6);
    assert.equal(launch(state), true, `Level ${level}: ${state.message}`);
    let localFrames = 0;
    while (state.phase === 'sailing' && localFrames++ < 200) {
      stepGame(state, 0.25);
      greatestHeel = Math.max(greatestHeel, Math.abs(state.heel));
      greatestTrim = Math.max(greatestTrim, Math.abs(state.trim));
      leastReserve = Math.min(leastReserve, state.metrics.edgeFreeboard - c.limits.freeboard);
    }
    frames += localFrames;
    assert.equal(state.phase, 'won', `Level ${level}: ${state.message}; heel ${state.heel}, trim ${state.trim}, freeboard ${state.metrics.edgeFreeboard}, target ${c.limits.freeboard}`);
    assert.equal(state.result.success, true);
    near(state.time, c.limits.launchDuration, 1e-6);
    near(state.metrics.wave, c.environment.waveHeight * Math.sin(state.time * 2 * Math.PI / c.environment.wavePeriod + c.environment.phase), 1e-8);
  }
  assert.equal(fingerprints.size, LEVEL_COUNT);
  console.info(`ARK AUTOMATED: ${LEVEL_COUNT} distinct configurations, ${LEVEL_COUNT} complete launches, ${frames} simulation-frame advances; max |heel| ${greatestHeel.toFixed(3)}°, max |trim| ${greatestTrim.toFixed(3)}°, minimum sampled freeboard reserve ${leastReserve.toFixed(4)} m. This is automated numerical coverage, not manual playtesting.`);
});
