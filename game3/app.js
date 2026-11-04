import { campaign, validLevel } from '../shared/progression.js';
import { RESISTORS, VOLTAGES, FUSES, TOPOLOGIES, initialSetup, challengeFor, checkChallenge, simulateCircuit } from './circuit.js';
import { createBench } from './bench.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'adigun.electronicer.bench.v1';
let storage;
try { storage = globalThis.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } }; }
const progress = campaign('electronicer', storage);
let level = progress.unlocked, challenge = challengeFor(level), setup = initialSetup(), solved = false, persistent = true;
let bench;

const option = (value, text) => { const element = document.createElement('option'); element.value = value; element.textContent = text; return element; };
for (const [key, value] of Object.entries(TOPOLOGIES)) $('topology').append(option(key, value.name));
for (const voltage of VOLTAGES) $('voltage').append(option(voltage, `${voltage} V`));
for (const fuse of FUSES) $('fuse').append(option(fuse, `${Math.round(fuse * 1000)} mA`));
for (let i = 0; i < 4; i++) {
  const row = document.createElement('div'); row.className = 'resistor-row'; row.id = `resistor-row-${i}`;
  row.innerHTML = `<div><label for="r${i + 1}">R${i + 1} resistance (Ω)</label><select id="r${i + 1}"></select></div><label class="lead-label"><input id="link${i + 1}" type="checkbox"> R${i + 1} lead</label>`;
  $('resistor-controls').append(row);
  for (const resistance of RESISTORS) $(`r${i + 1}`).append(option(resistance, `${resistance.toLocaleString()} Ω`));
}

function labelFor(key) {
  if (key === 'totalCurrent') return 'Total supply current';
  const [kind, index] = key.split(':'); return `${kind === 'voltage' ? 'Voltage across' : 'Current through'} R${Number(index) + 1}`;
}
function measurement(value, unit) { return unit === 'A' ? `${(value * 1000).toFixed(3)} mA` : `${value.toFixed(3)} V`; }
function announce(text, success = false) { $('message').textContent = text; $('message').className = `message${success ? ' success' : ''}`; }

function save() {
  try { storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, level, setup })); persistent = true; } catch { persistent = false; }
  $('save-status').textContent = persistent ? `${progress.completed.toLocaleString()} levels completed · ${progress.unlocked.toLocaleString()} unlocked. Saved on this browser.` : `${progress.completed.toLocaleString()} levels completed this session. Browser storage is unavailable.`;
}

function restore() {
  try {
    const saved = JSON.parse(storage.getItem(SAVE_KEY) || 'null');
    const value = saved?.setup;
    if (saved?.version !== 1 || saved.level !== level || !value || !TOPOLOGIES[value.topology] || !VOLTAGES.includes(value.voltage) || !FUSES.includes(value.fuse)) return false;
    if (!Array.isArray(value.resistances) || value.resistances.length !== 4 || !value.resistances.every(r => RESISTORS.includes(r))) return false;
    if (!Array.isArray(value.links) || value.links.length !== 4 || !value.links.every(v => typeof v === 'boolean')) return false;
    if (!['bypass', 'and', 'or'].includes(value.contactMode)) return false;
    setup = { ...initialSetup(), topology: value.topology, voltage: value.voltage, fuse: value.fuse, resistances: [...value.resistances], links: [...value.links], contactMode: value.contactMode, contactA: value.contactA === true, contactB: value.contactB === true, blown: value.blown === true, power: false };
    return true;
  } catch { return false; }
}

function syncInputs() {
  $('topology').value = setup.topology; $('voltage').value = setup.voltage; $('fuse').value = setup.fuse;
  $('contact-mode').value = setup.contactMode; $('contact-a').checked = setup.contactA; $('contact-b').checked = setup.contactB;
  $('contact-a').disabled = $('contact-b').disabled = setup.contactMode === 'bypass';
  const count = TOPOLOGIES[setup.topology].edges.length;
  for (let i = 0; i < 4; i++) {
    $(`r${i + 1}`).value = setup.resistances[i]; $(`link${i + 1}`).checked = setup.links[i];
    $(`r${i + 1}`).disabled = $(`link${i + 1}`).disabled = i >= count;
    $(`resistor-row-${i}`).classList.toggle('inactive', i >= count);
  }
  $('level').value = level; $('level').max = progress.unlocked;
  $('power').textContent = setup.power ? 'Power off' : 'Power on'; $('power').setAttribute('aria-pressed', String(setup.power));
  $('replace-fuse').disabled = !setup.blown || setup.power;
  $('next-level').disabled = !solved || level === 10000;
  $('next-level').textContent = level === 10000 ? (solved ? 'Campaign complete' : 'Final level') : 'Next level →';
}

function update() {
  const result = simulateCircuit(setup);
  if (result.tripped && !setup.blown) {
    setup.blown = true;
    announce(`Fuse opened: ${(result.prospectiveCurrent * 1000).toFixed(2)} mA exceeded its ${Math.round(setup.fuse * 1000)} mA rating. Turn power off, correct the circuit, then replace the fuse.`);
  }
  syncInputs();
  $('meter-voltage').textContent = measurement(result.supplyVoltage, 'V');
  $('meter-current').textContent = measurement(result.current, 'A');
  $('meter-resistance').textContent = Number.isFinite(result.equivalentResistance) ? `${result.equivalentResistance.toFixed(2)} Ω` : 'Open circuit';
  $('meter-power').textContent = `${result.power.toFixed(3)} W`;
  $('circuit-state').textContent = result.status === 'off' && setup.power ? 'Contacts open' : { running: 'Circuit live', off: 'Supply off', open: 'Open lead', tripped: 'Fuse tripped' }[result.status];
  $('circuit-state').className = `badge ${result.status}`;
  const checked = checkChallenge(challenge, setup);
  for (let i = 0; i < challenge.objectives.length; i++) {
    const check = checked.checks[i + 5];
    $(`target-${i}`).classList.toggle('pass', check.passed && result.status === 'running');
    $(`actual-${i}`).textContent = `Measured ${measurement(check.actual, check.unit)} · ±0.5% target`;
  }
  $('measurements').replaceChildren(...result.components.map((component, i) => {
    const row = document.createElement('tr');
    for (const text of [`R${i + 1}`, `${component.r.toLocaleString()} Ω`, `${component.voltage.toFixed(3)} V`, `${(component.current * 1000).toFixed(3)} mA`, `${component.power.toFixed(3)} W`, component.enabled ? 'Connected' : 'Open']) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); }
    return row;
  }));
  bench?.render(setup, result);
  save();
  return checked;
}

function brief() {
  $('level-label').textContent = `Level ${level.toLocaleString()} / 10,000`; $('tier').textContent = challenge.tier;
  $('brief').textContent = `Build ${TOPOLOGIES[challenge.topology].name.toLowerCase()} on a ${challenge.voltage} V source. Match the meter targets using the available resistors. The fuse must be no larger than ${Math.round(challenge.fuseLimit * 1000)} mA and at least 25% above the operating current.`;
  $('targets').innerHTML = challenge.objectives.map((target, i) => `<div class="target-item" id="target-${i}"><span>${labelFor(target.key)}</span><strong>${measurement(target.target, target.unit)}</strong><small id="actual-${i}">Measured values appear here.</small></div>`).join('');
  const logic = { bypass: 'Direct link: contact switches are bypassed.', and: 'AND contact logic: the source feeds the network only when both A and B are closed.', or: 'OR contact logic: either A or B can close the source path.' }[challenge.contactMode];
  $('logic-target').textContent = `${logic} Truth table (AB 00, 01, 10, 11): ${challenge.truthTable.join(', ')}.`;
  const count = TOPOLOGIES[challenge.topology].edges.length;
  const components = challenge.solution.resistances.slice(0, count).map((r, i) => `R${i + 1} = ${r.toLocaleString()} Ω`).join('; ');
  $('guide').innerHTML = `<p><strong>One verified wiring solution</strong></p><ol><li>Turn the supply off. Select ${TOPOLOGIES[challenge.topology].name} and ${challenge.voltage} V.</li><li>Fit ${components}. Connect each of the ${count} active resistor leads.</li><li>Set the fuse to ${Math.round(challenge.fuseLimit * 1000)} mA. Use ${challenge.contactMode === 'bypass' ? 'the direct link' : `${challenge.contactMode.toUpperCase()} contact wiring and close A and B`}.</li><li>If a fuse has tripped, replace it with the supply off. Power on and verify the meter targets.</li></ol><p>Network resistance: ${TOPOLOGIES[challenge.topology].formula}. Total current follows I = V / R. The node solver also checks the branch currents and voltage drops.</p>`;
  $('guide').hidden = true; $('show-guide').setAttribute('aria-expanded', 'false'); $('show-guide').textContent = 'Show wiring guidance';
  document.body.dataset.level = String(level);
}

function edited(text = 'Circuit updated. Read the meters and verify the targets when you are ready.') {
  solved = false; announce(text); update();
}
function loadLevel(value) {
  if (!Number.isInteger(value) || value < 1 || value > progress.unlocked) { announce(`Choose an unlocked level from 1 to ${progress.unlocked.toLocaleString()}.`); return; }
  level = validLevel(value); challenge = challengeFor(level); setup = initialSetup(); solved = false;
  brief(); update(); announce(`Level ${level.toLocaleString()}: assemble the circuit described in the commissioning brief.`);
}

$('topology').addEventListener('change', () => { setup.topology = $('topology').value; edited('Patch-panel wiring changed. Inspect the new connections before powering the circuit.'); });
$('voltage').addEventListener('change', () => { setup.voltage = Number($('voltage').value); edited(); });
$('fuse').addEventListener('change', () => { setup.fuse = Number($('fuse').value); edited(setup.blown ? 'The new rating is selected. Turn power off and replace the open fuse.' : 'Fuse rating changed. Check the current and required margin.'); });
$('contact-mode').addEventListener('change', () => { setup.contactMode = $('contact-mode').value; edited(); });
$('contact-a').addEventListener('change', () => { setup.contactA = $('contact-a').checked; edited(); });
$('contact-b').addEventListener('change', () => { setup.contactB = $('contact-b').checked; edited(); });
for (let i = 0; i < 4; i++) {
  $(`r${i + 1}`).addEventListener('change', () => { setup.resistances[i] = Number($(`r${i + 1}`).value); edited(); });
  $(`link${i + 1}`).addEventListener('change', () => { setup.links[i] = $(`link${i + 1}`).checked; edited(); });
}
$('power').addEventListener('click', () => { setup.power = !setup.power; edited(setup.power ? 'Supply enabled. Check the live current, voltages and fuse.' : 'Supply off. You can replace a tripped fuse.'); });
$('replace-fuse').addEventListener('click', () => { if (setup.power || !setup.blown) return; setup.blown = false; edited('Fresh fuse installed. Verify the rating and circuit before switching the supply on.'); });
$('verify').addEventListener('click', () => {
  const checked = update();
  if (checked.passed) {
    solved = true; progress.complete(level); syncInputs(); save();
    announce(level === 10000 ? 'Professional Master campaign complete. All 10,000 commissioning tasks are recorded as cleared on this browser.' : `Level ${level.toLocaleString()} commissioned: wiring, logic, meter targets and fuse margin all passed. The next level is unlocked.`, true);
  } else {
    const failed = checked.checks.filter(check => !check.passed).map(check => check.target === undefined ? check.label : labelFor(check.label));
    announce(`${checked.result.tripped ? 'Fuse is open. Turn the supply off and replace it after correcting the circuit. ' : ''}Still to resolve: ${failed.join('; ')}.`);
  }
});
$('next-level').addEventListener('click', () => { if (solved && level < 10000) { loadLevel(level + 1); $('topology').focus(); } });
$('retry').addEventListener('click', () => loadLevel(level));
$('load-level').addEventListener('click', () => loadLevel(Number($('level').value)));
$('show-guide').addEventListener('click', () => { const showing = $('guide').hidden; $('guide').hidden = !showing; $('show-guide').setAttribute('aria-expanded', String(showing)); $('show-guide').textContent = showing ? 'Hide wiring guidance' : 'Show wiring guidance'; });
$('view-top').addEventListener('click', () => bench?.view('top'));
$('view-angle').addEventListener('click', () => bench?.view('bench'));

try {
  bench = createBench({ canvas: $('circuit-view'), qualitySelect: $('quality'), status: $('render-status'), onToggleLead: index => { setup.links[index] = !setup.links[index]; edited(`R${index + 1} lead ${setup.links[index] ? 'connected' : 'disconnected'}.`); } });
} catch (error) {
  $('render-status').textContent = `3D rendering unavailable: ${error.message}. Circuit controls and meters still work.`;
  $('quality').disabled = true;
}
const restored = restore();
brief(); update();
if (restored) announce('Bench settings restored with the supply off. Your completed levels are saved.');
window.addEventListener('pagehide', () => bench?.dispose(), { once: true });
