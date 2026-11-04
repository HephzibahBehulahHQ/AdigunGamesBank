import { missionFor, wordMask, binaryWord, decodeWord, parityFor } from './campaign.js';

export function createGame(level = 1) {
  const config = missionFor(level);
  return { config, phase: 'ready', word: config.initialWord, draft: config.initialDraft,
    parityBit: config.initialParity, serialBit: 0, frameIndex: 0, operations: 0, errors: 0, clocks: 0,
    shiftedOut: null, received: [], log: [], lastResult: null,
    message: 'Begin the mission. Input switches change the staging bank; latch them to load the register.' };
}
export const currentFrame = state => state.config.frames[Math.min(state.frameIndex, state.config.frames.length - 1)];
export function startGame(state) {
  if (state.phase !== 'ready') return false;
  state.phase = 'working'; state.message = 'Link ready. Construct the displayed target, set parity, then transmit.'; return true;
}
function spend(state, action, apply) {
  if (state.phase !== 'working') return false;
  if (state.operations >= state.config.operationBudget) {
    state.phase = 'lost'; state.message = 'Operation budget exhausted. Restart this mission.'; return false;
  }
  state.operations++; apply();
  state.log.push({ operation: state.operations, action, word: state.word });
  if (state.log.length > 12) state.log.shift();
  if (state.operations >= state.config.operationBudget && state.phase === 'working') {
    state.phase = 'lost'; state.message = 'Operation budget exhausted before the complete packet arrived. Restart this mission.';
  }
  return true;
}
export function toggleBit(state, bit) {
  if (!Number.isInteger(bit) || bit < 0 || bit >= state.config.width) return false;
  return spend(state, `Toggle input bit ${bit}`, () => { state.draft ^= 1 << bit; state.message = `Input bit ${bit} changed. Latch input to update the register.`; });
}
export function latchInput(state) {
  return spend(state, 'Latch input', () => { state.word = state.draft; state.shiftedOut = null; state.message = `Input latched: ${binaryWord(state.word, state.config.width)} is now in the register.`; });
}
export function setSerialBit(state, bit) {
  if (![0, 1].includes(bit) || bit === state.serialBit) return false;
  return spend(state, `Set serial input ${bit}`, () => { state.serialBit = bit; state.message = `Serial data is ${bit}. A clock pulse shifts left and inserts it at bit 0.`; });
}
export function setParityBit(state, bit) {
  if (![0, 1].includes(bit) || bit === state.parityBit) return false;
  return spend(state, `Set parity ${bit}`, () => { state.parityBit = bit; state.message = `Parity bit set to ${bit}. Check the current frame's ${currentFrame(state).parity} parity rule.`; });
}
export function clockSerial(state) {
  return spend(state, 'Serial clock pulse', () => {
    state.shiftedOut = state.word >> (state.config.width - 1) & 1;
    state.word = ((state.word << 1) | state.serialBit) & wordMask(state.config.width); state.clocks++;
    state.message = `Clock ${state.clocks}: inserted ${state.serialBit} at bit 0; shifted out ${state.shiftedOut}.`;
  });
}
export function transformWord(state, operation) {
  if (!['shift-left', 'shift-right', 'rotate-left', 'rotate-right', 'clear'].includes(operation)) return false;
  return spend(state, operation.replaceAll('-', ' '), () => {
    const width = state.config.width, mask = wordMask(width), word = state.word;
    const low = word & 1, high = word >> (width - 1) & 1;
    if (operation === 'shift-left') { state.word = word << 1 & mask; state.shiftedOut = high; }
    if (operation === 'shift-right') { state.word = word >>> 1; state.shiftedOut = low; }
    if (operation === 'rotate-left') { state.word = ((word << 1) | high) & mask; state.shiftedOut = high; }
    if (operation === 'rotate-right') { state.word = (word >>> 1) | low << (width - 1); state.shiftedOut = low; }
    if (operation === 'clear') { state.word = 0; state.shiftedOut = null; }
    state.message = `Register ${operation.replaceAll('-', ' ')}: ${binaryWord(state.word, width)}. Input switches are unchanged.`;
  });
}
export function transmit(state) {
  return spend(state, 'Transmit frame', () => {
    const frame = currentFrame(state), width = state.config.width;
    const value = decodeWord(state.word, width, frame.signed), expectedParity = parityFor(state.word, width, frame.parity);
    const valueOK = state.word === frame.word, parityOK = state.parityBit === expectedParity;
    state.lastResult = { frame: state.frameIndex + 1, word: state.word, value, parity: state.parityBit, expectedParity, valueOK, parityOK, ok: valueOK && parityOK };
    if (!valueOK || !parityOK) {
      state.errors++;
      const reason = !valueOK ? `Value ${value} does not match target ${frame.target}.` : `${frame.parity === 'even' ? 'Even' : 'Odd'} parity failed; this data word needs parity bit ${expectedParity}.`;
      state.message = `Frame rejected. ${reason} ${state.config.errorLimit - state.errors} fault ${state.config.errorLimit - state.errors === 1 ? 'allowance remains' : 'allowances remain'}.`;
      if (state.errors >= state.config.errorLimit) { state.phase = 'lost'; state.message = `Link failed. ${reason} Fault budget exhausted; retry the same mission.`; }
      return;
    }
    state.received.push({ frame: state.frameIndex + 1, word: state.word, value, signed: frame.signed, parity: state.parityBit, rule: frame.parity });
    state.frameIndex++;
    if (state.frameIndex === state.config.frames.length) {
      state.phase = 'won'; state.message = `Packet commissioned! All ${state.received.length} frames arrived in order with the correct values and parity.`;
    } else state.message = `Frame ${state.frameIndex} accepted. Register and input switches are retained; construct frame ${state.frameIndex + 1}.`;
  });
}
export function pauseGame(state) {
  if (state.phase !== 'working') return false;
  state.phase = 'paused'; state.message = 'Mission paused. Switches, clock and transmission are locked.'; return true;
}
export function resumeGame(state) {
  if (state.phase !== 'paused') return false;
  state.phase = 'working'; state.message = 'Link resumed. Continue the current frame.'; return true;
}
export const retryGame = state => createGame(state.config.level);
