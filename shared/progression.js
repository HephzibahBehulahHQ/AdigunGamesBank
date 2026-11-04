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
export function validCampaignSave(saved) {
  return saved?.version === 1 && Number.isInteger(saved.completed) && saved.completed >= 0 &&
    saved.completed <= LEVEL_COUNT && saved.unlocked === Math.min(LEVEL_COUNT, saved.completed + 1);
}
/** Browser-local progression. A final-level clear is recorded separately from unlocking it. */
export function campaign(id, storage) {
  if (!storage) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  const key = `adigun.campaign.v1.${id}`;
  let data = { version: 1, unlocked: 1, completed: 0 };
  function refresh() {
    try {
      const saved = JSON.parse(storage.getItem(key) || 'null');
      if (validCampaignSave(saved) && saved.completed > data.completed) {
        data = { version: 1, unlocked: saved.unlocked, completed: saved.completed };
      }
    } catch { /* Storage can be disabled; gameplay remains available. */ }
  }
  refresh();
  return {
    get unlocked() { refresh(); return data.unlocked; },
    get completed() { refresh(); return data.completed; },
    get mastered() { refresh(); return data.completed === LEVEL_COUNT; },
    complete(level) {
      // A stale tab must not overwrite higher progress already saved by another.
      refresh();
      if (!Number.isInteger(level) || level !== data.completed + 1 || level > data.unlocked) return false;
      data.completed = level; data.unlocked = Math.min(LEVEL_COUNT, level + 1);
      try { storage.setItem(key, JSON.stringify(data)); } catch { /* Session-only progress. */ }
      return true;
    }
  };
}
