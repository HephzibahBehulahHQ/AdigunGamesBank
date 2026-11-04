import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign } from '../shared/progression.js';
import { CAMPAIGN_ID, BAND_NAMES, resistor, decodeBands, formatOhms, configurationFor, createGame, reveal, resolvePair, visibleCard, remainingMoves } from '../game5/engine.js';

function compare(state, first, second) {
  assert.equal(reveal(state, first), true); assert.equal(reveal(state, second), true);
  assert.equal(state.phase, 'compare'); assert.equal(resolvePair(state), true);
}
function pairIndices(state) {
  const groups = new Map();
  for (const card of state.config.deck) { const key = card.component.key; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(card.index); }
  return [...groups.values()];
}
function win(state) { for (const [a, b] of pairIndices(state)) if (!state.matched[a]) compare(state, a, b); return state; }

test('manufacturer four-band examples decode to the correct units and tolerance interval', () => {
  const reference = resistor(47, 2, 5);
  assert.deepEqual(reference.bands, ['yellow', 'violet', 'red', 'gold']);
  assert.equal(reference.ohms, 4700); assert.equal(reference.label, '4.7 kΩ ±5%');
  assert.equal(reference.lowerOhms, 4465); assert.equal(reference.upperOhms, 4935);
  assert.equal(decodeBands(['brown', 'black', 'gold', 'gold']).ohms, 1);
  assert.equal(decodeBands(['brown', 'black', 'silver', 'silver']).ohms, 0.1);
  assert.deepEqual(decodeBands(['white', 'brown', 'blue', 'red']).bands, ['white', 'brown', 'blue', 'red']);
  assert.equal(decodeBands(['white', 'brown', 'blue', 'red']).label, '91 MΩ ±2%');
  assert.equal(formatOhms(0.2646), '0.2646 Ω'); assert.equal(formatOhms(1000), '1 kΩ');
});

test('encoder and decoder round-trip every supported significant figure, multiplier and tolerance', () => {
  for (let mantissa = 10; mantissa <= 99; mantissa++) for (let exponent = -2; exponent <= 9; exponent++) for (const tolerance of [2, 5, 10]) {
    const component = resistor(mantissa, exponent, tolerance), decoded = decodeBands(component.bands);
    assert.equal(decoded.centiohms, component.centiohms); assert.equal(decoded.tolerance, tolerance);
    assert.ok(decoded.lowerOhms < decoded.ohms && decoded.upperOhms > decoded.ohms);
    assert.equal(component.bands.length, 4); assert.ok(BAND_NAMES.slice(1).includes(component.bands[0]));
  }
});

test('invalid numerical values and illegal four-band codes cannot create a component', () => {
  for (const args of [[9, 1], [100, 1], [NaN, 1], [22, 1.5], [22, -3], [22, 10], [22, 1, 1], [22, 1, '5']]) assert.throws(() => resistor(...args));
  for (const bands of [[], ['black', 'red', 'brown', 'gold'], ['gold', 'red', 'brown', 'gold'], ['brown', 'gold', 'red', 'gold'], ['brown', 'black', 'unknown', 'gold'], ['brown', 'black', 'red', 'black']]) assert.throws(() => decodeBands(bands));
  for (const value of [NaN, Infinity, -1]) assert.throws(() => formatOhms(value));
});

test('five tiers increase pairs and range while reducing the mistake allowance', () => {
  const configs = [1, 2001, 4001, 6001, 8001].map(configurationFor);
  assert.deepEqual(configs.map(c => c.pairs), [4, 6, 8, 10, 12]);
  assert.deepEqual(configs.map(c => c.budget - c.pairs), [10, 8, 6, 4, 4]);
  assert.equal(configurationFor(10000).tier, 'Professional Master');
  assert.equal(configurationFor(-1).level, 1); assert.equal(configurationFor(Infinity).level, 1);
  assert.deepEqual(configurationFor(8123), configurationFor(8123));
});

test('opaque cards reveal no value until selected and reject duplicate, matched or invalid picks', () => {
  const state = createGame(1);
  for (let i = 0; i < state.config.deck.length; i++) assert.equal(visibleCard(state, i), null);
  for (const input of [-1, 8, 0.5, NaN, '0']) assert.equal(reveal(state, input), false);
  assert.equal(reveal(state, 0), true); assert.equal(state.moves, 0);
  assert.equal(visibleCard(state, 0).label, '10 Ω ±5%'); assert.equal(visibleCard(state, 1), null);
  assert.equal(reveal(state, 0), false); assert.equal(state.revealed.length, 1);
  assert.equal(reveal(state, 5), true); assert.equal(state.moves, 1);
  assert.equal(state.comparison, 'match'); assert.equal(reveal(state, 2), false);
  assert.equal(resolvePair(state), true); assert.equal(state.matches, 1);
  assert.equal(reveal(state, 0), false); assert.equal(visibleCard(state, 0).label, '10 Ω ±5%');
});

test('a mismatch stays readable until explicitly covered and consumes exactly one move', () => {
  const state = createGame(1); reveal(state, 0); reveal(state, 1);
  assert.equal(state.phase, 'compare'); assert.equal(state.comparison, 'mismatch');
  assert.equal(state.moves, 1); assert.equal(state.matches, 0);
  assert.ok(visibleCard(state, 0)); assert.ok(visibleCard(state, 1));
  assert.equal(reveal(state, 2), false); assert.equal(state.moves, 1);
  resolvePair(state); assert.equal(state.phase, 'ready');
  assert.equal(visibleCard(state, 0), null); assert.equal(visibleCard(state, 1), null);
  assert.equal(resolvePair(state), false); assert.equal(state.moves, 1);
});

test('matching compares nominal resistance and tolerance, not object identity or colour alone', () => {
  const state = createGame(1);
  state.config.deck[0].component = resistor(47, 2, 5);
  state.config.deck[1].component = resistor(47, 2, 10);
  reveal(state, 0); reveal(state, 1); assert.equal(state.comparison, 'mismatch'); resolvePair(state);
  state.config.deck[1].component = structuredClone(state.config.deck[0].component);
  reveal(state, 0); reveal(state, 1); assert.equal(state.comparison, 'match'); resolvePair(state);
  assert.equal(state.matches, 1);
});

test('move-budget loss is finite, cannot be bypassed, and retry restores the same layout', () => {
  const state = createGame(1), layout = structuredClone(state.config.deck);
  for (let i = 0; i < state.config.budget; i++) compare(state, 0, 1);
  assert.equal(state.phase, 'lost'); assert.equal(state.matches, 0); assert.equal(remainingMoves(state), 0);
  assert.equal(state.moves, 14); assert.ok(visibleCard(state, 0));
  assert.equal(reveal(state, 2), false); assert.equal(resolvePair(state), false);
  const retried = createGame(1); assert.deepEqual(retried.config.deck, layout);
  assert.equal(retried.moves, 0); assert.equal(retried.phase, 'ready'); assert.equal(visibleCard(retried, 0), null);
});

test('the last allowed move can clear the final pair without an off-by-one loss', () => {
  const state = createGame(1);
  for (let i = 0; i < state.config.budget - state.config.pairs; i++) compare(state, 0, 1);
  win(state); assert.equal(state.moves, state.config.budget); assert.equal(state.phase, 'won');
  assert.equal(state.matches, state.config.pairs); assert.equal(remainingMoves(state), 0);
  assert.equal(reveal(state, 0), false); assert.equal(resolvePair(state), false);
});

test('qualifying wins save sequential campaign progress without unlocking skipped levels', () => {
  const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const progress = campaign(CAMPAIGN_ID, storage); assert.equal(progress.complete(2), false);
  const state = win(createGame(1)); assert.equal(state.phase, 'won'); assert.equal(progress.complete(1), true);
  const reloaded = campaign(CAMPAIGN_ID, storage); assert.equal(reloaded.unlocked, 2); assert.equal(reloaded.completed, 1);
  assert.equal(reloaded.complete(1), false); assert.equal(reloaded.complete(3), false);
  assert.deepEqual(JSON.parse(data.get(`adigun.campaign.v1.${CAMPAIGN_ID}`)), { version: 1, completed: 1, unlocked: 2 });
});

test('every one of 10,000 physical decks is unique, correctly paired, correctly coded and solvable', { timeout: 30000 }, t => {
  const configurations = new Set(); let comparisons = 0, revelations = 0;
  for (let level = 1; level <= 10000; level++) {
    const state = createGame(level), signature = state.config.deck.map(card => card.component.key).join('|');
    assert.equal(configurations.has(signature), false, `repeated component arrangement at ${level}`); configurations.add(signature);
    const groups = pairIndices(state); assert.equal(groups.length, state.config.pairs);
    assert.equal(state.config.deck.length, state.config.pairs * 2);
    for (const group of groups) {
      assert.equal(group.length, 2, `invalid pair count at ${level}`);
      const component = state.config.deck[group[0]].component;
      assert.equal(decodeBands(component.bands).centiohms, component.centiohms);
      assert.equal(decodeBands(component.bands).tolerance, component.tolerance);
      compare(state, ...group); comparisons++; revelations += 2;
    }
    assert.equal(state.phase, 'won'); assert.equal(state.moves, state.config.pairs);
    assert.ok(state.moves <= state.config.budget); assert.ok(state.matched.every(Boolean));
  }
  assert.equal(configurations.size, 10000); assert.equal(comparisons, 80000); assert.equal(revelations, 160000);
  t.diagnostic('10,000 distinct decks, 80,000 real comparisons and 160,000 reveals through game commands. Combinatorial/numerical evidence; not 10,000 manual playtests.');
});
