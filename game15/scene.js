import { THREE, box, cylinder, material, line3 } from '../shared/three-stage.js';
const CELL=2.25;
export const worldPoint=(x,y,height=.18)=>[(x-3.5)*CELL,height,(y-3.5)*CELL];
const colors={player:'#A78BFA',ai:'#FB923C',floor:'#263647',floorAlt:'#223140',cover:'#65737a'};

function label(text, color='#dce7f3',width=256) {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(7,15,28,.88)';ctx.fillRect(0,0,width,64);
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 29px system-ui';ctx.fillText(text,width/2,33);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.scale.set(width/128,.5,1);return sprite;
}
function drone(unit) {
  const group=new THREE.Group(),paint=colors[unit.team];group.userData.unitId=unit.id;
  const base=box(group,[1.12,.24,1.34],[0,.35,0],'#323f4a',{metalness:.75,roughness:.35});
  box(group,[.88,.24,.92],[0,.57,-.08],paint,{metalness:.45,roughness:.38});
  box(group,[.55,.15,.5],[0,.76,.01],'#ced7da',{metalness:.65,roughness:.3});
  for(const side of [-1,1]) {
    box(group,[.2,.24,1.48],[side*.66,.25,0],'#111b24',{roughness:.85});
    for(const z of [-.5,-.17,.17,.5]) {const wheel=cylinder(group,.19,.13,[side*.68,.24,z],'#51616c',{metalness:.6});wheel.rotation.z=Math.PI/2;}
    box(group,[.15,.1,1.3],[side*.66,.43,0],'#a2aeb5',{metalness:.8});
  }
  const turret=cylinder(group,unit.role==='support'?.38:.27,.18,[0,.84,.12],'#8697a1',{metalness:.8});
  const emitter=cylinder(group,.07,unit.role==='recon'?.85:.56,[0,.87,.57],'#202e38',{metalness:.7});emitter.rotation.x=Math.PI/2;
  const lens=box(group,[.3,.12,.06],[0,.68,.5],unit.team==='player'?'#67e8f9':'#fdba74',{emissive:unit.team==='player'?0x22d3ee:0xf97316,emissiveIntensity:.8});
  box(group,[.52,.035,.18],[0,.73,-.3],'#d9e5e8',{metalness:.6});
  cylinder(group,.025,.65,[.31,1.02,-.43],'#bbc7cb',{metalness:.7});
  if(unit.role==='support')for(const side of [-1,1])box(group,[.16,.38,.88],[side*.48,.66,-.05],'#d2dade',{metalness:.6});
  if(unit.role==='recon'){const sensor=box(group,[.17,.18,.22],[-.25,.88,-.13],paint,{metalness:.65});sensor.rotation.y=.18;}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.035,6,48),material(paint,{emissive:new THREE.Color(paint),emissiveIntensity:.35}));ring.rotation.x=Math.PI/2;ring.position.y=.12;group.add(ring);
  const shield=new THREE.Mesh(new THREE.SphereGeometry(1.03,24,12),new THREE.MeshBasicMaterial({color:paint,wireframe:true,transparent:true,opacity:.2,depthWrite:false}));shield.position.y=.5;shield.visible=false;group.add(shield);
  const caption=label(`${unit.id} · ${unit.name.toUpperCase()}`,paint,320);caption.position.set(0,1.76,0);group.add(caption);
  const health=[];for(let i=0;i<5;i++)health.push(box(group,[.15,.06,.13],[(i-2)*.2,1.43,0],paint,{emissive:new THREE.Color(paint),emissiveIntensity:.4}));
  return {group,ring,shield,caption,health,lens,base,turret};
}

export function buildTacticsScene(stage, initial, reducedMotion=()=>false) {
  const root=new THREE.Group();stage.scene.add(root);
  stage.scene.background=new THREE.Color('#0b1220');
  stage.scene.fog=new THREE.Fog('#0b1220',45,95);
  stage.light.position.set(-11,24,13);Object.assign(stage.light.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:70});stage.light.shadow.camera.updateProjectionMatrix();
  box(root,[23,.4,23],[0,-.65,0],'#0d1928',{metalness:.45,roughness:.52});
  box(root,[19.8,.55,19.8],[0,-.26,0],'#38444f',{metalness:.72,roughness:.34});
  const tiles=[];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++) {
    const tile=box(root,[CELL-.065,.14,CELL-.065],worldPoint(x,y,.095),(x+y)%2?colors.floor:colors.floorAlt,{metalness:.25,roughness:.75});
    tile.userData.cell={x,y};tile.userData.baseColor=(x+y)%2?colors.floor:colors.floorAlt;tiles.push(tile);
    for(const edge of [-1,1])box(root,[.075,.018,.075],worldPoint(x+(edge*.43),y+.43,.177),'#83919b',{metalness:.8});
  }
  for(const sign of [-1,1]) {
    box(root,[20,.13,.1],[0,.08,sign*9.5],'#afbdc4',{metalness:.85});
    box(root,[.1,.13,20],[sign*9.5,.08,0],'#afbdc4',{metalness:.85});
    for(let i=-4;i<=4;i++) {
      cylinder(root,.08,.055,[i*2.25,.15,sign*9.5],'#aab7bf',{metalness:.8});
      cylinder(root,.08,.055,[sign*9.5,.15,i*2.25],'#aab7bf',{metalness:.8});
    }
  }
  for(let i=0;i<8;i++) {
    const number=label(String(i+1),'#d1dae5',80);number.scale.set(.62,.5,1);number.position.set((i-3.5)*CELL,.45,9.7);root.add(number);
    const letter=label(String.fromCharCode(65+i),'#d1dae5',80);letter.scale.set(.62,.5,1);letter.position.set(-9.7,.45,(i-3.5)*CELL);root.add(letter);
  }
  // The surrounding infrastructure is original industrial set dressing, outside playable cells.
  for(const z of [-11.5,11.5])for(const x of [-8,0,8]) {
    box(root,[2,.65,.75],[x,-.05,z],'#182b3b',{metalness:.6});
    box(root,[1.7,.07,.08],[x,.3,z+.37],'#22d3ee',{emissive:0x22d3ee,emissiveIntensity:.7});
  }
  const barriers=[];
  for(let i=0;i<8;i++) {
    const group=new THREE.Group();root.add(group);
    box(group,[1.92,1.35,1.92],[0,.85,0],colors.cover,{metalness:.58,roughness:.55});
    box(group,[2.02,.12,2.02],[0,1.58,0],'#b3bcbf',{metalness:.78});
    box(group,[2.04,.16,2.04],[0,.25,0],'#263640',{metalness:.7});
    for(const side of [-1,1])for(const n of [-.6,0,.6]) {
      box(group,[.14,.9,.045],[n,.88,side*.99],'#d4af37',{metalness:.4,roughness:.62});
      box(group,[.045,.9,.14],[side*.99,.88,n],'#d4af37',{metalness:.4,roughness:.62});
    }
    barriers.push(group);
  }
  const relay=new THREE.Group();root.add(relay);
  cylinder(relay,.76,.13,[0,.22,0],'#bfa44d',{metalness:.8});
  cylinder(relay,.48,.26,[0,.4,0],'#172b38',{metalness:.6});
  const relayCore=cylinder(relay,.2,.43,[0,.74,0],'#67e8f9',{emissive:0x22d3ee,emissiveIntensity:.65,metalness:.4});
  const relayRing=new THREE.Mesh(new THREE.TorusGeometry(.91,.04,8,48),material('#D4AF37',{emissive:0xd4af37,emissiveIntensity:.3}));relayRing.rotation.x=Math.PI/2;relayRing.position.y=.25;relay.add(relayRing);
  const models=new Map(initial.units.map(unit=>{const model=drone(unit);root.add(model.group);return [unit.id,model];}));
  const cursor=new THREE.Mesh(new THREE.TorusGeometry(.9,.065,8,4),material('#F8FAFC',{emissive:0xffffff,emissiveIntensity:.35}));cursor.rotation.x=Math.PI/2;root.add(cursor);
  let beam=null,current=initial,missionLevel=null,lastShot=-1,shotUntil=0;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();

  function cameraView(mode='isometric') {
    stage.camera.position.set(...(mode==='overhead'?[0,29,.01]:mode==='east'?[-22,21,15]:[18,22,24]));
    stage.camera.lookAt(0,0,0);stage.camera.updateProjectionMatrix();
  }
  cameraView();
  function update(state,focus={x:0,y:1},moves=[],targets=[]) {
    if(current!==state){lastShot=-1;shotUntil=0;}
    current=state;
    if(missionLevel!==state.config.level) {
      missionLevel=state.config.level;
      barriers.forEach((group,i)=>{const p=state.config.terrain[i];group.visible=!!p;if(p){group.position.set(...worldPoint(p[0],p[1],0));group.userData.cell={x:p[0],y:p[1]};}});
      lastShot=-1;
    }
    const legal=new Set(moves.map(p=>`${p.x},${p.y}`)),targetCells=new Set(targets.map(p=>`${p.x},${p.y}`));
    for(const tile of tiles) {
      const {x,y}=tile.userData.cell,key=`${x},${y}`;
      tile.material.color.set(targetCells.has(key)?'#654131':legal.has(key)?'#334c60':tile.userData.baseColor);
      tile.material.emissive.set(targetCells.has(key)?'#422411':legal.has(key)?'#142a46':'#000000');
    }
    cursor.position.set(...worldPoint(focus.x,focus.y,.23));
    for(const unit of state.units) {
      const model=models.get(unit.id);model.group.position.set(...worldPoint(unit.x,unit.y,.12));
      model.group.rotation.y=unit.team==='player'?Math.PI/2:-Math.PI/2;
      model.group.scale.y=unit.hp>0?1:.22;model.caption.visible=unit.hp>0;
      model.ring.material.color.set(unit.id===state.selected?'#D4AF37':colors[unit.team]);
      model.ring.material.emissiveIntensity=unit.id===state.selected?.7:.2;
      model.shield.visible=unit.hp>0&&unit.guarded;
      model.health.forEach((bar,i)=>{bar.visible=unit.hp>0&&i<unit.maxHp;bar.material.color.set(i<unit.hp?colors[unit.team]:'#1c2633');bar.material.emissiveIntensity=i<unit.hp?.4:0;});
      model.lens.material.emissiveIntensity=unit.hp>0?(unit.acted?.18:.8):0;
    }
    relay.visible=state.config.mode!=='eliminate';
    const carrier=state.units.find(u=>u.id===state.carrier&&u.hp>0);
    relay.position.set(...worldPoint(carrier?carrier.x:state.core.x,carrier?carrier.y:state.core.y,carrier?1.5:0));
    relay.scale.setScalar(carrier?.38:1);
    if(state.config.mode==='uplink'){relay.position.set(...worldPoint(state.config.relay.x,state.config.relay.y,0));relayCore.material.emissiveIntensity=.5+state.hold*.2;}
    const action=state.lastAction;
    if(action?.type==='attack'&&action.event!==lastShot&&!reducedMotion()) {
      if(beam){root.remove(beam);beam.geometry.dispose();beam.material.dispose();}
      beam=line3(root,[worldPoint(action.from.x,action.from.y,1),worldPoint(action.to.x,action.to.y,1)],action.team==='player'?'#c4b5fd':'#fdba74');
      lastShot=action.event;shotUntil=performance.now()+220;
    }
    if(beam)beam.visible=!reducedMotion()&&performance.now()<shotUntil;
  }
  function pick(clientX,clientY,rect) {
    pointer.set((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height*2-1));
    raycaster.setFromCamera(pointer,stage.camera);
    const choices=[...tiles,...barriers.filter(g=>g.visible),...models.values()].map(x=>x.group||x);
    const hits=raycaster.intersectObjects(choices,true);
    if(!hits.length)return null;
    let object=hits[0].object;
    while(object&&object!==root){if(object.userData.cell)return {...object.userData.cell};if(object.userData.unitId){const u=current.units.find(v=>v.id===object.userData.unitId);return {x:u.x,y:u.y};}object=object.parent;}
    return null;
  }
  return {update,pick,cameraView,hasEffect:()=>!!beam&&performance.now()<shotUntil,root};
}
