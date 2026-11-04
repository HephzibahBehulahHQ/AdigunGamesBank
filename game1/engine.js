import { validLevel, tierFor, randomFor } from '../shared/progression.js';

// An abstract three-phase signal-routing puzzle. Phases are logical states,
// not AC phases, electrical voltages, or instructions for real installations.
export const PHASE_NAMES = ['Dark', 'Amber', 'Cyan'];
const mod = value => ((value % 3) + 3) % 3;
const matrices = new Map();

export function neighbours(size, index) {
  if (!Number.isInteger(size) || size < 3 || size > 6 || !Number.isInteger(index) || index < 0 || index >= size * size) return [];
  const row = Math.floor(index / size), col = index % size;
  return [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
    .filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size).map(([r, c]) => r * size + c);
}

function matrix(size) {
  if (matrices.has(size)) return matrices.get(size);
  const count = size * size;
  const rows = Array.from({ length: count }, (_, row) => Array.from({ length: count * 2 }, (_, col) => col < count ? Number(neighbours(size, col).includes(row)) : Number(col - count === row)));
  const pivots = [];
  let rank = 0;
  for (let col = 0; col < count; col++) {
    const pivot = rows.findIndex((row, index) => index >= rank && row[col] !== 0);
    if (pivot < 0) continue;
    [rows[rank], rows[pivot]] = [rows[pivot], rows[rank]];
    const inverse = rows[rank][col] === 2 ? 2 : 1;
    rows[rank] = rows[rank].map(value => mod(value * inverse));
    for (let row = 0; row < count; row++) {
      if (row === rank || rows[row][col] === 0) continue;
      const multiple = rows[row][col];
      rows[row] = rows[row].map((value, index) => mod(value - multiple * rows[rank][index]));
    }
    pivots.push(col); rank++;
  }
  const result = { rows, pivots, rank, count }; matrices.set(size, result); return result;
}

export function solveBoard(size, current, target) {
  const count = size * size;
  if (!Number.isInteger(size) || size < 3 || size > 6 || current?.length !== count || target?.length !== count || ![...current, ...target].every(value => Number.isInteger(value) && value >= 0 && value <= 2)) return null;
  const { rows, pivots, rank } = matrix(size);
  const rhs = target.map((value, i) => mod(value - current[i]));
  const reduced = rows.map(row => mod(rhs.reduce((sum, value, i) => sum + row[count + i] * value, 0)));
  if (reduced.slice(rank).some(Boolean)) return null;
  const solution = Array(count).fill(0);
  pivots.forEach((col, row) => { solution[col] = reduced[row]; });
  return solution;
}

export function makeLevel(value) {
  const level = validLevel(value), tier = Math.floor((level - 1) / 2000);
  const size = [3, 3, 4, 5, 6][tier], count = size * size;
  const random = randomFor(level * 4933 + 731);
  const target = Array.from({ length: count }, () => Math.floor(random() * 3));
  let marker = level - 1;
  for (let i = 0; i < 9; i++) { target[i] = marker % 3; marker = Math.floor(marker / 3); }
  if (level === 1) target.fill(2);
  const current = [...target];
  const changes = level === 1 ? [4] : Array.from({ length: Math.min(count, 2 + tier * 3 + (level % Math.max(2, size))) }, () => Math.floor(random() * count));
  for (const index of changes) for (const affected of neighbours(size, index)) current[affected] = mod(current[affected] - 1);
  if (current.every((value, i) => value === target[i])) for (const index of neighbours(size, 0)) current[index] = mod(current[index] - 1);
  const solution = solveBoard(size, current, target);
  const par = solution.reduce((sum, value) => sum + value, 0);
  return { level, tier: tierFor(level), size, current, target, par, moveLimit: par + [8, 6, 4, 2, 0][tier], seed: level * 4933 + 731 };
}

export function createGame(level = 1) {
  const config = makeLevel(level);
  return { config, cells: [...config.current], phase: 'playing', moves: 0, history: [], hints: 0, selected: 0, message: 'Match every LED to its target. A pulse advances the selected LED and its orthogonal neighbours.' };
}
export function matched(state) { return state.cells.reduce((sum, value, i) => sum + Number(value === state.config.target[i]), 0); }
export function pulse(state, index) {
  if (state.phase !== 'playing' || !Number.isInteger(index) || index < 0 || index >= state.cells.length) return false;
  state.history.push(index); state.moves++; state.selected = index;
  for (const affected of neighbours(state.config.size, index)) state.cells[affected] = mod(state.cells[affected] + 1);
  if (matched(state) === state.cells.length) { state.phase = 'won'; state.message = 'Commissioned. Every signal matches its target.'; }
  else if (state.moves >= state.config.moveLimit) { state.phase = 'lost'; state.message = 'Pulse budget exhausted. Undo your last pulse or restart this board.'; }
  else state.message = `${matched(state)} of ${state.cells.length} signals aligned. ${state.config.moveLimit - state.moves} pulses remain.`;
  return true;
}
export function undo(state) {
  if (!['playing', 'lost'].includes(state.phase) || !state.history.length) return false;
  const index = state.history.pop();
  for (const affected of neighbours(state.config.size, index)) state.cells[affected] = mod(state.cells[affected] - 1);
  state.moves--; state.phase = 'playing'; state.selected = index; state.message = 'Last pulse reversed. Its budget is restored.'; return true;
}
export function pause(state) {
  if (!['playing', 'paused'].includes(state.phase)) return false;
  state.phase = state.phase === 'playing' ? 'paused' : 'playing';
  state.message = state.phase === 'paused' ? 'Board paused. Resume when you are ready.' : 'Board resumed.'; return true;
}
export function hint(state) {
  if (state.phase !== 'playing') return -1;
  const solution = solveBoard(state.config.size, state.cells, state.config.target);
  const index = solution?.findIndex(Boolean) ?? -1;
  if (index >= 0) { state.hints++; state.selected = index; state.message = `Try a pulse at ${labelFor(state.config.size, index)}. It also advances its orthogonal neighbours.`; }
  return index;
}
export function labelFor(size, index) { return `${String.fromCharCode(65 + Math.floor(index / size))}${index % size + 1}`; }
