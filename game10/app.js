import { createCampaign, CAMPAIGN_ID, LEVEL_COUNT, trackPoint } from './campaign.js';
import { createRace, startRace, pauseRace, resumeRace, restartRace, recoverCar, stepRace, drivingGuide } from './engine.js';
import { validCampaignSave } from '../shared/progression.js';
import { bindHoldButton } from './input.js';

const $ = id => document.getElementById(id), canvas = $('race-canvas');
const campaign = createCampaign(), motion = matchMedia('(prefers-reduced-motion: reduce)');
let state = createRace(campaign.unlocked), scene = null, recorded = false, dirty = true;
let previousTime = 0, previousUI = 0, previousRender = 0, frame = 0, suspended = false;
const keys = new Set(), held = new Set(), buttonFor = new Map(), resetButtons = [];
const number = (value, precision = 1) => value.toFixed(precision);
const phases = { ready: 'READY', running: 'ON TRACK', paused: 'PAUSED', won: 'QUALIFIED', lost: 'TIME EXPIRED' };
let lastMessage = '';

function message(text) {
  if (text !== lastMessage) { $('message').textContent = text; lastMessage = text; }
}
function progressText() {
  if (!campaign.completed) return 'Progress saves on this device after you qualify.';
  let durable = false;
  try {
    const saved = JSON.parse(localStorage.getItem(`adigun.campaign.v1.${CAMPAIGN_ID}`) || 'null');
    durable = validCampaignSave(saved) && saved.completed >= campaign.completed;
  } catch { /* Storage may be unavailable or silently reject a write. */ }
  return `${campaign.completed.toLocaleString()} ${campaign.completed === 1 ? 'race' : 'races'} qualified. ` + (durable
    ? 'Progress saved on this device.'
    : 'Progress is available for this session only; browser storage could not confirm a save.');
}
function clearHeld() {
  keys.clear(); held.clear(); resetButtons.forEach(reset => reset());
  for (const button of buttonFor.values()) button.setAttribute('aria-pressed', 'false');
}
function resetControls() {
  clearHeld(); $('steering').value = '0'; $('throttle').value = '0'; updatePedals();
}
function updatePedals() {
  const steering = Number($('steering').value), throttle = Number($('throttle').value);
  $('steering-value').textContent = `${steering > 0 ? '+' : ''}${steering}%`;
  $('throttle-value').textContent = `${throttle}%`;
  $('steering').setAttribute('aria-valuetext', steering === 0 ? 'Straight' : `${Math.abs(steering)} percent ${steering < 0 ? 'left' : 'right'}`);
  dirty = true;
}
function inputs() {
  const left = held.has('left') || keys.has('ArrowLeft') || keys.has('a');
  const right = held.has('right') || keys.has('ArrowRight') || keys.has('d');
  return {
    steer: left || right ? Number(right) - Number(left) : Number($('steering').value) / 100,
    throttle: held.has('accelerate') || keys.has('ArrowUp') || keys.has('w') ? 1 : Number($('throttle').value) / 100,
    brake: held.has('brake') || keys.has('ArrowDown') || keys.has('s') ? 1 : 0
  };
}
function minimap() {
  const target = trackPoint(state.config, state.nextGate % state.config.gateCount * state.config.length / state.config.gateCount);
  $('map-car').setAttribute('transform', `translate(${state.car.x} ${state.car.z}) rotate(${state.car.heading * 180 / Math.PI})`);
  $('map-gate').setAttribute('cx', String(target.x)); $('map-gate').setAttribute('cy', String(target.z));
}
function telemetry() {
  const c = state.config, guide = drivingGuide(state), guidePercent = Math.round(guide.steer * 100);
  $('speed').textContent = number(state.car.speed * 3.6, 0);
  $('elapsed').textContent = number(state.elapsed, 2);
  $('time-left').textContent = `${number(Math.max(0, c.timeLimit - state.elapsed))} s remaining`;
  $('lap').textContent = `${Math.min(c.laps, state.completedLaps + 1)} / ${c.laps}`;
  $('gate-count').textContent = `${state.gatesPassed} / ${c.laps * c.gateCount} gates`;
  $('track-state').textContent = state.sectorInvalid ? 'RECOVER' : state.phase === 'won' ? state.medal.toUpperCase() : 'CLEAN';
  $('track-state').classList.toggle('warning', state.sectorInvalid);
  $('penalty').textContent = `${number(state.penalty)} s penalty`;
  $('next-gate').textContent = state.phase === 'won' ? 'All gates cleared' : `Gate ${state.nextGate} / ${c.gateCount}`;
  $('guide-text').textContent = state.sectorInvalid ? 'Sector invalid. Recover to your last clean gate before driving on.'
    : `Steer ${guidePercent >= 0 ? 'right' : 'left'} ${Math.abs(guidePercent)}%. Brake if the tyres run out of grip.`;
  $('guide-speed').textContent = `${number(guide.suggestedSpeed * 3.6, 0)} km/h`;
  $('road-offset').textContent = `${number(guide.offset)} m`;
  $('gate-distance').textContent = `${number(guide.gateDistance)} m`;
  $('grip-state').textContent = state.gripLimited ? 'Limit reached: brake' : 'Available';
  minimap();
}
function sync() {
  if (state.phase === 'won' && !recorded) { campaign.complete(state.config.level); recorded = true; clearHeld(); }
  const active = state.phase === 'running', paused = state.phase === 'paused', step = $('drive-mode').value === 'step';
  $('phase').textContent = phases[state.phase]; $('phase').dataset.phase = state.phase;
  $('start').disabled = state.phase !== 'ready'; $('pause').disabled = !active && !paused;
  $('pause').textContent = paused ? 'Resume race' : 'Pause race';
  $('recover').disabled = !active && !paused; $('step').disabled = !active;
  $('step').hidden = !step;
  $('next-level').hidden = state.phase !== 'won' || state.config.level === LEVEL_COUNT;
  $('level').max = String(campaign.unlocked);
  $('unlock-status').textContent = campaign.mastered ? 'All 10,000 races qualified' : `Race ${campaign.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`;
  $('save-status').textContent = progressText();
  $('message').className = `message ${state.phase === 'won' ? 'success' : state.phase === 'lost' || state.sectorInvalid ? 'error' : ''}`;
  message(state.message); telemetry(); dirty = true;
}
function setCircuit(requested) {
  const value = Number(requested);
  if (!Number.isInteger(value) || value < 1 || value > campaign.unlocked) {
    $('level').value = String(state.config.level); message('Qualify in the current unlocked race before loading a later circuit.'); return;
  }
  state = createRace(value); recorded = false; previousTime = 0; resetControls();
  const c = state.config;
  $('level').value = String(value); $('tier').textContent = c.tier; $('circuit-name').textContent = c.name;
  $('mission-brief').textContent = c.description;
  $('circuit-length').textContent = number(c.length, 0); $('conditions').textContent = c.conditions; $('target-time').textContent = String(c.timeLimit);
  const path = c.points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.z.toFixed(2)}`).join(' ') + ' Z';
  $('map-road').setAttribute('d', path); $('map-road').setAttribute('stroke-width', String(c.width)); $('map-line').setAttribute('d', path);
  const extent = Math.ceil(c.radius * 1.2 + c.width);
  $('circuit-map').setAttribute('viewBox', `${-extent} ${-extent} ${extent * 2} ${extent * 2}`);
  sync();
}
function togglePause() {
  if (state.phase === 'running') { pauseRace(state); clearHeld(); }
  else if (state.phase === 'paused') resumeRace(state);
  previousTime = 0; sync();
}
function configureCamera() {
  if (motion.matches) $('camera').value = 'circuit';
  $('camera').disabled = motion.matches;
  scene?.setCamera($('camera').value);
  $('view-label').textContent = motion.matches ? 'FIXED CAMERA · REDUCED MOTION' : $('camera').value === 'chase' ? 'CHASE CAMERA' : 'CIRCUIT OVERVIEW';
  dirty = true;
}

$('start').addEventListener('click', () => {
  if (startRace(state)) { previousTime = 0; sync(); ($('drive-mode').value === 'step' ? $('step') : canvas).focus(); }
});
$('pause').addEventListener('click', togglePause);
$('recover').addEventListener('click', () => { clearHeld(); if (recoverCar(state)) sync(); });
$('restart').addEventListener('click', () => { state = restartRace(state); recorded = false; previousTime = 0; resetControls(); sync(); });
$('next-level').addEventListener('click', () => { setCircuit(Math.min(LEVEL_COUNT, state.config.level + 1)); $('start').focus(); });
$('load-level').addEventListener('click', () => setCircuit($('level').value));
$('level').addEventListener('keydown', event => { if (event.key === 'Enter') setCircuit($('level').value); });
$('centre-wheel').addEventListener('click', () => { $('steering').value = '0'; updatePedals(); });
$('guide-wheel').addEventListener('click', () => { $('steering').value = String(Math.round(drivingGuide(state).steer * 100)); updatePedals(); });
for (const id of ['steering', 'throttle']) $(id).addEventListener('input', updatePedals);
$('quality').addEventListener('change', () => { dirty = true; });
$('camera').addEventListener('change', configureCamera); motion.addEventListener('change', configureCamera);
$('drive-mode').addEventListener('change', () => {
  if (state.phase === 'running') pauseRace(state);
  clearHeld(); previousTime = 0; sync();
});
$('step').addEventListener('click', () => {
  if ($('drive-mode').value !== 'step' || state.phase !== 'running') return;
  const controls = inputs(); stepRace(state, controls, 0.25); stepRace(state, controls, 0.25); sync();
});
$('reload-graphics').addEventListener('click', () => location.reload());

for (const [id, control] of [['steer-left', 'left'], ['steer-right', 'right'], ['accelerate', 'accelerate'], ['brake', 'brake']]) {
  const button = $(id); buttonFor.set(control, button); button.setAttribute('aria-pressed', 'false');
  resetButtons.push(bindHoldButton(button, control, held));
}
document.addEventListener('keydown', event => {
  if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) { event.preventDefault(); keys.add(key); }
  if (key === ' ' && !event.repeat) { event.preventDefault(); togglePause(); }
});
document.addEventListener('keyup', event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
function backgroundPause() { clearHeld(); if (pauseRace(state)) sync(); previousTime = 0; }
window.addEventListener('blur', backgroundPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); });
window.addEventListener('resize', () => { dirty = true; });

function animate(now) {
  if (suspended) return;
  const dt = previousTime ? Math.min(0.25, Math.max(0, (now - previousTime) / 1000)) : 0; previousTime = now;
  const phase = state.phase, messageBefore = state.message;
  if (phase === 'running' && $('drive-mode').value === 'realtime') stepRace(state, inputs(), dt);
  if (phase !== state.phase || messageBefore !== state.message) sync();
  if (now - previousUI > 100 && state.phase === 'running') { telemetry(); previousUI = now; }
  if (scene && (dirty || state.phase === 'running' && $('drive-mode').value === 'realtime') && now - previousRender > 33) {
    scene.draw(state, motion.matches); dirty = false; previousRender = now;
  }
  frame = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', event => {
  backgroundPause(); suspended = true; cancelAnimationFrame(frame);
  if (!event.persisted) scene?.dispose();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) { suspended = false; previousTime = 0; dirty = true; frame = requestAnimationFrame(animate); }
});

setCircuit(campaign.unlocked); configureCamera(); frame = requestAnimationFrame(animate);
try {
  const { createCircuitScene } = await import('./scene.js');
  scene = createCircuitScene({ canvas, qualitySelect: $('quality'), status: $('graphics-status') });
  configureCamera(); dirty = true;
} catch {
  $('graphics-fallback').hidden = false; $('quality').disabled = true; $('camera').disabled = true;
  $('drive-mode').value = 'step';
  $('graphics-status').textContent = 'WebGL 2 unavailable. Step driving and live telemetry remain available.';
  if (state.phase === 'running') pauseRace(state);
  sync();
}
canvas.addEventListener('stage-lost', () => {
  backgroundPause(); $('graphics-fallback').hidden = false; $('quality').disabled = true;
  $('drive-mode').value = 'step'; $('graphics-status').textContent = 'Graphics connection lost. Resume with step driving or reload graphics.'; sync();
});
