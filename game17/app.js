import { campaign, validCampaignSave, LEVEL_COUNT } from '../shared/progression.js';
import { CAMPAIGN_ID, SETTINGS, createShootout, currentKick, shoot, stepShootout, nextKick, pauseShootout, resumeShootout } from './penalty-engine.js';

const $ = id => document.getElementById(id), canvas = $('penalty-canvas');
const progress = campaign(CAMPAIGN_ID), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const saveKey = `adigun.campaign.v1.${CAMPAIGN_ID}`;
let state = createShootout(progress.unlocked), scene = null, recorded = false;
let frameId = 0, previous = 0, lastEvent = -1, lastTelemetry = 0, dirty = true;
const controls = ['aim', 'elevation', 'power'];
const presets = [...document.querySelectorAll('[data-aim]')];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const label = { goal: 'GOAL', saved: 'SAVED', post: 'FRAME', miss: 'MISS' };

function settings() { return Object.fromEntries(controls.map(name => [name, Number($(name).value)])); }
function displayedKick() { return state.flight?.kick || currentKick(state); }
function showMessage(value, kind = '') { $('message').textContent = value; $('message').className = `message ${kind}`; }
function storedProgress() {
  try { const value = JSON.parse(localStorage.getItem(saveKey) || 'null'); return validCampaignSave(value) && value.completed >= progress.completed; }
  catch { return false; }
}
function saveText() {
  if (!progress.completed) return 'A successful challenge saves on this device.';
  return `${progress.completed.toLocaleString()} challenges completed. ` + (storedProgress() ? 'Progress saved on this device.' : 'Progress is available for this session only; browser storage could not confirm a save.');
}
function updateSettings() {
  const current = settings();
  $('aim-value').textContent = `${current.aim > 0 ? '+' : ''}${current.aim.toFixed(1)}°`;
  $('elevation-value').textContent = `${current.elevation.toFixed(1)}°`;
  $('power-value').textContent = `${current.power}%`;
  $('speed-readout').textContent = `${(8 + current.power * 0.24).toFixed(1)} m/s`;
  $('aim').setAttribute('aria-valuetext', `${Math.abs(current.aim).toFixed(1)} degrees ${current.aim < 0 ? 'left' : current.aim > 0 ? 'right' : 'centre'}`);
  $('elevation').setAttribute('aria-valuetext', `${current.elevation.toFixed(1)} degrees above the grass`);
  $('power').setAttribute('aria-valuetext', `${current.power} percent, ${(8 + current.power * 0.24).toFixed(1)} metres per second`);
  dirty = true;
}
function prepareSettings() {
  const maximum = currentKick(state).powerMax;
  $('power').max = String(maximum);
  $('power').value = String(Math.min(Number($('power').value), maximum));
  updateSettings();
}
function telemetry() {
  $('distance').textContent = `${Math.max(0, state.ball.z).toFixed(2)} m`;
  $('height').textContent = `${state.ball.y.toFixed(2)} m`;
  $('flight-time').textContent = `${state.elapsed.toFixed(2)} s`;
}
function renderHistory() {
  const list = $('history'); list.replaceChildren();
  if (!state.log.length) { const empty = document.createElement('li'); empty.textContent = 'Five attempts. Your first kick is waiting.'; list.append(empty); }
  for (const result of state.log) {
    const item = document.createElement('li'), heading = document.createElement('strong');
    heading.textContent = `Kick ${result.kick} · ${label[result.outcome]}`;
    item.append(heading, document.createTextNode(` — ${result.detail}. ${Math.abs(result.position.x).toFixed(2)} m ${result.position.x < 0 ? 'left' : 'right'}, ${result.position.y.toFixed(2)} m high.`));
    list.append(item);
  }
  const dots = $('shot-list'); dots.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const result = state.log[i], dot = document.createElement('li');
    dot.className = result ? result.outcome : i === state.kickIndex ? 'current' : '';
    dot.textContent = result ? `${i + 1} ${result.outcome === 'goal' ? '✓' : '×'}` : String(i + 1);
    dot.setAttribute('aria-label', `Penalty ${i + 1}: ${result ? label[result.outcome].toLowerCase() : i === state.kickIndex ? 'current kick' : 'not taken'}`);
    dots.append(dot);
  }
}
function sync() {
  const ready = state.phase === 'ready', kick = displayedKick(), finished = ['won', 'lost'].includes(state.phase);
  if (state.phase === 'won' && !recorded) { progress.complete(state.config.level); recorded = true; }
  $('phase').dataset.phase = state.phase;
  $('phase').textContent = ({ ready: 'READY TO SHOOT', flight: 'BALL IN FLIGHT', paused: 'FLIGHT PAUSED', result: 'KICK RECORDED', won: 'SHOOTOUT WON', lost: 'TRY AGAIN' })[state.phase];
  $('goals').textContent = `${state.goals} / 5`; $('target').textContent = `Target: ${state.config.target} goals`;
  $('kick-number').textContent = `${ready || state.phase === 'flight' || state.phase === 'paused' ? Math.min(5, state.kickIndex + 1) : state.kickIndex} / 5`;
  $('kick-status').textContent = ready ? 'Ready to aim' : finished ? 'All kicks taken' : state.phase === 'result' ? 'Select next kick' : state.phase === 'paused' ? 'Paused' : 'Watch the ball';
  $('tier').textContent = state.config.tier; $('level-status').textContent = `Challenge ${state.config.level.toLocaleString()}`;
  $('keeper-tell').textContent = `Keeper loads ${kick.keeper.side < 0 ? 'left' : 'right'}`;
  $('keeper-detail').textContent = `${kick.keeper.high ? 'Rising' : 'Low'} committed dive. Aim into the other side, then account for wind.`;
  $('wind-readout').textContent = `Crosswind: ${kick.wind > 0 ? '+' : ''}${kick.wind.toFixed(2)} m/s²${kick.wind ? ` · pushes ${kick.wind < 0 ? 'left' : 'right'}` : ' · calm'}`;
  $('power-limit').textContent = `Kick limit: ${kick.powerMax}%`;
  for (const name of controls) $(name).disabled = !ready;
  presets.forEach(button => { button.disabled = !ready; });
  $('shoot').disabled = !ready;
  $('pause').disabled = !['flight', 'paused'].includes(state.phase);
  $('pause').textContent = state.phase === 'paused' ? 'Resume flight' : 'Pause flight';
  $('next-kick').hidden = state.phase !== 'result';
  $('next-level').hidden = !(state.phase === 'won' && state.config.level < progress.unlocked);
  $('level').max = String(progress.unlocked);
  $('level').disabled = ['flight', 'paused'].includes(state.phase);
  $('load-level').disabled = $('level').disabled;
  $('unlock-status').textContent = progress.mastered ? 'All 10,000 challenges cleared' : `Challenge ${progress.unlocked.toLocaleString()} of 10,000 unlocked`;
  $('save-status').textContent = saveText();
  if (lastEvent !== state.event) {
    if (ready) showMessage(`Kick ${state.kickIndex + 1}: score ${state.config.target} goals across all five attempts. Choose your placement, then shoot.`);
    else if (state.phase === 'flight') showMessage('Ball in flight. Your chosen aim, power and the crosswind determine the result.');
    else if (state.phase === 'paused') showMessage('Flight paused. Resume to continue this exact shot.');
    else if (state.phase === 'won') showMessage(`Shootout won: ${state.goals} of 5 goals. Target ${state.config.target} reached. ${progress.mastered ? 'Campaign complete.' : 'The next challenge is unlocked.'}`, 'success');
    else if (state.phase === 'lost') showMessage(`Shootout lost: ${state.goals} of 5 goals. Target ${state.config.target} needed. Retry this challenge and adjust your placement.`, 'error');
    else if (state.phase === 'result') showMessage(`${label[state.result.outcome]} — ${state.result.detail}. ${state.goals} goals recorded; ${5 - state.kickIndex} kicks remain.`, state.result.outcome === 'goal' ? 'success' : 'error');
    lastEvent = state.event;
  }
  renderHistory(); telemetry(); dirty = true;
}
function reset(level = state.config.level) {
  state = createShootout(level); recorded = false; lastEvent = -1; previous = 0;
  $('level').value = String(state.config.level);
  $('aim').value = '0'; $('elevation').value = '9'; $('power').value = '75';
  prepareSettings(); sync();
}
function takePenalty() {
  try { if (shoot(state, settings())) sync(); }
  catch (error) { showMessage(error.message, 'error'); }
}
function prepareNextKick() {
  if (nextKick(state)) { prepareSettings(); sync(); $('shoot').focus({ preventScroll: true }); }
}
function togglePause() { if (state.phase === 'paused') resumeShootout(state); else pauseShootout(state); previous = 0; sync(); }

controls.forEach(name => $(name).addEventListener('input', updateSettings));
presets.forEach(button => button.addEventListener('click', () => {
  $('aim').value = button.dataset.aim; $('elevation').value = button.dataset.elevation; updateSettings();
}));
$('shoot').addEventListener('click', takePenalty);
$('pause').addEventListener('click', togglePause);
$('next-kick').addEventListener('click', prepareNextKick);
$('restart').addEventListener('click', () => reset());
$('next-level').addEventListener('click', () => {
  if (state.phase === 'won' && state.config.level < progress.unlocked) { reset(state.config.level + 1); $('shoot').focus({ preventScroll: true }); }
});
$('load-level').addEventListener('click', () => {
  const level = Number($('level').value);
  if (!Number.isInteger(level) || level < 1 || level > progress.unlocked || level > LEVEL_COUNT) { showMessage(`Choose an unlocked challenge from 1 to ${progress.unlocked.toLocaleString()}.`, 'error'); return; }
  reset(level);
});
canvas.addEventListener('keydown', event => {
  if (event.repeat && [' ', 'Escape', 'r', 'R', 'n', 'N'].includes(event.key)) return;
  const key = event.key.toLowerCase(), aimKeys = { arrowleft: ['aim', -0.5], arrowright: ['aim', 0.5], arrowup: ['elevation', 0.5], arrowdown: ['elevation', -0.5], w: ['power', 1], s: ['power', -1] };
  if (aimKeys[key] && state.phase === 'ready') {
    event.preventDefault(); const [name, delta] = aimKeys[key], [low, maximum] = SETTINGS[name];
    $(name).value = String(clamp(Number($(name).value) + delta, low, name === 'power' ? currentKick(state).powerMax : maximum)); updateSettings();
  } else if (key === ' ') { event.preventDefault(); takePenalty(); }
  else if (key === 'escape') { event.preventDefault(); togglePause(); }
  else if (key === 'n') { event.preventDefault(); prepareNextKick(); }
  else if (key === 'r') { event.preventDefault(); reset(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && pauseShootout(state)) { previous = 0; sync(); } });
window.addEventListener('storage', event => { if (event.key === saveKey) sync(); });
$('quality').addEventListener('change', () => { dirty = true; });
canvas.addEventListener('stage-lost', () => {
  scene?.dispose(); scene = null; $('graphics-fallback').hidden = false;
  $('graphics-status').textContent = 'Graphics connection lost. Command controls continue the same shootout.';
  $('quality').disabled = true; canvas.removeAttribute('data-renderer'); canvas.removeAttribute('data-resolution');
});

function frame(time) {
  const dt = previous ? Math.min(0.12, (time - previous) / 1000) : 0; previous = time;
  const changed = stepShootout(state, dt * Number($('playback').value));
  if (state.event !== lastEvent) sync();
  else if (changed && time - lastTelemetry > 90) { telemetry(); lastTelemetry = time; }
  if (scene && (dirty || changed)) { scene.update(state, settings(), reducedMotion.matches); scene.render(); }
  dirty = false; frameId = requestAnimationFrame(frame);
}
reset();
frameId = requestAnimationFrame(frame);
try {
  const { createPenaltyScene } = await import('./scene.js');
  scene = createPenaltyScene({ canvas, qualitySelect: $('quality'), status: $('graphics-status') });
  dirty = true;
} catch {
  $('graphics-fallback').hidden = false; $('quality').disabled = true;
  $('graphics-status').textContent = 'WebGL 2 unavailable. Command controls use the same shot physics and campaign.';
  canvas.removeAttribute('data-renderer'); canvas.removeAttribute('data-resolution');
}
window.addEventListener('pagehide', () => { cancelAnimationFrame(frameId); scene?.dispose(); });
