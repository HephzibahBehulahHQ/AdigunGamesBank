import { createCampaign, CAMPAIGN_ID, LEVEL_COUNT } from './campaign.js';
import { validCampaignSave } from '../shared/progression.js';
import { createExperiment, selectPart, selectedParts, inspectPlan, electrical, startCharge, captureTarget, startDischarge, stepExperiment, pauseExperiment, resumeExperiment, advancePaused, resetExperiment } from './engine.js';

const $ = id => document.getElementById(id), canvas = $('capacitor-canvas');
const progress = createCampaign(), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let state, scene = null, recorded = false, dirty = true, lastFrame = 0, lastUI = 0;
const ACTIVE = ['charging', 'holding', 'discharging'];
const text = (element, value) => { if (element.textContent !== value) element.textContent = value; };
const display = (value, places = 2) => Number.isFinite(value) ? value.toFixed(places) : 'Unreachable';
const ohms = value => value >= 1000 ? `${Number((value / 1000).toFixed(3))} kΩ` : `${value} Ω`;
const physicalPhase = () => state.phase === 'paused' ? state.resumePhase : state.phase;
function confirmedSave() {
  try { const value = JSON.parse(localStorage.getItem(`adigun.campaign.v1.${CAMPAIGN_ID}`) || 'null'); return validCampaignSave(value) && value.completed >= progress.completed; }
  catch { return false; }
}
function command(action) { action(); sync(); lastFrame = 0; }
function fitControls() {
  const { config } = state;
  for (const [id, list, label] of [
    ['capacitor', config.capacitors, part => `${part.microfarads.toLocaleString()} µF · ${part.voltageRating} V`],
    ['charge-resistor', config.chargeResistors, part => `${ohms(part.ohms)} · ${part.watts} W`],
    ['discharge-resistor', config.dischargeResistors, part => `${ohms(part.ohms)} · ${part.watts} W`]
  ]) {
    const select = $(id); while (select.options.length > 1) select.remove(1);
    list.forEach(part => select.add(new Option(label(part), part.id)));
  }
  text($('brief'), config.brief); text($('target-window'), `${config.target.minVolts.toFixed(3)}–${config.target.maxVolts.toFixed(3)} V`);
  text($('target-energy'), `${(config.target.minEnergy * 1000).toFixed(1)}–${(config.target.maxEnergy * 1000).toFixed(1)} mJ`);
  text($('target-hold'), `${config.target.holdSeconds} s hold`); text($('target-floor'), `Stay above ${config.target.holdFloor.toFixed(3)} V`);
  text($('target-release'), `≤ ${config.target.safeVolts} V`); text($('target-deadline'), `Within ${config.limits.dischargeSeconds.toFixed(2)} s of discharge`);
  text($('leakage'), `Fixed leakage model: ${ohms(config.leakageOhms)} across the capacitor.`);
  text($('source-rating'), `${config.sourceVolts} V DC`); text($('charge-limit'), `${(config.limits.chargeAmps * 1000).toFixed(2)} mA`);
  text($('discharge-limit'), `${(config.limits.dischargeAmps * 1000).toFixed(2)} mA`); text($('charge-deadline'), `${config.limits.chargeSeconds.toFixed(2)} s`);
  text($('ceiling'), `${config.limits.ceilingVolts.toFixed(3)} V`); text($('axis-max'), `${config.sourceVolts} V`);
  const extent = config.limits.chargeSeconds + config.target.holdSeconds + config.limits.dischargeSeconds;
  text($('axis-time'), `${extent.toFixed(1)} s`);
  const y = voltage => 186 - voltage / config.sourceVolts * 170;
  $('target-band').setAttribute('y', String(y(config.target.maxVolts))); $('target-band').setAttribute('height', String(y(config.target.minVolts) - y(config.target.maxVolts)));
  $('floor-line').setAttribute('d', `M54 ${y(config.target.holdFloor)}H776`);
}
function sync() {
  if (state.phase === 'won' && !recorded) { progress.complete(state.config.level); recorded = true; }
  const phase = physicalPhase(), editing = state.phase === 'planning';
  const label = { planning: 'ISOLATED', charging: 'CHARGING', holding: 'HOLD TEST', ready: 'HOLD PASSED · PAUSED', discharging: 'DISCHARGING', lost: 'TRIAL STOPPED', won: 'COMMISSIONED' };
  text($('phase'), state.phase === 'paused' ? `PAUSED · ${label[phase]}` : label[state.phase]); $('phase').dataset.phase = state.phase;
  $('phase').dataset.circuit = phase;
  text($('tier'), state.config.tier); text($('unlock-status'), `Experiment ${progress.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`);
  $('level').max = String(progress.unlocked); $('level').disabled = !['planning', 'lost', 'won'].includes(state.phase); $('load-level').disabled = $('level').disabled;
  for (const [id, key] of [['capacitor','capacitor'],['charge-resistor','chargeResistor'],['discharge-resistor','dischargeResistor']]) { $(id).value = state.selected[key]; $(id).disabled = !editing; }
  $('start-charge').disabled = !editing; $('capture-target').disabled = phase !== 'charging'; $('start-discharge').disabled = state.phase !== 'ready';
  $('pause').disabled = !ACTIVE.includes(phase); text($('pause'), state.phase === 'paused' ? 'Resume experiment' : 'Pause experiment');
  $('advance').disabled = state.phase !== 'paused'; $('next-level').hidden = state.phase !== 'won' || state.config.level >= LEVEL_COUNT;
  text($('message'), state.message); $('message').className = `message${state.phase === 'lost' ? ' error' : state.phase === 'won' ? ' success' : ''}`;
  text($('save-status'), !progress.completed ? 'Completed experiments save on this device.' : `${progress.completed.toLocaleString()} ${progress.completed === 1 ? 'experiment' : 'experiments'} completed. ${confirmedSave() ? 'Progress saved on this device.' : 'Progress is available for this session only; browser storage could not confirm a save.'}`);
  const plan = inspectPlan(state);
  text($('plan-tau'), plan.ready ? `${display(plan.circuit.chargeTau, 3)} s` : '—'); text($('plan-time'), plan.ready ? `${display(plan.chargeTime, 3)} s` : '—');
  text($('plan-energy'), plan.ready ? `${display(plan.targetEnergy * 1000, 2)} mJ` : '—'); text($('plan-held'), plan.ready ? `${display(plan.heldVoltage, 3)} V` : '—');
  text($('plan-discharge'), plan.ready ? `${display(plan.dischargeTime, 3)} s` : '—');
  const warnings = plan.warnings.length ? plan.warnings : ['At the target midpoint, the selected parts meet the predicted bench limits.'];
  const signature = warnings.join('|');
  if ($('plan-warnings').dataset.signature !== signature) {
    $('plan-warnings').dataset.signature = signature;
    $('plan-warnings').replaceChildren(...warnings.map(warning => { const p = document.createElement('p'); p.textContent = warning; if (plan.ready && !plan.warnings.length) p.className = 'good'; return p; }));
  }
  telemetry(); dirty = true;
}
function telemetry() {
  const circuit = electrical(state), phase = physicalPhase(), { target, limits } = state.config;
  text($('voltage'), `${state.voltage.toFixed(3)} V`); $('voltage').dataset.volts = String(state.voltage);
  text($('energy'), `${((circuit?.storedEnergy || 0) * 1000).toFixed(3)} mJ`); text($('source-current'), `${((circuit?.sourceCurrent || 0) * 1000).toFixed(3)} mA`);
  text($('bleed-current'), `${((circuit?.bleedCurrent || 0) * 1000).toFixed(3)} mA`); text($('elapsed'), `${state.time.toFixed(2)} s`);
  const stageLimit = phase === 'charging' ? limits.chargeSeconds : phase === 'holding' || state.phase === 'ready' ? target.holdSeconds : limits.dischargeSeconds;
  text($('stage-progress'), state.phase === 'won' ? '3 / 3 passed' : state.phase === 'planning' ? 'Fit parts' : `${state.stageTime.toFixed(2)} / ${stageLimit.toFixed(2)} s`);
  text($('charge-power'), circuit ? `${circuit.chargePower.toFixed(3)} / ${circuit.charge.watts} W` : '—');
  text($('discharge-power'), circuit ? `${circuit.dischargePower.toFixed(3)} / ${circuit.discharge.watts} W` : '—');
  const voltageIn = state.voltage >= target.minVolts && state.voltage <= target.maxVolts;
  const energyIn = circuit && circuit.storedEnergy >= target.minEnergy && circuit.storedEnergy <= target.maxEnergy;
  let capture = 'The capacitor is empty.', status = '';
  if (phase === 'charging') {
    capture = voltageIn && energyIn ? 'Voltage and energy are in the target window. Capture & hold now.' : voltageIn ? 'Voltage is in range; stored energy misses the target. Check the capacitor bank.' : state.voltage < target.minVolts ? 'Charging below the target window.' : 'Above the capture window. The overvoltage trip is approaching.';
    status = voltageIn && energyIn ? 'inside' : state.voltage >= target.minVolts ? 'outside' : '';
  } else if (phase === 'holding') capture = `Target captured. Leakage hold must remain above ${target.holdFloor.toFixed(3)} V.`;
  else if (state.phase === 'ready') { capture = 'Hold test passed. Simulated time is paused until you start discharge.'; status = 'inside'; }
  else if (phase === 'discharging') capture = `Discharging toward ${target.safeVolts} V. The source is disconnected.`;
  else if (state.phase === 'won') { capture = 'Capture, hold and discharge verified.'; status = 'inside'; }
  else if (state.phase === 'lost') { capture = 'Trial stopped. No experiment completion was awarded.'; status = 'outside'; }
  text($('capture-status'), capture); $('capture-status').className = `capture-status ${status}`;
  const extent = limits.chargeSeconds + target.holdSeconds + limits.dischargeSeconds;
  const data = [...state.trace, { time: state.time, voltage: state.voltage }];
  $('voltage-trace').setAttribute('points', data.map(point => `${(54 + Math.min(1, point.time / extent) * 722).toFixed(2)},${(186 - Math.max(0, Math.min(1, point.voltage / state.config.sourceVolts)) * 170).toFixed(2)}`).join(' '));
}
function loadLevel(value) {
  const level = Number(value);
  if (!Number.isInteger(level) || level < 1 || level > progress.unlocked) { $('level').value = String(state?.config.level || 1); if (state) { state.message = 'Complete the current unlocked experiment before loading a later one.'; sync(); } return; }
  state = createExperiment(level); recorded = false; $('level').value = String(level); fitControls(); scene?.rebuild(state.config); lastFrame = 0; sync();
}
function action(name) {
  if (name === 'charge') command(() => startCharge(state));
  if (name === 'hold') command(() => captureTarget(state));
  if (name === 'discharge') command(() => startDischarge(state));
}
for (const [id, key] of [['capacitor','capacitor'],['charge-resistor','chargeResistor'],['discharge-resistor','dischargeResistor']]) $(id).addEventListener('change', () => command(() => selectPart(state, key, $(id).value)));
$('start-charge').addEventListener('click', () => action('charge')); $('capture-target').addEventListener('click', () => action('hold')); $('start-discharge').addEventListener('click', () => action('discharge'));
$('pause').addEventListener('click', () => command(() => state.phase === 'paused' ? resumeExperiment(state) : pauseExperiment(state)));
$('advance').addEventListener('click', () => command(() => advancePaused(state)));
$('reset').addEventListener('click', () => { state = resetExperiment(state); recorded = false; lastFrame = 0; sync(); });
$('load-level').addEventListener('click', () => loadLevel($('level').value)); $('next-level').addEventListener('click', () => loadLevel(state.config.level + 1));
$('view-bench').addEventListener('click', () => { scene?.setView('bench'); dirty = true; }); $('view-top').addEventListener('click', () => { scene?.setView('top'); dirty = true; });
canvas.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (['c', 'h', 'd'].includes(key)) { event.preventDefault(); action({ c: 'charge', h: 'hold', d: 'discharge' }[key]); }
  if (event.code === 'Space') { event.preventDefault(); command(() => state.phase === 'paused' ? resumeExperiment(state) : pauseExperiment(state)); }
  if (event.key === 'ArrowRight') { event.preventDefault(); command(() => advancePaused(state)); }
});
$('quality').addEventListener('change', () => { dirty = true; }); new ResizeObserver(() => { dirty = true; }).observe(canvas);
reducedMotion.addEventListener('change', () => { dirty = true; });
document.addEventListener('visibilitychange', () => { if (document.hidden && ACTIVE.includes(state.phase)) { pauseExperiment(state); sync(); } lastFrame = 0; });
function graphicsFailure(message) { $('graphics-fallback').hidden = false; $('quality').disabled = true; $('view-bench').disabled = true; $('view-top').disabled = true; text($('graphics-status'), message); delete canvas.dataset.renderer; delete canvas.dataset.resolution; dirty = false; }
canvas.addEventListener('stage-lost', () => graphicsFailure('Graphics connection lost. Continue with the switches and meters, or reload graphics.'));
loadLevel(progress.unlocked);
try { const { createScene } = await import('./scene.js'); scene = createScene({ canvas, qualitySelect: $('quality'), status: $('graphics-status'), onAction: action }); scene.rebuild(state.config); dirty = true; }
catch { graphicsFailure('WebGL 2 unavailable. The same RC circuit remains playable through the switches and meters.'); }
function frame(time) {
  const elapsed = lastFrame ? Math.max(0, Math.min(.1, (time - lastFrame) / 1000)) : 0; lastFrame = time;
  const previous = state.phase;
  if (ACTIVE.includes(state.phase)) stepExperiment(state, elapsed);
  if (state.phase !== previous) sync();
  else if (ACTIVE.includes(state.phase) && time - lastUI > 80) { telemetry(); lastUI = time; dirty = true; }
  if (scene && dirty) { scene.update(state, reducedMotion.matches); scene.render(); dirty = false; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
