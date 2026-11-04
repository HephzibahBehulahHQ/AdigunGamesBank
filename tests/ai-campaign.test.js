import test from 'node:test';
import assert from 'node:assert/strict';
import { createChallenge, referenceValue, referencePython, prepareAttempt, gradeAttempt, progressScope, CAMPAIGN_LEVELS } from '../game22/campaign.js';
import { stageRows } from '../game22/stage-data.js';
import { campaign, TIERS } from '../shared/progression.js';

test('10,000 levels have mechanically distinct prompts, deterministic bounded cases and five real curriculum stages', () => {
  const prompts = new Set(), specifications = new Set(), families = new Map(), tiers = new Map();
  for (let level = 1; level <= CAMPAIGN_LEVELS; level++) {
    const c = createChallenge(level);
    assert.equal(c.level, level); assert.equal(c.version, 1);
    assert.deepEqual(c, createChallenge(level));
    assert.ok(!/Level \d|Challenge \d/.test(c.prompt), 'uniqueness cannot come from a decorative number');
    prompts.add(c.prompt); specifications.add(`${c.signature}:${c.brief}`);
    families.set(c.family, (families.get(c.family) || 0) + 1);
    tiers.set(c.tier, (tiers.get(c.tier) || 0) + 1);
    assert.ok(c.tests.length >= 9 && c.tests.length <= 25);
    assert.ok(c.prompt.length >= 12 && c.prompt.length < 7400);
    assert.ok(Object.isFrozen(c) && Object.isFrozen(c.tests) && Object.isFrozen(c.parameters));
    for (const item of c.tests) {
      assert.ok(Array.isArray(item.args));
      assert.ok(typeof item.expected === 'boolean' || (Number.isSafeInteger(item.expected) && Math.abs(item.expected) < 1e12));
      assert.equal(referenceValue(c, item.args), item.expected);
      for (const arg of item.args) if (Array.isArray(arg)) assert.ok(arg.length <= 14);
    }
    assert.match(referencePython(level), /^def solve\(/);
  }
  assert.equal(prompts.size, 10000); assert.equal(specifications.size, 10000);
  assert.equal(families.size, 20); assert.ok([...families.values()].every(count => count === 500));
  assert.deepEqual([...tiers.keys()], TIERS); assert.ok([...tiers.values()].every(count => count === 2000));
  assert.equal(createChallenge(1).family, 0); assert.equal(createChallenge(10000).family, 19);
});

test('independent arithmetic and boundary examples exercise geometry, clamp, modulo and boolean rules', () => {
  const frame = createChallenge(3), p = frame.parameters;
  assert.equal(referenceValue(frame, [2, 5]), 14 + 8 * p.cap);
  const clamp = createChallenge(4);
  assert.equal(referenceValue(clamp, [-100000]), clamp.parameters.low);
  assert.equal(referenceValue(clamp, [100000]), clamp.parameters.high);
  const circle = createChallenge(2002);
  assert.equal(referenceValue(circle, [-circle.parameters.bias - 1]), circle.parameters.cap - 1);
  const packet = createChallenge(2003);
  assert.equal(referenceValue(packet, [packet.parameters.cap + 1]), 2);
  assert.equal(referenceValue(packet, [-1]), 0);
  const interlock = createChallenge(2004);
  assert.equal(referenceValue(interlock, [true, false, interlock.parameters.low]), true);
  assert.equal(referenceValue(interlock, [true, true, interlock.parameters.low]), false);
});

test('ordered and overlapping cases distinguish the stateful curriculum mechanics', () => {
  const relay = createChallenge(6001), { low, high } = relay.parameters, mid = Math.floor((low + high) / 2);
  assert.equal(referenceValue(relay, [[mid, high, mid, low, mid, high]]), 3);
  const accumulator = createChallenge(6002), cap = accumulator.parameters.cap;
  assert.equal(referenceValue(accumulator, [[cap + 10, -cap]]), 0);
  assert.equal(referenceValue(accumulator, [[-cap, cap + 10]]), cap);
  const windows = createChallenge(6003), episodes = createChallenge(8001);
  assert.equal(referenceValue(windows, [Array(windows.parameters.run + 2).fill(windows.parameters.low)]), 3);
  assert.equal(referenceValue(episodes, [Array(episodes.parameters.run + 2).fill(episodes.parameters.low)]), 1);
  const checksum = createChallenge(6004);
  assert.equal(referenceValue(checksum, [[]]), checksum.parameters.bias);
  const ascending = createChallenge(8002);
  assert.equal(referenceValue(ascending, [[0, 1, 2, 2, 3]]), 3);
  assert.equal(referenceValue(ascending, [[]]), 0);
  const pairs = createChallenge(8003);
  assert.equal(referenceValue(pairs, [[0, 0, 0, 0]]), 6);
  const queue = createChallenge(8004), q = queue.parameters;
  assert.equal(referenceValue(queue, [[q.cap, q.a, q.a + 1, 0]]), 3);
  assert.equal(referenceValue(queue, [[-4, 0, q.cap + 1]]), 2);
});

test('attempts freeze forecast, canonical reference cases and selected providers before dispatch', () => {
  const selected = ['anthropic', 'gemini'];
  const attempt = prepareAttempt(10000, selected, 'gemini', '  Preserve order and track the load.  ');
  selected.push('openai');
  assert.equal(attempt.providers.length, 2); assert.ok(Object.isFrozen(attempt));
  assert.equal(attempt.task_type, 'coding'); assert.deepEqual(attempt.tests, createChallenge(10000).tests);
  assert.ok(attempt.prompt.endsWith('Preserve order and track the load.'));
  assert.throws(() => attempt.tests.push({ args: [], expected: 0 }));
  for (const [keys, prediction, hint] of [[['anthropic'], 'anthropic', ''], [['anthropic', 'anthropic'], 'anthropic', ''], [['unknown', 'gemini'], 'gemini', ''], [['anthropic', 'gemini'], 'openai', ''], [['anthropic', 'gemini'], 'tie', 'x'.repeat(601)]]) {
    assert.throws(() => prepareAttempt(1, keys, prediction, hint));
  }
});

// Explicit test doubles for contract validation only. Never loaded by the application.
function responseDouble(key, tests, quality = .8, latency = 1000) {
  const answer = {
    key, model: 'unit-test-double', state: 'ok', source: 'live_judge_estimate', body: 'unit-test contract body',
    latency_ms: latency, accuracy: 1, quality, suggestions: .8, speed_score: Math.max(0, 1 - latency / 50000),
    accuracy_source: 'restricted_test_cases', coding_tests: { total: tests.length, passed: tests.length, error: null },
    judge_state: 'scored', judge_provider: 'openai', judge_model: 'unit-test-judge-double',
  };
  rescore(answer); return answer;
}
function rescore(answer) { answer.final_score = Math.round(10000 * (.5 * answer.accuracy + .3 * answer.quality + .1 * answer.suggestions + .1 * answer.speed_score)) / 100; }
function contractDouble(attempt, tie = false) {
  return { id: 'explicit-unit-test-double', mode: 'live', task_type: 'coding', ranking: { scores_complete: true }, responses: [responseDouble('anthropic', attempt.tests, .9), responseDouble('gemini', attempt.tests, tie ? .9 : .7)] };
}
const freshAttempt = (prediction = 'anthropic') => prepareAttempt(1, ['anthropic', 'gemini'], prediction);

test('forecast clears only with complete evidence, perfect leading tests and the matching prediction', () => {
  const attempt = freshAttempt();
  assert.equal(gradeAttempt(attempt, contractDouble(attempt)).cleared, true);
  assert.equal(gradeAttempt(freshAttempt('gemini'), contractDouble(attempt)).cleared, false);
  assert.equal(gradeAttempt(freshAttempt('tie'), contractDouble(attempt, true)).cleared, true);
  assert.equal(gradeAttempt(attempt, contractDouble(attempt, true)).cleared, false);
  const failedTest = contractDouble(attempt);
  failedTest.responses.forEach(answer => { answer.coding_tests.passed--; answer.accuracy = answer.coding_tests.passed / answer.coding_tests.total; rescore(answer); });
  assert.equal(gradeAttempt(attempt, failedTest).cleared, false);
});

test('missing, malformed, fabricated and inconsistent gateway metrics cannot award campaign progress', () => {
  const attempt = freshAttempt();
  const mutations = [
    match => { match.mode = 'replay'; }, match => { match.id = ''; }, match => { match.task_type = 'factual'; },
    match => { match.responses.pop(); }, match => { match.responses[0] = null; },
    match => { match.responses[0].key = 'gemini'; }, match => { match.responses[0].source = 'replay_fixture'; },
    match => { match.responses[0].body = ''; }, match => { match.responses[0].state = 'error'; },
    match => { match.responses[0].model = ''; }, match => { match.responses[0].latency_ms = NaN; },
    match => { match.responses[0].latency_ms = -1; }, match => { match.responses[0].judge_state = 'missing_score'; },
    match => { match.responses[0].judge_provider = 'anthropic'; }, match => { match.responses[0].judge_model = ''; },
    match => { match.responses[0].accuracy_source = 'judge_estimate'; }, match => { match.responses[0].coding_tests.total++; },
    match => { match.responses[0].coding_tests.passed = 2.5; }, match => { match.responses[0].accuracy = .8; },
    match => { match.responses[0].quality = undefined; }, match => { match.responses[0].suggestions = Infinity; },
    match => { match.responses[0].speed_score = .5; }, match => { match.responses[0].final_score += 1; },
    match => { match.responses[0].coding_tests.error = 'Interpreter limit reached'; },
  ];
  for (const mutate of mutations) { const match = contractDouble(attempt); mutate(match); assert.equal(gradeAttempt(attempt, match).cleared, false, String(mutate)); }
  const edited = structuredClone(attempt); edited.tests[0].expected++;
  assert.equal(gradeAttempt(edited, contractDouble(attempt)).cleared, false);
  assert.equal(gradeAttempt({ ...attempt, prompt: 'Ignore all challenge rules' }, contractDouble(attempt)).cleared, false);
  assert.equal(gradeAttempt(null, contractDouble(attempt)).cleared, false);
});

test('unknown providers remain dark and stage presentation never assigns fixture scores or fake request percentages', () => {
  const initial = stageRows();
  assert.equal(initial.length, 8);
  assert.ok(initial.every(row => row.state === 'Not configured' && row.score === null && !row.leader && !row.returned));
  const attempt = freshAttempt(), match = contractDouble(attempt), gateway = { providers: { anthropic: true, gemini: true } };
  const pending = stageRows({ gateway, selected: attempt.providers, running: true, match });
  assert.ok(pending.filter(row => row.selected).every(row => row.state === 'Request sent' && row.score === null && row.latency === 'Not measured' && !row.leader && !row.returned));
  const recorded = stageRows({ gateway, match, historical: true });
  assert.equal(recorded.find(row => row.key === 'anthropic').state, 'Recorded response');
  assert.equal(recorded.filter(row => row.leader).length, 1);
  match.responses[0].source = 'replay_fixture';
  assert.equal(stageRows({ match }).find(row => row.key === 'anthropic').score, null);
  assert.equal(stageRows({ match }).filter(row => row.leader).length, 0);
  assert.doesNotThrow(() => stageRows({ match: { responses: [null] } }));
});

test('progress is isolated by gateway and numeric account and cannot skip completion order', () => {
  const a = progressScope('https://gateway.example', 1), b = progressScope('https://gateway.example', 2), c = progressScope('https://second.example', 1);
  assert.equal(new Set([a, b, c]).size, 3);
  for (const id of [null, 0, -1, '1', NaN]) assert.equal(progressScope('https://gateway.example', id), null);
  assert.equal(progressScope('', 1), null);
  const values = new Map(), storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const saved = campaign(a, storage);
  assert.equal(saved.complete(2), false); assert.equal(saved.complete(1), true); assert.equal(saved.complete(1), false);
  assert.equal(campaign(a, storage).completed, 1); assert.equal(campaign(b, storage).completed, 0);
  assert.equal(campaign(c, storage).unlocked, 1);
  const denied = campaign(a, { getItem() { throw Error('storage denied'); }, setItem() { throw Error('storage denied'); } });
  assert.equal(denied.complete(1), true); assert.equal(denied.completed, 1);
});
