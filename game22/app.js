import { providers, parseApiOrigin, isLiveAnswer, formatLatency, formatMetric, parseCodingTests } from './arena-utils.js';
import { createChallenge, prepareAttempt, gradeAttempt, progressScope, CAMPAIGN_LEVELS } from './campaign.js';
import { campaign } from '../shared/progression.js';
import { stageRows } from './stage-data.js';

const $ = id => document.getElementById(id);
const providerByKey = Object.fromEntries(providers.map(provider => [provider.key, provider]));
function stored(area, key, value) {
  try {
    const storage = area === 'local' ? localStorage : sessionStorage;
    if (arguments.length === 2) return storage.getItem(key);
    if (value === null) storage.removeItem(key); else storage.setItem(key, value);
  } catch { /* Browsing with storage disabled still permits an in-memory session. */ }
  return null;
}

let api = '';
try { const saved = stored('local', 'hb-arena-api'); if (saved) api = parseApiOrigin(saved); } catch { stored('local', 'hb-arena-api', null); }
let token = '', user = null, gateway = null, running = false, epoch = 0, authMode = 'login';
let selectionInitialized = false, currentMatch = null, recognition = null;
let stage = null, historicalMatch = false, activeScope = null, progress = null, sessionOnly = false;
let challenge = createChallenge(1), customDraft = { prompt: '', type: 'factual', tests: '' };
const awardedMatches = new Set();
const requests = new Set();
stored('session', 'hb-arena-token', null); // Retire the old token without an API-origin binding.
try {
  const session = JSON.parse(stored('session', 'hb-arena-session') || 'null');
  if (session?.api === api && typeof session.token === 'string') token = session.token;
} catch { stored('session', 'hb-arena-session', null); }

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
function note(text, error = false) {
  $('message').hidden = !text;
  $('message').textContent = text;
  $('message').className = 'message' + (error ? ' error' : '');
}
function connection(text, ready = false) {
  $('connection-state').textContent = text;
  $('lamp').style.background = ready ? 'var(--success)' : 'var(--gold)';
}
function errorText(data, status) {
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) return data.detail.slice(0, 3).map(item => item.msg || 'Invalid request').join('; ');
  return `Gateway returned HTTP ${status}.`;
}
async function request(path, options = {}) {
  if (!api) throw Error('Connect the Game Bank API before playing.');
  const version = epoch;
  const controller = new AbortController();
  const limit = options.match ? 115000 : 15000;
  const timer = setTimeout(() => controller.abort(), limit);
  requests.add(controller);
  const headers = { 'Content-Type': 'application/json' };
  if (token && !options.public) headers.Authorization = 'Bearer ' + token;
  try {
    const response = await fetch(api + path, { method: options.method || 'GET', headers, body: options.body, signal: controller.signal, redirect: 'error', credentials: 'omit' });
    const data = await response.json().catch(() => ({ detail: 'The gateway returned unreadable JSON.' }));
    if (version !== epoch) throw Error('Session changed.');
    if (!response.ok) {
      if (response.status === 401 && !path.startsWith('/api/auth/')) {
        logout();
        note('Your session expired. Sign in again.', true);
      }
      throw Error(errorText(data, response.status));
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Error(version !== epoch ? 'Session changed.' : 'The gateway request timed out. Check match history before retrying.');
    if (error instanceof TypeError) throw Error('Could not reach the gateway. Check its address, HTTPS and allowed website origin.');
    throw error;
  } finally {
    clearTimeout(timer);
    requests.delete(controller);
  }
}

function selectedProviders() {
  return [...$('lineup').querySelectorAll('input:checked')].map(input => input.value);
}
const campaignMode = () => $('play-mode').value === 'campaign';
function syncStage() {
  const snapshot = { gateway, selected: selectedProviders(), running, match: currentMatch, historical: historicalMatch };
  const rows = stageRows(snapshot);
  $('stage-ledger').replaceChildren(...rows.map(row => {
    const tr = node('tr');
    for (const value of [row.label, row.state, row.score === null ? 'Unknown' : row.score.toFixed(2), row.latency]) tr.append(node('td', value));
    tr.children[2].dataset.leader = String(row.leader);
    return tr;
  }));
  const returned = rows.filter(row => row.returned).length;
  $('stage-state').textContent = running ? 'Requests in progress' : currentMatch ? `${historicalMatch ? 'Saved match' : 'Returned'} · ${returned} verified responses` : gateway ? `${rows.filter(row => row.configured).length} configured · no responses yet` : 'Awaiting connection';
  stage?.update(snapshot);
}
function syncProgress() {
  const scope = progressScope(api, user?.id);
  if (scope === activeScope) return;
  activeScope = scope; progress = scope ? campaign(scope) : null; sessionOnly = false; awardedMatches.clear();
  challenge = createChallenge(progress?.unlocked || 1);
  $('campaign-hint').value = ''; $('campaign-verdict').hidden = true; $('next-challenge').hidden = true;
  showChallenge();
}
function showChallenge() {
  $('campaign-level').value = challenge.level;
  $('campaign-level-readout').textContent = `Level ${challenge.level.toLocaleString()} / ${CAMPAIGN_LEVELS.toLocaleString()}`;
  $('campaign-tier').textContent = challenge.tier;
  $('challenge-title').textContent = challenge.title;
  $('challenge-skill').textContent = `${challenge.skill} · ${challenge.tests.length} reference cases · ${challenge.signature}`;
  $('challenge-brief').textContent = challenge.brief;
  $('challenge-prompt').textContent = challenge.prompt;
  $('challenge-tests').textContent = JSON.stringify(challenge.tests, null, 2);
  if (campaignMode()) {
    $('task-type').value = 'coding'; $('coding-fields').hidden = false;
    $('prompt').value = challenge.prompt; $('coding-tests').value = JSON.stringify(challenge.tests, null, 2);
    $('char-count').textContent = challenge.prompt.length.toLocaleString() + ' / 8,000';
  }
  $('campaign-progress').textContent = !progress ? 'Sign in to a configured gateway to earn progress. All levels are available to preview.' : `${progress.completed.toLocaleString()} completed · ${progress.mastered ? 'Professional Master campaign complete' : `next unlocked level ${progress.unlocked.toLocaleString()}`}${sessionOnly ? ' · Session only: browser storage could not save your progress.' : ' · Browser-local progress for this gateway account.'}${challenge.level > progress.unlocked ? ' This preview is locked for competition; complete earlier levels first.' : ''}`;
}
function campaignBlock() {
  if (!progress) return 'Sign in before starting the campaign.';
  if (challenge.level > progress.unlocked) return 'Complete earlier levels before competing on this preview.';
  if (!gateway?.judge?.configured) return 'Configure an independent model judge on the gateway first.';
  if (selectedProviders().includes(gateway.judge.provider)) return 'Remove the judge from the contender lineup; it cannot score itself.';
  if (!$('prediction').value) return 'Forecast a selected contender or a tie before competing.';
  return '';
}
function syncPrediction() {
  const saved = $('prediction').value, selected = selectedProviders();
  $('prediction').replaceChildren(new Option('Choose a contender or a tie', ''), ...selected.map(key => new Option(providerByKey[key].label, key)), new Option('Tie between leading contenders', 'tie'));
  if (saved === 'tie' || selected.includes(saved)) $('prediction').value = saved;
}
function switchMode() {
  if (recognition) recognition.abort();
  if (campaignMode()) {
    customDraft = { prompt: $('prompt').value, type: $('task-type').value, tests: $('coding-tests').value };
    showChallenge();
  } else {
    $('prompt').value = customDraft.prompt; $('task-type').value = customDraft.type; $('coding-tests').value = customDraft.tests;
    $('coding-fields').hidden = customDraft.type !== 'coding'; $('char-count').textContent = customDraft.prompt.length.toLocaleString() + ' / 8,000';
  }
  $('campaign-panel').hidden = !campaignMode();
  $('voice').textContent = campaignMode() ? 'Speak strategy hint' : 'Speak prompt';
  syncSubmit();
}
function loadChallenge(level) {
  if (running) return;
  const value = Number(level);
  if (!Number.isInteger(value) || value < 1 || value > CAMPAIGN_LEVELS) {
    $('campaign-verdict').hidden = false; $('campaign-verdict').textContent = 'Choose a whole-number level from 1 to 10,000.'; return;
  }
  challenge = createChallenge(value); $('prediction').value = ''; $('campaign-hint').value = '';
  $('campaign-verdict').hidden = true; $('next-challenge').hidden = true;
  showChallenge(); syncSubmit();
}
function evaluateChallenge(attempt, match, scope) {
  if (!progress || scope !== activeScope || awardedMatches.has(match.id)) return;
  const result = gradeAttempt(attempt, match);
  $('campaign-verdict').hidden = false;
  $('campaign-verdict').textContent = result.reason;
  if (result.cleared) {
    awardedMatches.add(match.id);
    if (progress.complete(attempt.level)) {
      try { sessionOnly = JSON.parse(stored('local', `adigun.campaign.v1.${scope}`) || 'null')?.completed !== progress.completed; } catch { sessionOnly = true; }
      $('campaign-verdict').textContent += sessionOnly ? ' Progress is available for this session, but browser storage could not save it.' : ' Progress saved on this browser for your gateway account.';
    } else $('campaign-verdict').textContent += ' This level was already completed; progress stays unchanged.';
    $('next-challenge').hidden = progress.mastered;
  }
  showChallenge();
}
function syncSubmit() {
  const selected = selectedProviders();
  const configured = selected.filter(key => gateway?.providers?.[key]).length;
  syncPrediction();
  $('campaign-ready').textContent = campaignMode() ? campaignBlock() || (configured < 2 ? 'Choose at least two configured contenders.' : gateway?.ai_mode !== 'live' ? 'Enable live mode on the gateway.' : 'Ready: review your forecast, then start the live competition below.') : '';
  $('submit-match').disabled = running || configured < 2 || gateway?.ai_mode !== 'live' || (campaignMode() && Boolean(campaignBlock()));
  $('submit-match').textContent = running ? 'Comparing live answers…' : campaignMode() ? `Compete · level ${challenge.level.toLocaleString()}` : `Compare ${configured} selected models`;
  $('task-type').disabled = running || campaignMode();
  $('prompt').readOnly = running || campaignMode();
  $('coding-tests').readOnly = running || campaignMode();
  for (const id of ['play-mode', 'prediction', 'campaign-hint', 'campaign-level', 'load-challenge', 'resume-challenge', 'next-challenge']) $(id).disabled = running;
  $('lineup').querySelectorAll('input').forEach(input => { input.disabled = running || !gateway?.providers?.[input.value]; });
  syncStage();
}
function buildLineup() {
  for (const provider of providers) {
    const label = node('label', '', 'contender');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.value = provider.key; checkbox.id = 'provider-' + provider.key;
    checkbox.disabled = true; checkbox.addEventListener('change', syncSubmit);
    const text = node('span');
    text.append(node('span', provider.label, 'provider-label'), node('span', provider.company, 'provider-detail'));
    const state = node('span', 'NOT CONNECTED', 'provider-state');
    state.dataset.provider = provider.key; text.append(state);
    label.append(checkbox, text); $('lineup').append(label);
  }
}
async function health() {
  const version = epoch;
  if (!api) { connection('Secure gateway not connected'); updateAccount(); return; }
  connection('Checking gateway configuration…');
  try {
    gateway = await request('/api/health', { public: true });
    if (gateway.service !== 'game-platform-api' || !gateway.providers) throw Error('This origin is not a compatible Game Bank gateway.');
    const count = providers.filter(provider => gateway.providers[provider.key]).length;
    $('configured-count').replaceChildren(document.createTextNode(String(count) + ' '), node('small', '/ 8'));
    const judgeKey = gateway.judge?.provider;
    $('judge-status').textContent = gateway.judge?.configured ? `${providerByKey[judgeKey]?.label || judgeKey} · ${gateway.judge.model}` : 'Not configured';
    for (const provider of providers) {
      const configured = Boolean(gateway.providers[provider.key]);
      const checkbox = $('provider-' + provider.key);
      if (!selectionInitialized) checkbox.checked = configured && !(gateway.judge?.configured && judgeKey === provider.key);
      if (!configured) checkbox.checked = false;
      const state = document.querySelector(`[data-provider="${provider.key}"]`);
      state.textContent = configured ? 'CONFIGURED' : 'NOT CONFIGURED';
      state.className = 'provider-state' + (configured ? ' configured' : '');
      const model = gateway.provider_details?.[provider.key]?.model;
      state.previousElementSibling.textContent = provider.company + (model ? ` · ${model}` : '');
    }
    selectionInitialized = true;
    connection(gateway.ai_mode === 'live' ? `Gateway connected · ${count}/8 providers configured` : 'Gateway connected · live mode disabled', count >= 2);
    if (!running) $('match-state').textContent = count >= 2 ? 'Gateway configured' : 'Setup required';
    if (count < 2) note('At least two live providers need server-side keys and model IDs before a match can run.');
    else if (!user) note('Sign in, choose contenders and submit your prompt.');
  } catch (error) {
    if (version !== epoch) return;
    gateway = null;
    connection('Gateway unavailable');
    note(error.message, true);
    $('configured-count').replaceChildren(document.createTextNode('0 '), node('small', '/ 8'));
    $('judge-status').textContent = 'Unavailable';
    document.querySelectorAll('[data-provider]').forEach(state => { state.textContent = 'UNAVAILABLE'; state.className = 'provider-state'; });
  }
  if (version !== epoch) return;
  updateAccount();
  syncSubmit();
}
function updateAccount() {
  syncProgress();
  $('connection-needed').hidden = Boolean(api);
  $('auth-gate').hidden = !api || Boolean(user);
  $('prompt-form').hidden = !user;
  $('account-open').textContent = user ? 'Sign out' : 'Sign in';
  const canRegister = gateway?.registration_allowed !== false;
  $('register-inline').hidden = !canRegister;
  $('registration-state').hidden = canRegister;
  $('history-refresh').disabled = !user;
  syncSubmit();
}
function logout() {
  epoch += 1;
  requests.forEach(controller => controller.abort());
  token = ''; user = null; running = false; currentMatch = null; historicalMatch = false;
  stored('session', 'hb-arena-session', null);
  if (recognition) recognition.abort();
  $('results').replaceChildren(); $('result-summary').hidden = true; $('results').setAttribute('aria-busy', 'false');
  $('record-matches').textContent = '—'; $('record-strong').textContent = '—';
  $('history').replaceChildren(node('p', 'Sign in to view your match history.', 'note'));
  $('prompt-form').reset(); customDraft = { prompt: '', type: 'factual', tests: '' };
  $('char-count').textContent = '0 / 8,000'; $('coding-fields').hidden = true;
  note(''); updateAccount(); syncSubmit();
}
function openSettings() {
  $('api-url').value = api; $('settings-error').textContent = '';
  if (!$('settings-dialog').open) $('settings-dialog').showModal();
}
function openAuth(mode = 'login') {
  if (!api) return openSettings();
  authMode = mode;
  const registering = mode === 'register';
  $('auth-title').textContent = registering ? 'Create your Arena account' : 'Sign in to the Arena';
  $('name-fields').hidden = !registering; $('auth-name').required = registering;
  $('auth-password').autocomplete = registering ? 'new-password' : 'current-password';
  $('auth-password').minLength = registering ? 12 : 1;
  $('auth-submit').textContent = registering ? 'Create account' : 'Sign in';
  $('auth-switch').textContent = registering ? 'Already registered? Sign in' : 'Create an account';
  $('auth-switch').hidden = !registering && gateway?.registration_allowed === false;
  $('auth-error').textContent = '';
  if (!$('auth-dialog').open) $('auth-dialog').showModal();
}
async function submitAuth(event) {
  event.preventDefault();
  const registering = authMode === 'register';
  const payload = { email: $('auth-email').value, password: $('auth-password').value };
  if (registering) payload.display_name = $('auth-name').value;
  $('auth-submit').disabled = true;
  try {
    const result = await request('/api/auth/' + (registering ? 'register' : 'login'), { method: 'POST', public: true, body: JSON.stringify(payload) });
    token = result.token; user = result.user;
    stored('session', 'hb-arena-session', JSON.stringify({ api, token }));
    $('auth-dialog').close(); $('auth-form').reset(); updateAccount();
    note('Choose at least two configured contenders, then set your challenge.');
    await refreshRecord();
  } catch (error) { $('auth-error').textContent = error.message; }
  finally { $('auth-submit').disabled = false; }
}
async function refreshRecord() {
  if (!user) return;
  try {
    const [summary, history] = await Promise.all([request('/api/me/dashboard'), request('/api/arena/history')]);
    $('record-matches').textContent = summary.matches;
    $('record-strong').textContent = summary.strong_answers;
    $('history').replaceChildren();
    if (!history.length) $('history').append(node('p', 'Your first completed match will appear here.', 'note'));
    for (const match of history.slice(0, 10)) {
      const button = node('button', `${match.task_type} · ${match.mode}`, 'history-entry');
      button.type = 'button';
      button.append(node('span', new Date(match.created_at).toLocaleString()));
      button.addEventListener('click', () => { if (!running) renderMatch(match, true); });
      $('history').append(button);
    }
  } catch (error) { if (user) note('Could not refresh your record: ' + error.message, true); }
}
async function rateAnswer(matchId, key, rating, group) {
  const version = epoch;
  group.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try {
    await request('/api/arena/' + encodeURIComponent(matchId) + '/rate', { method: 'POST', body: JSON.stringify({ model_key: key, rating }) });
    if (version !== epoch) return;
    group.querySelectorAll('button').forEach((button, index) => { button.classList.toggle('on', index < rating); button.setAttribute('aria-pressed', String(index + 1 === rating)); });
    note(`Saved your ${rating}/5 rating for ${providerByKey[key]?.label || key}.`);
    await refreshRecord();
  } catch (error) { if (version === epoch) note('Your rating was not saved: ' + error.message, true); }
  finally { group.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
}
function renderAnswer(answer, matchId, fromHistory = false, liveMode = true) {
  const key = answer.key || answer.model_key;
  const name = providerByKey[key]?.label || answer.label || key;
  const live = liveMode && isLiveAnswer(answer);
  const article = node('article', '', 'answer' + (live ? ' live' : ''));
  const header = node('div', '', 'answer-header');
  header.append(node('h3', name), node('p', answer.model || 'Model identifier not recorded'));
  header.append(node('p', `${live ? (fromHistory ? 'RECORDED LIVE RESPONSE' : 'LIVE RESPONSE') : 'NO VERIFIED LIVE RESPONSE'} · ${formatLatency(answer.latency_ms)}`, live ? 'live-label' : ''));
  const content = node('pre', live ? answer.body : (answer.error || 'No live response is available for this entry.'), 'answer-text');
  content.tabIndex = 0; content.setAttribute('aria-label', name + ' answer');
  article.append(header, content);
  if (live) {
    const metrics = node('div', '', 'answer-metrics');
    const list = document.createElement('dl');
    const values = [
      [answer.accuracy_source === 'restricted_test_cases' ? 'Supplied tests passed' : 'Estimated correctness', formatMetric(answer.accuracy)],
      ['Estimated quality', formatMetric(answer.quality)],
      ['Estimated suggestion relevance', formatMetric(answer.suggestions)],
      ['Measured speed score', formatMetric(answer.speed_score)],
      ['Final score', typeof answer.final_score === 'number' && Number.isFinite(answer.final_score) ? `${answer.final_score.toFixed(2)} / 100` : 'Unknown'],
    ];
    for (const [label, value] of values) { const row = document.createElement('div'); row.append(node('dt', label), node('dd', value)); list.append(row); }
    const details = document.createElement('details'); details.append(node('summary', 'Scoring evidence'));
    if (answer.judge_provider) details.append(node('p', `Judge: ${providerByKey[answer.judge_provider]?.label || answer.judge_provider} · ${answer.judge_model || 'model not recorded'}`));
    const unavailable = { self_judging_excluded: 'This provider is also the judge, so it cannot score its own answer.', input_limit: 'The answers exceeded the judging input limit. No quality score was inferred.', judge_unavailable: 'The judge did not return a valid score.', missing_score: 'The judge omitted this answer.' };
    details.append(node('p', answer.judge_reason || unavailable[answer.judge_state] || 'No judge score is available. Missing metrics are unknown.'));
    if (answer.coding_tests) details.append(node('p', `${answer.coding_tests.passed} of ${answer.coding_tests.total} supplied tests passed. ${answer.coding_tests.error || ''}`));
    metrics.append(list, details); article.append(metrics);
    const footer = node('footer', 'Your rating');
    const stars = node('div', '', 'stars');
    stars.setAttribute('role', 'group'); stars.setAttribute('aria-label', `Rate ${name}'s answer`);
    for (let rating = 1; rating <= 5; rating++) {
      const button = node('button', '★'); button.type = 'button';
      button.setAttribute('aria-label', `Rate ${name} ${rating} out of 5`);
      button.setAttribute('aria-pressed', String(answer.rating === rating));
      if (rating <= (answer.rating || 0)) button.classList.add('on');
      button.addEventListener('click', () => rateAnswer(matchId, key, rating, stars)); stars.append(button);
    }
    footer.append(stars); article.append(footer);
  }
  return article;
}
function renderMatch(match, fromHistory = false) {
  currentMatch = match; historicalMatch = fromHistory;
  $('results').replaceChildren();
  const answers = Array.isArray(match.responses) ? match.responses.filter(answer => answer && typeof answer === 'object') : [];
  const live = match.mode === 'live' ? answers.filter(isLiveAnswer).length : 0;
  for (const answer of answers) $('results').append(renderAnswer(answer, match.id, fromHistory, match.mode === 'live'));
  $('match-state').textContent = `${live}/${answers.length} ${fromHistory ? 'recorded' : 'live'} responses`;
  $('result-summary').hidden = false;
  $('history-prompt').hidden = !fromHistory;
  $('history-prompt').textContent = fromHistory ? 'Saved prompt: ' + match.prompt : '';
  const leaders = stageRows({ match }).filter(row => row.leader);
  $('result-outcome').textContent = leaders.length === 1 ? `Highest complete score for this prompt: ${leaders[0].label}.` : leaders.length > 1 ? 'The highest-scoring answers are tied for this prompt.' : 'No complete ranking is available. Compare the returned evidence and any scored metrics below.';
  note(live ? `${live} actual provider response${live === 1 ? '' : 's'} ${fromHistory ? 'in this saved match' : 'received'}. Failed providers are shown separately.` : 'No live provider answered. Demonstration text is never substituted.', live === 0);
  $('result-title').tabIndex = -1;
  $('result-title').focus({ preventScroll: true });
  syncStage();
}
async function run(event) {
  event.preventDefault();
  if (running) return;
  const selected = selectedProviders();
  if (selected.filter(key => gateway?.providers?.[key]).length < 2) return note('Select at least two configured providers.', true);
  if (gateway?.ai_mode !== 'live') return note('Live mode must be enabled on the gateway before dispatch.', true);
  let prompt = $('prompt').value.trim(), taskType = $('task-type').value, tests = [], attempt = null;
  const scope = activeScope;
  try {
    if (campaignMode()) {
      const blocked = campaignBlock(); if (blocked) throw Error(blocked);
      attempt = prepareAttempt(challenge.level, selected, $('prediction').value, $('campaign-hint').value);
      prompt = attempt.prompt; taskType = attempt.task_type; tests = attempt.tests;
      $('campaign-verdict').hidden = true; $('next-challenge').hidden = true;
    } else if (taskType === 'coding') tests = parseCodingTests($('coding-tests').value);
    if (prompt.length < 12) throw Error('Write at least 12 non-padding characters.');
  } catch (error) { return note(error.message, true); }
  const version = epoch;
  if (recognition) recognition.stop();
  currentMatch = null; historicalMatch = false; running = true; syncSubmit();
  $('result-summary').hidden = true; $('results').replaceChildren(); $('results').setAttribute('aria-busy', 'true');
  $('match-state').textContent = 'Running';
  note('Sending your prompt concurrently. Responses have a 50-second deadline; optional judging follows.');
  try {
    const match = await request('/api/arena/matches', { method: 'POST', match: true, body: JSON.stringify({ prompt, task_type: taskType, tests, providers: selected }) });
    if (version !== epoch) return;
    renderMatch(match);
    if (attempt) evaluateChallenge(attempt, match, scope);
    await refreshRecord();
  } catch (error) { if (version === epoch) { $('match-state').textContent = 'Request failed'; note(error.message, true); } }
  finally { if (version === epoch) { running = false; $('results').setAttribute('aria-busy', 'false'); syncSubmit(); } }
}

$('settings-open').addEventListener('click', openSettings);
$('connect-inline').addEventListener('click', openSettings);
$('check-connection').addEventListener('click', health);
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const origin = parseApiOrigin($('api-url').value);
    logout(); api = origin; gateway = null; selectionInitialized = false;
    stored('local', 'hb-arena-api', api); $('settings-dialog').close();
    await health();
  } catch (error) { $('settings-error').textContent = error.message; }
});
$('account-open').addEventListener('click', () => user ? logout() : openAuth());
$('signin-inline').addEventListener('click', () => openAuth());
$('register-inline').addEventListener('click', () => openAuth('register'));
$('auth-switch').addEventListener('click', () => openAuth(authMode === 'login' ? 'register' : 'login'));
$('auth-form').addEventListener('submit', submitAuth);
$('prompt-form').addEventListener('submit', run);
$('history-refresh').addEventListener('click', refreshRecord);
$('task-type').addEventListener('change', () => { $('coding-fields').hidden = $('task-type').value !== 'coding'; });
$('prompt').addEventListener('input', () => { $('char-count').textContent = $('prompt').value.length.toLocaleString() + ' / 8,000'; });
$('play-mode').addEventListener('change', switchMode);
$('prediction').addEventListener('change', syncSubmit);
$('load-challenge').addEventListener('click', () => loadChallenge($('campaign-level').value));
$('campaign-level').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); loadChallenge($('campaign-level').value); } });
$('resume-challenge').addEventListener('click', () => loadChallenge(progress?.unlocked || 1));
$('next-challenge').addEventListener('click', () => loadChallenge(progress?.unlocked || 1));
$('year').textContent = new Date().getFullYear();

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  $('voice').disabled = true;
  $('voice-state').textContent = 'Voice is unavailable in this browser. Type your prompt.';
} else {
  $('voice').addEventListener('click', () => {
    if (running) return;
    if (recognition) { recognition.stop(); return; }
    const speech = new SpeechRecognition(); recognition = speech;
    const voiceEpoch = epoch, voiceMode = campaignMode(), target = voiceMode ? $('campaign-hint') : $('prompt');
    speech.lang = navigator.language || 'en-US'; speech.interimResults = true;
    speech.onstart = () => { $('voice').textContent = 'Stop listening'; $('voice-state').textContent = 'Listening. Your browser handles speech transcription.'; };
    speech.onerror = event => { $('voice-state').textContent = event.error === 'not-allowed' ? 'Microphone permission was denied. Type your prompt.' : 'Voice capture could not complete. Type your prompt.'; };
    speech.onend = () => { recognition = null; $('voice').textContent = campaignMode() ? 'Speak strategy hint' : 'Speak prompt'; if ($('voice-state').textContent.startsWith('Listening')) $('voice-state').textContent = 'Transcript ready. Review it before sending.'; };
    speech.onresult = event => { if (running || epoch !== voiceEpoch || campaignMode() !== voiceMode) return; target.value = Array.from(event.results).map(result => result[0].transcript).join(' ').slice(0, voiceMode ? 600 : 8000); target.dispatchEvent(new Event('input')); };
    try { speech.start(); } catch { recognition = null; $('voice-state').textContent = 'Voice could not start. Type your prompt.'; }
  });
}

buildLineup(); showChallenge(); updateAccount(); syncSubmit();
import('./scene.js').then(({ createArenaStage }) => {
  stage = createArenaStage({
    canvas: $('arena-stage'), qualitySelect: $('arena-quality'), status: $('render-status'), viewSelect: $('arena-view'),
    onSelect(key) { const input = $('provider-' + key); if (input && !input.disabled) { input.checked = !input.checked; input.dispatchEvent(new Event('change')); } },
  });
  syncStage();
}).catch(() => {
  $('render-status').textContent = '3D is unavailable. Enable WebGL 2 and reload. The accessible comparison controls remain available.';
  $('arena-quality').disabled = true; $('arena-view').disabled = true;
});
window.addEventListener('pagehide', event => { if (!event.persisted) { stage?.dispose(); stage = null; requests.forEach(controller => controller.abort()); recognition?.abort(); } });
window.addEventListener('pageshow', event => { if (event.persisted) stage?.render(); });
if (api) {
  await health();
  if (token) {
    try { user = await request('/api/me'); updateAccount(); await refreshRecord(); } catch { logout(); }
  }
}
