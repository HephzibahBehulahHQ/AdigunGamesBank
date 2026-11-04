import test from 'node:test';
import assert from 'node:assert/strict';
import { RESISTORS, TOPOLOGIES, challengeFor, challengeSignature, checkChallenge, contactClosed, initialSetup, simulateCircuit, solveNetwork, truthTable } from '../game3/circuit.js';

const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);

test('Ohm and Kirchhoff reference circuits have independently calculated results', () => {
  const series = solveNetwork('series', [100, 200], [true, true], 12);
  near(series.current, 0.04); near(series.components[0].voltage, 4); near(series.components[1].voltage, 8);
  const parallel = solveNetwork('parallel', [100, 200], [true, true], 12);
  near(parallel.current, 0.18); near(parallel.components[0].current, 0.12); near(parallel.components[1].current, 0.06);
  const divider = solveNetwork('divider', [100, 200, 200], [true, true, true], 12);
  near(divider.current, 0.06); near(divider.nodeVoltages[2], 6); near(divider.components[1].current, 0.03);
});

test('open leads, floating islands and zero source do not create current or NaN', () => {
  for (const topology of Object.keys(TOPOLOGIES)) {
    const count = TOPOLOGIES[topology].edges.length;
    for (let mask = 0; mask < 1 << count; mask++) {
      const links = Array.from({ length: 4 }, (_, i) => Boolean(mask & (1 << i)));
      for (const voltage of [0, 12]) {
        const result = solveNetwork(topology, [100, 220, 470, 1000], links, voltage);
        assert.ok(Number.isFinite(result.current));
        for (const c of result.components) { assert.ok(Number.isFinite(c.current)); if (!c.enabled) near(c.current, 0); }
        for (const [node, residual] of Object.entries(result.nodeResiduals)) if (node !== '0' && node !== '1') near(residual, 0);
        near(result.power, result.current * voltage);
      }
    }
  }
  near(solveNetwork('series', [100, 100], [false, true], 12).current, 0);
});

test('real contact AND / OR truth tables control source current', () => {
  assert.deepEqual(truthTable('and'), [0, 0, 0, 1]);
  assert.deepEqual(truthTable('or'), [0, 1, 1, 1]);
  for (const mode of ['and', 'or']) for (const a of [false, true]) for (const b of [false, true]) {
    const setup = { ...initialSetup(), links: [true, true], fuse: 0.1, power: true, contactMode: mode, contactA: a, contactB: b };
    const result = simulateCircuit(setup);
    assert.equal(result.current > 0, contactClosed(mode, a, b));
    near(result.sourceVoltage, 3);
    near(result.supplyVoltage, contactClosed(mode, a, b) ? 3 : 0);
  }
});

test('overcurrent opens a fuse and a latched blown fuse stays open after rewiring', () => {
  const setup = { ...initialSetup(), voltage: 15, links: [true, true], power: true, fuse: 0.025 };
  const tripped = simulateCircuit(setup);
  assert.equal(tripped.status, 'tripped'); near(tripped.current, 0); near(tripped.prospectiveCurrent, 0.075);
  const latched = simulateCircuit({ ...setup, blown: true, resistances: [1800, 1800] });
  assert.equal(latched.status, 'tripped'); near(latched.current, 0);
});

test('all 10,000 tasks are distinct, deterministic and solvable; independent network equations agree', () => {
  const signatures = new Set();
  for (let level = 1; level <= 10000; level++) {
    const challenge = challengeFor(level);
    const signature = challengeSignature(challenge);
    assert.ok(!signatures.has(signature), `Duplicate task at level ${level}`); signatures.add(signature);
    assert.equal(signature, challengeSignature(challengeFor(level)));
    const solved = checkChallenge(challenge, challenge.solution);
    assert.equal(solved.passed, true, `Unsolvable generated level ${level}`);
    const [r1, r2, r3, r4] = challenge.solution.resistances;
    const independentResistance = {
      series: r1 + r2,
      parallel: 1 / (1 / r1 + 1 / r2),
      divider: r1 + 1 / (1 / r2 + 1 / r3),
      branch: 1 / (1 / r1 + 1 / (r2 + r3)),
      mixed: r1 + 1 / (1 / (r2 + r3) + 1 / r4)
    }[challenge.topology];
    near(solved.result.current, challenge.voltage / independentResistance);
    near(solved.result.power, solved.result.current * challenge.voltage);
    for (const [node, residual] of Object.entries(solved.result.nodeResiduals)) if (node !== '0' && node !== '1') near(residual, 0);
    assert.ok(challenge.solution.resistances.every(r => RESISTORS.includes(r)));
    assert.ok(solved.result.components.every(c => c.power < 5));
  }
  assert.equal(signatures.size, 10000);
});

test('incorrect wiring, absent power, wrong logic and oversized fuses cannot clear a task', () => {
  for (const level of [1, 2001, 4001, 6001, 8001, 10000]) {
    const challenge = challengeFor(level), setup = challenge.solution;
    assert.equal(checkChallenge(challenge, initialSetup()).passed, false);
    assert.equal(checkChallenge(challenge, { ...setup, power: false }).passed, false);
    assert.equal(checkChallenge(challenge, { ...setup, links: [false, true, true, true] }).passed, false);
    assert.equal(checkChallenge(challenge, { ...setup, fuse: 1 }).passed, false);
    assert.equal(checkChallenge(challenge, { ...setup, voltage: setup.voltage + 0.5 }).passed, false);
    if (level >= 4001) assert.equal(checkChallenge(challenge, { ...setup, contactMode: 'bypass' }).passed, false);
  }
});

test('invalid electrical input fails clearly rather than propagating non-finite values', () => {
  assert.throws(() => solveNetwork('unknown', [100, 100], [true, true], 3), RangeError);
  assert.throws(() => solveNetwork('series', [0, 100], [true, true], 3), RangeError);
  assert.throws(() => solveNetwork('series', [100, Infinity], [true, true], 3), RangeError);
  assert.throws(() => solveNetwork('series', [100, 100], [true, true], 240), RangeError);
  assert.equal(challengeFor(10001).level, 1);
  assert.equal(challengeFor(10000).tier, 'Professional Master');
});
