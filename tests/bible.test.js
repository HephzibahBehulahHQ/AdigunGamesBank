import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign } from '../shared/progression.js';
import { CONTROLS, GRAVITY, RELEASE_HEIGHT, createGame, currentTarget, groundTime, launch, levelConfig, normalizeAim, pauseGame, positionAt, predict, resumeGame, solveTarget, startGame, stepGame, throwStone } from '../game23/engine.js';

function finishFlight(state) { for (let n = 0; n < 150 && ['flight', 'feedback'].includes(state.phase); n++) stepGame(state, 0.1); }

test('all 10,000 levels have distinct mechanics and every target is solvable at actual control precision', () => {
  const signatures = new Set();
  for (let level = 1; level <= 10000; level++) {
    const config = levelConfig(level);
    signatures.add(JSON.stringify(config.targets));
    assert.deepEqual(config, levelConfig(level));
    for (const target of config.targets) {
      const solution = solveTarget(target);
      assert.ok(predict(target, solution).hit, `Unsolvable level ${level}: ${JSON.stringify({ target, solution, prediction: predict(target, solution) })}`);
      for (const [control, [low, high]] of Object.entries(CONTROLS)) assert.ok(solution[control] >= low && solution[control] <= high);
    }
  }
  assert.equal(signatures.size, 10000);
  assert.equal(levelConfig(1).tier, 'Beginner');
  assert.equal(levelConfig(10000).tier, 'Professional Master');
});

test('projectile motion agrees with constant acceleration and actual target-plane intersection', () => {
  const velocity = launch({ yaw: 0, elevation: 30, speed: 20 }, 1.5);
  const position = positionAt(velocity, 2);
  assert.ok(Math.abs(position.x - 3) < 1e-9);
  assert.ok(Math.abs(position.y - (RELEASE_HEIGHT + 20 - 0.5 * GRAVITY * 4)) < 1e-9);
  assert.ok(Math.abs(position.z - 20 * Math.cos(Math.PI / 6) * 2) < 1e-9);
  assert.ok(Math.abs(positionAt(velocity, groundTime(velocity)).y) < 1e-9);
});

test('a level requires both practice shields and the encounter, with finite stone consumption', () => {
  const game = createGame(10000);
  assert.equal(throwStone(game, {}), false);
  assert.equal(startGame(game), true);
  for (let index = 0; index < 3; index++) {
    assert.equal(game.targetIndex, index);
    assert.equal(throwStone(game, solveTarget(currentTarget(game))), true);
    assert.equal(throwStone(game, solveTarget(currentTarget(game))), false);
    finishFlight(game);
  }
  assert.equal(game.phase, 'won');
  assert.equal(game.hits, 3);
  assert.equal(game.throws, 3);
  assert.equal(game.stones, 2);
  assert.equal(throwStone(game, {}), false);
});

test('five misses cause a loss and a new attempt restores stones', () => {
  const game = createGame(1); startGame(game);
  for (let index = 0; index < 5; index++) {
    throwStone(game, { yaw: 25, elevation: 12, speed: 8 }); finishFlight(game);
  }
  assert.equal(game.phase, 'lost'); assert.equal(game.stones, 0); assert.equal(game.hits, 0);
  assert.equal(throwStone(game, solveTarget(currentTarget(game))), false);
  assert.equal(createGame(1).stones, 5);
});

test('pausing preserves flight time and cannot award a hit', () => {
  const game = createGame(5432); startGame(game); throwStone(game, solveTarget(currentTarget(game))); stepGame(game, 0.1);
  const position = { ...game.shot.position }, time = game.shot.t;
  assert.equal(pauseGame(game), true);
  for (let n = 0; n < 200; n++) stepGame(game, 0.1);
  assert.equal(game.shot.t, time); assert.deepEqual(game.shot.position, position); assert.equal(game.hits, 0);
  assert.equal(resumeGame(game), true); finishFlight(game); assert.equal(game.hits, 1);
});

test('level completions are sequential, persisted and never awarded twice', () => {
  const memory = new Map(), storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const progress = campaign('bible-elah-test', storage);
  assert.equal(progress.complete(2), false);
  assert.equal(progress.complete(1), true);
  assert.equal(progress.complete(1), false);
  const restored = campaign('bible-elah-test', storage);
  assert.equal(restored.completed, 1); assert.equal(restored.unlocked, 2);
});

test('invalid levels, controls and time deltas cannot bypass the simulation', () => {
  assert.equal(levelConfig(10001).level, 1);
  assert.deepEqual(normalizeAim({ yaw: Infinity, elevation: -999, speed: 999 }), { yaw: 0, elevation: 12, speed: 36 });
  const game = createGame(1); startGame(game);
  assert.equal(stepGame(game, NaN), false);
  assert.equal(stepGame(game, -100), false);
  assert.equal(game.elapsed, 0);
});
