import { THREE, box, material } from '../shared/three-stage.js';

const concrete = { roughness: 0.91, metalness: 0 };
const steel = { roughness: 0.4, metalness: 0.55 };

function addDugout(scene, z) {
  const x = 24.1;
  box(scene, [2.3, 0.12, 7.6], [x, 0.01, z], '#aaa69a', concrete);
  box(scene, [1.85, 0.12, 7.5], [x, 2.36, z], '#34434b', steel);
  box(scene, [0.1, 2.35, 7.5], [x + 0.94, 1.175, z], '#5e6d72', steel);
  for (const end of [-3.65, 3.65]) {
    box(scene, [1.8, 0.95, 0.10], [x, 0.54, z + end], '#6a7b80', steel);
    box(scene, [0.08, 2.36, 0.08], [x - 0.90, 1.18, z + end], '#7c8990', steel);
  }
  for (let seat = 0; seat < 10; seat++) {
    const at = z - 3.1 + seat * 0.68;
    box(scene, [0.50, 0.09, 0.47], [x + 0.18, 0.51, at], '#284762', concrete);
    box(scene, [0.08, 0.42, 0.47], [x + 0.41, 0.73, at], '#284762', concrete);
  }
  box(scene, [1.85, 0.16, 0.11], [x, 2.26, z + 3.64], '#79868a', steel);
  box(scene, [1.85, 0.16, 0.11], [x, 2.26, z - 3.64], '#79868a', steel);
}

export function addTrainingGround(scene) {
  box(scene, [82, 0.16, 102], [0, -0.15, 33], '#6a706d', concrete);
  for (const side of [-1, 1]) {
    const railX = side * 25.2;
    box(scene, [0.2, 0.46, 79], [railX, 0.23, 30], '#999e9b', concrete);
    box(scene, [0.06, 0.06, 79], [railX, 1.15, 30], '#7a8891', steel);
    for (let z = -8; z < 70; z += 3) {
      box(scene, [0.06, 0.75, 0.06], [railX, 0.77, z], '#77848b', steel);
    }
    for (let row = 0; row < 6; row++) {
      const x = side * (28 + row * 0.83);
      const height = 0.35 + row * 0.38;
      box(scene, [0.84, height, 38], [x, height / 2, 18], '#90918c', concrete);
    }
    box(scene, [0.22, 2.65, 38], [side * 33, 1.325, 18], '#8e9694', concrete);
    addSeats(scene, side);
    box(scene, [5.9, 0.14, 39], [side * 30.55, 4.75, 18], '#57605e', steel);
    for (const z of [0, 9, 18, 27, 36]) {
      box(scene, [0.15, 4.75, 0.15], [side * 33, 2.38, z], '#687577', steel);
      box(scene, [5.65, 0.13, 0.17], [side * 30.45, 4.57, z], '#687577', steel);
    }
  }
  for (const x of [-28, 28]) {
    for (const z of [-4, 48]) {
      box(scene, [0.32, 12, 0.32], [x, 6, z], '#7d878b', steel);
      box(scene, [2.3, 0.73, 0.48], [x, 11.85, z], '#5b666b', steel);
      for (const offset of [-0.82, 0, 0.82]) {
        box(scene, [0.63, 0.53, 0.02], [x + offset, 11.85, z + 0.25], '#d5d8ce', concrete);
      }
    }
  }
  addDugout(scene, 17.4);
  addDugout(scene, 28.4);
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
