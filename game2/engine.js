import { circuitFor, DIRECTIONS, neighbour, rotateMask, cellName } from './campaign.js';

export function createGame(level = 1) {
  const config = circuitFor(level);
  return { config, rotations: config.tiles.map(tile => tile.initialRotation), phase: 'ready', moves: 0, tests: 0,
    inspection: null, message: 'Begin the job. Select a wire segment and rotate its terminals into place.' };
}
export function startGame(state) {
  if (state.phase !== 'ready') return false;
  state.phase = 'editing'; state.message = 'Supply isolated. Align the positive-feed network before testing.'; return true;
}
export function maskAt(state, index) {
  return state.config.tiles[index] ? rotateMask(state.config.tiles[index].mask, state.rotations[index]) : 0;
}
export function rotateTile(state, index, direction = 1) {
  if (state.phase !== 'editing' || !Number.isInteger(index) || ![1, -1].includes(direction)) return false;
  const tile = state.config.tiles[index];
  if (!tile?.rotatable) return false;
  if (state.moves >= state.config.moveBudget) {
    state.message = 'No turns remain. Run the final test or restart this job.'; return false;
  }
  state.rotations[index] = ((state.rotations[index] + direction) % tile.period + tile.period) % tile.period;
  state.moves++; state.inspection = null;
  state.message = `Supply isolated. ${cellName(index, state.config.size)} rotated ${direction === 1 ? 'clockwise' : 'counterclockwise'}.`;
  return true;
}

/** Reciprocal, orthogonal contacts only. Rows do not wrap and touching diagonals do not conduct. */
export function inspectNetwork(config, masks) {
  const reached = new Set([config.source]), queue = [config.source], dangling = [];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], mask = masks[index] & 15;
    for (const direction of DIRECTIONS) if (mask & direction.bit) {
      const next = neighbour(index, direction, config.size);
      const contact = next >= 0 && config.tiles[next]?.kind !== 'blank' && ((masks[next] & 15) & direction.opposite);
      if (!contact) dangling.push({ index, direction: direction.name, reason: next < 0 ? 'boundary' : 'unmatched terminal' });
      else if (!reached.has(next)) { reached.add(next); queue.push(next); }
    }
  }
  const energized = [...reached].sort((a, b) => a - b);
  const shorted = energized.filter(index => config.tiles[index].kind === 'ground');
  const poweredLoads = config.loads.filter(index => reached.has(index));
  const unexpectedLoads = energized.filter(index => config.tiles[index].kind === 'spare');
  // Loads have a separate, prewired return. Ideal wire-to-return faults are
  // classified as shorts; this model does not invent a finite short current.
  const current = shorted.length ? null : [...poweredLoads, ...unexpectedLoads].reduce((sum, index) => sum + config.voltage / config.tiles[index].resistance, 0);
  const overload = current !== null && current > config.fuseCurrent + 1e-10;
  const missingLoads = config.loads.filter(index => !reached.has(index));
  const status = shorted.length ? 'short' : overload ? 'overload' : unexpectedLoads.length ? 'unexpected-branch'
    : dangling.length ? 'open-branch' : missingLoads.length ? 'missing-load' : 'clear';
  return { status, ok: status === 'clear', energized, shorted, poweredLoads, unexpectedLoads, missingLoads, dangling, current, overload };
}
export const inspectCircuit = state => inspectNetwork(state.config, state.config.tiles.map((_, index) => maskAt(state, index)));

export function commission(state) {
  if (state.phase !== 'editing') return false;
  const result = inspectCircuit(state), config = state.config;
  state.inspection = result; state.tests++;
  if (result.status === 'short') {
    state.phase = 'lost'; state.message = `Supply isolated: short to return at ${result.shorted.map(index => cellName(index, config.size)).join(', ')}. Restart to replace the virtual fuse.`;
  } else if (result.status === 'overload') {
    state.phase = 'lost'; state.message = `Fuse tripped: ${(result.current * 1000).toFixed(1)} mA exceeds ${(config.fuseCurrent * 1000).toFixed(0)} mA. Isolate the unwanted branch and retry.`;
  } else if (result.ok) {
    state.phase = 'won'; state.message = `Commissioned! All ${config.loads.length} required ${config.loads.length === 1 ? 'load is' : 'loads are'} powered. ${(result.current * 1000).toFixed(1)} mA; no exposed or unwanted live branch.`;
  } else {
    const reason = result.unexpectedLoads.length ? 'The parked auxiliary load is energized. Isolate that branch.'
      : result.dangling.length ? `Open branch at ${cellName(result.dangling[0].index, config.size)}: ${result.dangling[0].direction} terminal is unmatched.`
        : `Required load ${config.tiles[result.missingLoads[0]].loadId} is still disconnected.`;
    if (state.moves >= config.moveBudget) { state.phase = 'lost'; state.message = `${reason} Rotation budget exhausted. Restart this job.`; }
    else state.message = `${reason} Supply isolated; correct the routing and test again.`;
  }
  return true;
}
export function pauseGame(state) {
  if (state.phase !== 'editing') return false;
  state.phase = 'paused'; state.message = 'Job paused. The supply is isolated and routing is locked.'; return true;
}
export function resumeGame(state) {
  if (state.phase !== 'paused') return false;
  state.phase = 'editing'; state.message = 'Supply isolated. Continue routing, then test the circuit.'; return true;
}
export const retryGame = state => createGame(state.config.level);
