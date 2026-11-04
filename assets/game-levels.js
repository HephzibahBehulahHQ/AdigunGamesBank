(() => {
  const max = 10000;
  const route = location.pathname.match(/game[0-9]+/i);
  const id = route ? route[0].toLowerCase() : "game1";
  const key = "hbgb.level.v1." + id;
  const masteryKey = key + ".mastered";
  let level = 1;
  let mastered = false;
  try {
    const stored = Number(localStorage.getItem(key));
    if (Number.isSafeInteger(stored) && stored >= 1) level = Math.min(max, stored);
    mastered = level === max && localStorage.getItem(masteryKey) === "1";
  } catch {}

  const bar = document.createElement("div");
  bar.id = "hb-level-bar";
  bar.setAttribute("role", "status");
  bar.style.cssText = "position:relative;z-index:4;display:flex;justify-content:center;align-items:center;gap:12px;margin:8px auto;padding:8px 14px;width:max-content;max-width:calc(100% - 24px);border:1px solid #55f5e577;border-radius:99px;background:#071522;color:#b1ffcf;font:700 12px ui-monospace,monospace;box-shadow:0 0 18px #55f5e522";
  const render = () => {
    bar.textContent = "PRACTICE STAGE " + level.toLocaleString() + " / 10,000 · " + id.toUpperCase() + (mastered ? " · FINAL STAGE CLEARED" : "");
  };
  const save = () => {
    try {
      localStorage.setItem(key, String(level));
      localStorage.setItem(masteryKey, mastered ? "1" : "0");
    } catch {}
  };
  render();
  document.body.prepend(bar);
  window.HBGameLevels = {
    max,
    get current() { return level; },
    get completed() { return mastered ? max : level - 1; },
    get isMastered() { return mastered; },
    complete(expectedLevel = level) {
      if (mastered || expectedLevel !== level) return level;
      const clearedLevel = level;
      if (level < max) level++;
      else mastered = true;
      save();
      render();
      window.dispatchEvent(new CustomEvent("hb-level-complete", { detail: { game: id, level, clearedLevel, mastered } }));
      return level;
    },
    reset() {
      level = 1;
      mastered = false;
      save();
      render();
      return level;
    }
  };
})();
