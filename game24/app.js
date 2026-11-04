import { createCampaign, CAMPAIGN_ID, LEVEL_COUNT } from './campaign.js';
import { validCampaignSave } from '../shared/progression.js';
import { createGame, startGame, loadCargo, unloadCargo, setBallast, inspectLoading, launch, stepGame, pauseGame, resumeGame, retryGame } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('ark-canvas');
const progress = createCampaign();
const deckOrder = [4, 5, 2, 3, 0, 1];
let state, selectedBay = 0, selectedCargo = 0, scene = null, recorded = false;
let frameId = 0, previousTime = 0, lastUI = 0, dirty = true, stopped = false;
const bayButtons = [], cargoButtons = [], ballastInputs = [], ballastButtons = [];
const number = (value, digits = 2) => value.toFixed(digits);

function message(text) { $('message').textContent = text; }
function saved() {
  try {
    const value = JSON.parse(localStorage.getItem(`adigun.campaign.v1.${CAMPAIGN_ID}`) || 'null');
    return validCampaignSave(value) && value.completed >= progress.completed;
  } catch { return false; }
}
function progressText() {
  if (!progress.completed) return 'Progress saves on this device after a successful trial.';
  const result = `${progress.completed.toLocaleString()} voyages completed. `;
  return result + (saved() ? 'Progress saved on this device.' : 'Progress is available for this session only; browser storage could not confirm a save.');
}
function selectBay(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 6) return;
  selectedBay = index; sync();
}
function selectCargo(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 6) return;
  selectedCargo = index; sync();
}
function command(action) {
  const changed = action(); sync();
  if (!changed && state.phase === 'loading') message('That command cannot change the current load. Check the selected cargo, tank limit and total ballast budget.');
  return changed;
}
function fillBallast(index, value) {
  const amount = Number(value);
  if (amount === state.ballast[index]) { sync(); return; }
  command(() => setBallast(state, index, amount));
}
function buildControls() {
  $('bay-grid').replaceChildren(); $('manifest').replaceChildren(); $('ballast-controls').replaceChildren();
  for (const index of deckOrder) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'bay-button';
    button.id = `bay-${index}`; button.addEventListener('click', () => selectBay(index));
    const title = document.createElement('strong'), cargo = document.createElement('span'), capacity = document.createElement('span');
    title.textContent = state.config.slots[index].name; capacity.className = 'bay-capacity';
    button.append(title, cargo, capacity); $('bay-grid').append(button); bayButtons[index] = button;
  }
  for (let index = 0; index < 6; index++) {
    const cargo = state.config.cargo[index];
    const button = document.createElement('button'); button.type = 'button'; button.id = `cargo-${index}`; button.className = 'cargo-button';
    const title = document.createElement('strong'), description = document.createElement('small'), mass = document.createElement('span');
    title.textContent = cargo.name; mass.textContent = `${number(cargo.mass, 1)} t`; mass.className = 'cargo-mass';
    button.append(title, description, mass); button.addEventListener('click', () => selectCargo(index));
    $('manifest').append(button); cargoButtons[index] = button;

    const row = document.createElement('div'); row.className = 'ballast-row';
    const label = document.createElement('label'); label.htmlFor = `ballast-${index}`; label.textContent = `${state.config.slots[index].name} (t)`;
    const input = document.createElement('input'); input.id = `ballast-${index}`; input.type = 'number'; input.min = '0'; input.max = String(state.config.ballast.capacity); input.step = '1'; input.inputMode = 'numeric';
    input.addEventListener('change', () => { fillBallast(index, input.value); input.value = String(state.ballast[index]); });
    const buttons = [-1, 1].map(delta => {
      const control = document.createElement('button'); control.type = 'button'; control.textContent = delta < 0 ? '−' : '+';
      control.setAttribute('aria-label', `${delta < 0 ? 'Remove' : 'Add'} one tonne of ballast: ${state.config.slots[index].name}`);
      control.addEventListener('click', () => command(() => setBallast(state, index, state.ballast[index] + delta)));
      return control;
    });
    row.append(label, buttons[0], input, buttons[1]); $('ballast-controls').append(row);
    ballastInputs[index] = input; ballastButtons[index] = buttons;
  }
}
function sync() {
  const loading = state.phase === 'loading', c = state.config, m = state.metrics;
  const sailing = state.phase === 'sailing' || state.phase === 'paused';
  if (state.phase === 'won' && !recorded) { progress.complete(c.level); recorded = true; }
  state.selectedBay = selectedBay; state.selectedCargo = selectedCargo;
  $('phase').textContent = ({ loading: 'DOCKED', sailing: 'ON TRIAL', paused: 'PAUSED', won: 'COMMISSIONED', lost: 'RETURN TO QUAY' })[state.phase] || 'DOCKED';
  $('phase').dataset.phase = state.phase;
  $('tier').textContent = c.tier; $('level').max = String(progress.unlocked);
  $('unlock-status').textContent = `Voyage ${progress.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`;
  $('selected-bay-label').textContent = c.slots[selectedBay].name;
  $('manifest-count').textContent = `${m.loaded} / 6 loaded`;
  const totalBallast = state.ballast.reduce((sum, value) => sum + value, 0);
  $('ballast-total').textContent = `Total: ${totalBallast} / ${c.ballast.budget} t · tank limit: ${c.ballast.capacity} t`;
  for (let i = 0; i < 6; i++) {
    const slot = c.slots[i], occupant = state.placement.indexOf(i), button = bayButtons[i];
    button.setAttribute('aria-pressed', String(i === selectedBay));
    button.classList.toggle('filled', occupant >= 0);
    button.children[1].textContent = occupant < 0 ? 'Empty bay' : c.cargo[occupant].name;
    button.children[2].textContent = `${slot.stationLabel} · max ${number(slot.capacity, 1)} t`;
    const cargoButton = cargoButtons[i], assigned = state.placement[i];
    cargoButton.setAttribute('aria-pressed', String(i === selectedCargo));
    cargoButton.classList.toggle('loaded', assigned >= 0);
    cargoButton.children[1].textContent = `${c.cargo[i].stationLabel} · ${assigned < 0 ? 'on quay' : c.slots[assigned].name}`;
    if (document.activeElement !== ballastInputs[i]) ballastInputs[i].value = String(state.ballast[i]);
    ballastInputs[i].disabled = !loading;
    ballastButtons[i][0].disabled = !loading || state.ballast[i] === 0;
    ballastButtons[i][1].disabled = !loading || state.ballast[i] >= c.ballast.capacity || totalBallast >= c.ballast.budget;
  }
  $('load-cargo').disabled = !loading || state.placement[selectedCargo] === selectedBay;
  $('unload-cargo').disabled = !loading || !state.placement.includes(selectedBay);
  $('launch').disabled = !loading;
  $('pause').disabled = !sailing; $('pause').textContent = state.phase === 'paused' ? 'Resume trial' : 'Pause trial';
  $('retry').disabled = state.phase === 'loading'; $('retry').textContent = 'Return to quay';
  $('next-level').hidden = !(state.phase === 'won' && c.level < progress.unlocked);
  $('load-level').disabled = sailing;
  $('save-status').textContent = progressText();
  const inspection = inspectLoading(state);
  $('launch-checks').replaceChildren(...(inspection.ok ? ['Manifest and loading checks passed. The water trial still tests balance and freeboard.'] : inspection.reasons).map(reason => {
    const p = document.createElement('p'); p.textContent = reason; return p;
  }));
  $('message').className = `message ${state.phase === 'won' ? 'success' : state.phase === 'lost' ? 'error' : ''}`;
  message(state.message); telemetry(); dirty = true;
}
function telemetry() {
  const m = state.metrics, c = state.config, preflight = state.phase === 'loading';
  const heel = preflight ? m.equilibriumHeel : state.heel, trim = preflight ? m.equilibriumTrim : state.trim;
  $('balance-value').textContent = `${number(heel)}°`; $('trim-value').textContent = `${number(trim)}°`;
  $('balance-limit').textContent = `${preflight ? 'Predicted steady heel' : 'Measured heel'} · limit ±${c.limits.heel}°`;
  $('trim-limit').textContent = `${preflight ? 'Predicted steady trim' : 'Measured trim'} · limit ±${c.limits.trim}°`;
  $('balance-value').className = Math.abs(heel) <= c.limits.heel ? 'inside' : 'outside';
  $('trim-value').className = Math.abs(trim) <= c.limits.trim ? 'inside' : 'outside';
  $('freeboard-value').textContent = `${number(m.edgeFreeboard)} m`;
  $('freeboard-value').className = m.edgeFreeboard >= c.limits.freeboard ? 'inside' : 'outside';
  $('freeboard-limit').textContent = `Minimum ${number(c.limits.freeboard)} m · draft ${number(m.draft)} m`;
  $('trial-value').textContent = `${Math.floor(m.progress * 100)}%`;
  $('trial-condition').textContent = `${number(state.time, 1)} / ${c.limits.launchDuration} s · stability alert ${Math.round(state.damage * 100)}%`;
}
function loadLevel(requested) {
  const level = Number(requested);
  if (!Number.isInteger(level) || level < 1 || level > progress.unlocked) { $('level').value = String(state.config.level); message('Complete the current unlocked voyage before loading a later one.'); return; }
  state = createGame(level); startGame(state); selectedBay = 0; selectedCargo = 0; recorded = false; previousTime = 0;
  $('level').value = String(level);
  $('mission-brief').textContent = `${state.config.lesson} Hold the limits for ${state.config.limits.launchDuration} seconds. Wind moment: ${number(state.config.environment.windMoment, 1)} kN m; fore/aft current moment: ${number(state.config.environment.trimMoment, 1)} kN m.`;
  buildControls(); sync();
}
function togglePause() { if (state.phase === 'paused') resumeGame(state); else if (state.phase === 'sailing') pauseGame(state); previousTime = 0; sync(); }
function automaticPause() { if (state.phase === 'sailing') { pauseGame(state); previousTime = 0; sync(); } }
$('load-cargo').addEventListener('click', () => command(() => loadCargo(state, selectedCargo, selectedBay)));
$('unload-cargo').addEventListener('click', () => command(() => unloadCargo(state, state.placement.indexOf(selectedBay))));
$('launch').addEventListener('click', () => { launch(state); previousTime = 0; sync(); });
$('pause').addEventListener('click', togglePause);
$('retry').addEventListener('click', () => { if (state.phase === 'paused') resumeGame(state); retryGame(state); previousTime = 0; sync(); });
$('load-level').addEventListener('click', () => loadLevel($('level').value));
$('next-level').addEventListener('click', () => loadLevel(state.config.level + 1));
// The shared stage owns resizing and reflects hardware limits in this selector.
$('quality').addEventListener('change', () => { dirty = true; });
canvas.addEventListener('keydown', event => {
  const index = deckOrder.indexOf(selectedBay);
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Backspace',' '].includes(event.key)) event.preventDefault(); else return;
  if (event.key === 'ArrowUp') selectBay(deckOrder[index >= 2 ? index - 2 : index]);
  else if (event.key === 'ArrowDown') selectBay(deckOrder[index <= 3 ? index + 2 : index]);
  else if (event.key === 'ArrowLeft') selectBay(deckOrder[index - index % 2]);
  else if (event.key === 'ArrowRight') selectBay(deckOrder[index + (index % 2 ? 0 : 1)]);
  else if (event.key === 'Enter') command(() => loadCargo(state, selectedCargo, selectedBay));
  else if (event.key === 'Backspace') command(() => unloadCargo(state, state.placement.indexOf(selectedBay)));
  else togglePause();
});
window.addEventListener('blur', automaticPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) automaticPause(); });
window.addEventListener('storage', () => sync());
window.addEventListener('resize', () => { dirty = true; });
canvas.addEventListener('stage-lost', () => { automaticPause(); $('quality').disabled = true; $('graphics-fallback').hidden = false; $('graphics-status').textContent = 'Graphics connection lost. Deck controls remain available; resume the trial when ready.'; });
function frame(now) {
  if (stopped) return;
  const dt = previousTime ? Math.min((now - previousTime) / 1000, .25) : 0; previousTime = now;
  const was = state.phase;
  if (was === 'sailing') { stepGame(state, dt); dirty = true; if (state.phase !== was) sync(); }
  if (now - lastUI > 100 && state.phase === 'sailing') { telemetry(); lastUI = now; }
  if (scene && dirty) { scene.update(state); dirty = false; }
  frameId = requestAnimationFrame(frame);
}
window.addEventListener('pagehide', event => { automaticPause(); if (!event.persisted) { stopped = true; cancelAnimationFrame(frameId); scene?.dispose(); } });
loadLevel(progress.unlocked);
frameId = requestAnimationFrame(frame);
// The heavy renderer is deferred until the accessible command interface is ready.
import('./scene.js').then(({ createScene }) => {
  if (stopped) return;
  scene = createScene(canvas, { onSelectBay: selectBay, onSelectCargo: selectCargo });
  scene.setQuality($('quality').value); dirty = true;
}).catch(() => {
  $('quality').disabled = true;
  $('graphics-fallback').hidden = false;
  $('graphics-status').textContent = 'WebGL 2 unavailable. Deck controls and the numerical water trial remain playable.';
});
