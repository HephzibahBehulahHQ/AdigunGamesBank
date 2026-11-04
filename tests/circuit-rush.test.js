import test from 'node:test';
import assert from 'node:assert/strict';
import { circuitFor, rotateMask, rotationPeriod, neighbour, DIRECTIONS, createCampaign, CAMPAIGN_ID } from '../game2/campaign.js';
import { createGame, startGame, maskAt, rotateTile, inspectNetwork, inspectCircuit, commission, pauseGame, resumeGame, retryGame } from '../game2/engine.js';

const FIRST_ROUTE_WIRES = [1, 2, 7, 12, 13, 14, 19];
function solve(state) {
  for (const [index, tile] of state.config.tiles.entries()) if (tile.rotatable && !tile.parked) {
    while (state.rotations[index]) assert.equal(rotateTile(state, index, state.rotations[index] > tile.period / 2 ? 1 : -1), true);
  }
}
function fixture() {
  const tiles = Array.from({ length: 9 }, () => ({ kind: 'blank', mask: 0 }));
  tiles[0] = { kind: 'source', mask: 2 };
  tiles[1] = { kind: 'wire', mask: 14 };
  tiles[2] = { kind: 'load', mask: 8, resistance: 120, loadId: 'L1' };
  tiles[4] = { kind: 'load', mask: 1, resistance: 240, loadId: 'L2' };
  return { size: 3, source: 0, loads: [2, 4], voltage: 12, fuseCurrent: 0.2, tiles };
}
const inspectFixture = config => inspectNetwork(config, config.tiles.map(tile => tile.mask));

test('quarter-turns preserve terminal count and canonical straight/elbow/junction periods', () => {
  assert.equal(rotateMask(1), 2); assert.equal(rotateMask(2), 4); assert.equal(rotateMask(4), 8); assert.equal(rotateMask(8), 1);
  assert.equal(rotateMask(3, -1), 9); assert.equal(rotateMask(3, 4), 3);
  assert.equal(rotationPeriod(5), 2); assert.equal(rotationPeriod(10), 2);
  assert.equal(rotationPeriod(3), 4); assert.equal(rotationPeriod(7), 4); assert.equal(rotationPeriod(15), 1);
  for (let mask = 0; mask < 16; mask++) assert.equal(rotateMask(mask, 4), mask);
});

test('grid neighbours reject row wrap, borders and diagonal assumptions', () => {
  assert.equal(neighbour(2, DIRECTIONS[1], 3), -1);
  assert.equal(neighbour(3, DIRECTIONS[3], 3), -1);
  assert.equal(neighbour(1, DIRECTIONS[0], 3), -1);
  assert.equal(neighbour(7, DIRECTIONS[2], 3), -1);
  assert.equal(neighbour(4, DIRECTIONS[1], 3), 5);
});

test('all 10,000 distinct circuit topologies are solvable through actual rotation and commissioning commands', () => {
  const signatures = new Set();
  for (let level = 1; level <= 10000; level++) {
    const state = createGame(level), c = state.config;
    signatures.add(`${c.size}:` + c.tiles.map(tile => `${tile.kind}:${tile.mask}`).join(','));
    assert.ok(c.tiles.length === c.size ** 2);
    assert.ok(c.fuseCurrent > c.expectedCurrent);
    assert.ok(c.moveBudget >= c.solutionCost && c.solutionCost > 0);
    assert.equal(startGame(state), true); solve(state); commission(state);
    assert.equal(state.phase, 'won', `job ${level}: ${state.message}`);
    assert.equal(state.moves, c.solutionCost);
    assert.equal(state.inspection.poweredLoads.length, c.loads.length);
    assert.equal(state.inspection.dangling.length, 0); assert.equal(state.inspection.shorted.length, 0);
    assert.equal(state.inspection.unexpectedLoads.length, 0);
    assert.ok(Math.abs(state.inspection.current - c.expectedCurrent) < 1e-10);
  }
  assert.equal(signatures.size, 10000);
});

test('jobs are deterministic and difficulty changes board topology, branches, and finite move budgets', () => {
  assert.deepEqual(circuitFor(4913), circuitFor(4913));
  for (const input of [-1, 0, 10001, NaN, Infinity, null, 'not a level']) assert.equal(circuitFor(input).level, 1);
  assert.equal(circuitFor('10000').level, 10000);
  assert.deepEqual([1, 2001, 4001, 6001, 8001].map(level => circuitFor(level).loads.length), [1, 2, 3, 3, 4]);
  assert.deepEqual([1, 2001, 6001].map(level => circuitFor(level).size), [5, 6, 7]);
  assert.ok(circuitFor(4001).tiles.some(tile => tile.kind === 'wire' && [7, 11, 13, 14, 15].includes(tile.mask)));
});

test('an aligned branched circuit supplies 150 mA using V/R for two parallel resistive loads', () => {
  const result = inspectFixture(fixture());
  assert.equal(result.status, 'clear'); assert.equal(result.ok, true);
  assert.deepEqual(result.energized, [0, 1, 2, 4]);
  assert.ok(Math.abs(result.current - 0.15) < 1e-12);
  assert.deepEqual(result.poweredLoads, [2, 4]);
});

test('one-sided contacts cannot energize the neighbouring tile', () => {
  const c = fixture(); c.tiles[1].mask = 6; // East/south, with no west terminal facing the source.
  const result = inspectFixture(c);
  assert.equal(result.status, 'open-branch'); assert.deepEqual(result.energized, [0]);
  assert.equal(result.poweredLoads.length, 0); assert.equal(result.current, 0);
  assert.deepEqual(result.dangling[0], { index: 0, direction: 'east', reason: 'unmatched terminal' });
});

test('a row-end source cannot power the first cell of the following row', () => {
  const c = fixture(); c.tiles = c.tiles.map(() => ({ kind: 'blank', mask: 0 }));
  c.source = 2; c.loads = [3]; c.tiles[2] = { kind: 'source', mask: 2 }; c.tiles[3] = { kind: 'load', mask: 8, resistance: 120 };
  const result = inspectFixture(c);
  assert.deepEqual(result.energized, [2]); assert.equal(result.poweredLoads.length, 0);
  assert.equal(result.dangling[0].reason, 'boundary');
});

test('all lamps receiving power does not hide a dangling energized branch', () => {
  const c = fixture(); c.tiles[1].mask = 15;
  const result = inspectFixture(c);
  assert.equal(result.poweredLoads.length, 2); assert.equal(result.status, 'open-branch');
  assert.equal(result.ok, false); assert.ok(result.dangling.some(fault => fault.index === 1 && fault.direction === 'north'));
});

test('a closed partial branch still fails when a required load is missing', () => {
  const c = fixture(); c.tiles[1].mask = 10;
  const result = inspectFixture(c);
  assert.equal(result.dangling.length, 0); assert.equal(result.status, 'missing-load');
  assert.deepEqual(result.poweredLoads, [2]); assert.deepEqual(result.missingLoads, [4]);
});

test('exposed-return connections are shorts and do not invent a finite short current', () => {
  const c = fixture(); c.loads = [2]; c.tiles[4] = { kind: 'ground', mask: 1 };
  const result = inspectFixture(c);
  assert.equal(result.status, 'short'); assert.equal(result.current, null);
  assert.deepEqual(result.shorted, [4]); assert.equal(result.ok, false);
});

test('unexpected loads and overloads fail even if the required lamp is lit', () => {
  const c = fixture(); c.loads = [2]; c.tiles[4].kind = 'spare';
  const branch = inspectFixture(c);
  assert.equal(branch.status, 'unexpected-branch'); assert.equal(branch.poweredLoads.length, 1);
  assert.deepEqual(branch.unexpectedLoads, [4]); assert.equal(branch.overload, false);
  c.fuseCurrent = 0.12;
  const overloaded = inspectFixture(c);
  assert.equal(overloaded.status, 'overload'); assert.equal(overloaded.overload, true);
});

test('isolated spare wire ends are not incorrectly classified as live branch faults', () => {
  const c = fixture(); c.tiles[8] = { kind: 'wire', mask: 15 };
  const result = inspectFixture(c);
  assert.equal(result.status, 'clear'); assert.equal(result.energized.includes(8), false);
});

test('the introductory seven rotations produce a real commissioned load and freeze further changes', () => {
  const state = createGame(); assert.equal(rotateTile(state, 1), false); assert.equal(commission(state), false);
  startGame(state); commission(state);
  assert.equal(state.phase, 'editing'); assert.equal(state.inspection.ok, false);
  for (const index of FIRST_ROUTE_WIRES) assert.equal(rotateTile(state, index, 1), true);
  assert.equal(state.inspection, null); commission(state);
  assert.equal(state.phase, 'won'); assert.equal(state.moves, 7); assert.equal(state.inspection.current, 0.1);
  assert.equal(rotateTile(state, 1), false); assert.equal(commission(state), false);
});

test('a reachable tutorial short trips the fuse, awards no completion, and retries the same deterministic job', () => {
  const state = createGame(); startGame(state);
  for (const index of [1, 2, 7]) rotateTile(state, index, 1);
  commission(state);
  assert.equal(state.phase, 'lost'); assert.equal(state.inspection.status, 'short');
  assert.match(state.message, /B3/); assert.equal(rotateTile(state, 12), false);
  const retry = retryGame(state);
  assert.equal(retry.phase, 'ready'); assert.equal(retry.config.level, 1); assert.equal(retry.moves, 0);
  assert.deepEqual(retry.rotations, createGame().rotations);
  startGame(retry); solve(retry); commission(retry); assert.equal(retry.phase, 'won');
});

test('rotation budget is finite but the last permitted rotation may still commission successfully', () => {
  const failed = createGame(); startGame(failed);
  for (let i = 0; i < failed.config.moveBudget; i++) assert.equal(rotateTile(failed, 1), true);
  assert.equal(rotateTile(failed, 1), false); assert.equal(failed.moves, failed.config.moveBudget);
  commission(failed); assert.equal(failed.phase, 'lost'); assert.match(failed.message, /budget exhausted/);
  const finalMove = createGame(); finalMove.config.moveBudget = 7; startGame(finalMove);
  for (const index of FIRST_ROUTE_WIRES) rotateTile(finalMove, index);
  assert.equal(finalMove.moves, 7); assert.equal(finalMove.phase, 'editing');
  commission(finalMove); assert.equal(finalMove.phase, 'won');
});

test('pause locks routing and commissioning; fixed, invalid and out-of-range tiles never spend turns', () => {
  const state = createGame(); startGame(state);
  for (const [index, direction] of [[0, 1], [24, 1], [11, 1], [-1, 1], [500, 1], [1, 0], [1.5, 1]]) assert.equal(rotateTile(state, index, direction), false);
  assert.equal(state.moves, 0); assert.equal(pauseGame(state), true);
  const snapshot = structuredClone(state); assert.equal(rotateTile(state, 1), false); assert.equal(commission(state), false);
  assert.deepEqual(state, snapshot); assert.equal(resumeGame(state), true);
  assert.equal(rotateTile(state, 1, 1), true); assert.equal(maskAt(state, 1), 10);
});

test('inspection is read-only and saved progress records only a sequential commissioning clear', () => {
  const state = createGame(), before = structuredClone(state); inspectCircuit(state); assert.deepEqual(state, before);
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const progress = createCampaign(storage); assert.equal(progress.complete(2), false);
  startGame(state); solve(state); commission(state); assert.equal(state.phase, 'won');
  assert.equal(progress.complete(1), true); assert.equal(progress.complete(1), false);
  assert.deepEqual(JSON.parse(values.get(`adigun.campaign.v1.${CAMPAIGN_ID}`)), { version: 1, completed: 1, unlocked: 2 });
  assert.equal(createCampaign(storage).unlocked, 2);
  const blocked = createCampaign({ getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } });
  assert.equal(blocked.complete(1), true); assert.equal(blocked.unlocked, 2);
});
