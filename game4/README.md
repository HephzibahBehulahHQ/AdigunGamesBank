# Volt Dodge — The Recovery Floor

## Integration evidence — 4 November 2026

The implementation at **`10e3b16af8c314379e540da65b8aa7da0f536775`** passed this game’s actual **3840 × 2160 WebGL2** drawing-buffer check (zero GL error), real-control completion, saved progression and fallback scenarios in [CI 41926291553](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). The integration owner inspected the original captured scene. [Immutable measured/frame receipt](../docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

The whole run passed **269 JavaScript, 52 API and 67/69 browser checks**. Its only failures were advanced narrow-screen layouts in Circuit Rush and Binary Flash; those styles are now corrected and await the final exact-candidate gate. This is development rendering evidence, with hardware performance, physical devices, complete assistive-technology play and production qualification still open. Current release/publication state belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).


## Identity and playable scope

| Field | Record |
| --- | --- |
| Title and stable ID | **Volt Dodge**, `volt-dodge`; existing `/game4/` route |
| Genre | Original 3D arena arcade game with ground-plane movement, moving spark collisions, core collection, route planning and extraction |
| Corporate owner / division | Hephzibah Behulah / Elektroniker |
| Platform | Browser, keyboard, mouse and touch commands. No native-console build or gamepad mapping is claimed. |
| Source | `campaign.js`, `engine.js`, `map.js`, `app.js`, `scene.js`, `index.html`, `style.css` |
| Status | **In progress:** playable implementation and complete campaign engine validation. Browser, rendering and production acceptance remain subject to the exact revision's evidence in [PROJECT_STATUS.md](../PROJECT_STATUS.md). |
| Blocking dependency | No implementation access blocker. Development browser/4K evidence is above; final release and deployment verification remain pending. |

Drive the recovery rover through the factory lanes, recover **every energy core**,
then physically enter the extraction gate before the timer or shields run out.
A spark hit costs one shield. Brief recovery immunity prevents one contact from
consuming every shield in one frame, but remaining inside a spark eventually
ends the mission. Walls block movement; neither collecting the last core alone
nor visiting the exit while it is locked awards a win. Standing still cannot
finish a sector. Retry restores the initial position, shields, time and cores.

The meaningful decisions are route order, clear lanes versus risky shortcuts,
and steering around moving hazards while managing a finite deadline. This
arcade title has no component-fitting or electrical calculation task. It is
distinct from Circuit Rush's construction board, Capacitor Charge's transient
experiment and Fuse Box's DC distribution commissioning. **Sparks, energy cores
and shields are fictional gameplay mechanics; this is not electrical-safety
instruction or a simulation of real human exposure.**

### First sector reference playthrough

The first sector is deliberately authored as an introduction. Coordinates are
zero-based columns and rows. East increases column; south increases row.

| Item | Reference |
| --- | --- |
| Start / exit | Start `(1, 1)`; exit `(1, 7)` |
| Required cores | A `(4, 1)`, B `(7, 4)`, C `(4, 7)` |
| Mission resources | 25 seconds; 3 shields; rover speed 2.5 grid units/s |
| Complete safe command route | East 6, south 6, west 6 |
| Actual engine result | All 3 cores; all 3 shields; win at **7.028 simulated seconds** |
| Why the win occurs before the final cell center | The exit uses a 0.20-unit trigger radius plus the 0.23-unit rover radius; contact at `(1.43, 7)` is sufficient. |
| Real failure route | East 1, south 1, then wait in the stationary spark. Shields deplete at 2.32 seconds. |

The safe route above is a walkthrough for this introductory sector, not a hidden
completion shortcut. Every move still enters the normal movement and collision
engine. Later sectors have different layouts, target positions and hazards.

## Rendering and level structure

| Requirement | Implementation and evidence |
| --- | --- |
| Actual 3D | Locally vendored Three.js via [shared/three-stage.js](../shared/three-stage.js). Original procedural meshes include an industrial floor, solid maze walls, a wheeled recovery rover, floating octahedral cores, moving spark orbs/halos, patrol tracks and a locked/open exit arch. Perspective and top cameras share the same world coordinates. **A rendered frame still requires the integration browser receipt.** |
| Actual 4K | The selector requests 3840 × 2160 through the shared WebGL renderer. The browser test reads `drawingBufferWidth`, `drawingBufferHeight` and `gl.getError()` and captures a frame. The selector or source code alone does not verify 4K; **the executed buffer/frame evidence is recorded above**. |
| Performance | Instanced floor and wall meshes reduce draw calls; the 3D module loads only for this game. Rendering is demand driven while ready/paused or using step commands. No hardware frame-time distribution is recorded yet. |
| Level structure | **10,000 deterministic sectors**, from Beginner to Professional Master, generated by `levelConfig(level)` with version 1 rules and seeded randomness. First sector authored; the remaining 9,999 generated. |
| Meaningful variety | Normalized signatures include wall geometry, start/exit, core positions, complete spark patrol endpoints/speed/phase, rover speed, shields and deadline. All 10,000 physical signatures are unique, excluding labels and level counters. |
| Reachability | Generator preserves a connected clear route. A separate test reconstructs paths from the final wall geometry and full spark patrol envelopes, chooses core order by subset dynamic programming, then drives the **actual movement/collision engine** to completion in every sector without damage. The validator does not consume generator witness cells or a supplied solution. |
| Difficulty | More cores, larger arenas, more spark alcoves, faster moving patrols, tighter route-time margins and fewer shields. See the tier table. |
| Save and resume | Sequential cleared-sector progression uses `adigun.campaign.v1.volt-dodge`, schema `{version:1, completed, unlocked}`. Unlocking sector 10,000 and clearing it are separate states. Invalid storage falls back safely; storage denial retains session progression and is disclosed by read-back validation. Partial missions restart from their initial state. |

| Level range | Tier | Arena | Cores | Generated spark tracks | Shields | Rover speed | Clear-route deadline multiplier |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1–2,000 | Beginner | 9 × 9 | 3 | 2, except 3 in the authored first sector | 3 | 2.50 units/s | 2.20 |
| 2,001–4,000 | Apprentice | 9 × 9 | 4 | 3 | 3 | 2.58 units/s | 2.00 |
| 4,001–6,000 | Skilled | 11 × 11 | 5 | 4 | 3 | 2.66 units/s | 1.80 |
| 6,001–8,000 | Expert | 11 × 11 | 6 | 5 | 2 | 2.74 units/s | 1.60 |
| 8,001–10,000 | Professional Master | 13 × 13 | 7 | 6 | 2 | 2.82 units/s | 1.45 |

Generated deadlines are `max(20, ceil(clearRouteLength / speed × multiplier + 6))`
seconds. Sector 1 has an authored 25-second deadline. Patrol speed, where the
track has nonzero length, is sampled from `0.6 + 0.13 × tierIndex + [0, 0.35)`
units/s; zero-length junction hazards remain stationary. Route validation proves
completion under those deadlines; it does not establish a calibrated human
skill curve or substitute for 10,000 human playtests.

## Movement and collision model

All distances and time are **arcade grid units and simulated seconds**. There
are no volts, amperes, shock thresholds or real electrical safety limits in this
model. The original rules are defined in [engine.js](engine.js) and independently
exercised in [tests/volt-dodge.test.js](../tests/volt-dodge.test.js).

- The rover has ground-plane radius 0.23. A wall occupies a unit square. Swept
  segment versus expanded-box tests stop movement at walls and allow tangential
  sliding. Square expanded corners are intentionally conservative, so the rover
  cannot squeeze diagonally through a blocked corner.
- Sparks have radius 0.22 and move linearly along their configured track,
  reversing at each endpoint. Relative swept-circle collision checks the space
  traversed by **both** rover and spark, including a crossing where neither
  endpoint overlaps. Intervals split at every patrol reversal.
- Pickup radius is 0.18 and exit radius is 0.20, both added to the rover's radius.
  Pickup, spark and exit events are processed in actual contact-time order.
  Simultaneous ties resolve spark, core, then exit. Returning through an exit
  that was crossed before the final pickup is required.
- Diagonal steering is normalized, preventing a diagonal speed bonus. A valid
  engine update advances at most one second, split into intervals no longer than
  0.05 s and additionally at reversals and recovery expiry. An engine caller's
  excess interval is discarded rather than teleporting. The animation loop caps
  frame advancement at 0.1 s, so a severely stalled browser can run slower than
  wall-clock time. This is a local arcade simulation, not a competitive timer.
- A shield hit gives 0.85 s of recovery. Pausing freezes rover, patrols and the
  mission deadline. Hidden tabs automatically pause. A terminal win/loss stops
  at its actual contact/deadline time, not the end of a large update.

## Controls and accessibility

| Input / requirement | Implementation / remaining evidence |
| --- | --- |
| Keyboard | Focus the arena; WASD/arrows steer. Space pauses/resumes; R retries. All mission, camera, graphics and directional controls are native labelled elements reachable by Tab. Enter/Space activates native buttons. |
| Continuous mouse/touch | Hold a directional button to steer; pointer capture keeps the hold attached to that button. A short tap nudges. Pause and retry remain visible. Touch buttons are at least 52 px tall. |
| Step play | Select **Step controls** before the mission or while paused. A direction advances one unit of attempted travel using the same wall/spark/collection engine and consumes `1 / speed` simulated seconds; Wait consumes 0.5 s. Time freezes between commands. A blocked move may travel only to a wall. This removes a timing-input barrier without removing objectives, collisions, resources or failure. |
| Graphics failure | WebGL failure selects step controls, opens the labelled coordinate map and disables unsupported graphics/camera options. Context loss pauses an active mission. The entire sector remains playable through the same DOM controls. Reload is the graphics retry path. |
| Equivalent state | Core list with coordinates, open/locked exit, shields, remaining time, exact rover coordinates, neighbouring wall directions, complete labelled table map and exact spark positions. Command results use a polite live status. Visual map icons also have text equivalents. |
| Focus and contrast | Shared corporate focus styles plus explicitly styled control/error/success states. Authored browser test checks visible focus and axe WCAG 2.1 A/AA results. **Automated browser checks passed as recorded above; full manual screen-reader verification remains open.** |
| Reduced motion | Stops decorative core bobbing, orbit rotation and shield pulse. Actual rover/spark displacement still communicates gameplay; step mode supplies a noncontinuous alternative. **Executed browser evidence is recorded above.** |
| Responsive | One-column mobile flow, large directional buttons, wrapping toolbars and fluid map. Tests target 390 × 844 and 320 × 844 CSS pixels. **Introductory 390/320px reflow passed as recorded above.** |
| Languages | English implemented. Full German, Yoruba and Nigerian Pidgin coverage/review not implemented. |
| Other platforms | Hardware touch devices, gamepad and native consoles not verified. |

Control preference is stored under `adigun.volt-dodge.controls.v1`. No account,
network gameplay service or personal data is required. Cleared campaign data
and preferences remain local to the browser. Failed writes never display a
confirmed persistent-save claim.

## Loading, performance and asset rights

**Target, not measured:** first usable controls within 3,000 ms, cold cache, a
midrange laptop on a 10 Mbit/s downlink with 100 ms round-trip latency. Real
hardware, browser version, download sizes, frame times and 4K GPU behaviour
must be recorded during release validation. The initial HTML/engine and command
controls do not wait on WebGL rendering; `scene.js` imports the locally bundled
Three.js code on this route only. The fallback stays playable if renderer
initialization fails.

| Asset / dependency | Source / author | Rights / attribution | Verification |
| --- | --- | --- | --- |
| Arena, rover, gates, cores, spark meshes, labels and tracks | Original procedural work for this repository; authored in `scene.js` | No downloaded models/textures or third-party character likenesses | Source inspectable; all geometry generated locally |
| Corporate identity image | Existing `assets/corporate/hephzibah-behulah-official.jpg`, supplied by the project | Existing authorized project identity; image preserved unchanged | No new logo or copied brand asset introduced |
| Three.js | Existing local `vendor/three/three.module.js` | MIT; retained [vendor license](../vendor/three/LICENSE) | Dependency remains locally bundled; no CDN runtime dependency |
| Typography | Browser system fonts | No bundled web font or license import | CSS source |
| Audio | None | Not applicable | No audio requests |
| Shared tokens and UI | Existing `shared/game.css`, corporate tokens and `shared/three-stage.js` | Existing repository assets | Reused without shared-file changes |

## Testing and deployment evidence

The engine and browser tests are deliberately separated. The first column below
reports completed local checks; authored browser checks were subsequently executed as recorded above; hardware checks remain **NOT TESTED**
until the integration owner records their actual execution and inspected frames.

| Evidence | Command / procedure | Candidate / outcome |
| --- | --- | --- |
| Unit and campaign validity | `node --test tests/volt-dodge.test.js` | Owned working tree, 2026-11-04; **13/13 passed**, approximately 13 s. All 10,000 unique sectors completed through independently derived engine routes with full shields. Exact integration SHA belongs in the current status. |
| Collision regression | Same suite | Swept wall and relative spark crossing, fast mid-frame reversal, ordered pickup/exit events, diagonal speed, finite resources, idle timeout, pause, retry, fine/coarse timing, terminal guards and unique highest-tier map symbols passed. |
| Save boundary | Same suite | Sequential progression, corrupted storage, storage exceptions, stale replay rejection and explicit sector 10,000 completion passed. |
| Browser flow and 4K | `npx playwright test --config=playwright.config.js tests/browser/volt-dodge.spec.js` | **Passed in integration CI as recorded above.** Four authored tests read real GL dimensions, exercise continuous WASD/pause, visit a locked exit, complete the actual 18-command introductory route, confirm saved reload, recover after shield depletion, and verify storage rejection. No movement/mission state is injected. |
| Keyboard, map and mobile audit | Same browser suite | **Passed in integration CI as recorded above.** WebGL rejection is an explicit fixture; real labelled controls still drive the real engine. Focus, reduced-motion setting, axe and 390/320 reflow checks authored. |
| Performance and initial load | Target above | **NOT MEASURED**; no frame-time or cold-load pass claimed. |
| Asset review | Owned source inspection | Original procedural meshes and existing corporate assets only; retained local dependency license. Hardware and final rendering inspection remain separate. |
| GitHub Pages path | Existing `/AdigunGamesBank/game4/` | This converted candidate is **NOT VERIFIED in production** by this record. See the current deployment receipt. |

Tests are in [the engine suite](../tests/volt-dodge.test.js) and
[the browser suite](../tests/browser/volt-dodge.spec.js). The browser tests mock
only WebGL unavailability or storage failure in the corresponding negative
cases. They do not substitute a mock rover, auto-win timer, seeded completion
save or modified engine state for actual play.

## Adopted standards and acceptance

- Policy: **HB-AI-ENGINEERING-001 · v2.0**, pinned commit
  `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`.
- Design system: pinned commit `52f01f9986d97088413ca9785bc7a2d3f2967123`.
- Visual references: [docs/STANDARDS.md](../docs/STANDARDS.md) and existing
  corporate tokens. Midnight foundation `#0B1220`, off-white text, gold core
  accent and Elektroniker cyan; shared panels, spacing and focus components.
- Model references: original fictional arcade rules in `campaign.js` and
  `engine.js`, with independent geometric/reachability tests. Electrical-domain
  sources are inapplicable because no real electrical process is simulated.
- Acceptance: **In progress** until the actual release candidate passes the
  applicable browser, 4K/frame, accessibility and deployment gates. Automated
  solvability does not claim 10,000 manually reviewed levels, full multilingual
  support or native-console release.
- Canonical project progress and revision receipts:
  [PROJECT_STATUS.md](../PROJECT_STATUS.md). This per-game record does not imply
  completion of the 2,000-game project target.
