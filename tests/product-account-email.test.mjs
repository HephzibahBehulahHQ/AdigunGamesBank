import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import worker from "../cloudflare/account.mjs";

const origin = "https://gamesbank-preview.example.test";
const env = {
  SUPABASE_URL: process.env.GAMESBANK_TEST_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.GAMESBANK_TEST_SUPABASE_KEY,
  ACCOUNT_SECRET: randomUUID(),
  ACCOUNT_RPC_PROOF: process.env.GAMESBANK_TEST_RPC_PROOF,
  ACCOUNT_LIMITER: { limit: async () => ({ success: true }) },
};
const mailpit = process.env.GAMESBANK_TEST_MAILPIT_URL;

function post(body, cookie = "") {
  return worker.fetch(new Request(origin + "/api/account", {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), env);
}

async function emailCode(email, seen) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const inbox = await (await fetch(new URL("/api/v1/messages", mailpit))).json();
    const message = inbox.messages.find((entry) =>
      !seen.has(entry.ID) && entry.To.some((recipient) => recipient.Address === email));
    if (message) {
      seen.add(message.ID);
      const detail = await (await fetch(new URL("/api/v1/message/" + message.ID, mailpit))).json();
      const code = detail.HTML?.match(/<strong>\s*(\d{6,10})\s*<\/strong>/i)?.[1];
      assert.ok(code, "the delivered message must contain a numeric code");
      return code;
    }
    await delay(200);
  }
  assert.fail("no email arrived for the test address");
}

test("local Supabase delivers separate registration and password sign-in codes", {
  skip: !mailpit || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.ACCOUNT_RPC_PROOF,
  timeout: 25_000,
}, async () => {
  const email = process.env.GAMESBANK_TEST_EMAIL || "gamesbank-" + randomUUID() + "@example.com";
  const password = "An isolated GamesBank preview password";
  const seen = new Set();
  for (const mode of ["register", "sign-in"]) {
    const start = await post({ step: "begin", mode, email, password });
    assert.deepEqual(await start.json(), { step: "verify" });
    const challenge = start.headers.getSetCookie()[0].split(";")[0];
    const code = await emailCode(email, seen);
    const finish = await post({ step: "verify", code }, challenge);
    const result = await finish.json();
    assert.equal(result.step, mode === "register" ? "registered" : "signed-in", JSON.stringify(result));
    if (mode === "sign-in") {
      const session = finish.headers.getSetCookie()[1].split(";")[0];
      assert.equal((await (await post({ step: "guest" }, session)).json()).step, "signed-in");
    }
  }
});
