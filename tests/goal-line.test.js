import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVEL_COUNT } from '../shared/progression.js';
import { THREE } from '../shared/three-stage.js';
import { BALL_RADIUS, GOAL_HALF_WIDTH, GOAL_POST_RADIUS, NET_DEPTH, STEP, SAFETY_LINE, advance, clear, createDrill, goalNetImpact, incomingAt, nextFeed, planClearance, readContact, receiverAt } from '../game9/clearance.js';
import { lateralStep, solveLeg } from '../game9/leg-reach.js';

export function playPlan(feed) {
  const tick = Math.round(feed.approachTime / STEP);
  const moves = Math.round(feed.crossing / 0.45);
  const targetAngle = Math.round(Math.atan((feed.channel - feed.crossing - feed.drift * SAFETY_LINE) / SAFETY_LINE) * 180 / Math.PI);
  return { tick, moves, targetAngle };
}

test('all 10,000 distinct Goal Line drills can be completed through the public commands', () => {
  const configurations = new Set();
  let blockedGateShots = 0;
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const state = createDrill(level);
    configurations.add(JSON.stringify(state.feeds));
    for (const [index, feed] of state.feeds.entries()) {
      const { tick, moves, targetAngle } = playPlan(feed);
      for (let i = 0; i < tick; i++) advance(state, i < Math.abs(moves) ? Math.sign(moves) : 0);
      const position = incomingAt(feed, state.tick * STEP);
      assert.ok(Math.abs(position.z) < 1e-10);
      const contact = readContact(feed, state.tick, state.defender);
      const center = planClearance(feed, contact, state.tick, targetAngle);
      if (center.atGate && center.interception) blockedGateShots++;
      let safeAngle = targetAngle;
      if (center.interception || !center.atGate) {
        safeAngle = undefined;
        for (let aim = -60; aim <= 60; aim++) {
          const plan = planClearance(feed, contact, state.tick, aim);
          if (plan.atGate && !plan.interception) {
            safeAngle = aim;
            break;
          }
        }
      }
      assert.equal(clear(state, safeAngle), true, 'drill ' + level + ', ball ' + (index + 1));
      assert.equal(nextFeed(state), index < state.feeds.length - 1);
    }
  }
  assert.equal(configurations.size, LEVEL_COUNT);
  assert.ok(blockedGateShots > 1000, 'advanced pressure must change clearance decisions');
});

test('expert clearances target the receiver at the time the ball arrives', () => {
  const state = createDrill(6001);
  const feed = state.feeds[0];
  const { tick, moves, targetAngle } = playPlan(feed);
  for (let i = 0; i < tick; i++) advance(state, i < Math.abs(moves) ? Math.sign(moves) : 0);
  const projection = planClearance(feed, readContact(feed, tick, state.defender), tick, targetAngle);
  assert.equal(projection.receiver, receiverAt(feed, projection.receiveTime));
  assert.notEqual(projection.receiver, receiverAt(feed, tick * STEP));
  const fast = planClearance(feed, readContact(feed, tick, state.defender), tick, targetAngle, 22);
  assert.ok(fast.receiveTime < projection.receiveTime);
  assert.notEqual(fast.receiver, projection.receiver);
});

test('ground resistance stops an underpowered clearance short of the outlet', () => {
  const state = createDrill(1);
  const feed = state.feeds[0];
  const { tick, moves, targetAngle } = playPlan(feed);
  for (let i = 0; i < tick; i++) advance(state, i < Math.abs(moves) ? Math.sign(moves) : 0);
  assert.equal(clear(state, targetAngle, 3), false);
  assert.equal(state.result, 'ready');
  assert.equal(clear(state, targetAngle, 4), false);
  assert.equal(state.result, 'short');
  assert.ok(Math.abs(state.trajectory.end.z - (16 / 3.6)) < 1e-10);
  assert.ok(state.trajectory.travelTime > 2);
});

test('heavy turf requires more power to reach the outlet', () => {
  const feed = Array.from({ length: 20 }, (_, index) => createDrill(8001 + index).feeds)
    .flat().find(ball => ball.resistance);
  assert.ok(feed, 'the final tier includes heavy turf');
  const { tick, moves, targetAngle } = playPlan(feed);
  const contact = readContact(feed, tick, moves * 0.45);
  assert.equal(planClearance({ ...feed, resistance: undefined }, contact, tick, targetAngle, 6).short, false);
  assert.equal(planClearance(feed, contact, tick, targetAngle, 6).short, true);
  assert.equal(planClearance(feed, contact, tick, targetAngle, 8).short, false);
});

test('boot planting reaches a contact without stretching the limb', () => {
  const hip = new THREE.Vector3(0.12, 0.89, 0);
  const target = new THREE.Vector3(0.26, 0.10, 0.27);
  const upper = 0.45;
  const lower = 0.43;
  const planted = solveLeg(hip, target, upper, lower);
  assert.ok(planted.ankle.distanceTo(target) < 1e-9);
  assert.ok(Math.abs(planted.knee.distanceTo(hip) - upper) < 1e-9);
  assert.ok(Math.abs(planted.knee.distanceTo(planted.ankle) - lower) < 1e-9);
  const far = solveLeg(hip, new THREE.Vector3(0.9, 0.06, 0.85), upper, lower);
  assert.ok(far.ankle.distanceTo(hip) < upper + lower);
  assert.ok(Math.abs(far.knee.distanceTo(far.ankle) - lower) < 1e-9);
});

test('a supporting toe stays fixed in world space while the other boot travels', () => {
  const stride = 0.78;
  const first = lateralStep(0, stride, 0);
  const after = lateralStep(0.4, stride, 0);
  assert.equal(after.advancing, false);
  assert.ok(Math.abs(first.offset - (0.4 + after.offset)) < 1e-9);
  assert.equal(after.lift, 0);
  assert.ok(lateralStep(0.4, stride, 1).lift > 0);
  const next = lateralStep(stride + 0.2, stride, 1);
  assert.equal(next.advancing, false);
  assert.equal(next.lift, 0);
});

test('the ball meets the first net panel after fully crossing the goal line', () => {
  const direct = goalNetImpact({ crossing: 0, origin: 0, approachTime: 1, pace: 10 });
  assert.equal(direct.panel, 'back');
  assert.ok(Math.abs(direct.z + NET_DEPTH - BALL_RADIUS) < 1e-9);
  const angled = goalNetImpact({ crossing: 3.1, origin: -4.9, approachTime: 1, pace: 10 });
  assert.equal(angled.panel, 'side');
  assert.ok(Math.abs(angled.x - GOAL_HALF_WIDTH - GOAL_POST_RADIUS + BALL_RADIUS) < 1e-9);
  assert.ok(angled.z > direct.z && angled.z < -BALL_RADIUS);
});

test('a skipping feed uses a lower rebound and can require a later volley', () => {
  const state = createDrill(4044);
  const feed = state.feeds[0];
  const { first, restitution } = feed.bounces;
  assert.ok(incomingAt(feed, first / 2).y > incomingAt(feed, first + first * restitution / 2).y);
  assert.ok(Math.abs(incomingAt(feed, first).y - BALL_RADIUS) < 1e-9);
  for (let i = 0; i < 21; i++) advance(state, i < 4 ? -1 : 0);
  const high = readContact(feed, state.tick, state.defender);
  assert.equal(high.inWindow, true);
  assert.equal(high.high, true);
  assert.equal(high.reachable, false);
  advance(state);
  assert.equal(readContact(feed, state.tick, state.defender).reachable, true);
  assert.equal(clear(state, 36), true);
  assert.ok(state.trajectory.contact.y > BALL_RADIUS);
  assert.equal(state.trajectory.end.y, BALL_RADIUS);
});

test('an advanced pressing player can stop a clearance that would have reached the gate', () => {
  for (let level = 2001; level < 2100; level++) {
    const state = createDrill(level);
    const feed = state.feeds[0];
    const { tick, moves, targetAngle } = playPlan(feed);
    for (let i = 0; i < tick; i++) advance(state, i < Math.abs(moves) ? Math.sign(moves) : 0);
    const shot = planClearance(feed, readContact(feed, tick, state.defender), tick, targetAngle);
    if (!shot.atGate || !shot.interception) continue;
    assert.equal(clear(state, targetAngle), false);
    assert.equal(state.result, 'intercepted');
    assert.ok(state.trajectory.interception.ball.z < SAFETY_LINE);
    return;
  }
  assert.fail('Expected advanced pressure to intercept a shot on target.');
});

test('premature contact, a missed channel and a conceded goal end play', () => {
  const missed = createDrill(1);
  assert.equal(clear(missed, 0), false);
  assert.equal(missed.result, 'missed');
  const unsafe = createDrill(1);
  const feed = unsafe.feeds[0];
  const { tick, moves } = playPlan(feed);
  for (let i = 0; i < tick; i++) advance(unsafe, i < Math.abs(moves) ? Math.sign(moves) : 0);
  assert.equal(clear(unsafe, Math.sign(feed.channel) * -60), false);
  assert.equal(unsafe.result, 'unsafe');
  const conceded = createDrill(1);
  for (let i = 0; i <= tick; i++) advance(conceded);
  assert.equal(conceded.result, 'conceded');
  assert.equal(nextFeed(conceded), false);
});

test('an early clearance meets the rolling ball near the goal line before redirecting it', () => {
  const state = createDrill(1);
  const feed = state.feeds[0];
  const { tick, moves } = playPlan(feed);
  for (let i = 0; i < tick - 2; i++) advance(state, i < Math.abs(moves) ? Math.sign(moves) : 0);
  const delivery = readContact(feed, state.tick, state.defender);
  assert.equal(delivery.reachable, true);
  assert.ok(delivery.delay > 0);
  assert.ok(Math.abs(delivery.contact.z - 0.45) < 1e-10);
  assert.ok(Math.abs(delivery.delay * feed.pace - (delivery.ball.z - delivery.contact.z)) < 1e-10);
  const run = SAFETY_LINE - delivery.contact.z;
  const aim = Math.round(Math.atan((feed.channel - delivery.contact.x - feed.drift * run ** 2 / SAFETY_LINE) / run) * 180 / Math.PI);
  assert.equal(clear(state, aim), true);
  assert.deepEqual(state.trajectory.contact, delivery.contact);
  assert.equal(state.trajectory.end.z, SAFETY_LINE);
});
