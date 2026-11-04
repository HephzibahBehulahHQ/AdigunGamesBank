const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const timerEl = document.getElementById("timer");
const msgEl = document.getElementById("message");
const rotateBtn = document.getElementById("rotate-btn");
const checkBtn = document.getElementById("check-btn");
const nextBtn = document.getElementById("next-btn");
const WIRES = ["─", "│", "┌", "┐", "└", "┘", "├", "┤", "┬", "┴", "┼"];
const SIZE = 5;
let grid = [], selected = null, score = 0;
let level = window.HBGameLevels.current, timeLeft = 60, timerId = null, route = [];
let roundState = "playing";
msgEl.setAttribute("role", "status");

function createLevel() {
  clearInterval(timerId);
  level = window.HBGameLevels.current;
  levelEl.textContent = level.toLocaleString();
  selected = null;
  grid = Array(SIZE * SIZE).fill(null);
  grid[0] = "S";
  grid[24] = "T";
  route = level % 2 ? [1, 2, 3, 4, 9, 14, 19] : [5, 10, 15, 20, 21, 22, 23];
  roundState = window.HBGameLevels.isMastered ? "mastered" : "playing";
  checkBtn.disabled = rotateBtn.disabled = roundState !== "playing";
  nextBtn.disabled = true;
  nextBtn.textContent = "Next Level";
  render();
  msgEl.style.color = "#eafaff";
  if (roundState === "mastered") {
    timerEl.textContent = "0";
    msgEl.textContent = "Final practice stage cleared. Your progress is saved.";
    return;
  }
  startTimer();
  msgEl.textContent = "Build a continuous wire path from ⚡ source to 💡 target. Rotate only the cells on the open route.";
}
function solution(index) {
  return level % 2
    ? (index === 4 ? "┐" : [1, 2, 3].includes(index) ? "─" : "│")
    : (index === 20 ? "└" : [21, 22, 23].includes(index) ? "─" : "│");
}
function render() {
  boardEl.replaceChildren();
  grid.forEach((value, i) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.disabled = roundState !== "playing" || value === "S" || value === "T";
    cell.setAttribute("aria-label", value === "S" ? "Power source" : value === "T" ? "Lamp target" : "Cell " + (i + 1) + ", " + (value || "empty"));
    if (value === "S") { cell.classList.add("source"); cell.textContent = "⚡"; }
    else if (value === "T") { cell.classList.add("target"); cell.textContent = "💡"; }
    else if (value) cell.textContent = value;
    cell.addEventListener("click", () => selectCell(i));
    boardEl.appendChild(cell);
  });
}
function selectCell(index) {
  if (roundState !== "playing" || grid[index] === "S" || grid[index] === "T") return;
  selected = index;
  const current = grid[index];
  grid[index] = WIRES[current ? (WIRES.indexOf(current) + 1) % WIRES.length : 0];
  render();
}
rotateBtn.addEventListener("click", () => {
  if (roundState !== "playing" || selected === null || !grid[selected]) return;
  grid[selected] = WIRES[(WIRES.indexOf(grid[selected]) + 1) % WIRES.length];
  render();
});
function startTimer() {
  timeLeft = Math.min(180, 60 + Math.floor(level / 100));
  timerEl.textContent = timeLeft;
  timerId = setInterval(() => {
    if (roundState !== "playing") return;
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      roundState = "expired";
      checkBtn.disabled = rotateBtn.disabled = true;
      nextBtn.disabled = false;
      nextBtn.textContent = "Retry Level";
      msgEl.textContent = "Time expired. Retry the same stage.";
      msgEl.style.color = "#ff6677";
      render();
    }
  }, 1000);
}
checkBtn.addEventListener("click", () => {
  if (roundState !== "playing") return;
  if (!route.every(i => grid[i] === solution(i))) {
    msgEl.textContent = "Path is still open. Check each turn and wire direction.";
    msgEl.style.color = "#ffd166";
    return;
  }
  clearInterval(timerId);
  roundState = "solved";
  score += Math.max(10, timeLeft) * level;
  scoreEl.textContent = score;
  const next = window.HBGameLevels.complete(level);
  if (window.HBGameLevels.isMastered) roundState = "mastered";
  msgEl.textContent = roundState === "mastered" ? "Final practice stage cleared." : "Circuit complete! Stage " + next + " unlocked.";
  msgEl.style.color = "#00ff88";
  checkBtn.disabled = rotateBtn.disabled = true;
  nextBtn.disabled = roundState === "mastered";
  render();
  boardEl.children && [...boardEl.children].forEach(cell => cell.classList.add("correct"));
});
nextBtn.addEventListener("click", () => {
  if (roundState === "solved" || roundState === "expired") createLevel();
});
createLevel();
