# Adigun Game Bank — current project status

Updated: **2026-11-04T20:16:31+01:00 (Europe/Berlin)**. This is the current acceptance record.

## Active continuation — 4 November 2026

**In progress, work branch `work/finish-games-2026-11-04`.** Recovered from `37bf36fa317537d535cf8e6f1ec36e464764c451`. Remote main remains `e7c60ac89f987c93d7af5fc03ac6b21eaadcef18`; the last publicly verified runtime remains `b3844bff8775b509ddda6f9002726bf4ec1dc89b`.

First useful changed work: **2026-11-04T21:41:59Z**. This first WIP includes the Neon Pulse 3D signal-puzzle engine, interface, scene and five passing Node tests. All 10,000 unique deterministic boards were solved through the actual engine within their budgets. Browser/4K/accessibility/publication are **NOT TESTED** for this work. Fuse Box, Apex Circuit and Penalty Pro are assigned exclusive paths to parallel writers; unintegrated files remain WIP.

Read-only deployment diagnosis found both prior attempts failed after successful build/upload while Pages publishing stalled. A prior successful release used the same action revision and runner. Do not change hosting or rerun the unchanged deployment a third time. The next fully verified source will use the existing Pages flow and exact-byte public verification.

Checkpoint prepared at **2026-11-04T21:43:30+00:00**; remote verification is pending until recorded by a subsequent checkpoint. No integration or new public release is claimed.

## Acceptance and published revision

**In progress.** The 2,000 individually designed games × 10,000 meaningful levels target is not delivered. The published catalog has **24 titles: 18 legacy 2D, five playable local 3D games and one API-dependent 3D competition client**. The Bible work currently comprises the David chapter and the new Genesis ark commissioning chapter. Full production, complete Genesis–Revelation coverage and native-console certification are not claimed.

**The verified gameplay release source is `b3844bff8775b509ddda6f9002726bf4ec1dc89b`**, integrated into main and read back exactly at **2026-11-04T18:36:31Z** after its release gate passed. Subsequent evidence/documentation checkpoints retain that tested gameplay implementation; receipts identify the immutable revision actually verified. GitHub Pages [run 41888830443](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41888830443) succeeded for that exact source at **2026-11-04T18:36:58Z**. Public verification completed at **2026-11-04T18:41:10Z**: **all 67 checked files returned HTTP 200 and matched exact source bytes**. [Per-file deployment receipt](docs/evidence/2026-11-04-ark/deployment-b3844bf.json). The custom domain remains **https://adigungamesbank.hephzibahbehulah.com/**; the new game is live at **https://adigungamesbank.hephzibahbehulah.com/game24/**. The preceding verified public source was `88c3035320044b254ed719ef840f527aa5520e2c`.

## Final source checkpoint and publication blocker

**Main is `e7c60ac89f987c93d7af5fc03ac6b21eaadcef18`**, verified by exact remote readback at **2026-11-04T18:53:41Z**. That exact commit passed [CI 41890099819](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41890099819), updated **2026-11-04T18:52:56Z**: **153 JavaScript + 52 API + 27 browser checks**, with 138 runtime build files and fingerprint `1f316a27a65d82a600f5e3379f07b79eceb7d3f89e49c9d762766e96f575570f`. It retains the verified gameplay implementation and adds final evidence/documentation.

**Final documentation publication is blocked.** GitHub Pages [run 41891598230](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41891598230) timed out in its deployment step on both attempts, recorded at **2026-11-04T19:04:10Z** and **2026-11-04T19:15:19Z**. The failed-job retry was requested at **2026-11-04T19:04:45Z**. Public checks completed at **2026-11-04T19:00:21Z** and **2026-11-04T19:13:19Z**; each found all 11 changed evidence/documentation/catalog files stale or unavailable. The preceding 67-file gameplay deployment remains the last verified public release. These failures do not establish an application defect or a service-wide outage.

[Exact application, deployment-attempt and per-file receipt](docs/evidence/2026-11-04-ark/publication-e7c60ac.json). This failure record is preserved on the work branch; no release gate or publication is claimed for this subsequent recovery checkpoint. No additional source changes or third deployment retry were made.

## Changed implementation in this continuation

- **`game24/` — Ark: The Waterline Commission:** individually designed Genesis 6–9 cargo/buoyancy game, original timber/cargo/pier/water geometry, six real cargo stations, sealed ballast tanks, numerical stability trials, failure/retry, pause, 10,000 physical configurations and saved progression. Keyboard, mouse and touch controls share the real engine. Equivalent command play remains available when WebGL is unavailable.
- **`game3/app.js`, `game11/app.js`, `game23/app.js`:** durable-progress feedback validates the stored campaign record. A successful bench save cannot hide a failed or silently rejected campaign save. Four regressions failed on the preceding source and pass with the correction.
- **`tests/browser/ark.spec.js`, accessibility checks and workflow:** actual 4K buffer, controls, keyboard bounds, invalid launch, loss/retry/rebalance, 100% completion, save/reload, graphics failure and 320px/390px layouts. Nine axe audits run without excluded WCAG 2.1 A/AA rules.
- **Football browser test:** keeps real kickoff/shot input and full-match/substitution assertions. The early HUD wait accommodates an observed delayed software frame. The substitution check proves the exact #11→#12 request, applied count, outgoing-player absence and either active #12 or an explicit lawful dismissal record.
- **Catalog, rights, game template and evidence:** the new title has its own metadata and original asset inventory; actual rendering evidence and honest acceptance limits are retained. The public verifier derives runtime paths from the catalog's 3D entries.

## Verified release gate

| Evidence | Observed result |
|---|---|
| Exact tested source | `b3844bff8775b509ddda6f9002726bf4ec1dc89b` |
| CI | [41887296841](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41887296841), **success**, completed 2026-11-04T18:34:24Z |
| JavaScript / numerical checks | **153 passed**, zero failed/skipped; includes seven ark tests and complete numerical launch trials for all 10,000 ark configurations |
| AI API checks | **52 passed**, one existing Starlette/httpx deprecation warning; transport doubles are tests, not live AI output |
| Browser checks | **27 passed**, zero failed/skipped/flaky: 9 accessibility, 3 isolated gateway/fallback and 15 gameplay/reflow checks |
| Ark 4K | Actual **3840 × 2160 WebGL2**, zero GL error; original scene inspected; Chromium/Ubuntu 24.04/SwiftShader |
| Ark play | Six cargo placements and ballast controls, paused/resumed launch, **100% completion**, voyage 2 unlock and reload; keyboard-only unbalanced loss, retained-plan retry, rebalance and win |
| Football play | Inspected **2–0** full-time result, one #11→#12 replacement and level 2 unlocked; #12 remained active with a yellow card in this run |
| Clean build | Local and CI matched **138 runtime files**, SHA-256 `6ff28afbe0015550c853cedc9c87e5e73bc0e16f83d99ca0e2bfd6e4b522dc1e` |
| Release integrity | Unique catalog entries, local links, exact official-logo blob, pinned policy and JavaScript syntax passed |

[Immutable gate/build/frame receipt](docs/evidence/2026-11-04-ark/verification-b3844bf.json). [Chapter evidence and original captures](docs/evidence/2026-11-04-ark/README.md). The workflow records exact commands for the repository's declared Node/Python checks, build and affected browser flows. Automated coverage is not 10,000 manual playtests, hardware performance certification or complete accessibility conformance.

## Failure correction and recoverability

- `05a4704` failed the new bay buttons' accessible-name audit. Removing redundant names made visible and accessible labels agree; later audits passed.
- Source review corrected vertical arrow movement at the grid's top/bottom boundaries and aligned scene deck/cargo heights with the physical configuration.
- `d3797b95d20c3ef22e925a83d718e944bb765b74` passed 153/52/27 checks in [CI 41883610973](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41883610973). Visual review found successful trials displaying 99% because of rounding; the display and two browser assertions were corrected in `f5378f5`.
- `f5378f561bb7a8ef9c3a725d7ef6425f371c4234`, verified remotely **2026-11-04T18:14:03Z**, passed every ark check and 26/27 browser checks. Its football failure snapshot showed a legal later dismissal of #12. The corrected assertion preserves identity, applied-substitution and roster checks. The failed run is retained in [its receipt](docs/evidence/2026-11-04-ark/verification-f5378f5.json); it was not published.
- **`b3844bff8775b509ddda6f9002726bf4ec1dc89b`** was verified on `work/genesis-ark-2026-11-04` at **2026-11-04T18:27:26Z**, passed CI, then fast-forwarded to main without a force push. Later documentation checkpoints must record their own observed outcomes, not inherit unperformed checks.
- Previous recovery/timing exceptions and historical results remain in the [earlier status snapshot](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/blob/b3844bff8775b509ddda6f9002726bf4ec1dc89b/PROJECT_STATUS.md) and [second-wave evidence](docs/evidence/2026-11-04-wave2/README.md). A policy declaration does not prove unexercised recovery scenarios.

- Documentation/evidence checkpoint **`463e913a771a0612d9ee2c1c8f60c56880575149`** was read back at **2026-11-04T18:39:37Z**. This exceeded the five-minute interval after the documentation change was first observed at 18:34:01Z; the missed interval is recorded, not treated as compliant. The tested gameplay source and earlier evidence remained recoverable in verified commits.

## Remaining dependencies and acceptance work

- **Full catalog and Bible scope:** 18 legacy 2D titles still need individual redesign; 2,000 individually designed production games and the complete Genesis–Revelation story remain unfinished. Levels and renamed templates never count as titles.
- **Live AI competition:** a separately hosted API, server-side provider credentials, active model IDs and an independent judge are required. No live model request or result is claimed by offline transport tests. Adigun AI needs a real configured endpoint.
- **Native consoles:** platform-holder developer access, approved tooling/SDKs, asset rights and certification are required. Browser titles and the separate Node2D Godot suite are not native PlayStation releases; PS6/PS8 availability is not assumed.
- **Production qualification:** hardware GPU/frame-time and initial-load measurements, physical touch testing, complete screen-reader play, voice-device checks and full English/German/Yoruba/Nigerian Pidgin localization remain open. The 3,000 ms initial-load figure is a target, not a measurement. Football retains documented rule/art limitations.
- **Standards:** HB-AI-ENGINEERING-001 v2.0 remains pinned to `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`; design tokens to `52f01f9986d97088413ca9785bc7a2d3f2967123`. Corporate/trading pins, official artwork, five-division inheritance and financial-data rules remain in [docs/STANDARDS.md](docs/STANDARDS.md). Original/source rights are recorded in [ASSETS.md](ASSETS.md).

## Next bounded action

Resolve/retry GitHub Pages publication for the already tested main revision, verify the 11 changed public files, and reconcile this work-branch failure record before continuing the next individual title/Bible chapter. Two deployment timeouts are recorded; further retries must be bounded and evidence-led. Final documentation publication and the whole 2,000-game program have no defensible completion ETA.
