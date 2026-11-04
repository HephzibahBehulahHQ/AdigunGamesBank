# Ark: The Waterline Commission

**Game ID:** `game24` · **Status: In progress — NOT ACCEPTED.**

A distinct browser cargo and ballast commissioning simulation inspired by Genesis 6–9. The player arranges six loads in suitable stations, adjusts low ballast tanks, and launches a simplified floating hull through a timed wave trial. Draft, freeboard, heel, trim, and stability reserve respond to the actual loading plan. The narrative introduces the setting; successful commissioning depends on the physical model.

The campaign and numerical engine are implemented and have completed automated launches for all 10,000 configurations. The accessible command interface and original 3D scene are implemented. All three ark browser checks and actual 4K rendering are verified at `f5378f5`; the aggregate release gate and public deployment remain pending. Hardware performance, localization and full accessibility qualification remain open. Passing numerical tests does not close those acceptance gates.

## 1. Identity and scope

| Field | Adopted scope |
| --- | --- |
| Title / stable ID | Ark: The Waterline Commission / `game24` |
| Genre | Cargo planning, ballast management, and launch simulation |
| Distinct mechanics | Cargo destination and station capacity constraints; mass distribution; finite ballast budgets; calculated draft, freeboard, heel and trim; a dynamic launch trial with recoverable brief excursions and explicit failure limits |
| Platform | Web browser using keyboard, pointer, and touch; no native console certification claim |
| Intended browsers | Current desktop Chrome, Edge, Firefox and Safari, plus current Android Chrome and iOS Safari; compatibility is pending browser evidence |
| Product divisions | Hephzibah Behulah Elektroniker, AI and Evangelism |
| Ownership | Core: campaign, engine and numerical tests. Scene: 3D rendering. Integration owner: application, repository checkpoints, CI, catalogue and release. Independent review: this README and bounded defect review |
| Implementation | `game24/campaign.js`, `game24/engine.js`; HTML/CSS integration and scene work are in progress |
| Acceptance blocker | Browser and visual evidence, measured load/performance results, and exact public release verification are outstanding; the original geometry/material inventory is recorded in ASSETS.md |

This is one game in the wider bank. The requested bank-wide target of 2,000 distinct games does not establish delivery or acceptance of other entries.

## 2. Play rules and lifecycle

Start a commission, select a cargo load and place it in a compatible bay. Every load must be aboard, its destination group must match its station, and its mass must fit the bay capacity. Moving a load to an occupied bay swaps the loads when the incoming load already has a position; otherwise the displaced load returns to the quay. Loading and ballast changes are accepted only in the loading phase.

Each bay has a low ballast tank. Add or remove integer tonnes within the individual tank capacity and the commission's total ballast budget. The loading inspection checks complete stowage, station compatibility, cargo capacity, minimum metacentric height and maximum draft. Passing that inspection permits a launch; it is not itself a successful launch.

During the trial, waves and environmental moments affect roll and pitch. The hull must finish the prescribed duration without exhausting the permitted continuous breach time or crossing an immediate failure limit. Brief excursions below a target freeboard reserve or above a target heel/trim limit can recover. Failure occurs immediately at zero edge freeboard, 40° absolute heel, or 20° absolute trim, or after 1.25 seconds of accumulated envelope breach. Breach recovers at 0.6 seconds per safe second. The on-screen damage fraction derives from that breach timer.

The implemented phases are `ready`, `loading`, `sailing`, `paused`, `won`, and `lost`. Pause preserves the preceding loading/sailing phase. Retry returns a sailing or finished run to loading, resets dynamics and the result, and preserves the cargo and ballast plan, move count and attempt history. Completion records success/reason, simulated time, moves and attempts. Browser controls and focus transitions still require integration verification.

## 3. The 10,000-challenge campaign

The deterministic generator uses `randomFor(level * 7919 + 240609)`, campaign ID `genesis-ark`, and generator version 1. Six cargo objects and six bays form three port/starboard station pairs. Challenge parameters change hull geometry, water density, load mass and height, station order, capacities, ballast allowance, environmental moments, wave height/period/phase and launch limits.

| Tier / levels | Mechanical progression | Heel / trim targets | Trial | Ballast budget above the generated solution |
| --- | --- | --- | --- | --- |
| I: 1–2,000 | Suitable stations and opposing paired loads | 5.5° / 1.8° | 14 s | 40 t |
| II: 2,001–4,000 | Unequal pairs and wind require ballast correction | 4.5° / 1.5° | 16 s | 24 t |
| III: 4,001–6,000 | Tighter capacities and ballast allowance | 3.6° / 1.2° | 18 s | 16 t |
| IV: 6,001–8,000 | Higher centres of mass and stronger waves | 2.8° / 1.0° | 20 s | 10 t |
| V: 8,001–10,000 | Narrower trim/freeboard envelope | 2.2° / 0.8° | 22 s | 6 t |

For normalized difficulty `d = (level - 1) / 9999`, target edge freeboard is `depth - solutionDraft - 0.40 - 0.10*d` metres. Maximum draft is `solutionDraft + 0.20 - 0.08*d` metres; minimum transverse GM is 0.35 m. Tank capacity is `max(20, ...solutionBallast) + 8 + 2*tierIndex` tonnes. A level-dependent cargo-mass term distinguishes the physical configurations; other seeded values also vary their constraints.

Each configuration includes a generated feasible loading/ballast witness. `solutionFor` returns copies for hints and tests. The witness is exercised through the public loading, ballast and launch controls; it does not bypass the simulation or force a win. Automated testing has verified 10,000 distinct physical configurations and 10,000 completed launches. These are procedurally generated challenges, not 10,000 separately authored stories or 10,000 manual playtests. Meaningful player difficulty and representative full browser playthroughs remain acceptance work.

### Progress and saves

The shared progression store uses `adigun.campaign.v1.genesis-ark` and schema `{version: 1, unlocked: 1, completed: 0}`. Completion advances sequentially; `completed` is bounded to 0–10,000 and the next unlocked level is capped at 10,000. Completing a locked later level is rejected. Refresh merges higher completed progress monotonically. Storage and parsing errors fall back to usable session progress.

The saved payload contains campaign progress only. Current cargo positions, ballast and a partially completed launch are not persisted. Data resides in the browser profile's local storage; this store does not transmit the payload to a server. A Map-backed storage check verified sequential completion and refresh between two progression instances. Actual reload, corrupt-storage recovery, blocked storage and multiple browser tabs still need browser-level evidence.

## 4. Physical model, units and limits

The model treats the vessel as a rigid rectangular hull. The coordinate convention is positive x toward the fore station, positive y toward starboard, and positive z upward from the keel. Mass is in **tonnes**, distances in **metres**, time in **seconds**, displayed angles in **degrees**, force in **kilonewtons**, and moment in **kilonewton-metres**. Water density is in t/m³; gravitational acceleration is 9.81 m/s².

For total loaded mass `M`, density `rho`, length `L`, beam `B`, depth `D`, and draft `T`:

```text
Displaced volume V = M / rho
Draft T = V / (L * B)
Upright freeboard = D - T
KB = T / 2
Transverse BM = B² / (12 * T)
Longitudinal BM = L² / (12 * T)
GM = KB + BM - KG
Buoyancy = M * g  [kN]
```

`KG` is the mass-weighted vertical centre: lightship mass at its configured centre; each cargo at bay height plus half cargo height; ballast at 0.35 m above the keel. Roll and pitch moments combine `g * sum(mass * lateral/longitudinal offset)` with their configured environmental moment. Reported equilibrium angle uses `atan2(moment, max(0.01, M*g*GM))`, converted to degrees.

At instantaneous heel, trim and wave elevation, edge freeboard is approximated by:

```text
D - T - abs(sin(heel))*B/2 - abs(sin(trim))*L/2 - max(0, wave)
```

The dynamic simulation advances with semi-implicit Euler steps of **1/120 s**. One external frame advance accepts at most **0.25 s**; excess elapsed time is capped rather than simulated as an arbitrarily large step. Roll/pitch radii of gyration are approximated by `(B²+D²)/12` and `(L²+D²)/12`. Restoring and damping terms use the calculated GM, with sinusoidal wave forcing. Roll and pitch rates are capped at 35°/s and 20°/s, and internal angles at 60° and 35°. Nonfinite or invalid time inputs are rejected. The numerical tests cover fixed-step equivalence, oversized inputs, pause and retry behavior.

Generated hull length is approximately 30–36 m, beam 9.5–11 m and depth 6–6.7 m. These dimensions are game parameters, **not a conversion of biblical cubits**. Ballast, engineering criteria and the trials are invented game systems. The model omits free-surface effects, sloshing, flooding, hull flexibility, moving animals, propulsion, detailed hydrodynamics and many other real-vessel effects. It supplies gameplay feedback and makes no claim of historical reconstruction, vessel certification or engineering suitability.

Conceptual reference: the [NSW Government vessel guide](https://www.nsw.gov.au/employment/dogging-and-rigging/guide/part-2-dogging-and-rigging-activities/cranes-barges/vessel) discusses buoyancy, freeboard, centres of gravity/buoyancy and stability in an operational crane-barge context. Its safety guidance does not validate this game's equations or margins. All implemented approximations above are stated explicitly.

## 5. Rendering and actual 4K proof

| Requirement | Current evidence / remaining work |
| --- | --- |
| Genuine 3D scene | Scene implementation is in progress; renderer, geometry, camera, lighting, materials and interactive synchronization need a finished-code inventory and browser inspection |
| Visual causality | Cargo placement, ballast and hull motion must visibly agree with the numerical state; browser verification pending |
| Render modes | Adaptive, 1080p and 4K drawing-buffer controls are implemented through the shared renderer; actual buffer evidence pending |
| Actual 4K | **Confirmed for Chromium/SwiftShader:** 3840×2160 WebGL2 drawing buffer, zero GL error and inspected original frame at `f5378f5`; evidence linked below. This is not gaming-GPU performance certification |
| Responsive layout | Planned checks at 390×844, 768×1024, 1920×1080 and 3840×2160; overflow, focus visibility and telemetry readability pending |
| Degraded graphics | Accessible loading controls and telemetry must remain usable if rendering fails; retry and failure-state behavior pending |

The engine suite uses simulated frame advances. It does not create a WebGL context or prove a rendered frame, GPU performance, accessibility or visual quality.

## 6. Controls, accessibility and localization

| Input / feature | Declared or intended behavior | Verification |
| --- | --- | --- |
| Keyboard | Tab between controls; Enter/Space activate buttons; canvas arrows select a bay; Enter loads; Backspace unloads; Space pauses/resumes | Handlers implemented; edge-of-grid vertical navigation corrected after independent review; real-input browser evidence pending |
| Pointer / touch | Cargo/bay selection and labeled ballast, launch, pause, retry and next controls | Browser integration pending |
| Gamepad | No implemented support claimed | Pending scope decision; no console claim |
| Screen reader | Named controls, readable telemetry, a focusable scene description, and polite live status | Markup inspected; name/state announcements and screen-reader testing pending |
| Focus / contrast | Visible focus, no keyboard trap, readable non-color status, target WCAG 2.2 AA contrast | Measured and manual evidence pending |
| Target sizes | Ballast buttons and numeric inputs now specify at least 44×44 CSS px | Physical touch testing pending |
| Reduced motion | Respect `prefers-reduced-motion` and retain necessary state feedback | Decorative water motion is suppressed; essential physics feedback remains; browser evidence pending |
| Languages | EN, DE, YO and PCM are the bank's required locales | Complete gameplay strings, layout, language tags and human review pending; coverage is not claimed |

No personal names, religious knowledge test or memorized Scripture answer is required to operate the simulation. Narrative summaries are separate from the commissioning controls.

## 7. Loading and performance targets

These are targets, not measurements. Reference profiles must be recorded with CI/browser evidence before acceptance: desktop Chromium at 1920×1080 on a four-core CPU with integrated graphics; mobile Chromium at 390×844 on a documented midrange Android device; 4K on a specifically named GPU/device.

| Target | Acceptance measurement |
| --- | --- |
| Usable loading controls within 3 s | Cold cache, 10 Mbit/s down, 100 ms round-trip latency; record transferred bytes and timing |
| 3D scene interactive within 5 s | Same cold-cache network profile; record dependency and asset requests |
| Desktop frame performance | Target 60 fps at 1080p, with median and p95 frame time reported over a complete launch |
| Mobile / 4K performance | Target 30 fps on the documented profiles; measure separately for each quality mode |
| Lifecycle | Pause on relevant loss of visibility/focus as designed; no runaway elapsed-time catch-up; repeated retry/start cycles retain bounded resources |

Measured load time, download size, frame rate, memory use, lazy-loading behavior and render-failure retry are **NOT TESTED**. Numerical speed in Node is not a browser performance result. Root CI owns the browser and visual receipts.

## 8. Scripture, original narrative and rights

Narrative text is original summary prose. No Bible translation is bundled and no long passage is reproduced. Sources were consulted on **2026-11-04**.

| Narrative reference | Passage / distinction |
| --- | --- |
| Noah and the construction setting | [Genesis 6:9–22](https://ebible.org/eng-web/GEN06.htm): family, corruption, ark construction, rooms/pitch/decks, living creatures and provisions |
| Entry and rising waters | [Genesis 7:1–24](https://ebible.org/eng-web/GEN07.htm): distinctions in numbers of clean/unclean creatures and birds, entry, rain and rising waters; the six gameplay cargo loads are invented abstractions |
| Recession and departure | [Genesis 8:1–19](https://ebible.org/eng-web/GEN08.htm): the mountains of Ararat, raven and dove, recession and departure; no single modern peak or archaeology claim is made |
| Covenant and rainbow | [Genesis 9:8–17](https://ebible.org/eng-web/GEN09.htm): covenant and its sign; this narrative context does not supply the game's launch criteria |

The [World English Bible publisher](https://worldenglish.bible/) states that the translation text is public domain and may be copied and quoted without royalties. Its name and logo have separate trademark considerations; this game's original summaries are not presented as a World English Bible edition. If short quotes are later introduced, record the exact text, verses, translation and publisher rights source before release. Do not assume every English translation is public domain worldwide: [Cambridge's KJV copyright notice](https://assets.cambridge.org/97805211/63347/copyright/9780521163347_copyright_info.pdf) identifies rights in the United Kingdom. No KJV quotation is used here.

| Asset / material | Source and rights status |
| --- | --- |
| Game code and original summary prose | Created for this repository by the development team; release under the repository's adopted license and ownership policy. Files recorded in `ASSETS.md`: campaign, engine, app and procedural scene |
| Hull, cargo, water and other scene geometry/materials | Intended original procedural assets. Finished scene must be inspected for imported models, textures, external images or generated assets and each recorded before acceptance |
| Corporate logo | Repository asset `assets/corporate/hephzibah-behulah-official.jpg`; adopted corporate asset blob `f7b0e4a650d861fb9d52ed91ea894edec030e03b`, 54,461 bytes; corporate use under the adopted identity policy, not a public-domain asset |
| Third-party rendering/software | Exact dependency version, license, bundled notices and CDN/download behavior must be reconciled with the finished implementation; no unverified license inventory is claimed |
| Fonts | Intended Inter/system sans stack with Georgia editorial text; any downloaded or bundled font requires its own license inventory |
| Audio | No audio assets or audio playback are included |
| Bible text | Original summaries with linked passages; no bundled translation or copied illustration |
| Persons, clubs, trading or financial content | Not applicable to this game's adopted scope; no likeness, sports licence or financial-performance claim |

## 9. Test and release evidence

**Latest chapter evidence:** [CI 41885055957](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41885055957) passed all three ark checks and all nine accessibility checks at `f5378f561bb7a8ef9c3a725d7ef6425f371c4234`. Actual 3840×2160 WebGL2, zero GL error, original scene inspection, 100% completion, save/reload, keyboard-only loss/retry/rebalance and 320/390px layouts are recorded in [the chapter evidence](../docs/evidence/2026-11-04-ark/README.md). Its aggregate gate failed one football test assumption about a later-dismissed substitute; publication awaits the corrected gate. This supersedes the earlier NOT TESTED browser entries below; physical-device, full screen-reader, localization and hardware-performance checks remain unperformed.

Candidate `05a4704bed526bb4e6c8b807239ccc55bd7570e8` passed 153 JavaScript and 52 API tests in [CI 41881414221](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41881414221). Eight of nine accessibility checks passed; ark bay accessible names failed because they differed from their visible text. The redundant overriding names were removed in checkpoint `9d53b1e8b477279fa445455137015ae72aa17c71`, verified remotely at 2026-11-04T17:56:29Z. Later gameplay checks were blocked by that failure and are not claimed as passed.

Source review also corrected vertical keyboard navigation at grid edges. The scene now uses generated deck elevations and cargo heights, and the intact hull edge uses the configured depth; its near wall is explicitly a cutaway. Browser regressions cover both arrow boundaries and an actual unbalanced launch, no award on failure, preserved-plan retry, rebalancing and completion. Their execution evidence is pending.

| Check | Result and scope |
| --- | --- |
| Independent numerical suite | `node --test tests/ark.test.js` completed on 2026-11-04, exit 0: **7 tests passed, 0 failed, 18.885 s**. Includes determinism, unit consistency, loading/swaps/invalid inputs, station/cargo/ballast constraints, fixed stepping/pause, failure/retry and all 10,000 launches |
| All-level numerical trial | **10,000 distinct configurations; 10,000 complete launches; 720,000 simulated frame advances.** Maximum sampled absolute heel 1.617°, trim 0.237°. Minimum sampled reserve relative to the target was −0.0189 m, permitted by the transient-breach rule; this is not a claim that every frame remained above its target |
| Root's independent receipt | At parent-reported candidate `beae935`, seven tests passed in **30.38 s**, including all 10,000 launches. Root also reported levels 1/2000/4000/6000/8000/10000 finishing in 14/14/16/18/20/22 simulated seconds |
| Save-store check | Map-backed sequential completion rejected level 2 before level 1; two store instances refreshed to completed 2 / unlocked 3. Browser persistence and corrupt-data coverage pending |
| Candidate binding | Shared files can change during integration. Root must bind final receipts to the exact committed candidate and rerun affected checks after subsequent engine changes; the earlier passing runs do not certify later edits |
| Browser controls and complete playthroughs | **NOT TESTED** by this review; root CI pending |
| 3D, screenshots and actual 4K | **NOT TESTED**; drawing-buffer evidence and inspected frames pending |
| Accessibility and language review | **NOT TESTED**; automated and manual evidence pending |
| Load/GPU/frame-time/memory metrics | **NOT TESTED**; reference-device measurements pending |
| Final asset/license audit | **PENDING** finished scene and dependency inventory |
| Build/deploy/public route | **NOT VERIFIED**; root owns release and public verification |

Numerical evidence covers implemented equations and a feasible solution for each generated challenge. It does not establish that every possible loading is safe, every player strategy works, or the finished browser product meets its acceptance requirements.

### Deployment target

The exact repository deployment path is **`/AdigunGamesBank/game24/`**. Expected public routes, pending root verification, are:

- `https://adigungamesbank.hephzibahbehulah.com/game24/`
- `https://hephzibahbehulahhq.github.io/AdigunGamesBank/game24/`

These are intended routes, not a statement that this candidate is publicly deployed. Acceptance requires the deployed commit/build identifier, successful response and asset loading at the exact route, representative controls and a completed launch, recorded browser/device details, and dated public receipts. No deployment or repository ref was changed by this reviewer.

## 10. Adopted policy and design pins

Adopted for Hephzibah Behulah's `HephzibahBehulahHQ/AdigunGamesBank` work on **2026-11-04, Europe/Berlin**, under the user specification “Adigun Game bank pursuing goals and template.md”, repository `AGENTS.md`, `docs/GAME_TEMPLATE.md` and `docs/STANDARDS.md`.

| Policy / design source | Exact adopted pin |
| --- | --- |
| HB-AI-ENGINEERING-001 v2.0 | [`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`](https://github.com/HephzibahBehulahHQ/hb-AI-policy/tree/d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e) |
| Design source | `52f01f9986d97088413ca9785bc7a2d3f2967123`; `tokens/corporate.json`, `tokens/brands.json`, `docs/brand-and-product-naming.md`, `templates/universal-product/` |
| Corporate identity source | `bd116504412b37105166805018f64a6e7bbe3cde` |
| Trading policy reference | `65b28cfc20925494b056321d57955e304eb09ac7`; not applicable to the present mechanics |

The adopted corporate palette is Navy `#0B1220`, Blue `#2563EB`, Gold `#D4AF37`, Ivory `#F8FAFC` and Slate `#64748B`; relevant division accents are Elektroniker `#22D3EE`, AI `#A78BFA` and Evangelism `#D4AF37`. The intended sans stack is Inter, ui-sans-serif, system-ui, Apple/Blink system fonts, Segoe UI and sans-serif, with Georgia for editorial text. Final rendered token use, logo treatment, contrast and typography must be checked against these pins; documentation alone is not proof of conformance.

**Acceptance remains In progress.** Final release requires the outstanding template evidence above and root's exact-candidate review. This README's initial checkpoint was written at `2026-11-04T18:29:07+01:00`; reconciliation with the implemented engine and numerical receipts was completed during this review on 2026-11-04. Root owns checkpoint and publication timestamps.
