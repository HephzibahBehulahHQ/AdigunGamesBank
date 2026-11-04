import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELD, levelConfig, createMatch, startMatch, stepMatch, pauseMatch, resumeMatch, selectPlayer, switchPlayer, passBall, shootBall } from '../game11/engine.js';

function clearFlight() {
  const s = createMatch(1); startMatch(s);
  s.players.forEach((p, i) => { p.x = -40 + i * 2; p.y = 25; p.vx = p.vy = 0; });
  Object.assign(s.ball, { owner: null, x: 0, y: 0, z: FIELD.ballRadius, vx: 0, vy: 0, vz: 0, ignoreTime: 0 });
  return s;
}

test('football has 10,000 valid, reproducible configurations with distinct gameplay parameters', () => {
  const distinct = new Set();
  for (let level = 1; level <= 10000; level++) {
    const c = levelConfig(level);
    assert.equal(c.level, level);
    assert.ok(c.opponentSpeed >= 4.65 && c.opponentSpeed <= 6.5);
    assert.ok(c.opponentSkill >= 0.25 && c.opponentSkill <= 0.95);
    assert.ok(c.decisionInterval >= 0.28 && c.decisionInterval <= 1);
    assert.ok(c.matchSeconds >= 120 && c.matchSeconds <= 180);
    assert.ok(c.winMargin >= 1 && c.winMargin <= 3);
    assert.deepEqual(c, levelConfig(level));
    const { level: ignoredLevel, seed, tier, opponent, ...gameplay } = c;
    distinct.add(JSON.stringify(gameplay));
  }
  assert.equal(distinct.size, 10000);
  assert.equal(levelConfig(1).tier, 'Beginner');
  assert.equal(levelConfig(10000).tier, 'Professional Master');
  assert.equal(levelConfig(-9).level, 1);
});

test('an 11v11 match has original team identities, one keeper per team and no pre-kickoff motion', () => {
  const s = createMatch(1);
  assert.equal(s.players.length, 22);
  for (const team of [0, 1]) {
    assert.equal(s.players.filter(p => p.team === team).length, 11);
    assert.equal(s.players.filter(p => p.team === team && p.keeper).length, 1);
  }
  const before = JSON.stringify(s);
  stepMatch(s, { x: 1, shoot: true }, 0.1);
  assert.equal(JSON.stringify(s), before);
  assert.equal(passBall(s), false);
  assert.equal(shootBall(s), false);
});

test('switching and pointer selection only change control, never player positions or possession', () => {
  const s = createMatch(1); startMatch(s);
  const before = JSON.stringify(s.players), owner = s.ball.owner;
  assert.equal(selectPlayer(s, 'h4'), true);
  assert.equal(s.controlledId, 'h4');
  assert.equal(selectPlayer(s, 'a4'), false);
  switchPlayer(s);
  assert.equal(JSON.stringify(s.players), before);
  assert.equal(s.ball.owner, owner);
});

test('a pass releases a physical ball and cannot be made twice without possession', () => {
  const s = createMatch(1); startMatch(s);
  assert.equal(passBall(s, 'h9'), true);
  assert.equal(s.ball.owner, null);
  assert.ok(Math.hypot(s.ball.vx, s.ball.vy) > 12);
  assert.equal(passBall(s), false);
  assert.equal(s.stats.passes[0], 1);
  const x = s.ball.x, y = s.ball.y;
  stepMatch(s, {}, 1 / 60);
  assert.ok(Math.hypot(s.ball.x - x, s.ball.y - y) > 0);
});

test('a goal requires the entire ball to cross inside the posts and below the crossbar', () => {
  const s = clearFlight();
  Object.assign(s.ball, { x: 52.4, y: 0, z: 0.4, vx: 6, vy: 0, vz: 0 });
  stepMatch(s, {}, 1 / 60);
  assert.equal(s.score[0], 0, 'a ball over the centre of the line is not wholly across');
  stepMatch(s, {}, 0.05);
  assert.equal(s.score[0], 1);
  assert.equal(s.phase, 'goal');
  const afterGoal = s.score[0];
  stepMatch(s, {}, 0.25);
  assert.equal(s.score[0], afterGoal, 'one crossing gives one goal');
});

test('outside and above-goal shots restart play without scoring', () => {
  for (const [y, z] of [[6, 0.4], [0, 3.5]]) {
    const s = clearFlight();
    Object.assign(s.ball, { x: 52.1, y, z, vx: 30, vy: 0, vz: 0, lastTouch: 0 });
    stepMatch(s, {}, 0.05);
    assert.deepEqual(s.score, [0, 0]);
    assert.equal(s.phase, 'restart');
    assert.match(s.event, /Goal kick/);
  }
});

test('solid posts and crossbar reflect shots instead of awarding a goal', () => {
  for (const [y, z] of [[FIELD.goalWidth / 2, 0.7], [0, FIELD.goalHeight]]) {
    const s = clearFlight();
    Object.assign(s.ball, { x: 52.1, y, z, vx: 30, vy: 0, vz: 0 });
    stepMatch(s, {}, 1 / 60);
    assert.deepEqual(s.score, [0, 0]);
    assert.ok(s.ball.vx < 0);
    assert.match(s.event, /goal frame/);
  }
});

test('goalkeeper swept contact saves a fast low shot', () => {
  const s = clearFlight(), keeper = s.players.find(p => p.id === 'a1');
  keeper.x = 50; keeper.y = 0;
  Object.assign(s.ball, { x: 48.8, y: 0, z: 0.4, vx: 30, vy: 0, vz: 0 });
  stepMatch(s, {}, 1 / 60);
  assert.equal(s.ball.owner, keeper.id);
  assert.equal(s.stats.saves[1], 1);
  assert.deepEqual(s.score, [0, 0]);
});

test('touchline exits award a throw-in to the other team', () => {
  const s = clearFlight();
  Object.assign(s.ball, { x: 10, y: 34.1, z: 0.4, vx: 0, vy: 15, vz: 0, lastTouch: 0 });
  stepMatch(s, {}, 1 / 60);
  assert.equal(s.phase, 'restart');
  assert.match(s.event, /Throw-in/);
  assert.equal(s.players.find(p => p.id === s.ball.owner).team, 1);
});

test('fixed-step simulation behaves consistently across frame durations', () => {
  const a = createMatch(500), b = createMatch(500); startMatch(a); startMatch(b);
  for (let i = 0; i < 30; i++) stepMatch(a, { x: 1, y: -0.2 }, 0.1);
  for (let i = 0; i < 60; i++) stepMatch(b, { x: 1, y: -0.2 }, 0.05);
  assert.ok(Math.abs(a.elapsed - b.elapsed) < 1e-8);
  for (let i = 0; i < a.players.length; i++) {
    assert.ok(Math.abs(a.players[i].x - b.players[i].x) < 1e-8);
    assert.ok(Math.abs(a.players[i].y - b.players[i].y) < 1e-8);
  }
});

test('pausing freezes the clock and pending input; resume continues without a jump', () => {
  const s = createMatch(1); startMatch(s);
  stepMatch(s, { x: 1 }, 0.1); pauseMatch(s);
  const before = JSON.stringify(s);
  stepMatch(s, { shoot: true }, 0.25);
  assert.equal(JSON.stringify(s), before);
  resumeMatch(s); stepMatch(s, {}, 1 / 60);
  assert.ok(s.elapsed < 0.13);
  assert.equal(s.stats.shots[0], 0);
});

test('full-time evaluates the actual score and campaign target, then freezes the match', () => {
  for (const [level, score, qualified] of [[1, [1, 0], true], [1, [0, 0], false], [1, [0, 1], false], [10000, [2, 1], false], [10000, [3, 0], true]]) {
    const s = createMatch(level); startMatch(s);
    s.score = score; s.elapsed = s.config.matchSeconds - 1 / 60;
    stepMatch(s, {}, 1 / 60);
    assert.equal(s.phase, 'fulltime');
    assert.equal(s.qualified, qualified);
    const done = JSON.stringify(s);
    stepMatch(s, { x: 1, shoot: true }, 0.25);
    assert.equal(JSON.stringify(s), done);
  }
});

test('an unattended match reaches full-time with finite actors and bounded ball height', () => {
  const s = createMatch(1); startMatch(s);
  for (let tick = 0; tick < 1000 && s.phase !== 'fulltime'; tick++) stepMatch(s, {}, 0.25);
  assert.equal(s.phase, 'fulltime');
  for (const p of s.players) for (const field of ['x', 'y', 'vx', 'vy', 'stamina']) assert.ok(Number.isFinite(p[field]));
  for (const field of ['x', 'y', 'z', 'vx', 'vy', 'vz']) assert.ok(Number.isFinite(s.ball[field]));
  assert.ok(s.ball.z >= FIELD.ballRadius);
});
