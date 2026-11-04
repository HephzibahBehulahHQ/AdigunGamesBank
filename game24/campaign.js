import { campaign, LEVEL_COUNT, randomFor, tierFor, validLevel } from '../shared/progression.js';

/** Deterministic commissioning exercises; original adaptation inspired by Genesis 6–9. */
export const CAMPAIGN_VERSION = 1;
export { LEVEL_COUNT };
export const CAMPAIGN_ID = 'genesis-ark';
export const SLOT_NAMES = ['Aft port', 'Aft starboard', 'Mid port', 'Mid starboard', 'Fore port', 'Fore starboard'];
export const MODEL_NOTICE = 'A simplified rectangular-hull teaching model, using tonnes, metres and seconds. These fictional commissioning exercises are inspired by Genesis 6–9; they are not a reconstruction of the biblical vessel or a seaworthiness tool.';
export const DIFFICULTY_NOTES = [
  'Match each load to a suitable station, keep paired weights opposite, then test the launch.',
  'Unequal paired loads and a steady wind require measured ballast corrections.',
  'Tighter station capacities and limited ballast make cargo placement matter.',
  'Higher centres of mass and stronger waves reduce the stability reserve.',
  'Commission within a narrow trim and freeboard envelope under changing waves.'
];
const KINDS = [
  ['grain', 'Grain stores', '#e6ba63'],
  ['water', 'Fresh-water casks', '#65b7df'],
  ['fodder', 'Fodder bundles', '#8cb66a'],
  ['shelter', 'Animal shelter supplies', '#cc9966'],
  ['timber', 'Repair timbers', '#b9845e'],
  ['provisions', 'Family provisions', '#b793d3']
];
function shuffle(values, random) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
function round(value, places = 4) { const m = 10 ** places; return Math.round(value * m) / m; }

export function levelConfig(input = 1) {
  const level = validLevel(input);
  const tierIndex = Math.min(4, Math.floor((level - 1) / 2000));
  const difficulty = (level - 1) / (LEVEL_COUNT - 1);
  const random = randomFor(level * 7919 + 240609);
  // 0.0001 t is a physical, measurable manifest variation; other seeded dimensions,
  // station requirements, mass differences, winds and wave periods vary independently.
  const fingerprintMass = level / 10000;
  const hull = {
    length: round(30 + random() * 6), beam: round(9.5 + random() * 1.5), depth: round(6 + random() * 0.7),
    lightshipMass: round(190 + random() * 35), lightshipKG: round(1.65 + random() * 0.25),
    waterDensity: round(1 + random() * 0.025, 5), gravity: 9.81
  };
  const pairs = [0, 1, 2].map(station => {
    const mass = round(30 + station * 13 + random() * 6 + (station === 0 ? fingerprintMass : 0));
    const difference = tierIndex === 0 ? 0 : (1 + Math.floor(random() * (2 + tierIndex))) * 2;
    return [mass, round(mass + difference)];
  });
  const stationOrder = shuffle([0, 1, 2], random);
  const cargo = [];
  const solutionPlacement = Array(6);
  const slotCargo = Array(6);
  for (let station = 0; station < 3; station++) {
    const group = stationOrder[station];
    const flip = random() > 0.5 ? 1 : 0;
    for (let side = 0; side < 2; side++) {
      const cargoIndex = group * 2 + side;
      const kind = KINDS[cargoIndex];
      cargo[cargoIndex] = {
        id: `cargo-${cargoIndex}`, name: kind[1], kind: kind[0], color: kind[2],
        mass: pairs[group][side], height: round(1.3 + random() * (0.8 + difficulty * 1.1)),
        destination: group, stationLabel: ['Ventilated stores', 'Sheltered stores', 'Repair and provisions'][group]
      };
      const slotIndex = station * 2 + (side ^ flip);
      solutionPlacement[cargoIndex] = slotIndex;
      slotCargo[slotIndex] = cargoIndex;
    }
  }
  const slots = SLOT_NAMES.map((name, index) => ({
    id: index, name, x: (Math.floor(index / 2) - 1) * hull.length * 0.28,
    y: (index % 2 ? 1 : -1) * hull.beam * 0.31,
    z: round(2.55 + difficulty * 0.55),
    capacity: round(Math.max(...pairs[stationOrder[Math.floor(index / 2)]]) + 1.2 + random() * 2.2),
    accepts: stationOrder[Math.floor(index / 2)],
    stationLabel: ['Ventilated stores', 'Sheltered stores', 'Repair and provisions'][stationOrder[Math.floor(index / 2)]]
  }));
  // Ballast targets are integer tonnes, reproducible through the public +/-1 t controls.
  // Equalise each cargo pair, then equalise aft/fore station totals, using low sealed tanks.
  const solutionBallast = Array(6).fill(0);
  for (let station = 0; station < 3; station++) {
    const left = cargo[slotCargo[station * 2]].mass;
    const right = cargo[slotCargo[station * 2 + 1]].mass;
    solutionBallast[station * 2] = Math.round(Math.max(0, right - left));
    solutionBallast[station * 2 + 1] = Math.round(Math.max(0, left - right));
  }
  const stationMass = station => cargo[slotCargo[station * 2]].mass + cargo[slotCargo[station * 2 + 1]].mass + solutionBallast[station * 2] + solutionBallast[station * 2 + 1];
  const targetEndMass = Math.max(stationMass(0), stationMass(2));
  for (const station of [0, 2]) {
    const add = Math.ceil((targetEndMass - stationMass(station)) / 2);
    solutionBallast[station * 2] += add;
    solutionBallast[station * 2 + 1] += add;
  }
  const trimBias = tierIndex >= 2 ? Math.floor(random() * 4) - 1 : 0;
  const heelBias = tierIndex === 0 ? 0 : (random() < 0.5 ? -1 : 1) * (1 + Math.floor(random() * (tierIndex + 1)));
  // Optional fixed lateral ballast offsets supply the counter-moment to a steady wind.
  for (let i = 0; i < 6; i++) {
    solutionBallast[i] += (i % 2 === (heelBias > 0 ? 0 : 1) ? Math.abs(heelBias) : 0);
    if (trimBias && Math.floor(i / 2) === (trimBias > 0 ? 0 : 2)) solutionBallast[i] += Math.abs(trimBias);
  }
  const cargoMass = cargo.reduce((sum, item) => sum + item.mass, 0);
  const ballastMass = solutionBallast.reduce((sum, mass) => sum + mass, 0);
  const solutionMomentY = slots.reduce((sum, slot, index) => sum + (cargo[slotCargo[index]].mass + solutionBallast[index]) * slot.y, 0);
  const solutionMomentX = slots.reduce((sum, slot, index) => sum + (cargo[slotCargo[index]].mass + solutionBallast[index]) * slot.x, 0);
  const totalMass = hull.lightshipMass + cargoMass + ballastMass;
  const draft = totalMass / (hull.waterDensity * hull.length * hull.beam);
  const ballastCapacity = Math.max(20, ...solutionBallast) + 8 + tierIndex * 2;
  const ballastBudget = ballastMass + [40, 24, 16, 10, 6][tierIndex];
  return {
    version: CAMPAIGN_VERSION, level, tier: tierFor(level), tierIndex, difficulty,
    title: 'Ark: The Waterline Commission', passage: 'Genesis 6–9', notice: MODEL_NOTICE,
    lesson: DIFFICULTY_NOTES[tierIndex], hull, cargo, slots,
    ballast: { capacity: ballastCapacity, budget: ballastBudget, increment: 1, kg: 0.35 },
    environment: {
      windMoment: round(-solutionMomentY * hull.gravity, 7), // kN m, exactly counters solution's static mass moment
      trimMoment: round(-solutionMomentX * hull.gravity, 7), // kN m, idealised current / tow-line moment
      waveHeight: round(0.10 + difficulty * 0.22 + random() * 0.055),
      wavePeriod: round(5.2 + random() * 2.9), phase: round(random() * Math.PI * 2),
      rollExcitation: round(0.07 + difficulty * 0.07), pitchExcitation: round(0.025 + difficulty * 0.025)
    },
    limits: {
      heel: [5.5, 4.5, 3.6, 2.8, 2.2][tierIndex], trim: [1.8, 1.5, 1.2, 1.0, 0.8][tierIndex],
      freeboard: round(hull.depth - draft - 0.40 - difficulty * 0.10),
      minGM: 0.35, maxDraft: round(draft + 0.20 - difficulty * 0.08),
      launchDuration: 14 + tierIndex * 2, breachDuration: 1.25
    },
    solution: { placement: solutionPlacement, ballast: solutionBallast },
    fingerprintMass
  };
}

/** A constructive solution for testing and optional hints; it is not an automatic win. */
export function solutionFor(input = 1) {
  const config = typeof input === 'object' ? input : levelConfig(input);
  return { placement: [...config.solution.placement], ballast: [...config.solution.ballast] };
}
export function createCampaign(storage) { return campaign(CAMPAIGN_ID, storage); }
