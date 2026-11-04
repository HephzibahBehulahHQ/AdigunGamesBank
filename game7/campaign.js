import { campaign, randomFor, tierFor, validLevel, LEVEL_COUNT } from '../shared/progression.js';

export { LEVEL_COUNT };
export const CAMPAIGN_ID = 'binary-flash';
export const createCampaign = storage => campaign(CAMPAIGN_ID, storage);
export function wordMask(width) {
  if (!Number.isInteger(width) || width < 1 || width > 16) throw new RangeError('Word width must be 1–16 bits');
  return 2 ** width - 1;
}
export function checkedWord(word, width) {
  if (!Number.isInteger(word) || word < 0 || word > wordMask(width)) throw new RangeError('Word is outside the register width');
  return word;
}
export function decodeWord(word, width, signed = false) {
  checkedWord(word, width);
  return signed && word >= 2 ** (width - 1) ? word - 2 ** width : word;
}
export function encodeDecimal(value, width, signed = false) {
  wordMask(width);
  const minimum = signed ? -(2 ** (width - 1)) : 0, maximum = signed ? 2 ** (width - 1) - 1 : 2 ** width - 1;
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new RangeError('Decimal value cannot fit this word mode');
  return value < 0 ? value + 2 ** width : value;
}
export function oneCount(word, width) {
  let value = checkedWord(word, width), total = 0;
  while (value) { value &= value - 1; total++; }
  return total;
}
export function parityFor(word, width, rule) {
  if (!['even', 'odd'].includes(rule)) throw new RangeError('Parity rule must be even or odd');
  const odd = oneCount(word, width) % 2;
  return rule === 'even' ? odd : 1 - odd;
}
export function binaryWord(word, width) { return checkedWord(word, width).toString(2).padStart(width, '0'); }

/** Injective payload/state pairs keep all 2,000 missions in each tier distinct. */
export function missionFor(requested) {
  const level = validLevel(requested), tier = Math.floor((level - 1) / 2000), local = (level - 1) % 2000;
  const width = [4, 6, 8, 12, 16][tier], base = 2 ** width, mask = base - 1;
  const random = randomFor(70111 + level * 919);
  let code;
  if (tier === 0) {
    const rank = local === 0 ? 0 : ((local - 1) * 1297 + 371) % 1999;
    code = local === 0 ? 1657 : rank >= 1657 ? rank + 1 : rank;
  } else code = (local * 1297 + 317) % 2000;
  const multiplier = [1, 13, 73, 1061, 3643][tier], offset = [0, 39, 165, 2650, 42330][tier];
  const permute = value => (value * multiplier + offset) & mask;
  const first = code % base;
  const rawTargets = [permute(first), permute((first + 1 + Math.floor(code / base) % (base - 1)) % base)];
  const initialWord = permute((first + 1 + Math.floor(code / (base * (base - 1))) % (base - 1)) % base);
  for (let i = 2; i < tier + 2; i++) {
    let next = Math.floor(random() * base);
    if (next === rawTargets.at(-1)) next = (next + 1) & mask;
    rawTargets.push(next);
  }
  const frames = rawTargets.map((word, index) => {
    const signed = tier < 2 ? false : tier === 2 ? (index + level) % 2 === 0 : index % 3 !== 2;
    const parity = tier === 0 ? 'even' : random() < 0.5 ? 'even' : 'odd';
    return { id: index + 1, word, signed, parity, target: decodeWord(word, width, signed) };
  });
  const initialDraft = level === 1 ? 0 : Math.floor(random() * base), initialParity = level === 1 ? 0 : Math.floor(random() * 2);
  let draft = initialDraft, parity = initialParity, solutionCost = 0;
  for (const frame of frames) {
    const requiredParity = parityFor(frame.word, width, frame.parity);
    solutionCost += oneCount(draft ^ frame.word, width) + 1 + Number(parity !== requiredParity) + 1; // toggles + latch + parity + transmit
    draft = frame.word; parity = requiredParity;
  }
  return {
    version: 1, level, tier: tierFor(level), width, frames, initialWord, initialDraft, initialParity,
    operationBudget: level === 1 ? 16 : Math.ceil(solutionCost * (1.5 - tier * 0.1)) + 4,
    errorLimit: level === 1 ? 2 : [3, 3, 2, 2, 1][tier], solutionCost,
    title: ['First packet', 'Serial link', 'Signed channel', 'Register relay', 'Master frame sequence'][tier],
    description: level === 1
      ? 'Send two 4-bit frames: decimal 9, then decimal 7. Set the input switches, latch them into the register, choose even parity, then transmit each frame.'
      : `Commission ${frames.length} ordered ${width}-bit frames. Match each decimal target and its parity rule; use parallel loading or serial/register operations within the finite budget.`
  };
}
