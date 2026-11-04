import { THREE, material, box, cylinder, line3 } from '../shared/three-stage.js';
import { FIELD } from './engine.js';

/** All geometry and kit designs are original procedural artwork for this game. */
export function buildFootballScene(stage) {
  const { scene } = stage;
  scene.background = new THREE.Color('#8fa6b3');
  scene.fog = new THREE.Fog('#8fa6b3', 150, 290);
  box(scene, [134, 0.4, 96], [0, -0.24, 0], '#31573a');
  instancedBoxes(scene, Array.from({length:21},(_,i)=>({size:[5,0.035,68],position:[-50+i*5,-0.005,0],color:i%2?'#326b42':'#39794a'})), {roughness:1,metalness:0});
  const white = '#e7eedb', lineY = 0.035;
  const markings = points => line3(scene, points.map(([x, z]) => [x, lineY, z]), white);
  markings([[-52.5,-34],[52.5,-34],[52.5,34],[-52.5,34],[-52.5,-34]]);
  markings([[0,-34],[0,34]]);
  const centre = new THREE.Mesh(new THREE.RingGeometry(9.09, 9.21, 96), material(white));
  centre.rotation.x = -Math.PI / 2; centre.position.y = lineY; centre.receiveShadow = true; scene.add(centre);
  cylinder(scene, 0.13, 0.025, [0, lineY, 0], white);
  for (const sign of [-1, 1]) {
    const edge = sign * 52.5;
    markings([[edge,-20.16],[edge-sign*16.5,-20.16],[edge-sign*16.5,20.16],[edge,20.16]]);
    markings([[edge,-9.16],[edge-sign*5.5,-9.16],[edge-sign*5.5,9.16],[edge,9.16]]);
    cylinder(scene, 0.13, 0.025, [edge-sign*11, lineY, 0], white);
    const arc = [];
    for (let i = 0; i <= 48; i++) {
      const angle = -0.925 + i / 48 * 1.85;
      arc.push([edge - sign * (11 + Math.cos(angle) * 9.15), Math.sin(angle) * 9.15]);
    }
    markings(arc);
    buildGoal(scene, sign);
    for (const z of [-34, 34]) {
      cylinder(scene, 0.035, 1.45, [edge, 0.73, z], white);
      box(scene, [0.45, 0.3, 0.025], [edge+sign*0.2, 1.3, z], '#D4AF37');
    }
  }
  buildStands(scene);
  const models = new Map();
  for (const team of [0, 1]) for (let number = 1; number <= 11; number++) {
    const id = `${team === 0 ? 'h' : 'a'}${number}`, model = makePlayer(team, number);
    model.root.userData.playerId = id;
    scene.add(model.root); models.set(id, model);
  }
  const football = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(FIELD.ballRadius, 24, 16), material('#f4f1df', { roughness: 0.82, metalness: 0 }));
  sphere.castShadow = true; football.add(sphere);
  const panelMaterial = material('#152031', { roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute('position'), vertices = new Set();
  for (let i = 0; i < ico.count; i++) {
    const direction = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
    const key = direction.toArray().map(n => n.toFixed(3)).join(',');
    if (vertices.has(key)) continue; vertices.add(key);
    const panel = new THREE.Mesh(new THREE.CircleGeometry(0.033, 5), panelMaterial);
    panel.position.copy(direction).multiplyScalar(FIELD.ballRadius + 0.002);
    panel.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), direction);
    football.add(panel);
  }
  scene.add(football);
  const indicator = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.07, 48), new THREE.MeshBasicMaterial({ color: '#f3d471', side: THREE.DoubleSide }));
  indicator.rotation.x = -Math.PI / 2; indicator.position.y = 0.06; scene.add(indicator);
  const ballMarker = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 32), new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  ballMarker.rotation.x = -Math.PI / 2; scene.add(ballMarker);

  const playerRoots = [...models.values()].map(model => model.root);
  return {
    playerRoots,
    update(state, dt, reducedMotion = false) {
      for (const model of models.values()) model.root.visible = false;
      for (const p of state.players) {
        if (p.active === false || p.redCard) continue;
        if (!models.has(p.id)) {
          const model = makePlayer(p.team, p.number, p.keeper);
          model.root.userData.playerId = p.id; scene.add(model.root); models.set(p.id, model); playerRoots.push(model.root);
        }
        const m = models.get(p.id), speed = Math.hypot(p.vx, p.vy);
        m.root.visible = true;
        m.kit.color.set(p.keeper ? (p.team === 0 ? '#D4AF37' : '#22D3EE') : (p.team === 0 ? '#2563EB' : '#ef7022'));
        const moving = state.phase === 'live' ? Math.min(1, speed / 4.8) : 0;
        const gait = p.running * 3.1, swing = Math.sin(gait) * 0.65 * moving;
        m.root.position.set(p.x, reducedMotion ? 0 : Math.abs(Math.sin(gait)) * 0.025 * moving, p.y);
        m.root.rotation.y = Math.atan2(p.facingX, p.facingY);
        m.leftHip.rotation.x = swing; m.rightHip.rotation.x = -swing;
        m.leftKnee.rotation.x = Math.max(0, -Math.sin(gait)) * 0.85 * moving;
        m.rightKnee.rotation.x = Math.max(0, Math.sin(gait)) * 0.85 * moving;
        m.leftArm.rotation.x = -swing * 0.8; m.rightArm.rotation.x = swing * 0.8;
        if (p.throwTime > 0 || (state.restartKick?.type === 'Throw-in' && state.restartKick.takerId === p.id)) {
          m.leftArm.rotation.x = m.rightArm.rotation.x = -2.8;
          m.leftArm.rotation.z = 0.15; m.rightArm.rotation.z = -0.15;
        } else if (p.keeper && Math.hypot(state.ball.x - p.x, state.ball.y - p.y) < 12 && !state.ball.owner) {
          m.leftArm.rotation.z = 0.65; m.rightArm.rotation.z = -0.65;
        } else { m.leftArm.rotation.z = 0.12; m.rightArm.rotation.z = -0.12; }
      }
      football.position.set(state.ball.x, state.ball.z, state.ball.y);
      const owner = state.players.find(p => p.id === state.ball.owner);
      football.rotation.z -= (owner?.vx ?? state.ball.vx) * dt / FIELD.ballRadius;
      football.rotation.x += (owner?.vy ?? state.ball.vy) * dt / FIELD.ballRadius;
      ballMarker.position.set(state.ball.x, 0.04, state.ball.y);
      const selected = state.players.find(p => p.id === state.controlledId);
      indicator.position.x = selected.x; indicator.position.z = selected.y;
    }
  };
}
function buildGoal(scene, sign) {
  const x = sign * FIELD.length / 2, back = x + sign * 2.2, half = FIELD.goalWidth / 2 + 0.06;
  for (const z of [-half, half]) cylinder(scene, 0.06, FIELD.goalHeight + 0.06, [x, (FIELD.goalHeight + 0.06) / 2, z], '#f1f4ec', { roughness: 0.35, metalness: 0.25 });
  box(scene, [0.12,0.12,FIELD.goalWidth+0.24], [x,FIELD.goalHeight+0.06,0], '#f1f4ec', { roughness: 0.35, metalness: 0.25 });
  for (const z of [-half, half]) {
    cylinder(scene, 0.035, FIELD.goalHeight, [back, FIELD.goalHeight / 2, z], '#98a8a7');
    line3(scene, [[x,FIELD.goalHeight,z],[back,FIELD.goalHeight,z],[back,0,z],[x,0,z]], '#a4b7b4');
  }
  const points = [], segment = (a, b) => points.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  for (let z = -half; z <= half + 0.01; z += 0.37) {
    segment([back,0,z],[back,FIELD.goalHeight,z]); segment([x,FIELD.goalHeight,z],[back,FIELD.goalHeight,z]);
  }
  for (let y = 0; y <= FIELD.goalHeight; y += 0.3) {
    segment([back,y,-half],[back,y,half]);
    for (const z of [-half, half]) segment([x,y,z],[back,y,z]);
  }
  for (let depth = 0; depth <= 2.2; depth += 0.37) for (const z of [-half, half]) segment([x+sign*depth,0,z],[x+sign*depth,FIELD.goalHeight,z]);
  const net = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color:'#d4e1dd',transparent:true,opacity:0.64 }));
  scene.add(net);
}
function buildStands(scene) {
  const seatPositions = [], groups = new Map();
  const addBox = (size,position,color,options={}) => {
    const key=JSON.stringify(options);
    if(!groups.has(key))groups.set(key,{options,items:[]});
    groups.get(key).items.push({size,position,color});
  };
  for (const sign of [-1,1]) {
    addBox( [116,0.9,0.45], [0,0.4,sign*38], '#173453');
    addBox( [116,0.07,0.5], [0,0.9,sign*38], '#D4AF37');
    for (let row = 0; row < 8; row++) {
      addBox([119,0.9,1.7],[0,0.6+row*0.85,sign*(42+row*1.6)],'#555f68',{roughness:0.95});
      for (let col = 0; col < 132; col++) seatPositions.push([-57+col*0.87,1.25+row*0.85,sign*(41.9+row*1.6),sign,row,col]);
    }
    for (let row = 0; row < 6; row++) {
      addBox([1.7,0.9,82],[sign*(61+row*1.6),0.6+row*0.85,0],'#555f68',{roughness:0.95});
      for (let col = 0; col < 90; col++) seatPositions.push([sign*(60.9+row*1.6),1.25+row*0.85,-39+col*0.87,sign,row,col,true]);
    }
    addBox([121,0.35,16],[0,12,sign*50],'#18293a',{metalness:0.45,roughness:0.5});
    for (const x of [-55,-28,0,28,55]) addBox([0.24,12,0.24],[x,6,sign*53],'#6a7a81',{metalness:0.7,roughness:0.4});
  }
  const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.57,0.55,0.5),material('#2563EB',{roughness:0.8}),seatPositions.length);
  const dummy = new THREE.Object3D();
  seatPositions.forEach(([x,y,z,sign,row,col,end],index) => {
    dummy.position.set(x,y,z); dummy.rotation.set(0,end?Math.PI/2:0,0); dummy.updateMatrix(); seats.setMatrixAt(index,dummy.matrix);
    seats.setColorAt(index,new THREE.Color(col%22<2?'#D4AF37':row%3===0?'#243b61':'#25518c'));
  });
  seats.receiveShadow=true; scene.add(seats);
  for (const x of [-57,57]) for (const z of [-39,39]) {
    cylinder(scene,0.12,18,[x,9,z],'#526778',{metalness:0.7});
    addBox([3.3,1.7,0.35],[x,18,z],'#27384a');
    for(let i=0;i<5;i++) for(let j=0;j<2;j++) addBox([0.46,0.46,0.06],[x-1.3+i*0.65,17.6+j*0.7,z-Math.sign(z)*0.22],'#e8f2fa',{emissive:'#d7e9ff',emissiveIntensity:0.35,roughness:0.2});
  }
  for(const {items,options} of groups.values()) instancedBoxes(scene,items,options);
}
function makePlayer(team, number, keeper = number === 1) {
  const root = new THREE.Group();
  const kit = material(keeper ? (team===0?'#D4AF37':'#22D3EE') : (team===0?'#2563EB':'#ef7022'), {roughness:0.92,metalness:0});
  const shorts = material(team===0?'#13223c':'#172334',{roughness:1,metalness:0});
  const sock = material(team===0?'#eaf0ef':'#ef7022',{roughness:1,metalness:0});
  const skin = material(['#70472f','#9f7150','#bd8b69','#60402d','#d7b090','#815739'][(number+team*3)%6],{roughness:0.92,metalness:0});
  const boot = material('#172024',{roughness:0.65,metalness:0});
  const mesh = (parent,geometry,mat,position) => { const m=new THREE.Mesh(geometry,mat);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; };
  mesh(root,new THREE.CapsuleGeometry(0.215,0.36,5,10),kit,[0,1.19,0]);
  mesh(root,new THREE.BoxGeometry(0.39,0.23,0.26),shorts,[0,0.87,0]);
  mesh(root,new THREE.CylinderGeometry(0.073,0.085,0.16,10),skin,[0,1.54,0]);
  mesh(root,new THREE.SphereGeometry(0.135,12,10),skin,[0,1.72,0]);
  mesh(root,new THREE.SphereGeometry(0.138,12,8,0,Math.PI*2,0,Math.PI*0.52),material('#211d1a',{roughness:1}),[0,1.73,-0.006]);
  mesh(root,new THREE.SphereGeometry(0.026,6,5),skin,[0,1.7,0.132]);
  const hips=[],knees=[],arms=[];
  for(const sign of [-1,1]) {
    const hip=new THREE.Group();hip.position.set(sign*0.115,0.84,0);root.add(hip);hips.push(hip);
    mesh(hip,new THREE.CylinderGeometry(0.085,0.073,0.37,10),skin,[0,-0.18,0]);
    const knee=new THREE.Group();knee.position.y=-0.37;hip.add(knee);knees.push(knee);
    mesh(knee,new THREE.CylinderGeometry(0.071,0.048,0.37,10),sock,[0,-0.18,0]);
    mesh(knee,new THREE.BoxGeometry(0.12,0.095,0.255),boot,[0,-0.37,0.055]);
    const arm=new THREE.Group();arm.position.set(sign*0.27,1.42,0);arm.rotation.z=-sign*0.12;root.add(arm);arms.push(arm);
    mesh(arm,new THREE.CylinderGeometry(0.087,0.078,0.22,10),kit,[0,-0.07,0]);
    mesh(arm,new THREE.CylinderGeometry(0.062,0.049,0.24,10),skin,[0,-0.29,0.018]);
    mesh(arm,new THREE.CylinderGeometry(0.047,0.037,0.22,10),skin,[0,-0.48,0.04]);
    mesh(arm,new THREE.SphereGeometry(0.05,8,6),skin,[0,-0.61,0.04]);
  }
  return { root,kit,leftHip:hips[0],rightHip:hips[1],leftKnee:knees[0],rightKnee:knees[1],leftArm:arms[0],rightArm:arms[1] };
}

// Batch repeated static boxes without changing their geometry or material design.
function instancedBoxes(parent, items, options={}) {
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material('#ffffff',options),items.length);
  const transform=new THREE.Object3D();
  items.forEach((item,index)=>{
    transform.position.set(...item.position);transform.scale.set(...item.size);transform.updateMatrix();
    mesh.setMatrixAt(index,transform.matrix);mesh.setColorAt(index,new THREE.Color(item.color));
  });
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
