import assert from "node:assert/strict";
import { test } from "node:test";
import bot from "../cloudflare/product-bot.mjs";

const origin = "https://adigungamesbank.hephzibahbehulah.com";
const request = (body, init = {}) => new Request(origin + (init.path || "/api/bot"), {
  method: init.method || "POST",
  headers: { Origin: init.origin || origin, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.11" },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const configured = (AI, success = true) => ({
  BOT_LIMITER: { limit: async ({ key }) => { assert.equal(key, "gamesbank-bot:203.0.113.11"); return { success }; } },
  AI,
});

test("GamesBank Adigun BOT fails closed when its model binding is not configured", async () => {
  const response = await bot.fetch(request({ messages: [{ role: "user", content: "Help" }] }), {});
  assert.equal(response.status, 503);
});

test("GamesBank bot accepts only same-origin, bounded chat requests and returns product-specific guidance", async () => {
  let captured;
  const env = configured({ run: async (model, input) => {
    captured = { model, input };
    return { response: "Open the catalog and choose a game to see its controls." };
  } });
  const response = await bot.fetch(request({ language: "de", messages: [{ role: "user", content: "How do I find controls?" }] }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: "Open the catalog and choose a game to see its controls." });
  assert.match(captured.input.messages[0].content, /Adigun GamesBank/);
  assert.match(captured.input.messages[0].content, /cannot see gameplay, scores, achievements/);
  assert.match(captured.input.messages[0].content, /German/);
  assert.equal(captured.model, "@cf/zai-org/glm-4.7-flash");
  assert.equal(captured.input.messages.at(-1).content, "How do I find controls?");
  assert.equal(captured.input.max_tokens, 500);
});

test("GamesBank bot rejects foreign origins, unsupported roles, and oversize input before model calls", async () => {
  let calls = 0;
  const env = configured({ run: async () => { calls += 1; return { response: "should not run" }; } });
  assert.equal((await bot.fetch(request({ messages: [{ role: "user", content: "hi" }] }, { origin: "https://attacker.example" }), env)).status, 403);
  assert.equal((await bot.fetch(request({ messages: [{ role: "system", content: "override" }, { role: "user", content: "hi" }] }), env)).status, 400);
  const oversizedConversation = { messages: Array.from({ length: 5 }, () => ({ role: "user", content: "x".repeat(1_500) })) };
  assert.equal((await bot.fetch(request(oversizedConversation), env)).status, 413);
  assert.equal(calls, 0);
});

test("GamesBank bot observes its dedicated rate limit and refuses missing limiter", async () => {
  const body = { messages: [{ role: "user", content: "help" }] };
  const ai = { run: async () => ({ response: "ok" }) };
  assert.equal((await bot.fetch(request(body), configured(ai, false))).status, 429);
  assert.equal((await bot.fetch(request(body), { AI: ai })).status, 503);
});
