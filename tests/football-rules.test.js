import test from 'node:test';
import assert from 'node:assert/strict';
import { offsideSnapshot, tackleDecision, inPenaltyArea } from '../game11/rules.js';

const actor = (id, team, x, y = 0) => ({ id, team, x, y, vx: 0, vy: 0, facingX: team === 0 ? 1 : -1, facingY: 0, active: true });

test('offside uses the second-last opponent, ball and attacking half; level positions stay onside', () => {
  const kicker = actor('h1', 0, 10), receiver = actor('h2', 0, 31);
  const players = [kicker, receiver, actor('h3', 0, 30), actor('a1', 1, 40), actor('a2', 1, 30)];
  assert.deepEqual(offsideSnapshot(players, { x: 10 }, kicker).candidates, ['h2']);
  assert.deepEqual(offsideSnapshot(players, { x: 32 }, kicker).candidates, []);
  receiver.x = -1; players[2].x = -2; players[3].x = -10; players[4].x = -20;
  assert.deepEqual(offsideSnapshot(players, { x: -15 }, kicker).candidates, []);
});

test('offside mirrors for both teams and only direct corner, goal-kick and throw-in receptions are exempt', () => {
  const kicker = actor('a1', 1, -10), receiver = actor('a2', 1, -31);
  const players = [kicker, receiver, actor('h1', 0, -40), actor('h2', 0, -30)];
  assert.deepEqual(offsideSnapshot(players, { x: -10 }, kicker).candidates, ['a2']);
  for (const type of ['Corner', 'Goal kick', 'Throw-in']) assert.deepEqual(offsideSnapshot(players, { x: -10 }, kicker, type).candidates, []);
  assert.deepEqual(offsideSnapshot(players, { x: -10 }, kicker, 'Direct free kick').candidates, ['a2']);
});

test('a reachable ball-first tackle is legal, a slow body-first contact is a foul without an automatic card', () => {
  const holder = actor('h1', 0, 0), challenger = actor('a1', 1, 1.1), ball = { owner: 'h1', x: 0.78, y: 0 };
  assert.equal(tackleDecision([holder, challenger], ball, challenger, holder).foul, false);
  challenger.x = -1;
  const foul = tackleDecision([holder, challenger], ball, challenger, holder);
  assert.equal(foul.foul, true); assert.equal(foul.sanction, null); assert.equal(foul.penalty, false);
  challenger.vx = 8;
  assert.equal(tackleDecision([holder, challenger], ball, challenger, holder).sanction, 'yellow');
});

test('penalty-area and DOGSO decisions distinguish genuine ball challenges from no-ball contact', () => {
  const holder = actor('h1', 0, 40), challenger = actor('a2', 1, 40, 1.3), keeper = actor('a1', 1, 51);
  const ball = { owner: holder.id, x: 40.78, y: 0 };
  const inside = tackleDecision([holder, challenger, keeper], ball, challenger, holder);
  assert.equal(inside.penalty, true); assert.equal(inside.dogso, true); assert.equal(inside.sanction, 'yellow');
  challenger.x = 39; challenger.y = 0;
  assert.equal(tackleDecision([holder, challenger, keeper], ball, challenger, holder).sanction, 'red');
  holder.x = 30; challenger.x = 30; challenger.y = 1.3; ball.x = 30.78;
  const outside = tackleDecision([holder, challenger, keeper], ball, challenger, holder);
  assert.equal(outside.penalty, false); assert.equal(outside.sanction, 'red');
  assert.equal(inPenaltyArea({ x: -40, y: 0 }, 0), true);
  assert.equal(inPenaltyArea({ x: -40, y: 0 }, 1), false);
});

test('excessive relative speed is sanctioned even when the ball is reachable', () => {
  const holder = actor('h1', 0, 0), challenger = actor('a1', 1, 1.1), ball = { owner: 'h1', x: 0.78, y: 0 };
  holder.vx = 6; challenger.vx = -8;
  const result = tackleDecision([holder, challenger], ball, challenger, holder);
  assert.equal(result.foul, true); assert.equal(result.severity, 'serious'); assert.equal(result.sanction, 'red');
});
