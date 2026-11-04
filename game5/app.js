import { campaign, validCampaignSave, LEVEL_COUNT } from '../shared/progression.js';
import { CAMPAIGN_ID, BAND_NAMES, BAND_COLORS, createGame, reveal, resolvePair, visibleCard, remainingMoves, formatOhms } from './engine.js';

const $ = id => document.getElementById(id), canvas = $('resistor-canvas');
const progress = campaign(CAMPAIGN_ID), saveKey = `adigun.campaign.v1.${CAMPAIGN_ID}`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let state = createGame(progress.unlocked), selected = 0, recorded = false, scene = null, dirty = true;
let frameId = 0, previous = 0, buttons = [];
const element = (tag, text, className) => { const node = document.createElement(tag); if (text) node.textContent = text; if (className) node.className = className; return node; };
const titleCase = name => name[0].toUpperCase() + name.slice(1);

function confirmSaved() {
  try { const record = JSON.parse(localStorage.getItem(saveKey) || 'null'); return validCampaignSave(record) && record.completed >= progress.completed; }
  catch { return false; }
}
function saveText() {
  if (!progress.completed) return 'Completed challenges save on this device.';
  return `${progress.completed.toLocaleString()} challenges completed. ` + (confirmSaved() ? 'Progress saved on this device.' : 'Progress is available for this session only; browser storage could not confirm a save.');
}
function message(text, kind = '') { $('message').textContent = text; $('message').className = `message ${kind}`; }
function bandDiagram(component) {
  const model = element('span', '', 'mini-resistor'), body = element('span', '', 'mini-body'); model.setAttribute('aria-hidden', 'true');
  for (const name of component.bands) { const band = element('i', '', 'mini-band'); band.style.backgroundColor = BAND_COLORS[name]; body.append(band); }
  model.append(body); return model;
}
function inspection(id, component, index, first) {
  const panel = $(id); panel.replaceChildren(element('h3', first ? 'FIRST COMPONENT' : 'SECOND COMPONENT'));
  if (!component) { panel.append(element('p', first ? 'Lift a tray cover to inspect its resistor.' : 'Choose a second covered tray to compare.', 'muted')); return; }
  panel.append(element('strong', `Tray ${index + 1} · ${component.label}`));
  const bandSequence = element('div', '', 'band-sequence');
  const meaning = [Math.floor(component.mantissa / 10), component.mantissa % 10, `×${10 ** component.exponent}`, `±${component.tolerance}%`];
  component.bands.forEach((name, i) => {
    const item = element('span'), swatch = element('i'); swatch.setAttribute('aria-hidden', 'true'); swatch.style.backgroundColor = BAND_COLORS[name];
    item.append(swatch, element('b', String(meaning[i])), element('span', titleCase(name))); bandSequence.append(item);
  });
  panel.append(bandSequence, element('p', `Nominal tolerance interval: ${formatOhms(component.lowerOhms)} to ${formatOhms(component.upperOhms)}.`));
}
function buildBoard() {
  const grid = $('component-grid'); grid.replaceChildren(); buttons = [];
  grid.style.setProperty('--columns', state.config.columns);
  for (let index = 0; index < state.config.deck.length; index++) {
    const button = element('button', '', 'component-card'); button.type = 'button'; button.id = `tray-${index + 1}`; button.dataset.index = String(index);
    button.addEventListener('click', () => select(index, true));
    button.addEventListener('focus', () => { selected = index; updateSelection(); });
    button.addEventListener('keydown', event => boardKeys(event, index, true));
    buttons.push(button); grid.append(button);
  }
}
function updateSelection() {
  buttons.forEach((button, index) => button.classList.toggle('focus-card', index === selected)); dirty = true;
}
function sync() {
  if (state.phase === 'won' && !recorded) { progress.complete(state.config.level); recorded = true; }
  const compare = state.phase === 'compare';
  $('phase').dataset.phase = state.phase; $('phase').dataset.revealed = String(state.revealed.length);
  $('phase').textContent = ({ ready: state.revealed.length ? 'FIND ITS PARTNER' : 'LIFT A COVER', compare: state.comparison === 'match' ? 'MATCH FOUND' : 'COMPARE THE VALUES', won: 'BENCH CLEARED', lost: 'MOVE BUDGET USED' })[state.phase];
  $('tier').textContent = state.config.tier; $('pairs').textContent = `${state.matches} / ${state.config.pairs}`;
  $('moves').textContent = `${state.moves} / ${state.config.budget}`; $('remaining').textContent = String(remainingMoves(state));
  $('components-count').textContent = `${state.config.deck.length - state.matches * 2} components still to pair`;
  $('minimum-moves').textContent = `${state.config.pairs - state.matches} matches still needed`;
  $('level').max = String(progress.unlocked);
  $('unlock-status').textContent = progress.mastered ? 'All 10,000 challenges cleared' : `Challenge ${progress.unlocked.toLocaleString()} of 10,000 unlocked`;
  for (let index = 0; index < buttons.length; index++) {
    const button = buttons[index], component = visibleCard(state, index), matched = state.matched[index];
    const status = matched ? 'matched' : component ? 'revealed' : 'covered';
    button.dataset.state = status; button.setAttribute('aria-pressed', String(Boolean(component)));
    button.disabled = state.phase !== 'ready' || matched || state.revealed.includes(index);
    const head = element('span', '', 'card-top'); head.append(element('span', `Tray ${index + 1}`), element('span', titleCase(status), 'card-state'));
    button.replaceChildren(head);
    if (component) button.append(bandDiagram(component), element('strong', component.label, 'card-value'), element('span', component.pattern, 'card-pattern'), element('span', component.bands.map(titleCase).join(' · '), 'card-colors'));
    else button.append(element('span', String(index + 1).padStart(2, '0'), 'cover-mark'), element('strong', 'Reveal component', 'card-value'), element('span', 'Opaque cover · value hidden', 'card-colors'));
  }
  inspection('inspection-a', state.revealed.length ? visibleCard(state, state.revealed[0]) : null, state.revealed[0], true);
  inspection('inspection-b', state.revealed.length > 1 ? visibleCard(state, state.revealed[1]) : null, state.revealed[1], false);
  $('resolve').hidden = !compare;
  $('resolve').textContent = state.comparison === 'match' ? 'Store matched pair' : 'Cover mismatched pair';
  $('next-level').hidden = !(state.phase === 'won' && state.config.level < progress.unlocked);
  $('save-status').textContent = saveText();
  if (state.phase === 'won') {
    message(`Bench cleared: ${state.matches} matching pairs in ${state.moves} moves. ${progress.mastered ? 'All 10,000 challenges completed.' : 'The next challenge is unlocked.'}`, 'success');
    $('comparison').textContent = 'Every pair has been stored. Choose the next challenge or replay this layout.';
  } else if (state.phase === 'lost') {
    message(`Move budget used: ${state.matches} of ${state.config.pairs} pairs stored in ${state.moves} moves. Retry the same layout and use what you remember.`, 'error');
    $('comparison').textContent = 'This attempt did not clear the bench. No new campaign level was awarded.';
  } else if (compare) {
    const [a, b] = state.revealed.map(index => visibleCard(state, index));
    message(state.comparison === 'match' ? `Match found: two ${a.label} resistors. Store the pair to keep it.` : `Different values: ${a.label} and ${b.label}. Remember their trays before covering them.`, state.comparison === 'match' ? 'success' : '');
    $('comparison').textContent = state.comparison === 'match' ? 'Nominal resistance and tolerance match.' : 'These parts have different nominal values or tolerances.';
  } else {
    message(state.revealed.length ? `Tray ${state.revealed[0] + 1} is revealed. Choose a different covered tray to complete this move.` : 'Choose any two covered trays. Match their nominal resistance and tolerance.');
    $('comparison').textContent = 'No timer. Read the values at your own pace.';
  }
  updateSelection();
}
function select(index, open = false) {
  if (!Number.isInteger(index) || index < 0 || index >= buttons.length) return;
  selected = index;
  if (open && reveal(state, index)) sync(); else updateSelection();
}
function comparePair() {
  if (!resolvePair(state)) return;
  sync();
  if (state.phase === 'ready') {
    const next = buttons.findIndex((button, index) => !state.matched[index]);
    if (next >= 0) { selected = next; updateSelection(); buttons[next].focus({ preventScroll: true }); }
  } else if (state.phase === 'won' && !$('next-level').hidden) $('next-level').focus({ preventScroll: true });
  else $('retry').focus({ preventScroll: true });
}
function reset(level = state.config.level) {
  state = createGame(level); selected = 0; recorded = false; $('level').value = String(state.config.level);
  buildBoard(); sync(); dirty = true;
}
function boardKeys(event, index = selected, fromButton = false) {
  const key = event.key.toLowerCase(), columns = fromButton ? Math.max(1, getComputedStyle($('component-grid')).gridTemplateColumns.split(' ').length) : state.config.columns;
  let target = index;
  if (key === 'arrowleft' && index % columns > 0) target--;
  else if (key === 'arrowright' && index % columns < columns - 1 && index + 1 < buttons.length) target++;
  else if (key === 'arrowup' && index - columns >= 0) target -= columns;
  else if (key === 'arrowdown' && index + columns < buttons.length) target += columns;
  if (key.startsWith('arrow')) {
    event.preventDefault(); selected = target; updateSelection();
    if (fromButton && !buttons[target].disabled) buttons[target].focus();
  } else if ((key === 'enter' || key === ' ') && !fromButton) { event.preventDefault(); if (!event.repeat) select(selected, true); }
  else if (key === 'c') { event.preventDefault(); if (!event.repeat) comparePair(); }
  else if (key === 'r') { event.preventDefault(); if (!event.repeat) reset(); }
}

$('resolve').addEventListener('click', comparePair);
$('retry').addEventListener('click', () => reset());
$('next-level').addEventListener('click', () => { if (state.phase === 'won' && state.config.level < progress.unlocked) reset(state.config.level + 1); });
$('load-level').addEventListener('click', () => {
  const level = Number($('level').value);
  if (!Number.isInteger(level) || level < 1 || level > progress.unlocked || level > LEVEL_COUNT) { message(`Choose an unlocked challenge from 1 to ${progress.unlocked.toLocaleString()}.`, 'error'); return; }
  reset(level);
});
canvas.addEventListener('keydown', event => boardKeys(event));
$('quality').addEventListener('change', () => { dirty = true; });
window.addEventListener('resize', () => { dirty = true; });
window.addEventListener('storage', event => { if (event.key === saveKey) sync(); });
canvas.addEventListener('stage-lost', () => {
  scene?.dispose(); scene = null; $('quality').disabled = true; $('graphics-fallback').hidden = false;
  $('graphics-status').textContent = 'Graphics connection lost. The numbered trays keep the same matching game active.';
  canvas.removeAttribute('data-renderer'); canvas.removeAttribute('data-resolution');
});
for (const [digit, name] of BAND_NAMES.entries()) {
  const row = element('div'), swatch = element('i'); swatch.style.backgroundColor = BAND_COLORS[name]; swatch.setAttribute('aria-hidden', 'true');
  row.append(swatch, element('span', titleCase(name)), element('b', String(digit))); $('band-legend').append(row);
}

function frame(time) {
  const dt = previous ? Math.min(0.1, (time - previous) / 1000) : 0; previous = time;
  if (scene) { const moving = scene.update(state, selected, dt, reducedMotion.matches); if (dirty || moving) scene.render(); }
  dirty = false; frameId = requestAnimationFrame(frame);
}
reset(); frameId = requestAnimationFrame(frame);
try {
  const { createResistorScene } = await import('./scene.js');
  scene = createResistorScene({ canvas, qualitySelect: $('quality'), status: $('graphics-status'), onPick: index => select(index, true) }); dirty = true;
} catch {
  $('quality').disabled = true; $('graphics-fallback').hidden = false;
  $('graphics-status').textContent = 'WebGL 2 unavailable. Numbered trays use the same components, moves and campaign.';
  canvas.removeAttribute('data-renderer'); canvas.removeAttribute('data-resolution');
}
window.addEventListener('pagehide', event => { cancelAnimationFrame(frameId); if (!event.persisted) scene?.dispose(); });
window.addEventListener('pageshow', event => { if (event.persisted) { previous = 0; dirty = true; frameId = requestAnimationFrame(frame); } });
