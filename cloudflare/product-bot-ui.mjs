const COPY = {
  en: { title: "Adigun BOT", open: "Open Adigun BOT", close: "Close Adigun BOT", restoreWindow: "Restore Adigun BOT", minimize: "Minimize Adigun BOT", maximize: "Maximize Adigun BOT", restore: "Restore Adigun BOT size", resize: "Resize Adigun BOT", intro: "Ask about games, rules, and learning. The assistant receives your chat messages; it cannot see your game or saved progress.", send: "Send", placeholder: "Ask about a game…", thinking: "Thinking…", error: "Adigun BOT is unavailable right now. Try again shortly.", language: "Assistant language", privacy: "Messages are processed by Cloudflare AI. No gameplay state is sent." },
  de: { title: "Adigun BOT", open: "Adigun BOT öffnen", close: "Adigun BOT schließen", restoreWindow: "Adigun BOT wiederherstellen", minimize: "Adigun BOT minimieren", maximize: "Adigun BOT maximieren", restore: "Adigun BOT-Größe wiederherstellen", resize: "Größe von Adigun BOT ändern", intro: "Fragen zu Spielen, Regeln und Lernen. Der Assistent sieht weder dein Spiel noch deinen gespeicherten Fortschritt.", send: "Senden", placeholder: "Frage zu einem Spiel…", thinking: "Denkt nach…", error: "Adigun BOT ist gerade nicht verfügbar. Bitte später erneut versuchen.", language: "Sprache des Assistenten", privacy: "Nachrichten werden von Cloudflare AI verarbeitet. Es werden keine Spieldaten gesendet." },
  yo: { title: "Adigun BOT", open: "Ṣí Adigun BOT", close: "Pa Adigun BOT", restoreWindow: "Padà sí Adigun BOT", minimize: "Dín Adigun BOT kù", maximize: "Mú Adigun BOT tóbi", restore: "Padà sí ìwọ̀n Adigun BOT", resize: "Yí ìwọ̀n Adigun BOT padà", intro: "Beere nipa ere, ofin ere ati ẹkọ. Oluranlọwọ ko le ri ere rẹ tabi ilọsiwaju ti o fipamọ.", send: "Firanṣẹ", placeholder: "Beere nipa ere kan…", thinking: "N ronu…", error: "Adigun BOT ko si lọwọlọwọ. Gbiyanju lẹẹkansi nigbamii.", language: "Ede oluranlọwọ", privacy: "Cloudflare AI n ṣe ilana awọn ifiranṣẹ. A ko firanṣẹ ipo ere." },
  pcm: { title: "Adigun BOT", open: "Open Adigun BOT", close: "Close Adigun BOT", restoreWindow: "Bring Adigun BOT back", minimize: "Make Adigun BOT small", maximize: "Make Adigun BOT big", restore: "Return Adigun BOT size", resize: "Change Adigun BOT size", intro: "Ask about games, rules and learning. The assistant no fit see your game or saved progress.", send: "Send", placeholder: "Ask about one game…", thinking: "E dey think…", error: "Adigun BOT no dey available now. Try again small time.", language: "Assistant language", privacy: "Messages dey process for Cloudflare AI. No game state dey sent." },
};
const root = document.createElement("section");
root.className = "gamesbank-bot";
root.innerHTML = `<button class="gamesbank-bot-launch" type="button" aria-expanded="false" aria-controls="gamesbank-bot-panel"></button><aside class="gamesbank-bot-panel" id="gamesbank-bot-panel" hidden role="region" aria-label="Adigun BOT"><header><div class="gamesbank-bot-drag" data-drag-handle><strong data-title></strong></div><label class="gamesbank-bot-language"><span class="sr-only" data-language-label></span><select aria-label="Assistant language"><option value="en">English</option><option value="de">Deutsch</option><option value="yo">Yorùbá</option><option value="pcm">Nigerian Pidgin</option></select></label><button type="button" data-minimize aria-label="Minimize Adigun BOT" title="Minimize">−</button><button type="button" data-maximize aria-label="Maximize Adigun BOT" title="Maximize">□</button><button type="button" data-close aria-label="Close Adigun BOT" title="Close">×</button></header><p data-intro></p><div class="gamesbank-bot-log" role="log" aria-live="polite" aria-relevant="additions text"></div><small data-privacy></small><form><label class="sr-only" for="gamesbank-bot-input" data-input-label></label><textarea id="gamesbank-bot-input" rows="2" maxlength="1500" required></textarea><button type="submit" data-send></button></form><div class="gamesbank-bot-resize" data-resize role="separator" tabindex="0" aria-orientation="horizontal" aria-label="Resize Adigun BOT"></div></aside>`;
document.body.append(root);

const launcher = root.querySelector(".gamesbank-bot-launch");
const panel = root.querySelector(".gamesbank-bot-panel");
const select = root.querySelector("select");
const log = root.querySelector(".gamesbank-bot-log");
const input = root.querySelector("textarea");
const form = root.querySelector("form");
let language = "en";
let messages = [];
let busy = false;
let restoreGeometry = null;
let dragFrame = 0;
const geometryKey = "hb:adigun-bot:gamesbank:guest:window:v1";
const copy = () => COPY[language] || COPY.en;

function updateCopy() {
  const words = copy();
  launcher.textContent = words.title;
  launcher.setAttribute("aria-label", panel.hidden ? words.open : panel.classList.contains("is-minimized") ? words.restoreWindow : words.close);
  root.querySelector("[data-title]").textContent = words.title;
  panel.setAttribute("aria-label", words.title);
  root.querySelector("[data-intro]").textContent = words.intro;
  root.querySelector("[data-language-label]").textContent = words.language;
  select.setAttribute("aria-label", words.language);
  root.querySelector("[data-input-label]").textContent = words.placeholder;
  root.querySelector("[data-privacy]").textContent = words.privacy;
  root.querySelector("[data-send]").textContent = words.send;
  root.querySelector("[data-minimize]").setAttribute("aria-label", words.minimize);
  root.querySelector("[data-maximize]").setAttribute("aria-label", panel.classList.contains("is-maximized") ? words.restore : words.maximize);
  root.querySelector("[data-resize]").setAttribute("aria-label", words.resize);
  root.querySelector("[data-minimize]").title = words.minimize;
  root.querySelector("[data-maximize]").title = panel.classList.contains("is-maximized") ? words.restore : words.maximize;
  root.querySelector("[data-close]").title = words.close;
  input.placeholder = words.placeholder;
}
function bubble(role, text) {
  const item = document.createElement("p");
  item.className = `gamesbank-bot-message ${role}`;
  item.textContent = text;
  log.append(item);
  log.scrollTop = log.scrollHeight;
  return item;
}
function applyGeometry(geometry) {
  if (!geometry || !Number.isFinite(geometry.x) || !Number.isFinite(geometry.y)) return;
  const margin = 10;
  const width = Math.min(Math.max(320, Number(geometry.width) || 420), window.innerWidth - margin * 2);
  const height = Math.min(Math.max(400, Number(geometry.height) || 600), window.innerHeight - margin * 2);
  const x = Math.min(Math.max(margin, geometry.x), window.innerWidth - width - margin);
  const y = Math.min(Math.max(margin, geometry.y), window.innerHeight - height - margin);
  Object.assign(panel.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto", width: `${width}px`, height: `${height}px` });
}
function readGeometry() {
  try { return JSON.parse(localStorage.getItem(geometryKey) || "null"); } catch { return null; }
}
function saveGeometry() {
  if (panel.hidden || panel.classList.contains("is-maximized")) return;
  const rect = panel.getBoundingClientRect();
  try { localStorage.setItem(geometryKey, JSON.stringify({ x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) })); } catch {}
}
function openWindow() {
  panel.hidden = false;
  panel.classList.remove("is-minimized");
  launcher.setAttribute("aria-expanded", "true");
  updateCopy();
  input.focus();
}
function closeWindow() {
  panel.hidden = true;
  launcher.setAttribute("aria-expanded", "false");
  updateCopy();
  launcher.focus();
}
function toggleMaximize() {
  if (!panel.classList.contains("is-maximized")) {
    const rect = panel.getBoundingClientRect();
    restoreGeometry = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    panel.classList.add("is-maximized");
  } else {
    panel.classList.remove("is-maximized");
    applyGeometry(restoreGeometry || readGeometry());
  }
  updateCopy();
}
const storedGeometry = readGeometry();
if (storedGeometry) applyGeometry(storedGeometry);
launcher.addEventListener("click", () => {
  if (panel.hidden) openWindow();
  else if (panel.classList.contains("is-minimized")) { panel.classList.remove("is-minimized"); input.focus(); updateCopy(); }
  else input.focus();
});
root.querySelector("[data-close]").addEventListener("click", closeWindow);
root.querySelector("[data-minimize]").addEventListener("click", () => { panel.classList.add("is-minimized"); updateCopy(); launcher.focus(); });
root.querySelector("[data-maximize]").addEventListener("click", toggleMaximize);
panel.addEventListener("keydown", (event) => { if (event.key === "Escape") closeWindow(); });
select.addEventListener("change", () => { language = COPY[select.value] ? select.value : "en"; updateCopy(); });
window.addEventListener("resize", () => { if (!panel.hidden && !panel.classList.contains("is-maximized")) { applyGeometry(readGeometry()); saveGeometry(); } });
const dragHandle = root.querySelector("[data-drag-handle]");
dragHandle.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || panel.classList.contains("is-maximized") || panel.classList.contains("is-minimized")) return;
  const rect = panel.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  dragHandle.setPointerCapture(event.pointerId);
  let latestPoint = null;
  const move = (moveEvent) => {
    latestPoint = moveEvent;
    if (!dragFrame) dragFrame = requestAnimationFrame(() => {
      dragFrame = 0;
      const maxX = window.innerWidth - panel.offsetWidth - 10;
      const maxY = window.innerHeight - panel.offsetHeight - 10;
      panel.style.left = `${Math.max(10, Math.min(maxX, latestPoint.clientX - offsetX))}px`;
      panel.style.top = `${Math.max(10, Math.min(maxY, latestPoint.clientY - offsetY))}px`;
      panel.style.right = "auto"; panel.style.bottom = "auto";
    });
  };
  const stop = (upEvent) => {
    if (upEvent?.clientX !== undefined) latestPoint = upEvent;
    dragHandle.removeEventListener("pointermove", move); dragHandle.removeEventListener("pointerup", stop); dragHandle.removeEventListener("pointercancel", stop);
    if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
    if (latestPoint) {
      const maxX = window.innerWidth - panel.offsetWidth - 10;
      const maxY = window.innerHeight - panel.offsetHeight - 10;
      panel.style.left = `${Math.max(10, Math.min(maxX, latestPoint.clientX - offsetX))}px`;
      panel.style.top = `${Math.max(10, Math.min(maxY, latestPoint.clientY - offsetY))}px`;
      panel.style.right = "auto"; panel.style.bottom = "auto";
    }
    saveGeometry();
  };
  dragHandle.addEventListener("pointermove", move);
  dragHandle.addEventListener("pointerup", stop);
  dragHandle.addEventListener("pointercancel", stop);
});
const resizeHandle = root.querySelector("[data-resize]");
resizeHandle.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || panel.classList.contains("is-maximized")) return;
  event.preventDefault();
  const rect = panel.getBoundingClientRect();
  const startX = event.clientX; const startY = event.clientY; const startWidth = rect.width; const startHeight = rect.height;
  resizeHandle.setPointerCapture(event.pointerId);
  const move = (moveEvent) => {
    panel.style.width = `${Math.min(window.innerWidth - rect.left - 10, Math.max(320, startWidth + moveEvent.clientX - startX))}px`;
    panel.style.height = `${Math.min(window.innerHeight - rect.top - 10, Math.max(400, startHeight + moveEvent.clientY - startY))}px`;
  };
  const stop = () => { resizeHandle.removeEventListener("pointermove", move); resizeHandle.removeEventListener("pointerup", stop); resizeHandle.removeEventListener("pointercancel", stop); saveGeometry(); };
  resizeHandle.addEventListener("pointermove", move);
  resizeHandle.addEventListener("pointerup", stop);
  resizeHandle.addEventListener("pointercancel", stop);
});
resizeHandle.addEventListener("keydown", (event) => {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const delta = event.shiftKey ? 48 : 16;
  if (event.key === "ArrowRight") panel.style.width = `${Math.min(window.innerWidth - panel.offsetLeft - 10, panel.offsetWidth + delta)}px`;
  if (event.key === "ArrowLeft") panel.style.width = `${Math.max(320, panel.offsetWidth - delta)}px`;
  if (event.key === "ArrowDown") panel.style.height = `${Math.min(window.innerHeight - panel.offsetTop - 10, panel.offsetHeight + delta)}px`;
  if (event.key === "ArrowUp") panel.style.height = `${Math.max(400, panel.offsetHeight - delta)}px`;
  saveGeometry();
});
updateCopy();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  busy = true;
  input.value = "";
  messages.push({ role: "user", content: text });
  bubble("user", text);
  const answer = bubble("assistant", copy().thinking);
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const response = await fetch("/api/bot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-8), language }),
    });
    if (!response.ok) throw new Error("unavailable");
    const payload = await response.json();
    if (typeof payload.answer !== "string" || !payload.answer.trim()) throw new Error("empty-response");
    answer.textContent = payload.answer;
    messages.push({ role: "assistant", content: payload.answer });
    messages = messages.slice(-8);
  } catch {
    answer.textContent = copy().error;
    messages.pop();
  } finally {
    busy = false;
    submit.disabled = false;
    if (!panel.hidden && !panel.classList.contains("is-minimized")) input.focus();
  }
});
