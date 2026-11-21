import { readFileSync, writeFileSync } from 'node:fs';
import { packPlayerMesh } from '../game9/player-mesh.js';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const inputs = [
  ['makehuman-base.obj', 'd26635e9326e3cca30778fd7b9c00062b03cce09'],
  ['makehuman-skeleton.json', 'b02cbecae00143856410d7561adf006d83bf9b3e'],
  ['makehuman-weights.json', '66185806afacf87749be8e5cf6dbf66496b2a6b0']
];
const sourceDirectory = process.argv[2] ?? fileURLToPath(new URL('../dist', import.meta.url));
const [obj, skeletonText, weightsText] = inputs.map(([name, expected]) => {
  const bytes = readFileSync(join(sourceDirectory, name));
  const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (sha !== expected) throw new Error(`Unexpected upstream asset revision for ${name}`);
  return bytes.toString('utf8');
});
const { bones, joints } = JSON.parse(skeletonText);
const { weights } = JSON.parse(weightsText);
const source = [];
const sourceUvs = [];
const faces = [];
let group;
for (const line of obj.split(/\r?\n/)) {
  const [kind, ...fields] = line.trim().split(/\s+/);
  if (kind === 'g') group = fields[0];
  if (kind === 'v') source.push(fields.map(Number));
  if (kind === 'vt') sourceUvs.push(fields.slice(0, 2).map(Number));
  if (kind === 'f' && (group === 'body' || /^helper-[lr]-eye$/.test(group))) {
    const corners = fields.map(field => field.split('/').slice(0, 2).map(index => Number(index) - 1));
    faces.push({ group, vertices: corners.map(([vertex]) => vertex), uvs: corners.map(([, uv]) => uv) });
  }
}

const names = Object.keys(bones);
const byVertex = source.map(() => []);
names.forEach((name, bone) => {
  for (const [vertex, weight] of weights[name] ?? []) byVertex[vertex].push([bone, weight]);
});
const round = value => Number(value.toFixed(5));
const average = list => [0, 1, 2].map(axis =>
  list.reduce((sum, vertex) => sum + source[vertex][axis], 0) / list.length
);
const toMetres = ([x, y, z]) => [x * 0.108, (y + 8.22) * 0.108, z * 0.108].map(round);
const rig = names.map(name => {
  const bone = bones[name];
  return [name, names.indexOf(bone.parent), ...toMetres(average(joints[bone.head]))];
});

// Split the body at the actual clothing boundaries instead of assigning whole faces by centroid.
const jersey = { slot: 1, bottom: 0.5, left: -2.72, right: 2.72, collar: -1 };
const kitRegions = [
  { slot: 4, top: -7.55 },
  { slot: 3, bottom: -7.55, top: -4.8 },
  { slot: 2, bottom: -4.8, top: 0.5 },
  jersey,
  { slot: 0, bottom: jersey.bottom, right: jersey.left },
  { slot: 0, bottom: jersey.bottom, left: jersey.right },
  { ...jersey, slot: 0, collar: 1 },
];

function collarHeight(x, z) {
  const shoulderRise = Math.min(1.30, 1.15 * x ** 2);
  const backRise = 0.28 * Math.max(0, Math.min(1, (0.30 - z) / 0.75));
  return 5.20 + shoulderRise + backRise;
}

function shapeJersey() {
  const neighbours = new Map();
  for (const { group: groupName, vertices } of faces) {
    if (groupName !== 'body') continue;
    for (const [index, vertex] of vertices.entries()) {
      if (!neighbours.has(vertex)) neighbours.set(vertex, new Set());
      neighbours.get(vertex).add(vertices[(index + 1) % vertices.length]);
      neighbours.get(vertex).add(vertices[(index + vertices.length - 1) % vertices.length]);
    }
  }
  const panels = [...neighbours].flatMap(([vertex, adjacent]) => {
    const [x, y, z] = source[vertex];
    const inset = Math.min(x - jersey.left, jersey.right - x, y - jersey.bottom, collarHeight(x, z) - y);
    if (inset <= 0) return [];
    return [{ vertex, adjacent: [...adjacent], ease: Math.min(1, inset / 0.5) }];
  });
  let shaped = source.slice();
  // Relax fine anatomical contours inside the shirt while preserving the cut edges and rig weights.
  for (let pass = 0; pass < 6; pass++) {
    const next = shaped.slice();
    for (const { vertex, adjacent, ease } of panels) {
      next[vertex] = shaped[vertex].map((value, axis) => {
        if (axis === 1) return value;
        const mean = adjacent.reduce((sum, neighbour) => sum + shaped[neighbour][axis], 0) / adjacent.length;
        return value + (mean - value) * 0.60 * ease;
      });
    }
    shaped = next;
  }
  for (const { vertex, ease } of panels) {
    const [x, y, z] = shaped[vertex];
    // Add a little garment ease across the torso, tapering to the original collar and cuffs.
    const torso = Math.max(0, 1 - Math.abs(x) / 2.4) * ease;
    const liftedDepth = z + Math.sign(z) * 0.12 * torso;
    // The front panel hangs between the chest and hem instead of tracing each contour.
    const front = Math.max(0, Math.min(1, (z - 0.65) / 0.55));
    const chest = Math.max(0, 1 - ((y - 3.5) / 1.8) ** 2);
    const hangingDepth = 1.53 + chest * 0.18;
    const drape = Math.max(0, Math.min(1, (1.65 - Math.abs(x)) / 0.65)) * front * ease;
    shaped[vertex] = [x * (1 + 0.045 * ease), y,
      liftedDepth + Math.max(0, hangingDepth - liftedDepth) * drape];
  }
  return shaped;
}

const garmentPositions = shapeJersey();

function intersection(a, b, fraction, boundary) {
  if (fraction <= 0) return a;
  if (fraction >= 1) return b;
  const interpolate = (start, end) => start + (end - start) * fraction;
  const position = a.position.map((value, index) => interpolate(value, b.position[index]));
  const uv = a.uv.map((value, index) => interpolate(value, b.uv[index]));
  const influence = new Map(a.weights.map(([bone, weight]) => [bone, weight * (1 - fraction)]));
  for (const [bone, weight] of b.weights) influence.set(bone, (influence.get(bone) ?? 0) + weight * fraction);
  // A shared source edge produces the same normal seam even on opposite sides of an atlas seam.
  const key = `${[a.key, b.key].sort().join('|')}:${boundary}`;
  return { key, position, uv, weights: [...influence] };
}

function clipBoundary(polygon, distance, boundary) {
  if (!polygon.length) return polygon;
  const result = [];
  let previous = polygon.at(-1);
  let previousDistance = distance(previous.position);
  for (const corner of polygon) {
    const currentDistance = distance(corner.position);
    if ((currentDistance >= 0) !== (previousDistance >= 0)) {
      result.push(intersection(previous, corner, previousDistance / (previousDistance - currentDistance), boundary));
    }
    if (currentDistance >= 0) result.push(corner);
    previous = corner;
    previousDistance = currentDistance;
  }
  return result;
}

function clip(polygon, axis, limit, keepGreater) {
  if (limit === undefined) return polygon;
  return clipBoundary(polygon, point => (point[axis] - limit) * (keepGreater ? 1 : -1), `${axis}:${limit}`);
}
const visibleVertices = new Map();
const positions = [];
const skinUvs = [];
const normalGroups = new Map();
const skinIndices = [];
const skinWeights = [];
const sections = Array.from({ length: 6 }, () => []);
function packedIndex(corner, slot) {
  const uv = slot === 0 ? corner.uv.map(round) : [0, 0];
  const key = slot === 0 ? `${corner.key}/${uv.join(',')}` : corner.key;
  if (visibleVertices.has(key)) return visibleVertices.get(key);
  const packed = visibleVertices.size;
  visibleVertices.set(key, packed);
  if (!normalGroups.has(corner.key)) normalGroups.set(corner.key, []);
  normalGroups.get(corner.key).push(packed);
  positions.push(...toMetres(corner.position));
  skinUvs.push(...uv);
  const top = corner.weights.slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!top.length) throw new Error(`Missing rig weights for vertex ${corner.key}`);
  const total = top.reduce((sum, [, weight]) => sum + weight, 0);
  while (top.length < 4) top.push([0, 0]);
  skinIndices.push(...top.map(([index]) => index));
  skinWeights.push(...top.map(([, weight]) => round(weight / total)));
  return packed;
}

function emit(polygon, slot) {
  if (polygon.length < 3) return;
  const indices = polygon.map(corner => packedIndex(corner, slot));
  for (let i = 1; i < indices.length - 1; i++) {
    const triangle = [indices[0], indices[i], indices[i + 1]];
    if (new Set(triangle).size === 3) sections[slot].push(...triangle);
  }
}

for (const { group: groupName, vertices, uvs } of faces) {
  const corners = vertices.map((vertex, index) => ({
    key: String(vertex), position: garmentPositions[vertex], uv: sourceUvs[uvs[index]], weights: byVertex[vertex],
  }));
  if (groupName !== 'body') {
    emit(corners, 5);
    continue;
  }
  for (let index = 1; index < corners.length - 1; index++) {
    const triangle = [corners[0], corners[index], corners[index + 1]];
    for (const { slot, bottom, top, left, right, collar } of kitRegions) {
      let polygon = clip(triangle, 1, bottom, true);
      polygon = clip(polygon, 1, top, false);
      polygon = clip(polygon, 0, left, true);
      polygon = clip(polygon, 0, right, false);
      if (collar) polygon = clipBoundary(polygon, ([x, y, z]) => (y - collarHeight(x, z)) * collar, 'collar');
      emit(polygon, slot);
    }
  }
}
const normalSeams = [...normalGroups.values()].filter(indices => indices.length > 1);
const model = { positions, skinUvs, normalSeams, skinIndices, skinWeights, sections, rig };
writeFileSync(new URL('../game9/defender.mesh.bin', import.meta.url), packPlayerMesh(model));
console.log(`Goal Line defender: ${visibleVertices.size} vertices, ${rig.length} joints, ${sections.reduce((sum, section) => sum + section.length / 3, 0)} triangles`);
