export const providers = [
  { key: 'openai', label: 'ChatGPT', company: 'OpenAI API' },
  { key: 'anthropic', label: 'Claude', company: 'Anthropic' },
  { key: 'gemini', label: 'Gemini', company: 'Google' },
  { key: 'deepseek', label: 'DeepSeek', company: 'DeepSeek' },
  { key: 'grok', label: 'Grok', company: 'xAI' },
  { key: 'kimi', label: 'Kimi', company: 'Moonshot AI' },
  { key: 'adigun', label: 'Adigun AI', company: 'Operator-configured endpoint' },
  { key: 'ollama', label: 'Ollama', company: 'Configured local / cloud model' },
];

export function parseApiOrigin(input) {
  let url;
  try { url = new URL(input.trim()); } catch { throw Error('Enter a valid API origin, such as https://api.example.com.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw Error('Use HTTPS for public APIs; HTTP is allowed only on localhost.');
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== '/')) {
    throw Error('Enter only the API origin, without credentials, a path, query or fragment.');
  }
  return url.origin;
}

const liveSources = new Set(['live_unscored', 'live_judge_estimate', 'restricted_tests', 'independent_judge', 'sandboxed_tests']);
export function isLiveAnswer(answer) {
  return answer?.state === 'ok' && liveSources.has(answer.source) && typeof answer.body === 'string' && answer.body.trim().length > 0;
}

export function formatLatency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'Not measured';
  return value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(2)} s`;
}

export function formatMetric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? `${(100 * value).toFixed(1)}%` : 'Unknown';
}

export function parseCodingTests(input) {
  let cases;
  try { cases = JSON.parse(input); } catch { throw Error('Test cases must be valid JSON.'); }
  if (!Array.isArray(cases) || cases.length < 1 || cases.length > 25) throw Error('Supply 1–25 test cases.');
  if (cases.some(item => !item || Array.isArray(item) || typeof item !== 'object' || Object.keys(item).sort().join(',') !== 'args,expected' || !Array.isArray(item.args) || item.args.length > 10)) {
    throw Error('Each case needs args (up to 10 positional arguments) and expected.');
  }
  return cases;
}
