import { campaign, LEVEL_COUNT, randomFor, tierFor, validLevel } from '../shared/progression.js';

export { LEVEL_COUNT };
export const CAMPAIGN_ID = 'fuse-box';
export const BREAKER_RATINGS = [2, 4, 6, 10, 16, 20, 25];
export const TEST_STAGES = ['Lighting & control', 'Drive startup', 'Full production'];
export const breakerCost = rating => rating === 0 ? 0 : 3 + Math.ceil(rating / 2);
const PROFILES = [[1, .55, .8], [.25, 1, .65], [.4, .7, 1], [.8, 1, .45], [1, .35, .7]];
const NAMES = [
  ['Inspection lights', 'lamp'], ['Work lights', 'lamp'], ['Cooling fan', 'fan'],
  ['Extraction fan', 'fan'], ['Servo stage', 'motor'], ['Pump station', 'pump'],
  ['Control panel', 'control'], ['Conveyor drive', 'motor'], ['Cabinet heater', 'heater'],
  ['Circulation pump', 'pump'], ['Signal lamps', 'lamp'], ['Air handling fan', 'fan']
];
const rounded = value => Math.round(value * 1000) / 1000;

/** Original extra-low-voltage DC exercises, version 1. The profiles are authored
 * game scenarios, not measurements of commercial loads or breaker trip curves. */
export function levelConfig(value) {
  const level = validLevel(value), tierIndex = Math.floor((level - 1) / 2000);
  const rng = randomFor(Math.imul(level, 0x9e3779b1) ^ 0x18f05b);
  const branchCount = [3, 3, 4, 5, 6][tierIndex];
  const voltage = level === 1 ? 24 : [12, 24, 48][Math.floor(rng() * 3)];
  const branches = [], loads = [], inventory = {}, solution = { assignments: [], breakers: [] };
  const firstCurrents = [2, 3, 3, 4, 5, 6], firstRatings = [6, 10, 16];
  for (let branch = 0; branch < branchCount; branch++) {
    const rating = level === 1 ? firstRatings[branch] : BREAKER_RATINGS[2 + Math.floor(rng() * (tierIndex < 2 ? 3 : 5))];
    branches.push({ id: branch, name: `Branch ${String.fromCharCode(65 + branch)}`, cableAmpacity: rating + (level === 1 ? 0 : Math.floor(rng() * 5) * .25) });
    solution.breakers.push(rating);
    inventory[rating] = (inventory[rating] || 0) + 1;
    const currents = [];
    if (level === 1) {
      currents.push(Array(3).fill(firstCurrents[branch * 2]), Array(3).fill(firstCurrents[branch * 2 + 1]));
    } else {
      const profileA = tierIndex === 0 ? [1, 1, 1] : PROFILES[Math.floor(rng() * PROFILES.length)];
      const profileB = tierIndex === 0 ? [1, 1, 1] : PROFILES[Math.floor(rng() * PROFILES.length)];
      const weight = .36 + rng() * .28;
      const target = rating * (.74 + rng() * .18);
      const unscaled = [profileA.map(p => p * weight), profileB.map(p => p * (1 - weight))];
      const peak = Math.max(...TEST_STAGES.map((_, i) => unscaled[0][i] + unscaled[1][i]));
      for (const profile of unscaled) currents.push(profile.map(current => Math.floor(current * target / peak * 40) / 40));
    }
    for (let n = 0; n < 2; n++) {
      const index = loads.length, [name, kind] = NAMES[index];
      loads.push({ id: index, name, kind, powers: currents[n].map(current => rounded(current * voltage)), home: branch });
    }
  }
  // Spare stock is finite and intentionally includes tempting undersized parts.
  inventory[2] = 1 + (tierIndex < 2 ? 1 : 0);
  if (tierIndex < 3) inventory[4] = 1;
  if (level !== 1) {
    for (let i = loads.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)); [loads[i], loads[j]] = [loads[j], loads[i]];
    }
  }
  loads.forEach((load, index) => { solution.assignments.push(load.home); delete load.home; load.id = index; });
  const maximumCurrent = Math.max(...TEST_STAGES.map((_, stage) => loads.reduce((total, load) => total + load.powers[stage] / voltage, 0)));
  const solutionCost = solution.breakers.reduce((sum, rating) => sum + breakerCost(rating), 0);
  return {
    version: 1, level, tier: tierFor(level), tierIndex, voltage, branches, loads, inventory, solution,
    budget: solutionCost + [4, 3, 2, 1, 0][tierIndex], mainAmpacity: rounded(maximumCurrent + 2),
    stageDuration: 2 + tierIndex * .25, stages: [...TEST_STAGES],
    brief: level === 1
      ? 'Commission a 24 V workshop. Supply all six loads across three protected branches. The branch cable limits are 6 A, 10 A and 16 A.'
      : `${branchCount} branches, ${loads.length} loads, ${voltage} V DC. ${tierIndex === 0 ? 'Balance constant loads' : 'Balance all three operating profiles'} using the available breakers and ${solutionCost + [4, 3, 2, 1, 0][tierIndex]} workshop credits.`
  };
}

export function referencePlan(config) {
  return { assignments: [...config.solution.assignments], breakers: [...config.solution.breakers] };
}
export function createCampaign(storage) { return campaign(CAMPAIGN_ID, storage); }
