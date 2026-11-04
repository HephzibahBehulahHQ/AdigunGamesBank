import { createCampaign, CAMPAIGN_ID, LEVEL_COUNT, breakerCost } from './campaign.js';
import { validCampaignSave } from '../shared/progression.js';
import { createBoard, assignLoad, fitBreaker, inspectBoard, startTrial, stepTrial, pauseTrial, resumeTrial, isolateSupply, resetTrip, trialProgress } from './engine.js';

const $ = id => document.getElementById(id);
const progress = createCampaign(), canvas = $('fusebox-canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let state, selectedBranch = 0, selectedLoad = 0, recorded = false, scene = null, lastFrame = 0, lastUI = 0, dirty = true;
let branchControls = [], loadControls = [], stockRows = [], stageRows = [];
const text = (element, value) => { if (element.textContent !== value) element.textContent = value; };
const amps = value => `${value.toFixed(2)} A`;
function confirmedSave() {
  try { const saved = JSON.parse(localStorage.getItem(`adigun.campaign.v1.${CAMPAIGN_ID}`) || 'null'); return validCampaignSave(saved) && saved.completed >= progress.completed; }
  catch { return false; }
}
function selectBranch(index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.config.branches.length) return;
  selectedBranch = index; sync();
}
function selectLoad(index) { selectedLoad = index; sync(); }
function command(action) { action(); sync(); }
function buildControls() {
  $('branches').replaceChildren(); $('loads').replaceChildren(); $('inventory').replaceChildren(); $('trial-stages').replaceChildren();
  branchControls = state.config.branches.map((branch, index) => {
    const card = document.createElement('div'); card.className = 'branch-card';
    const select = document.createElement('button'); select.type = 'button'; select.id = `branch-${index}`; select.className = 'branch-select';
    const title = document.createElement('strong'), peak = document.createElement('span'); title.textContent = branch.name;
    select.append(title, peak); select.addEventListener('click', () => selectBranch(index));
    const live = document.createElement('p'); live.className = 'branch-current'; live.id = `current-${index}`;
    const cable = document.createElement('p'); cable.className = 'cable'; cable.textContent = `Cable limit ${amps(branch.cableAmpacity)}`;
    const label = document.createElement('label'); label.htmlFor = `breaker-${index}`; label.textContent = `${branch.name} breaker`;
    const breaker = document.createElement('select'); breaker.id = label.htmlFor;
    breaker.add(new Option('Empty', '0'));
    for (const rating of Object.keys(state.config.inventory).map(Number).sort((a, b) => a - b)) breaker.add(new Option(`${rating} A · ${breakerCost(rating)} credits`, String(rating)));
    breaker.addEventListener('change', () => command(() => fitBreaker(state, index, Number(breaker.value))));
    card.append(select, live, cable, label, breaker); $('branches').append(card);
    return { card, select, peak, live, breaker };
  });
  loadControls = state.config.loads.map((load, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.id = `load-${index}`; button.className = 'load-button';
    const title = document.createElement('strong'); title.textContent = load.name;
    const power = document.createElement('small'); power.textContent = `L / D / F: ${load.powers.map(value => `${Number(value.toFixed(2))}`).join(' / ')} W`;
    const current = document.createElement('small'); current.textContent = `Current: ${load.powers.map(value => (value / state.config.voltage).toFixed(2)).join(' / ')} A`;
    const assignment = document.createElement('span'); assignment.className = 'load-assignment';
    button.append(title, power, current, assignment); button.addEventListener('click', () => selectLoad(index)); $('loads').append(button);
    return { button, assignment };
  });
  stockRows = Object.entries(state.config.inventory).map(([value, count]) => {
    const rating = Number(value), row = document.createElement('li'), title = document.createElement('strong'), available = document.createElement('span');
    title.textContent = `${rating} A`; row.append(title, available); $('inventory').append(row); return { rating, count, available };
  });
  stageRows = state.config.stages.map(name => { const li = document.createElement('li'); li.textContent = name; $('trial-stages').append(li); return li; });
}
function sync() {
  const inspection = inspectBoard(state), editable = state.phase === 'isolated' && state.isolated;
  if (state.phase === 'won' && !recorded) { progress.complete(state.config.level); recorded = true; }
  const phases = { isolated: 'ISOLATED', testing: 'ON TEST', paused: 'PAUSED', tripped: state.isolated ? 'TRIPPED · ISOLATED' : 'TRIPPED', won: 'COMMISSIONED' };
  text($('phase'), phases[state.phase]); $('phase').dataset.phase = state.phase;
  text($('tier'), state.config.tier); text($('unlock-status'), `Board ${progress.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`);
  $('level').max = String(progress.unlocked); $('level').disabled = !state.isolated; $('load-level').disabled = !state.isolated;
  text($('voltage'), `${state.config.voltage} V`); text($('connected'), `${inspection.assigned} / ${state.config.loads.length}`);
  text($('supply-status'), state.isolated ? 'Supply isolated' : state.phase === 'tripped' ? 'Trip latched · isolate next' : 'Supply connected');
  text($('selected-load'), state.config.loads[selectedLoad].name); text($('selected-branch'), state.config.branches[selectedBranch].name);
  branchControls.forEach((control, index) => {
    const branch = inspection.branches[index];
    control.card.classList.toggle('selected', index === selectedBranch); control.card.classList.toggle('trip', state.fault?.branch === index);
    control.select.setAttribute('aria-pressed', String(index === selectedBranch));
    text(control.peak, `${amps(branch.peak)} planned peak`); text(control.live, `${amps(branch.liveCurrent)} live`);
    control.breaker.value = String(state.breakers[index]); control.breaker.disabled = !editable;
  });
  loadControls.forEach((control, index) => {
    control.button.classList.toggle('selected', index === selectedLoad); control.button.setAttribute('aria-pressed', String(index === selectedLoad));
    const branch = state.assignments[index]; text(control.assignment, branch < 0 ? 'Not connected' : `Connected · ${state.config.branches[branch].name}`);
  });
  stockRows.forEach(row => text(row.available, `${row.count - (inspection.stock[row.rating] || 0)} / ${row.count} available · ${breakerCost(row.rating)} credits`));
  text($('budget'), `${inspection.cost} / ${state.config.budget} credits used`); $('budget').classList.toggle('over-budget', inspection.cost > state.config.budget);
  const rows = inspection.reasons.map(reason => ({ text: reason, className: '' })).concat(inspection.warnings.map(reason => ({ text: reason, className: 'warning' })));
  if (!rows.length) rows.push({ text: 'Plan within stock, budget and all three current limits. Ready for the live trial.', className: 'good' });
  const signature = rows.map(row => row.text).join('|');
  if ($('inspection').dataset.signature !== signature) {
    $('inspection').dataset.signature = signature;
    $('inspection').replaceChildren(...rows.map(row => { const p = document.createElement('p'); p.textContent = row.text; p.className = row.className; return p; }));
  }
  text($('main-limit'), `Supply limit ${amps(state.config.mainAmpacity)}. Breaker inventory applies across the whole board.`);
  $('connect-load').disabled = !editable; $('disconnect-load').disabled = !editable || state.assignments[selectedLoad] < 0;
  $('start-trial').disabled = !editable;
  $('pause-trial').disabled = !['testing', 'paused'].includes(state.phase); text($('pause-trial'), state.phase === 'paused' ? 'Resume trial' : 'Pause trial');
  $('isolate').disabled = state.isolated || state.phase === 'won'; $('reset-trip').hidden = state.phase !== 'tripped'; $('reset-trip').disabled = !state.isolated;
  $('clear-board').disabled = !editable && state.phase !== 'won'; $('next-level').hidden = state.phase !== 'won' || state.config.level >= LEVEL_COUNT;
  text($('message'), state.message); $('message').className = `message${state.phase === 'tripped' ? ' error' : state.phase === 'won' ? ' success' : ''}`;
  text($('save-status'), !progress.completed ? 'Completed boards save on this device.' : `${progress.completed.toLocaleString()} boards completed. ${confirmedSave() ? 'Progress saved on this device.' : 'Progress is available for this session only; browser storage could not confirm a save.'}`);
  telemetry(); dirty = true;
}
function telemetry() {
  text($('trial-progress'), `${Math.floor(trialProgress(state) * 100)}%`);
  text($('energy'), `${state.energyWh.toFixed(3)} Wh`);
  text($('stage-name'), state.phase === 'won' ? 'All three profiles passed' : state.phase === 'isolated' ? 'Awaiting trial' : state.config.stages[state.stage]);
  stageRows.forEach((row, index) => { row.className = index < state.passed ? 'passed' : index === state.stage && ['testing', 'paused', 'tripped'].includes(state.phase) ? 'active' : ''; });
}
function loadLevel(value) {
  const level = Number(value);
  if (!Number.isInteger(level) || level < 1 || level > progress.unlocked) {
    $('level').value = String(state?.config.level || 1); if (state) { state.message = 'Complete the current unlocked board before loading a later one.'; sync(); } return;
  }
  if (state && !state.isolated) { state.message = 'Isolate the supply before loading another board.'; sync(); return; }
  state = createBoard(level); selectedBranch = 0; selectedLoad = 0; recorded = false; lastFrame = 0;
  $('level').value = String(level); text($('brief'), state.config.brief); buildControls(); scene?.rebuild(state.config); sync();
}
function pause() { if (state.phase === 'testing') pauseTrial(state); else if (state.phase === 'paused') resumeTrial(state); lastFrame = 0; sync(); }
$('connect-load').addEventListener('click', () => command(() => assignLoad(state, selectedLoad, selectedBranch)));
$('disconnect-load').addEventListener('click', () => command(() => assignLoad(state, selectedLoad, -1)));
$('load-level').addEventListener('click', () => loadLevel($('level').value));
$('start-trial').addEventListener('click', () => { command(() => startTrial(state)); lastFrame = 0; });
$('pause-trial').addEventListener('click', pause);
$('isolate').addEventListener('click', () => command(() => isolateSupply(state)));
$('reset-trip').addEventListener('click', () => command(() => resetTrip(state)));
$('clear-board').addEventListener('click', () => loadLevel(state.config.level));
$('next-level').addEventListener('click', () => loadLevel(state.config.level + 1));
canvas.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); selectBranch(Math.max(0, Math.min(state.config.branches.length - 1, selectedBranch + (event.key === 'ArrowRight' ? 1 : -1)))); }
  if (event.key === 'Enter') { event.preventDefault(); command(() => assignLoad(state, selectedLoad, selectedBranch)); }
  if (event.code === 'Space') { event.preventDefault(); pause(); }
});
$('quality').addEventListener('change', () => { dirty = true; });
new ResizeObserver(() => { dirty = true; }).observe(canvas);
reducedMotion.addEventListener('change', () => { dirty = true; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.phase === 'testing') { pauseTrial(state); sync(); } lastFrame = 0; });
function graphicsFailure(message) {
  $('graphics-fallback').hidden = false; $('quality').disabled = true;
  text($('graphics-status'), message); delete canvas.dataset.renderer; delete canvas.dataset.resolution; dirty = false;
}
canvas.addEventListener('stage-lost', () => graphicsFailure('Graphics connection lost. Continue with the board controls, or reload graphics.'));
loadLevel(progress.unlocked);
try {
  const { createScene } = await import('./scene.js');
  scene = createScene({ canvas, qualitySelect: $('quality'), status: $('graphics-status'), onSelect: selectBranch });
  scene.rebuild(state.config); dirty = true;
} catch { graphicsFailure('WebGL 2 unavailable. The same electrical trial remains playable through the board controls.'); }
function frame(time) {
  const elapsed = lastFrame ? Math.max(0, Math.min(.1, (time - lastFrame) / 1000)) : 0; lastFrame = time;
  const previousPhase = state.phase, previousStage = state.stage;
  if (state.phase === 'testing') stepTrial(state, elapsed);
  if (state.phase !== previousPhase || state.stage !== previousStage) sync();
  else if (state.phase === 'testing' && time - lastUI > 150) { telemetry(); lastUI = time; dirty = true; }
  if (scene && (dirty || (state.phase === 'testing' && !reducedMotion.matches && time - (scene.lastDraw || 0) > 100))) {
    scene.update(state, selectedBranch, reducedMotion.matches); scene.render(); scene.lastDraw = time; dirty = false;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
