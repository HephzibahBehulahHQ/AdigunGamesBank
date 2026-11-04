import { createStage } from '../shared/three-stage.js';
import { campaign } from '../shared/progression.js';
import { createGame, currentTarget, normalizeAim, pauseGame, predict, resumeGame, startGame, stepGame, throwStone } from './engine.js';
import { buildValleyScene } from './scene.js';

const $ = id => document.getElementById(id), canvas = $('valley');
const progress = campaign('bible-valley-of-elah');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let game = createGame(progress.unlocked), aim = normalizeAim(), stage = null, visual = null, graphicsAvailable = false;
let previousFrame = null, frameId = null, lastEvent = -1, recorded = false, dirty = true, drag = null;

function message(text) { $('message').textContent = text; }
function focusGame() { canvas.focus({ preventScroll: true }); }
function isActive() { return ['aim', 'flight', 'feedback', 'paused'].includes(game.phase); }
function controlsToAim() {
  aim = normalizeAim({ yaw: Number($('yaw').value), elevation: Number($('elevation').value), speed: Number($('speed').value) });
  for (const key of ['yaw', 'elevation', 'speed']) {
    $(key).value = String(aim[key]);
    const units = key === 'speed' ? ' m/s' : '°';
    $(`${key}-value`).textContent = aim[key].toFixed(1) + units;
    $(key).setAttribute('aria-valuetext', aim[key].toFixed(1) + (key === 'speed' ? ' metres per second' : ' degrees'));
  }
  aimTelemetry(); dirty = true;
}
function aimTelemetry() {
  if (!$('assist').checked) {
    $('aim-telemetry').textContent = 'Aiming guidance is off. Use the target range, centre height and wind readings to choose your shot.';
    return;
  }
  const expected = predict(currentTarget(game), aim);
  if (expected.shortBy > 0) $('aim-telemetry').textContent = `Projected landing: ${expected.shortBy.toFixed(1)} metres short of the target. Increase range with speed and elevation.`;
  else if (expected.hit) $('aim-telemetry').textContent = `Projected hit inside the gold ring. Flight to target: ${expected.arrival.toFixed(2)} seconds. Release when ready.`;
  else $('aim-telemetry').textContent = `Projected miss: ${Math.abs(expected.dx).toFixed(2)} metres ${expected.dx < 0 ? 'left' : 'right'}, ${Math.abs(expected.dy).toFixed(2)} metres ${expected.dy < 0 ? 'below' : 'above'} centre. Aim against the wind and adjust elevation or speed.`;
}
function progressSaved() {
  try {
    const stored = JSON.parse(globalThis.localStorage.getItem('adigun.campaign.v1.bible-valley-of-elah') || 'null');
    return stored?.version === 1 && Number.isInteger(stored.completed) && stored.completed >= progress.completed;
  } catch { return false; }
}
function saveFeedback() {
  return progressSaved() ? 'Campaign progress is saved on this device.' : 'Progress is available for this session only. Browser storage could not save it; keep this page open.';
}
function updateUI() {
  const target = currentTarget(game);
  $('level-readout').textContent = `${game.config.level.toLocaleString()} / 10,000`;
  $('stones-readout').textContent = String(game.stones);
  $('hits-readout').textContent = `${game.hits} / 3`;
  $('tier').textContent = game.config.tier;
  $('target-kind').textContent = target.type === 'encounter' ? 'The encounter · target 3 of 3' : `Practice ${game.targetIndex + 1} of 2`;
  $('target-name').textContent = target.name;
  $('target-range').textContent = `${target.z.toFixed(1)} m`;
  $('target-offset').textContent = `${Math.abs(target.x).toFixed(2)} m ${target.x < 0 ? 'left' : 'right'}`;
  $('target-height').textContent = `${target.y.toFixed(2)} m`;
  $('target-radius').textContent = `${target.radius.toFixed(2)} m`;
  $('target-wind').textContent = `${target.wind > 0 ? '+' : ''}${target.wind.toFixed(2)} m/s²`;
  $('start').disabled = !graphicsAvailable || game.phase !== 'ready';
  $('throw').disabled = !graphicsAvailable || game.phase !== 'aim';
  $('pause').disabled = !graphicsAvailable || !isActive();
  $('pause').textContent = game.phase === 'paused' ? 'Resume · Esc' : 'Pause · Esc';
  for (const key of ['yaw', 'elevation', 'speed']) $(key).disabled = !graphicsAvailable || !['aim', 'ready'].includes(game.phase);
  $('load-level').disabled = isActive(); $('level').disabled = isActive();
  $('game-overlay').hidden = ['aim', 'flight', 'feedback'].includes(game.phase);
  if (game.phase === 'ready') {
    $('overlay-kicker').textContent = 'Five stones. One encounter.';
    $('overlay-title').textContent = 'Stand in the valley.';
    $('overlay-copy').textContent = 'Select Begin. Adjust your aim and release speed, then throw.';
  } else if (game.phase === 'paused') {
    $('overlay-kicker').textContent = 'Take a breath';
    $('overlay-title').textContent = 'Challenge paused.';
    $('overlay-copy').textContent = 'Your aim and any stone in flight are preserved. Resume when ready.';
  } else if (game.phase === 'won') {
    if (!recorded) { progress.complete(game.config.level); recorded = true; }
    $('overlay-kicker').textContent = 'Encounter complete';
    $('overlay-title').textContent = 'The valley falls quiet.';
    $('overlay-copy').textContent = `All three targets struck in ${game.throws} throws. ${saveFeedback()}`;
  } else if (game.phase === 'lost') {
    $('overlay-kicker').textContent = 'Five stones spent';
    $('overlay-title').textContent = 'Try a different aim.';
    $('overlay-copy').textContent = `${game.hits} of 3 targets struck. Retry this challenge; your earlier progress is safe.`;
  }
  $('campaign-status').textContent = (progress.mastered ? 'All 10,000 challenges cleared. Every level can be replayed.' : `${progress.completed.toLocaleString()} cleared · challenge ${progress.unlocked.toLocaleString()} unlocked.`) + (progress.completed > 0 ? ` ${saveFeedback()}` : ' Completed levels save here when browser storage is available.');
  $('level').max = String(progress.unlocked); $('level').value = String(game.config.level);
  $('next').hidden = !(game.phase === 'won' && game.config.level < progress.unlocked);
  if (lastEvent !== game.event) { message(game.message); lastEvent = game.event; }
  aimTelemetry(); dirty = true;
}
function reset(level = game.config.level) {
  game = createGame(level); aim = normalizeAim(); recorded = false; lastEvent = -1; previousFrame = null; drag = null;
  for (const key of ['yaw', 'elevation', 'speed']) $(key).value = String(aim[key]);
  controlsToAim(); updateUI();
}
function begin() { if (graphicsAvailable && startGame(game)) { updateUI(); focusGame(); } }
function release() {
  if (graphicsAvailable && throwStone(game, aim)) { drag = null; updateUI(); focusGame(); }
}
function togglePause() {
  if (!graphicsAvailable) return;
  if (game.phase === 'paused') resumeGame(game); else pauseGame(game);
  previousFrame = null; drag = null; updateUI(); focusGame();
}
function automaticPause() {
  if (pauseGame(game)) { previousFrame = null; drag = null; updateUI(); message('Paused while the game is inactive. Resume when you are ready.'); }
}

$('start').addEventListener('click', begin);
$('throw').addEventListener('click', release);
$('pause').addEventListener('click', togglePause);
$('restart').addEventListener('click', () => { reset(); focusGame(); });
$('next').addEventListener('click', () => { reset(Math.min(progress.unlocked, game.config.level + 1)); focusGame(); });
$('level-form').addEventListener('submit', event => {
  event.preventDefault();
  if (isActive()) return;
  const level = Number($('level').value);
  if (!Number.isInteger(level) || level < 1 || level > progress.unlocked) return message(`Choose an unlocked challenge from 1 to ${progress.unlocked}.`);
  reset(level);
});
for (const key of ['yaw', 'elevation', 'speed']) $(key).addEventListener('input', controlsToAim);
$('assist').addEventListener('change', () => { aimTelemetry(); dirty = true; });
$('camera-view').addEventListener('change', () => { dirty = true; });
$('quality').addEventListener('change', () => { dirty = true; });
window.addEventListener('resize', () => { dirty = true; });
reducedMotion.addEventListener('change', () => { dirty = true; });
window.addEventListener('blur', automaticPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) automaticPause(); });
canvas.addEventListener('stage-lost', () => { graphicsAvailable = false; automaticPause(); updateUI(); message('Graphics connection lost. Reload to resume from your last saved challenge.'); });
canvas.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  const handled = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'z', 'x', ' ', 'enter', 'escape', 'r'];
  if (!handled.includes(key)) return;
  event.preventDefault();
  if ([' ', 'enter', 'escape', 'r'].includes(key) && event.repeat) return;
  if (key === 'enter') { if (game.phase === 'ready') begin(); else if (game.phase === 'paused') togglePause(); return; }
  if (key === 'escape') { togglePause(); return; }
  if (key === 'r') { reset(); return; }
  if (key === ' ') { release(); return; }
  if (!['aim', 'ready'].includes(game.phase)) return;
  const amount = event.shiftKey ? 0.1 : 0.5;
  const changes = { arrowleft: ['yaw', -amount], arrowright: ['yaw', amount], arrowup: ['elevation', amount], arrowdown: ['elevation', -amount], z: ['speed', -amount], x: ['speed', amount] };
  const [control, delta] = changes[key]; $(control).value = String(aim[control] + delta); controlsToAim();
});
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !['aim', 'ready'].includes(game.phase)) return;
  event.preventDefault(); focusGame();
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: aim.yaw, elevation: aim.elevation };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  $('yaw').value = String(drag.yaw + (event.clientX - drag.x) * 0.06);
  $('elevation').value = String(drag.elevation - (event.clientY - drag.y) * 0.06);
  controlsToAim();
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => { drag = null; });
$('year').textContent = new Date().getFullYear();

function frame(timestamp) {
  const dt = previousFrame === null ? 0 : Math.min(0.1, (timestamp - previousFrame) / 1000); previousFrame = timestamp;
  const moving = game.phase === 'flight' || game.phase === 'feedback';
  if (stepGame(game, dt) || lastEvent !== game.event) updateUI();
  if (dirty || moving) {
    visual.update(game, aim, $('assist').checked, reducedMotion.matches, $('camera-view').value);
    stage.render(); dirty = false;
  }
  frameId = requestAnimationFrame(frame);
}

try {
  stage = createStage({ canvas, qualitySelect: $('quality'), status: $('render-status'), position: [4.5, 4.2, -8], target: [0, 2, 12] });
  visual = buildValleyScene(stage);
  graphicsAvailable = true;
  controlsToAim(); updateUI(); frameId = requestAnimationFrame(frame);
} catch (error) {
  stage?.dispose(); stage = null; updateUI();
  message('This game needs a working WebGL 2 renderer. Enable hardware acceleration or try a compatible browser.');
  $('overlay-kicker').textContent = 'Graphics unavailable'; $('overlay-title').textContent = 'The 3D scene could not start.';
  $('overlay-copy').textContent = 'Check WebGL 2 support and reload. Saved campaign progress is retained.';
  $('render-status').textContent = '3D renderer unavailable';
}
window.addEventListener('pagehide', event => {
  automaticPause();
  if (!event.persisted) { cancelAnimationFrame(frameId); stage?.dispose(); }
});
window.addEventListener('pageshow', event => { if (event.persisted) { previousFrame = null; dirty = true; } });
