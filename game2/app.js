import { createCampaign, CAMPAIGN_ID, LEVEL_COUNT, DIRECTIONS, cellName, bitCount } from './campaign.js';
import { createGame, startGame, maskAt, rotateTile, commission, pauseGame, resumeGame, retryGame } from './engine.js';
import { validCampaignSave } from '../shared/progression.js';

const $ = id => document.getElementById(id), canvas = $('circuit-canvas'), campaign = createCampaign();
let state = createGame(campaign.unlocked), selected = 0, scene = null, frame = 0, recorded = false, suspended = false;
const cells = [], loadRows = [], NS = 'http://www.w3.org/2000/svg';
const typeNames = { wire: 'Wire', source: 'Supply', load: 'Required load', ground: 'Exposed return', spare: 'Parked load', blank: 'Blank' };
const phaseNames = { ready: 'READY', editing: 'ISOLATED', paused: 'PAUSED', won: 'COMMISSIONED', lost: 'REWORK' };
const statusNames = { clear: 'PASSED', short: 'SHORT', overload: 'OVERLOAD', 'unexpected-branch': 'BRANCH', 'open-branch': 'OPEN', 'missing-load': 'MISSING' };

function svgNode(name, attrs) { const element = document.createElementNS(NS, name); for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value)); return element; }
function terminalArt(mask, kind) {
  const svg = svgNode('svg', { viewBox: '0 0 40 40', 'aria-hidden': 'true', focusable: 'false' });
  for (const d of DIRECTIONS) if (mask & d.bit) {
    svg.append(svgNode('path', { d: `M20 20 L${20 + d.dc * 18} ${20 + d.dr * 18}`, class: 'wire' }));
    svg.append(svgNode('circle', { cx: 20 + d.dc * 18, cy: 20 + d.dr * 18, r: 2.7, class: 'contact' }));
  }
  if (kind === 'load' || kind === 'spare') {
    svg.append(svgNode('circle', { cx: 20, cy: 20, r: 8, class: 'part' }));
    svg.append(svgNode('path', { d: 'M15 15 L25 25 M25 15 L15 25', class: 'part' }));
  } else if (kind === 'source') {
    svg.append(svgNode('rect', { x: 11, y: 11, width: 18, height: 18, rx: 3, class: 'part' }));
    svg.append(svgNode('path', { d: 'M15 20 H25 M20 15 V25', class: 'part' }));
  } else if (kind === 'ground') svg.append(svgNode('path', { d: 'M20 10 V20 M10 20 H30 M14 25 H26 M17 30 H23', class: 'part' }));
  else if (kind === 'blank') svg.append(svgNode('circle', { cx: 20, cy: 20, r: 2.5, class: 'part' }));
  return svg;
}
function connectorText(mask) { return DIRECTIONS.filter(direction => mask & direction.bit).map(direction => direction.name).join(', ') || 'none'; }
function draw() {
  if (frame || suspended) return;
  frame = requestAnimationFrame(() => { frame = 0; scene?.draw(state, selected); });
}
function savedText() {
  if (!campaign.completed) return 'Progress saves on this device after commissioning.';
  let stored = false;
  try { const value = JSON.parse(localStorage.getItem(`adigun.campaign.v1.${CAMPAIGN_ID}`) || 'null'); stored = validCampaignSave(value) && value.completed >= campaign.completed; } catch {}
  return `${campaign.completed.toLocaleString()} ${campaign.completed === 1 ? 'job' : 'jobs'} commissioned. ` + (stored ? 'Progress saved on this device.' : 'Progress is available for this session only; browser storage could not confirm a save.');
}
function selectCell(index, focus = false) {
  if (!Number.isInteger(index) || index < 0 || index >= state.config.tiles.length) return;
  selected = index; sync();
  if (focus) { cells[index].button.focus({ preventScroll: true }); cells[index].button.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}
function rotate(direction) { rotateTile(state, selected, direction); sync(); }
function moveSelection(key, focus = false) {
  const size = state.config.size, row = Math.floor(selected / size), column = selected % size;
  if (key === 'ArrowUp') selectCell(Math.max(0, row - 1) * size + column, focus);
  if (key === 'ArrowDown') selectCell(Math.min(size - 1, row + 1) * size + column, focus);
  if (key === 'ArrowLeft') selectCell(row * size + Math.max(0, column - 1), focus);
  if (key === 'ArrowRight') selectCell(row * size + Math.min(size - 1, column + 1), focus);
}
function buildBoard() {
  cells.length = 0; loadRows.length = 0; $('terminal-board').replaceChildren(); $('load-list').replaceChildren();
  $('terminal-board').style.setProperty('--cols', String(state.config.size));
  state.config.tiles.forEach((tile, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'terminal-cell'; button.id = `cell-${index}`; button.dataset.kind = tile.kind;
    const code = document.createElement('span'), art = document.createElement('span'), type = document.createElement('span');
    code.className = 'cell-code'; code.textContent = cellName(index, state.config.size); type.className = 'cell-type'; type.textContent = tile.loadId || typeNames[tile.kind];
    button.append(code, art, type); button.addEventListener('click', () => selectCell(index));
    button.addEventListener('focus', () => { if (selected !== index) selectCell(index); });
    button.addEventListener('keydown', event => {
      if (event.key.startsWith('Arrow')) { event.preventDefault(); moveSelection(event.key, true); }
      if (event.key.toLowerCase() === 'r' || event.key.toLowerCase() === 'l') { event.preventDefault(); rotate(event.key.toLowerCase() === 'r' ? 1 : -1); }
    });
    $('terminal-board').append(button); cells.push({ button, art, mask: null });
  });
  for (const index of state.config.loads) {
    const tile = state.config.tiles[index], row = document.createElement('li'), title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = `${tile.loadId} · ${tile.name} · ${cellName(index, state.config.size)}`;
    detail.textContent = `${tile.resistance} Ω · ${(state.config.voltage / tile.resistance * 1000).toFixed(1)} mA when connected`;
    row.append(title, detail); $('load-list').append(row); loadRows.push({ index, row });
  }
}
function sync() {
  if (state.phase === 'won' && !recorded) { campaign.complete(state.config.level); recorded = true; }
  const config = state.config, tile = config.tiles[selected], editing = state.phase === 'editing';
  const reached = new Set(state.inspection?.energized || []);
  cells.forEach((cell, index) => {
    const mask = maskAt(state, index), tile = config.tiles[index];
    if (cell.mask !== mask) { cell.art.replaceChildren(terminalArt(mask, tile.kind)); cell.mask = mask; }
    cell.button.tabIndex = index === selected ? 0 : -1;
    cell.button.setAttribute('aria-pressed', String(index === selected));
    cell.button.setAttribute('aria-label', `${cellName(index, config.size)} ${tile.loadId || typeNames[tile.kind]}, ${typeNames[tile.kind].toLowerCase()}, terminals ${connectorText(mask)}`);
    cell.button.dataset.trace = String(reached.has(index)); cell.button.dataset.live = String(reached.has(index) && state.phase === 'won');
  });
  for (const item of loadRows) item.row.dataset.powered = String(state.phase === 'won' && reached.has(item.index));
  $('phase').textContent = phaseNames[state.phase]; $('phase').dataset.phase = state.phase;
  $('supply-state').textContent = state.phase === 'won' ? 'SUPPLY ENERGIZED' : 'SUPPLY ISOLATED';
  $('turns-left').textContent = String(config.moveBudget - state.moves); $('turns-used').textContent = `${state.moves} quarter-turns used`;
  $('loads-powered').textContent = state.inspection ? `${state.inspection.poweredLoads.length} / ${config.loads.length}` : '—';
  $('load-target').textContent = `${config.loads.length} required`;
  $('current').textContent = !state.inspection ? '—' : state.inspection.current === null ? 'TRIP' : (state.inspection.current * 1000).toFixed(1);
  $('network-status').textContent = state.inspection ? statusNames[state.inspection.status] : 'PENDING';
  $('network-status').className = !state.inspection ? '' : state.inspection.ok ? 'success' : 'error';
  $('test-count').textContent = `${state.tests} ${state.tests === 1 ? 'test' : 'tests'}`;
  $('selected-label').textContent = `${cellName(selected, config.size)} · ${typeNames[tile.kind]}`;
  $('selected-heading').textContent = `${cellName(selected, config.size)} · ${tile.loadId || typeNames[tile.kind]}`;
  const mask = maskAt(state, selected), shape = bitCount(mask) === 2 ? mask === 5 || mask === 10 ? 'Straight conductor' : 'Elbow conductor' : bitCount(mask) === 3 ? 'Three-way junction' : 'Four-way junction';
  $('terminal-description').textContent = `${tile.kind === 'wire' ? shape : tile.name || typeNames[tile.kind]}. Terminals: ${connectorText(mask)}.`;
  const canRotate = editing && tile.rotatable && state.moves < config.moveBudget;
  $('rotate-cw').disabled = $('rotate-ccw').disabled = !canRotate;
  $('rotation-help').textContent = !tile.rotatable ? 'This module is fixed. Select a rotatable wire.' : `Each quarter-turn costs one move. ${config.moveBudget - state.moves} remain.`;
  $('start').disabled = state.phase !== 'ready'; $('commission').disabled = !editing;
  $('pause').disabled = !editing && state.phase !== 'paused'; $('pause').textContent = state.phase === 'paused' ? 'Resume job' : 'Pause job';
  $('next-level').hidden = state.phase !== 'won' || config.level === LEVEL_COUNT;
  $('level').max = String(campaign.unlocked); $('unlock-status').textContent = campaign.mastered ? 'All 10,000 jobs commissioned' : `Job ${campaign.unlocked.toLocaleString()} of ${LEVEL_COUNT.toLocaleString()} unlocked`;
  $('save-status').textContent = savedText();
  $('message').textContent = state.message; $('message').className = `message ${state.phase === 'won' ? 'success' : state.phase === 'lost' ? 'error' : ''}`;
  draw();
}
function loadJob(requested) {
  const level = Number(requested);
  if (!Number.isInteger(level) || level < 1 || level > campaign.unlocked) { $('level').value = String(state.config.level); $('message').textContent = 'Commission the current unlocked job before loading a later board.'; return; }
  state = createGame(level); selected = 0; recorded = false;
  $('level').value = String(level); $('tier').textContent = state.config.tier;
  $('job-title').textContent = state.config.title; $('mission-brief').textContent = state.config.description;
  $('voltage').textContent = String(state.config.voltage); $('fuse-rating').textContent = String(state.config.fuseCurrent * 1000);
  buildBoard(); sync();
}

$('start').addEventListener('click', () => { startGame(state); sync(); cells[selected].button.focus(); });
$('rotate-cw').addEventListener('click', () => rotate(1)); $('rotate-ccw').addEventListener('click', () => rotate(-1));
$('commission').addEventListener('click', () => { commission(state); sync(); });
$('pause').addEventListener('click', () => { if (state.phase === 'paused') resumeGame(state); else pauseGame(state); sync(); });
$('retry').addEventListener('click', () => { state = retryGame(state); selected = 0; recorded = false; buildBoard(); sync(); $('start').focus(); });
$('next-level').addEventListener('click', () => { loadJob(state.config.level + 1); $('start').focus(); });
$('load-level').addEventListener('click', () => loadJob($('level').value));
$('level').addEventListener('keydown', event => { if (event.key === 'Enter') loadJob($('level').value); });
$('quality').addEventListener('change', draw);
$('view').addEventListener('change', () => { scene?.setView($('view').value); draw(); });
$('reload-graphics').addEventListener('click', () => location.reload());
canvas.addEventListener('keydown', event => {
  if (event.key.startsWith('Arrow')) { event.preventDefault(); moveSelection(event.key); }
  if (event.key === 'Enter' || event.key === 'Backspace') { event.preventDefault(); rotate(event.key === 'Enter' ? 1 : -1); }
});
canvas.addEventListener('stage-lost', () => {
  if (state.phase === 'editing') pauseGame(state);
  $('graphics-fallback').hidden = false; $('quality').disabled = true;
  $('graphics-status').textContent = 'Graphics connection lost. Continue with the terminal board, or reload graphics.'; sync();
});
const resize = new ResizeObserver(draw); resize.observe(canvas);
window.addEventListener('pagehide', event => { suspended = true; cancelAnimationFrame(frame); frame = 0; if (!event.persisted) { resize.disconnect(); scene?.dispose(); } });
window.addEventListener('pageshow', event => { if (event.persisted) { suspended = false; draw(); } });

loadJob(campaign.unlocked);
try {
  const { createCircuitScene } = await import('./scene.js');
  scene = createCircuitScene({ canvas, qualitySelect: $('quality'), status: $('graphics-status'), select: index => selectCell(index) });
  scene.setView($('view').value); draw();
} catch {
  $('graphics-fallback').hidden = false; $('quality').disabled = true; $('view').disabled = true;
  $('graphics-status').textContent = 'WebGL 2 unavailable. The terminal board provides the same complete game.';
}
