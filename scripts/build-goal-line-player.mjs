import { readFileSync, writeFileSync } from 'node:fs';
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
  if (kind === 'f' && (group === 'body' || group === 'helper-tights' || /^helper-[lr]-eye$/.test(group))) {
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

// Material slots: skin, jersey, shorts, socks, boots, eyes.
function kitSlot([x, y], groupName) {
  if (/^helper-[lr]-eye$/.test(groupName)) return 5;
  if (y < -7.55) return 4;
  if (y < -4.8) return 3;
  if (y < 0.5) return 2;
  if (y < 5.42 && Math.abs(x) < 2.72) return 1;
  return 0;
}
const visibleVertices = new Map();
const positions = [];
const skinUvs = [];
const normalGroups = new Map();
const skinIndices = [];
const skinWeights = [];
const sections = Array.from({ length: 6 }, () => []);
function packedIndex(vertex, uv) {
  const key = `${vertex}/${uv}`;
  if (visibleVertices.has(key)) return visibleVertices.get(key);
  const packed = visibleVertices.size;
  visibleVertices.set(key, packed);
  if (!normalGroups.has(vertex)) normalGroups.set(vertex, []);
  normalGroups.get(vertex).push(packed);
  positions.push(...toMetres(source[vertex]));
  if (uv !== -1 && !sourceUvs[uv]) throw new Error(`Missing skin atlas coordinate for vertex ${vertex}`);
  skinUvs.push(...(uv === -1 ? [0, 0] : sourceUvs[uv].map(round)));
  const top = byVertex[vertex].sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!top.length) throw new Error(`Missing rig weights for vertex ${vertex}`);
  const total = top.reduce((sum, [, weight]) => sum + weight, 0);
  while (top.length < 4) top.push([0, 0]);
  skinIndices.push(...top.map(([index]) => index));
  skinWeights.push(...top.map(([, weight]) => round(weight / total)));
  return packed;
}

for (const { group: groupName, vertices, uvs } of faces) {
  const slot = kitSlot(average(vertices), groupName);
  if (groupName === 'helper-tights' && (slot === 0 || slot === 4)) continue;
  const indices = vertices.map((vertex, index) => packedIndex(vertex, slot === 0 ? uvs[index] : -1));
  for (let i = 1; i < indices.length - 1; i++) sections[slot].push(indices[0], indices[i], indices[i + 1]);
}
const normalSeams = [...normalGroups.values()].filter(indices => indices.length > 1);
const model = { positions, skinUvs, normalSeams, skinIndices, skinWeights, sections, rig };
writeFileSync(new URL('../game9/defender.mesh.json', import.meta.url), JSON.stringify(model));
console.log(`Goal Line defender: ${visibleVertices.size} vertices, ${rig.length} joints, ${sections.reduce((sum, section) => sum + section.length / 3, 0)} triangles`);
