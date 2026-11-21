import { readFileSync, writeFileSync } from 'node:fs';
import { packPlayerMesh } from '../game9/player-mesh.js';
import { createHash } from 'node:crypto';

const inputs = [
  ['makehuman-base.obj', 'd26635e9326e3cca30778fd7b9c00062b03cce09'],
  ['makehuman-skeleton.json', 'b02cbecae00143856410d7561adf006d83bf9b3e'],
  ['makehuman-weights.json', '66185806afacf87749be8e5cf6dbf66496b2a6b0']
];
const [obj, skeletonText, weightsText] = inputs.map(([name, expected]) => {
  const bytes = readFileSync(new URL(`../dist/${name}`, import.meta.url));
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
const kitRegions = [
  { slot: 4, top: -7.55 },
  { slot: 3, bottom: -7.55, top: -4.8 },
  { slot: 2, bottom: -4.8, top: 0.5 },
  { slot: 1, bottom: 0.5, top: 5.42, left: -2.72, right: 2.72 },
  { slot: 0, bottom: 0.5, top: 5.42, right: -2.72 },
  { slot: 0, bottom: 0.5, top: 5.42, left: 2.72 },
  { slot: 0, bottom: 5.42 },
];

function intersection(a, b, axis, limit) {
  const fraction = (limit - a.position[axis]) / (b.position[axis] - a.position[axis]);
  if (fraction <= 0) return a;
  if (fraction >= 1) return b;
  const interpolate = (start, end) => start + (end - start) * fraction;
  const position = a.position.map((value, index) => index === axis ? limit : interpolate(value, b.position[index]));
  const uv = a.uv.map((value, index) => interpolate(value, b.uv[index]));
  const influence = new Map(a.weights.map(([bone, weight]) => [bone, weight * (1 - fraction)]));
  for (const [bone, weight] of b.weights) influence.set(bone, (influence.get(bone) ?? 0) + weight * fraction);
  // A shared source edge produces the same normal seam even on opposite sides of an atlas seam.
  const key = `${[a.key, b.key].sort().join('|')}:${axis}:${limit}`;
  return { key, position, uv, weights: [...influence] };
}

function clip(polygon, axis, limit, keepGreater) {
  if (limit === undefined || !polygon.length) return polygon;
  const inside = corner => keepGreater ? corner.position[axis] >= limit : corner.position[axis] <= limit;
  const result = [];
  let previous = polygon.at(-1);
  for (const corner of polygon) {
    if (inside(corner) !== inside(previous)) result.push(intersection(previous, corner, axis, limit));
    if (inside(corner)) result.push(corner);
    previous = corner;
  }
  return result;
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
    key: String(vertex), position: source[vertex], uv: sourceUvs[uvs[index]], weights: byVertex[vertex],
  }));
  if (groupName !== 'body') {
    emit(corners, 5);
    continue;
  }
  for (let index = 1; index < corners.length - 1; index++) {
    const triangle = [corners[0], corners[index], corners[index + 1]];
    for (const { slot, bottom, top, left, right } of kitRegions) {
      let polygon = clip(triangle, 1, bottom, true);
      polygon = clip(polygon, 1, top, false);
      polygon = clip(polygon, 0, left, true);
      emit(clip(polygon, 0, right, false), slot);
    }
  }
}
const normalSeams = [...normalGroups.values()].filter(indices => indices.length > 1);
const model = { positions, skinUvs, normalSeams, skinIndices, skinWeights, sections, rig };
writeFileSync(new URL('../game9/defender.mesh.bin', import.meta.url), packPlayerMesh(model));
console.log(`Goal Line defender: ${visibleVertices.size} vertices, ${rig.length} joints, ${sections.reduce((sum, section) => sum + section.length / 3, 0)} triangles`);
