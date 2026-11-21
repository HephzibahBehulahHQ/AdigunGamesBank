import { campaign, LEVEL_COUNT, tierFor } from '../shared/progression.js';
import { STEP, SAFETY_LINE, advance, clear, clearanceAt, createDrill, incomingAt, nextFeed, readContact } from './clearance.js';

const byId = (id) => document.getElementById(id);
const save = campaign('goal-line');
const levelInput = byId('level');
const angle = byId('angle');
const buttons = [...document.querySelectorAll('[data-move]')];
const next = byId('next');
const clearButton = byId('clear');
const canvas = byId('pitch');
const quality = byId('quality');
const graphics = byId('graphics');
const liveButton = byId('live');
const movementHelp = byId('movement-help');
const keys = new Set();
let level = save.unlocked;
let state;
let pitch;
let timer = null;
let direction = 0;

function setLive(enabled) {
  if (timer !== null) clearInterval(timer);
  timer = enabled ? setInterval(() => {
    const movement = keys.size ? Number(keys.has('d')) - Number(keys.has('a')) : direction;
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
  const { ball, contact, reachable } = readContact(feed, state.tick, state.defender);
  const aiming = Number(angle.value);
  const ready = state.result === 'ready';
  const finished = state.result === 'cleared' && state.index === state.feeds.length - 1;
  const safeEdge = feed.halfWidth;
  const projection = clearanceAt(contact, aiming, feed.drift, SAFETY_LINE);
  byId('campaign').textContent = 'Drill ' + level + ' of 10,000 · ' + tierFor(level) + ' · ' + save.completed + ' cleared';
  byId('ball').textContent = sideways(ball.x) + ', ' + Math.abs(ball.z).toFixed(2) + ' m ' + (ball.z < 0 ? 'behind' : 'from') + ' goal line';
  byId('defender').textContent = sideways(state.defender);
  byId('gate').textContent = sideways(feed.channel - safeEdge) + ' to ' + sideways(feed.channel + safeEdge);
  byId('projection').textContent = ball.z <= 2.3 ? sideways(projection.x) : 'Available inside contact zone';
  byId('angle-value').textContent = aiming + '°';
  byId('contact').textContent = reachable && ready
    ? 'Ball in reach.' : 'Close the gap before clearing.';
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
  angle.disabled = clearButton.disabled = !ready;
  next.hidden = state.result !== 'cleared' || (finished && level === LEVEL_COUNT);
  next.textContent = finished ? 'Next drill' : 'Next ball';
  pitch?.draw(state, feed, ball, aiming, contact);
}

function load(levelNumber, moveFocus = false) {
  setLive(false);
  level = levelNumber;
  levelInput.value = levelNumber;
  state = createDrill(levelNumber);
  angle.value = 0;
  update('Ball 1 of ' + state.feeds.length + '. Move into its path.');
  if (moveFocus) buttons[1].focus();
}

function move(direction) {
  advance(state, direction);
  if (state.result === 'conceded') {
    setLive(false);
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

liveButton.addEventListener('click', toggleLive);
window.addEventListener('keydown', (event) => {
  if (timer === null || event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input, select, textarea, [contenteditable]')) return;
  const key = event.key.toLowerCase();
  if (key === 'a' || key === 'd') {
    event.preventDefault();
    keys.add(key);
  }
  if (key === 'escape') toggleLive();
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
clearButton.addEventListener('click', () => {
  setLive(false);
  if (clear(state, Number(angle.value))) {
    const finished = state.index === state.feeds.length - 1;
    if (finished) save.complete(level);
    update(finished ? 'Drill cleared. Progress saved on this device.' : 'Safe clearance. Prepare for the next ball.');
    (next.hidden ? byId('retry') : next).focus();
    return;
  }
  update(state.result === 'missed' ? 'Missed contact. Restart the drill.' : 'Clearance missed the safe channel. Restart the drill.');
  byId('retry').focus();
});
next.addEventListener('click', () => {
  if (nextFeed(state)) {
    angle.value = 0;
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
  canvas.hidden = true;
  quality.disabled = true;
  graphics.textContent = '3D unavailable. Use the drill controls and position readings to play.';
}
canvas.addEventListener('stage-lost', fallback);
load(level);

import('./pitch.js').then(async ({ createPitch }) => {
  pitch = await createPitch({ canvas, qualitySelect: quality, status: graphics });
  update();
  const render = () => update();
  quality.addEventListener('change', render);
  new ResizeObserver(render).observe(canvas);
}).catch(fallback);
