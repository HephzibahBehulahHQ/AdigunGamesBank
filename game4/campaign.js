import { campaign, LEVEL_COUNT, randomFor, tierFor, validLevel } from '../shared/progression.js';

export { LEVEL_COUNT };
export const CAMPAIGN_ID = 'volt-dodge';
const key = (x, z) => `${x},${z}`;
const DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const shuffle = (items, rng) => { for (let index = items.length - 1; index > 0; index--) { const other = Math.floor(rng() * (index + 1)); [items[index], items[other]] = [items[other], items[index]]; } return items; };
function distances(cells, start) {
  const queue = [start], result = new Map([[key(start.x, start.z), 0]]);
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index], distance = result.get(key(point.x, point.z));
    for (const [dx, dz] of DIRECTIONS) {
      const next = { x: point.x + dx, z: point.z + dz }, id = key(next.x, next.z);
      if (cells.has(id) && !result.has(id)) { result.set(id, distance + 1); queue.push(next); }
    }
  }
  return result;
}
function estimateRoute(cells, start, cores, exit) {
  let position = start, length = 0, remaining = [...cores];
  while (remaining.length) {
    const map = distances(cells, position); remaining.sort((a, b) => map.get(key(a.x, a.z)) - map.get(key(b.x, b.z)));
    const next = remaining.shift(); length += map.get(key(next.x, next.z)); position = next;
  }
  return length + distances(cells, position).get(key(exit.x, exit.z));
}

/** Original fictional arcade sectors. Grid units are gameplay coordinates;
 * sparks, shields and energy cores are not an electrical-safety simulation. */
export function levelConfig(value) {
  const level = validLevel(value), tierIndex = Math.floor((level - 1) / 2000), rng = randomFor(Math.imul(level, 0x85ebca6b) ^ 0x7017d0d6);
  const size = 9 + 2 * Math.floor(tierIndex / 2), wallSet = new Set(), safe = new Set(), hazards = [];
  let start, exit, cores;
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) wallSet.add(key(x, z));
  if (level === 1) {
    for (let z = 1; z < 8; z++) for (let x = 1; x < 8; x++) wallSet.delete(key(x, z));
    for (const [x, z] of [[3, 3], [5, 3], [3, 5], [5, 5]]) wallSet.add(key(x, z));
    start = { x: 1, z: 1 }; exit = { x: 1, z: 7 };
    cores = [{ x: 4, z: 1 }, { x: 7, z: 4 }, { x: 4, z: 7 }];
    hazards.push({ id: 0, a: { x: 2, z: 2 }, b: { x: 2, z: 2 }, speed: 0, offset: 0, radius: .22 },
      { id: 1, a: { x: 4, z: 2 }, b: { x: 4, z: 6 }, speed: .8, offset: 0, radius: .22 },
      { id: 2, a: { x: 6, z: 3 }, b: { x: 6, z: 5 }, speed: .65, offset: 1, radius: .22 });
    for (let z = 1; z < 8; z++) for (let x = 1; x < 8; x++) if ((x === 1 || x === 7 || z === 1 || z === 7) && !wallSet.has(key(x, z))) safe.add(key(x, z));
  } else {
    const corners = [{ x: 1, z: 1 }, { x: size - 2, z: 1 }, { x: size - 2, z: size - 2 }, { x: 1, z: size - 2 }];
    start = corners[Math.floor(rng() * corners.length)];
    const stack = [start], visited = new Set([key(start.x, start.z)]); safe.add(key(start.x, start.z)); wallSet.delete(key(start.x, start.z));
    while (stack.length) {
      const point = stack.at(-1);
      const nexts = shuffle(DIRECTIONS.map(([dx, dz]) => ({ x: point.x + 2 * dx, z: point.z + 2 * dz, dx, dz })).filter(next => next.x > 0 && next.x < size - 1 && next.z > 0 && next.z < size - 1 && !visited.has(key(next.x, next.z))), rng);
      if (!nexts.length) { stack.pop(); continue; }
      const next = nexts[0]; visited.add(key(next.x, next.z));
      for (const [x, z] of [[point.x + next.dx, point.z + next.dz], [next.x, next.z]]) { safe.add(key(x, z)); wallSet.delete(key(x, z)); }
      stack.push({ x: next.x, z: next.z });
    }
    const fromStart = distances(safe, start);
    const safePoints = [...safe].map(id => { const [x, z] = id.split(',').map(Number); return { x, z }; });
    exit = [...safePoints].sort((a, b) => fromStart.get(key(b.x, b.z)) - fromStart.get(key(a.x, a.z)))[0];
    const candidates = shuffle(safePoints.filter(point => fromStart.get(key(point.x, point.z)) >= 3 && key(point.x, point.z) !== key(exit.x, exit.z)), rng);
    cores = [];
    for (const point of candidates) if (cores.length < 3 + tierIndex && cores.every(core => Math.abs(point.x - core.x) + Math.abs(point.z - core.z) >= 2)) cores.push(point);
    for (const point of candidates) if (cores.length < 3 + tierIndex && !cores.includes(point)) cores.push(point);
    // Spark tracks are carved from cells outside the preserved connected route.
    // The test suite independently reconstructs a safe route from the final
    // obstacles and complete hazard envelopes; it does not consume this set.
    for (let index = 0; index < 2 + tierIndex; index++) {
      const available = shuffle([...wallSet].map(id => { const [x, z] = id.split(',').map(Number); return { x, z }; }).filter(point => point.x > 0 && point.x < size - 1 && point.z > 0 && point.z < size - 1), rng);
      if (!available.length) break;
      const a = available[0]; let b = { ...a }, direction = DIRECTIONS[Math.floor(rng() * 4)];
      if (index % 2 === 0) {
        const movable = shuffle(DIRECTIONS.filter(([dx, dz]) => wallSet.has(key(a.x + dx, a.z + dz)) && a.x + dx > 0 && a.x + dx < size - 1 && a.z + dz > 0 && a.z + dz < size - 1), rng);
        if (movable.length) direction = movable[0];
      }
      const targetLength = index % 2 === 0 ? 1 + Math.floor(rng() * 2) : Math.floor(rng() * 3);
      wallSet.delete(key(a.x, a.z));
      for (let step = 1; step <= targetLength; step++) {
        const x = a.x + direction[0] * step, z = a.z + direction[1] * step;
        if (x <= 0 || z <= 0 || x >= size - 1 || z >= size - 1 || !wallSet.has(key(x, z))) break;
        b = { x, z }; wallSet.delete(key(x, z));
      }
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      hazards.push({ id: index, a, b, speed: length ? Number((.6 + tierIndex * .13 + rng() * .35).toFixed(3)) : 0,
        offset: length ? Number((rng() * length * 2).toFixed(4)) : 0, radius: .22 });
    }
    // A few opened cells create optional shortcuts through the spark alcoves.
    const extra = shuffle([...wallSet].filter(id => { const [x, z] = id.split(',').map(Number); return x > 0 && z > 0 && x < size - 1 && z < size - 1; }), rng);
    extra.slice(0, 1 + tierIndex).forEach(id => wallSet.delete(id));
  }
  const speed = 2.5 + tierIndex * .08, safeRouteLength = estimateRoute(safe, start, cores, exit);
  const walls = [...wallSet].map(id => { const [x, z] = id.split(',').map(Number); return { x, z }; }).sort((a, b) => a.z - b.z || a.x - b.x);
  const blocked = Array.from({ length: size }, (_, z) => Array.from({ length: size }, (_, x) => wallSet.has(key(x, z))));
  return {
    version: 1, level, tier: tierFor(level), tierIndex, size, start, exit, walls, blocked, hazards,
    cores: cores.map((point, index) => ({ ...point, id: index, name: `Core ${String.fromCharCode(65 + index)}` })),
    playerRadius: .23, speed, shields: tierIndex < 3 ? 3 : 2, hitCooldown: .85,
    timeLimit: level === 1 ? 25 : Math.max(20, Math.ceil(safeRouteLength / speed * [2.2, 2, 1.8, 1.6, 1.45][tierIndex] + 6)),
    brief: level === 1 ? 'Recover the three cores around the outer lanes, then return to the exit in the southwest. The inner spark junctions are dangerous.' : `Recover all ${cores.length} cores from sector ${level.toLocaleString()}, then reach the exit. Spark alcoves offer shorter routes, but shields and time are finite.`
  };
}
export function createCampaign(storage) { return campaign(CAMPAIGN_ID, storage); }
