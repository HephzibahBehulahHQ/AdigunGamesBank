import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign, validLevel, tierFor, randomFor, validCampaignSave } from '../shared/progression.js';
const memory = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };
test('campaign awards once, locks future levels, and persists a genuine final clear', () => {
  const storage = memory(), progress = campaign('unit', storage);
  assert.equal(progress.complete(2), false);
  for (let i = 1; i <= 9999; i++) { assert.equal(progress.complete(i), true); assert.equal(progress.complete(i), false); }
  assert.equal(progress.unlocked, 10000); assert.equal(progress.mastered, false);
  const loaded = campaign('unit', storage); assert.equal(loaded.completed, 9999);
  assert.equal(loaded.complete(10000), true); assert.equal(loaded.mastered, true); assert.equal(loaded.complete(10000), false);
});
test('corrupt storage, blocked writes, fractional and invalid levels cannot break play', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const progress = campaign('unit', blocked); assert.equal(progress.complete(1), true); assert.equal(progress.unlocked, 2);
  for (const value of [-1, 0, 1.2, Infinity, NaN, 10001, 'bad']) assert.equal(validLevel(value), 1);
  assert.equal(tierFor(1), 'Beginner'); assert.equal(tierFor(10000), 'Professional Master');
});
test('seeded randomness repeats exactly and remains bounded', () => {
  const first = randomFor(420), second = randomFor(420), third = randomFor(421);
  const values = Array.from({ length: 100 }, first);
  assert.deepEqual(values, Array.from({ length: 100 }, second));
  assert.notDeepEqual(values, Array.from({ length: 100 }, third));
  assert.ok(values.every(value => value >= 0 && value < 1));
});
test('a stale tab adopts saved progress and cannot overwrite it or award the same clear twice', () => {
  const storage = memory(), first = campaign('tabs', storage), stale = campaign('tabs', storage);
  assert.equal(first.complete(1), true); assert.equal(first.complete(2), true);
  assert.equal(stale.complete(1), false);
  assert.equal(stale.completed, 2); assert.equal(stale.unlocked, 3);
  assert.equal(campaign('tabs', storage).completed, 2);
  assert.equal(stale.complete(3), true); assert.equal(first.completed, 3);
  assert.equal(first.complete(3), false); assert.equal(campaign('tabs', storage).completed, 3);
});
test('unsupported, fractional and inconsistent saves do not become earned progression', () => {
  for (const value of [
    {version:2,completed:1,unlocked:2}, {version:1,completed:1.5,unlocked:2},
    {version:1,completed:20,unlocked:1}, {version:1,completed:-1,unlocked:1},
    {version:1,completed:10001,unlocked:10000},
  ]) {
    assert.equal(validCampaignSave(value), false);
    const storage = memory(); storage.setItem('adigun.campaign.v1.bad', JSON.stringify(value));
    assert.equal(campaign('bad', storage).completed, 0);
  }
  assert.equal(validCampaignSave({version:1,completed:10000,unlocked:10000}),true);
});
