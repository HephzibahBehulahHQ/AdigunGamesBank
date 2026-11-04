import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign } from '../shared/progression.js';
import { GOAL, BALL_RADIUS, GRAVITY, CAMPAIGN_ID, challengeFor, makeFlight, ballAt, planeTime, resolveFlight, createShootout, currentKick, currentOpponent, shoot, facePenalty, stepShootout, nextKick, pauseShootout, resumeShootout } from '../game17/penalty-engine.js';

const winningShot = state => { const kick = currentKick(state); return { aim: -kick.keeper.side * 13, elevation: 9, power: Math.min(85, kick.powerMax) }; };
const visibleDive = state => { const opponent = currentOpponent(state); return { targetX: opponent.targetX, high: opponent.high, delay: 80 }; };
function finishAttempt(state, interval = 0.05) {
  for (let i = 0; i < 300 && state.phase === 'flight'; i++) stepShootout(state, interval);
  assert.notEqual(state.phase, 'flight', 'every shot must resolve within its physical flight');
}
function firstHalf(state, count = 5, misses = 0) {
  for (let i = 0; i < count; i++) {
    assert.equal(shoot(state, i < misses ? { ...winningShot(state), aim: 24 } : winningShot(state)), true);
    finishAttempt(state); if (i < 4) assert.equal(nextKick(state), true);
  }
}
function wholeMatch(level = 1, { misses = 0, badDives = false } = {}) {
  const state = createShootout(level); firstHalf(state, 5, misses); nextKick(state);
  for (let i = 0; i < 5; i++) {
    const input = visibleDive(state); if (badDives) input.targetX *= -1;
    assert.equal(facePenalty(state, input), true); finishAttempt(state);
    if (i < 4) assert.equal(nextKick(state), true);
  }
  return state;
}

test('penalty campaign is deterministic and has explicit difficulty boundaries', () => {
  for (const level of [1, 1999, 2000, 2001, 4001, 8001, 10000]) assert.deepEqual(challengeFor(level), challengeFor(level));
  assert.equal(challengeFor(1).target, 3); assert.equal(challengeFor(4001).target, 4); assert.equal(challengeFor(8001).target, 5);
  assert.equal(challengeFor(10000).tier, 'Professional Master');
  assert.equal(challengeFor(-4).level, 1); assert.equal(challengeFor(NaN).level, 1);
  assert.equal(GOAL.width, 7.32); assert.equal(GOAL.height, 2.44); assert.equal(GOAL.distance, 11);
});

test('airborne trajectory follows stated launch velocity, gravity and crosswind units', () => {
  const kick = challengeFor(1).kicks[0], input = { aim: 10, elevation: 12, power: 75 };
  const calm = makeFlight(kick, input), windy = makeFlight({ ...kick, wind: 2 }, input), time = 0.25;
  const actual = ballAt(calm, time), drift = ballAt(windy, time);
  assert.ok(Math.abs(actual.x - calm.vx * time) < 1e-12);
  assert.ok(Math.abs(actual.y - (BALL_RADIUS + calm.vy * time - GRAVITY * time * time / 2)) < 1e-12);
  assert.ok(Math.abs(actual.z - (GOAL.distance - calm.vz * time)) < 1e-12);
  assert.ok(Math.abs(drift.x - actual.x - 0.5 * 2 * time * time) < 1e-12);
  assert.equal(calm.speed, 26);
});

test('grounded shots roll, slow down and never fall below the pitch', () => {
  const flight = makeFlight(challengeFor(1).kicks[0], { aim: 0, elevation: 0, power: 25 });
  assert.equal(flight.landAt, 0);
  for (const time of [0, 0.2, 1, flight.stopAt, flight.stopAt + 10]) assert.equal(ballAt(flight, time).y, BALL_RADIUS);
  assert.deepEqual(ballAt(flight, flight.stopAt), ballAt(flight, flight.stopAt + 10));
  const crossing = planeTime(flight, -BALL_RADIUS);
  assert.ok(crossing > GOAL.distance / flight.speed);
  assert.ok(Math.abs(ballAt(flight, crossing).z + BALL_RADIUS) < 1e-10);
});

test('post, crossbar, over-bar, wide, saved and goal outcomes follow physical intersections', () => {
  const kick = challengeFor(1).kicks[0];
  const result = settings => resolveFlight(makeFlight(kick, { aim: 13, elevation: 9, power: 85, ...settings }));
  assert.equal(result({ aim: 18.5 }).detail, 'right post');
  assert.equal(result({ aim: -18.5 }).detail, 'left post');
  assert.equal(result({ elevation: 16 }).detail, 'crossbar');
  assert.equal(result({ elevation: 28 }).detail, 'over the bar');
  assert.equal(result({ aim: 24 }).detail, 'wide of the goal');
  assert.equal(result({ aim: -13 }).outcome, 'saved');
  const goal = result({}); assert.equal(goal.outcome, 'goal');
  assert.ok(goal.position.z <= -BALL_RADIUS + 1e-10, 'the whole ball must cross the line');
  assert.ok(Math.abs(goal.position.x) + BALL_RADIUS < GOAL.width / 2);
  assert.ok(goal.position.y + BALL_RADIUS < GOAL.height);
});

test('one large simulation step cannot tunnel through the frame or change a save', () => {
  for (const aim of [-13, 18.5, 13, 24]) {
    const slow = createShootout(1), fast = createShootout(1), input = { aim, elevation: 9, power: 100 };
    shoot(slow, input); shoot(fast, input); finishAttempt(slow, 0.002); finishAttempt(fast, 4);
    assert.deepEqual(fast.log, slow.log); assert.deepEqual(fast.ball, slow.ball);
  }
});

test('a goal is not awarded before the physical line crossing, nor twice after it', () => {
  const state = createShootout(1); shoot(state, winningShot(state));
  stepShootout(state, state.result.time - 0.0001);
  assert.equal(state.goals, 0); assert.equal(state.log.length, 0); assert.equal(state.phase, 'flight');
  stepShootout(state, 0.001); assert.equal(state.goals, 1); assert.equal(state.log.length, 1);
  assert.equal(stepShootout(state, 8), false); assert.equal(state.goals, 1);
});

test('pause preserves the exact physical ball state and rejects shots until resumed', () => {
  const state = createShootout(1); shoot(state, winningShot(state)); stepShootout(state, 0.1);
  assert.equal(pauseShootout(state), true);
  const paused = structuredClone(state); assert.equal(stepShootout(state, 99), false);
  assert.equal(shoot(state, winningShot(state)), false); assert.deepEqual(state, paused);
  assert.equal(resumeShootout(state), true); finishAttempt(state);
  assert.equal(state.log[0].outcome, 'goal'); assert.equal(state.goals, 1);
});

test('five shots do not finish the game: five real goalkeeper turns remain', () => {
  const state = createShootout(1); firstHalf(state);
  assert.equal(state.phase, 'result'); assert.equal(state.goals, 5); assert.equal(state.winner, null);
  assert.equal(state.log.length, 5); assert.equal(state.role, 'shoot');
  assert.equal(shoot(state, winningShot(state)), false);
  assert.equal(nextKick(state), true); assert.equal(state.role, 'keeper');
  assert.equal(shoot(state, winningShot(state)), false); assert.equal(facePenalty(state, visibleDive(state)), true);
  finishAttempt(state); assert.equal(state.log[5].role, 'keeper'); assert.equal(state.saves, 1); assert.equal(state.opponentGoals, 0);
});

test('dive position and delay change contact, while opposition goals remain separate from saves', () => {
  const makeKeeperTurn = () => { const s = createShootout(1); firstHalf(s); nextKick(s); return s; };
  for (const mode of ['correct', 'opposite', 'late']) {
    const state = makeKeeperTurn(), input = visibleDive(state);
    if (mode === 'opposite') input.targetX *= -1;
    if (mode === 'late') input.delay = 300;
    facePenalty(state, input); finishAttempt(state);
    assert.equal(state.goals, 5);
    assert.equal(state.opponentGoals, mode === 'correct' ? 0 : 1);
    assert.equal(state.saves, mode === 'correct' ? 1 : 0);
  }
});

test('win, draw, defeat and insufficient-goal-target are finite and accurate', () => {
  const win = wholeMatch(1), draw = wholeMatch(1, { badDives: true }), loss = wholeMatch(1, { misses: 5, badDives: true });
  assert.equal(win.phase, 'won'); assert.deepEqual([win.goals, win.opponentGoals, win.saves], [5, 0, 5]);
  assert.equal(draw.phase, 'draw'); assert.deepEqual([draw.goals, draw.opponentGoals, draw.saves], [5, 5, 0]);
  assert.equal(loss.phase, 'lost'); assert.deepEqual([loss.goals, loss.opponentGoals, loss.saves], [0, 5, 0]);
  const target = wholeMatch(10000, { misses: 1 });
  assert.equal(target.winner, 'player'); assert.equal(target.goals, 4); assert.equal(target.phase, 'lost');
  for (const state of [win, draw, loss, target]) {
    assert.equal(state.log.length, 10); assert.equal(nextKick(state), false);
    assert.equal(facePenalty(state, { targetX: 0 }), false); assert.equal(stepShootout(state, 100), false);
  }
});

test('invalid shot settings, unavailable power and malformed dive commands are rejected before mutation', () => {
  const state = createShootout(10000);
  for (const input of [{ aim: NaN }, { aim: 25 }, { elevation: -1 }, { power: Infinity }, { power: 101 }]) {
    assert.throws(() => shoot(state, input)); assert.equal(state.phase, 'ready'); assert.equal(state.log.length, 0);
  }
  assert.throws(() => shoot(state, { aim: 13, elevation: 9, power: 100 }), /at most/);
  assert.equal(facePenalty(state, { targetX: 1 }), false);
  firstHalf(state); nextKick(state);
  for (const input of [{ targetX: 4 }, { targetX: NaN }, { delay: 0 }, { delay: Infinity }, { high: 'high' }]) {
    assert.throws(() => facePenalty(state, input)); assert.equal(state.phase, 'ready'); assert.equal(state.log.length, 5);
  }
});

test('campaign saves sequential wins across instances and refuses skipped levels', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const first = campaign(CAMPAIGN_ID, storage); assert.equal(first.complete(2), false);
  const state = wholeMatch(1); assert.equal(state.phase, 'won'); assert.equal(first.complete(state.config.level), true);
  const reloaded = campaign(CAMPAIGN_ID, storage); assert.equal(reloaded.completed, 1); assert.equal(reloaded.unlocked, 2);
  assert.equal(reloaded.complete(1), false); assert.equal(reloaded.complete(3), false);
  assert.deepEqual(JSON.parse(data.get(`adigun.campaign.v1.${CAMPAIGN_ID}`)), { version: 1, completed: 1, unlocked: 2 });
});

test('all 10,000 distinct physical campaigns complete through shots and goalkeeper controls', { timeout: 60000 }, t => {
  const layouts = new Set(); let actualShots = 0, actualSaves = 0;
  for (let level = 1; level <= 10000; level++) {
    const state = createShootout(level);
    const signature = JSON.stringify({ kicks: state.config.kicks, opponents: state.config.opponents });
    assert.equal(layouts.has(signature), false, `repeated physical configuration at ${level}`); layouts.add(signature);
    for (let round = 0; round < 10; round++) {
      if (state.role === 'shoot') { assert.equal(shoot(state, winningShot(state)), true); actualShots++; }
      else { assert.equal(facePenalty(state, visibleDive(state)), true); actualSaves++; }
      finishAttempt(state, 0.06);
      assert.ok(Number.isFinite(state.ball.x + state.ball.y + state.ball.z));
      if (round < 9) assert.equal(nextKick(state), true);
    }
    assert.equal(state.phase, 'won', `campaign ${level}: ${state.goals}–${state.opponentGoals}`);
    assert.equal(state.goals, 5); assert.equal(state.opponentGoals, 0); assert.equal(state.saves, 5);
  }
  assert.equal(layouts.size, 10000); assert.equal(actualShots, 50000); assert.equal(actualSaves, 50000);
  t.diagnostic('10,000 deterministic campaigns; 50,000 physically resolved shots and 50,000 physically resolved saves. Numerical evidence, not 10,000 manual playtests.');
});
