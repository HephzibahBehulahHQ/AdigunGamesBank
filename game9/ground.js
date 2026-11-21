import { THREE, material } from '../shared/three-stage.js';
import { GOAL_HALF_WIDTH, GOAL_POST_RADIUS, NET_DEPTH } from './clearance.js';

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
  const anisotropy = renderer.getMaxAnisotropy?.() ?? renderer.capabilities.getMaxAnisotropy();
  for (const texture of [map, normalMap]) {
    if (!texture) continue;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(2, anisotropy);
  }
  const turf = {
    map, normalMap, normalScale: new THREE.Vector2(0.34, 0.34),
  };
  const mowing = map ? ['#6b8859', '#799466'] : ['#3f5935', '#4b633d'];
  const heavyMowing = map ? ['#547453', '#60805a'] : ['#30492e', '#3a5134'];
  const surfaces = mowing.map(color => new THREE.MeshLambertMaterial({ color, ...turf }));
  const heavySurfaces = heavyMowing.map(color => new THREE.MeshPhongMaterial({
    color, ...turf, specular: '#161616', shininess: 13,
  }));
  const tangentFrameStart = '#if defined( USE_NORMALMAP_TANGENTSPACE )';
  const normalFragment = THREE.ShaderChunk.normal_fragment_begin.split(tangentFrameStart)[0];
  // Use the depth texture's comparison filter for the turf shadow edge.
  const turfShadows = THREE.ShaderChunk.shadowmap_pars_fragment.replace(
    /float phi = interleavedGradientNoise\( gl_FragCoord\.xy \) \* PI2;\s+shadow = \([\s\S]*?\) \* 0\.2;/,
    'shadow = texture(shadowMap, shadowCoord.xyz);'
  );
  const turfHighlights = THREE.ShaderChunk.lights_phong_pars_fragment.replace(
    /reflectedLight\.directSpecular \+= [^;]+;/,
    `if (geometryPosition.z > -30.0) {
      float detail = smoothstep(-30.0, -22.0, geometryPosition.z);
      reflectedLight.directSpecular += detail * irradiance * BRDF_BlinnPhong(
        directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess
      ) * material.specularStrength;
    }`
  );
  for (const surface of [...surfaces, ...heavySurfaces]) {
    surface.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <shadowmap_pars_fragment>', turfShadows);
      if (surface.isMeshPhongMaterial) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_phong_pars_fragment>', turfHighlights);
      }
      if (map) {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          // The continuous turf UVs are in two-metre units across all mowing stripes.
          vec2 pitchPoint = vec2(vMapUv.x * 2.0 - 24.0, -vMapUv.y * 2.0 - 5.5);
          float wearDistance = length((pitchPoint - vec2(0.0, 0.50)) / vec2(3.5, 1.7));
          float wear = 1.0 - smoothstep(0.15, 1.1, wearDistance);
          float grassDetail = clamp(diffuseColor.g * 6.0, 0.35, 1.0);
          diffuseColor.rgb *= mix(vec3(1.0), vec3(1.18, 0.76, 0.58), wear * grassDetail);
        `);
      }
      if (normalMap) {
        // Every turf stripe has the same planar tangent basis across its vertices.
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', normalFragment);
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
          if (vViewPosition.z < 18.0) {
            vec3 baseNormal = normal;
            mat3 tbn = mat3(normalize(vTangent), normalize(vBitangent), normal);
            vec3 mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
            mapN.xy *= normalScale;
            normal = normalize(tbn * mapN);
            float nearDetail = 1.0 - smoothstep(12.0, 18.0, vViewPosition.z);
            normal = normalize(mix(baseNormal, normal, nearDetail));
          }
        `);
      }
    };
  }
  const stripes = [];
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
    stripes.push(ground);
  }
  const penaltyArea = 16.5;
  const spotDistance = 11;
  const arcRadius = 9.15;
  const paintWidth = 0.112;
  const paintHeight = -0.009;
  const marks = [[0, 0, 44, paintWidth], [0, 5.5, 18.32, paintWidth], [0, penaltyArea, 40.32, paintWidth]];
  for (const side of [-1, 1]) {
    marks.push([side * 22, 34, paintWidth, 68], [side * 9.16, 2.75, paintWidth, 5.5],
      [side * 20.16, penaltyArea / 2, paintWidth, penaltyArea]);
  }
  const paint = material('#d6d6c8', {
    roughness: 0.94, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  const paintedLines = new THREE.InstancedMesh(new THREE.PlaneGeometry().rotateX(-Math.PI / 2), paint, marks.length);
  const transform = new THREE.Matrix4();
  for (const [index, [x, z, width, length]] of marks.entries()) {
    paintedLines.setMatrixAt(index, transform.makeScale(width, 1, length).setPosition(x, paintHeight, z));
  }
  paintedLines.receiveShadow = true;
  scene.add(paintedLines);
  const halfArc = Math.acos((penaltyArea - spotDistance) / arcRadius);
  const arc = new THREE.RingGeometry(arcRadius - paintWidth / 2, arcRadius + paintWidth / 2,
    48, 1, -Math.PI / 2 - halfArc, 2 * halfArc);
  const spot = new THREE.CircleGeometry(0.11, 24);
  for (const geometry of [arc, spot]) {
    const paintMark = new THREE.Mesh(geometry.rotateX(-Math.PI / 2), paint);
    paintMark.position.set(0, paintHeight, spotDistance);
    paintMark.receiveShadow = true;
    scene.add(paintMark);
  }
  let heavy = false;
  return (isHeavy) => {
    if (isHeavy === heavy) return;
    heavy = isHeavy;
    const materials = heavy ? heavySurfaces : surfaces;
    stripes.forEach((stripe, index) => { stripe.material = materials[index % 2]; });
  };
}

export function addGoal(scene) {
  const height = 2.44;
  const radius = GOAL_POST_RADIUS;
  const frame = material('#e2e4de', { roughness: 0.34, metalness: 0.18 });
  function pipe(start, end, pipeRadius = radius, pipeMaterial = frame) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const axis = new THREE.Vector3().subVectors(b, a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(pipeRadius, pipeRadius, axis.length(), 20), pipeMaterial);
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
  const supports = material('#505b60', { roughness: 0.75, metalness: 0.15 });
  const supportDepth = depth + 0.35;
  for (const x of [-post, post]) {
    pipe([x, 0, -supportDepth], [x, bar + 0.12, -supportDepth], 0.032, supports);
    pipe([x, bar, -depth], [x, bar + 0.12, -supportDepth], 0.008, supports);
    pipe([x, 0.024, 0], [x, 0.024, -depth], 0.021, supports);
  }
  pipe([-post, 0.024, -depth], [post, 0.024, -depth], 0.021, supports);
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
          const falloff = Math.exp(-((x + hit.x) ** 2 + (y - hit.y) ** 2) * 1.7);
          positions.array[i + 2] = z - displacement * falloff * (1 - Math.abs(x) / post);
        } else if (hit.panel === 'side' && Math.abs(x + hit.side * post) < 0.001) {
          const falloff = Math.exp(-((z - hit.z) ** 2 + (y - hit.y) ** 2) * 1.7);
          positions.array[i] = x - hit.side * displacement * falloff * Math.sin(Math.PI * -z / depth);
        }
      }
      displaced = true;
      positions.needsUpdate = true;
    }
  };
}
