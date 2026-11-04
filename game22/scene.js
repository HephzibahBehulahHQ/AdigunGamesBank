import { THREE, createStage, material, box, cylinder, line3 } from '../shared/three-stage.js';
import { stageRows } from './stage-data.js';

const COLORS = { violet: '#A78BFA', gold: '#D4AF37', steel: '#637187', navy: '#0B1220', green: '#7DE6AB', muted: '#B9C6DA', red: '#FFB0B8' };

function ring(parent, radius, thickness, y, color) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 8, 80), material(color, { metalness: .65, roughness: .3 }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function screen(parent, size, position) {
  const source = document.createElement('canvas'); source.width = 1024; source.height = 320;
  const texture = new THREE.CanvasTexture(source); texture.colorSpace = THREE.SRGBColorSpace;
  const finish = new THREE.SpriteMaterial({ map: texture, toneMapped: false, transparent: true, depthWrite: false, depthTest: false });
  const sprite = new THREE.Sprite(finish); sprite.position.set(...position); sprite.scale.set(size[0], size[1], 1); sprite.renderOrder = 4; parent.add(sprite);
  return { source, texture, sprite, previous: '' };
}

function paintDisplay(display, row) {
  const fingerprint = JSON.stringify([row.label, row.state, row.score, row.latency, row.leader, row.selected]);
  if (display.previous === fingerprint) return;
  display.previous = fingerprint;
  const ctx = display.source.getContext('2d');
  ctx.clearRect(0, 0, 1024, 320);
  ctx.fillStyle = '#0B1220F2'; ctx.fillRect(5, 5, 1014, 310);
  ctx.strokeStyle = row.leader ? COLORS.gold : row.selected ? COLORS.violet : '#596A83'; ctx.lineWidth = 7; ctx.strokeRect(7, 7, 1010, 306);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#F8FAFC'; ctx.font = '700 60px system-ui, sans-serif'; ctx.fillText(row.label, 34, 28, 948);
  ctx.fillStyle = row.returned ? COLORS.green : row.pending ? COLORS.violet : COLORS.muted;
  ctx.font = '500 36px system-ui, sans-serif'; ctx.fillText(row.state.toUpperCase(), 34, 113, 948);
  ctx.fillStyle = row.leader ? '#F5D974' : '#F8FAFC'; ctx.font = '700 56px ui-monospace, monospace';
  ctx.fillText(row.score === null ? 'SCORE —' : `${row.score.toFixed(2)} / 100`, 34, 174, 948);
  ctx.fillStyle = COLORS.muted; ctx.font = '400 31px system-ui, sans-serif'; ctx.fillText(row.latency, 34, 258, 948);
  display.texture.needsUpdate = true;
}

function buildPodium(scene, position, index) {
  const root = new THREE.Group(); root.position.set(...position); scene.add(root);
  const base = cylinder(root, 1.58, .24, [0, .24, 0], '#273348', { metalness: .72, roughness: .38 });
  base.geometry.dispose(); base.geometry = new THREE.CylinderGeometry(1.58, 1.7, .24, 8);
  const trim = ring(root, 1.52, .035, .38, COLORS.steel);
  box(root, [2.1, 2.45, 1.4], [0, 1.6, 0], '#192439', { metalness: .68, roughness: .38 });
  box(root, [1.89, 2.19, .055], [0, 1.61, .73], '#0B1423', { metalness: .5, roughness: .27 });
  for (const x of [-1.07, 1.07]) box(root, [.055, 2.42, 1.47], [x, 1.6, 0], '#8190A3', { metalness: .85, roughness: .28 });
  for (let shelf = 0; shelf < 5; shelf++) {
    const y = .73 + shelf * .42;
    box(root, [1.71, .29, .12], [0, y, .79], '#344156', { metalness: .8, roughness: .32 });
    for (let slit = 0; slit < 6; slit++) box(root, [.14, .08, .02], [-.65 + slit * .22, y, .86], '#0B1220');
    const light = box(root, [.07, .07, .03], [.76, y, .87], '#52657D');
    light.userData.indicator = true;
  }
  const crown = box(root, [1.89, .045, 1.25], [0, 2.86, 0], '#4F627D', { metalness: .5, roughness: .25 });
  box(root, [2.23, .13, 1.55], [0, 2.8, 0], '#6F7F97', { metalness: .72, roughness: .35 });
  const scoreBar = box(root, [.22, 1, .22], [1.28, .5, .1], COLORS.violet, { emissive: COLORS.violet, emissiveIntensity: .16, metalness: .6, roughness: .3 });
  scoreBar.visible = false;
  const label = screen(root, [4.35, 1.36], [0, index < 4 ? 4.1 : 3.95, .55]);
  root.traverse(child => { if (child.isMesh) child.userData.podium = index; });
  return { root, trim, crown, scoreBar, label };
}

/** Original 3D venue. Cabinet props are a scoreboard visualisation, not model infrastructure. */
export function createArenaStage({ canvas, qualitySelect, status, viewSelect, onSelect }) {
  const stage = createStage({ canvas, qualitySelect, status, position: [6, 20, 30], target: [0, 1, 0] });
  stage.scene.background = new THREE.Color('#080F1D');
  stage.scene.fog = new THREE.Fog('#080F1D', 55, 100);
  stage.light.position.set(-9, 22, 10);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), material('#0C1424', { roughness: .48, metalness: .38 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; stage.scene.add(ground);
  const deck = cylinder(stage.scene, 15, .3, [0, -.05, 0], '#152239', { metalness: .66, roughness: .44 });
  deck.geometry.dispose(); deck.geometry = new THREE.CylinderGeometry(15, 15.5, .3, 12);
  ring(stage.scene, 14.65, .045, .13, '#495C7A');
  ring(stage.scene, 13.9, .035, .14, '#A78BFA');
  for (let spoke = 0; spoke < 16; spoke++) {
    const angle = spoke * Math.PI / 8;
    line3(stage.scene, [[Math.sin(angle) * 4.2, .18, Math.cos(angle) * 4.2], [Math.sin(angle) * 13.7, .18, Math.cos(angle) * 13.7]], '#31435D');
  }
  cylinder(stage.scene, 3.1, .38, [0, .26, 0], '#293A54', { metalness: .78, roughness: .28 });
  ring(stage.scene, 2.9, .07, .48, COLORS.gold);
  ring(stage.scene, 2.1, .045, .49, COLORS.violet);
  cylinder(stage.scene, 1.15, .75, [0, .84, 0], '#0C1424', { metalness: .7, roughness: .22 });
  const hub = ring(stage.scene, 1.12, .06, 1.26, '#A78BFA');
  const positions = [[-8.4, .15, -4.6], [-2.8, .15, -5.4], [2.8, .15, -5.4], [8.4, .15, -4.6], [-8.4, .15, 4.6], [-2.8, .15, 5.4], [2.8, .15, 5.4], [8.4, .15, 4.6]];
  const pods = positions.map((position, index) => buildPodium(stage.scene, position, index));
  const target = new THREE.Vector3(0, 1.2, 0);
  let azimuth = .18, distance = 31, elevation = 20, snapshot = {}, rows = stageRows(), disposed = false, lost = false, frame = 0, animation = false;
  let drag = null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();

  function positionCamera() {
    stage.camera.position.set(Math.sin(azimuth) * distance, elevation, Math.cos(azimuth) * distance);
    stage.camera.lookAt(target);
  }
  function render() { if (!disposed && !lost) { positionCamera(); stage.render(); } }
  function tick(time) {
    frame = 0;
    if (disposed || lost || !animation || document.hidden) return;
    hub.material.emissive.set(COLORS.violet); hub.material.emissiveIntensity = .12 + (Math.sin(time / 600) + 1) * .12;
    render(); frame = requestAnimationFrame(tick);
  }
  function animationState() {
    animation = Boolean(snapshot.running) && !motion.matches;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    hub.material.emissiveIntensity = 0;
    if (animation && !document.hidden && !lost) frame = requestAnimationFrame(tick); else render();
  }
  function update(next = {}) {
    snapshot = next; rows = stageRows(next);
    rows.forEach((row, index) => {
      const pod = pods[index];
      const color = row.leader ? COLORS.gold : row.returned ? COLORS.green : row.pending || row.selected ? COLORS.violet : row.configured ? '#84A5D4' : '#52657D';
      pod.trim.material.color.set(color); pod.crown.material.color.set(color);
      pod.root.traverse(child => { if (child.userData.indicator) { child.material.color.set(color); child.material.emissive.set(color); child.material.emissiveIntensity = row.configured || row.returned ? .3 : 0; } });
      pod.scoreBar.visible = row.score !== null;
      if (row.score !== null) { const height = Math.max(.025, row.score / 100 * 3.1); pod.scoreBar.scale.y = height; pod.scoreBar.position.y = .4 + height / 2; pod.scoreBar.material.color.set(color); }
      paintDisplay(pod.label, row);
    });
    canvas.dataset.liveResponses = String(rows.filter(row => row.returned).length);
    canvas.dataset.scene = 'original-3d-arena';
    animationState();
  }
  function view(value) {
    if (value === 'front') { azimuth = 0; distance = 29; elevation = 15; }
    else if (value === 'plan') { azimuth = 0; distance = 17; elevation = 31; }
    else { azimuth = .18; distance = 31; elevation = 20; }
    render();
  }
  const onView = () => view(viewSelect.value);
  const onQuality = () => render();
  const onMotion = () => animationState();
  const onVisibility = () => { if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; } else animationState(); };
  const onLost = () => { lost = true; if (frame) cancelAnimationFrame(frame); frame = 0; if (status) status.textContent = '3D graphics connection lost. Reload to restore the scene. The comparison desk remains available.'; };
  const onKey = event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', '+', '=', '-', '_'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') return view('overview');
    if (event.key === 'ArrowLeft') azimuth = Math.max(-.7, azimuth - .08);
    if (event.key === 'ArrowRight') azimuth = Math.min(.7, azimuth + .08);
    if (event.key === 'ArrowUp') elevation = Math.min(32, elevation + 1.5);
    if (event.key === 'ArrowDown') elevation = Math.max(10, elevation - 1.5);
    if (['+', '='].includes(event.key)) distance = Math.max(22, distance - 1);
    if (['-', '_'].includes(event.key)) distance = Math.min(40, distance + 1);
    render();
  };
  const onDown = event => { if (event.button !== 0 || lost) return; drag = { x: event.clientX, y: event.clientY, azimuth, moved: false, pointer: event.pointerId }; canvas.setPointerCapture(event.pointerId); };
  const onMove = event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) + Math.abs(event.clientY - drag.y) > 7) drag.moved = true;
    if (drag.moved) { azimuth = Math.max(-.7, Math.min(.7, drag.azimuth - dx * .003)); render(); }
  };
  const onUp = event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    if (!drag.moved) {
      const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, stage.camera);
      const hit = raycaster.intersectObjects(pods.map(pod => pod.root), true).find(hit => Number.isInteger(hit.object.userData.podium));
      if (hit) onSelect?.(rows[hit.object.userData.podium].key);
    }
    drag = null;
  };
  const onCancel = () => { drag = null; };
  qualitySelect?.addEventListener('change', onQuality); viewSelect?.addEventListener('change', onView);
  motion.addEventListener('change', onMotion); document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('stage-lost', onLost); canvas.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onCancel);
  const observer = new ResizeObserver(render); observer.observe(canvas);
  if (qualitySelect) stage.setQuality(qualitySelect.value);
  update();
  return {
    update, render, view,
    dispose() {
      disposed = true; if (frame) cancelAnimationFrame(frame); observer.disconnect();
      qualitySelect?.removeEventListener('change', onQuality); viewSelect?.removeEventListener('change', onView);
      motion.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('stage-lost', onLost); canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel);
      pods.forEach(pod => pod.label.texture.dispose()); stage.dispose();
    },
  };
}
