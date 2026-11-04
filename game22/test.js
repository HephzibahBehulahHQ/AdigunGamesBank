import test from 'node:test';
import assert from 'node:assert/strict';
import { providers, parseApiOrigin, isLiveAnswer, formatLatency, formatMetric, parseCodingTests } from './arena-utils.js';

test('the eight supported providers include distinct Kimi and Adigun connections', () => {
  assert.equal(new Set(providers.map(provider => provider.key)).size, 8);
  assert.ok(providers.some(provider => provider.key === 'kimi'));
  assert.ok(providers.some(provider => provider.key === 'adigun'));
});
test('API origins accept HTTPS and actual localhost without storing credentials or paths', () => {
  assert.equal(parseApiOrigin(' https://api.example.com/ '), 'https://api.example.com');
  assert.equal(parseApiOrigin('http://localhost:8000'), 'http://localhost:8000');
  assert.equal(parseApiOrigin('http://[::1]:8000'), 'http://[::1]:8000');
  for (const url of ['http://localhost.evil.com', 'http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/api', 'https://example.com/?token=secret', 'https://example.com/#token']) assert.throws(() => parseApiOrigin(url));
});
test('replay fixtures, empty answers and unknown sources never render as live', () => {
  assert.equal(isLiveAnswer({ state: 'ok', source: 'live_unscored', body: 'Provider answer' }), true);
  for (const answer of [{ state: 'ok', source: 'replay_fixture', body: 'Fixture' }, { state: 'ok', source: 'live_unscored', body: '  ' }, { state: 'error', source: 'live_unscored', body: 'Failed' }, { state: 'ok', source: 'invented', body: 'Pretend' }]) assert.equal(isLiveAnswer(answer), false);
});
test('unknown and non-finite scores are never shown as zero or a valid score', () => {
  for (const value of [null, undefined, NaN, Infinity, -1, 1.5, '0.5']) assert.equal(formatMetric(value), 'Unknown');
  assert.equal(formatMetric(0), '0.0%');
  assert.equal(formatMetric(0.875), '87.5%');
  assert.equal(formatLatency(null), 'Not measured');
  assert.equal(formatLatency(1600), '1.60 s');
});
test('coding cases require explicit expectations and bounded case count', () => {
  assert.deepEqual(parseCodingTests('[{"args":[1,2],"expected":3}]'), [{ args: [1, 2], expected: 3 }]);
  for (const input of ['bad json', '[]', '{}', '[{"args":[1]}]', JSON.stringify(Array(26).fill({ args: [], expected: 0 }))]) assert.throws(() => parseCodingTests(input));
});
