import { THREE, box, material } from '../shared/three-stage.js';
import { BALL_RADIUS, GOAL_HALF_WIDTH, GOAL_POST_RADIUS, NET_DEPTH } from './clearance.js';

export async function loadTurf() {
  const loader = new THREE.TextureLoader();
  const sources = ['grounds-diffuse.jpg', 'grounds-normal.jpg'];
  const results = await Promise.allSettled(sources.map(name =>
    loader.loadAsync(new URL(`./textures/${name}`, import.meta.url).href)
  ));
  const [map, normalMap] = results.map(result => result.value ?? null);
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  return { map, normalMap };
}

export function addGround(scene, renderer, { map, normalMap }) {
  const width = 48;
  const stripeLength = 5;
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  for (const texture of [map, normalMap]) {
    if (!texture) continue;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(texture === normalMap ? 2 : 4, anisotropy);
  }
  const turf = {
    map, normalMap, normalScale: new THREE.Vector2(0.34, 0.34), metalness: 0, roughness: 0.92
  };
  const mowing = map ? ['#6b8859', '#799466'] : ['#3f5935', '#4b633d'];
  const surfaces = mowing.map(color => material(color, turf));
  if (normalMap) {
    for (const surface of surfaces) {
      surface.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
          if (vViewPosition.z < 18.0) {
            vec3 baseNormal = normal;
            ${THREE.ShaderChunk.normal_fragment_maps}
            float nearDetail = 1.0 - smoothstep(12.0, 18.0, vViewPosition.z);
            normal = normalize(mix(baseNormal, normal, nearDetail));
          }
        `);
      };
    }
  }
  for (let stripe = 0; stripe < 16; stripe++) {
    const surface = new THREE.PlaneGeometry(width, stripeLength);
    const uv = surface.getAttribute('uv');
    // Keep the photographed two-metre sample continuous across mowing stripes.
    for (let vertex = 0; vertex < uv.count; vertex++) {
      uv.setXY(vertex, uv.getX(vertex) * width / 2, (uv.getY(vertex) - stripe) * stripeLength / 2);
    }
    if (normalMap) surface.computeTangents();
    const ground = new THREE.Mesh(surface, surfaces[stripe % 2]);
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
  const height = 2.44;
  const radius = GOAL_POST_RADIUS;
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
  const post = GOAL_HALF_WIDTH + radius;
  const bar = height + radius;
  for (const x of [-post, post]) pipe([x, 0, 0], [x, bar, 0]);
  pipe([-post, bar, 0], [post, bar, 0]);
  const cords = [];
  const depth = NET_DEPTH;
  const rowCount = 20;
  const columns = 60;
  function strand(a, b) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const count = Math.ceil(length / 0.24);
    for (let i = 0; i < count; i++) {
      for (const t of [i / count, (i + 1) / count]) {
        cords.push(...a.map((value, axis) => THREE.MathUtils.lerp(value, b[axis], t)));
      }
    }
  }
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
  const rest = Float32Array.from(cords);
  const positions = new THREE.BufferAttribute(rest.slice(), 3).setUsage(THREE.DynamicDrawUsage);
  net.setAttribute('position', positions);
  scene.add(new THREE.LineSegments(net, new THREE.LineBasicMaterial({
    color: '#e0e3dc', opacity: 0.42, transparent: true
  })));
  let displaced = false;
  return {
    settle() {
      if (!displaced) return;
      positions.array.set(rest);
      positions.needsUpdate = true;
      displaced = false;
    },
    impact(hit, seconds) {
      const displacement = 0.34 * Math.exp(-seconds * 6) * Math.sin(seconds * 15);
      for (let i = 0; i < rest.length; i += 3) {
        const x = rest[i];
        const y = rest[i + 1];
        const z = rest[i + 2];
        if (hit.panel === 'back' && Math.abs(z + depth) < 0.001) {
          const falloff = Math.exp(-((x + hit.x) ** 2 + (y - BALL_RADIUS) ** 2) * 1.7);
          positions.array[i + 2] = z - displacement * falloff * (1 - Math.abs(x) / post);
        } else if (hit.panel === 'side' && Math.abs(x + hit.side * post) < 0.001) {
          const falloff = Math.exp(-((z - hit.z) ** 2 + (y - BALL_RADIUS) ** 2) * 1.7);
          positions.array[i] = x - hit.side * displacement * falloff * Math.sin(Math.PI * -z / depth);
        }
      }
      displaced = true;
      positions.needsUpdate = true;
    }
  };
}
