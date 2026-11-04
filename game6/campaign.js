import { campaign, LEVEL_COUNT, randomFor, tierFor, validLevel } from '../shared/progression.js';

export { LEVEL_COUNT };
export const CAMPAIGN_ID = 'capacitor-charge';
const rounded = (value, places = 4) => Number(value.toFixed(places));
const parallel = (a, b) => a * b / (a + b);
const wattsFor = demand => [0.125, 0.25, 0.5, 1, 2, 5].find(rating => rating >= demand * 1.1) || 5;
const ratingFor = voltage => [6.3, 10, 16, 25, 35, 50].find(rating => rating >= voltage * 1.2);
const shuffle = (array, rng) => { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; };

/** Version 1: original RC commissioning problems. All part values and leakage
 * parameters are explicit idealized laboratory scenarios, not product ratings. */
export function levelConfig(value) {
  const level = validLevel(value), tierIndex = Math.floor((level - 1) / 2000), rng = randomFor(Math.imul(level, 0x6a09e667) ^ 0xca9ac17);
  const combinations = [[1000, 2200, 1000], [1000, 3300, 1000], [2200, 1000, 680], [2200, 1500, 680], [4700, 470, 330], [4700, 680, 330]];
  const [microfarads, chargeOhms, dischargeOhms] = level === 1 ? combinations[2] : combinations[Math.floor(rng() * combinations.length)];
  const capacitance = microfarads / 1e6, sourceVolts = level === 1 ? 12 : [5, 9, 12, 18, 24][Math.floor(rng() * 5)];
  const holdSeconds = level === 1 ? 3 : rounded(2.5 + tierIndex * .5 + rng() * .5, 2);
  const leakageOhms = level === 1 ? 100000 : Math.round(chargeOhms * ([30, 20, 14, 10, 8][tierIndex] + rng() * 8) / 10) * 10;
  const centerVolts = level === 1 ? 8 : rounded(sourceVolts * (.5 + rng() * .23), 3);
  const halfWindow = level === 1 ? .8 : rounded(sourceVolts * [0.065, .055, .045, .035, .025][tierIndex], 3);
  const minVolts = rounded(centerVolts - halfWindow, 3), maxVolts = rounded(centerVolts + halfWindow, 3);
  const safeVolts = level === 1 ? .5 : rounded(sourceVolts * (.035 + rng() * .015), 3);
  const chargeTau = capacitance * parallel(chargeOhms, leakageOhms), chargeAsymptote = sourceVolts * leakageOhms / (chargeOhms + leakageOhms);
  const chargeSeconds = -chargeTau * Math.log(1 - centerVolts / chargeAsymptote);
  const maxChargeTime = -chargeTau * Math.log(1 - maxVolts / chargeAsymptote);
  const retainedMin = minVolts * Math.exp(-holdSeconds / (capacitance * leakageOhms));
  const retainedCenter = centerVolts * Math.exp(-holdSeconds / (capacitance * leakageOhms));
  const retainedMax = maxVolts * Math.exp(-holdSeconds / (capacitance * leakageOhms));
  const dischargeTau = capacitance * parallel(dischargeOhms, leakageOhms);
  const dischargeSeconds = dischargeTau * Math.log(retainedCenter / safeVolts);
  const chargeWatts = wattsFor(sourceVolts ** 2 / chargeOhms), dischargeWatts = wattsFor(maxVolts ** 2 / dischargeOhms);
  const capacitors = [
    { id: 'c-small', microfarads: level === 1 ? 1000 : microfarads / 2, voltageRating: ratingFor(sourceVolts) },
    { id: 'c-reference', microfarads, voltageRating: ratingFor(sourceVolts) },
    { id: 'c-large', microfarads: level === 1 ? 4700 : microfarads * 2, voltageRating: ratingFor(sourceVolts) }
  ];
  const chargeResistors = [
    { id: 'charge-fast', ohms: Math.round(chargeOhms / 3 / 10) * 10, watts: chargeWatts },
    { id: 'charge-reference', ohms: chargeOhms, watts: chargeWatts },
    { id: 'charge-slow', ohms: chargeOhms * 4, watts: chargeWatts }
  ];
  const dischargeResistors = [
    { id: 'discharge-fast', ohms: Math.round(dischargeOhms / 3 / 10) * 10, watts: dischargeWatts },
    { id: 'discharge-reference', ohms: dischargeOhms, watts: dischargeWatts },
    { id: 'discharge-slow', ohms: dischargeOhms * 4, watts: dischargeWatts }
  ];
  if (level !== 1) { shuffle(capacitors, rng); shuffle(chargeResistors, rng); shuffle(dischargeResistors, rng); }
  return {
    version: 1, level, tier: tierFor(level), tierIndex, sourceVolts, leakageOhms, capacitors, chargeResistors, dischargeResistors,
    target: { minVolts, maxVolts, centerVolts, minEnergy: .5 * capacitance * minVolts ** 2 * .98, maxEnergy: .5 * capacitance * maxVolts ** 2 * 1.02,
      holdSeconds, holdFloor: rounded(retainedMin * .985, 4), safeVolts },
    limits: { chargeAmps: sourceVolts / chargeOhms * 1.2, dischargeAmps: maxVolts / dischargeOhms * 1.15,
      ceilingVolts: rounded(Math.min(sourceVolts * .91, maxVolts + sourceVolts * .025), 3),
      chargeSeconds: rounded(maxChargeTime * 1.55 + .5, 3), dischargeSeconds: rounded(dischargeTau * Math.log(retainedMax / safeVolts) * 1.45 + .5, 3) },
    solution: { capacitor: 'c-reference', chargeResistor: 'charge-reference', dischargeResistor: 'discharge-reference', captureVolts: centerVolts, chargeSeconds, dischargeSeconds },
    brief: `Store ${rounded(.5 * capacitance * minVolts ** 2 * .98 * 1000, 1)}–${rounded(.5 * capacitance * maxVolts ** 2 * 1.02 * 1000, 1)} mJ, hold above ${rounded(retainedMin * .985, 2)} V for ${holdSeconds} s, then discharge to ${safeVolts} V.`
  };
}
export function referenceProcedure(config) { return { ...config.solution }; }
export function createCampaign(storage) { return campaign(CAMPAIGN_ID, storage); }
