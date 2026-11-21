import assert from 'node:assert/strict';
import test from 'node:test';
import { LEVEL_COUNT } from '../shared/progression.js';
import { STEP, SAFETY_LINE, advance, clear, createDrill, incomingAt, nextFeed } from '../game9/clearance.js';

export function playPlan(feed) {
  const tick = Math.round(feed.approachTime / STEP);
  const moves = Math.round(feed.crossing / 0.45);
  const targetAngle = Math.round(Math.atan((feed.channel - feed.crossing - feed.drift * SAFETY_LINE) / SAFETY_LINE) * 180 / Math.PI);
  return { tick, moves, targetAngle };
}

test('all 10,000 distinct Goal Line drills can be completed through the public commands', () => {
  const configurations = new Set();
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const state = createDrill(level);
    configurations.add(JSON.stringify(state.feeds));
    for (const [index, feed] of state.feeds.entries()) {
      const { tick, moves, targetAngle } = playPlan(feed);
      for (let i = 0; i < tick; i++) advance(state, i < Math.abs(moves) ? Math.sign(moves) : 0);
      const position = incomingAt(feed, state.tick * STEP);
      assert.ok(Math.abs(position.z) < 1e-10);
      assert.equal(clear(state, targetAngle), true, 'drill ' + level + ', ball ' + (index + 1));
      assert.equal(nextFeed(state), index < state.feeds.length - 1);
    }
  }
  assert.equal(configurations.size, LEVEL_COUNT);
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
