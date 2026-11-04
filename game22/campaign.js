import { LEVEL_COUNT, validLevel, tierFor, randomFor } from '../shared/progression.js';
import { providers, isLiveAnswer } from './arena-utils.js';

export const CAMPAIGN_VERSION = 1;
export const CAMPAIGN_LEVELS = LEVEL_COUNT;
const providerKeys = new Set(providers.map(provider => provider.key));
const families = [
  ['Affine calibration', 'Arithmetic', 'x'],
  ['Distance compensation', 'Arithmetic', 'x, y'],
  ['Frame clearance', 'Arithmetic', 'width, height'],
  ['Sensor clamp', 'Comparisons', 'x'],
  ['Two-rate workload', 'Branching', 'n'],
  ['Circular indexing', 'Remainders', 'position'],
  ['Packet batching', 'Integer division', 'count'],
  ['Safety interlock', 'Boolean logic', 'enabled, locked, reading'],
  ['Band filter', 'List aggregation', 'values'],
  ['Position weighting', 'Iteration', 'values'],
  ['Excess load', 'List aggregation', 'values'],
  ['Asymmetric balance', 'Iteration and branching', 'values'],
  ['Hysteresis relay', 'State transitions', 'readings'],
  ['Saturating accumulator', 'Ordered updates', 'values'],
  ['Alarm windows', 'Consecutive sequences', 'readings'],
  ['Rolling checksum', 'Modular state', 'values'],
  ['Qualified episodes', 'Stateful grouping', 'readings'],
  ['Bounded ascending run', 'Sequence analysis', 'values'],
  ['Pair admission', 'Nested iteration', 'values'],
  ['Queue admission', 'Ordered simulation', 'events'],
];

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
function parameters(variant) {
  const a = 2 + variant % 9, low = variant - 251;
  return { a, bias: variant + 5, cap: variant + 17, low, high: low + 20 + a, run: 2 + variant % 4, modulus: 1014 + variant };
}

/** Independent integer/Boolean ground truth. This is never rendered as a model answer. */
export function referenceValue(challenge, args) {
  const p = challenge.parameters, f = challenge.family;
  const [x, y, z] = args;
  if (f === 0) return p.a * x + p.bias;
  if (f === 1) return Math.abs(x - y) + p.bias;
  if (f === 2) return 2 * (x + y + 4 * p.cap);
  if (f === 3) return Math.min(p.high, Math.max(p.low, x));
  if (f === 4) return x <= p.cap ? x * p.a : p.cap * p.a + (x - p.cap) * (p.a + 3);
  if (f === 5) return ((x + p.bias) % p.cap + p.cap) % p.cap;
  if (f === 6) return x <= 0 ? 0 : Math.floor((x + p.cap - 1) / p.cap);
  if (f === 7) return Boolean(x && !y && z >= p.low && z <= p.high);
  if (f === 8) return x.filter(v => v >= p.low && v <= p.high).reduce((a, b) => a + b, 0);
  if (f === 9) return x.reduce((total, value, index) => total + value * (index + p.bias), 0);
  if (f === 10) return x.reduce((total, value) => total + Math.max(0, value - p.cap), 0);
  if (f === 11) return x.reduce((total, value) => total + value * (value >= 0 ? p.a : p.cap), 0);
  if (f === 12) {
    let on = false, ticks = 0;
    for (const value of x) { if (value >= p.high) on = true; else if (value <= p.low) on = false; if (on) ticks++; }
    return ticks;
  }
  if (f === 13) return x.reduce((state, value) => Math.min(p.cap, Math.max(0, state + value)), 0);
  if (f === 14) {
    let run = 0, windows = 0;
    for (const value of x) { run = value >= p.low ? run + 1 : 0; if (run >= p.run) windows++; }
    return windows;
  }
  if (f === 15) return x.reduce((state, value) => ((state * (31 + p.a) + value) % p.modulus + p.modulus) % p.modulus, p.bias);
  if (f === 16) {
    let run = 0, episodes = 0;
    for (const value of x) { run = value >= p.low ? run + 1 : 0; if (run === p.run) episodes++; }
    return episodes;
  }
  if (f === 17) {
    let previous = null, run = 0, longest = 0;
    for (const value of x) { run = previous !== null && value > previous && value - previous <= p.cap ? run + 1 : 1; longest = Math.max(longest, run); previous = value; }
    return longest;
  }
  if (f === 18) {
    let pairs = 0;
    for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) if (x[i] + x[j] <= p.cap) pairs++;
    return pairs;
  }
  if (f === 19) {
    let load = 0, accepted = 0;
    for (const value of x) { load = Math.max(0, load - p.a); const event = Math.max(0, value); if (load + event <= p.cap) { load += event; accepted++; } }
    return accepted;
  }
  throw Error('Unknown challenge family.');
}

function specification(f, p) {
  return [
    `Return ${p.a} * x + ${p.bias}. Inputs are integers.`,
    `Return the absolute difference between integer x and integer y, then add the fixed compensation ${p.bias}.`,
    `A rectangular frame has integer width and height. Add clearance ${p.cap} to EACH of its four sides: the outer width is width + 2 * ${p.cap}, and outer height is height + 2 * ${p.cap}. Return the outer perimeter.`,
    `Clamp integer x to the inclusive range [${p.low}, ${p.high}]. Values below the range return ${p.low}; values above it return ${p.high}.`,
    `For nonnegative integer workload n, charge ${p.a} work units per item for the first ${p.cap} items and ${p.a + 3} units per additional item. Return total work units. These are synthetic workload units, not financial prices.`,
    `A circular buffer has ${p.cap} slots numbered 0 to ${p.cap - 1}. Add offset ${p.bias} to integer position, then wrap into that range. Positions may be negative.`,
    `A packet holds ${p.cap} items. Return the number of packets needed for integer count, rounding up. A count of zero or less requires zero packets.`,
    `Return a Boolean: enabled must be True, locked must be False, and integer reading must lie in the inclusive band [${p.low}, ${p.high}]. Otherwise return False.`,
    `Return the sum of all integers in values that lie in the inclusive band [${p.low}, ${p.high}]. An empty list returns 0.`,
    `The first integer in values has weight ${p.bias}, the second ${p.bias + 1}, and so on. Return the sum of each value times its position weight. An empty list returns 0.`,
    `For each integer in values, measure only the excess above ${p.cap}; values at or below ${p.cap} contribute 0. Return the total excess.`,
    `For each integer in values, multiply nonnegative values by ${p.a} and negative values by ${p.cap}. Return the sum of the signed products.`,
    `A relay starts OFF. Read readings in order. A value >= ${p.high} turns it ON; a value <= ${p.low} turns it OFF; intermediate values preserve its state. Return the number of readings after which it is ON.`,
    `Start an accumulator at 0. For each integer in values, add it and immediately clamp the accumulator to [0, ${p.cap}] BEFORE processing the next value. Return the final accumulator.`,
    `A qualifying reading is >= ${p.low}. Count every consecutive window of ${p.run} qualifying readings, including overlapping windows. A lower reading breaks the run. Return the window count.`,
    `Start checksum h at ${p.bias}. For each integer value in order, set h = (h * ${31 + p.a} + value) modulo ${p.modulus}. Use a nonnegative remainder. Return h; an empty list returns the initial checksum.`,
    `A qualifying reading is >= ${p.low}. An episode is a maximal consecutive group of qualifying readings. Count episodes with at least ${p.run} readings, including an episode at the end. Count each qualifying episode only once.`,
    `Find the longest consecutive run in values where each next integer is strictly greater than its predecessor and the increase is at most ${p.cap}. Return its length; empty gives 0 and a single value gives 1.`,
    `Count unordered pairs of DISTINCT positions in values whose two integers sum to at most ${p.cap}. Equal values in different positions still form a pair. Count each pair once, without modifying the input.`,
    `A queue starts with load 0 and capacity ${p.cap}. For each integer event, FIRST reduce load by ${p.a}, stopping at 0. Treat a negative event as 0. If adding that event fits capacity, accept it and add its load; otherwise reject it and keep the decayed load. Return the number of accepted events.`,
  ][f];
}

function testArguments(f, p, random, count) {
  const int = (min, max) => min + Math.floor(random() * (max - min + 1));
  let cases;
  if (f === 0 || f === 3 || f === 5) cases = [0, -1, 1, p.low - 1, p.low, p.high, p.high + 1, -p.cap * 2, p.cap * 3].map(x => [x]);
  else if (f === 1) cases = [[0, 0], [2, -2], [-3, 4], [-7, -7], [p.cap, -p.cap]];
  else if (f === 2) cases = [[0, 0], [1, 1], [2, 5], [p.cap, 1], [1, p.cap]];
  else if (f === 4 || f === 6) cases = [0, 1, p.cap - 1, p.cap, p.cap + 1, 2 * p.cap, 2 * p.cap + 1, ...(f === 6 ? [-1, -p.cap] : [])].map(x => [x]);
  else if (f === 7) cases = [[true, false, p.low], [true, false, p.high], [true, false, p.low - 1], [true, false, p.high + 1], [true, true, p.low], [false, false, p.low], [false, true, p.high]];
  else {
    const mid = Math.floor((p.low + p.high) / 2);
    let lists = [[], [0], [p.low - 1, p.low, p.high, p.high + 1], [p.cap, -p.cap, 0, p.cap + 1], [2, 2, 2, 2], [-3, -2, -1, 0, 1]];
    if (f === 12) lists = [[], [p.high], [p.low], [p.high, mid, mid, p.low, mid], [mid, p.high, p.low, p.high, mid]];
    if (f === 14 || f === 16) lists = [[], Array(p.run - 1).fill(p.low), Array(p.run).fill(p.low), Array(p.run + 2).fill(p.low), [...Array(p.run).fill(p.low), p.low - 1, ...Array(p.run + 1).fill(p.high)]];
    if (f === 17) lists = [[], [3], [3, 3, 3], [0, p.cap, 2 * p.cap, 3 * p.cap], [0, p.cap + 1, p.cap + 2], [4, 3, 2, 1]];
    if (f === 18) lists = [[], [p.cap], [0, p.cap], [p.cap, 1], [p.cap, -p.cap, 0, 0], [1, 1, 1, 1, 1, 1]];
    if (f === 19) lists = [[], [0], [-1], [p.cap, p.a, p.a + 1, 0], [p.cap + 1, p.cap, -3, p.cap, p.a]];
    cases = lists.map(values => [values]);
  }
  while (cases.length < count) {
    if (f === 1) cases.push([int(-p.cap * 2, p.cap * 2), int(-p.cap * 2, p.cap * 2)]);
    else if (f === 2) cases.push([int(0, p.cap * 2), int(0, p.cap * 2)]);
    else if (f === 4 || f === 6) cases.push([int(f === 6 ? -p.cap : 0, p.cap * 4)]);
    else if (f === 7) cases.push([random() > .25, random() > .75, int(p.low - 10, p.high + 10)]);
    else if (f < 8) cases.push([int(-p.cap * 3, p.cap * 3)]);
    else cases.push([Array.from({ length: int(2, f === 18 ? 6 : 14) }, () => int(Math.min(-p.cap, p.low - 3), Math.max(p.cap * 2, p.high + 3)))]);
  }
  return cases.slice(0, count);
}

/** 20 mechanical problem families, 500 parameterisations each; one game, 10,000 levels. */
export function createChallenge(value) {
  const level = validLevel(value), tier = Math.floor((level - 1) / 2000);
  const family = tier * 4 + (level - 1) % 4;
  const variant = Math.floor(((level - 1) % 2000) / 4) + 1;
  const p = parameters(variant), [title, skill, args] = families[family];
  const challenge = { version: CAMPAIGN_VERSION, level, tier: tierFor(level), family, title, skill, parameters: p, signature: `solve(${args})` };
  challenge.brief = specification(family, p);
  const cases = testArguments(family, p, randomFor(level * 92821 + 97), family === 18 ? 9 : 9 + tier * 2);
  challenge.tests = cases.map(args => ({ args, expected: referenceValue(challenge, args) }));
  const examples = challenge.tests.slice(0, 3).map(item => `${challenge.signature.replace(args, item.args.map(x => JSON.stringify(x)).join(', '))} => ${JSON.stringify(item.expected)}`).join('\n');
  challenge.prompt = `Implement exactly one Python function ${challenge.signature}.\n${challenge.brief}\n\nExamples (JSON notation uses true/false; return Python True/False where appropriate):\n${examples}\n\nReturn only the function, without imports or explanation. Use simple positional arguments, arithmetic, comparisons, if/else, for loops, and abs/min/max/sum/len/range as needed. No indexing, attributes, comprehensions, recursion, while loops, network or file access. Preserve input values. The function is evaluated on bounded integer/Boolean/list cases.`;
  return deepFreeze(challenge);
}

export function prepareAttempt(level, selected, prediction, hint = '') {
  if (!Array.isArray(selected) || selected.length < 2 || selected.length > 8 || new Set(selected).size !== selected.length || selected.some(key => !providerKeys.has(key))) throw Error('Choose two or more different supported providers.');
  if (prediction !== 'tie' && !selected.includes(prediction)) throw Error('Forecast one selected contender or a tie before the match.');
  if (typeof hint !== 'string' || hint.trim().length > 600) throw Error('Keep the strategy hint to 600 characters.');
  const challenge = createChallenge(level);
  const prompt = challenge.prompt + (hint.trim() ? `\n\nPlayer strategy hint (the required function and rules above remain unchanged):\n${hint.trim()}` : '');
  return deepFreeze({ level: challenge.level, providers: [...selected], prediction, prompt, task_type: 'coding', tests: challenge.tests });
}

const metric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
/** Grades one fresh API response in the caller's active attempt; never a saved-history action. */
export function gradeAttempt(attempt, match) {
  const fail = reason => ({ cleared: false, reason, leaders: [] });
  if (!attempt || !Number.isInteger(attempt.level) || attempt.level < 1 || attempt.level > LEVEL_COUNT) return fail('The challenge attempt is invalid.');
  const challenge = createChallenge(attempt.level);
  if (attempt.task_type !== 'coding' || typeof attempt.prompt !== 'string' || !attempt.prompt.startsWith(challenge.prompt) || JSON.stringify(attempt.tests) !== JSON.stringify(challenge.tests) || !Array.isArray(attempt.providers) || new Set(attempt.providers).size !== attempt.providers.length || attempt.providers.length < 2 || attempt.providers.length > 8 || attempt.providers.some(key => !providerKeys.has(key))) return fail('Challenge tests or competitors changed. Start a fresh attempt.');
  if (attempt.prediction !== 'tie' && !attempt.providers.includes(attempt.prediction)) return fail('A valid forecast is required.');
  if (match?.mode !== 'live' || match.task_type !== 'coding' || typeof match.id !== 'string' || !match.id.trim()) return fail('A completed live coding match is required.');
  if (match.prompt !== attempt.prompt || JSON.stringify(match.tests) !== JSON.stringify(attempt.tests)) return fail('The gateway evidence does not match the submitted prompt and reference cases. No progress was awarded; use an updated gateway.');
  const answers = match.responses;
  if (!Array.isArray(answers) || answers.length !== attempt.providers.length || answers.some(answer => !answer || typeof answer !== 'object') || new Set(answers.map(a => a.key)).size !== answers.length || answers.some(a => !attempt.providers.includes(a.key))) return fail('The response set does not match the selected contenders.');
  for (const answer of answers) {
    if (!isLiveAnswer(answer) || typeof answer.model !== 'string' || !answer.model.trim() || typeof answer.latency_ms !== 'number' || !Number.isFinite(answer.latency_ms) || answer.latency_ms < 0) return fail('Every selected contender must return an actual, identified response. Retry unavailable providers.');
    if (answer.accuracy_source !== 'restricted_test_cases' || !answer.coding_tests || answer.coding_tests.total !== challenge.tests.length || !Number.isInteger(answer.coding_tests.passed) || answer.coding_tests.passed < 0 || answer.coding_tests.passed > challenge.tests.length) return fail('The gateway did not return valid evidence for these reference tests.');
    if (!['accuracy', 'quality', 'suggestions', 'speed_score'].every(key => metric(answer[key])) || answer.judge_state !== 'scored' || !providerKeys.has(answer.judge_provider) || answer.judge_provider === answer.key || typeof answer.judge_model !== 'string' || !answer.judge_model.trim()) return fail('Every contender needs complete independent judge metrics. The judge cannot score itself.');
    const speed = Math.max(0, 1 - answer.latency_ms / 50000);
    const score = 100 * (.5 * answer.accuracy + .3 * answer.quality + .1 * answer.suggestions + .1 * answer.speed_score);
    if (Math.abs(answer.accuracy - answer.coding_tests.passed / challenge.tests.length) > 1e-8 || Math.abs(speed - answer.speed_score) > 1e-8 || typeof answer.final_score !== 'number' || !Number.isFinite(answer.final_score) || Math.abs(score - answer.final_score) > .011) return fail('Reported scores do not agree with the measured rubric.');
  }
  const highest = Math.max(...answers.map(answer => answer.final_score));
  const leaders = answers.filter(answer => answer.final_score === highest);
  if (leaders.some(answer => answer.coding_tests.passed !== challenge.tests.length || answer.coding_tests.error)) return fail('The leading answer must pass every reference test. Refine the hint or contenders, then try again.');
  const correct = attempt.prediction === 'tie' ? leaders.length > 1 : leaders.length === 1 && leaders[0].key === attempt.prediction;
  if (!correct) return { cleared: false, reason: leaders.length > 1 ? 'The leaders tied. Your forecast did not match; review their results and retry.' : `The highest complete score belonged to ${providers.find(p => p.key === leaders[0].key).label}. Review the evidence and retry your forecast.`, leaders: leaders.map(a => a.key) };
  return { cleared: true, reason: `Forecast confirmed. The leading answer passed all ${challenge.tests.length} reference tests.`, leaders: leaders.map(a => a.key) };
}

export function progressScope(origin, userId) {
  if (!origin || !Number.isInteger(userId) || userId < 1) return null;
  return `ai-arena-v${CAMPAIGN_VERSION}:${encodeURIComponent(origin)}:${userId}`;
}

/** Read-back must be a restorable campaign record, not only a matching counter. */
export function progressWasSaved(raw, completed) {
  try {
    const saved = JSON.parse(raw || 'null');
    return saved?.version === 1 && Number.isInteger(saved.completed) && saved.completed >= completed && saved.completed >= 0 && saved.completed <= LEVEL_COUNT && saved.unlocked === Math.min(LEVEL_COUNT, saved.completed + 1);
  } catch { return false; }
}

/** Test oracle only: source is never sent as a contestant answer or shown in the arena. */
export function referencePython(value) {
  const c = createChallenge(value), p = c.parameters;
  const code = [
    `return ${p.a} * x + ${p.bias}`,
    `return abs(x - y) + ${p.bias}`,
    `return 2 * (width + height + 4 * ${p.cap})`,
    `return min(${p.high}, max(${p.low}, x))`,
    `return n * ${p.a} if n <= ${p.cap} else ${p.cap} * ${p.a} + (n - ${p.cap}) * ${p.a + 3}`,
    `return (position + ${p.bias}) % ${p.cap}`,
    `return 0 if count <= 0 else (count + ${p.cap - 1}) // ${p.cap}`,
    `return enabled and not locked and ${p.low} <= reading <= ${p.high}`,
    `total = 0\nfor value in values:\n    if ${p.low} <= value <= ${p.high}:\n        total += value\nreturn total`,
    `total = 0\nweight = ${p.bias}\nfor value in values:\n    total += value * weight\n    weight += 1\nreturn total`,
    `total = 0\nfor value in values:\n    total += max(0, value - ${p.cap})\nreturn total`,
    `total = 0\nfor value in values:\n    total += value * (${p.a} if value >= 0 else ${p.cap})\nreturn total`,
    `on = False\nticks = 0\nfor value in readings:\n    if value >= ${p.high}:\n        on = True\n    elif value <= ${p.low}:\n        on = False\n    if on:\n        ticks += 1\nreturn ticks`,
    `state = 0\nfor value in values:\n    state = min(${p.cap}, max(0, state + value))\nreturn state`,
    `run = 0\nwindows = 0\nfor value in readings:\n    run = run + 1 if value >= ${p.low} else 0\n    if run >= ${p.run}:\n        windows += 1\nreturn windows`,
    `h = ${p.bias}\nfor value in values:\n    h = (h * ${31 + p.a} + value) % ${p.modulus}\nreturn h`,
    `run = 0\nepisodes = 0\nfor value in readings:\n    run = run + 1 if value >= ${p.low} else 0\n    if run == ${p.run}:\n        episodes += 1\nreturn episodes`,
    `previous = None\nrun = 0\nlongest = 0\nfor value in values:\n    run = run + 1 if previous != None and value > previous and value - previous <= ${p.cap} else 1\n    longest = max(longest, run)\n    previous = value\nreturn longest`,
    `pairs = 0\ni = 0\nfor x in values:\n    j = 0\n    for y in values:\n        if j > i and x + y <= ${p.cap}:\n            pairs += 1\n        j += 1\n    i += 1\nreturn pairs`,
    `load = 0\naccepted = 0\nfor event in events:\n    load = max(0, load - ${p.a})\n    event = max(0, event)\n    if load + event <= ${p.cap}:\n        load += event\n        accepted += 1\nreturn accepted`,
  ][c.family];
  return `def ${c.signature}:\n` + code.split('\n').map(line => '    ' + line).join('\n');
}
