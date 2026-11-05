import { campaign, validCampaignSave, LEVEL_COUNT } from '../shared/progression.js';
import { CAMPAIGN_ID, ZONES, POWER_MIN, createShootout, currentKick, setAim, setPower, feint, shoot, advanceRead, stepShootout, nextKick, pauseShootout, resumeShootout, readKeeper } from './goal-line-engine.js';

const $ = id => document.getElementById(id);
const canvas = $('pitch'), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// The original arcade counter did not measure this physical five-kick challenge.
const saveKey = `adigun.campaign.v1.${CAMPAIGN_ID}`, progress = campaign(CAMPAIGN_ID);
const zoneButtons = [...document.querySelectorAll('[data-zone]')];
const powerButtons = [...document.querySelectorAll('[data-power]')];
const outcomeNames = { goal: 'Goal', saved: 'Saved', post: 'Frame', miss: 'Miss' };
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
let state = createShootout(progress.unlocked), scene = null, recorded = false;
let previous = 0, frameId = 0, lastTelemetry = 0, lastPhase = '', lastLogLength = -1, dirty = true, disposed = false;
const viewObserver = new ResizeObserver(() => { dirty = true; });
viewObserver.observe(canvas);

function announce(message) { $('status').textContent = message; }
function saveConfirmed() {
  try { const saved = JSON.parse(localStorage.getItem(saveKey) || 'null'); return validCampaignSave(saved) && saved.completed >= progress.completed; }
  catch { return false; }
}
function updateProgress() {
  $('progress-readout').textContent = progress.mastered ? 'Professional Master — all 10,000 levels completed.' : `${progress.completed.toLocaleString()} of 10,000 levels completed.`;
  $('level-select').max = String(progress.unlocked);
  $('level-limit').textContent = `Unlocked: ${progress.unlocked === 1 ? 'level 1' : `levels 1–${progress.unlocked.toLocaleString()}`}`;
  $('save-readout').textContent = !progress.completed ? 'Progress saves on this device after a successful five-kick round.' : saveConfirmed() ? 'Progress saved on this device. You can return to any unlocked level.' : 'Progress is available for this session only; browser storage could not confirm a save.';
}
function keeperPosition() {
  return Math.abs(state.keeper.x) < 0.005 ? 'at goal centre' : `${Math.abs(state.keeper.x).toFixed(2)} m ${state.keeper.x < 0 ? 'left' : 'right'} of centre`;
}
function telemetry() {
  const tell = readKeeper(state), activePhase = state.phase === 'paused' ? state.resumePhase : state.phase;
  const isReading = activePhase === 'ready', inFlight = activePhase === 'flight';
  const stageLabel = isReading ? ({ patrolling: 'Patrolling', baiting: 'Reading your feint', committed: 'Committed', recovering: 'Recovering' })[tell.stage] : inFlight ? 'Following the shot' : 'Kick recorded';
  $('keeper-stage').textContent = state.phase === 'paused' ? 'Paused' : stageLabel;
  $('keeper-stage').dataset.stage = tell.stage;
  $('keeper-readout').textContent = `Keeper ${keeperPosition()} (x ${state.keeper.x >= 0 ? '+' : ''}${state.keeper.x.toFixed(2)} m). ${isReading ? `Moving ${tell.direction}. Read time ${state.readTime.toFixed(2)} s.` : `Shot time ${state.elapsed.toFixed(2)} s.`}`;
  $('keeper-marker').style.left = `${clamp((state.keeper.x / 7.32 + 0.5) * 100, 3, 97)}%`;
  $('pitch-clock').textContent = `${isReading ? 'READ' : 'FLIGHT'} ${isReading ? state.readTime.toFixed(2) : state.elapsed.toFixed(2)} s${state.phase === 'paused' ? ' · PAUSED' : ''}`;
  $('flight-readout').textContent = `Ball: ${Math.max(0, state.ball.z).toFixed(2)} m from the goal line · ${Math.max(0, state.ball.y).toFixed(2)} m high.`;
  $('keeper-advice').textContent = !isReading ? 'The ball and keeper positions come from the same physical shot simulation.' : tell.stage === 'committed' ? `Commitment window: ${tell.remaining.toFixed(2)} s left. The keeper has chosen a side; your target can still change.` : tell.stage === 'baiting' ? `Your run-up feint is drawing a response. Commitment begins in ${tell.opensIn.toFixed(2)} s.` : tell.stage === 'recovering' ? 'The commitment window has closed. The keeper can track your strike again.' : state.feintUsed ? 'The keeper is patrolling again. Your feint has already been used for this kick.' : 'A run-up feint can pull the keeper toward your selected zone. Change your target when the keeper commits.';
  $('feint-readout').textContent = tell.stage === 'committed' && isReading ? `Keeper committed — ${tell.remaining.toFixed(2)} s available. Choose the opening, then strike.` : state.feintUsed ? 'Run-up feint used for this kick. Watch the keeper’s stage and position.' : 'One run-up feint per kick. Bait a side, wait for the commitment, then redirect your shot.';
}
function renderHistory() {
  if (lastLogLength === state.log.length) return;
  const history = $('history'); history.replaceChildren();
  if (!state.log.length) {
    const empty = document.createElement('li'); empty.className = 'empty-history'; empty.textContent = 'Your first attempt starts here.'; history.append(empty);
  }
  for (const entry of state.log) {
    const item = document.createElement('li'), number = document.createElement('span'), description = document.createElement('div'), detail = document.createElement('span'), outcome = document.createElement('strong');
    number.className = 'shot-num'; number.textContent = String(entry.kick);
    description.append(document.createTextNode(`${ZONES.find(zone => zone.id === entry.zoneId)?.label || 'Shot'} · ${entry.power}%`));
    detail.className = 'shot-detail'; detail.textContent = `${entry.detail}. ${entry.usedCommitment ? 'Keeper committed' : 'Keeper tracked the strike'} · ${entry.time.toFixed(2)} s.`;
    description.append(detail); outcome.className = 'shot-outcome'; outcome.dataset.outcome = entry.outcome; outcome.textContent = outcomeNames[entry.outcome];
    item.append(number, description, outcome); history.append(item);
  }
  lastLogLength = state.log.length;
}
function phaseMessage() {
  if (state.phase === 'paused') return 'Play paused. Resume to continue from this exact keeper and ball position.';
  if (state.phase === 'flight') return $('live-time').checked ? 'Ball in flight. Watch its path toward the goal.' : 'Ball in flight. Use Advance time to follow the shot in 0.10-second steps.';
  if (state.phase === 'result') return `${outcomeNames[state.result.outcome]} — ${state.result.detail}. ${state.goals} goals from ${state.kickIndex} kicks. Set up your next kick.`;
  if (state.phase === 'won') return `Level ${state.config.level.toLocaleString()} cleared: ${state.goals} of 5 goals; target ${state.config.target} reached. ${progress.mastered ? 'Professional Master: all 10,000 levels completed.' : `Level ${Math.min(LEVEL_COUNT, state.config.level + 1).toLocaleString()} is unlocked.`}`;
  if (state.phase === 'lost') return `Round complete: ${state.goals} of 5 goals. The target was ${state.config.target}. Restart this level to try again.`;
  return `Kick ${state.kickIndex + 1} of 5. Choose a target, read the keeper, then strike. Round target: ${state.config.target} goals.`;
}
function sync(message) {
  const focusedControl = document.activeElement;
  if (state.phase === 'won' && !recorded) { progress.complete(state.config.level); recorded = true; }
  const ready = state.phase === 'ready', finished = state.phase === 'won' || state.phase === 'lost';
  const kick = state.flight?.kick || currentKick(state), zone = ZONES.find(item => item.id === state.zoneId);
  $('game').dataset.phase = state.phase;
  $('level-readout').textContent = state.config.level.toLocaleString(); $('tier-readout').textContent = state.config.tier;
  $('goals-readout').textContent = `${state.goals} / 5`; $('target-readout').textContent = `Target: ${state.config.target} goals`;
  $('kick-readout').textContent = `${state.phase === 'result' || finished ? state.kickIndex : Math.min(5, state.kickIndex + 1)} / 5`;
  $('kicks-left').textContent = finished ? 'All five completed' : `${5 - state.kickIndex} ${state.kickIndex === 4 ? 'kick' : 'kicks'} remaining`;
  $('aim-readout').textContent = zone ? `Target: ${zone.label.toLowerCase()} · ${Math.abs(zone.x).toFixed(1)} m ${zone.x < 0 ? 'left' : zone.x > 0 ? 'right' : 'from centre'} · ${zone.y.toFixed(2)} m high at 85% power` : 'Select your target zone.';
  for (const button of zoneButtons) { button.disabled = !ready; button.setAttribute('aria-pressed', String(button.dataset.zone === state.zoneId)); }
  $('power').min = String(POWER_MIN); $('power').max = String(kick.powerMax); $('power').value = String(state.power); $('power').disabled = !ready;
  $('power').setAttribute('aria-valuetext', `${state.power} percent; maximum ${kick.powerMax} percent for this kick`);
  $('power-readout').textContent = `${state.power}% / ${kick.powerMax}% max`;
  powerButtons.forEach(button => { button.disabled = !ready || Number(button.dataset.power) > kick.powerMax; button.setAttribute('aria-pressed', String(Number(button.dataset.power) === state.power)); });
  $('wind-readout').textContent = kick.wind ? `Wind ${Math.abs(kick.wind).toFixed(2)} m/s² ${kick.wind < 0 ? 'left' : 'right'}` : 'Calm conditions';
  $('feint').disabled = !ready || !zone || state.feintUsed; $('shoot').disabled = !ready || !zone;
  $('advance-time').disabled = !['ready', 'flight'].includes(state.phase);
  $('live-time').disabled = state.phase === 'paused' || finished || state.phase === 'result';
  $('pause').disabled = !['ready', 'flight', 'paused'].includes(state.phase); $('pause').textContent = state.phase === 'paused' ? 'Resume play' : 'Pause play';
  $('pause-overlay').hidden = state.phase !== 'paused';
  $('next-kick').hidden = state.phase !== 'result';
  $('next-level').hidden = !(state.phase === 'won' && state.config.level < progress.unlocked);
  const titles = { ready: 'Make room for a goal.', flight: 'Your shot is travelling.', paused: 'Hold the moment.', result: `${outcomeNames[state.result?.outcome] || 'Kick'}${state.result?.outcome === 'goal' ? '!' : '.'}`, won: state.config.level === LEVEL_COUNT ? 'Professional Master.' : 'Level cleared.', lost: 'Read. Adjust. Go again.' };
  $('result-title').textContent = titles[state.phase];
  $('result-eyebrow').textContent = ({ ready: 'READY WHEN YOU ARE', flight: 'BALL IN FLIGHT', paused: 'PLAY PAUSED', result: `KICK ${state.kickIndex} RECORDED`, won: progress.mastered ? '10,000 LEVELS COMPLETED' : 'TARGET REACHED', lost: 'FIVE KICKS COMPLETED' })[state.phase];
  $('result-copy').textContent = state.phase === 'won' ? (progress.mastered ? 'You completed every level. Replay any unlocked challenge to keep your touch sharp.' : `${state.goals} goals from five strikes. Your next training level is ready.`) : state.phase === 'lost' ? `${state.goals} goals from five strikes. You need ${state.config.target} to clear this level. Your unlocked progress is safe.` : state.phase === 'result' ? `${state.result.detail}. ${5 - state.kickIndex} kicks remain in this round.` : state.phase === 'paused' ? 'Simulation time is stopped. Resume when you are ready.' : state.phase === 'flight' ? ($('live-time').checked ? 'The selected launch angles, power, wind and keeper contact decide this shot.' : 'Study the ball and keeper together. Each press of Advance time moves the shot by 0.10 seconds.') : `Score at least ${state.config.target} goals from five kicks to unlock the next training level.`;
  if (message) announce(message); else if (lastPhase !== state.phase) announce(phaseMessage());
  lastPhase = state.phase; updateProgress(); telemetry(); renderHistory(); dirty = true;
  // Keep keyboard play moving when an action disables its own focused button.
  // Aim selections never replace or move the player's focused target button.
  if (!document.hidden && focusedControl instanceof HTMLButtonElement && focusedControl.disabled) {
    const nextFocus = state.phase === 'result' ? $('next-kick')
      : state.phase === 'won' ? ($('next-level').hidden ? $('retry') : $('next-level'))
      : state.phase === 'lost' ? $('retry')
      : state.phase === 'paused' ? $('pause')
      : state.phase === 'flight' ? ($('live-time').checked ? $('pause') : $('advance-time'))
      : state.phase === 'ready' && focusedControl.id === 'feint' ? $('advance-time') : null;
    nextFocus?.focus({ preventScroll: true });
  }
}
function act(action, message) {
  try { if (action()) { previous = 0; sync(typeof message === 'function' ? message() : message); } }
  catch (error) { announce(error.message); }
}
function chooseZone(id) { act(() => setAim(state, id), () => `Target selected: ${ZONES.find(zone => zone.id === id).label}. ${state.feintUsed ? 'Your original feint direction stays unchanged.' : 'Feint toward this zone or strike when you see an opening.'}`); }
function changePower(value) { act(() => setPower(state, clamp(value, POWER_MIN, currentKick(state).powerMax))); }
function advanceTime() {
  if (!['ready', 'flight'].includes(state.phase)) return;
  const startingPhase = state.phase;
  if (startingPhase === 'ready') advanceRead(state, 0.1); else stepShootout(state, 0.1);
  previous = 0; sync();
  if (startingPhase === 'ready') { const tell = readKeeper(state); announce(`Time ${state.readTime.toFixed(2)} seconds. Keeper ${keeperPosition()}. ${tell.stage === 'committed' ? `Committed, ${tell.remaining.toFixed(2)} seconds left.` : tell.stage === 'baiting' ? `Reading the feint; commitment in ${tell.opensIn.toFixed(2)} seconds.` : tell.stage === 'recovering' ? 'Commitment expired.' : 'Patrolling.'}`); }
}
function reset(level = state.config.level) {
  state = createShootout(level); recorded = false; lastPhase = ''; lastLogLength = -1; previous = 0;
  $('level-select').value = String(level); sync();
}
function togglePause() { act(() => state.phase === 'paused' ? resumeShootout(state) : pauseShootout(state)); }
zoneButtons.forEach(button => button.addEventListener('click', () => chooseZone(button.dataset.zone)));
powerButtons.forEach(button => button.addEventListener('click', () => changePower(Number(button.dataset.power))));
$('power').addEventListener('input', () => changePower(Number($('power').value)));
$('feint').addEventListener('click', () => act(() => feint(state), 'Run-up feint started. Advance time, watch for a commitment, then redirect your target.'));
$('shoot').addEventListener('click', () => act(() => shoot(state)));
$('advance-time').addEventListener('click', advanceTime);
$('pause').addEventListener('click', togglePause);
$('live-time').addEventListener('change', () => { previous = 0; sync($('live-time').checked ? 'Real time is on. The keeper and ball move continuously. Pause is always available.' : 'Study mode is on. Use Advance time to move the keeper and ball in 0.10-second steps.'); });
$('next-kick').addEventListener('click', () => { act(() => nextKick(state)); if (state.phase === 'ready') zoneButtons[3].focus({ preventScroll: true }); });
$('retry').addEventListener('click', () => { reset(); zoneButtons[3].focus({ preventScroll: true }); });
$('next-level').addEventListener('click', () => { if (state.phase === 'won' && state.config.level < progress.unlocked) { reset(state.config.level + 1); zoneButtons[3].focus({ preventScroll: true }); } });
$('level-form').addEventListener('submit', event => {
  event.preventDefault(); const level = Number($('level-select').value);
  if (!Number.isInteger(level) || level < 1 || level > progress.unlocked || level > LEVEL_COUNT) { announce(`Choose an unlocked level from 1 to ${progress.unlocked.toLocaleString()}.`); return; }
  reset(level); zoneButtons[3].focus({ preventScroll: true });
});
canvas.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (event.repeat && [' ', 'escape', 'f', 'n', 'r'].includes(key)) return;
  if (key.startsWith('arrow') && state.phase === 'ready') {
    event.preventDefault(); let index = Math.max(0, ZONES.findIndex(zone => zone.id === state.zoneId)); if (!state.zoneId) index = 4;
    let row = Math.floor(index / 3), column = index % 3;
    if (key === 'arrowleft') column = Math.max(0, column - 1); if (key === 'arrowright') column = Math.min(2, column + 1);
    if (key === 'arrowup') row = Math.max(0, row - 1); if (key === 'arrowdown') row = Math.min(2, row + 1);
    chooseZone(ZONES[row * 3 + column].id);
  } else if (['w', 's'].includes(key) && state.phase === 'ready') { event.preventDefault(); changePower(state.power + (key === 'w' ? 1 : -1)); }
  else if (key === ' ') { event.preventDefault(); act(() => shoot(state)); }
  else if (key === 'f') { event.preventDefault(); act(() => feint(state), 'Run-up feint started. Watch the keeper commit, then change your target.'); }
  else if (key === 't') { event.preventDefault(); advanceTime(); }
  else if (key === 'escape') { event.preventDefault(); togglePause(); }
  else if (key === 'n') { event.preventDefault(); act(() => nextKick(state)); }
  else if (key === 'r') { event.preventDefault(); reset(); }
});
document.addEventListener('visibilitychange', () => {
  previous = 0;
  if (document.hidden && pauseShootout(state)) sync('Play paused because you switched tabs. Resume when you return; no keeper or ball time has elapsed.');
});
window.addEventListener('storage', event => { if (event.key === saveKey) sync(); });
$('quality').addEventListener('change', () => { dirty = true; });
reducedMotion.addEventListener('change', () => { dirty = true; });
function showFallback(reason) {
  scene?.dispose(); scene = null;
  $('scene-fallback').hidden = false; $('fallback-reason').textContent = reason;
  $('render-status').textContent = 'Command view · same physics and progression'; $('quality').disabled = true;
  document.body.dataset.scene = 'command'; delete canvas.dataset.renderer; delete canvas.dataset.resolution;
  dirty = true;
}
canvas.addEventListener('stage-lost', () => {
  pauseShootout(state); previous = 0;
  showFallback('The graphics connection was lost. Your current shot is preserved. Resume and use the target controls, keeper readout and Advance time to continue.');
  sync('Graphics connection lost. Play paused with your current shot preserved. Command controls use the same simulation.');
});
function frame(time) {
  if (disposed) return;
  const dt = previous ? Math.min((time - previous) / 1000, 0.1) : 0; previous = time;
  const active = !document.hidden && $('live-time').checked && ['ready', 'flight'].includes(state.phase);
  if (active && dt > 0) {
    const oldEvent = state.event; stepShootout(state, dt); dirty = true;
    if (oldEvent !== state.event) sync();
  }
  if (active && time - lastTelemetry > 100) { telemetry(); lastTelemetry = time; }
  if (scene && dirty) { scene.update(state, reducedMotion.matches); scene.render(); dirty = false; }
  frameId = requestAnimationFrame(frame);
}
window.addEventListener('pagehide', event => {
  previous = 0;
  if (event.persisted) { if (pauseShootout(state)) sync(); return; }
  disposed = true; cancelAnimationFrame(frameId); viewObserver.disconnect(); scene?.dispose(); scene = null;
});
window.addEventListener('pageshow', () => { previous = 0; dirty = true; });
$('level-select').value = String(state.config.level); sync(); frameId = requestAnimationFrame(frame);
import('./scene.js').then(({ createGoalLineScene }) => {
  if (disposed) return;
  scene = createGoalLineScene({ canvas, qualitySelect: $('quality'), status: $('render-status') });
  scene.update(state, reducedMotion.matches); scene.render(); dirty = false;
}).catch(() => {
  if (disposed) return;
  showFallback('The 3D view is unavailable on this device. The same five-kick game is ready: choose a zone, read the keeper, and advance time with the controls.');
});
