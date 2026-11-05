# Neon Pulse — signal commissioning

## Published milestone — 5 November 2026 (Europe/Berlin)

Source **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** passed the complete repository gate: **269 JavaScript, 52 API and 69 browser checks** in [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881). This game’s actual **3840 × 2160 WebGL 2** buffer, genuine-control completion, save/reload and fallback scenarios passed. [Successful exact-source receipt](../docs/evidence/2026-11-04-nine-games/verification-5547a53.json).

The release completed [Pages publication](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41936442011); **115/115 selected public files matched exactly**, including this game’s entry and JavaScript/CSS. [Public-source receipt](../docs/evidence/2026-11-04-nine-games/deployment-5547a53.json). Original inspected scene frames retain their earlier 10e3b16 provenance in the [evidence index](../docs/evidence/2026-11-04-nine-games/README.md).

Hardware performance, physical devices, complete assistive-technology play, language coverage and production qualification remain open. Current acceptance belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Identity and scope

- **ID / route:** `game1`, `/game1/`. **Genre:** signal-routing logic puzzle.
- **Owner:** Hephzibah Behulah, Elektroniker. **Platform:** web browser.
- **Status:** In progress. The runtime is implemented; executed development browser/4K evidence is above; the corrected release gate passed; current publication is recorded in PROJECT_STATUS.md.
- **Distinct mechanics:** an abstract LED matrix has three logical states. Pulsing one LED advances it and its orthogonal neighbours modulo three. Match a separate target pattern within a finite pulse budget. The board has explicit win/loss, undo, pause, restart and sequential unlock states. It has no timer or reaction requirement.

This replaces the legacy RGB-slider challenge, not a separate title. It does not model real voltages, AC phases or a physical installation.

## Rendering and campaign

Actual Three.js WebGL 2 scene: original layered matrix enclosure, circuit traces, LED cylinders, target rings, fixings and selection ring. The scene is lazy loaded. Adaptive, 1920 × 1080 and 3840 × 2160 drawing-buffer requests use `shared/three-stage.js`; actual dimensions are reported by the renderer. A selector is not evidence of successful 4K: see the candidate's browser receipt.

**10,000 deterministic boards**, seeded by level. Board size progresses 3 × 3 → 6 × 6, with increasingly dense initial perturbations and decreasing spare pulses: 8, 6, 4, 2, then 0. Five 2,000-level tiers span Beginner through Professional Master. Targets and starting patterns differ; each complete configuration is checked for uniqueness. A finite-field linear solver establishes a reachable solution and its pulse budget. All 10,000 boards are solved through the actual engine in Node tests. This is computational verification, not 10,000 human playtests or a proof of optimal minimum moves.

Completed boards use `adigun.campaign.v1.neon-pulse` in browser local storage. Invalid saves are rejected by the shared campaign validator; unavailable or silently rejected storage is reported as session-only. A reload starts the current unlocked board, not a partially edited matrix. No player data is transmitted.

## Controls and accessibility

- Mouse/touch: activate any labelled signal button or its 3D LED; command buttons provide undo, hint, pause, restart and next board.
- Keyboard: Tab reaches every control. In the scene, arrow keys select within bounds, Enter pulses, Space pauses and U undoes. Signal buttons support directional navigation and native Enter/Space activation.
- Signal names, numbers and current/target text provide equivalents to colour. Live status announces results. No flashing or continuous decorative motion. Visible focus and skip navigation are included.
- WebGL failure: the same game engine and all signal buttons remain available. No 3D claim is made for that fallback.
- Responsive and WCAG 2.1 A/AA automated checks: included in the release workflow; results are recorded in the project receipt. Full screen-reader play and physical touch devices remain untested. Language: English; complete German/Yoruba/Nigerian Pidgin coverage remains open.

## Asset rights and performance

All scene geometry and game text are original work for this repository. The official corporate image is the unchanged inherited asset recorded in `ASSETS.md`. Three.js is vendored with its MIT license. No external fonts, textures, club/player likenesses or recorded audio are used.

Corporate navy `#0B1220`, royal blue `#2563EB`, gold `#D4AF37`, ivory `#F8FAFC` and Elektroniker cyan `#22D3EE` are inherited through the shared styles. First-playable target: 3,000 ms on a midrange desktop with cold cache and broadband. **Not measured or certified.** Rendering is event driven; hardware FPS, GPU compatibility and physical 4K displays remain untested.

## Verification and delivery

- Engine: `node --test tests/neon.test.js` (neighbour bounds, invalid input, full first-board win, locked terminal states, pause/undo/loss and all 10,000 unique reachable configurations).
- Browser: `npm run test:browser -- tests/browser/neon.spec.js` (actual WebGL 2 drawing buffer, captured frame, control-only win/reload, loss/retry, locked levels, graphics/storage fallback and narrow layout).
- Accessibility: `tests/browser/accessibility.spec.js` includes this route with no rule exclusions.
- Integration, candidate SHA, screenshots, exact commands, dates and public-byte receipt: see `PROJECT_STATUS.md` and its evidence links. A WIP checkpoint is not a production acceptance.
- Existing Pages route: `/AdigunGamesBank/game1/`; public host remains the existing custom domain. This rewritten route is not claimed deployed until exact-source verification succeeds.

Policy: **HB-AI-ENGINEERING-001 v2.0**, `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`. Design system: `52f01f9986d97088413ca9785bc7a2d3f2967123`.
