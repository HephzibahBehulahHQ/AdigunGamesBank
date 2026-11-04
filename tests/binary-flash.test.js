import test from 'node:test';
import assert from 'node:assert/strict';
import { missionFor, wordMask, encodeDecimal, decodeWord, binaryWord, oneCount, parityFor, createCampaign, CAMPAIGN_ID } from '../game7/campaign.js';
import { createGame, currentFrame, startGame, toggleBit, latchInput, setSerialBit, setParityBit, clockSerial, transformWord, transmit, pauseGame, resumeGame, retryGame } from '../game7/engine.js';

function loadParallel(state, word) {
  for (let bit = 0; bit < state.config.width; bit++) if ((state.draft ^ word) >> bit & 1) assert.equal(toggleBit(state, bit), true);
  assert.equal(latchInput(state), true);
}
function solve(state) {
  for (const frame of state.config.frames) {
    loadParallel(state, frame.word);
    const parity = parityFor(frame.word, state.config.width, frame.parity);
    if (state.parityBit !== parity) assert.equal(setParityBit(state, parity), true);
    assert.equal(transmit(state), true);
  }
}

test('unsigned and two’s-complement encodings preserve exact word boundaries', () => {
  assert.equal(wordMask(4), 15); assert.equal(wordMask(16), 65535);
  assert.equal(decodeWord(12, 4, false), 12); assert.equal(decodeWord(12, 4, true), -4);
  assert.equal(encodeDecimal(-4, 4, true), 12);
  assert.equal(decodeWord(128, 8, true), -128); assert.equal(decodeWord(127, 8, true), 127);
  assert.equal(decodeWord(65535, 16, true), -1); assert.equal(decodeWord(32768, 16, true), -32768);
  assert.equal(encodeDecimal(-32768, 16, true), 32768); assert.equal(encodeDecimal(32767, 16, true), 32767);
  for (const [value, width, signed] of [[16, 4, false], [-1, 4, false], [8, 4, true], [-9, 4, true], [1.5, 4, false], [Infinity, 8, true]]) assert.throws(() => encodeDecimal(value, width, signed), RangeError);
  for (const width of [0, -1, 17, 1.5, NaN]) assert.throws(() => wordMask(width), RangeError);
  assert.throws(() => decodeWord(-1, 8), RangeError); assert.throws(() => decodeWord(256, 8), RangeError);
});

test('every word through eight bits round-trips in both decimal interpretations', () => {
  for (let width = 1; width <= 8; width++) for (let word = 0; word <= wordMask(width); word++) {
    assert.equal(encodeDecimal(decodeWord(word, width, false), width, false), word);
    assert.equal(encodeDecimal(decodeWord(word, width, true), width, true), word);
    assert.equal(binaryWord(word, width).length, width);
  }
});

test('even and odd parity count actual data bits independently of signed interpretation', () => {
  for (const [word, width, ones] of [[0, 4, 0], [9, 4, 2], [7, 4, 3], [255, 8, 8], [128, 8, 1], [65535, 16, 16], [32769, 16, 2]]) {
    assert.equal(oneCount(word, width), ones);
    assert.equal((ones + parityFor(word, width, 'even')) % 2, 0);
    assert.equal((ones + parityFor(word, width, 'odd')) % 2, 1);
  }
  assert.throws(() => parityFor(0, 4, 'none'), RangeError);
  assert.equal(parityFor(255, 8, 'even'), 0); assert.equal(decodeWord(255, 8, true), -1);
});

test('all 10,000 distinct missions complete using public bit, latch, parity and transmit commands', () => {
  const signatures = new Set(); let negativeTargets = 0, oddFrames = 0;
  for (let level = 1; level <= 10000; level++) {
    const state = createGame(level), c = state.config;
    signatures.add(JSON.stringify([c.width, c.initialWord, c.frames[0].word, c.frames[1].word]));
    assert.ok(c.solutionCost > 0 && c.operationBudget >= c.solutionCost);
    assert.notEqual(c.initialWord, c.frames[0].word);
    for (const [index, frame] of c.frames.entries()) {
      assert.equal(encodeDecimal(frame.target, c.width, frame.signed), frame.word);
      if (index) assert.notEqual(frame.word, c.frames[index - 1].word);
      if (frame.target < 0) negativeTargets++; if (frame.parity === 'odd') oddFrames++;
    }
    assert.equal(startGame(state), true); solve(state);
    assert.equal(state.phase, 'won', `mission ${level}: ${state.message}`);
    assert.equal(state.errors, 0); assert.equal(state.operations, c.solutionCost);
    assert.equal(state.received.length, c.frames.length);
    assert.deepEqual(state.received.map(frame => frame.word), c.frames.map(frame => frame.word));
  }
  assert.equal(signatures.size, 10000); assert.ok(negativeTargets > 1000); assert.ok(oddFrames > 1000);
});

test('mission generation is reproducible and increases word width, frame count and signed/parity demands', () => {
  assert.deepEqual(missionFor(9123), missionFor(9123));
  for (const value of [-1, 0, 10001, NaN, Infinity, null, 'invalid']) assert.equal(missionFor(value).level, 1);
  assert.equal(missionFor('10000').level, 10000);
  assert.deepEqual([1, 2001, 4001, 6001, 8001].map(level => missionFor(level).width), [4, 6, 8, 12, 16]);
  assert.deepEqual([1, 2001, 4001, 6001, 8001].map(level => missionFor(level).frames.length), [2, 3, 4, 5, 6]);
  assert.equal(missionFor(10000).errorLimit, 1);
});

test('staging switches do not change the active register until a latch pulse', () => {
  const state = createGame(); assert.equal(toggleBit(state, 3), false); startGame(state);
  assert.equal(toggleBit(state, 3), true); assert.equal(state.draft, 8); assert.equal(state.word, 0);
  latchInput(state); assert.equal(state.word, 8); assert.equal(state.draft, 8);
  toggleBit(state, 0); assert.equal(state.draft, 9); assert.equal(state.word, 8);
  clockSerial(state); assert.equal(state.word, 0); assert.equal(state.draft, 9); assert.equal(state.shiftedOut, 1);
  setSerialBit(state, 1); clockSerial(state); assert.equal(state.word, 1); assert.equal(state.draft, 9);
});

test('serial clock shifts in the explicit 1,0,0,1 sequence as decimal nine', () => {
  const state = createGame(); startGame(state);
  for (const bit of [1, 0, 0, 1]) { setSerialBit(state, bit); clockSerial(state); }
  assert.equal(state.word, 9); assert.equal(binaryWord(state.word, 4), '1001');
  assert.equal(state.clocks, 4); assert.equal(state.shiftedOut, 0); assert.equal(state.draft, 0);
});

test('logical shifts drop the outgoing bit while rotations wrap it and preserve the one count', () => {
  const state = createGame(); startGame(state); loadParallel(state, 9);
  transformWord(state, 'rotate-left'); assert.equal(state.word, 3); assert.equal(state.shiftedOut, 1); assert.equal(oneCount(state.word, 4), 2);
  transformWord(state, 'rotate-right'); assert.equal(state.word, 9); assert.equal(state.shiftedOut, 1);
  transformWord(state, 'shift-left'); assert.equal(state.word, 2); assert.equal(state.shiftedOut, 1);
  transformWord(state, 'shift-right'); assert.equal(state.word, 1); assert.equal(state.shiftedOut, 0);
  transformWord(state, 'clear'); assert.equal(state.word, 0); assert.equal(state.draft, 9); assert.equal(state.shiftedOut, null);
});

test('a signed negative register still uses zero-fill logical right shift', () => {
  const state = createGame(4001); startGame(state);
  loadParallel(state, 128); assert.equal(decodeWord(state.word, 8, true), -128);
  transformWord(state, 'shift-right'); assert.equal(state.word, 64); assert.equal(decodeWord(state.word, 8, true), 64);
});

test('invalid bit positions, modes and unchanged control settings spend no operations', () => {
  const state = createGame(); startGame(state);
  for (const bit of [-1, 4, 20, 1.5, NaN]) assert.equal(toggleBit(state, bit), false);
  for (const bit of [-1, 2, NaN, true]) { assert.equal(setParityBit(state, bit), false); assert.equal(setSerialBit(state, bit), false); }
  assert.equal(setParityBit(state, 0), false); assert.equal(setSerialBit(state, 0), false);
  assert.equal(transformWord(state, 'arithmetic-right'), false); assert.equal(state.operations, 0);
});

test('wrong values never advance the frame and exhausting fault allowance loses the link', () => {
  const state = createGame(); startGame(state);
  transmit(state); assert.equal(state.frameIndex, 0); assert.equal(state.received.length, 0);
  assert.equal(state.errors, 1); assert.equal(state.phase, 'working'); assert.equal(state.lastResult.valueOK, false); assert.equal(state.lastResult.parityOK, true);
  transmit(state); assert.equal(state.phase, 'lost'); assert.equal(state.errors, 2); assert.equal(state.frameIndex, 0);
  assert.match(state.message, /Fault budget exhausted/); assert.equal(toggleBit(state, 3), false);
  const retry = retryGame(state); assert.equal(retry.phase, 'ready'); assert.equal(retry.config.level, 1);
  assert.equal(retry.errors, 0); assert.equal(retry.operations, 0); assert.equal(retry.word, 0);
});

test('a correct value with wrong parity is rejected until the parity bit is corrected', () => {
  const state = createGame(); startGame(state); loadParallel(state, 9); setParityBit(state, 1); transmit(state);
  assert.equal(state.phase, 'working'); assert.equal(state.frameIndex, 0); assert.equal(state.lastResult.valueOK, true); assert.equal(state.lastResult.parityOK, false);
  setParityBit(state, 0); transmit(state); assert.equal(state.frameIndex, 1); assert.equal(state.received.length, 1);
  loadParallel(state, 7); setParityBit(state, 1); transmit(state);
  assert.equal(state.phase, 'won'); assert.equal(state.errors, 1); assert.equal(state.received.length, 2);
});

test('the first full packet uses both parallel loading and retained-register serial work', () => {
  const state = createGame(); startGame(state); loadParallel(state, 9); transmit(state);
  assert.equal(state.phase, 'working'); assert.equal(currentFrame(state).target, 7);
  assert.equal(state.word, 9); assert.equal(state.draft, 9);
  setSerialBit(state, 1); clockSerial(state); assert.equal(state.word, 3);
  clockSerial(state); assert.equal(state.word, 7); assert.equal(state.draft, 9);
  setParityBit(state, 1); transmit(state);
  assert.equal(state.phase, 'won'); assert.equal(state.operations, 9); assert.deepEqual(state.received.map(frame => frame.value), [9, 7]);
  assert.equal(transmit(state), false); assert.equal(state.received.length, 2);
});

test('finite operation limits cause loss, while a correct last-operation final frame still wins', () => {
  const failed = createGame(); failed.config.operationBudget = 1; startGame(failed); toggleBit(failed, 3);
  assert.equal(failed.phase, 'lost'); assert.equal(failed.received.length, 0); assert.equal(latchInput(failed), false);
  const last = createGame(); last.config.operationBudget = 9; startGame(last); loadParallel(last, 9); transmit(last);
  setSerialBit(last, 1); clockSerial(last); clockSerial(last); setParityBit(last, 1); transmit(last);
  assert.equal(last.operations, 9); assert.equal(last.phase, 'won');
  const partial = createGame(); partial.config.operationBudget = 4; startGame(partial); loadParallel(partial, 9); transmit(partial);
  assert.equal(partial.received.length, 1); assert.equal(partial.phase, 'lost');
});

test('pause locks every mutating path and no idle transition creates a frame', () => {
  const state = createGame(); assert.equal(transmit(state), false); assert.equal(clockSerial(state), false);
  startGame(state); pauseGame(state); const snapshot = structuredClone(state);
  for (const result of [toggleBit(state, 0), latchInput(state), setSerialBit(state, 1), setParityBit(state, 1), clockSerial(state), transformWord(state, 'rotate-left'), transmit(state)]) assert.equal(result, false);
  assert.deepEqual(state, snapshot); assert.equal(resumeGame(state), true); assert.equal(state.received.length, 0); assert.equal(state.operations, 0);
});

test('the complete packet saves once and blocked or malformed storage cannot award a later mission', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const progress = createCampaign(storage), state = createGame(); startGame(state); solve(state); assert.equal(state.phase, 'won');
  assert.equal(progress.complete(2), false); assert.equal(progress.complete(1), true); assert.equal(progress.complete(1), false);
  assert.deepEqual(JSON.parse(values.get(`adigun.campaign.v1.${CAMPAIGN_ID}`)), { version: 1, completed: 1, unlocked: 2 });
  assert.equal(createCampaign(storage).unlocked, 2);
  values.set(`adigun.campaign.v1.${CAMPAIGN_ID}`, '{bad json'); assert.equal(createCampaign(storage).unlocked, 1);
  const blocked = createCampaign({ getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } });
  assert.equal(blocked.complete(1), true); assert.equal(blocked.unlocked, 2);
});
