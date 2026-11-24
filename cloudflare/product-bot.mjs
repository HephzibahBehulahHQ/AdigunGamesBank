const MODEL = "@cf/zai-org/glm-4.7-flash";
const HOST = "adigungamesbank.hephzibahbehulah.com";
const LANGUAGES = { en: "English", de: "German", yo: "Yoruba", pcm: "Nigerian Pidgin English" };
const SYSTEM = `You are Adigun BOT, the product copilot for Adigun GamesBank. Help people find games, understand game rules and controls, and learn concepts used by the games. You cannot see gameplay, scores, achievements, saved progress, account details, or local files; never claim otherwise. Do not invent game features or say a game is available unless it is named in the user conversation. Ask for the game title when needed. Do not request passwords, one-time codes, payment information, or unnecessary personal data. Keep replies concise, useful, age-appropriate, and educational.`;
const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/bot" || !(url.hostname === HOST || url.hostname.endsWith(".workers.dev"))) return json({ error: "not-found" }, 404);
    if (request.method !== "POST") return json({ error: "method-not-allowed" }, 405);
    if (request.headers.get("Origin") !== url.origin) return json({ error: "origin-not-allowed" }, 403);
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return json({ error: "json-required" }, 415);
    if (!env.BOT_LIMITER?.limit || !env.AI?.run) return json({ error: "assistant-unavailable" }, 503);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    try {
      if (!(await env.BOT_LIMITER.limit({ key: `gamesbank-bot:${ip}` })).success) return json({ error: "wait-and-retry" }, 429);
    } catch { return json({ error: "assistant-unavailable" }, 503); }

    let raw;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "invalid-json" }, 400);
      const chunks = []; let size = 0;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 12_000) { await reader.cancel(); return json({ error: "message-too-large" }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      raw = new TextDecoder().decode(bytes);
    } catch { return json({ error: "invalid-json" }, 400); }
    let body; try { body = JSON.parse(raw); } catch { return json({ error: "invalid-json" }, 400); }
    const source = Array.isArray(body?.messages) ? body.messages : [];
    if (!source.length || source.length > 8 || source.some((item) => !["user", "assistant"].includes(item?.role) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 1_500)) return json({ error: "invalid-messages" }, 400);
    const messages = source.map((item) => ({ role: item.role, content: item.content.trim() }));
    const total = messages.reduce((sum, item) => sum + item.content.length, 0);
    if (messages.at(-1).role !== "user") return json({ error: "user-message-required" }, 400);
    if (total > 6_000) return json({ error: "conversation-too-large" }, 413);
    const language = LANGUAGES[body.language] || LANGUAGES.en;
    try {
      const result = await env.AI.run(MODEL, {
        messages: [{ role: "system", content: `${SYSTEM} Reply in ${language} when practical.` }, ...messages],
        max_tokens: 500,
      });
      const answer = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
      if (!answer || answer.length > 4_000) return json({ error: "assistant-response-unavailable" }, 502);
      return json({ answer });
    } catch { return json({ error: "assistant-temporarily-unavailable" }, 502); }
  },
};
