import { providers, isLiveAnswer, formatLatency } from './arena-utils.js';

const validScore = score => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100;

/** Presentation uses configured settings and returned evidence; it never invents scores or progress. */
export function stageRows({ gateway = null, selected = [], running = false, match = null, historical = false } = {}) {
  const answers = Array.isArray(match?.responses) ? match.responses : [];
  const live = match?.mode === 'live' ? answers.filter(isLiveAnswer) : [];
  const ranked = live.length >= 2 && live.every(answer => validScore(answer.final_score)) && match?.ranking?.scores_complete === true;
  const highest = ranked ? Math.max(...live.map(answer => answer.final_score)) : null;
  return providers.map(provider => {
    const configured = Boolean(gateway?.providers?.[provider.key]);
    const active = selected.includes(provider.key);
    const response = answers.find(answer => (answer.key || answer.model_key) === provider.key);
    const verified = match?.mode === 'live' && isLiveAnswer(response);
    const score = verified && validScore(response.final_score) ? response.final_score : null;
    let state = configured ? (active ? 'Selected' : 'Configured') : 'Not configured';
    if (running && active) state = 'Request sent';
    else if (response) state = verified ? (historical ? 'Recorded response' : 'Live response') : 'No verified response';
    return {
      key: provider.key, label: provider.label, configured, selected: active,
      state, pending: running && active, returned: verified && !running,
      model: response?.model || gateway?.provider_details?.[provider.key]?.model || '',
      score: running ? null : score,
      latency: verified && !running ? formatLatency(response.latency_ms) : 'Not measured',
      leader: !running && ranked && verified && score === highest,
    };
  });
}
