import { THREE, box, material } from '../shared/three-stage.js';

const concrete = { roughness: 0.91, metalness: 0 };
const steel = { roughness: 0.4, metalness: 0.55 };

export function addOutletMarkers(scene) {
  const gate = new THREE.Group();
  scene.add(gate);
  const rubber = new THREE.BoxGeometry(0.32, 0.032, 0.32);
  const lower = new THREE.CylinderGeometry(0.064, 0.136, 0.24, 20);
  const band = new THREE.CylinderGeometry(0.047, 0.064, 0.058, 20);
  const top = new THREE.CylinderGeometry(0.022, 0.047, 0.084, 20);
  const baseMaterial = material('#393634', { roughness: 0.96, metalness: 0 });
  const orange = material('#d76b26', { roughness: 0.78, metalness: 0 });
  const reflector = material('#efdfbe', { roughness: 0.7, metalness: 0 });
  function cone() {
    const group = new THREE.Group();
    for (const [geometry, finish, y] of [[rubber, baseMaterial, 0.016], [lower, orange, 0.152],
      [band, reflector, 0.301], [top, orange, 0.372]]) {
      const mesh = new THREE.Mesh(geometry, finish);
      mesh.position.y = y;
      mesh.castShadow = true;
      group.add(mesh);
    }
    gate.add(group);
    return group;
  }
  const left = cone();
  const right = cone();
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.07).rotateX(-Math.PI / 2), reflector);
  stripe.position.y = 0.003;
  stripe.receiveShadow = true;
  gate.add(stripe);
  return {
    gate,
    setWidth(halfWidth) {
      left.position.x = -halfWidth - 0.16;
      right.position.x = halfWidth + 0.16;
      stripe.scale.x = halfWidth * 2;
    },
  };
}

function addDugout(structure, z) {
  const x = 24.1;
  structure([2.3, 0.12, 7.6], [x, 0.01, z], '#aaa69a', concrete);
  structure([1.85, 0.12, 7.5], [x, 2.36, z], '#34434b', steel);
  structure([0.1, 2.35, 7.5], [x + 0.94, 1.175, z], '#5e6d72', steel);
  for (const end of [-3.65, 3.65]) {
    structure([1.8, 0.95, 0.10], [x, 0.54, z + end], '#6a7b80', steel);
    structure([0.08, 2.36, 0.08], [x - 0.90, 1.18, z + end], '#7c8990', steel);
  }
  for (let seat = 0; seat < 10; seat++) {
    const at = z - 3.1 + seat * 0.68;
    structure([0.50, 0.09, 0.47], [x + 0.18, 0.51, at], '#284762', concrete);
    structure([0.08, 0.42, 0.47], [x + 0.41, 0.73, at], '#284762', concrete);
  }
  structure([1.85, 0.16, 0.11], [x, 2.26, z + 3.64], '#79868a', steel);
  structure([1.85, 0.16, 0.11], [x, 2.26, z - 3.64], '#79868a', steel);
}

export function addTrainingGround(scene) {
  box(scene, [82, 0.16, 102], [0, -0.15, 33], '#6a706d', concrete);
  const endRailZ = -10.6;
  const farRailZ = 69.5;
  const railLength = farRailZ - endRailZ;
  const railCenterZ = (endRailZ + farRailZ) / 2;
  const batches = new Map([[concrete, []], [steel, []]]);
  function structure(size, position, color, finish) {
    batches.get(finish).push({ size, position, color });
  }
  for (const side of [-1, 1]) {
    const railX = side * 25.2;
    structure([0.2, 0.46, railLength], [railX, 0.23, railCenterZ], '#999e9b', concrete);
    structure([0.06, 0.06, railLength], [railX, 1.15, railCenterZ], '#7a8891', steel);
    for (let z = -8; z < 70; z += 3) {
      structure([0.06, 0.75, 0.06], [railX, 0.77, z], '#77848b', steel);
    }
    for (let row = 0; row < 6; row++) {
      const x = side * (28 + row * 0.83);
      const height = 0.35 + row * 0.38;
      structure([0.84, height, 38], [x, height / 2, 18], '#90918c', concrete);
    }
    structure([0.22, 2.65, 38], [side * 33, 1.325, 18], '#8e9694', concrete);
    addSeats(scene, side);
    structure([5.9, 0.14, 39], [side * 30.55, 4.75, 18], '#57605e', steel);
    for (const z of [0, 9, 18, 27, 36]) {
      structure([0.15, 4.75, 0.15], [side * 33, 2.38, z], '#687577', steel);
      structure([5.65, 0.13, 0.17], [side * 30.45, 4.57, z], '#687577', steel);
    }
  }
  structure([50.6, 0.46, 0.20], [0, 0.23, endRailZ], '#999e9b', concrete);
  structure([50.6, 0.06, 0.06], [0, 1.15, endRailZ], '#7a8891', steel);
  for (let post = 0; post <= 18; post++) {
    const x = -25.2 + post * 2.8;
    structure([0.06, 0.75, 0.06], [x, 0.77, endRailZ], '#77848b', steel);
  }
  for (const x of [-28, 28]) {
    for (const z of [-4, 48]) {
      structure([0.32, 12, 0.32], [x, 6, z], '#7d878b', steel);
      structure([2.3, 0.73, 0.48], [x, 11.85, z], '#5b666b', steel);
      for (const offset of [-0.82, 0, 0.82]) {
        structure([0.63, 0.53, 0.02], [x + offset, 11.85, z + 0.25], '#d5d8ce', concrete);
      }
    }
  }
  addDugout(structure, 17.4);
  addDugout(structure, 28.4);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const transform = new THREE.Matrix4();
  const tint = new THREE.Color();
  for (const [finish, parts] of batches) {
    const mesh = new THREE.InstancedMesh(geometry, material('#ffffff', finish), parts.length);
    for (const [index, { size, position, color }] of parts.entries()) {
      mesh.setMatrixAt(index, transform.makeScale(...size).setPosition(...position));
      mesh.setColorAt(index, tint.set(color));
    }
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  }
  // Continue the terrain behind the venue apron so the broadcast view has a horizon.
  const verge = new THREE.Mesh(new THREE.PlaneGeometry(220, 120).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: '#68765b' }));
  verge.position.set(0, -0.24, -65);
  scene.add(verge);
}

function addSeats(scene, side) {
  const rows = 6;
  const seatsPerRow = 65;
  const seat = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.45, 0.10, 0.45),
    material('#243f57', { roughness: 0.76, metalness: 0 }),
    rows * seatsPerRow
  );
  const back = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.08, 0.35, 0.45),
    seat.material,
    rows * seatsPerRow
  );
  const transform = new THREE.Matrix4();
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < seatsPerRow; column++) {
      const x = side * (28 + row * 0.83);
      const y = 0.54 + row * 0.38;
      const z = column * 0.55;
      const index = row * seatsPerRow + column;
      seat.setMatrixAt(index, transform.makeTranslation(x, y, z));
      back.setMatrixAt(index, transform.makeTranslation(x + side * 0.23, y + 0.14, z));
    }
  }
  scene.add(seat, back);
}
