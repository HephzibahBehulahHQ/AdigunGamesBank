import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign } from '../shared/progression.js';
import { keeperPose } from '../game17/penalty-engine.js';
import {
  CAMPAIGN_ID, LEVEL_COUNT, GOAL, BALL_RADIUS, GRAVITY, ZONES, MAX_STEP_SECONDS,
  goalLineLevel, createShootout, currentKick, shotSettings, ballAt, readKeeper,
  setAim, setPower, advanceRead, feint, shoot, nextKick, stepShootout,
  pauseShootout, resumeShootout
} from '../game9/goal-line-engine.js';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

function settle(state, step = 4) {
  for (let tick = 0; tick < 5000 && state.phase === 'flight'; tick++) stepShootout(state, step);
  assert.notEqual(state.phase, 'flight', 'every kick has a finite resolution');
}

// Reference player uses only commands and information also displayed in the UI.
// No outcome, collision, internal RNG or hidden solution is consulted.
function placeWinner(state) {
  assert.equal(setAim(state, 'middle-left'), true);
  assert.equal(feint(state), true);
  for (let step = 0; step < 4; step++) assert.equal(advanceRead(state, 0.1), true);
  assert.equal(readKeeper(state).committed, true);
  assert.equal(setAim(state, 'middle-right'), true);
  assert.equal(setPower(state, Math.min(85, currentKick(state).powerMax)), true);
  assert.equal(shoot(state), true);
  settle(state);
}

function wholeMatch(level = 1, misses = 0) {
  const state = createShootout(level);
  for (let kick = 0; kick < 5; kick++) {
    if (kick < misses) { setAim(state, 'middle-centre'); shoot(state); settle(state); }
    else placeWinner(state);
    if (kick < 4) assert.equal(nextKick(state), true);
  }
  return state;
}

test('Goal Line has deterministic physical configurations and explicit difficulty boundaries', () => {
  for (const level of [1, 2000, 2001, 4001, 6001, 8001, 10000]) {
    assert.deepEqual(goalLineLevel(level), goalLineLevel(level));
    assert.equal(goalLineLevel(level).kicks.length, 5);
  }
  assert.equal(LEVEL_COUNT, 10000);
  assert.equal(goalLineLevel(1).target, 3); assert.equal(goalLineLevel(4001).target, 4);
  assert.equal(goalLineLevel(8001).target, 5); assert.equal(goalLineLevel(10000).tier, 'Professional Master');
  assert.ok(goalLineLevel(10000).kicks[0].diveSpeed > goalLineLevel(1).kicks[0].diveSpeed);
  assert.ok(goalLineLevel(10000).kicks[0].commitWindow < goalLineLevel(1).kicks[0].commitWindow);
  for (const level of [0, -1, 10001, 1.1, NaN, Infinity, '2', null, true]) {
    assert.throws(() => goalLineLevel(level), RangeError);
    assert.throws(() => createShootout(level), RangeError);
  }
});

test('all nine target presets solve the stated calm-air ballistic locations at reference power', () => {
  assert.equal(new Set(ZONES.map(zone => zone.id)).size, 9);
  assert.equal(GOAL.width, 7.32); assert.equal(GOAL.height, 2.44); assert.equal(GOAL.distance, 11);
  for (const zone of ZONES) {
    const state = createShootout(1); setAim(state, zone.id); shoot(state);
    const flight = state.flight, crossing = (GOAL.distance + BALL_RADIUS) / flight.vz;
    const position = ballAt(flight, crossing);
    close(position.x, zone.x); close(position.y, zone.y); close(position.z, -BALL_RADIUS);
    assert.ok(Object.isFrozen(zone));
  }
  assert.ok(Object.isFrozen(ZONES));
  assert.throws(() => shotSettings('unknown'), RangeError);
  assert.throws(() => shotSettings('middle-right', '85'), RangeError);
});

test('readable keeper position comes from continuous patrol, with no random save selection', () => {
  const state = createShootout(1), kick = currentKick(state), before = structuredClone(state.keeper);
  close(before.x, kick.patrolAmplitude * Math.sin(kick.patrolPhase));
  assert.equal(readKeeper(state).stage, 'patrolling');
  assert.equal(advanceRead(state, 0.1), true);
  close(state.keeper.x, kick.patrolAmplitude * Math.sin(kick.patrolPhase + kick.patrolRate * 0.1));
  assert.notEqual(state.keeper.x, before.x);
  assert.deepEqual([state.keeper.y, state.keeper.z, state.keeper.angle], [1, 0, 0]);
  assert.equal(state.goals, 0); assert.equal(state.kickIndex, 0); assert.equal(state.log.length, 0);
});

test('one-use feint captures its own direction while aim remains independently editable', () => {
  const state = createShootout(1);
  assert.equal(feint(state), false); assert.equal(shoot(state), false);
  setAim(state, 'top-left'); assert.equal(feint(state), true);
  const target = state.feintPlan.targetX;
  setAim(state, 'middle-right'); assert.equal(feint(state), false);
  assert.equal(state.feintPlan.zoneId, 'top-left'); assert.equal(target, -2.8);
  assert.equal(state.zoneId, 'middle-right'); assert.equal(state.feintPlan.targetX, target);
  assert.equal(readKeeper(state).stage, 'baiting'); close(readKeeper(state).opensIn, 0.25);
  advanceRead(state, 0.25);
  assert.equal(readKeeper(state).stage, 'committed');
  assert.equal(readKeeper(state).direction, 'left'); close(readKeeper(state).remaining, 1.1);
  const before = state.keeper.x; advanceRead(state, 0.1);
  assert.ok(state.keeper.x < before, 'the keeper visibly moves toward the false target');
});

test('commitment starts and expires at exact boundaries, and cannot be renewed', () => {
  const state = createShootout(10000); setAim(state, 'middle-left'); feint(state);
  const plan = state.feintPlan;
  stepShootout(state, plan.commitAt);
  assert.equal(readKeeper(state).committed, true);
  close(readKeeper(state).remaining, currentKick(state).commitWindow);
  stepShootout(state, plan.expiresAt - state.readTime);
  assert.equal(readKeeper(state).committed, false); assert.equal(readKeeper(state).remaining, 0);
  assert.equal(readKeeper(state).stage, 'recovering');
  stepShootout(state, currentKick(state).recoveryTime + 0.01);
  assert.equal(readKeeper(state).stage, 'patrolling'); assert.equal(state.feintUsed, true);
  setAim(state, 'middle-right'); assert.equal(feint(state), false);
  shoot(state); assert.equal(state.flight.usedCommitment, false);
  assert.equal(state.flight.kick.keeper.targetX, 2.8, 'expired feint no longer directs the dive');
});

test('early, correctly timed and expired feints produce different physical contacts', () => {
  const samples = [];
  for (const wait of [0.1, 0.4, 1.5]) {
    const state = createShootout(10000); setAim(state, 'middle-left'); feint(state);
    stepShootout(state, wait); setAim(state, 'middle-right'); shoot(state); settle(state);
    samples.push(state.log[0]);
  }
  assert.deepEqual(samples.map(result => result.outcome), ['saved', 'goal', 'saved']);
  assert.deepEqual(samples.map(result => result.usedCommitment), [false, true, false]);
  assert.ok(samples[0].time < samples[1].time); assert.ok(samples[2].time < samples[1].time);
});

test('read-only patience does not lose a kick, and equivalent step commands keep the same timeline', () => {
  const state = createShootout(1);
  for (let minute = 0; minute < 20; minute++) assert.equal(stepShootout(state, MAX_STEP_SECONDS), true);
  assert.equal(state.readTime, 1200); assert.equal(state.phase, 'ready'); assert.equal(state.kickIndex, 0);
  assert.ok(Number.isFinite(state.keeper.x));
  const one = createShootout(8001), many = createShootout(8001);
  for (const game of [one, many]) { setAim(game, 'middle-left'); feint(game); }
  stepShootout(one, 0.5); for (let i = 0; i < 4; i++) advanceRead(many, 0.125);
  assert.deepEqual(one, many);
});

test('invalid or impractically huge simulation steps are rejected before any mutation', () => {
  const state = createShootout(10000), initial = structuredClone(state);
  for (const seconds of [0, -1, NaN, Infinity, -Infinity, Number.MAX_VALUE, MAX_STEP_SECONDS + 1, '1', null]) {
    assert.equal(stepShootout(state, seconds), false); assert.deepEqual(state, initial);
  }
  for (const seconds of [0, -1, 0.251, 1, NaN, Infinity, Number.MAX_VALUE, '0.1', null]) {
    assert.throws(() => advanceRead(state, seconds), RangeError); assert.deepEqual(state, initial);
  }
  assert.equal(advanceRead(state), true); close(state.readTime, 0.1);
});

test('target and power validation is atomic and respects each kick power limit', () => {
  const state = createShootout(10000), initial = structuredClone(state);
  for (const zone of ['', 'left', 'Top left', 0, null, {}, undefined]) {
    assert.throws(() => setAim(state, zone), RangeError); assert.deepEqual(state, initial);
  }
  for (const power of [24.99, currentKick(state).powerMax + 1, NaN, Infinity, '85', null, true]) {
    assert.throws(() => setPower(state, power), RangeError); assert.deepEqual(state, initial);
  }
  assert.equal(setPower(state, 25), true); assert.equal(state.power, 25);
  assert.equal(setPower(state, currentKick(state).powerMax), true);
});

test('ball flight follows gravity and declared wind acceleration in metres and seconds', () => {
  const state = createShootout(8001); setAim(state, 'top-right'); setPower(state, 75); shoot(state);
  const flight = state.flight, settings = shotSettings('top-right', 75), time = 0.2;
  const speed = 8 + 75 * 0.24, aim = settings.aim * Math.PI / 180, elevation = settings.elevation * Math.PI / 180;
  const actual = ballAt(flight, time);
  close(actual.x, speed * Math.cos(elevation) * Math.sin(aim) * time + currentKick(state).wind * time ** 2 / 2);
  close(actual.y, BALL_RADIUS + speed * Math.sin(elevation) * time - GRAVITY * time ** 2 / 2);
  close(actual.z, GOAL.distance - speed * Math.cos(elevation) * Math.cos(aim) * time);
  assert.ok(flight.landAt > time);
});

test('power changes flight time and gravity drop while target angles stay fixed', () => {
  const shots = [55, 85].map(power => {
    const state = createShootout(1); setAim(state, 'top-right'); setPower(state, power); shoot(state);
    const crossing = (GOAL.distance + BALL_RADIUS) / state.flight.vz;
    return { settings: state.flight.settings, crossing, position: ballAt(state.flight, crossing) };
  });
  assert.equal(shots[0].settings.aim, shots[1].settings.aim);
  assert.equal(shots[0].settings.elevation, shots[1].settings.elevation);
  assert.ok(shots[0].crossing > shots[1].crossing); assert.ok(shots[0].position.y < shots[1].position.y);
  close(shots[1].position.y, 1.95);
});

test('public controls can produce real frame, wide, save and goal outcomes', () => {
  const samples = [
    { level: 8001, zone: 'top-left', power: 25, outcome: 'post', detail: 'left post' },
    { level: 8001, zone: 'top-left', power: 27, outcome: 'miss', detail: 'wide of the goal' },
    { level: 1, zone: 'middle-centre', power: 85, outcome: 'saved' },
    { level: 1, zone: 'middle-right', power: 85, outcome: 'goal' }
  ];
  for (const sample of samples) {
    const state = createShootout(sample.level); setAim(state, sample.zone); setPower(state, sample.power); shoot(state); settle(state);
    const result = state.log[0]; assert.equal(result.outcome, sample.outcome);
    if (sample.detail) assert.equal(result.detail, sample.detail);
    if (result.outcome === 'goal') {
      close(result.position.z, -BALL_RADIUS); assert.ok(Math.abs(result.position.x) + BALL_RADIUS < GOAL.width / 2);
      assert.ok(result.position.y + BALL_RADIUS < GOAL.height);
    } else if (result.outcome === 'post' || result.outcome === 'saved') assert.ok(result.position.z > -BALL_RADIUS);
    assert.equal(state.goals, result.outcome === 'goal' ? 1 : 0);
  }
});

test('flight begins at the observed keeper position and uses identical visible collision capsules', () => {
  const state = createShootout(4001); setAim(state, 'middle-left'); feint(state); stepShootout(state, 0.5);
  const observed = structuredClone(state.keeper);
  setAim(state, 'middle-right'); shoot(state);
  assert.deepEqual(state.keeper, observed);
  for (const dt of [0.01, 0.03, 0.1]) {
    stepShootout(state, dt);
    assert.deepEqual(state.keeper, keeperPose(state.flight.kick, state.elapsed));
  }
});

test('a large rendering step cannot tunnel past a keeper or post or alter the result', () => {
  for (const sample of [
    [1, 'middle-centre', 85], [1, 'middle-right', 85],
    [8001, 'top-left', 25], [8001, 'top-left', 27]
  ]) {
    const [level, zone, power] = sample, slow = createShootout(level), fast = createShootout(level);
    for (const state of [slow, fast]) { setAim(state, zone); setPower(state, power); shoot(state); }
    settle(slow, 0.001); settle(fast, MAX_STEP_SECONDS);
    assert.deepEqual(slow.log, fast.log); assert.deepEqual(slow.ball, fast.ball); assert.deepEqual(slow.keeper, fast.keeper);
  }
});

test('goals are awarded only after the entire ball crosses, and never awarded twice', () => {
  const state = createShootout(1); setAim(state, 'middle-right'); shoot(state);
  assert.equal(state.result.outcome, 'goal');
  stepShootout(state, state.result.time - 0.0001);
  assert.equal(state.goals, 0); assert.equal(state.log.length, 0); assert.equal(state.phase, 'flight');
  assert.ok(state.ball.z > -BALL_RADIUS);
  stepShootout(state, 0.001);
  assert.equal(state.goals, 1); assert.equal(state.log.length, 1); assert.equal(state.phase, 'result');
  const final = structuredClone(state);
  assert.equal(stepShootout(state, 4), false); assert.equal(shoot(state), false); assert.deepEqual(state, final);
});

test('pausing either a live read or a flight freezes the exact state and resumes its original phase', () => {
  for (const phase of ['ready', 'flight']) {
    const state = createShootout(4001); setAim(state, 'middle-left'); feint(state); advanceRead(state, 0.1);
    if (phase === 'flight') { setAim(state, 'middle-right'); shoot(state); stepShootout(state, 0.1); }
    assert.equal(pauseShootout(state), true); assert.equal(state.resumePhase, phase);
    const paused = structuredClone(state);
    for (const action of [() => stepShootout(state, 10), () => advanceRead(state), () => setAim(state, 'low-left'), () => setPower(state, 25), () => feint(state), () => shoot(state), () => nextKick(state), () => pauseShootout(state)]) {
      assert.equal(action(), false); assert.deepEqual(state, paused);
    }
    assert.equal(resumeShootout(state), true); assert.equal(state.phase, phase); assert.equal(state.resumePhase, null);
    if (phase === 'ready') { advanceRead(state, 0.2); assert.equal(readKeeper(state).committed, true); }
    else { settle(state); assert.equal(state.log.length, 1); }
  }
});

test('next kick clears its read and feint, retains valid power and requires a new aim', () => {
  const state = createShootout(10000); placeWinner(state);
  const lastLog = structuredClone(state.log);
  assert.equal(state.phase, 'result'); assert.equal(nextKick(state), true);
  assert.equal(state.phase, 'ready'); assert.equal(state.zoneId, null); assert.equal(state.feintPlan, null);
  assert.equal(state.feintUsed, false); assert.equal(state.readTime, 0); assert.equal(state.elapsed, 0);
  assert.equal(state.flight, null); assert.equal(state.result, null); assert.deepEqual(state.log, lastLog);
  assert.ok(state.power <= currentKick(state).powerMax); assert.equal(shoot(state), false);
  assert.deepEqual(state.ball, { x: 0, y: BALL_RADIUS, z: GOAL.distance });
});

test('Goal Line completes exactly five striker attempts and applies its goal target', () => {
  const win = wholeMatch(1), loss = wholeMatch(1, 5), narrow = wholeMatch(1, 3), master = wholeMatch(10000);
  assert.equal(win.phase, 'won'); assert.equal(win.goals, 5); assert.equal(loss.phase, 'lost'); assert.equal(loss.goals, 0);
  assert.equal(narrow.phase, 'lost'); assert.equal(narrow.goals, 2);
  assert.equal(master.phase, 'won'); assert.equal(master.goals, 5); assert.equal(master.config.target, 5);
  for (const state of [win, loss, narrow, master]) {
    assert.equal(state.kickIndex, 5); assert.equal(state.log.length, 5);
    assert.deepEqual(state.log.map(result => result.kick), [1, 2, 3, 4, 5]);
    const terminal = structuredClone(state);
    for (const action of [() => nextKick(state), () => shoot(state), () => feint(state), () => setAim(state, 'low-right'), () => setPower(state, 25), () => advanceRead(state), () => stepShootout(state, 1), () => pauseShootout(state), () => resumeShootout(state)]) {
      assert.equal(action(), false); assert.deepEqual(state, terminal);
    }
  }
});

test('a failed kick does not erase earlier goals, and retry creates fresh deterministic state', () => {
  const state = createShootout(1); placeWinner(state); nextKick(state);
  setAim(state, 'middle-centre'); shoot(state); settle(state);
  assert.equal(state.log[1].outcome, 'saved'); assert.equal(state.goals, 1); assert.equal(state.phase, 'result');
  const retry = createShootout(state.config.level);
  assert.equal(retry.goals, 0); assert.equal(retry.log.length, 0); assert.equal(retry.feintUsed, false);
  assert.deepEqual(retry.config, state.config); assert.notEqual(retry.config, state.config);
});

test('campaign progress persists sequential wins without accepting skips or another game save', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  data.set('adigun.campaign.v1.penalty-pro', JSON.stringify({ version: 1, completed: 99, unlocked: 100 }));
  const first = campaign(CAMPAIGN_ID, storage); assert.equal(first.unlocked, 1); assert.equal(first.complete(2), false);
  const winner = wholeMatch(1); assert.equal(winner.phase, 'won'); assert.equal(first.complete(winner.config.level), true);
  const second = campaign(CAMPAIGN_ID, storage); assert.equal(second.completed, 1); assert.equal(second.unlocked, 2);
  assert.equal(second.complete(1), false); assert.equal(second.complete(3), false);
});

test('all 10,000 distinct configurations complete through 50,000 public-control kicks', () => {
  const signatures = new Set(); let kicks = 0;
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const state = createShootout(level), signature = JSON.stringify(state.config.kicks);
    assert.equal(signatures.has(signature), false, `duplicate physical configuration at ${level}`);
    signatures.add(signature);
    for (let kick = 0; kick < 5; kick++) {
      placeWinner(state); kicks++;
      assert.equal(state.log.at(-1).outcome, 'goal', `level ${level}, kick ${kick + 1}`);
      assert.ok(state.log.at(-1).usedCommitment);
      if (kick < 4) assert.equal(nextKick(state), true);
    }
    assert.equal(state.phase, 'won', `level ${level}`); assert.equal(state.goals, 5);
  }
  assert.equal(signatures.size, 10000); assert.equal(kicks, 50000);
});
