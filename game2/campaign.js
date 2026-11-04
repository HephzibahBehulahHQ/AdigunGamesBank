import { campaign, randomFor, tierFor, validLevel, LEVEL_COUNT } from '../shared/progression.js';

export { LEVEL_COUNT };
export const CAMPAIGN_ID = 'circuit-rush';
export const DIRECTIONS = [
  { bit: 1, opposite: 4, dr: -1, dc: 0, name: 'north' },
  { bit: 2, opposite: 8, dr: 0, dc: 1, name: 'east' },
  { bit: 4, opposite: 1, dr: 1, dc: 0, name: 'south' },
  { bit: 8, opposite: 2, dr: 0, dc: -1, name: 'west' }
];
export const createCampaign = storage => campaign(CAMPAIGN_ID, storage);
export const cellName = (index, size) => `${String.fromCharCode(65 + index % size)}${Math.floor(index / size) + 1}`;
export const bitCount = mask => DIRECTIONS.reduce((sum, direction) => sum + Number(Boolean(mask & direction.bit)), 0);
export function rotateMask(mask, turns = 1) {
  const count = ((turns % 4) + 4) % 4;
  let rotated = mask & 15;
  for (let i = 0; i < count; i++) rotated = ((rotated << 1) & 15) | (rotated >> 3);
  return rotated;
}
export function rotationPeriod(mask) {
  return rotateMask(mask) === mask ? 1 : rotateMask(mask, 2) === mask ? 2 : 4;
}
export function neighbour(index, direction, size) {
  const row = Math.floor(index / size) + direction.dr, column = index % size + direction.dc;
  return row < 0 || row >= size || column < 0 || column >= size ? -1 : row * size + column;
}
function between(a, b, size) {
  const direction = DIRECTIONS.find(candidate => neighbour(a, candidate, size) === b);
  if (!direction) throw new Error('Non-adjacent route cells');
  return direction;
}

const INTRO_PATH = [0, 1, 2, 7, 12, 13, 14, 19, 24];
const pathBanks = new Map();

// Enumerate distinct simple source-to-load paths by edge count, not renamed seeds.
// The banks are small, lazy, deterministic and contain actual geometric paths.
function pathsFor(size) {
  if (pathBanks.has(size)) return pathBanks.get(size);
  const count = size === 5 ? 2000 : 4000, target = size * size - 1;
  const paths = size === 5 ? [INTRO_PATH.slice()] : [];
  const introSignature = INTRO_PATH.join(','), visited = new Uint8Array(size * size), path = [0];
  const adjacent = Array.from({ length: size * size }, (_, index) => [DIRECTIONS[1], DIRECTIONS[2], DIRECTIONS[3], DIRECTIONS[0]].map(direction => neighbour(index, direction, size)).filter(index => index >= 0));
  visited[0] = 1;
  function search(index, remaining) {
    if (paths.length >= count) return;
    const distance = size - 1 - index % size + size - 1 - Math.floor(index / size);
    if (distance > remaining || (remaining - distance) % 2 !== 0) return;
    if (index === target) {
      if (remaining === 0 && !(size === 5 && path.join(',') === introSignature)) paths.push(path.slice());
      return;
    }
    if (remaining <= 0) return;
    for (const next of adjacent[index]) if (!visited[next]) {
      visited[next] = 1; path.push(next); search(next, remaining - 1); path.pop(); visited[next] = 0;
      if (paths.length >= count) return;
    }
  }
  for (let edges = (size - 1) * 2; edges < size * size && paths.length < count; edges += 2) search(0, edges);
  if (paths.length !== count) throw new Error('Circuit route bank could not be constructed');
  pathBanks.set(size, paths); return paths;
}

function tile(kind = 'blank', mask = 0, extra = {}) {
  return { kind, mask, initialRotation: 0, rotatable: false, period: rotationPeriod(mask), ...extra };
}

export function circuitFor(requested) {
  const level = validLevel(requested), tier = Math.floor((level - 1) / 2000);
  const size = tier === 0 ? 5 : tier < 3 ? 6 : 7, random = randomFor(20131 + level * 401);
  const bank = pathsFor(size);
  const rank = size === 5 ? level === 1 ? 0 : 1 + ((level - 2) * 1297 + 371) % 1999
    : ((level - (size === 6 ? 2001 : 6001)) * 1297 + 891) % 4000;
  const route = bank[rank].slice(), tiles = Array.from({ length: size * size }, () => tile());
  for (const index of route) tiles[index] = tile('wire');
  for (let i = 1; i < route.length; i++) {
    const direction = between(route[i - 1], route[i], size);
    tiles[route[i - 1]].mask |= direction.bit; tiles[route[i]].mask |= direction.opposite;
  }
  tiles[0].kind = 'source';
  const primary = size * size - 1;
  Object.assign(tiles[primary], { kind: 'load', required: true, loadId: 'L1', name: 'Work lamp', resistance: 120 });
  const loads = [primary], requiredCount = [1, 2, 3, 3, 4][tier];
  const resistances = [120, 180, 240, 330], names = ['Work lamp', 'Inspection lamp', 'Service lamp', 'Indicator lamp'];
  for (let branch = 1; branch < requiredCount; branch++) {
    const choices = [];
    for (let index = 0; index < tiles.length; index++) if (tiles[index].kind === 'wire' && bitCount(tiles[index].mask) < 4) {
      for (const direction of DIRECTIONS) {
        const next = neighbour(index, direction, size);
        if (next >= 0 && tiles[next].kind === 'blank') choices.push({ index, next, direction });
      }
    }
    const choice = choices[Math.floor(random() * choices.length)];
    if (!choice) throw new Error('Circuit lacks a branch location');
    const { index, next, direction } = choice;
    tiles[index].mask |= direction.bit;
    let load = next, loadMask = direction.opposite;
    // Longer branches require routing as well as recognizing the tee junction.
    if (tier >= 2 && random() > 0.35) {
      const extensions = DIRECTIONS.map(d => ({ direction: d, next: neighbour(next, d, size) }))
        .filter(option => option.next >= 0 && tiles[option.next].kind === 'blank');
      if (extensions.length) {
        const extension = extensions[Math.floor(random() * extensions.length)];
        tiles[next] = tile('wire', direction.opposite | extension.direction.bit);
        load = extension.next; loadMask = extension.direction.opposite;
      }
    }
    tiles[load] = tile('load', loadMask, { required: true, loadId: `L${branch + 1}`, name: names[branch], resistance: resistances[branch] });
    loads.push(load);
  }

  const adjacentBlank = () => {
    const choices = [];
    for (let index = 0; index < tiles.length; index++) if (tiles[index].kind === 'blank') {
      for (const direction of DIRECTIONS) {
        const parent = neighbour(index, direction, size);
        if (parent >= 0 && tiles[parent].kind === 'wire') choices.push({ index, direction, parent });
      }
    }
    return choices;
  };
  const groundChoices = adjacentBlank();
  const ground = level === 1 ? 11 : groundChoices[Math.floor(random() * groundChoices.length)]?.index;
  if (ground === undefined) throw new Error('Circuit lacks a return fault terminal');
  tiles[ground] = tile('ground', 15, { name: 'Exposed return terminal' });
  const spareChoices = adjacentBlank();
  const spareChoice = level === 1 ? { index: 18, direction: DIRECTIONS[0] } : spareChoices[Math.floor(random() * spareChoices.length)];
  if (spareChoice) tiles[spareChoice.index] = tile('spare', spareChoice.direction.bit, { name: 'Parked auxiliary load', resistance: 60, required: false, loadId: 'AUX' });

  const blanks = tiles.map((value, index) => value.kind === 'blank' ? index : -1).filter(index => index >= 0);
  for (let i = blanks.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [blanks[i], blanks[j]] = [blanks[j], blanks[i]];
  }
  for (const index of blanks.slice(0, 2 + tier * 2)) {
    const shape = [3, 5, 7][Math.floor(random() * 3)];
    tiles[index] = tile('wire', rotateMask(shape, Math.floor(random() * 4)), { parked: true });
  }
  let solutionCost = 0;
  for (const cell of tiles) {
    cell.period = rotationPeriod(cell.mask); cell.rotatable = cell.kind === 'wire' && cell.period > 1;
    if (cell.rotatable) {
      cell.initialRotation = level === 1 && !cell.parked ? cell.period - 1 : Math.floor(random() * cell.period);
      if (!cell.parked) solutionCost += Math.min(cell.initialRotation, cell.period - cell.initialRotation);
    }
  }
  if (solutionCost === 0) {
    const cell = tiles.find(value => value.rotatable && !value.parked); cell.initialRotation = 1; solutionCost = 1;
  }
  const voltage = level === 1 ? 12 : [6, 9, 12, 18, 24][Math.floor(random() * 5)];
  const expectedCurrent = loads.reduce((sum, index) => sum + voltage / tiles[index].resistance, 0);
  const fuseCurrent = [0.15, 0.25, 0.4, 0.5, 0.75, 1].find(rating => rating >= expectedCurrent * 1.25);
  const moveBudget = level === 1 ? 12 : Math.ceil(solutionCost * (1.7 - tier * 0.12)) + 5;
  return {
    version: 1, level, tier: tierFor(level), size, source: 0, primary, route, tiles, loads, ground,
    voltage, expectedCurrent, fuseCurrent, solutionCost, moveBudget,
    title: ['Workshop feed', 'Two-load distribution', 'Three-branch service', 'Precision routing', 'Master commissioning'][tier],
    description: level === 1
      ? 'Route the positive feed from A1 to lamp E5. The return rail is already wired. Turn the seven route segments, keep exposed return B3 isolated, then test the circuit.'
      : `Commission ${requiredCount} specified loads. Connect matching terminals, isolate the exposed return and parked auxiliary load, and finish within ${moveBudget} quarter-turns.`
  };
}
