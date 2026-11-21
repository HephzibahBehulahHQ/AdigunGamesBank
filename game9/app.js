import { campaign, LEVEL_COUNT, tierFor } from '../shared/progression.js';
import { CLEARANCE_SPEED, MAX_CLEARANCE_SPEED, MIN_CLEARANCE_SPEED, STEP, advance, clear, createDrill, goalNetImpact, goalNetRest, incomingAt, nextFeed, planClearance, pressureAt, readContact, receiverAt } from './clearance.js';
import { createPitchAudio } from './pitch-audio.js';
import { gamepadControls } from './gamepad.js';

const byId = (id) => document.getElementById(id);
const save = campaign('goal-line');
const levelInput = byId('level');
const angle = byId('angle');
const kickSpeed = byId('kick-speed');
const loft = byId('loft');
const loftControl = byId('loft-control');
const buttons = [...document.querySelectorAll('[data-move]')];
const next = byId('next');
const clearButton = byId('clear');
const canvas = byId('pitch');
const quality = byId('quality');
const cameraView = byId('camera-view');
const cameraKey = 'adigun.goal-line.camera';
try {
  if (localStorage.getItem(cameraKey) === 'broadcast') cameraView.value = 'broadcast';
} catch {
  // The camera still works when the browser blocks storage.
}
const graphics = byId('graphics');
const liveButton = byId('live');
const game = byId('game');
const fullscreen = byId('fullscreen');
const movementHelp = byId('movement-help');
const sound = byId('sound');
const audio = createPitchAudio();
const keys = new Set();
let level = save.unlocked;
let state;
let pitch;
let detachPitchControls;
let timer = null;
let direction = 0;
let lastFootstep = -Infinity;
const pad = gamepadControls({
  live: () => liveButton.click(),
  aim: (change) => adjustAim(change),
  power: (change) => adjustPower(change),
  loft: toggleLoft,
  clear: () => clearButton.click(),
  advance: () => { if (!next.hidden) next.click(); },
  reset: () => byId('retry').click(),
  disconnect: () => {
    if (timer === null) return;
    setLive(false);
    update('Controller disconnected. Live ball paused. ' + byDistance());
  }
});

function setLive(enabled) {
  if (timer !== null) clearInterval(timer);
  timer = enabled ? setInterval(() => {
    const movement = keys.size ? Number(keys.has('d')) - Number(keys.has('a')) : pad.movement || direction;
    move(movement);
  }, STEP * 1000) : null;
  keys.clear();
  direction = 0;
}

function sideways(x) {
  if (Math.abs(x) < 0.005) return 'centre';
  return Math.abs(x).toFixed(2) + ' m ' + (x < 0 ? 'left' : 'right');
}

function update(message) {
  const feed = state.feeds[state.index];
  const delivery = readContact(feed, state.tick, state.defender);
  const { ball, contact, inWindow, high, aligned, reachable } = delivery;
  const aiming = Number(angle.value);
  const ready = state.result === 'ready';
  const finished = state.result === 'cleared' && state.index === state.feeds.length - 1;
  const safeEdge = feed.halfWidth;
  const speed = Number(kickSpeed.value);
  const projection = planClearance(feed, delivery, state.tick, aiming, speed, loft.checked);
  const pressure = pressureAt(feed, state.tick * STEP);
  const shot = state.trajectory;
  const position = state.result === 'conceded'
    ? goalNetRest(goalNetImpact(feed))
    : shot?.interception?.ball ?? shot?.rest ?? shot?.end ?? ball;
  const completed = save.completed;
  const mastery = completed === LEVEL_COUNT ? ' · Campaign complete' : '';
  byId('campaign').textContent = 'Drill ' + level + ' of 10,000 · ' + tierFor(level) + ' · ' + completed + ' cleared' + mastery;
  const location = sideways(position.x) + ', ' + Math.abs(position.z).toFixed(2) + ' m ' + (position.z < 0 ? 'behind' : 'from') + ' goal line';
  byId('ball').textContent = position.y > 0.12 ? location + ' · ' + position.y.toFixed(2) + ' m high' : location;
  byId('defender').textContent = sideways(state.defender);
  const outlet = ball.z <= 2.3 && !projection.short ? projection.receiver : receiverAt(feed, state.tick * STEP);
  byId('gate').textContent = sideways(outlet - safeEdge) + ' to ' + sideways(outlet + safeEdge);
  const aimReading = projection.interception ? sideways(projection.interception.ball.x) + ' · intercepted'
    : projection.short ? 'Short · stops at ' + projection.end.z.toFixed(2) + ' m upfield'
      : projection.tooHigh ? 'Too high for the receiver'
      : (projection.atGate ? 'On target' : 'Misses outlet') + ' · ' + sideways(projection.end.x);
  byId('projection').textContent = !ready ? 'Ball finished'
    : ball.z <= 2.3 ? aimReading : 'Available inside contact zone';
  byId('surface').hidden = !feed.resistance;
  byId('pressing').hidden = pressure === null;
  if (pressure) byId('pressure-position').textContent = sideways(pressure.x) + ', ' + pressure.z.toFixed(2) + ' m upfield';
  byId('angle-value').textContent = aiming + '°';
  byId('speed-value').textContent = speed + ' m/s';
  const angleDescription = aiming === 0 ? 'Straight ahead'
    : `${Math.abs(aiming)} ${Math.abs(aiming) === 1 ? 'degree' : 'degrees'} ${aiming < 0 ? 'left' : 'right'}`;
  const speedDescription = `${speed} meters per second`;
  if (angle.getAttribute('aria-valuetext') !== angleDescription) angle.setAttribute('aria-valuetext', angleDescription);
  if (kickSpeed.getAttribute('aria-valuetext') !== speedDescription) kickSpeed.setAttribute('aria-valuetext', speedDescription);
  const contactReading = byId('contact');
  const moveSide = contact.x < state.defender ? 'left' : 'right';
  let contactText = '';
  if (ready) {
    if (reachable) contactText = 'Ball in reach.';
    else if (inWindow && high) contactText = 'Ball too high. Wait for it to drop.';
    else if (!aligned) contactText = `Move ${moveSide} to meet the ball.`;
    else contactText = 'Wait for the ball to reach you.';
  }
  if (contactReading.textContent !== contactText) {
    contactReading.textContent = contactText;
    if (timer !== null && ready && reachable) audio.play('ready', contact.x);
  }
  if (message !== undefined) byId('message').textContent = message;
  levelInput.max = save.unlocked;
  const live = timer !== null;
  buttons.forEach((button) => {
    button.disabled = !ready;
    if (live) button.setAttribute('aria-pressed', Number(button.dataset.move) === direction);
    else button.removeAttribute('aria-pressed');
  });
  liveButton.disabled = !ready;
  liveButton.textContent = live ? 'Pause live ball' : state.tick ? 'Resume live ball' : 'Start live ball';
  movementHelp.textContent = live
    ? 'Hold A or D to move, or tap a direction. Tap Hold to stop moving.'
    : 'Each movement advances the ball by 0.1 seconds. Start the live ball for a timed clearance.';
  angle.disabled = kickSpeed.disabled = loft.disabled = clearButton.disabled = !ready;
  loftControl.hidden = !feed.pressure;
  next.hidden = state.result !== 'cleared' || (finished && level === LEVEL_COUNT);
  next.textContent = finished ? 'Next drill' : 'Next ball';
  pitch?.draw(state, feed, ball, aiming, contact, projection);
}

function load(levelNumber, moveFocus = false) {
  setLive(false);
  audio.stop();
  lastFootstep = -Infinity;
  level = levelNumber;
  levelInput.value = levelNumber;
  state = createDrill(levelNumber);
  angle.value = 0;
  kickSpeed.value = CLEARANCE_SPEED;
  loft.checked = false;
  update('Ball 1 of ' + state.feeds.length + '. Move into its path.');
  if (moveFocus) buttons[1].focus();
}

function move(direction) {
  const before = state.defender;
  advance(state, direction);
  if (state.defender !== before && state.tick - lastFootstep >= 3) {
    audio.play('step', state.defender);
    lastFootstep = state.tick;
  }
  if (state.result === 'conceded') {
    setLive(false);
    const impact = goalNetImpact(state.feeds[state.index]);
    audio.play('net', impact.x, Math.max(0, impact.time - (state.tick - 1) * STEP));
    update('Goal conceded. Restart the drill to try again.');
    byId('retry').focus();
    return;
  }
  update(timer === null ? 'Ball ' + (state.index + 1) + ': ' + byDistance() : undefined);
}

buttons.forEach((button) => button.addEventListener('click', () => {
  const selected = Number(button.dataset.move);
  if (timer === null) {
    move(selected);
  } else {
    direction = selected;
    update();
  }
}));

function toggleLive() {
  if (state.result !== 'ready') return;
  setLive(timer === null);
  update(timer === null ? 'Live ball paused. ' + byDistance() : 'Live ball in play.');
}

function adjustAim(change) {
  if (angle.disabled) return;
  angle.value = Math.min(60, Math.max(-60, Number(angle.value) + change));
  update();
}

function adjustPower(change) {
  if (kickSpeed.disabled) return;
  kickSpeed.value = Math.min(MAX_CLEARANCE_SPEED, Math.max(MIN_CLEARANCE_SPEED, kickSpeed.valueAsNumber + change));
  update();
}

function toggleLoft() {
  if (!loftControl.hidden) loft.click();
}

liveButton.addEventListener('click', toggleLive);
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement === game) await document.exitFullscreen();
    else await game.requestFullscreen();
  } catch {
    byId('message').textContent = 'Full screen is unavailable in this browser window.';
  }
});
document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement === game ? 'Exit full screen' : 'Enter full screen';
});
sound.addEventListener('click', async () => {
  sound.disabled = true;
  try {
    const enabled = await audio.toggle();
    sound.setAttribute('aria-pressed', enabled);
  } catch {
    update('Audio is unavailable. The drill controls remain active.');
  } finally {
    sound.disabled = false;
  }
});
byId('controls').addEventListener('keydown', (event) => {
  if (timer === null || event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input, select, textarea, [contenteditable]')) return;
  const key = event.key.toLowerCase();
  if (key === 'a' || key === 'd') {
    event.preventDefault();
    keys.add(key);
  }
  if (key === 'q' || key === 'e') {
    event.preventDefault();
    adjustAim(key === 'q' ? -1 : 1);
  }
  if (key === 'z' || key === 'x') {
    event.preventDefault();
    adjustPower(key === 'z' ? -1 : 1);
  }
  if (key === 'f' && !event.repeat) {
    event.preventDefault();
    clearButton.click();
  }
  if (key === 'v' && !event.repeat) {
    event.preventDefault();
    toggleLoft();
  }
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && timer !== null && !event.altKey && !event.ctrlKey && !event.metaKey) {
    toggleLive();
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && timer !== null) toggleLive();
});
window.addEventListener('blur', () => {
  if (timer !== null) toggleLive();
});

function byDistance() {
  const ball = incomingAt(state.feeds[state.index], state.tick * STEP);
  return sideways(ball.x) + ', ' + ball.z.toFixed(2) + ' m from goal.';
}

angle.addEventListener('input', () => update());
kickSpeed.addEventListener('input', () => update());
loft.addEventListener('change', () => update());
clearButton.addEventListener('click', () => {
  setLive(false);
  const successful = clear(state, Number(angle.value), Number(kickSpeed.value), loft.checked);
  const shot = state.trajectory;
  if (shot) {
    const contactTime = Math.max(0.035, shot.delay);
    audio.play('kick', shot.contact.x, contactTime);
    if (shot.interception) {
      const ball = shot.interception.ball;
      audio.play('touch', ball.x, contactTime + shot.travelTime, 0.7);
    }
  }
  if (successful) {
    const finished = state.index === state.feeds.length - 1;
    if (finished) save.complete(level);
    const result = level === LEVEL_COUNT ? 'Campaign complete. All 10,000 drills cleared.' : 'Drill cleared. Progress saved on this device.';
    update(finished ? result : 'Safe clearance. Prepare for the next ball.');
    (next.hidden ? byId('retry') : next).focus();
    return;
  }
  const outcome = {
    missed: 'Missed contact.',
    short: 'Clearance fell short of the receiver.',
    high: 'Clearance was too high for the receiver.',
    unsafe: 'Clearance missed the safe channel.',
    intercepted: 'The pressing player intercepted the clearance.'
  };
  update(outcome[state.result] + ' Restart the drill.');
  byId('retry').focus();
});
next.addEventListener('click', () => {
  if (nextFeed(state)) {
    lastFootstep = -Infinity;
    angle.value = 0;
    kickSpeed.value = CLEARANCE_SPEED;
    loft.checked = false;
    update('Ball ' + (state.index + 1) + ' of ' + state.feeds.length + '. Move into its path.');
    buttons[1].focus();
  } else if (state.result === 'cleared' && level < LEVEL_COUNT) {
    load(level + 1, true);
  }
});
byId('retry').addEventListener('click', () => load(level, true));
byId('load').addEventListener('click', () => {
  levelInput.max = save.unlocked;
  if (levelInput.reportValidity()) load(levelInput.valueAsNumber, true);
});

function fallback() {
  detachPitchControls?.();
  detachPitchControls = null;
  pitch?.dispose();
  pitch = null;
  canvas.hidden = true;
  quality.disabled = true;
  cameraView.disabled = true;
  graphics.textContent = '3D unavailable. Use the drill controls and position readings to play.';
}
canvas.addEventListener('stage-lost', fallback);
canvas.addEventListener('webglcontextrestored', () => {
  if (pitch || !canvas.hidden) return;
  graphics.textContent = 'Restoring pitch…';
  quality.value = 'auto';
  initializePitch().catch(fallback);
});
load(level);

async function initializePitch() {
  const context = canvas.getContext('webgl2', {
    antialias: true, alpha: false, powerPreference: 'high-performance',
  });
  if (!context) {
    fallback();
    return;
  }
  const { createPitch } = await import('./pitch.js');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  pitch = await createPitch({ canvas, context, qualitySelect: quality, status: graphics, view: () => cameraView.value, motion });
  canvas.hidden = false;
  quality.disabled = false;
  cameraView.disabled = false;
  update();
  const render = () => update();
  quality.addEventListener('change', render);
  motion.addEventListener('change', render);
  function changeCamera() {
    try { localStorage.setItem(cameraKey, cameraView.value); } catch { /* Keep the current view. */ }
    render();
  }
  cameraView.addEventListener('change', changeCamera);
  const resize = new ResizeObserver(render);
  resize.observe(canvas);
  detachPitchControls = () => {
    resize.disconnect();
    quality.removeEventListener('change', render);
    motion.removeEventListener('change', render);
    cameraView.removeEventListener('change', changeCamera);
  };
}

initializePitch().catch(fallback);
