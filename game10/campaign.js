import { campaign, randomFor, tierFor, validLevel, LEVEL_COUNT } from '../shared/progression.js';

export { LEVEL_COUNT };
export const CAMPAIGN_ID = 'apex-circuit';
export const TRACK_SAMPLES = 192;
export const createCampaign = storage => campaign(CAMPAIGN_ID, storage);
const TAU = Math.PI * 2;

/** Original, closed radial circuits. Every configuration has one unambiguous route. */
export function circuitFor(requested) {
  const level = validLevel(requested), tier = Math.floor((level - 1) / 2000);
  const random = randomFor(10019 + level * 731), first = level === 1;
  const radius = first ? 28 : 39 + tier * 4 + ((level - 2) % 2000) / 500 + random() * 2;
  const waveA = first ? 0 : 0.015 + tier * 0.018 + random() * 0.025;
  const waveB = first ? 0 : 0.006 + tier * 0.007 + random() * 0.008;
  const phaseA = random() * TAU, phaseB = random() * TAU;
  const width = first ? 11 : 11 - tier * 0.8 - random() * 0.8;
  const points = [], segments = [];
  let length = 0, maxCurvature = 0;
  for (let i = 0; i <= TRACK_SAMPLES; i++) {
    const angle = -Math.PI / 2 + i / TRACK_SAMPLES * TAU;
    const r = radius * (1 + waveA * Math.sin(angle * 2 + phaseA) + waveB * Math.sin(angle * 3 + phaseB));
    points.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });
  }
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
    const size = Math.hypot(dx, dz);
    segments.push({ a, b, dx, dz, length: size, start: length, heading: Math.atan2(dz, dx) });
    length += size;
  }
  for (let i = 0; i < segments.length; i++) {
    const a = segments[i], b = segments[(i + 1) % segments.length];
    const turn = Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading));
    maxCurvature = Math.max(maxCurvature, Math.abs(turn) / ((a.length + b.length) / 2));
  }
  const laps = tier < 1 ? 1 : tier < 3 ? 2 : 3;
  const grip = first ? 10 : 10.2 - tier * 0.6 - random() * 0.9;
  const maxSpeed = first ? 14 : 20 + tier * 3;
  const safeSpeed = Math.min(maxSpeed * 0.86, Math.sqrt(grip * 0.62 / maxCurvature));
  const timeLimit = first ? 45 : Math.ceil(length * laps / safeSpeed * (1.7 - tier * 0.07) + 14);
  return {
    version: 1, level, tier: tierFor(level), name: first ? 'Founders Ring' : ['Harbour Loop', 'Quarry Sweep', 'Copper Ridge', 'Coastal Crest', 'Midnight Grand Circuit'][tier],
    radius, waveA, waveB, phaseA, phaseB, width, points, segments, length, maxCurvature,
    laps, gateCount: 12, grip, maxSpeed, safeSpeed, timeLimit,
    turnRadius: first ? 28 : 9, acceleration: first ? 8 : 10,
    goldTime: first ? 19 : Math.ceil(length * laps / safeSpeed * 1.18 + 5),
    silverTime: first ? 29 : Math.ceil(timeLimit * 0.86),
    conditions: first || tier < 2 ? 'Dry tarmac' : tier === 2 ? 'Cool tyres' : 'Damp tarmac',
    description: first
      ? 'One lap, twelve ordered gates. For this practice ring, set steering fully right (+100%) and hold the throttle. The car follows the centre line.'
      : `${laps} laps through a changing-radius circuit. Brake before tight bends: excess speed makes the car run wide. Cross all twelve gates in order on every lap.`,
    signature: [radius, waveA, waveB, phaseA, phaseB, width, laps, grip].join('|')
  };
}

export function trackPoint(config, distance) {
  const wrapped = ((distance % config.length) + config.length) % config.length;
  let low = 0, high = config.segments.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (config.segments[middle].start <= wrapped) low = middle; else high = middle - 1;
  }
  const segment = config.segments[low], fraction = (wrapped - segment.start) / segment.length;
  return { x: segment.a.x + segment.dx * fraction, z: segment.a.z + segment.dz * fraction,
    heading: segment.heading, distance: wrapped, index: low,
    tx: segment.dx / segment.length, tz: segment.dz / segment.length };
}

export function projectToTrack(config, x, z) {
  let best = null, squared = Infinity;
  for (let i = 0; i < config.segments.length; i++) {
    const s = config.segments[i];
    const fraction = Math.max(0, Math.min(1, ((x - s.a.x) * s.dx + (z - s.a.z) * s.dz) / (s.length * s.length)));
    const px = s.a.x + s.dx * fraction, pz = s.a.z + s.dz * fraction;
    const d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < squared) {
      squared = d;
      best = { x: px, z: pz, distance: (s.start + fraction * s.length) % config.length,
        offset: ((x - px) * -s.dz + (z - pz) * s.dx) / s.length,
        heading: s.heading, index: i, gap: Math.sqrt(d) };
    }
  }
  return best;
}
