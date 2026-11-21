import { THREE } from '../shared/three-stage.js';
import { outfitMaterials } from './kit-materials.js';
import { solveLeg } from './leg-reach.js';

export async function loadPlayers() {
  const loader = new THREE.TextureLoader();
  const [response, ...skins] = await Promise.all([
    fetch(new URL('./defender.mesh.json', import.meta.url)),
    ...['defender', 'opponent', 'receiver'].map(async role => {
      try {
        const texture = await loader.loadAsync(new URL(`./textures/${role}-skin.jpg`, import.meta.url).href);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.channel = 1;
        return texture;
      } catch {
        return null;
      }
    })
  ]);
  if (!response.ok) throw new Error('Could not load the Goal Line defender mesh.');
  const data = await response.json();
  return {
    defender: createPlayer(data, 'defend', skins[0], [1.04, 1.01, 1.02]),
    createOpponent: () => createPlayer(data, 'press', skins[1], [0.96, 1.05, 0.98]),
    createReceiver: () => createPlayer(data, 'receive', skins[2], [0.98, 0.96, 1.03])
  };
}

function createPlayer(data, role, skin, build) {
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
  const normals = geometry.getAttribute('normal');
  const blended = new THREE.Vector3();
  const sample = new THREE.Vector3();
  for (const seam of data.normalSeams) {
    blended.set(0, 0, 0);
    for (const index of seam) blended.add(sample.fromBufferAttribute(normals, index));
    blended.normalize();
    for (const index of seam) normals.setXYZ(index, blended.x, blended.y, blended.z);
  }
  const { uv, palette } = outfitMaterials(data.positions, role, skin);
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('uv1', new THREE.Float32BufferAttribute(data.skinUvs, 2));
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
  mesh.scale.set(...build);
  mesh.normalizeSkinWeights();
  const joint = name => joints.find(item => item.name === name);
  const rest = name => new THREE.Vector3(...data.rig.find(([id]) => id === name).slice(2));
  const spine = joint('spine03');
  const limbs = ['L', 'R'].map(side => ({
    upperArm: joint('upperarm01.' + side),
    lowerArm: joint('lowerarm01.' + side),
    thigh: joint('upperleg01.' + side),
    shin: joint('lowerleg01.' + side),
    foot: joint('foot.' + side),
    hip: rest('upperleg01.' + side),
    upper: rest('lowerleg01.' + side).sub(rest('upperleg01.' + side)),
    lower: rest('foot.' + side).sub(rest('lowerleg01.' + side)),
    toe: rest('toe1-2.' + side).sub(rest('foot.' + side))
  }));
  const vertical = new THREE.Vector3(0, 1, 0);
  return {
    mesh,
    plantBoot(contact, angle, index, blend) {
      const { hip, upper, lower, toe, thigh, shin, foot } = limbs[index];
      const turn = new THREE.Quaternion().setFromAxisAngle(vertical, angle);
      const ankleTarget = mesh.worldToLocal(contact.clone()).sub(toe.clone().applyQuaternion(turn));
      const { knee, ankle } = solveLeg(hip, ankleTarget, upper.length(), lower.length());
      const thighTurn = new THREE.Quaternion().setFromUnitVectors(upper.clone().normalize(), knee.clone().sub(hip).normalize());
      const lowerDirection = ankle.clone().sub(knee).normalize().applyQuaternion(thighTurn.clone().invert());
      const shinTurn = new THREE.Quaternion().setFromUnitVectors(lower.clone().normalize(), lowerDirection);
      const footTurn = thighTurn.clone().multiply(shinTurn).invert().multiply(turn);
      thigh.quaternion.slerp(thighTurn, blend);
      shin.quaternion.slerp(shinTurn, blend);
      foot.quaternion.slerp(footTurn, blend);
    },
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
