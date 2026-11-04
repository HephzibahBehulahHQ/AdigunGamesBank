import { THREE, createStage, box, cylinder, material } from '../shared/three-stage.js';
import { BAND_COLORS } from './engine.js';

function labelTexture(text, background = '#122b3f', ink = '#d8f4fb', width = 256, height = 128) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); context.fillStyle = background; context.fillRect(0, 0, width, height);
  context.fillStyle = ink; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = `700 ${text.length > 13 ? 22 : text.length > 7 ? 30 : 54}px system-ui, sans-serif`;
  context.fillText(text, width / 2, height / 2, width - 20);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function flatLabel(parent, text, size, position, textures, background, ink) {
  const texture = labelTexture(text, background, ink); textures.push(texture);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(...position); parent.add(mesh); return mesh;
}

function buildResistor(parent, component) {
  const group = new THREE.Group(); group.position.y = 0.48;
  const body = cylinder(group, 0.205, 1.66, [0, 0, 0], '#d8c5a0', { roughness: 0.88, metalness: 0.02 }); body.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 12), material('#d8c5a0', { roughness: 0.88, metalness: 0.02 }));
    cap.position.x = side * 0.83; cap.scale.x = 0.5; cap.castShadow = true; group.add(cap);
    const lead = cylinder(group, 0.032, 0.55, [side * 1.1, 0, 0], '#c7cbd0', { roughness: 0.32, metalness: 0.8 }); lead.rotation.z = Math.PI / 2;
  }
  const locations = [-0.59, -0.29, 0.01, 0.57];
  component.bands.forEach((name, index) => {
    const ring = cylinder(group, 0.211, 0.14, [locations[index], 0, 0], BAND_COLORS[name], { roughness: name === 'gold' || name === 'silver' ? 0.37 : 0.8, metalness: name === 'gold' || name === 'silver' ? 0.5 : 0 });
    ring.rotation.z = Math.PI / 2;
  });
  parent.add(group); return group;
}

function disposeGroup(group) {
  group.traverse(object => { object.geometry?.dispose(); for (const mat of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) mat.dispose(); });
}

export function createResistorScene({ canvas, qualitySelect, status, onPick }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [6, 11, 10], target: [0, 0.4, 0], shadows: true });
  const { scene, camera } = stage; scene.background = new THREE.Color('#102231');
  scene.fog = new THREE.Fog('#102231', 30, 75);
  box(scene, [80, 0.3, 65], [0, -1.0, 0], '#15293a', { roughness: 0.95, metalness: 0.05 });
  const board = new THREE.Group(); scene.add(board);
  let activeConfig = null, trays = [], targets = [], textures = [], down = null;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();

  function rebuild(config) {
    for (const child of [...board.children]) { board.remove(child); disposeGroup(child); }
    textures.forEach(texture => texture.dispose()); textures = []; trays = []; targets = [];
    const width = config.columns * 3.1, depth = config.rows * 2;
    box(board, [width + 0.7, 0.38, depth + 0.8], [0, -0.17, 0], '#6f5c44', { roughness: 0.9, metalness: 0 });
    box(board, [width + 0.35, 0.08, depth + 0.45], [0, 0.06, 0], '#1e3d4b', { roughness: 0.8, metalness: 0.05 });
    for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) for (const z of [-depth / 2 + 0.1, depth / 2 - 0.1]) {
      const screw = cylinder(board, 0.06, 0.025, [x, 0.12, z], '#a7b4c0', { metalness: 0.8, roughness: 0.3 });
      box(board, [0.075, 0.006, 0.013], [screw.position.x, 0.138, screw.position.z], '#223747');
    }
    for (const card of config.deck) {
      const group = new THREE.Group();
      group.position.set((card.index % config.columns - (config.columns - 1) / 2) * 3.1, 0, (Math.floor(card.index / config.columns) - (config.rows - 1) / 2) * 2);
      board.add(group);
      box(group, [2.87, 0.14, 1.76], [0, 0.17, 0], '#07151e', { roughness: 1, metalness: 0 });
      for (const side of [-1, 1]) {
        box(group, [0.09, 0.44, 1.77], [side * 1.39, 0.4, 0], '#344f60', { roughness: 0.5, metalness: 0.4 });
        box(group, [2.78, 0.44, 0.08], [0, 0.4, side * 0.85], '#344f60', { roughness: 0.5, metalness: 0.4 });
      }
      buildResistor(group, card.component);
      flatLabel(group, card.component.label, [1.7, 0.25], [0, 0.26, 0.58], textures, '#dce4d9', '#182c36');
      const hinge = new THREE.Group(); hinge.position.set(0, 0.75, -0.84); group.add(hinge);
      const cover = box(hinge, [2.84, 0.16, 1.72], [0, 0.08, 0.86], '#1d374c', { roughness: 0.5, metalness: 0.4 });
      flatLabel(hinge, String(card.index + 1).padStart(2, '0'), [0.75, 0.43], [0, 0.165, 0.86], textures);
      box(hinge, [0.5, 0.04, 0.09], [0, 0.18, 1.52], '#8ba8b8', { roughness: 0.45, metalness: 0.6 });
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.92, 0.04, 1.8)), new THREE.LineBasicMaterial({ color: '#d4af37' }));
      outline.position.y = 0.73; group.add(outline);
      const stored = cylinder(group, 0.055, 0.018, [-1.17, 0.64, 0.76], '#183b38', { emissive: '#10342d', emissiveIntensity: 0 });
      group.traverse(object => { if (object.isMesh) { object.userData.trayIndex = card.index; targets.push(object); } });
      trays.push({ group, hinge, cover, outline, stored, openness: 0 });
    }
    const sign = labelTexture('ADIGUN / COMPONENT BENCH', '#0b1220', '#99e8f5', 1024, 128); textures.push(sign);
    const placard = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width - 1, 10), 0.75), new THREE.MeshBasicMaterial({ map: sign }));
    placard.position.set(0, 1.5, -depth / 2 - 0.7); board.add(placard);
    box(board, [Math.min(width - 1, 10) + 0.2, 0.95, 0.12], [0, 1.5, -depth / 2 - 0.78], '#1a3449');
    camera.position.set(width * 0.33, width * 0.77, width * 0.68);
    camera.lookAt(0, 0.4, 0); camera.updateProjectionMatrix(); activeConfig = config;
  }
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(targets, false).find(result => result.object.visible && result.object.parent?.visible !== false);
    if (Number.isInteger(hit?.object.userData.trayIndex)) onPick(hit.object.userData.trayIndex);
  }
  const onDown = event => { down = [event.clientX, event.clientY]; };
  const onUp = event => { if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 8) pick(event); down = null; };
  const onCancel = () => { down = null; };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onCancel);
  return {
    update(state, selected, seconds, reduceMotion) {
      let moving = false;
      if (activeConfig !== state.config) { rebuild(state.config); moving = true; }
      for (let index = 0; index < trays.length; index++) {
        const tray = trays[index], revealed = state.revealed.includes(index), matched = state.matched[index], target = revealed || matched ? 1 : 0;
        const before = tray.openness;
        tray.openness = reduceMotion ? target : Math.abs(target - before) < 0.002 ? target : before + (target - before) * Math.min(1, seconds * 12);
        if (tray.openness !== before) moving = true;
        tray.hinge.rotation.x = -tray.openness * Math.PI * 0.52;
        tray.hinge.visible = !matched;
        tray.outline.visible = index === selected;
        tray.stored.material.color.set(matched ? '#79deb0' : '#183b38');
        tray.stored.material.emissive.set(matched ? '#2d8f69' : '#10342d');
        tray.stored.material.emissiveIntensity = matched ? 0.35 : 0;
      }
      return moving;
    },
    render() { stage.render(); },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel);
      textures.forEach(texture => texture.dispose()); stage.dispose();
    }
  };
}
