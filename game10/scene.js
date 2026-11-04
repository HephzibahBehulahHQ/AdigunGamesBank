import { THREE, createStage, material, box, cylinder } from '../shared/three-stage.js';
import { trackPoint } from './campaign.js';

function ribbon(parent, config, left, right, height, color, alternating = false) {
  const positions = [], colors = [], indices = [], count = config.segments.length;
  const base = new THREE.Color(color), alternate = new THREE.Color('#F8FAFC');
  for (let i = 0; i <= count; i++) {
    const index = i % count, point = config.points[index];
    const before = config.points[(index + count - 1) % count], after = config.points[(index + 1) % count];
    const dx = after.x - before.x, dz = after.z - before.z, size = Math.hypot(dx, dz);
    for (const offset of [left, right]) positions.push(point.x - dz / size * offset, height, point.z + dx / size * offset);
    const paint = alternating && Math.floor(i / 3) % 2 ? alternate : base;
    colors.push(paint.r, paint.g, paint.b, paint.r, paint.g, paint.b);
    if (i < count) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material('#FFFFFF', { vertexColors: true, side: THREE.DoubleSide, roughness: 0.88 }));
  mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function originalCar(parent) {
  const car = new THREE.Group(); parent.add(car);
  box(car, [3.8, 0.5, 1.68], [0, 0.65, 0], '#22D3EE', { metalness: 0.65, roughness: 0.24 });
  box(car, [1.55, 0.45, 1.43], [-0.15, 1.08, 0], '#1E6680', { metalness: 0.55, roughness: 0.3 });
  const windscreen = box(car, [0.15, 0.4, 1.3], [0.68, 1.07, 0], '#8DC0CF', { metalness: 0.7, roughness: 0.08 });
  windscreen.rotation.z = 0.24;
  box(car, [1.2, 0.025, 0.22], [1.1, 0.92, 0], '#D4AF37', { metalness: 0.55 });
  box(car, [0.8, 0.025, 0.22], [-0.15, 1.32, 0], '#D4AF37', { metalness: 0.55 });
  box(car, [0.18, 0.16, 1.75], [1.88, 0.48, 0], '#101820');
  box(car, [0.12, 0.15, 0.44], [1.94, 0.78, -0.52], '#D9F7FF', { emissive: '#537A9C', emissiveIntensity: 0.3 });
  box(car, [0.12, 0.15, 0.44], [1.94, 0.78, 0.52], '#D9F7FF', { emissive: '#537A9C', emissiveIntensity: 0.3 });
  for (const z of [-0.58, 0.58]) {
    box(car, [0.13, 0.15, 0.38], [-1.93, 0.76, z], '#BB3142', { emissive: '#AA1022', emissiveIntensity: 0.4 });
    box(car, [0.13, 0.45, 0.12], [-1.4, 1, z], '#111A25');
  }
  box(car, [0.4, 0.12, 2.02], [-1.48, 1.27, 0], '#1C2839');
  const wheels = [];
  for (const x of [-1.22, 1.2]) for (const z of [-0.91, 0.91]) {
    const mount = new THREE.Group(); mount.position.set(x, 0.42, z); car.add(mount);
    const rolling = new THREE.Group(); mount.add(rolling);
    const tyre = cylinder(rolling, 0.4, 0.28, [0, 0, 0], '#14191D', { roughness: 0.94 }); tyre.rotation.x = Math.PI / 2;
    const rim = cylinder(rolling, 0.25, 0.295, [0, 0, 0], '#91A2B6', { metalness: 0.85, roughness: 0.25 }); rim.rotation.x = Math.PI / 2;
    const hub = cylinder(rolling, 0.085, 0.31, [0, 0, 0], '#102038'); hub.rotation.x = Math.PI / 2;
    for (let spoke = 0; spoke < 5; spoke++) {
      const strut = box(rolling, [0.43, 0.045, 0.31], [0, 0, 0], '#23354B'); strut.rotation.z = spoke * Math.PI / 5;
    }
    wheels.push({ mount, rolling, front: x > 0 });
  }
  return { group: car, wheels };
}

function free(group) {
  group.traverse(node => {
    node.geometry?.dispose();
    for (const mat of node.material ? Array.isArray(node.material) ? node.material : [node.material] : []) mat.dispose();
  });
  group.removeFromParent();
}

export function createCircuitScene({ canvas, qualitySelect, status }) {
  const stage = createStage({ canvas, qualitySelect, status, shadows: true, position: [0, 76, 76] });
  stage.scene.background = new THREE.Color('#27394A');
  stage.scene.fog = new THREE.Fog('#27394A', 170, 420);
  stage.light.position.set(-40, 80, 25);
  stage.light.shadow.camera.left = stage.light.shadow.camera.bottom = -95;
  stage.light.shadow.camera.right = stage.light.shadow.camera.top = 95;
  stage.light.shadow.camera.far = 220; stage.light.shadow.camera.updateProjectionMatrix();
  let scenery = null, car = null, gate = null, currentLevel = null, cameraMode = 'chase', frameCount = 0;
  let cameraInitial = true;
  const lookAt = new THREE.Vector3(), desiredCamera = new THREE.Vector3();

  function build(config) {
    if (scenery) free(scenery);
    scenery = new THREE.Group(); stage.scene.add(scenery); currentLevel = config.level;
    const extent = config.radius + 20;
    box(scenery, [extent * 8, 0.2, extent * 8], [0, -0.16, 0], '#304C3C', { roughness: 1 });
    ribbon(scenery, config, -config.width / 2 - 4, config.width / 2 + 4, 0, '#8A7E68');
    ribbon(scenery, config, -config.width / 2, config.width / 2, 0.035, '#303942');
    for (const side of [-1, 1]) {
      ribbon(scenery, config, side * config.width / 2, side * (config.width / 2 + 0.65), 0.09, '#B03E39', true);
      ribbon(scenery, config, side * (config.width / 2 - 0.22), side * (config.width / 2 - 0.1), 0.055, '#D9E1E5');
      ribbon(scenery, config, side * (config.width / 2 + 4.1), side * (config.width / 2 + 4.35), 0.75, '#8B98A2');
    }
    const start = trackPoint(config, 0), gantry = new THREE.Group();
    gantry.position.set(start.x, 0.1, start.z); gantry.rotation.y = -start.heading; scenery.add(gantry);
    for (let row = 0; row < 4; row++) for (let column = 0; column < 10; column++) {
      box(gantry, [0.65, 0.015, config.width / 10], [row * 0.65 - 1.3, -0.02, (column - 4.5) * config.width / 10], (row + column) % 2 ? '#182532' : '#ECF0EF');
    }
    for (const z of [-1, 1]) box(gantry, [0.45, 5.6, 0.45], [0, 2.8, z * (config.width / 2 + 1.8)], '#708296');
    box(gantry, [0.65, 1.05, config.width + 4], [0, 5.6, 0], '#0B1220');
    box(gantry, [0.7, 0.14, config.width + 3.8], [0, 5.2, 0], '#D4AF37', { metalness: 0.5 });
    for (let i = 0; i < 5; i++) {
      const lamp = cylinder(gantry, 0.18, 0.7, [0, 5.65, (i - 2) * 0.8], '#A7F3C5', { emissive: '#248047', emissiveIntensity: 0.6 }); lamp.rotation.z = Math.PI / 2;
    }
    // Original service garages and terraced stands, outside the drivable circuit.
    for (let i = 0; i < 3; i++) {
      box(scenery, [10, 4.8 + i * 0.25, 6], [extent + 7, 2.4, (i - 1) * 9], '#546370');
      box(scenery, [10.8, 0.3, 6.8], [extent + 7, 5 + i * 0.25, (i - 1) * 9], '#203145');
      box(scenery, [0.08, 2.8, 4.5], [extent + 1.94, 1.5, (i - 1) * 9], '#182536');
      box(scenery, [0.1, 0.3, 4.5], [extent + 1.87, 3.2, (i - 1) * 9], '#22D3EE');
    }
    for (let row = 0; row < 5; row++) {
      box(scenery, [3.1, 0.8 + row * 0.8, 27], [-extent - row * 2.5, (0.8 + row * 0.8) / 2, 0], '#6F7880');
      box(scenery, [0.65, 0.28, 27], [-extent - row * 2.5, 1.02 + row * 0.8, 0], row % 2 ? '#23456A' : '#D4AF37');
    }
    for (let i = 0; i < 24; i++) {
      const theta = i / 24 * Math.PI * 2, radius = extent + 21 + (i % 3) * 4;
      const x = Math.cos(theta) * radius, z = Math.sin(theta) * radius;
      cylinder(scenery, 0.25, 4.2, [x, 2.1, z], '#51463D');
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5 + (i % 3) * 0.3, 1), material('#284638', { roughness: 1 }));
      crown.position.set(x, 5.1, z); crown.scale.y = 1.3; crown.castShadow = true; scenery.add(crown);
    }
    gate = new THREE.Group(); scenery.add(gate);
    for (const side of [-1, 1]) box(gate, [0.24, 3.8, 0.24], [0, 1.9, side * (config.width / 2 - 0.45)], '#91F1C6', { emissive: '#226746', emissiveIntensity: 0.4 });
    box(gate, [0.24, 0.2, config.width - 0.7], [0, 3.7, 0], '#91F1C6', { emissive: '#226746', emissiveIntensity: 0.4 });
    car = originalCar(scenery); cameraInitial = true;
  }

  function draw(state, reducedMotion = false) {
    if (currentLevel !== state.config.level) build(state.config);
    const vehicle = state.car;
    car.group.position.set(vehicle.x, 0.1, vehicle.z); car.group.rotation.y = -vehicle.heading;
    for (const wheel of car.wheels) {
      wheel.rolling.rotation.z = -state.distanceDriven / 0.4;
      wheel.mount.rotation.y = wheel.front ? -Math.atan(2.6 / state.config.turnRadius) * vehicle.steering : 0;
    }
    const target = trackPoint(state.config, state.nextGate % state.config.gateCount * state.config.length / state.config.gateCount);
    gate.position.set(target.x, 0.1, target.z); gate.rotation.y = -target.heading;
    gate.visible = state.phase !== 'won';
    if (cameraMode === 'circuit' || reducedMotion) {
      const radius = state.config.radius;
      stage.camera.position.set(radius * 0.15, radius * 2.5 + 15, radius * 2.45 + 10); stage.camera.lookAt(0, 0, 0);
    } else {
      desiredCamera.set(vehicle.x - Math.cos(vehicle.heading) * 12, 8.2, vehicle.z - Math.sin(vehicle.heading) * 12);
      if (cameraInitial || state.phase !== 'running') stage.camera.position.copy(desiredCamera);
      else stage.camera.position.lerp(desiredCamera, 0.32);
      lookAt.set(vehicle.x + Math.cos(vehicle.heading) * 9, 0.8, vehicle.z + Math.sin(vehicle.heading) * 9);
      stage.camera.lookAt(lookAt);
    }
    cameraInitial = false; stage.render(); canvas.dataset.frame = String(++frameCount);
  }
  return {
    draw,
    setCamera(mode) { cameraMode = mode === 'circuit' ? 'circuit' : 'chase'; cameraInitial = true; },
    dispose() { stage.dispose(); }
  };
}
