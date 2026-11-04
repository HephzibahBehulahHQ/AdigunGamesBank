import { createCampaign, CAMPAIGN_ID, LEVEL_COUNT, binaryWord, decodeWord, oneCount } from './campaign.js';
import { createGame, currentFrame, startGame, toggleBit, latchInput, setSerialBit, setParityBit, clockSerial, transformWord, transmit, pauseGame, resumeGame, retryGame } from './engine.js';
import { validCampaignSave } from '../shared/progression.js';

const $ = id => document.getElementById(id), canvas = $('binary-canvas'), campaign = createCampaign();
let state = createGame(campaign.unlocked), selectedBit = state.config.width - 1, scene = null, frame = 0, recorded = false, suspended = false;
const bits = [], receipts = [];
const phaseLabels = { ready: 'READY', working: 'LINK OPEN', paused: 'PAUSED', won: 'COMMISSIONED', lost: 'LINK FAILED' };

function draw() {
  if (frame || suspended) return;
  frame = requestAnimationFrame(() => { frame = 0; scene?.draw(state, selectedBit); });
}
function savedText() {
  if (!campaign.completed) return 'Progress saves on this device after the complete packet arrives.';
  let durable = false;
  try { const value = JSON.parse(localStorage.getItem(`adigun.campaign.v1.${CAMPAIGN_ID}`) || 'null'); durable = validCampaignSave(value) && value.completed >= campaign.completed; } catch {}
  return `${campaign.completed.toLocaleString()} ${campaign.completed === 1 ? 'packet' : 'packets'} commissioned. ` + (durable ? 'Progress saved on this device.' : 'Progress is available for this session only; browser storage could not confirm a save.');
}
function selectBit(bit, focus = false) {
  if (!Number.isInteger(bit) || bit < 0 || bit >= state.config.width) return;
  selectedBit = bit; sync();
  if (focus) { bits[bit].button.focus({ preventScroll: true }); bits[bit].button.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
function moveSelection(key, focus = false) {
  const width = state.config.width, columns = Math.min(width, 8), visual = width - 1 - selectedBit;
  const column = visual % columns; let next = visual;
  if (key === 'ArrowLeft' && column > 0) next--;
  if (key === 'ArrowRight' && column < columns - 1 && visual + 1 < width) next++;
  if (key === 'ArrowUp' && visual >= columns) next -= columns;
  if (key === 'ArrowDown' && visual + columns < width) next += columns;
  selectBit(width - 1 - next, focus);
}
function act(command) {
  if (command.type === 'bit') { selectedBit = command.bit; toggleBit(state, command.bit); }
  if (command.type === 'serial') setSerialBit(state, 1 - state.serialBit);
  if (command.type === 'parity') setParityBit(state, 1 - state.parityBit);
  if (command.type === 'clock') clockSerial(state);
  if (command.type === 'latch') latchInput(state);
  if (command.type === 'transmit') transmit(state);
  if (['shift-left', 'shift-right', 'rotate-left', 'rotate-right', 'clear'].includes(command.type)) transformWord(state, command.type);
  sync();
}
function buildControls() {
  bits.length = 0; receipts.length = 0; $('input-bits').replaceChildren(); $('packet-list').replaceChildren();
  $('input-bits').style.setProperty('--cols', String(Math.min(state.config.width, 8)));
  for (let bit = state.config.width - 1; bit >= 0; bit--) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'bit-button'; button.id = `bit-${bit}`;
    const label = document.createElement('span'), value = document.createElement('strong'), weight = document.createElement('small');
    label.textContent = `Bit ${bit}`; button.append(label, value, weight);
    button.addEventListener('click', () => act({ type: 'bit', bit }));
    button.addEventListener('focus', () => { if (selectedBit !== bit) selectBit(bit); });
    button.addEventListener('keydown', event => { if (event.key.startsWith('Arrow')) { event.preventDefault(); moveSelection(event.key, true); } });
    $('input-bits').append(button); bits[bit] = { button, value, weight };
  }
  for (const target of state.config.frames) {
    const row = document.createElement('li'), tag = document.createElement('span'), detail = document.createElement('div');
    const value = document.createElement('strong'), mode = document.createElement('small'), status = document.createElement('span');
    tag.className = 'frame-tag'; tag.textContent = `F${target.id}`; detail.className = 'frame-detail';
    value.textContent = String(target.target); mode.textContent = `${target.signed ? 'Signed' : 'Unsigned'} · ${target.parity} parity`;
    detail.append(value, mode, status); row.append(tag, detail); $('packet-list').append(row); receipts.push({ row, status });
  }
}
function sync() {
  if (state.phase === 'won' && !recorded) { campaign.complete(state.config.level); recorded = true; }
  const c = state.config, target = currentFrame(state), working = state.phase === 'working';
  for (let bit = 0; bit < c.width; bit++) {
    const item = bits[bit], value = state.draft >> bit & 1;
    item.button.tabIndex = bit === selectedBit ? 0 : -1; item.button.disabled = !working;
    item.button.dataset.selected = String(bit === selectedBit); item.button.setAttribute('aria-pressed', String(Boolean(value)));
    item.value.textContent = String(value);
    item.weight.textContent = `Weight ${target.signed && bit === c.width - 1 ? '−' : '+'}${2 ** bit}`;
  }
  $('phase').textContent = phaseLabels[state.phase]; $('phase').dataset.phase = state.phase;
  $('scene-status').textContent = `${state.received.length} / ${c.frames.length} FRAMES RECEIVED`;
  $('register-word').textContent = binaryWord(state.word, c.width); $('input-word').textContent = binaryWord(state.draft, c.width);
  $('register-value').textContent = String(decodeWord(state.word, c.width, target.signed));
  $('register-mode').textContent = target.signed ? 'Signed two’s complement' : 'Unsigned';
  $('hex-value').textContent = `0x${state.word.toString(16).toUpperCase().padStart(Math.ceil(c.width / 4), '0')}`;
  $('staging-value').textContent = `Staged decimal: ${decodeWord(state.draft, c.width, target.signed)}`;
  $('received-count').textContent = `${state.received.length} / ${c.frames.length}`;
  $('operations-left').textContent = String(c.operationBudget - state.operations); $('operations-used').textContent = `${state.operations} used`;
  $('faults-left').textContent = String(c.errorLimit - state.errors); $('fault-count').textContent = `${state.errors} rejected ${state.errors === 1 ? 'frame' : 'frames'}`;
  $('clock-count').textContent = String(state.clocks); $('shifted-out').textContent = state.shiftedOut === null ? 'No shifted-out bit' : `Last bit out: ${state.shiftedOut}`;
  $('frame-number').textContent = state.phase === 'won' ? 'Packet complete' : `Frame ${state.frameIndex + 1} of ${c.frames.length}`;
  $('target-value').textContent = String(target.target); $('frame-mode').textContent = `${target.signed ? 'Signed' : 'Unsigned'} · ${c.width} bits`;
  $('parity-rule').textContent = `${target.parity === 'even' ? 'Even' : 'Odd'} parity: total ones, including the parity bit, must be ${target.parity}.`;
  $('parity').textContent = `Parity bit: ${state.parityBit}`; $('parity').setAttribute('aria-pressed', String(Boolean(state.parityBit)));
  $('serial-data').textContent = `Serial input: ${state.serialBit}`; $('serial-data').setAttribute('aria-pressed', String(Boolean(state.serialBit)));
  const ones = oneCount(state.word, c.width);
  $('parity-state').textContent = `Data ones: ${ones}. Total with parity: ${ones + state.parityBit} (${(ones + state.parityBit) % 2 ? 'odd' : 'even'}).`;
  for (const id of ['latch', 'serial-data', 'parity', 'clock', 'clear', 'shift-left', 'shift-right', 'rotate-left', 'rotate-right', 'transmit']) $(id).disabled = !working;
  $('start').disabled = state.phase !== 'ready'; $('pause').disabled = !working && state.phase !== 'paused';
  $('pause').textContent = state.phase === 'paused' ? 'Resume mission' : 'Pause mission';
  $('next-level').hidden = state.phase !== 'won' || c.level === LEVEL_COUNT;
  receipts.forEach((item, index) => {
    const received = index < state.received.length;
    item.row.dataset.state = received ? 'received' : index === state.frameIndex ? 'current' : 'queued';
    item.status.textContent = received ? `Received ${binaryWord(state.received[index].word, c.width)} · P${state.received[index].parity}` : index === state.frameIndex ? 'Current frame' : 'Queued';
  });
  $('operation-log').replaceChildren(...(state.log.length ? state.log : [{ action: 'No operations yet.', operation: null }]).map(item => {
    const li = document.createElement('li'); li.textContent = item.operation === null ? item.action : `${item.operation}. ${item.action} → ${binaryWord(item.word, c.width)}`; return li;
  }));
  $('level').max = String(campaign.unlocked); $('unlock-status').textContent = campaign.mastered ? 'All 10,000 packets commissioned' : `Mission ${campaign.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`;
  $('save-status').textContent = savedText(); $('message').textContent = state.message;
  $('message').className = `message ${state.phase === 'won' ? 'success' : state.phase === 'lost' ? 'error' : ''}`;
  draw();
}
function loadMission(requested) {
  const level = Number(requested);
  if (!Number.isInteger(level) || level < 1 || level > campaign.unlocked) { $('level').value = String(state.config.level); $('message').textContent = 'Commission the current unlocked packet before loading a later mission.'; return; }
  state = createGame(level); selectedBit = state.config.width - 1; recorded = false;
  $('level').value = String(level); $('tier').textContent = state.config.tier; $('mission-title').textContent = state.config.title;
  $('mission-brief').textContent = state.config.description; $('word-width').textContent = `${state.config.width}-bit register`; $('packet-size').textContent = `${state.config.frames.length} ordered frames`;
  buildControls(); sync();
}
for (const [id, type] of [['latch', 'latch'], ['serial-data', 'serial'], ['parity', 'parity'], ['clock', 'clock'], ['transmit', 'transmit'], ['clear', 'clear'], ['shift-left', 'shift-left'], ['shift-right', 'shift-right'], ['rotate-left', 'rotate-left'], ['rotate-right', 'rotate-right']]) $(id).addEventListener('click', () => act({ type }));
$('start').addEventListener('click', () => { startGame(state); sync(); bits[selectedBit].button.focus(); });
$('pause').addEventListener('click', () => { if (state.phase === 'paused') resumeGame(state); else pauseGame(state); sync(); });
$('retry').addEventListener('click', () => { state = retryGame(state); selectedBit = state.config.width - 1; recorded = false; buildControls(); sync(); $('start').focus(); });
$('next-level').addEventListener('click', () => { loadMission(state.config.level + 1); $('start').focus(); });
$('load-level').addEventListener('click', () => loadMission($('level').value));
$('level').addEventListener('keydown', event => { if (event.key === 'Enter') loadMission($('level').value); });
$('quality').addEventListener('change', draw); $('view').addEventListener('change', () => { scene?.setView($('view').value); draw(); });
$('reload-graphics').addEventListener('click', () => location.reload());
canvas.addEventListener('keydown', event => {
  if (event.key.startsWith('Arrow')) { event.preventDefault(); moveSelection(event.key); }
  if (['Enter', ' '].includes(event.key)) { event.preventDefault(); act({ type: 'bit', bit: selectedBit }); }
  const shortcut = { l: 'latch', c: 'clock', t: 'transmit' }[event.key.toLowerCase()];
  if (shortcut && !event.repeat) { event.preventDefault(); act({ type: shortcut }); }
});
canvas.addEventListener('stage-lost', () => {
  if (state.phase === 'working') pauseGame(state);
  $('graphics-fallback').hidden = false; $('quality').disabled = true;
  $('graphics-status').textContent = 'Graphics connection lost. Continue with the register controls or reload graphics.'; sync();
});
const resize = new ResizeObserver(draw); resize.observe(canvas);
window.addEventListener('pagehide', event => { suspended = true; cancelAnimationFrame(frame); frame = 0; if (!event.persisted) { resize.disconnect(); scene?.dispose(); } });
window.addEventListener('pageshow', event => { if (event.persisted) { suspended = false; draw(); } });

loadMission(campaign.unlocked);
try {
  const { createRegisterScene } = await import('./scene.js');
  scene = createRegisterScene({ canvas, qualitySelect: $('quality'), status: $('graphics-status'), action: act });
  scene.setView($('view').value); draw();
} catch {
  $('graphics-fallback').hidden = false; $('quality').disabled = true; $('view').disabled = true;
  $('graphics-status').textContent = 'WebGL 2 unavailable. The register controls provide the same complete mission.';
}
