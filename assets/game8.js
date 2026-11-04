const N = 3, box = document.getElementById("box");
const check = document.getElementById("check"), message = document.getElementById("msg");
let level = window.HBGameLevels.current, states = [], solved = false;
message.setAttribute("role", "status");
function toggle(index) {
  const row = Math.floor(index / N), column = index % N;
  [[row, column], [row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]].forEach(([y, x]) => {
    if (y >= 0 && y < N && x >= 0 && x < N) states[y * N + x] = !states[y * N + x];
  });
}
function start() {
  level = window.HBGameLevels.current;
  states = Array(N * N).fill(true);
  solved = window.HBGameLevels.isMastered;
  check.disabled = solved;
  if (solved) {
    document.getElementById("level-puzzle").textContent = "Final practice stage cleared.";
    render();
    return;
  }
  let seed = (level * 2654435761) >>> 0;
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed; };
  const scrambles = 4 + Math.min(20, Math.floor(level / 400));
  for (let k = 0; k < scrambles; k++) toggle(rand() % 9);
  if (states.every(Boolean)) toggle(rand() % 9);
  document.getElementById("level-puzzle").textContent = "PRACTICE STAGE " + level + " · " + scrambles + " scramble moves. Each tile toggles itself and its neighbours.";
  render();
}
function render() {
  box.replaceChildren();
  states.forEach((on, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sw" + (on ? " on" : "");
    button.textContent = on ? "⚡" : "○";
    button.disabled = solved;
    button.setAttribute("aria-label", "Circuit " + (index + 1) + (on ? " powered" : " off"));
    button.setAttribute("aria-pressed", String(on));
    button.onclick = () => { if (!solved) { toggle(index); render(); } };
    box.append(button);
  });
}
check.onclick = () => {
  if (solved) return;
  if (states.every(Boolean)) {
    solved = true;
    check.disabled = true;
    const next = window.HBGameLevels.complete(level);
    message.textContent = window.HBGameLevels.isMastered ? "Final practice stage cleared." : "Circuit restored · Stage " + next + " unlocked.";
    message.style.color = "#0f8";
    render();
    if (!window.HBGameLevels.isMastered) setTimeout(start, 700);
  } else {
    message.textContent = "Keep solving: every tile toggles itself and its orthogonal neighbours.";
    message.style.color = "#f44";
  }
};
start();
