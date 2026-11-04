# AI Arena

An original browser competition: choose real model contenders, study a coding challenge,
forecast the highest complete score and optionally supply an approach hint. A 3D arena
displays actual configuration, request state, returned scores and measured latency.
The open prompt desk retains custom factual, creative and restricted coding tasks,
including reviewed voice transcripts where browser speech recognition is supported.

## Identity and scope

| Field | Record |
| --- | --- |
| Title / stable ID / genre | AI Arena / `game22` / live model competition, evidence evaluation and prediction |
| Corporate owner / division | Hephzibah Behulah; Artificial Intelligence within the five-brand corporate foundation |
| Platforms | Modern desktop/mobile browsers; WebGL2 for 3D; separate Python gateway for live play |
| Source | `game22/`; secure API and restricted evaluator in `platform/backend/` |
| Status | **In progress**; live acceptance **Blocked** on operator-supplied hosting, provider credentials, active model IDs, an independent judge and real response evidence |
| Console | Browser build only; no native PlayStation build or certification |

Eight integrations are supported: ChatGPT through the OpenAI API, Claude, Gemini,
DeepSeek, Grok, Kimi, Adigun AI and Ollama. Text names identify integrations; the game
uses no provider logos, likenesses or infrastructure models. An Adigun endpoint must
be operator-supplied and is not assumed to be an independently trained foundation
model. API behavior does not establish equivalence to a consumer app or subscription.

## Objective and rules

1. Connect the HTTPS origin of a deployed Game Bank API and sign in. Credentials stay
   on that server. HTTP is accepted only for local development.
2. Select **10,000-level prediction campaign**. Study the required function, mechanics,
   boundary examples and full reference cases.
3. Choose at least two configured contenders, leaving the configured judge out of
   the lineup. Forecast a contender or a tie. Optionally suggest an approach while
   preserving the required function and rules.
4. Start one live competition. The gateway concurrently sends the same prompt and
   evaluates returned functions against the fixed reference cases.
5. Clear requires a fresh response from every contender, identified models, consistent
   measured scores, complete independent judging, perfect reference results for the
   leading answer(s), and the correct pre-match forecast. Otherwise progress stays
   unchanged. Read the evidence, revise the hint/lineup/forecast and retry.

A clear unlocks the next sequential level. Completed levels can be replayed without
inflating progress. Locked levels can be inspected but cannot award a clear. Saved
history never grades an attempt. There is no automatic paid retry. Open prompt
comparison is separate, and its draft is preserved when switching modes.

## Rendering and progression

| Requirement | Implementation and evidence limit |
| --- | --- |
| Actual 3D | `scene.js`: original metal deck, eight server-style scoreboard cabinets, physical lighting/shadows, camera orbit, raycast selection, actual score columns and 1024-pixel label textures through the shared Three.js WebGL2 renderer |
| 4K | The selector requests an actual **3840 × 2160** buffer. `#arena-stage[data-resolution]` and quality status report the obtained buffer. Inspected-frame/browser evidence is recorded for the release candidate in `PROJECT_STATUS.md`; a menu label is not verification |
| Adaptive rendering | Adaptive and 1920 × 1080 modes remain available; unsupported buffers fall back with actual dimensions. Accessible DOM text duplicates scene evidence |
| Real state only | Unconfigured cabinets have no score. HTTP requests say “Request sent,” with no invented percentage. Columns/leader colors require returned live evidence; saved records say “Recorded response” |
| Level count / design | **10,000 deterministic generated levels in one game**; 20 original mechanical families, 500 meaningful parameterisations each. Numeric constants change required behavior; uniqueness does not use decorative level labels |
| Ground truth | 9–17 bounded integer/Boolean/list cases per level; nested pairs use nine cases to respect evaluator limits. `referencePython` is a test oracle, never a contestant answer |
| Validation | Node checks every level's distinct specification, determinism and bounds. A backend check executes all **10,000 reference functions through the actual restricted evaluator**. This is algorithmic validation, not 10,000 manual playthroughs or real model matches |

| Levels / tier | Mechanics introduced |
| --- | --- |
| 1–2,000 · Beginner | Affine calibration, absolute distance, frame clearance, clamping |
| 2,001–4,000 · Apprentice | Piecewise workload, modular wrapping, ceiling batches, Boolean interlocks |
| 4,001–6,000 · Skilled | Bounded filtering, positional weighting, excess accumulation, signed aggregation |
| 6,001–8,000 · Expert | Hysteresis, ordered saturation, overlapping windows, rolling checksums |
| 8,001–10,000 · Professional Master | Maximal episodes, bounded ascending runs, unordered pairs, stateful queue admission |

Difficulty advances through branching, aggregation and order-sensitive state to
nested iteration and simulation. Four families interleave within each tier with
distinct constants and deterministic cases. Boundary cases cover empty lists,
negative values, equal thresholds, repeated values and order effects. Parameter
growth does not claim a new mechanic or prove every generated level equally enjoyable.

### Save and resume

Local schema `adigun.campaign.v1.ai-arena-v1:<encoded-origin>:<numeric-account-id>`
stores version, sequential completion and next unlocked level. It contains no prompt,
email, answer or secret. Gateway/account changes select a separate record; sign-out
clears active UI and attempts. Corrupt/unavailable storage falls back safely. Writes
are read back; failed persistence is visibly reported as session-only. This is
browser-local progression, not a server-attested ranking or tamper-proof economy.
Server history remains account-scoped and requires the session token.

## Controls and accessibility

| Requirement | Implementation |
| --- | --- |
| Keyboard | Labelled forms/buttons; Tab; canvas arrows change angle/elevation, +/− zoom, Home resets; Enter loads preview; Escape/close controls dismiss dialogs |
| Mouse / touch | Drag to orbit; select a configured cabinet to toggle it; duplicate DOM lineup controls; camera selects; vertical touch scrolling retained |
| Speech | Optional browser transcription into custom prompt or campaign hint, followed by explicit review/submission; never auto-dispatched |
| Screen readers | Skip link, named regions, labelled forms/dialogs/canvas, equivalent evidence table, selectable answer text, status/error announcements |
| Contrast / focus | Corporate navy/ivory, AI violet, gold focus outlines; every state is written in text as well as color |
| Reduced motion | Request-light pulse disabled by `prefers-reduced-motion`; otherwise on-demand rendering. Hidden documents pause animation |
| Lifecycle | Context loss discloses recovery; DOM controls remain usable. Disposal removes listeners, observers and textures; back-forward cached pages retain and redraw the scene |
| Language / gamepad | English implemented; no reviewed DE/YO/PCM or native gamepad claim |

Automated WCAG, keyboard, responsive and 4K evidence belongs to the current candidate
receipt. Speech hardware, assistive-technology user testing and mobile GPU measurements
remain separate checks.

## Loading and rights

**Target, not measured acceptance:** usable controls within 2 seconds and initial 3D
within 5 seconds on a representative 2023 midrange laptop, current Chromium, cold
cache, 10 Mbps network and 100 ms latency. The renderer is dynamically imported only
on this title's page. Geometry and labels are created locally; there are no external
3D models, remote fonts or audio downloads. Failed 3D loading leaves the comparison
desk usable with an explicit WebGL2/reload message. Measured size, load and frame-time
distributions must name their device/network; headless rendering does not prove FPS.

| Asset / dependency | Source and rights | Attribution / verification |
| --- | --- | --- |
| Deck, cabinets, indicators, scene, UI, challenge content | Original code-created assets authored for this repository | `scene.js`, `style.css`, `campaign.js`; no third-party model/kit/player/provider artwork |
| Corporate logo | Unchanged official repository artwork | `assets/corporate/hephzibah-behulah-official.jpg`; provenance in `docs/STANDARDS.md` |
| Three.js | Pinned vendored MIT dependency | License retained in `vendor/three/`; root lockfile |
| Fonts / audio | System fonts; no supplied recordings | Browser speech service handles transcription under its own permissions |

## Live integrity and scoring

Latency measures the gateway's full response; the stage never simulates thought or
per-token timing. Test pass rate/correctness contributes 50%, estimated quality 30%,
suggestion relevance 10%, and speed 10%. Speed is `max(0, 1 − latency_ms / 50000)`.
Missing metrics stay unknown. The judge cannot score its own provider. Campaign
checks exact returned prompt/reference-case identity, metric bounds, test counts,
provenance fields and weighted arithmetic against the current contract. Missing
request evidence blocks awards, including when an older gateway can compare answers.
Fields are not independent network attestation; only the active,
fresh POST callback may reach the award path. History never does.

Factual/creative correctness and quality/suggestions are model estimates. Coding
accuracy covers supplied finite cases, not all possible inputs. A match applies to
one prompt, the named model versions and its rubric; it does not prove a universally
best platform. Failed/empty/fixture answers are never replaced with successful text.
Provider accounts may incur charges; dispatch requires a user action. Development
introduced no real provider credentials or purported real outputs.

## Tests, deployment and standards

[TEST.md](TEST.md) gives repeatable checks and selectors. Exact candidate commits,
verification times, browser frames, performance and deployment receipts are owned by
[PROJECT_STATUS.md](../PROJECT_STATUS.md). The focused suite checks generator validity,
adversarial grading, truthful stage presentation and account storage isolation.

Pages path: `/AdigunGamesBank/game22/`. Intended public URL:
<https://hephzibahbehulahhq.github.io/AdigunGamesBank/game22/>. A previously reachable
page does not prove this candidate was deployed; use the verified production revision
and URL in the current release receipt. Live acceptance needs separately hosted
API/providers/judge and observed real responses.

- Policy: **HB-AI-ENGINEERING-001 · v2.0**, commit `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`.
- Design system: commit `52f01f9986d97088413ca9785bc7a2d3f2967123`.
- Tokens: Midnight Navy `#0B1220`, Royal Blue `#2563EB`, Metallic Gold `#D4AF37`,
  Ivory White `#F8FAFC`, Slate Grey `#64748B`, AI Violet `#A78BFA`. Brighter secondary
  text preserves readable contrast; slate is used for non-text structure.
- Consuming components/renderer are verified in this product's Node/backend/browser
  suites; adopted documentation alone does not establish release acceptance.
- Synthetic workload tasks use abstract work units, not financial prices/returns.
- Full release: **NOT ACCEPTED** while real model play and device evidence are missing.
  This is one designed title, never a multiplier toward 2,000 separate games.

### Confirmed offline browser milestone

[CI 41789834075](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41789834075) at `2bfd8bfa6c676a3caaa763f332fadb3fb78b1362` verified the actual WebGL2 buffer as **3840 × 2160**, zero GL error, and the inspected original arena scene. Eight unconfigured providers remain disabled; challenge preview produces no model answers or campaign award. 320px accessibility and 390px reflow checks passed. [Original frame and receipt](../docs/evidence/2026-11-04-wave2/README.md). This is offline client evidence; real live-provider verification remains blocked by the documented gateway dependencies. Later lifecycle and test-only gateway contract checks have separate exact revision records in PROJECT_STATUS.md.

## Published second-wave source

Source `88c3035320044b254ed719ef840f527aa5520e2c` passed **142 JavaScript, 52 API and 23 browser checks** across the consuming product in [CI 41791946076](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41791946076). The game entry page and its current runtime bytes were verified publicly on **2026-11-04 at 08:35:24 CET**. [Deployment receipt](../docs/evidence/2026-11-04-wave2/deployment-88c3035.json); [rendering and gameplay receipt](../docs/evidence/2026-11-04-wave2/verification-88c3035.json). Full production, physical-device and assistive-technology qualification remain open. AI gateway test doubles are not live model evidence.
