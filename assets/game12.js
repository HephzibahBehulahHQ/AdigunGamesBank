(() => {
  const modes = [...document.querySelectorAll("[data-mode]")];
  const levelEl = document.getElementById("level"), puzzle = document.getElementById("puzzle");
  const answer = document.getElementById("answer"), message = document.getElementById("msg");
  const title = document.getElementById("modeTitle"), instruction = document.getElementById("instruction");
  const submit = document.getElementById("submit");
  let mode = "sequence", solution = 0, streak = 0, solved = 0, seed = 0, pending = false;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function generate() {
    const level = window.HBGameLevels.current;
    levelEl.textContent = level.toLocaleString();
    seed = (level * 2654435761 + 7117) >>> 0;
    pending = window.HBGameLevels.isMastered;
    submit.disabled = answer.disabled = pending;
    modes.forEach(button => { button.disabled = pending; });
    if (pending) { message.textContent = "Final practice stage cleared."; return; }
    answer.value = "";
    message.textContent = "A correct answer unlocks the next practice stage.";
    message.style.color = "#5af3ef";
    if (mode === "sequence") {
      title.textContent = "SEQUENCE ENGINE";
      instruction.textContent = "Find the next number. Work out the rule before calculating.";
      const start = 2 + Math.floor(random() * 20);
      const step = 1 + Math.floor(random() * (4 + Math.min(40, Math.floor(level / 50))));
      const sequence = Array.from({ length: 5 }, (_, i) => start + i * step);
      solution = start + 5 * step;
      puzzle.textContent = sequence.join("  ·  ") + "  ·  ?";
    } else if (mode === "matrix") {
      title.textContent = "MATRIX VAULT";
      instruction.textContent = "Each row and column follows the same additive rule. Find the missing corner.";
      const base = 1 + Math.floor(random() * 18);
      const row = 1 + Math.floor(random() * (2 + Math.min(20, Math.floor(level / 100))));
      const column = 1 + Math.floor(random() * (3 + Math.min(30, Math.floor(level / 100))));
      solution = base + 2 * row + 2 * column;
      puzzle.innerHTML = '<span>' + base + '　' + (base + column) + '　' + (base + 2 * column) + '<br>' + (base + row) + '　' + (base + row + column) + '　' + (base + row + 2 * column) + '<br>' + (base + 2 * row) + '　' + (base + 2 * row + column) + '　<strong style="color:#ff718d">?</strong></span>';
    } else {
      title.textContent = "RULE DECODER";
      instruction.textContent = "A machine transforms every input using one hidden rule. Infer its output.";
      const add = 1 + Math.floor(random() * (8 + Math.min(50, Math.floor(level / 80))));
      const multiply = 2 + Math.floor(random() * 3);
      const first = 2 + Math.floor(random() * 5), second = first + 3, requested = second + 2;
      solution = requested * multiply + add;
      puzzle.innerHTML = 'INPUT ' + first + ' → ' + (first * multiply + add) + '　|　INPUT ' + second + ' → ' + (second * multiply + add) + '<br>INPUT ' + requested + ' → <strong style="color:#ff718d">?</strong>';
    }
  }
  modes.forEach(button => {
    button.onclick = () => {
      if (pending) return;
      mode = button.dataset.mode;
      modes.forEach(other => other.setAttribute("aria-pressed", String(other === button)));
      generate();
    };
  });
  submit.onclick = () => {
    if (pending) return;
    if (!answer.value.trim() || !Number.isFinite(Number(answer.value))) {
      message.textContent = "Enter a number before locking your answer.";
      return;
    }
    if (Number(answer.value) === solution) {
      pending = true;
      submit.disabled = answer.disabled = true;
      modes.forEach(button => { button.disabled = true; });
      const next = window.HBGameLevels.complete(window.HBGameLevels.current);
      solved++;
      streak++;
      document.getElementById("solved").textContent = solved;
      document.getElementById("streak").textContent = streak;
      levelEl.textContent = next.toLocaleString();
      message.textContent = window.HBGameLevels.isMastered ? "Final practice stage cleared." : "Correct. Stage " + next + " unlocked.";
      message.style.color = "#b1ffcf";
      if (!window.HBGameLevels.isMastered) setTimeout(generate, 700);
    } else {
      streak = 0;
      document.getElementById("streak").textContent = streak;
      message.textContent = "Not yet. Re-check the rule and try again; the stage stays open.";
      message.style.color = "#ff8293";
    }
  };
  answer.addEventListener("keydown", event => { if (event.key === "Enter" && !submit.disabled) submit.click(); });
  generate();
})();
