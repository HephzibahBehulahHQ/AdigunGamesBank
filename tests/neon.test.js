import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, makeLevel, solveBoard, pulse, undo, pause, hint, neighbours, matched } from '../game1/engine.js';

test('Neon Pulse couples only real orthogonal neighbours and rejects malformed input', () => {
  assert.deepEqual(neighbours(3, 0), [0,3,1]);
  assert.deepEqual(neighbours(3, 4), [4,1,7,3,5]);
  const state = createGame();
  for (const invalid of [-1, 9, 1.5, NaN, '1']) assert.equal(pulse(state, invalid), false);
  assert.equal(solveBoard(3, [], []), null);
});
test('first board completes through one real central pulse; repeated actions cannot re-award', () => {
  const state = createGame();
  assert.equal(state.phase, 'playing'); assert.equal(matched(state), 4);
  assert.equal(hint(state), 4); assert.equal(state.hints, 1);
  assert.equal(pulse(state, 4), true); assert.equal(state.phase, 'won'); assert.equal(matched(state), 9);
  assert.equal(pulse(state, 4), false); assert.equal(undo(state), false); assert.equal(pause(state), false);
});
test('pause preserves board and undo restores exact cells and budget after losing', () => {
  const state = createGame(7), before = [...state.cells];
  pause(state); assert.equal(pulse(state, 0), false); assert.equal(undo(state), false); pause(state);
  pulse(state, 0); undo(state); assert.deepEqual(state.cells, before); assert.equal(state.moves, 0);
  state.config.moveLimit = 1; pulse(state, 0); assert.equal(state.phase, 'lost');
  assert.equal(pulse(state, 1), false); assert.equal(undo(state), true); assert.equal(state.phase, 'playing');
  assert.deepEqual(state.cells, before);
});
test('all 10,000 deterministic boards have distinct configurations and a real within-budget solution', () => {
  const signatures = new Set();
  for (let level = 1; level <= 10000; level++) {
    const state = createGame(level), c = state.config;
    assert.ok(matched(state) < state.cells.length, `nontrivial board ${level}`);
    const solution = solveBoard(c.size, state.cells, c.target);
    assert.ok(solution, `solvable board ${level}`);
    assert.ok(solution.reduce((a,b) => a+b, 0) <= c.moveLimit, `budget ${level}`);
    for (let i = 0; i < solution.length; i++) for (let j = 0; j < solution[i]; j++) pulse(state, i);
    assert.equal(state.phase, 'won', `actual engine victory ${level}`);
    signatures.add(`${c.size}:${c.target.join('')}:${c.current.join('')}`);
  }
  assert.equal(signatures.size, 10000);
  for (const level of [1, 2000, 2001, 4001, 6001, 8001, 10000]) assert.deepEqual(makeLevel(level), makeLevel(level));
  assert.equal(makeLevel(10000).tier, 'Professional Master');
});
test('hints respond to current board state, not a stale initial walkthrough', () => {
  const state = createGame(4071); pulse(state, 0); pulse(state, 5); undo(state);
  const plan = solveBoard(state.config.size, state.cells, state.config.target);
  assert.equal(hint(state), plan.findIndex(Boolean));
  for (const value of [0, 10001, 'x', Infinity]) assert.equal(makeLevel(value).level, 1);
});
