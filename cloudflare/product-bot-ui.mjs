const COPY = {
  en: { title: "Adigun BOT", open: "Open Adigun BOT", close: "Close Adigun BOT", intro: "Ask about games, rules, and learning. The assistant receives your chat messages; it cannot see your game or saved progress.", send: "Send", placeholder: "Ask about a game…", thinking: "Thinking…", error: "Adigun BOT is unavailable right now. Try again shortly.", language: "Assistant language", privacy: "Messages are processed by Cloudflare AI. No gameplay state is sent." },
  de: { title: "Adigun BOT", open: "Adigun BOT öffnen", close: "Adigun BOT schließen", intro: "Fragen zu Spielen, Regeln und Lernen. Der Assistent sieht weder dein Spiel noch deinen gespeicherten Fortschritt.", send: "Senden", placeholder: "Frage zu einem Spiel…", thinking: "Denkt nach…", error: "Adigun BOT ist gerade nicht verfügbar. Bitte später erneut versuchen.", language: "Sprache des Assistenten", privacy: "Nachrichten werden von Cloudflare AI verarbeitet. Es werden keine Spieldaten gesendet." },
  yo: { title: "Adigun BOT", open: "Ṣí Adigun BOT", close: "Pa Adigun BOT", intro: "Beere nipa ere, ofin ere ati ẹkọ. Oluranlọwọ ko le ri ere rẹ tabi ilọsiwaju ti o fipamọ.", send: "Firanṣẹ", placeholder: "Beere nipa ere kan…", thinking: "N ronu…", error: "Adigun BOT ko si lọwọlọwọ. Gbiyanju lẹẹkansi nigbamii.", language: "Ede oluranlọwọ", privacy: "Cloudflare AI n ṣe ilana awọn ifiranṣẹ. A ko firanṣẹ ipo ere." },
  pcm: { title: "Adigun BOT", open: "Open Adigun BOT", close: "Close Adigun BOT", intro: "Ask about games, rules and learning. The assistant no fit see your game or saved progress.", send: "Send", placeholder: "Ask about one game…", thinking: "E dey think…", error: "Adigun BOT no dey available now. Try again small time.", language: "Assistant language", privacy: "Cloudflare AI dey process messages. No game state dey sent." },
};
const root = document.createElement("section");
root.className = "gamesbank-bot";
root.innerHTML = `<button class="gamesbank-bot-launch" type="button" aria-expanded="false" aria-controls="gamesbank-bot-panel"></button><aside class="gamesbank-bot-panel" id="gamesbank-bot-panel" hidden aria-label="Adigun BOT"><header><strong data-title></strong><label class="gamesbank-bot-language"><span class="sr-only" data-language-label></span><select aria-label="Assistant language"><option value="en">English</option><option value="de">Deutsch</option><option value="yo">Yorùbá</option><option value="pcm">Nigerian Pidgin</option></select></label><button type="button" data-close>×</button></header><p data-intro></p><div class="gamesbank-bot-log" role="log" aria-live="polite" aria-relevant="additions text"></div><small data-privacy></small><form><label class="sr-only" for="gamesbank-bot-input" data-input-label></label><textarea id="gamesbank-bot-input" rows="2" maxlength="1500" required></textarea><button type="submit" data-send></button></form></aside>`;
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
const copy = () => COPY[language] || COPY.en;

function updateCopy() {
  const words = copy();
  launcher.textContent = words.title;
  launcher.setAttribute("aria-label", panel.hidden ? words.open : words.close);
  root.querySelector("[data-title]").textContent = words.title;
  root.querySelector("[data-intro]").textContent = words.intro;
  root.querySelector("[data-language-label]").textContent = words.language;
  root.querySelector("[data-input-label]").textContent = words.placeholder;
  root.querySelector("[data-privacy]").textContent = words.privacy;
  root.querySelector("[data-send]").textContent = words.send;
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
function toggle(open) {
  panel.hidden = !open;
  launcher.setAttribute("aria-expanded", String(open));
  updateCopy();
  if (open) input.focus(); else launcher.focus();
}
launcher.addEventListener("click", () => toggle(panel.hidden));
root.querySelector("[data-close]").addEventListener("click", () => toggle(false));
panel.addEventListener("keydown", (event) => { if (event.key === "Escape") toggle(false); });
select.addEventListener("change", () => { language = COPY[select.value] ? select.value : "en"; updateCopy(); });
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
    input.focus();
  }
});
