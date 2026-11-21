import { THREE } from '../shared/three-stage.js';
import { outfitMaterials } from './kit-materials.js';

export async function loadPlayers() {
  const response = await fetch(new URL('./defender.mesh.json', import.meta.url));
  if (!response.ok) throw new Error('Could not load the Goal Line defender mesh.');
  const data = await response.json();
  return { defender: createPlayer(data), createOpponent: () => createPlayer(data, true) };
}

function createPlayer(data, away = false) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(data.skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(data.skinWeights, 4));
  let offset = 0;
  data.sections.forEach((indices, slot) => {
    geometry.addGroup(offset, indices.length, slot);
    offset += indices.length;
  });
  geometry.setIndex(data.sections.flat());
  geometry.computeVertexNormals();
  const { uv, palette } = outfitMaterials(data.positions, away);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.SkinnedMesh(geometry, palette);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const joints = data.rig.map(([name]) => Object.assign(new THREE.Bone(), { name }));
  data.rig.forEach(([, parent, x, y, z], index) => {
    const joint = joints[index];
    joint.position.set(x, y, z);
    if (parent === -1) {
      mesh.add(joint);
    } else {
      joint.position.sub(new THREE.Vector3(...data.rig[parent].slice(2)));
      joints[parent].add(joint);
    }
  });
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(joints));
  mesh.normalizeSkinWeights();
  const joint = name => joints.find(item => item.name === name);
  const spine = joint('spine03');
  const limbs = ['L', 'R'].map(side => ({
    upperArm: joint('upperarm01.' + side),
    lowerArm: joint('lowerarm01.' + side),
    thigh: joint('upperleg01.' + side),
    shin: joint('lowerleg01.' + side),
    foot: joint('foot.' + side)
  }));
  return {
    mesh,
    pose(movement, step, kick, kickingLeg = 1) {
      spine.rotation.set(-0.19 + kick * 0.32, -movement * 0.14, -movement * 0.12);
      limbs.forEach(({ upperArm, lowerArm, thigh, shin, foot }, index) => {
        const side = index === 0 ? 1 : -1;
        const stride = step * movement * side;
        const strike = index === kickingLeg ? kick : 0;
        upperArm.rotation.set(-0.18 + stride * 0.18, side * 0.11, -side * (0.38 + kick * 0.15));
        lowerArm.rotation.set(-0.21 - kick * 0.27, 0, -side * 0.23);
        thigh.rotation.set(-0.29 - strike * 0.92, 0, side * 0.10 + stride * 0.26);
        shin.rotation.x = 0.48 - strike * 0.36 + Math.max(0, stride) * 0.11;
        foot.rotation.x = -0.19 + strike * 0.42;
      });
      mesh.position.y = -0.034 + Math.abs(step) * 0.025;
    }
  };
}
