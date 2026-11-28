# Adigun Game Bank — current project status

Updated **2026-11-28 (Europe/Berlin)**. This is the current acceptance record.

## Single-viewport games

PR [#10](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/pull/10)
updates all 24 game routes. The 17 gameplay canvases fill the viewport.
Controls and menus sit in floating layers, with pointer-transparent stage
readouts. The seven console-based games have fixed navigation and a bounded
play area. Charts keep their role as instruments. The shared layout requirement
is now in `AGENTS.md` and `docs/GAME_TEMPLATE.md`.

- Windows Chrome passed the full 100-case Playwright suite on checkpoint
  `066eddcbd71f66f9939fc5601400a46879047b26`. The next candidate
  `cff2c3a698fec331db3e050ba4ab74a1cf281f6f` passed 47 focused Playwright cases
  including one case per title at 1440×900, 390×844 and 844×390, 320px reflow,
  accessible controls and last-stage menu toggling. An account-enabled local
  build with the account Worker and loopback fixture bindings passed touch
  emulation on each of the 24 titles. Phone screenshots exposed play controls
  below the fold in games 12 and 14. Both now have a first-screen answer-control
  regression case. The final candidate `04455165f8bf7fd41f65746a4b6daeb2bebc918a`
  passed [PR verification](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/46168828465)
  and local Chrome touch emulation on every route in the production-mode build.
- The custom domain returned build revision
  `c430a25c06a37bd293ba7cc3cd2e5e9b2ea3baa3` before this change. The manual
  Cloudflare workflow file was present on `main` but absent from GitHub's
  Actions registry. The candidate adds automatic publication from a successful
  `Verify games` run for the exact current `main` SHA, under the existing
  `cloudflare-production` environment.
- Main revision `8a1dcb465ec3356f08b56f6303dd4a9e9ae951d7` exactly matches the
  tested source tree. [Main verification](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/46169905929)
  and [Cloudflare publication](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/46170952900)
  passed on 2026-11-28 (Europe/Berlin). All 24 public game routes and the shared
  viewport stylesheet returned HTTP 200, matched their production manifest
  SHA-256 values, and matched the tested Windows build after normalizing line
  endings. The live build fingerprint is
  `3dc5cd09cb596b92297eb7252df62b5e1491d02f9a2baf61f79b19f1366abb84`.
  Physical touch and screen-reader sessions are **NOT TESTED**.

## Floating Adigun BOT window — verified candidate

PR [#9](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/pull/9) extends the existing floating Adigun BOT with drag/resize, minimize/maximize/restore/close controls, viewport clamping, local geometry persistence, keyboard resizing and four-language control names while keeping game workspaces clickable. The resize and reload-persistence browser checks pass in CI run [45688099865](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/45688099865) on candidate `867668689f90346de25b45c887bd508d43ad3fd7`; product canvas/game code was not changed. Local browser execution remains unavailable. The PR is not yet merged or deployed. Its first attempt to update the branch after CI exposed a merge conflict in this status document because `main` advanced; reconcile against current `main`, rerun the exact-candidate gate, then integrate.


## Product-aware OTP origin context — 25 November 2026

On `work/gamesbank-adigun-bot`, the product account Worker now passes its already-validated product origin to Supabase as `redirect_to`; the account-worker test asserts the exact origin. Focused test result: **2 passed, 0 failed**. This gives a configured Send Email Hook enough product context to select a GamesBank-specific OTP email, but does **not** change the email's displayed product name by itself. The shared Supabase projects still have no configured Send Email Hook/provider credential, and no such email behavior or Worker deployment is claimed live. The existing `.wrangler/` and `supabase/.temp/` generated directories remain untouched and excluded.

## Corporate template — floating Adigun BOT checkpoint

On scoped branch `work/gamesbank-adigun-bot`, commit **`b87b5cb31eec2629f059215a7ebfdb57a73ca420`** (pushed and read back from `origin/work/gamesbank-adigun-bot`), added a floating, product-aware Adigun BOT to all **25 generated HTML pages**. It routes same-origin requests through a Cloudflare Worker AI binding, constrains request size, roles and rate, never submits game/account/save data, and fails closed without the configured AI and limiter bindings. The bot UI provides EN, Deutsch, Yoruba and Nigerian Pidgin controls; this does not certify the entire product is translated.

- Local `npm test`: **277 passed, 1 skipped, 0 failed**. `npm run check` passed. `npm run build` generated 195 files; a static check found the bot assets on all 25 HTML pages. `git diff --check` passed.
- GitHub Actions run [45688099865](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/45688099865) passed on exact candidate `867668689f90346de25b45c887bd508d43ad3fd7` at 2026-11-25 19:55:24Z; its complete `verify` job, including rendered gameplay/browser flows, completed successfully. The Playwright browser suite remains **NOT TESTED locally** because this checkout has no installed Playwright dependencies. This verifies the CI candidate, not production behavior.
- No production deploy or live model request was made. Runtime AI and rate limits still require Cloudflare configuration/deployment. The available Cloudflare Workers AI free allowance is account/plan dependent; confirm current account allocation before production use. No external paid service was enabled here.
- Pre-existing untracked `.wrangler/` and `supabase/.temp/` directories were left untouched.

## Goal Line conversion

Goal Line (game9) is integrated on main at `292d658ea79a21968fdc5668116e43abedaf4486`. The original 3D clearance drill uses timed interception, directional clearance and a saved 10,000-drill campaign. The catalog now contains fifteen local 3D implementations, one API-dependent 3D client and eight legacy 2D titles in source. Historical publication counts below describe the previous release.

- [Exact gameplay candidate CI](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44919603061) passed on 2026-11-21 at 16:44 Europe/Berlin: 271 JavaScript, 52 API and 72 browser checks (19 accessibility/reflow, 16 contract/fallback and 37 rendered gameplay). The local static build and release integrity checks passed. The engine solver completed every distinct drill through public commands.
- Chromium/SwiftShader reported a 3840 × 2160 WebGL 2 drawing buffer with GL error 0. Keyboard completion, retry, reload and graphics fallback passed. The 320px screenshot and the frame rendered with 4K mode selected were inspected from [artifact 14713497349](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44919603061/artifacts/14713497349). Hardware frame time, physical touch and screen-reader sessions remain unverified.
- The scoped engine checkpoint `c81a00463dab6530723f2e43d1a5c9f3b0ba19e6` and playable checkpoint `292d658ea79a21968fdc5668116e43abedaf4486` were read back from GitHub. Main was fast-forwarded to the exact playable candidate and read back on 2026-11-21.
- Publication verification is pending. A post-integration public fetch still showed the old entry page and no new script. Keep the previous production receipt until the expected Pages deployment and byte comparison succeed.

## Acceptance

**In progress.** The target of **2,000 individually designed games, each with 10,000 meaningful levels**, is not delivered. This **published development milestone** converts **nine existing titles** to distinct playable 3D games. The catalog contains **24 titles: fourteen local 3D games, one API-dependent 3D client and nine legacy 2D games**. These are implementation counts, not full production qualification. Procedural levels, renamed templates and reskins are not separate games.

Full Genesis–Revelation coverage, production art/device qualification, complete EN/DE/Yoruba/Nigerian Pidgin localization and native-console releases remain unfinished. Live provider competition still requires its server-side deployment and configuration.

## Source and public state

| State | Verified revision / evidence |
| --- | --- |
| Scoped integration branch | `work/finish-games-2026-11-04` |
| Recorded gameplay release | **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** |
| Exact-candidate release gate | [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881) **SUCCESS**, completed **2026-11-04T23:46:49Z** |
| Main gameplay integration | Normal fast-forward from `09385bd8105e235f90493390fccbbe133083bd72` to `5547a5362bfb2edbddf3f922a918e05c14de6b18`, exact head read back **2026-11-04T23:47:14Z** |
| Pages publication | [Run 41936442011](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41936442011) **SUCCESS**, completed **2026-11-04T23:47:55Z**, deploy job 126946057508 |
| Public source comparison | **115/115 selected public files exactly match**, all HTTP 200, completed **2026-11-04T23:51:27Z**. [Full receipt](docs/evidence/2026-11-04-nine-games/deployment-5547a53.json) |
| Public URL | <https://hephzibahbehulahhq.github.io/AdigunGamesBank/>, confirmed redirect to **<https://adigungamesbank.hephzibahbehulah.com/>** |
| Public control/save smoke | Binary Flash completed both frames in 9 operations with 0 rejections; reload opened Mission 2. [Record](docs/evidence/2026-11-04-nine-games/verification-5547a53.json) |
| Previous public source | `b3844bff8775b509ddda6f9002726bf4ec1dc89b`; [preserved 67-file receipt](docs/evidence/2026-11-04-ark/deployment-b3844bf.json) |
| This record update | Documents the already observed release above. Its own later commit/checks do not retroactively replace that immutable release source. |

The nine converted games are **published**. The live catalog contains fourteen local 3D games, one API-dependent 3D client and nine legacy 2D titles. The original 2,000-title and broader production requirements remain **In progress**.

### Earlier publishing failures and observed recovery

The earlier 09385bd attempt built/uploaded successfully, stayed at `updating_pages`, timed out at 23:22:16Z and canceled at 23:22:17Z. Its 115-file public check had 54 mismatches; all 73 fetched paths existing in the preceding release matched b3844bf. [Failed publishing receipt](docs/evidence/2026-11-04-nine-games/publication-09385bd.json) · [Failed exact-byte comparison](docs/evidence/2026-11-04-nine-games/deployment-09385bd.json). The earlier e7c60ac documentation attempt also timed out twice. [Prior receipt](docs/evidence/2026-11-04-ark/publication-e7c60ac.json).

The later 5547a53 source published successfully through the **same host and configuration**, with reported success at 23:47:52Z and independently matched public bytes afterward. No DNS, permission, action-version or hosting change was made; no causal configuration fix is claimed. GitHub’s internal reason for the earlier stall remains unconfirmed. [Successful publication receipt](docs/evidence/2026-11-04-nine-games/publication-5547a53.json).

## Nine individual conversions

| Existing title | Playable work and numerical coverage |
| --- | --- |
| **Neon Pulse — game1** | Original 3D LED matrix; coupled three-state pulses, finite budget, target patterns, undo/hints, pause, failure/retry and saves. All **10,000 distinct boards** solved through the actual engine within budget. |
| **Circuit Rush — game2** | Original 3D conductor board; reciprocal terminals, source/loads/return, open circuits, shorts, unwanted branches and current overloads with a finite rotation budget. All **10,000 distinct topologies** solved through public commands. |
| **Volt Dodge — game4** | Original 3D rover/maze; moving sparks and swept collisions, finite time/shields, all-core collection and extraction. Independent route search completed all **10,000 distinct sectors** through the movement engine. |
| **Resistor Match — game5** | Concealed 3D component trays; exact four-band resistance/tolerance reading, persistent comparisons and finite-budget memory play. All **10,000 unique decks** completed. Keyboard navigation skips disabled trays and preserves actual focus. |
| **Capacitor Charge — game6** | Original 3D RC bench; component selection, exact exponential charge/hold/discharge, leakage, current/power/energy limits and switch rules. All **10,000 procedures** completed with independent KCL checks. Ideal resistors carry exact Ω/W captions. |
| **Binary Flash — game7** | Original 3D digital bench; separate staging/latch, serial clock, logical shifts/rotations, signed/unsigned values, parity and ordered frames under finite budgets. All **10,000 distinct missions** completed through public commands. |
| **Fuse Box — game8** | Original 3D DC cabinet; load allocation, finite breaker stock/budget, cable/supply current, operating profiles, actual trips/isolation/reset and retained repair plans. All **10,000 distinct reference configurations** complete through the numerical engine. |
| **Apex Circuit — game10** | Original closed 3D track/car; steering/throttle/brake/grip, twelve ordered gates per lap, anti-shortcut state, time/recovery penalties, step driving and saves. **10,000 distinct configurations** geometrically checked; **12 representative full races**, not 10,000 full-race playtests. |
| **Penalty Pro — game17** | Original 3D training ground; five physical shots then five player-controlled keeper dives, gravity/wind, frame/keeper collisions, explicit win/draw/loss and saves. All **10,000 campaigns** complete through **50,000 shots and 50,000 saves**. |

Every conversion includes its own game guide, assumptions, asset-rights record, numerical tests, genuine-control browser tests and equivalent commands without WebGL. Existing assets needed by other routes remain intact, including `game17/style.css` for games18–21. The official corporate artwork is unchanged. Simultaneous racing touches no longer release a held throttle after focus changes.

## Exact verification

Source **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** passed [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881), job **126940186721**, artifact **13374585946**. [Structured receipt](docs/evidence/2026-11-04-nine-games/verification-5547a53.json) · [Evidence index](docs/evidence/2026-11-04-nine-games/README.md).

| Gate | Actual result |
| --- | --- |
| `npm run check` | Passed: 24 unique routes, local links, policy/design pins, official artwork blob and JavaScript syntax |
| `npm test` | **269/269 passed**, zero failures/skips |
| `python -m pytest platform/backend/tests -q` | **52/52 passed**, one existing Starlette/httpx warning |
| `npm run build` | Clean source; **188 runtime files**, SHA-256 **`999d7a1da3bf44e7178006ff579c21d2915da6c65e53111a8641f3dd64535f93`**; [build receipt](docs/evidence/2026-11-04-nine-games/build-5547a53.json) |
| Accessibility/reflow | **18/18 passed**, no axe rule exclusions |
| Contract/graphics fallback | **15/15 passed**, fixtures explicitly test-only |
| Rendered gameplay | **36/36 passed**: genuine controls, success/failure/retry, persistence, actual 4K and advanced mobile layouts |
| Browser total | **69/69 passed**, zero unexpected, skipped or flaky results |
| Actual 4K | All nine conversions passed **3840 × 2160 WebGL 2**, GL error 0. Nine original inspected frames from 10e3b16 remain unchanged; final 5547a53 source measurements are in the receipt above. |
| Advanced mobile corrections | Circuit Rush seven-column and Binary Flash sixteen-bit fixtures passed unchanged **390px and 320px** page-width assertions; sampled controls met 44px targets. Inspected final-correction 320px captures remain in the 09385bd receipt. |
| Public source | **115/115 selected files** returned HTTP 200 and exact SHA-256 matches to 5547a53, including the catalog, shared rendering/progression, all 24 entry pages and 3D route JS/CSS. |

CI used Ubuntu 24.04 Chromium/SwiftShader. Actual raster size and browser interaction do not establish gaming-GPU frame rate. Hardware FPS/load, physical touch/gamepad and full screen-reader play are **NOT TESTED**. The 3,000 ms load target is not a measured result.

Root manually opened the published catalog and Binary Flash. Actual staging/latch and serial/parity controls commissioned its two-frame packet in **nine operations**, with **zero rejected frames**. The save feedback appeared, and reload opened **Mission 2**. This cloud browser explicitly disables WebGL; the public smoke check establishes command flow and persistence, not rendering. Earlier manual checks covered Neon/Fuse first boards, Circuit’s 100.0 mA commissioning/reload, Volt’s full-shield extraction, resistor match/focus skip and Capacitor’s charge/hold/discharge to 0.500 V. [Earlier control record](docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

### Preserved failures and their corrections

- `8a9ff73`:197 JavaScript+52 API passed;43/44 browser passed. Penalty's exact wrapping-label locator failed; the corrected test uses the actual Graphics combobox role/name, preserving assertions/timeouts. [Receipt](docs/evidence/2026-11-04-nine-games/verification-8a9ff73.json).
- `748fb20`:251 JavaScript+52 API passed;15/16 accessibility passed. Circuit's redundant labels differed from visible spans in whitespace. Native visible names plus screen-reader terminal descriptions fixed it; no axe exclusion. [Receipt](docs/evidence/2026-11-04-nine-games/verification-748fb20.json).
- `10e3b16`: 269 JavaScript+52 API passed;67/69 browser passed, including every new 4K/control completion. Advanced Circuit/Binary page widths were 426px/519px at 390px. Shrinkable grid tracks/children and wrapped weight labels fixed both without reducing touch targets. [Measured failed-run receipt and original frames](docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).
- Earlier WIP missing-guide/accessibility failures were corrected before the passing release candidate. Failed WIP candidates were never integrated to main or deployed.

## Uploaded Pages package diagnosis

The exact failed-run artifact was inspected at **2026-11-04T23:29:03Z**: ZIP CRC passed; its single tar has **386 regular files**, 60 directories and 11,386,541 bytes of contents. No symbolic/hard links, unsafe paths, special entries, duplicate names or case collisions were found. All **386/386 packaged files match 09385bd exactly**; root index, all nine game runtimes and shared assets are present. The only omitted repository file is `.github/workflows/verify.yml`. [Complete immutable-source comparison](docs/evidence/2026-11-04-nine-games/pages-artifact-09385bd.json). No inspected package defect explains the publishing stall. Internal Pages state remains unavailable.

The diagnostic follow-up was isolated on `work/pages-diagnostics-2026-11-04`, preserving the primary gate without interruption. Its exact **5547a5362bfb2edbddf3f922a918e05c14de6b18** checkpoint was read back at 23:33:09Z, then passed its full gate and was fast-forwarded into the primary branch and main. Source 0fc4f098 also independently passed all 390 checks in CI 41933617782 at 23:36:48Z.

## Checkpoints and recovery

Primary work remains on `work/finish-games-2026-11-04`. Engineering work on `work/finish-engineering-2026-11-04` is fully merged with real merge ancestry through **`c230318855d4e227e151b9d497072122b4f34136`**, read back **22:32:05Z**. Both specialist writers are frozen.

Plain Git write authentication was unavailable. The authorized connector created identical Git trees, used expected-head checks and normal fast-forwards, read back exact remote heads, and public Git fetch reconciled identical-tree local commits while preserving unstaged work. No credentials were exposed, force pushes performed or access changed.

Verified primary checkpoints on 2026-11-04 UTC: `f9a6a982` 21:44:17, `a14c4f5` 21:46:36, `148954a` 21:50:55, `3b94403` 21:55:06, `24819e4` 22:00:05, `8a9ff73` 22:04:03, `904cdc7` 22:22:12, `748fb20` 22:24:36, `10e3b16` 22:33:21 and `09385bd` 22:54:03. Frozen periods do not require empty commits. First primary changed work began 21:41:59Z; the first checkpoint met five minutes.

Engineering receipts: `7db0840` 21:59:16, `6fb58d8` 22:04:20, `e32afcd` 22:09:28, `4019851` 22:13:13, `5a466b5` 22:19:31, `c01f283` 22:22:26, `54a9797` 22:25:56, `ba62a45` 22:29:28 and `c230318` 22:32:05. Three changed-work intervals of **5m4s, 5m8s and 6m18s missed the five-minute cadence**; they are not compliant intervals. All snapshots were exactly read back and recovered.

For `09385bd`, first correction work began **22:48:01Z** (CSS 22:48:15Z); exact remote verification at **22:54:03Z** took **6m2s**, another cadence miss. An initial unbounded parallel chunk-read transfer failed at chunk 24 before any ref mutation. Reducing transfer chunks to 8,000 characters and concurrency to 8 allowed exact binary blobs/tree/commit synchronization; all 1,474,601 original PNG bytes were recovered. Recovery stayed below ten minutes. Future preparation targets three minutes to leave transfer time. The first evidence follow-up began **23:13:21Z** and was exactly read back as **81826a4a1babfee41dfd118e70e5b081e9e765ea at 23:17:00Z**, a compliant **3m39s** interval. The next failure-receipt checkpoint **0fc4f09892639a94f1bca3f1bffee9ee777f711e** was read back at 23:25:36Z; the artifact-diagnosis checkpoint **5547a5362bfb2edbddf3f922a918e05c14de6b18** at 23:33:09Z. Both remain in the integrated history. This later successful-publication record requires its own checkpoint; a locally written receipt is not claimed as already synchronized.

Unexercised concurrent-writer/interrupted-push and other policy recovery scenarios remain **NOT TESTED**. A later evidence-only commit does not retroactively change the immutable candidate receipts above.

## Remaining acceptance and external dependencies

- **Catalog:** nine existing legacy 2D conversions remain; the broader 2,000-title target is open. Level-generator coverage does not establish separate titles or 10,000 human playtests.
- **Bible:** David and Genesis 6–9 do not complete Genesis–Revelation or the requested Moses/Samson/Abimelech coverage.
- **Live AI:** API host, server-side provider credentials, active model IDs, independent judge configuration and a real Adigun AI endpoint are required. No replay-as-live substitution or client keys.
- **Native consoles:** platform-holder developer access, approved tooling/SDKs, licensing and certification are required. Browser games and the separate Godot Node2D suite are not native PlayStation releases.
- **Production:** hardware load/frame-time measurements, physical controls, complete languages, screen-reader play and production-art qualification remain open.

Policy remains **HB-AI-ENGINEERING-001 v2.0**, `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`; design system remains `52f01f9986d97088413ca9785bc7a2d3f2967123`. [Standards](docs/STANDARDS.md), [asset rights](ASSETS.md) and [earlier release evidence](docs/evidence/2026-11-04-ark/README.md) remain in force.

## Next bounded action

The corrected GamesBank browser suite is green on candidate `867668689f90346de25b45c887bd508d43ad3fd7`. Reconcile the `PROJECT_STATUS.md` conflict against the current `main`, require a fresh full check on the synchronized PR head, then integrate and verify Pages publication. Continue the remaining product-template audit after this checkpoint. Live-AI and native-console dependencies remain explicit; full-project finish time is **unknown**, ETA **pending**.
