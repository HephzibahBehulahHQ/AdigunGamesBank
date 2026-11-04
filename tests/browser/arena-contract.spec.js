import { test, expect } from '@playwright/test';
import { createChallenge, progressScope } from '../../game22/campaign.js';

// TEST-ONLY CONTRACT DOUBLES. No provider is called, and no assertion below is
// evidence of real live model output, provider availability or a real campaign win.
const TEST_GATEWAY = 'https://arena-contract.invalid';
const saveKey = id => `adigun.campaign.v1.${progressScope(TEST_GATEWAY, id)}`;

function testOnlyAnswer(key, tests, quality, latency) {
  const accuracy = 1, suggestions = .8, speed = Math.max(0, 1 - latency / 50000);
  return {
    key, model: `TEST-ONLY-${key}-MODEL`, state: 'ok', source: 'live_judge_estimate',
    body: '# Explicit browser contract test double; never real model output.\ndef solve(x):\n    return 3 * x + 6',
    latency_ms: latency, accuracy, quality, suggestions, speed_score: speed,
    final_score: Math.round(10000 * (.5 * accuracy + .3 * quality + .1 * suggestions + .1 * speed)) / 100,
    accuracy_source: 'restricted_test_cases', coding_tests: { passed: tests.length, total: tests.length, score: 1, error: null },
    judge_state: 'scored', judge_provider: 'openai', judge_model: 'TEST-ONLY-JUDGE', judge_reason: 'Contract test double only.',
  };
}

test('AI Arena TEST-ONLY gateway: bound campaign awards, stale-result clearing and account isolation', async ({ page }) => {
  const submitted = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(`${TEST_GATEWAY}/**`, async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    const respond = data => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/api/health') return respond({
      service: 'game-platform-api', ai_mode: 'live', registration_allowed: false,
      providers: { openai: true, anthropic: true, gemini: true, deepseek: false, grok: false, kimi: false, adigun: false, ollama: false },
      provider_details: { openai: { model: 'TEST-ONLY-JUDGE' }, anthropic: { model: 'TEST-ONLY-anthropic-MODEL' }, gemini: { model: 'TEST-ONLY-gemini-MODEL' } },
      judge: { configured: true, provider: 'openai', model: 'TEST-ONLY-JUDGE' },
    });
    if (path === '/api/auth/login') {
      const email = request.postDataJSON().email, id = email.startsWith('second') ? 42 : 41;
      return respond({ token: `test-only-session-${id}`, user: { id, email, display_name: `Test account ${id}`, role: 'player' } });
    }
    if (path === '/api/me/dashboard') return respond({ matches: submitted.length, strong_answers: 0 });
    if (path === '/api/arena/history') return respond([]);
    if (path === '/api/arena/matches') {
      const body = request.postDataJSON(); submitted.push(body);
      const responses = [testOnlyAnswer('anthropic', body.tests, .9, 1000), testOnlyAnswer('gemini', body.tests, .7, 2000)];
      const result = {
        id: `TEST-ONLY-MATCH-${submitted.length}`, mode: 'live', task_type: body.task_type,
        prompt: body.prompt, tests: structuredClone(body.tests), responses,
        ranking: { scores_complete: true, winner: 'anthropic', tied: false, order: responses.map(answer => ({ key: answer.key, score: answer.final_score })) },
        created_at: '2026-11-04T00:00:00+00:00',
      };
      if (submitted.length === 2) result.prompt = 'Deliberately mismatched TEST-ONLY prompt.';
      if (submitted.length === 3) result.tests[0].expected = 'Deliberately mismatched TEST-ONLY expectation';
      return respond(result);
    }
    throw new Error(`Unexpected test-only gateway request: ${request.method()} ${path}`);
  });

  async function signIn(email) {
    await page.locator('#account-open').click();
    await page.locator('#auth-email').fill(email);
    await page.locator('#auth-password').fill('test-only-password');
    await page.locator('#auth-submit').click();
    await expect(page.locator('#account-open')).toHaveText('Sign out');
  }
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), saveKey(41));

  await page.goto('/game22/');
  await page.locator('#settings-open').click();
  await page.locator('#api-url').fill(TEST_GATEWAY);
  await page.locator('#settings-form button[type="submit"]').click();
  await expect(page.locator('#configured-count')).toContainText('3');
  await signIn('first@example.invalid');
  await page.locator('#play-mode').selectOption('campaign');
  await page.locator('#prediction').selectOption('anthropic');
  await page.locator('#campaign-hint').fill('Check both threshold boundaries.');
  await page.locator('#provider-openai').check();
  await expect(page.locator('#submit-match')).toBeDisabled();
  await expect(page.locator('#campaign-ready')).toContainText('Remove the judge');
  await page.locator('#provider-openai').uncheck();
  await expect(page.locator('#submit-match')).toBeEnabled();
  await page.locator('#submit-match').click();
  await expect(page.locator('#campaign-verdict')).toContainText('Forecast confirmed');
  await expect(page.locator('#campaign-progress')).toContainText('1 completed');
  await expect(page.locator('#results .answer')).toHaveCount(2);
  expect(submitted).toHaveLength(1);
  const challenge = createChallenge(1);
  expect(submitted[0].providers).toEqual(['anthropic', 'gemini']);
  expect(submitted[0].task_type).toBe('coding');
  expect(submitted[0].tests).toEqual(challenge.tests);
  expect(submitted[0].prompt).toBe(challenge.prompt + '\n\nPlayer strategy hint (the required function and rules above remain unchanged):\nCheck both threshold boundaries.');
  expect(await saved()).toEqual({ version: 1, unlocked: 2, completed: 1 });
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey(42))).toBeNull();

  await expect(page.locator('#load-challenge')).toBeEnabled();
  await page.locator('#campaign-level').fill('2');
  await page.locator('#load-challenge').click();
  await expect(page.locator('#results')).toBeEmpty();
  await expect(page.locator('#result-summary')).toBeHidden();
  await expect(page.locator('#stage-ledger tr td:nth-child(3)')).toHaveText(Array(8).fill('Unknown'));
  await page.locator('#prediction').selectOption('anthropic');
  await page.locator('#submit-match').click();
  await expect(page.locator('#campaign-verdict')).toContainText('does not match');
  expect(await saved()).toEqual({ version: 1, unlocked: 2, completed: 1 });
  await expect(page.locator('#submit-match')).toBeEnabled();
  await page.locator('#submit-match').click();
  await expect.poll(() => submitted.length).toBe(3);
  await expect(page.locator('#submit-match')).toBeEnabled();
  await expect(page.locator('#campaign-verdict')).toBeVisible();
  await expect(page.locator('#campaign-verdict')).toContainText('does not match');
  await expect(page.locator('#campaign-progress')).toContainText('1 completed');
  expect(await saved()).toEqual({ version: 1, unlocked: 2, completed: 1 });

  await page.locator('#account-open').click();
  await signIn('second@example.invalid');
  await expect(page.locator('#campaign-progress')).toContainText('0 completed');
  await expect(page.locator('#campaign-level')).toHaveValue('1');
  await expect(page.locator('#results')).toBeEmpty();
  expect(await saved()).toEqual({ version: 1, unlocked: 2, completed: 1 });
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey(42))).toBeNull();
  expect(errors).toEqual([]);
});
