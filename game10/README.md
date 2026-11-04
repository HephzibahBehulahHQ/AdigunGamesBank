# APEX CIRCUIT — design and evidence record

## Integration evidence — 4 November 2026

The implementation at **`10e3b16af8c314379e540da65b8aa7da0f536775`** passed this game’s actual **3840 × 2160 WebGL2** drawing-buffer check (zero GL error), real-control completion, saved progression and fallback scenarios in [CI 41926291553](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). The integration owner inspected the original captured scene. [Immutable measured/frame receipt](../docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

The whole run passed **269 JavaScript, 52 API and 67/69 browser checks**. Its only failures were advanced narrow-screen layouts in Circuit Rush and Binary Flash; those styles are now corrected and await the final exact-candidate gate. This is development rendering evidence, with hardware performance, physical devices, complete assistive-technology play and production qualification still open. Current release/publication state belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).


## Identity and playable scope

| Field | Record |
| --- | --- |
| Title / stable ID | **APEX CIRCUIT** / `game10`; campaign ID `apex-circuit` |
| Genre | 3D circuit time trial: throttle, braking, steering, tyre grip, ordered gates and clean sectors |
| Corporate owner | Hephzibah Behulah; cross-division Game Bank, corporate foundation with Electric Cyan |
| Source / browser route | `game10/` / `/AdigunGamesBank/game10/` |
| Target platform | Browser; WebGL 2 scene, with equivalent step-driving controls and telemetry when graphics cannot start |
| Status | **In progress**: playable implementation and numerical tests; exact-candidate browser, rendering and publication receipts belong in `PROJECT_STATUS.md` |
| Remaining dependencies | Physical-device performance and touch testing, complete screen-reader review, language review and production qualification |

This replaces the existing lane-dodging game at its original route. It is one
individually designed racing title, not 10,000 separate games. Its original car
drives freely in world coordinates; the car is not attached to a rail. Steering,
pedals, speed, tyre grip and track shape determine its actual position.

Each lap has twelve gates in a fixed order. Only forward crossings through the
next gate count. Starting-line crossings without the preceding gates earn
nothing. Leaving the tarmac invalidates the current sector and adds three
seconds. Returning across the grass cannot restore gate credit: the driver must
recover to the last clean gate, adding five more seconds and restarting from
rest. Previously earned gates are retained. Qualification requires all gates
before the clock expires. A timeout is an explicit loss with retry. Gold, silver
and bronze distinguish qualifying times; every valid finish unlocks the next
race. Replaying an earlier race does not grant another unlock.

### First race

Founders Ring is an authored introductory circular course with radius 28 m,
11 m road width, one lap and a 45-second qualification limit. Full-right steering
follows its centre line. Hold the accelerator, or set the throttle slider to
100%. This teaches the controls and gate rules before changing-radius circuits.
The normal engine completes its twelve gates in approximately 13.54 simulated
seconds with full throttle and full-right steering. This is a numerical result,
not a browser frame-rate or real-world vehicle claim.

## Rendering and progression

| Requirement | Implementation / evidence boundary |
| --- | --- |
| 3D scene | `scene.js` uses the bundled Three.js renderer: original closed tarmac geometry, curbs, guardrails, garages, terraced stands, trees, illuminated gate and a detailed original coupe with wheels, rims, glazing, lights and wing. Lighting, shadows, depth and cameras are real 3D. |
| 4K | The shared stage provides explicit 3840 × 2160, 1920 × 1080 and adaptive drawing buffers. **A setting alone is not confirmation.** `tests/browser/racing.spec.js` waits for a rendered frame, checks the actual WebGL buffer and captures it. The integration owner records the executed result. |
| Cameras | Following chase camera and fixed circuit overview. Reduced motion forces the fixed overview and disables camera switching while the preference remains active. |
| Rendering workload | Game code imports the selected scene lazily. Rendering occurs at most 30 times per second while driving; ready, paused, won and lost scenes redraw only after changes. No continuous decorative motion. |
| Campaign | 10,000 reproducible physical configurations across five tiers of 2,000 races. These are levels within this title. |
| Meaningful variation | Circuit radius and two independent smooth radial deformations change the driving line. Road width, grip, speed limit, qualification time and lap count also change. All 10,000 physical layout signatures are unique. |
| Difficulty | Beginner: one lap. Apprentice/Skilled: two laps. Expert/Professional Master: three laps. Later circuits have narrower roads, lower grip, higher available speed, more shape variation and less time margin. |
| Geometry validation | All configurations are finite, closed, positive-radius tracks within the steering envelope. Tests check road width, curvature, grip-safe pace, qualification budgets and distinct physical layouts. |
| Completion validation | Normal steering/pedal simulations complete the first race, every tier boundary and the final race. This is twelve representative simulations, **not 10,000 manual playtests** or a claim that every generated race is equally enjoyable. |
| Storage | Device-local `adigun.campaign.v1.apex-circuit` using the shared validated campaign schema. Sequential progress, duplicate clears, blocked storage and reload are covered by the appropriate tests. The UI checks stored data before claiming a durable save. |

The 3D campaign uses a new namespace. Legacy lane-runner saves remain untouched;
they are not treated as completed circuit qualifications. No account, network
service, analytics or cloud save is required for this game.

## Controls and accessibility

| Input / requirement | Behavior |
| --- | --- |
| Keyboard on scene | W / Up: accelerator. S / Down: brake. A / Left and D / Right: steering. Space: pause/resume. Keys are ignored as driving shortcuts when a form control has focus. |
| Mouse / touch | Hold the four labelled driving buttons, or set steering and throttle sliders. Pointer capture keeps held controls working until release; cancellation, blur and hidden-page events clear them. |
| Persistent pedal controls | The steering and throttle sliders retain their settings. Holding a keyboard/pointer control overrides the relevant slider only while held. Braking suppresses acceleration. |
| Step driving | The same physics advances by half a second per button press. There is no automatic time advancement. Changing control mode pauses an active run. This supports play without rapid timed inputs. |
| Route guidance | The read-only race engineer shows suggested steering, pace, road offset, tyre grip and next-gate distance. “Use guide steering” sets the steering slider once; it does not drive, advance time, set pedals, award gates or complete a race. |
| Screen-reader support | Named controls, text telemetry, explicit result/error announcements, keyboard-operable sliders and command buttons, and a skip link. Complete assistive-technology play remains **NOT TESTED**. |
| Focus / motion | Shared visible gold focus outline. Reduced motion uses a fixed camera. Pausing or hiding the page freezes simulation time and car position. |
| Responsive / touch qualification | Automated 390px and 320px reflow checks and minimum 44px hold controls are provided. Physical touch-device validation remains **NOT TESTED**. |
| Graphics failure | A visible explanation switches to step driving with the same game engine and route guidance. This is explicitly not a 3D-rendering success. Reload graphics is available. |
| Languages | English implementation. Full German, Yoruba and Nigerian Pidgin localization is not claimed. |

## Racing model and units

World coordinates, road width and path lengths use metres. Time uses seconds.
Internal speed uses metres per second; the HUD converts it to km/h using ×3.6.
The arcade model integrates acceleration, braking and speed-dependent drag in
substeps no larger than 1/60 second. A frame can advance at most 0.25 seconds;
hidden-page pauses do not accumulate background race time.

Steering requests path curvature. The grip limit caps curvature by
`grip / speed²`, producing understeer when speed is too high. Braking reduces
that demand and makes tighter turns possible. Integration follows an exact
circular arc for constant speed/curvature within each substep. Projection onto
the closed circuit checks actual road position. Off-road drag and an outer
barrier slow the car; the clean-sector latch prevents shortcut credit.

These are deliberately simplified original arcade rules, not manufacturer
vehicle data, a motorsport regulations model or a driver-training simulator.
No real brand, car, racing venue, team, driver, likeness or licensed livery is
represented. There are no live competitors or claims of online multiplayer.

## Loading, assets and rights

Initial playable-load target: 3,000 ms on a current laptop with an uncached
20 Mbps connection. **Not measured or certified.** Hardware GPU/frame-time,
memory and initial-load qualification remain open. Numerical simulation speed
does not establish rendering performance.

| Asset / dependency | Source / author | Rights / attribution |
| --- | --- | --- |
| Circuit, car, garage, stands, vegetation, gate and minimap | Original geometry/code in `game10/scene.js`, `campaign.js` and `app.js`, created for Hephzibah Behulah in this implementation | Original project work; no external model, image, sound or likeness imported |
| Corporate artwork | Existing approved `assets/corporate/hephzibah-behulah-official.jpg` | Preserved unchanged; provenance remains in `ASSETS.md` |
| Three.js | Existing pinned `vendor/three/three.module.js` | Existing MIT license and attribution retained |
| Typography / UI | System font stack and pinned consuming-product styles | No font download; corporate token adoption below |

## Verification and deployment

| Evidence | Command / procedure | State |
| --- | --- | --- |
| Numerical / state-machine tests | `node --test tests/racing.test.js` | **14 passed locally** on the working tree on 2026-11-04; includes all 10,000 geometry checks and twelve representative full race simulations |
| Syntax | `node --check game10/app.js`; `node --check game10/scene.js` | Passed locally |
| Actual 4K rendering and keyboard/step win | `npm run test:browser -- tests/browser/racing.spec.js` | Executed; exact source, buffer and inspected capture recorded above |
| Error/recovery play | Browser graphics-failure, invalid-sector recovery and save assertions | Executed in integration CI as recorded above |
| Accessibility / reflow | Product axe audit and racing browser checks | Exact run outcome belongs in current project status |
| Build / release integrity | Product `npm run check`, `npm test`, `npm run build` and CI | Integration owner records exact tested revision |
| Publication | Existing GitHub Pages/custom-domain deployment | **Not claimed by this implementation record**; require exact-source public verification |

The test inputs use the shipped controls and engine. No winning state, cleared
gate, campaign value or prerecorded result is injected in the browser flows.
Unit tests are simulation evidence; WebGL capability-failure tests are error-path
evidence. Neither is evidence of hardware 4K frame rate or console certification.

## Adopted standards and acceptance

- Engineering: **HB-AI-ENGINEERING-001 v2.0**, immutable commit
  `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`, adopted by product `AGENTS.md`.
- Design: immutable `52f01f9986d97088413ca9785bc7a2d3f2967123` from
  `docs/STANDARDS.md`. Navy `#0B1220`, Royal Blue `#2563EB`, Gold `#D4AF37`,
  Ivory `#F8FAFC`, Slate `#64748B`, Electric Cyan `#22D3EE`; brighter supporting
  text tints maintain readable UI contrast.
- Consuming components: `shared/game.css`, `shared/three-stage.js` and
  `shared/progression.js`. Implementation and tests remain in this repository.
- Acceptance: **In progress** until the exact-candidate graphics, gameplay,
  accessibility, performance and publication evidence is recorded. This is a
  browser racing game, with no native PlayStation release claim.
