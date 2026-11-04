export const LEVEL_COUNT = 10000;
export const TIERS = ['Beginner', 'Apprentice', 'Skilled', 'Expert', 'Professional Master'];
export function validLevel(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= LEVEL_COUNT ? number : 1;
}
export function tierFor(level) { return TIERS[Math.min(4, Math.floor((validLevel(level) - 1) / 2000))]; }
export function randomFor(seed) {
  let state = (seed >>> 0) || 1;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** Browser-local progression. A final-level clear is recorded separately from unlocking it. */
export function campaign(id, storage) {
  if (!storage) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  const key = `adigun.campaign.v1.${id}`;
  let data = { version: 1, unlocked: 1, completed: 0 };
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null');
    if (saved?.version === 1) {
      data.unlocked = validLevel(saved.unlocked);
      data.completed = Number.isInteger(saved.completed) ? Math.max(0, Math.min(data.unlocked, saved.completed, LEVEL_COUNT)) : 0;
      data.unlocked = Math.max(1, Math.min(LEVEL_COUNT, data.completed + 1));
    }
  } catch { /* Storage can be disabled; gameplay remains available. */ }
  return {
    get unlocked() { return data.unlocked; },
    get completed() { return data.completed; },
    get mastered() { return data.completed === LEVEL_COUNT; },
    complete(level) {
      if (!Number.isInteger(level) || level !== data.completed + 1 || level > data.unlocked) return false;
      data.completed = level; data.unlocked = Math.min(LEVEL_COUNT, level + 1);
      try { storage.setItem(key, JSON.stringify(data)); } catch { /* Session-only progress. */ }
      return true;
    }
  };
}
