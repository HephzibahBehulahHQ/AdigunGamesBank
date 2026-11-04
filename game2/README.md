# CIRCUIT RUSH — design and evidence record

## Integration evidence — 4 November 2026

The implementation at **`10e3b16af8c314379e540da65b8aa7da0f536775`** passed this game’s actual **3840 × 2160 WebGL 2** drawing-buffer check (zero GL error), real-control completion, saved progression and fallback scenarios in [CI 41926291553](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). The integration owner inspected the original captured scene. [Immutable measured/frame receipt](../docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

That historical measured run passed **269 JavaScript, 52 API and 67/69 browser checks** and exposed two advanced mobile-layout failures. Corrected source **`09385bd8105e235f90493390fccbbe133083bd72`** then passed the complete gate: **269 JavaScript, 52 API and 69/69 browser checks**, including both 390px/320px layout regressions, in [CI 41929244609](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41929244609). [Successful immutable receipt](../docs/evidence/2026-11-04-nine-games/verification-09385bd.json). Hardware performance, physical devices, complete assistive-technology play and production qualification remain open. Current publication evidence belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).


## Identity and scope

| Field | Record |
| --- | --- |
| Title / stable ID | **CIRCUIT RUSH** / `game2`; campaign ID `circuit-rush` |
| Genre | Wire-routing commissioning puzzle: rotatable terminals, source connectivity, branching loads, short isolation and finite rotation budgets |
| Corporate owner / division | Hephzibah Behulah / Elektroniker; shared five-brand foundation |
| Target platform | Browser; WebGL 2 for the 3D view, equivalent labelled terminal board when graphics are unavailable |
| Source / route | `game2/` / `/AdigunGamesBank/game2/` |
| Status | **In progress**: playable implementation and numerical verification; candidate browser/rendering/deployment outcomes belong in `PROJECT_STATUS.md` |
| Remaining dependencies | Physical-device GPU/touch checks, full assistive-technology review, localization and production qualification |

This preserves Circuit Rush’s original wire-path objective while replacing
its hardcoded route comparison with an actual reciprocal-terminal graph. It
is one game, with 10,000 distinct circuit configurations. The legacy
`game2/script.js` remains unchanged for historical compatibility and regression
tests; the new entry page runs `app.js`, `engine.js` and `campaign.js`.

### Rules and decisions

The positive supply feed starts at A1. Required resistive loads have prewired
returns beneath the panel. Rotate the conductor modules to feed those loads,
while isolating the exposed return terminal and parked auxiliary load. Every
north terminal needs a south terminal on the adjacent tile, and every east
terminal needs a west terminal. Diagonals, row wrap and one-sided contacts do
not conduct. Straight modules have two orientations; elbows and tees have four.
Fixed source, load, ground and blank modules cannot be rotated.

The commissioning test follows the source-connected graph. All required loads
must be connected, the current must remain within the virtual fuse rating, and
there must be no unmatched energized terminal or unwanted branch. Isolated
spare wire modules may remain disconnected. A short to the return or overcurrent
trips the virtual fuse and loses the job. Other failures permit correction while
rotations remain. The last permitted rotation may still produce a valid final
test. Exhausting the budget with an invalid network loses the job. Retry restores
the same deterministic board; previous qualified jobs remain saved.

The first job is an authored 5 × 5 panel: 12 V source A1, 120 Ω lamp E5,
150 mA virtual fuse and exposed return B3. Rotate B1, C1, C2, C3, D3, E3 and
E4 once clockwise each, then test. That is seven turns within the twelve-turn
budget and 100 mA supply current. Testing after only B1/C1/C2 are corrected
produces an actual reachable short through the still-misaligned C3 into B3.

## Rendering and level structure

| Requirement | Implementation / verification boundary |
| --- | --- |
| Real 3D | Original raised PCB/module geometry, copper terminals, power supply, resistive lamp models, exposed-return symbol, chassis and insulated return rail. Three.js lighting, shadows, depth and perspective; actual scene raycasting selects modules. |
| 4K | Shared renderer offers an explicit 3840 × 2160 drawing buffer, 1920 × 1080 and adaptive modes. The browser test waits for a rendered frame, inspects the actual WebGL buffer and captures it. **The selector is not evidence of a passed rendering check.** |
| Camera / motion | Static bench and overhead cameras. Redraws only after an action, resize or graphics change; no perpetual decorative animation or timed reaction requirement. |
| Authored / generated content | First panel authored. Remaining paths come from deterministic enumerations of distinct simple geometric source-to-primary-load routes; seeded branches, hazards, parked modules and scrambles provide additional variation. |
| Distinct count | 2,000 unique 5 × 5 boards, 4,000 unique 6 × 6 boards and 4,000 unique 7 × 7 boards. Distinctness is checked using actual tile types and solved terminal masks, not names or seed labels. |
| Difficulty | Beginner: one load. Apprentice: two. Skilled/Expert: three. Professional Master: four. Larger boards, longer branch routes, tees, more parked modules and tighter extra-turn margins change the decisions. |
| Generation / reachability | Every canonical source-to-load network is a connected tree with safe return isolation. All 10,000 complete boards are solved through the actual rotation and commissioning functions in the unit suite. |
| Rotation budgets | Computed from the exact shortest quarter-turn cost of the canonical orientation plus a finite tier-dependent margin. The largest observed canonical solution cost in the exhaustive validation is 22 moves. Alternative valid routing is accepted by the graph checks. |
| Save / resume | Device-local `adigun.campaign.v1.circuit-rush` using the shared validated progression schema. Sequential clears, duplicate attempts, reload and blocked writes are covered. The UI verifies stored data before claiming a durable save. |

All 10,000 automated solutions validate reachability and the implemented rules.
They are not 10,000 human playtests or a claim of equal entertainment quality.
Legacy route-counter saves remain untouched and do not automatically qualify
the new graph-based commissioning campaign.

## Controls and accessibility

| Input / requirement | Implementation |
| --- | --- |
| Mouse / touch | Select a module on the 3D board or labelled terminal board, then use clockwise/counterclockwise controls. Selecting a tile never spends a turn by itself. |
| Keyboard terminal board | Roving focus with bounded arrow navigation. R rotates clockwise; L reverses. Tab reaches job controls. Fixed tiles remain inspectable. |
| Keyboard scene | Arrows select a tile; Enter rotates clockwise; Backspace rotates counterclockwise. Equivalent DOM controls remain available. |
| State and focus | Labelled source/load/ground terminals and compass directions, visible gold focus, text fault reports, progress announcements and explicit phase/rotation-budget readings. |
| Reduced motion | No animated transitions or continuously moving scene. Both camera changes are immediate; the shared reduced-motion rules remain active. |
| Small screens | Board cells remain at least 48 px wide. Larger grids scroll within their own bounded panel instead of widening the page. Browser checks cover 390 px and 320 px with a seven-column saved-layout fixture. |
| WebGL failure | The complete terminal board and graph engine remain playable. The visible error states that the 3D view is unavailable; graphics failure is never counted as 3D evidence. |
| Language coverage | English implemented. German, Yoruba and Nigerian Pidgin localization is not claimed. |
| Unverified accessibility | Complete screen-reader sessions and physical touch-device play remain **NOT TESTED**. Automated named-control and focus checks are narrower evidence. |

## Electrical model, references and limits

Every wire module is an ideal conductive node. The board routes the positive
feed only; each load’s return connection is explicitly prewired beneath it.
For an energized resistive load, current is `I = V / R` in amperes. Supply current
is the sum of the connected load currents. The interface converts amperes to
milliamperes with ×1,000. An unwanted auxiliary load therefore affects current
even when all required lamps are connected.

A direct feed-to-return connection is an ideal short. The engine reports the
short and trips its virtual fuse instead of inventing a finite short current.
Open-branch diagnostics check unmatched terminals only in the source-connected
component; unused isolated conductors are not falsely reported as live faults.
After a failed test the supply is isolated. Highlighted conductors show the
last test trace; lamps illuminate only after successful commissioning.

Technical references, verified 2026-11-04:

- [OpenStax, University Physics Volume 2, §9.4: Ohm’s Law](https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law).
- [OpenStax, University Physics Volume 2, §10.3: Kirchhoff’s Rules](https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules).

Layouts, virtual fuse behavior and win conditions are original game design.
The model omits wire resistance, contact resistance, tolerances, inductance,
capacitance, component temperature and fuse time-current curves. It does not
model mains installations, demonstrate compliance with an electrical standard,
or supply manufacturer-specific engineering data.

## Loading and asset rights

Initial-playable target: 3,000 ms on a current laptop with an uncached 20 Mbps
connection. **Not measured or certified.** The selected scene imports lazily;
hardware GPU/frame-time, memory, mobile and initial-load qualification remain
open. Fast graph tests do not prove graphics performance.

| Asset / dependency | Source / creator | Rights / attribution |
| --- | --- | --- |
| PCB, modules, conductors, supply, lamps, return rail, geometry and diagrams | Original code in `game2/scene.js`, `campaign.js` and `app.js`, created for Hephzibah Behulah in this implementation | Original project work; no external model, photo, audio or likeness imported |
| Printed coordinate labels | Runtime canvas atlas from the original cell coordinates | Original labels; system font, no font download |
| Corporate artwork | Existing approved `assets/corporate/hephzibah-behulah-official.jpg` | Unchanged; provenance retained in `ASSETS.md` |
| Three.js | Existing pinned `vendor/three/three.module.js` | Existing MIT license and attribution retained |
| Electrical equations | General physical relationships; primary educational references above | Paraphrased explanation and source links; no textbook images or passages reproduced |

## Verification and publication

| Evidence | Command / procedure | Recorded scope |
| --- | --- | --- |
| Numerical, graph and state-machine tests | `node --test tests/circuit-rush.test.js` | **17 passed locally** on the working tree on 2026-11-04; all 10,000 boards solved using real rotation commands |
| Numerical reference case | 12 V supply; 120 Ω and 240 Ω parallel loads | Exactly 150 mA within numerical tolerance; missing, extra, open, short and overload variants tested |
| Integrity regressions | Reciprocal ports, row boundaries, fixed modules, finite budget, last-move success, pause, retry, duplicate save | Passed within the 17-test suite |
| Syntax | `node --check game2/app.js`; `node --check game2/scene.js` | Passed locally |
| 4K/browser play | `npm run test:browser -- tests/browser/circuit-rush.spec.js` | Executed; actual buffer and inspected frame recorded in the integration evidence above |
| Error paths | Browser short/retry, WebGL failure and silently rejected storage writes | Executed in integration CI; see the exact-source receipt above |
| Accessibility / mobile | Product axe audit, focus checks, 390 px/320 px seven-column fixture | Candidate outcomes belong in `PROJECT_STATUS.md`; the save fixture proves layout only |
| Build / CI | Product release checks and exact-candidate CI | Integration owner records the executed revision and outcomes |
| Public URL / deployment | Existing GitHub Pages/custom-domain flow | **Not claimed here**; require an exact-source public receipt |

The browser commissioning flows use the shipped terminal controls. They do not
inject winning state or saved clears. The seven-column layout test explicitly
uses a saved-progress fixture; it is not evidence of playing 6,000 jobs.

## Adopted standards and acceptance

- **HB-AI-ENGINEERING-001 v2.0**, pinned to
  `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`, as adopted in `AGENTS.md`.
- **HB design system**, pinned to `52f01f9986d97088413ca9785bc7a2d3f2967123`.
  Tokens: Navy `#0B1220`, Royal Blue `#2563EB`, Gold `#D4AF37`, Ivory `#F8FAFC`,
  Slate `#64748B`, Electric Cyan `#22D3EE`; readable supporting text tints.
- Consuming components: `shared/game.css`, `shared/three-stage.js` and
  `shared/progression.js`. App logic, tests and original assets stay here.
- Acceptance remains **In progress** until applicable candidate rendering,
  browser, accessibility, performance and publication checks are recorded.
  This is a browser title with no native-console certification claim.
