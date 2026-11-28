(() => {
  const byId = id => document.getElementById(id);
  const lights = byId("lights");
  const entry = byId("entry");
  const start = byId("start");
  const check = byId("check");
  const phase = byId("phase");
  const message = byId("msg");
  const cue = byId("cue");
  const guide = byId("studio-help");
  const levels = window.HBGameLevels;
  const colors = ["#5af3ef", "#ff70b7", "#ffd166", "#a78bfa", "#8bff8b", "#ff8066"];
  const lengthFor = level => Math.min(16, 3 + Math.floor((level - 1) / 90));
  let sequence = "";
  let best = 0;
  try { best = Number(localStorage.getItem("hbgb.synapse.best")) || 0; } catch {}
  byId("best").textContent = best;
  byId("level").textContent = levels.current.toLocaleString();
  byId("length").textContent = lengthFor(levels.current);

  function draw(count) {
    lights.replaceChildren();
    lights.toggleAttribute("data-long", count > 8);
    for (let index = 0; index < count; index++) {
      const light = document.createElement("span");
      light.className = "light";
      light.setAttribute("aria-hidden", "true");
      lights.append(light);
    }
  }

  function setRecall(enabled) {
    entry.disabled = check.disabled = !enabled;
    entry.hidden = check.hidden = !enabled;
    if (enabled && !guide.open && matchMedia("(pointer: fine)").matches) entry.focus();
  }

  function begin() {
    const level = levels.current;
    const length = lengthFor(level);
    let seed = (level * 1103515245 + 12345) >>> 0;
    sequence = "";
    for (let index = 0; index < length; index++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      sequence += 1 + (seed % colors.length);
    }
    entry.value = "";
    setRecall(false);
    start.disabled = true;
    phase.textContent = "Watch";
    message.textContent = "";
    draw(length);

    const duration = Math.max(280, 900 - Math.floor(level / 18));
    const flash = index => {
      if (index === length) {
        cue.textContent = "";
        phase.textContent = "Recall";
        start.hidden = true;
        setRecall(true);
        if (!guide.open && document.activeElement === document.body && !matchMedia("(pointer: fine)").matches) {
          check.focus();
        }
        return;
      }
      const digit = sequence[index];
      const light = lights.children[index];
      light.style.setProperty("--pulse", colors[Number(digit) - 1]);
      light.textContent = digit;
      light.classList.add("active");
      cue.textContent = `Pulse ${index + 1}: ${digit}`;
      setTimeout(() => {
        light.classList.remove("active");
        light.textContent = "";
        setTimeout(() => flash(index + 1), Math.max(90, duration * .35));
      }, duration);
    };
    setTimeout(() => flash(0), 400);
  }

  start.addEventListener("click", begin);
  check.form.addEventListener("submit", event => {
    event.preventDefault();
    if (check.disabled) return;
    if (entry.value !== sequence) {
      message.textContent = "Mismatch · Try again";
      entry.value = "";
      entry.focus();
      return;
    }

    best = Math.max(best, levels.current);
    const next = levels.complete();
    byId("level").textContent = next.toLocaleString();
    byId("length").textContent = lengthFor(next);
    byId("best").textContent = best;
    try { localStorage.setItem("hbgb.synapse.best", String(best)); } catch {}
    for (const light of lights.children) light.classList.add("done");
    phase.textContent = levels.isMastered ? "Mastered" : "Correct";
    message.textContent = "";
    setRecall(false);
    start.hidden = false;
    start.disabled = false;
    start.textContent = levels.isMastered ? "Replay sequence" : "Next sequence";
    start.focus();
  });

  byId("help-open").addEventListener("click", () => guide.showModal());
  draw(lengthFor(levels.current));
})();
