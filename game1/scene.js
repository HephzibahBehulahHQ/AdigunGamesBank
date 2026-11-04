import { THREE, createStage, box, cylinder, line3 } from '../shared/three-stage.js';
const colors = ['#24354e', '#f1b634', '#22d3ee'];
export function createScene(canvas, qualitySelect, status, onSelect) {
  const stage = createStage({ canvas, qualitySelect, status, position:[9,13,15], target:[0,0,0], shadows:false });
  const { scene, camera, renderer } = stage;
  const board = new THREE.Group(); scene.add(board);
  let activeSize = 0, cells = [], highlights = [];
  box(scene,[22,.5,18],[0,-1.2,0],'#101c2c');
  for (let i=-8;i<=8;i+=2) line3(scene,[[i,-.94,-7],[i,-.94,7]],'#20344d');
  const selected = new THREE.Mesh(new THREE.TorusGeometry(.55,.045,8,32),new THREE.MeshBasicMaterial({color:'#D4AF37'})); selected.rotation.x=-Math.PI/2; scene.add(selected);
  function rebuild(size) {
    for (const child of [...board.children]) { child.geometry?.dispose(); child.material?.dispose(); board.remove(child); }
    activeSize=size; cells=[]; highlights=[];
    camera.position.set(size * .9, size * 1.5, size * 1.8); camera.lookAt(0, 0, 0);
    const span=size*1.48;
    box(board,[span+1,.48,span+1],[0,-.47,0],'#1e2b3c',{metalness:.7,roughness:.35});
    box(board,[span+.65,.14,span+.65],[0,-.16,0],'#15342f');
    for (const x of [-span/2,span/2]) for(const z of [-span/2,span/2]) cylinder(board,.12,.08,[x,-.05,z],'#a3aebb',{metalness:.85});
    for(let i=0;i<size*size;i++){
      const x=(i%size-(size-1)/2)*1.48,z=(Math.floor(i/size)-(size-1)/2)*1.48;
      box(board,[.93,.16,.93],[x,.01,z],'#0b1220');
      const lamp=cylinder(board,.34,.29,[x,.23,z],colors[0],{emissive:colors[0],emissiveIntensity:.1,metalness:.2,roughness:.25}); lamp.userData.index=i; cells.push(lamp);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.49,.035,8,24),new THREE.MeshBasicMaterial({color:colors[0]})); ring.position.set(x,.12,z);ring.rotation.x=-Math.PI/2;board.add(ring);highlights.push(ring);
      if(i%size<size-1)line3(board,[[x+.48,-.06,z],[x+1,-.06,z]],'#8a7842');
      if(i<size*(size-1))line3(board,[[x,-.06,z+.48],[x,-.06,z+1]],'#8a7842');
    }
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function pointerDown(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(cells)[0];if(hit)onSelect(hit.object.userData.index);}
  canvas.addEventListener('pointerdown',pointerDown);
  return {
    update(state){if(activeSize!==state.config.size)rebuild(state.config.size);cells.forEach((lamp,i)=>{lamp.material.color.set(colors[state.cells[i]]);lamp.material.emissive.set(colors[state.cells[i]]);lamp.material.emissiveIntensity=state.cells[i]===0?.05:.85;highlights[i].material.color.set(colors[state.config.target[i]]);});const lamp=cells[state.selected];selected.position.set(lamp.position.x,.13,lamp.position.z);selected.visible=state.phase!=='won';stage.render();},
    render:()=>stage.render(),
    dispose(){canvas.removeEventListener('pointerdown',pointerDown);stage.dispose();}
  };
}
