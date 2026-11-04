import test from 'node:test';
import assert from 'node:assert/strict';
import { circuitFor, trackPoint, projectToTrack, createCampaign, CAMPAIGN_ID, LEVEL_COUNT } from '../game10/campaign.js';
import { createRace, startRace, pauseRace, resumeRace, restartRace, recoverCar, stepRace, drivingGuide, crossedGate, CAR_HALF_WIDTH, RECOVERY_PENALTY } from '../game10/engine.js';

function run(state, seconds, controls) {
  for (let frame = 0; frame < Math.ceil(seconds * 60) && state.phase === 'running'; frame++) stepRace(state, controls, 1 / 60);
  return state;
}
function finishWithDriver(level) {
  const state = createRace(level); startRace(state);
  for (let frame = 0; frame < 12000 && state.phase === 'running'; frame++) {
    const guide = drivingGuide(state), speed = state.config.safeSpeed;
    stepRace(state, {
      steer: level === 1 ? 1 : guide.steer,
      throttle: state.car.speed < speed ? 1 : 0,
      brake: state.car.speed > speed + 1 ? 0.3 : 0
    }, 1 / 30);
  }
  return state;
}

test('APEX rejects invalid level requests and preserves five bounded difficulty tiers', () => {
  for (const value of [-1, 0, 10001, Infinity, NaN, 'junk', null]) assert.equal(circuitFor(value).level, 1);
  assert.equal(circuitFor('10000').level, LEVEL_COUNT);
  assert.equal(circuitFor(1).tier, 'Beginner');
  assert.equal(circuitFor(2001).tier, 'Apprentice');
  assert.equal(circuitFor(4001).tier, 'Skilled');
  assert.equal(circuitFor(6001).tier, 'Expert');
  assert.equal(circuitFor(8001).tier, 'Professional Master');
  assert.equal(createRace('1').car.heading, 0);
});

test('all 10,000 APEX configurations have distinct physical layouts and bounded, drivable closed geometry', () => {
  const signatures = new Set();
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const config = circuitFor(level);
    signatures.add(JSON.stringify([config.points[0], config.points[37], config.points[83], config.width]));
    assert.equal(config.segments.length, 192);
    assert.ok(config.width >= 7 && config.width <= 11);
    assert.ok(config.length > 170 && config.length < 440);
    assert.ok(config.maxCurvature * config.turnRadius < 1.01, `turning envelope at ${level}`);
    assert.ok(config.safeSpeed ** 2 * config.maxCurvature < config.grip, `grip at ${level}`);
    assert.ok(config.timeLimit > config.length * config.laps / config.safeSpeed + 5, `clock at ${level}`);
    assert.ok(config.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.z)));
    assert.ok(config.segments.every(segment => segment.length > 0.5));
    assert.ok(Math.hypot(config.points[0].x - config.points.at(-1).x, config.points[0].z - config.points.at(-1).z) < 1e-9);
  }
  assert.equal(signatures.size, LEVEL_COUNT);
  assert.deepEqual(circuitFor(8217), circuitFor(8217));
});

test('track distance wraps consistently and centre-line projection preserves coordinates', () => {
  const config = circuitFor(6157);
  for (const fraction of [0, 0.13, 0.5, 0.87]) {
    const distance = config.length * fraction, point = trackPoint(config, distance);
    const projected = projectToTrack(config, point.x, point.z);
    assert.ok(projected.gap < 1e-9);
    assert.ok(Math.abs(projected.distance - point.distance) < 1e-8);
    const nextLap = trackPoint(config, distance + config.length);
    assert.ok(Math.hypot(nextLap.x - point.x, nextLap.z - point.z) < 1e-8);
  }
});

test('an untouched race cannot progress, and idling during a run ends in a real loss', () => {
  const state = createRace();
  stepRace(state, { throttle: 1, steer: 1 }, 0.25);
  assert.equal(state.elapsed, 0); assert.equal(state.car.speed, 0);
  assert.equal(startRace(state), true); assert.equal(startRace(state), false);
  run(state, 46, {});
  assert.equal(state.phase, 'lost'); assert.equal(state.gatesPassed, 0);
  assert.equal(state.car.speed, 0); assert.match(state.message, /Time expired/);
});

test('the first race completes only after all twelve ordered gates through normal driving controls', () => {
  const state = createRace(); startRace(state);
  run(state, 6, { throttle: 1, steer: 1 });
  assert.equal(state.phase, 'running'); assert.ok(state.gatesPassed > 0 && state.gatesPassed < 12);
  run(state, 15, { throttle: 1, steer: 1 });
  assert.equal(state.phase, 'won'); assert.equal(state.gatesPassed, 12);
  assert.equal(state.completedLaps, 1); assert.equal(state.sectorInvalid, false);
  assert.equal(state.penalty, 0); assert.equal(state.medal, 'Gold');
  assert.ok(state.distanceDriven >= state.config.length * 0.999);
  const finishedTime = state.elapsed;
  run(state, 60, { throttle: 1, steer: 1 });
  assert.equal(state.elapsed, finishedTime); assert.equal(state.gatesPassed, 12);
});

test('finish-line crossing handles wraparound but rejects reverse, stationary and skipped sectors', () => {
  assert.equal(crossedGate(99, 1, 0, 100), true);
  assert.equal(crossedGate(1, 99, 0, 100), false);
  assert.equal(crossedGate(0, 0, 0, 100), false);
  assert.equal(crossedGate(10, 11, 20, 100), false);
  assert.equal(crossedGate(10, 60, 20, 100), false);
  assert.equal(crossedGate(19, 21, 20, 100), true);
  assert.equal(crossedGate(20, 21, 20, 100), false);
});

test('grass shortcuts lock gate credit until explicit penalized recovery to the last clean gate', () => {
  const state = createRace(); startRace(state);
  run(state, 5, { throttle: 1, steer: 0 });
  assert.equal(state.sectorInvalid, true);
  const gateCount = state.gatesPassed, originalPenalty = state.penalty;
  assert.ok(gateCount < 12); assert.equal(originalPenalty, 3);
  run(state, 3, { throttle: 1, steer: 1 });
  assert.equal(state.gatesPassed, gateCount); assert.equal(state.penalty, originalPenalty);
  const time = state.elapsed;
  assert.equal(recoverCar(state), true);
  assert.ok(Math.abs(state.elapsed - time - RECOVERY_PENALTY) < 1e-8);
  assert.equal(state.gatesPassed, gateCount); assert.equal(state.sectorInvalid, false);
  assert.ok(state.projection.gap < 1e-8); assert.equal(state.car.speed, 0);
  run(state, 25, { throttle: 1, steer: 1 });
  assert.equal(state.phase, 'won'); assert.equal(state.gatesPassed, 12);
  assert.equal(state.penalty, 8); assert.equal(state.recoveries, 1);
});

test('pause freezes physics and time, resume continues, and restart clears only the current race', () => {
  const state = createRace(2); startRace(state); run(state, 0.3, { throttle: 1 });
  assert.equal(pauseRace(state), true);
  const snapshot = structuredClone(state);
  stepRace(state, { throttle: 1, steer: -1 }, 0.25);
  assert.deepEqual(state, snapshot);
  assert.equal(pauseRace(state), false); assert.equal(resumeRace(state), true);
  stepRace(state, { brake: 1 }, 0.1); assert.ok(state.elapsed > snapshot.elapsed);
  const reset = restartRace(state);
  assert.equal(reset.phase, 'ready'); assert.equal(reset.config.level, 2);
  assert.equal(reset.elapsed, 0); assert.equal(reset.gatesPassed, 0); assert.equal(reset.penalty, 0);
});

test('recovery cannot create a win, bypass the clock or alter an inactive race', () => {
  const state = createRace(); assert.equal(recoverCar(state), false);
  startRace(state); run(state, 43, {}); assert.equal(state.phase, 'running');
  recoverCar(state);
  assert.equal(state.phase, 'lost'); assert.equal(state.gatesPassed, 0);
  const time = state.elapsed; assert.equal(recoverCar(state), false); assert.equal(state.elapsed, time);
});

test('invalid controls and long suspended frames cannot create NaNs or unbounded advancement', () => {
  const state = createRace(); startRace(state);
  stepRace(state, { steer: NaN, throttle: Infinity, brake: -Infinity }, Infinity);
  assert.equal(state.elapsed, 0);
  stepRace(state, null, 0.25); stepRace(state, {}, -1);
  const time = state.elapsed;
  stepRace(state, { steer: NaN, throttle: Infinity, brake: NaN }, 4000);
  assert.ok(Math.abs(state.elapsed - time - 0.25) < 1e-8);
  assert.ok([state.car.x, state.car.z, state.car.heading, state.car.speed].every(Number.isFinite));
  assert.equal(state.car.speed, 0); assert.equal(state.gatesPassed, 0);
});

test('brakes stop the car without reverse credit and cornering above grip runs wider', () => {
  const state = createRace(10000); startRace(state);
  run(state, 1.2, { throttle: 1 });
  const speed = state.car.speed; assert.ok(speed > 0);
  run(state, 1, { throttle: 1, brake: 1 });
  assert.equal(state.car.speed, 0);
  const gripState = createRace(10000); startRace(gripState); gripState.car.speed = 31;
  stepRace(gripState, { throttle: 1, steer: 1 }, 1 / 60);
  assert.equal(gripState.gripLimited, true);
  const nominalTurn = 31 / gripState.config.turnRadius / 60;
  assert.ok(Math.abs(gripState.car.heading - gripState.config.segments[0].heading) < nominalTurn);
});

test('step driving and real-time driving run identical physics for the same controls and duration', () => {
  const realtime = createRace(), stepped = createRace(); startRace(realtime); startRace(stepped);
  run(realtime, 9, { throttle: 1, steer: 1 });
  for (let i = 0; i < 36; i++) stepRace(stepped, { throttle: 1, steer: 1 }, 0.25);
  for (const field of ['x', 'z', 'heading', 'speed']) assert.ok(Math.abs(realtime.car[field] - stepped.car[field]) < 1e-7, field);
  assert.ok(Math.abs(realtime.elapsed - stepped.elapsed) < 1e-7);
  assert.equal(realtime.gatesPassed, stepped.gatesPassed);
});

test('all tier boundaries and the final race are reachable using steering and pedal inputs', () => {
  for (const level of [1, 2, 1999, 2000, 2001, 4000, 4001, 6000, 6001, 8000, 8001, 10000]) {
    const state = finishWithDriver(level);
    assert.equal(state.phase, 'won', `race ${level}: ${state.message}`);
    assert.equal(state.gatesPassed, state.config.laps * state.config.gateCount);
    assert.equal(state.sectorInvalid, false); assert.equal(state.penalty, 0);
    assert.ok(state.elapsed < state.config.timeLimit);
    assert.ok(state.projection.gap < state.config.width / 2 - CAR_HALF_WIDTH);
  }
});

test('the engineer guide is read-only and campaign storage records a qualified race exactly once', () => {
  const state = finishWithDriver(1), snapshot = structuredClone(state);
  drivingGuide(state); assert.deepEqual(state, snapshot);
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const campaign = createCampaign(storage);
  assert.equal(campaign.unlocked, 1);
  assert.equal(campaign.complete(state.config.level), true); assert.equal(campaign.complete(state.config.level), false);
  assert.deepEqual(JSON.parse(values.get(`adigun.campaign.v1.${CAMPAIGN_ID}`)), { version: 1, completed: 1, unlocked: 2 });
  assert.equal(createCampaign(storage).unlocked, 2);
  const blocked = createCampaign({ getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } });
  assert.equal(blocked.complete(1), true); assert.equal(blocked.unlocked, 2);
});
