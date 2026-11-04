import { randomFor, tierFor, validLevel } from '../shared/progression.js';

export const CAMPAIGN_ID = 'resistor-match';
export const BAND_NAMES = Object.freeze(['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white']);
export const BAND_COLORS = Object.freeze({ black: '#151515', brown: '#743f21', red: '#ce2434', orange: '#f47c1f', yellow: '#f5d52e', green: '#218743', blue: '#2268b5', violet: '#8147a5', grey: '#8b939c', white: '#f2f1e9', gold: '#c8a54d', silver: '#bdc7d1' });
export const TOLERANCE_BANDS = Object.freeze({ 2: 'red', 5: 'gold', 10: 'silver' });
const E6 = [10, 15, 22, 33, 47, 68];
const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
export const TIER_RULES = Object.freeze([
  { pairs: 4, columns: 4, allowance: 10, exponents: [0, 2], series: E6, tolerances: [5] },
  { pairs: 6, columns: 4, allowance: 8, exponents: [0, 3], series: E12, tolerances: [5] },
  { pairs: 8, columns: 4, allowance: 6, exponents: [-1, 4], series: E24, tolerances: [5, 10] },
  { pairs: 10, columns: 5, allowance: 4, exponents: [-2, 5], series: E24, tolerances: [2, 5, 10] },
  { pairs: 12, columns: 6, allowance: 4, exponents: [-2, 6], series: E24, tolerances: [2, 5, 10] }
]);

export function formatOhms(value) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Resistance must be a finite, non-negative number of ohms.');
  const unit = value >= 1e6 ? ['MΩ', 1e6] : value >= 1000 ? ['kΩ', 1000] : ['Ω', 1];
  return `${Number((value / unit[1]).toFixed(6))} ${unit[0]}`;
}

export function resistor(mantissa, exponent, tolerance = 5) {
  if (!Number.isInteger(mantissa) || mantissa < 10 || mantissa > 99) throw new RangeError('Four-band exercises require two significant digits, from 10 to 99.');
  if (!Number.isInteger(exponent) || exponent < -2 || exponent > 9) throw new RangeError('Multiplier exponent must be between -2 and 9.');
  if (!(tolerance in TOLERANCE_BANDS)) throw new RangeError('Use the supported 2%, 5% or 10% tolerance.');
  const centiohms = mantissa * 10 ** (exponent + 2);
  const multiplierBand = exponent === -2 ? 'silver' : exponent === -1 ? 'gold' : BAND_NAMES[exponent];
  const bands = [BAND_NAMES[Math.floor(mantissa / 10)], BAND_NAMES[mantissa % 10], multiplierBand, TOLERANCE_BANDS[tolerance]];
  const ohms = centiohms / 100;
  return { key: `${mantissa}:${exponent}:${tolerance}`, mantissa, exponent, tolerance, centiohms, ohms,
    label: `${formatOhms(ohms)} ±${tolerance}%`, bands,
    pattern: `${Math.floor(mantissa / 10)} · ${mantissa % 10} · ×${10 ** exponent} · ±${tolerance}%`,
    lowerOhms: centiohms * (100 - tolerance) / 10000,
    upperOhms: centiohms * (100 + tolerance) / 10000 };
}

export function decodeBands(bands) {
  if (!Array.isArray(bands) || bands.length !== 4) throw new TypeError('Provide exactly four band names.');
  const [first, second, multiplier, toleranceBand] = bands;
  const a = BAND_NAMES.indexOf(first), b = BAND_NAMES.indexOf(second);
  const exponent = multiplier === 'silver' ? -2 : multiplier === 'gold' ? -1 : BAND_NAMES.indexOf(multiplier);
  const tolerance = Number(Object.entries(TOLERANCE_BANDS).find(([, name]) => name === toleranceBand)?.[0]);
  if (a < 1 || b < 0 || (!BAND_NAMES.includes(multiplier) && !['gold', 'silver'].includes(multiplier)) || !Number.isFinite(tolerance)) throw new RangeError('Unsupported or invalid four-band code.');
  return resistor(a * 10 + b, exponent, tolerance);
}

function shuffle(items, random) {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [output[i], output[j]] = [output[j], output[i]]; }
  return output;
}

export function configurationFor(input = 1) {
  const level = validLevel(input), tierIndex = Math.floor((level - 1) / 2000), rule = TIER_RULES[tierIndex];
  const random = randomFor(5009 + level * 104729), pool = [];
  for (let exponent = rule.exponents[0]; exponent <= rule.exponents[1]; exponent++) for (const mantissa of rule.series) pool.push({ mantissa, exponent });
  let components = shuffle(pool, random).slice(0, rule.pairs).map(({ mantissa, exponent }) => resistor(mantissa, exponent, rule.tolerances[Math.floor(random() * rule.tolerances.length)]));
  if (level === 1) components = [resistor(10, 0), resistor(10, 1), resistor(10, 2), resistor(47, 2)];
  let deck = shuffle(components.flatMap((component, pair) => [{ pair, component }, { pair, component }]), random);
  if (level === 1) deck = [0, 1, 2, 3, 1, 0, 3, 2].map(pair => ({ pair, component: components[pair] }));
  return { version: 1, level, tier: tierFor(level), tierIndex, pairs: rule.pairs, columns: rule.columns,
    rows: Math.ceil(rule.pairs * 2 / rule.columns), budget: rule.pairs + rule.allowance,
    components, deck: deck.map((card, index) => ({ ...card, index })) };
}

export function createGame(level = 1) {
  const config = configurationFor(level);
  return { config, phase: 'ready', moves: 0, matches: 0, revealed: [], matched: Array(config.deck.length).fill(false), comparison: null, event: 0 };
}

export function reveal(state, index) {
  if (state.phase !== 'ready' || !Number.isInteger(index) || index < 0 || index >= state.config.deck.length || state.matched[index] || state.revealed.includes(index)) return false;
  state.revealed.push(index); state.event++;
  if (state.revealed.length === 2) {
    state.moves++;
    const [a, b] = state.revealed.map(i => state.config.deck[i].component);
    state.comparison = a.centiohms === b.centiohms && a.tolerance === b.tolerance ? 'match' : 'mismatch';
    state.phase = 'compare';
  }
  return true;
}

export function resolvePair(state) {
  if (state.phase !== 'compare') return false;
  if (state.comparison === 'match') { state.revealed.forEach(index => { state.matched[index] = true; }); state.matches++; }
  const won = state.matches === state.config.pairs;
  state.phase = won ? 'won' : state.moves >= state.config.budget ? 'lost' : 'ready';
  if (state.phase !== 'lost') { state.revealed = []; state.comparison = null; }
  state.event++; return true;
}

/** Only an exposed or matched component is returned to interface consumers. */
export function visibleCard(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.config.deck.length) return null;
  return state.matched[index] || state.revealed.includes(index) ? state.config.deck[index].component : null;
}

export function remainingMoves(state) { return Math.max(0, state.config.budget - state.moves); }
