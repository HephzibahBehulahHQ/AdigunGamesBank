import { validLevel, tierFor } from '../shared/progression.js';

export const RESISTORS = [100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000, 1200, 1500, 1800];
export const VOLTAGES = [3, 4.5, 5, 6, 7.5, 9, 10, 12, 13.5, 15];
export const FUSES = [0.01, 0.016, 0.025, 0.04, 0.063, 0.1, 0.16, 0.25, 0.4, 0.63];
export const TOPOLOGIES = {
  series: { name: 'Series · R1 + R2', edges: [[1, 2], [2, 0]], formula: 'R₁ + R₂' },
  parallel: { name: 'Parallel · R1 ∥ R2', edges: [[1, 0], [1, 0]], formula: '1 / (1/R₁ + 1/R₂)' },
  divider: { name: 'Loaded divider · R1 + (R2 ∥ R3)', edges: [[1, 2], [2, 0], [2, 0]], formula: 'R₁ + 1 / (1/R₂ + 1/R₃)' },
  branch: { name: 'Split branch · R1 ∥ (R2 + R3)', edges: [[1, 0], [1, 2], [2, 0]], formula: '1 / (1/R₁ + 1/(R₂ + R₃))' },
  mixed: { name: 'Mixed network · R1 + ((R2 + R3) ∥ R4)', edges: [[1, 2], [2, 3], [3, 0], [2, 0]], formula: 'R₁ + 1 / (1/(R₂ + R₃) + 1/R₄)' }
};

export function contactClosed(mode, a, b) {
  if (mode === 'and') return Boolean(a && b);
  if (mode === 'or') return Boolean(a || b);
  if (mode === 'bypass') return true;
  throw new RangeError('Unknown contact wiring.');
}

export function truthTable(mode) {
  return [[false, false], [false, true], [true, false], [true, true]].map(([a, b]) => Number(contactClosed(mode, a, b)));
}

function gaussian(matrix, rhs) {
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let column = 0; column < a.length; column++) {
    let pivot = column;
    for (let row = column + 1; row < a.length; row++) if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    if (Math.abs(a[pivot][column]) < 1e-14) throw new Error('Unanchored circuit node.');
    [a[column], a[pivot]] = [a[pivot], a[column]];
    const divisor = a[column][column];
    for (let j = column; j <= a.length; j++) a[column][j] /= divisor;
    for (let row = 0; row < a.length; row++) {
      if (row === column) continue;
      const factor = a[row][column];
      for (let j = column; j <= a.length; j++) a[row][j] -= factor * a[column][j];
    }
  }
  return a.map(row => row[a.length]);
}

/** Nodal conductance solution: ideal DC source, ideal wires and ohmic resistors. */
export function solveNetwork(topology, resistances, links, voltage) {
  const graph = TOPOLOGIES[topology];
  if (!graph) throw new RangeError('Unknown circuit topology.');
  if (!Number.isFinite(voltage) || voltage < 0 || voltage > 24) throw new RangeError('Source must be between 0 and 24 V DC.');
  for (let i = 0; i < graph.edges.length; i++) {
    if (!Number.isFinite(resistances[i]) || resistances[i] <= 0) throw new RangeError('Every resistor must be positive and finite.');
  }
  const active = graph.edges.map(([a, b], i) => ({ a, b, r: resistances[i], enabled: links[i] === true, index: i }));
  // Nodes in isolated passive islands have no defined absolute potential. Keep
  // their current zero and use 0 V solely as the display reference.
  const anchored = new Set([0, 1]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of active) {
      if (!edge.enabled) continue;
      if (anchored.has(edge.a) && !anchored.has(edge.b)) { anchored.add(edge.b); changed = true; }
      if (anchored.has(edge.b) && !anchored.has(edge.a)) { anchored.add(edge.a); changed = true; }
    }
  }
  const unknown = [...anchored].filter(n => n !== 0 && n !== 1).sort();
  const matrix = unknown.map(() => unknown.map(() => 0));
  const rhs = unknown.map(() => 0);
  unknown.forEach((node, row) => {
    for (const edge of active) {
      if (!edge.enabled || (edge.a !== node && edge.b !== node)) continue;
      const other = edge.a === node ? edge.b : edge.a;
      const conductance = 1 / edge.r;
      matrix[row][row] += conductance;
      const column = unknown.indexOf(other);
      if (column >= 0) matrix[row][column] -= conductance;
      else if (other === 1) rhs[row] += conductance * voltage;
    }
  });
  const values = gaussian(matrix, rhs);
  const nodeVoltages = { 0: 0, 1: voltage };
  for (const edge of active) {
    if (!(edge.a in nodeVoltages)) nodeVoltages[edge.a] = 0;
    if (!(edge.b in nodeVoltages)) nodeVoltages[edge.b] = 0;
  }
  unknown.forEach((node, i) => { nodeVoltages[node] = values[i]; });
  const components = active.map(edge => {
    const drop = nodeVoltages[edge.a] - nodeVoltages[edge.b];
    const current = edge.enabled ? drop / edge.r : 0;
    return { ...edge, voltage: drop, current, power: current * current * edge.r };
  });
  const nodeResiduals = Object.fromEntries(Object.keys(nodeVoltages).map(n => [n, 0]));
  for (const component of components) {
    nodeResiduals[component.a] += component.current;
    nodeResiduals[component.b] -= component.current;
  }
  const current = Math.max(0, nodeResiduals[1]);
  return { nodeVoltages, nodeResiduals, components, current, power: components.reduce((sum, c) => sum + c.power, 0) };
}

/** Fuse behavior is intentionally instantaneous, not a manufacturer's time curve. */
export function simulateCircuit(setup) {
  if (!Number.isFinite(setup.fuse) || setup.fuse <= 0) throw new RangeError('Fuse rating must be positive.');
  const closed = contactClosed(setup.contactMode, setup.contactA, setup.contactB);
  const unit = solveNetwork(setup.topology, setup.resistances, setup.links, 1);
  const enabled = Boolean(setup.power && closed && !setup.blown);
  const prospective = solveNetwork(setup.topology, setup.resistances, setup.links, enabled ? setup.voltage : 0);
  const tripped = Boolean(setup.blown || (enabled && prospective.current > setup.fuse * (1 + 1e-10)));
  const result = tripped ? solveNetwork(setup.topology, setup.resistances, setup.links, 0) : prospective;
  return {
    ...result,
    prospectiveCurrent: prospective.current,
    sourceVoltage: setup.power ? setup.voltage : 0,
    supplyVoltage: enabled && !tripped ? setup.voltage : 0,
    equivalentResistance: unit.current > 1e-12 ? 1 / unit.current : Infinity,
    tripped,
    status: tripped ? 'tripped' : !setup.power || !closed ? 'off' : result.current < 1e-12 ? 'open' : 'running'
  };
}

export function initialSetup() {
  return { topology: 'series', voltage: 3, resistances: [100, 100, 100, 100], links: [false, false, false, false], contactMode: 'bypass', contactA: false, contactB: false, fuse: 0.025, power: false, blown: false };
}

function metric(key, result) {
  if (key === 'totalCurrent') return result.current;
  const [kind, index] = key.split(':');
  return result.components[Number(index)]?.[kind] ?? 0;
}

export function challengeFor(requestedLevel) {
  const level = validLevel(requestedLevel);
  const tier = Math.floor((level - 1) / 2000), index = (level - 1) % 2000;
  // Multiplication by 37 is a permutation modulo 2560. Every task has a
  // distinct supply/R1/R2 tuple, without using the level label as uniqueness.
  const code = (index * 37 + tier * 101) % 2560;
  const topology = Object.keys(TOPOLOGIES)[tier];
  const resistances = [RESISTORS[code % 16], RESISTORS[Math.floor(code / 16) % 16], RESISTORS[(index * 7 + Math.floor(index / 16) + tier * 3) % 16], RESISTORS[(index * 11 + Math.floor(index / 32) + tier) % 16]];
  const voltage = VOLTAGES[Math.floor(code / 256)];
  const contactMode = tier < 2 ? 'bypass' : tier === 2 ? 'and' : tier === 3 ? 'or' : index % 2 ? 'and' : 'or';
  const solution = { topology, voltage, resistances, links: [true, true, true, true], contactMode, contactA: true, contactB: true, fuse: 0.63, power: true, blown: false };
  const reference = simulateCircuit(solution);
  solution.fuse = FUSES.find(fuse => fuse >= reference.current * 1.25 - 1e-12);
  const keys = [
    ['totalCurrent', 'voltage:0'],
    ['totalCurrent', 'current:0'],
    ['totalCurrent', 'voltage:0', 'current:1'],
    ['totalCurrent', 'current:1', 'voltage:1'],
    ['totalCurrent', 'voltage:0', 'current:1', 'voltage:1']
  ][tier];
  const objectives = keys.map(key => ({ key, target: metric(key, reference), unit: key.includes('voltage') ? 'V' : 'A' }));
  return { level, tier: tierFor(level), topology, voltage, contactMode, truthTable: truthTable(contactMode), fuseLimit: solution.fuse, objectives, solution };
}

export function checkChallenge(challenge, setup) {
  const result = simulateCircuit(setup);
  const checks = [
    { label: 'Required circuit wiring', passed: setup.topology === challenge.topology },
    { label: `${challenge.voltage} V source`, passed: Math.abs(setup.voltage - challenge.voltage) < 1e-9 },
    { label: 'Contact logic', passed: truthTable(setup.contactMode).join('') === challenge.truthTable.join('') },
    { label: 'Supply on and all active leads connected', passed: result.status === 'running' && TOPOLOGIES[setup.topology].edges.every((_, i) => setup.links[i]) },
    { label: 'Fuse limit and 25% challenge margin', passed: !result.tripped && setup.fuse <= challenge.fuseLimit * (1 + 1e-10) && setup.fuse >= result.current * 1.25 - 1e-12 }
  ];
  for (const objective of challenge.objectives) {
    const actual = metric(objective.key, result);
    const tolerance = Math.max(Math.abs(objective.target) * 0.005, objective.unit === 'A' ? 0.000005 : 0.0001);
    checks.push({ label: objective.key, passed: Math.abs(actual - objective.target) <= tolerance, target: objective.target, actual, unit: objective.unit });
  }
  return { passed: checks.every(check => check.passed), checks, result };
}

export function challengeSignature(challenge) {
  return JSON.stringify({ topology: challenge.topology, voltage: challenge.voltage, truthTable: challenge.truthTable, fuseLimit: challenge.fuseLimit, objectives: challenge.objectives.map(o => [o.key, Number(o.target.toPrecision(12))]) });
}
