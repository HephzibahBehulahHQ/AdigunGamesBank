import { THREE, box, material } from '../shared/three-stage.js';
import { randomFor } from '../shared/progression.js';

function turfTextures() {
  // One repeat covers four metres. The same blades affect colour and surface relief.
  const size = 512;
  const color = document.createElement('canvas');
  const height = document.createElement('canvas');
  color.width = color.height = height.width = height.height = size;
  const grass = color.getContext('2d');
  const relief = height.getContext('2d');
  grass.fillStyle = '#32462b';
  grass.fillRect(0, 0, size, size);
  relief.fillStyle = '#242424';
  relief.fillRect(0, 0, size, size);
  const random = randomFor(913);
  for (let blade = 0; blade < 18000; blade++) {
    const x = random() * size;
    const y = random() * size;
    const tone = Math.round(35 + random() * 45);
    const length = 1 + random() * 3.4;
    const lean = (random() - 0.5) * 3;
    grass.fillStyle = `rgb(${tone - 9}, ${tone + 22}, ${tone - 15})`;
    relief.fillStyle = `rgb(${tone + 82}, ${tone + 82}, ${tone + 82})`;
    for (const context of [grass, relief]) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + lean, y - length);
      context.lineTo(x + 0.75, y);
      context.fill();
    }
  }
  const map = new THREE.CanvasTexture(color);
  const bumpMap = new THREE.CanvasTexture(height);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, bumpMap]) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}

export function addGround(scene, renderer) {
  const { map, bumpMap } = turfTextures();
  map.anisotropy = bumpMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const width = 48;
  const stripeLength = 5;
  map.repeat.set(width / 4, stripeLength / 4);
  bumpMap.repeat.copy(map.repeat);
  const surface = new THREE.PlaneGeometry(width, stripeLength);
  const turf = {
    map, bumpMap, bumpScale: 0.026, metalness: 0, roughness: 0.92
  };
  const mowing = [material('#c5d2ad', turf), material('#f4f4d6', turf)];
  for (let stripe = 0; stripe < 16; stripe++) {
    const ground = new THREE.Mesh(surface, mowing[stripe % 2]);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.012, -8 + stripe * stripeLength);
    ground.receiveShadow = true;
    scene.add(ground);
  }
  const paint = '#d6d6c8';
  const paintMaterial = { roughness: 0.94, metalness: 0 };
  function marking(x, z, width, length) {
    return box(scene, [width, 0.003, length], [x, -0.007, z], paint, paintMaterial);
  }
  marking(0, 0, 44, 0.112);
  marking(0, 5.5, 18.32, 0.112);
  marking(0, 16.5, 40.32, 0.112);
  for (const side of [-1, 1]) {
    marking(side * 22, 34, 0.112, 68);
    marking(side * 9.16, 2.75, 0.112, 5.5);
    marking(side * 20.16, 8.25, 0.112, 16.5);
  }
}

export function addGoal(scene) {
  const halfWidth = 3.66;
  const height = 2.44;
  const radius = 0.06;
  const frame = material('#e2e4de', { roughness: 0.34, metalness: 0.18 });
  function pipe(start, end) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const axis = new THREE.Vector3().subVectors(b, a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, axis.length(), 20), frame);
    mesh.position.copy(a.add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    mesh.castShadow = true;
    scene.add(mesh);
  }
  const post = halfWidth + radius;
  const bar = height + radius;
  for (const x of [-post, post]) pipe([x, 0, 0], [x, bar, 0]);
  pipe([-post, bar, 0], [post, bar, 0]);
  const cords = [];
  const depth = 1.8;
  const rowCount = 20;
  const columns = 60;
  function strand(a, b) { cords.push(...a, ...b); }
  for (let row = 0; row <= rowCount; row++) {
    const y = bar * row / rowCount;
    strand([-post, y, -depth], [post, y, -depth]);
    for (const side of [-1, 1]) strand([side * post, y, 0], [side * post, y, -depth]);
  }
  for (let column = 0; column <= columns; column++) {
    const x = -post + 2 * post * column / columns;
    strand([x, 0, -depth], [x, bar, -depth]);
    strand([x, bar, -depth], [x, bar, 0]);
  }
  for (let step = 0; step <= 15; step++) {
    const z = -depth * step / 15;
    strand([-post, bar, z], [post, bar, z]);
    for (const x of [-post, post]) strand([x, 0, z], [x, bar, z]);
  }
  const net = new THREE.BufferGeometry();
  net.setAttribute('position', new THREE.Float32BufferAttribute(cords, 3));
  scene.add(new THREE.LineSegments(net, new THREE.LineBasicMaterial({
    color: '#e0e3dc', opacity: 0.42, transparent: true
  })));
}
