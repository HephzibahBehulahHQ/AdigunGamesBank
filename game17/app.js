import { campaign, validCampaignSave, LEVEL_COUNT } from '../shared/progression.js';
import { CAMPAIGN_ID, SETTINGS, createShootout, currentKick, currentOpponent, shoot, facePenalty, stepShootout, nextKick, pauseShootout, resumeShootout } from './penalty-engine.js';

const $ = id => document.getElementById(id), canvas = $('penalty-canvas');
const progress = campaign(CAMPAIGN_ID), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const saveKey = `adigun.campaign.v1.${CAMPAIGN_ID}`;
let state = createShootout(progress.unlocked), scene = null, recorded = false;
let frameId = 0, previous = 0, lastEvent = -1, lastTelemetry = 0, dirty = true;
const controls = ['aim', 'elevation', 'power'];
const presets = [...document.querySelectorAll('[data-aim]')];
const dives = [...document.querySelectorAll('[data-dive]')];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const label = { goal: 'GOAL', saved: 'SAVED', post: 'FRAME', miss: 'MISS' };

function settings() { return Object.fromEntries(controls.map(name => [name, Number($(name).value)])); }
function diveSettings() { return { targetX: Number($('dive-position').value), high: $('dive-height').value === 'high', delay: Number($('dive-delay').value) }; }
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
function updateDive() {
  const current = diveSettings();
  $('dive-position-value').textContent = `${current.targetX > 0 ? '+' : ''}${current.targetX.toFixed(1)} m`;
  $('dive-delay-value').textContent = `${current.delay} ms`;
  $('dive-position').setAttribute('aria-valuetext', `${Math.abs(current.targetX).toFixed(1)} metres ${current.targetX < 0 ? 'left' : current.targetX > 0 ? 'right' : 'centre'}`);
  $('dive-delay').setAttribute('aria-valuetext', `${current.delay} milliseconds after the kick`);
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
  if (!state.log.length) { const empty = document.createElement('li'); empty.textContent = 'Ten attempts. Your first kick is waiting.'; list.append(empty); }
  for (const result of state.log) {
    const item = document.createElement('li'), heading = document.createElement('strong');
    heading.textContent = `${result.role === 'shoot' ? 'Your shot' : 'Your save'} ${(result.kick - 1) % 5 + 1} · ${label[result.outcome]}`;
    item.append(heading, document.createTextNode(` — ${result.detail}. ${Math.abs(result.position.x).toFixed(2)} m ${result.position.x < 0 ? 'left' : 'right'}, ${result.position.y.toFixed(2)} m high.`));
    list.append(item);
  }
  const dots = $('shot-list'); dots.replaceChildren();
  for (let i = 0; i < 10; i++) {
    const result = state.log[i], dot = document.createElement('li');
    const success = result && (result.role === 'shoot' ? result.outcome === 'goal' : result.outcome !== 'goal');
    dot.className = result ? success ? 'goal' : 'miss' : i === state.kickIndex ? 'current' : '';
    dot.textContent = result ? `${i + 1} ${success ? '✓' : '×'}` : String(i + 1);
    dot.setAttribute('aria-label', `Penalty ${i + 1}: ${result ? label[result.outcome].toLowerCase() : i === state.kickIndex ? 'current kick' : 'not taken'}`);
    dots.append(dot);
  }
}
function sync() {
  const ready = state.phase === 'ready', keeping = state.role === 'keeper', kick = displayedKick(), finished = ['won', 'lost', 'draw'].includes(state.phase);
  if (state.phase === 'won' && !recorded) { progress.complete(state.config.level); recorded = true; }
  $('phase').dataset.phase = state.phase;
  $('phase').dataset.role = state.role;
  $('phase').textContent = ({ ready: keeping ? 'READY TO SAVE' : 'READY TO SHOOT', flight: 'BALL IN FLIGHT', paused: 'FLIGHT PAUSED', result: 'KICK RECORDED', won: 'SHOOTOUT WON', lost: 'TRY AGAIN', draw: 'DRAW · RETRY' })[state.phase];
  $('goals').textContent = `${state.goals} / 5`; $('target').textContent = `Target: ${state.config.target} goals`;
  $('opponent-goals').textContent = `${state.opponentGoals} / 5`; $('saves').textContent = `Your saves: ${state.saves}`;
  $('kick-number').textContent = `${ready || state.phase === 'flight' || state.phase === 'paused' ? Math.min(10, state.kickIndex + 1) : state.kickIndex} / 10`;
  $('kick-status').textContent = ready ? keeping ? 'Your goalkeeper turn' : 'Your shooting turn' : finished ? 'All kicks taken' : state.phase === 'result' ? 'Select next kick' : state.phase === 'paused' ? 'Paused' : 'Watch the ball';
  $('tier').textContent = state.config.tier; $('level-status').textContent = `Challenge ${state.config.level.toLocaleString()}`;
  const opponent = state.config.opponents[Math.min(4, keeping && !ready && state.phase !== 'flight' && state.phase !== 'paused' ? state.kickIndex - 6 : state.kickIndex % 5)];
  $('scout-label').textContent = keeping ? 'STRIKER SCOUTING' : 'KEEPER SCOUTING';
  $('keeper-tell').textContent = keeping ? `Striker shapes ${opponent.side < 0 ? 'left' : 'right'}` : `Keeper loads ${kick.keeper.side < 0 ? 'left' : 'right'}`;
  $('keeper-detail').textContent = keeping ? `${opponent.high ? 'Chest-high' : 'Low'} finish. Cover the called side; fine-tune your dive position and timing.` : `${kick.keeper.high ? 'Rising' : 'Low'} committed dive. Aim into the other side, then account for wind.`;
  $('aim-heading').textContent = keeping ? 'Take the gloves' : 'Build your penalty';
  $('shooting-settings').hidden = keeping; $('keeping-settings').hidden = !keeping;
  $('role-note').textContent = keeping ? 'Your chosen dive moves the original goalkeeper. A save requires physical contact with the incoming ball. Left and right stay in the pitch camera’s view.' : 'The keeper commits to the advertised side. Crosswind, available power and ball flight change your placement. A post or save ends that attempt.';
  $('wind-readout').textContent = `Crosswind: ${kick.wind > 0 ? '+' : ''}${kick.wind.toFixed(2)} m/s²${kick.wind ? ` · pushes ${kick.wind < 0 ? 'left' : 'right'}` : ' · calm'}`;
  $('power-limit').textContent = `Kick limit: ${kick.powerMax}%`;
  for (const name of controls) $(name).disabled = !ready || keeping;
  presets.forEach(button => { button.disabled = !ready || keeping; });
  for (const name of ['dive-position', 'dive-height', 'dive-delay']) $(name).disabled = !ready || !keeping;
  dives.forEach(button => { button.disabled = !ready || !keeping; });
  $('shoot').disabled = !ready;
  $('shoot').textContent = keeping ? 'Face penalty' : 'Shoot penalty';
  $('pause').disabled = !['flight', 'paused'].includes(state.phase);
  $('pause').textContent = state.phase === 'paused' ? 'Resume flight' : 'Pause flight';
  $('next-kick').hidden = state.phase !== 'result';
  $('next-kick').textContent = state.kickIndex === 5 ? 'Take the goalkeeper gloves' : 'Next kick';
  $('next-level').hidden = !(state.phase === 'won' && state.config.level < progress.unlocked);
  $('level').max = String(progress.unlocked);
  $('level').disabled = ['flight', 'paused'].includes(state.phase);
  $('load-level').disabled = $('level').disabled;
  $('unlock-status').textContent = progress.mastered ? 'All 10,000 challenges cleared' : `Challenge ${progress.unlocked.toLocaleString()} of 10,000 unlocked`;
  $('save-status').textContent = saveText();
  if (lastEvent !== state.event) {
    if (ready) showMessage(keeping ? `Goalkeeper turn ${state.kickIndex - 4} of 5. Read the striker, set your dive, then face the penalty. Lead: ${state.goals}–${state.opponentGoals}.` : `Shot ${state.kickIndex + 1} of 5: score at least ${state.config.target} goals, then protect your lead as goalkeeper.`);
    else if (state.phase === 'flight') showMessage(keeping ? 'Opposition penalty in flight. Your dive position, height and delay determine whether you reach the ball.' : 'Ball in flight. Your chosen aim, power and the crosswind determine the result.');
    else if (state.phase === 'paused') showMessage('Flight paused. Resume to continue this exact shot.');
    else if (state.phase === 'won') showMessage(`Shootout won ${state.goals}–${state.opponentGoals}. Goal target ${state.config.target} reached; ${state.saves} saves made. ${progress.mastered ? 'Campaign complete.' : 'The next challenge is unlocked.'}`, 'success');
    else if (state.phase === 'draw') showMessage(`Shootout drawn ${state.goals}–${state.opponentGoals}. No challenge awarded. Retry and turn one more attempt in your favour.`, 'error');
    else if (state.phase === 'lost') showMessage(`${state.winner === 'player' ? 'Goal target not reached' : 'Shootout lost'}: ${state.goals}–${state.opponentGoals}. You need more goals than the opposition and at least ${state.config.target} goals. Retry this challenge.`, 'error');
    else if (state.phase === 'result') showMessage(`${label[state.result.outcome]} — ${state.result.detail}. Score ${state.goals}–${state.opponentGoals}.${state.kickIndex === 5 ? ' Now take the gloves for five goalkeeper turns.' : ` ${10 - state.kickIndex} kicks remain.`}`, (keeping ? state.result.outcome !== 'goal' : state.result.outcome === 'goal') ? 'success' : 'error');
    lastEvent = state.event;
  }
  renderHistory(); telemetry(); dirty = true;
}
function reset(level = state.config.level) {
  state = createShootout(level); recorded = false; lastEvent = -1; previous = 0;
  $('level').value = String(state.config.level);
  $('aim').value = '0'; $('elevation').value = '9'; $('power').value = '75';
  $('dive-position').value = '0'; $('dive-height').value = 'high'; $('dive-delay').value = '80';
  prepareSettings(); updateDive(); sync();
}
function takePenalty() {
  try { if (state.role === 'keeper' ? facePenalty(state, diveSettings()) : shoot(state, settings())) sync(); }
  catch (error) { showMessage(error.message, 'error'); }
}
function prepareNextKick() {
  if (nextKick(state)) { prepareSettings(); sync(); $('shoot').focus({ preventScroll: true }); }
}
function togglePause() { if (state.phase === 'paused') resumeShootout(state); else pauseShootout(state); previous = 0; sync(); }

controls.forEach(name => $(name).addEventListener('input', updateSettings));
for (const name of ['dive-position', 'dive-height', 'dive-delay']) $(name).addEventListener('input', updateDive);
dives.forEach(button => button.addEventListener('click', () => { $('dive-position').value = button.dataset.dive; updateDive(); }));
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
  if (aimKeys[key] && state.phase === 'ready' && state.role === 'keeper') {
    event.preventDefault();
    if (key === 'arrowleft' || key === 'arrowright') $('dive-position').value = String(clamp(Number($('dive-position').value) + (key === 'arrowleft' ? -0.1 : 0.1), -3.4, 3.4));
    if (key === 'arrowup' || key === 'arrowdown') $('dive-height').value = key === 'arrowup' ? 'high' : 'low';
    if (key === 'w' || key === 's') $('dive-delay').value = String(clamp(Number($('dive-delay').value) + (key === 'w' ? -10 : 10), 50, 300));
    updateDive();
  } else if (aimKeys[key] && state.phase === 'ready') {
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
  if (scene && (dirty || changed)) { scene.update(state, settings(), diveSettings(), reducedMotion.matches); scene.render(); }
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
