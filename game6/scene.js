import { THREE, createStage, box, cylinder, material } from '../shared/three-stage.js';
import { electrical, selectedParts } from './engine.js';

// These ideal scenario values can have more than two significant figures.
// Print their exact value on unbanded components instead of implying a rounded
// four-band nominal value or a physical tolerance the solver does not model.
export function resistorCaption(id, ohms, watts) {
  return ohms ? `${id} · ${ohms} Ω${watts ? ` · ${watts} W` : ''}` : `${id} · FIT PART`;
}
function label(parent, text, position, width = 2.2, color = '#d8f4fc') {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 144;
  const context = canvas.getContext('2d'); context.fillStyle = '#102033'; context.fillRect(0, 0, 640, 144);
  context.strokeStyle = '#3d6178'; context.lineWidth = 3; context.strokeRect(2, 2, 636, 140);
  context.fillStyle = color; context.font = '600 42px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 320, 72, 608);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture })); sprite.position.set(...position); sprite.scale.set(width, width * 144 / 640, 1); parent.add(sprite); return sprite;
}
function replaceLabel(sprite, text, color) {
  const parent = sprite.parent, position = sprite.position.toArray(), width = sprite.scale.x;
  parent.remove(sprite); sprite.material.map.dispose(); sprite.material.dispose(); return label(parent, text, position, width, color);
}
function release(group) {
  group.traverse(object => { object.geometry?.dispose(); for (const mat of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) { mat.map?.dispose(); mat.dispose(); } object.dispose?.(); });
  group.clear();
}
function wire(parent, points, color, radius = .065) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, radius, 8, false), material(color, { roughness: .55, metalness: .1, emissive: color, emissiveIntensity: .025 }));
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
function resistor(parent, position, id) {
  const group = new THREE.Group(); group.position.set(...position); parent.add(group);
  const body = cylinder(group, .24, 1.42, [0, 0, 0], '#bfad8c'); body.rotation.z = Math.PI / 2;
  const pin = cylinder(group, .045, 2.42, [0, 0, 0], '#a8bac7', { metalness: .9 }); pin.rotation.z = Math.PI / 2;
  const caption = label(group, id, [0, .62, 0], 2.35);
  return { body, caption, id, ohms: null, watts: null };
}
function setResistor(resistor, ohms, watts) {
  if (resistor.ohms === ohms && resistor.watts === watts) return;
  resistor.ohms = ohms; resistor.watts = watts; resistor.body.material.color.set(ohms ? '#c8b48d' : '#4d5c6c');
  resistor.caption = replaceLabel(resistor.caption, resistorCaption(resistor.id, ohms, watts), ohms ? '#e6f3f5' : '#b7c5d4');
}
export function createScene({ canvas, qualitySelect, status, onAction }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [11.5, 13.5, 17.5], target: [0, .5, .2], shadows: true });
  stage.scene.fog = new THREE.Fog('#0B1220', 31, 72);
  const root = new THREE.Group(); stage.scene.add(root);
  box(stage.scene, [90, .25, 80], [0, -1, 0], '#111c2d', { roughness: .9 });
  const grid = new THREE.GridHelper(55, 44, '#244458', '#172b3b'); grid.position.y = -.87; stage.scene.add(grid);
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  let parts = {}, buttons = [], chargeWire, bleedWire, leakWire, capBody, gauge, capCaption, sourceCaption, switchArm, planSignature = '', config;
  const onPointer = event => {
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera); const hit = raycaster.intersectObjects(buttons.map(button => button.mesh), false)[0];
    if (hit) { canvas.focus({ preventScroll: true }); onAction(hit.object.userData.action); }
  };
  canvas.addEventListener('pointerup', onPointer);
  function setView(view) {
    if (view === 'top') { stage.camera.position.set(0, 21, .001); stage.camera.up.set(0, 0, -1); stage.camera.lookAt(0, 0, .2); }
    else { stage.camera.up.set(0, 1, 0); stage.camera.position.set(11.5, 13.5, 17.5); stage.camera.lookAt(0, .5, .2); }
  }
  function rebuild(nextConfig) {
    config = nextConfig; release(root); buttons = []; planSignature = ''; parts = {};
    // An original open laboratory board; wiring topology mirrors the solver.
    box(root, [15, .5, 9], [0, -.3, .25], '#3d5267', { metalness: .7, roughness: .45 });
    box(root, [14.55, .13, 8.5], [0, .02, .25], '#1c3448', { metalness: .45, roughness: .7 });
    for (const x of [-6.9, 6.9]) for (const z of [-3.65, 4.15]) cylinder(root, .11, .06, [x, .13, z], '#9baebb', { metalness: .9 });
    const perforations = [];
    for (let x = -6; x <= 6; x += .6) for (let z = -3; z <= 3.6; z += .6) perforations.push([x, .099, z]);
    const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.025, .025, .015, 6), material('#344b5f'), perforations.length);
    const matrix = new THREE.Matrix4();
    perforations.forEach((position, index) => { matrix.makeTranslation(...position); holes.setMatrixAt(index, matrix); });
    holes.instanceMatrix.needsUpdate = true; root.add(holes);
    label(root, 'THE TRANSIENT LAB · RC / 06', [0, .8, -3.8], 6.5, '#98ebf8');
    // Bench source and terminals.
    box(root, [2.6, 1.4, 2.7], [-5.25, .85, -1.25], '#8b9daa', { metalness: .65 });
    box(root, [2.34, .08, 2.37], [-5.25, 1.61, -1.25], '#263e54');
    box(root, [1.8, .08, .76], [-5.25, 1.69, -1.7], '#102c39', { emissive: '#214e59', emissiveIntensity: .2 });
    sourceCaption = label(root, `${config.sourceVolts} V DC`, [-5.25, 2.15, -1.6], 2.3, '#9df2ed');
    const knob = cylinder(root, .28, .22, [-5.7, 1.78, -.55], '#253548', { metalness: .35 }); knob.rotation.y = .4;
    box(root, [.07, .035, .29], [-5.7, 1.91, -.55], '#d6e1e5');
    cylinder(root, .13, .16, [-4.65, 1.8, -.5], '#b96565'); cylinder(root, .13, .16, [-4.18, .55, -.4], '#354b63');
    // Positive branch with mechanical source switch and charge resistor.
    parts.charge = resistor(root, [-1.7, .75, -1.6], 'R1');
    parts.discharge = resistor(root, [.5, .75, 2.3], 'R2');
    parts.leak = resistor(root, [4.65, .75, 1.4], 'LEAK'); setResistor(parts.leak, config.leakageOhms, null);
    box(root, [.9, .15, .75], [-3.45, .25, -1.6], '#2d475d');
    switchArm = box(root, [.67, .08, .12], [-3.45, .63, -1.6], '#b18c53', { metalness: .8 });
    cylinder(root, .08, .45, [-3.77, .45, -1.6], '#acbfc9', { metalness: .9 });
    cylinder(root, .08, .45, [-3.13, .45, -1.6], '#acbfc9', { metalness: .9 });
    wire(root, [[-4.65, 1.8, -.5], [-4.3, 1.1, -1.1], [-3.77, .68, -1.6]], '#b76e67');
    chargeWire = wire(root, [[-3.13, .68, -1.6], [-2.9, .75, -1.6], [-2.91, .75, -1.6]], '#22d3ee');
    wire(root, [[-.49, .75, -1.6], [.6, .35, -1.6], [1.5, .5, -.35]], '#5e91a5');
    // Capacitor bank, metal end caps and a separate calibrated voltage indicator.
    const capGroup = new THREE.Group(); capGroup.position.set(1.8, 0, -.05); root.add(capGroup);
    capBody = cylinder(capGroup, .84, 2.6, [0, 1.72, 0], '#276879', { roughness: .38, metalness: .5 });
    cylinder(capGroup, .86, .12, [0, .48, 0], '#a5b8c4', { metalness: .9 });
    cylinder(capGroup, .86, .12, [0, 3.06, 0], '#b7c6cd', { metalness: .9 });
    box(capGroup, [1.05, .02, .055], [0, 3.13, 0], '#7b939f'); box(capGroup, [.055, .02, 1.05], [0, 3.13, 0], '#7b939f');
    cylinder(capGroup, .065, .42, [-.3, .25, -.3], '#c8af77', { metalness: .8 }); cylinder(capGroup, .065, .42, [.3, .25, .3], '#c8af77', { metalness: .8 });
    capCaption = label(root, 'C · FIT BANK', [1.8, 3.65, -.05], 3.1);
    box(root, [.42, 2.85, .23], [3.25, 1.72, -.2], '#102436');
    gauge = box(root, [.22, .02, .25], [3.25, .32, -.17], '#36d7e5', { emissive: '#36d7e5', emissiveIntensity: .45 });
    label(root, 'V / VS', [3.25, 3.52, -.2], 1.3, '#a4ebf4');
    for (let index = 0; index <= 5; index++) box(root, [.1, .025, .03], [3.53, .36 + index * .53, -.02], '#b6d4df');
    // Common return, parallel leakage and separately switched discharge path.
    wire(root, [[-4.18, .55, -.4], [-4.4, .3, .2], [-4.4, .25, 3.5], [5.8, .25, 3.5]], '#7d8e9d');
    wire(root, [[2.1, .46, .25], [2.5, .25, 1], [2.5, .25, 3.5]], '#7d8e9d');
    leakWire = wire(root, [[1.5, .49, -.35], [2.2, .22, -.9], [5.9, .25, -.9], [5.9, .75, 1.4]], '#ab995d');
    wire(root, [[3.44, .75, 1.4], [3.3, .3, 2.1], [3.3, .25, 3.5]], '#7d8e9d');
    bleedWire = wire(root, [[1.5, .48, -.35], [.4, .3, .2], [-.71, .5, 1.4], [-.71, .75, 2.3]], '#d4af37');
    wire(root, [[1.71, .75, 2.3], [1.9, .35, 3.5]], '#7d8e9d');
    // The three switch keys are raycastable; the corresponding DOM controls are
    // authoritative equivalents, including keyboard and graphics-failure use.
    box(root, [3.8, .35, 1.35], [-2.8, .29, 2.1], '#253c53', { metalness: .5 });
    for (const [index, [command, letter, color]] of [['charge','C','#22d3ee'],['hold','H','#a78bfa'],['discharge','D','#d4af37']].entries()) {
      const x = -4 + index * 1.2;
      cylinder(root, .35, .08, [x, .54, 2.1], '#8199aa', { metalness: .85 });
      const mesh = cylinder(root, .28, .17, [x, .66, 2.1], color, { emissive: color, emissiveIntensity: .03 }); mesh.userData.action = command;
      label(root, letter, [x, 1.07, 2.1], .68); buttons.push({ mesh, command });
    }
    label(root, 'SOURCE / HOLD / BLEED', [-2.8, .43, 3.05], 3.8, '#cadce9');
  }
  function update(state) {
    const circuit = electrical(state), selected = selectedParts(state), phase = state.phase === 'paused' ? state.resumePhase : state.phase;
    const signature = Object.values(state.selected).join('|');
    if (signature !== planSignature) {
      planSignature = signature;
      setResistor(parts.charge, selected.charge?.ohms || 0, selected.charge?.watts); setResistor(parts.discharge, selected.discharge?.ohms || 0, selected.discharge?.watts);
      capCaption = replaceLabel(capCaption, selected.capacitor ? `${selected.capacitor.microfarads.toLocaleString()}µF · ${selected.capacitor.voltageRating}V` : 'C · FIT BANK');
      capBody.material.color.set(selected.capacitor ? '#2b8291' : '#405565');
    }
    const height = Math.max(.02, Math.min(1, state.voltage / config.sourceVolts) * 2.65);
    gauge.scale.y = height / .02; gauge.position.y = .32 + height / 2;
    gauge.material.color.set(state.phase === 'lost' ? '#ef8898' : '#36d7e5'); gauge.material.emissive.set(state.phase === 'lost' ? '#ef8898' : '#36d7e5');
    switchArm.rotation.z = phase === 'charging' ? 0 : .5;
    chargeWire.material.emissiveIntensity = phase === 'charging' ? .55 : .025;
    bleedWire.material.emissiveIntensity = phase === 'discharging' ? .5 : .025;
    leakWire.material.emissiveIntensity = circuit && ['charging','holding','discharging'].includes(phase) ? .2 : .02;
    const activeCommand = phase === 'charging' ? 'charge' : phase === 'holding' || phase === 'ready' ? 'hold' : phase === 'discharging' ? 'discharge' : '';
    buttons.forEach(button => { button.mesh.position.y = button.command === activeCommand ? .6 : .66; button.mesh.material.emissiveIntensity = button.command === activeCommand ? .65 : .03; });
  }
  return { rebuild, update, setView, render: () => stage.render(), dispose() { canvas.removeEventListener('pointerup', onPointer); release(root); stage.dispose(); } };
}
