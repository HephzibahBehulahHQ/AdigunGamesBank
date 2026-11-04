# Fuse Box — The Commissioning Room

## Integration evidence — 4 November 2026

The implementation at **`10e3b16af8c314379e540da65b8aa7da0f536775`** passed this game’s actual **3840 × 2160 WebGL 2** drawing-buffer check (zero GL error), real-control completion, saved progression and fallback scenarios in [CI 41926291553](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). The integration owner inspected the original captured scene. [Immutable measured/frame receipt](../docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

That historical measured run passed **269 JavaScript, 52 API and 67/69 browser checks** and exposed two advanced mobile-layout failures. Corrected source **`09385bd8105e235f90493390fccbbe133083bd72`** then passed the complete gate: **269 JavaScript, 52 API and 69/69 browser checks**, including both 390px/320px layout regressions, in [CI 41929244609](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41929244609). [Successful immutable receipt](../docs/evidence/2026-11-04-nine-games/verification-09385bd.json). Hardware performance, physical devices, complete assistive-technology play and production qualification remain open. Current publication evidence belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).


## Identity and playable scope

| Field | Record |
| --- | --- |
| Stable title / ID | Fuse Box / `fuse-box`, catalog route `game8/` |
| Genre | DC distribution and protection commissioning puzzle |
| Owner / division | Hephzibah Behulah · HB Elektroniker |
| Platform | Modern desktop/mobile browser with command controls; WebGL 2 for the 3D scene. No native-console release is claimed. |
| Status | **In progress:** playable implementation and numerical validation exist; release, browser-rendering and public deployment evidence are owned by [PROJECT_STATUS.md](../PROJECT_STATUS.md). |
| Source | `campaign.js`, `engine.js`, `app.js`, `scene.js`, `index.html`, `style.css` |

Supply every workshop load, distribute its current across protected branches,
fit breakers from finite stock, and stay within the workshop-credit budget.
Every branch needs a connected load and a breaker. The actual trial runs three
operating profiles: lighting/control, drive startup, and full production.

An overloaded circuit trips. Wiring and protection cannot change while the
supply is connected. Isolate it, reset the trip, correct the retained plan, and
repeat all three stages. A successful trial isolates the supply automatically,
records completion, and unlocks the next board. Clearing the board is an explicit
restart; it does not erase previously completed campaign progress.

This replaces the route's former 2D lights-out puzzle. Its mechanics are distinct
from Electronicer's circuit bench: Fuse Box concerns distribution, load profiles,
protection inventory and a commissioning sequence, not component-level circuit
construction. The old lights-out progress is not treated as completion of the
new electrical challenges.

## Electrical model and reference calculations

All scenarios use an ideal **12, 24 or 48 V DC** source. Each load has a stated
power in watts for each of the three profiles. Its current in amperes is
`I = P / V`; branch currents are sums of the connected load currents. Cable
ampacities are supplied game parameters, not cable-size recommendations.

Inspection enforces stock, budget, assigned loads and `breaker rating ≤ cable
ampacity`. During the trial, a demanded current above the branch's breaker rating
or cable limit trips immediately. A separate supply-current limit is evaluated.
The complete load/protection relationship is `load current ≤ breaker rating ≤
cable ampacity`. Energy is integrated as `power × seconds / 3600`, in watt-hours.

The first board is an independent numerical reference: 24 V with loads of 48,
72, 72, 96, 120 and 144 W. One valid arrangement gives branches of **5, 7 and
11 A**, protected by **6, 10 and 16 A** breakers. The six-second trial consumes
**0.92 Wh** in this ideal model. Those breakers cost 25 of the available 29
workshop credits. Credits are fictional puzzle units.

**Limits:** the ideal instantaneous trip is not a real breaker time-current
curve. Cable resistance, voltage drop, temperature, short-circuit breaking
capacity, selectivity, earthing and electric-shock protection are outside the
model. The game is not a mains wiring guide, installation design or compliance
assessment. Load names and power profiles describe original exercises, not
measured commercial equipment.

Primary references checked on 2026-11-04:

- [OpenStax, Physics §19.4: Electric Power](https://openstax.org/books/physics/pages/19-4-electric-power), the relation between voltage, current, power and energy.
- [Schneider Electric: Design Current in EcoSet Design](https://www.se.com/hk/en/faqs/FAQ000283711/), the load/breaker/cable-current relationship.
- [Schneider Electric, Electrical Installation Guide: Practical values for a protective scheme](https://www.electrical-installation.org/enwiki/Practical_values_for_a_protective_scheme), additional actual protection requirements and trip behavior omitted from this simplified game.

## Rendering and progression

| Requirement | Implementation / evidence |
| --- | --- |
| 3D renderer | Local Three.js and shared `createStage` WebGL 2 renderer. Original geometry forms an open cabinet, mounting rails, copper bus, breaker housings/levers, terminals, routed cables, lamps, motors and fans. Live state changes the actual scene. |
| 4K | Graphics selector requests a 3840 × 2160 drawing buffer through the shared renderer. The browser test measures the real buffer, GL error and records an image. **An implemented selector is not acceptance evidence; consult the release receipt for the actual browser result and inspected frame.** |
| Level count | **10,000** deterministic physical configurations, generation version 1. These are challenges within one game, not separate game titles. |
| Difficulty | Five tiers, Beginner through Professional Master; 3/3/4/5/6 branches and 6–12 loads. Higher tiers add varying duty profiles, tighter credit budgets and less spare stock. |
| Authored/procedural split | Original mechanics, three commissioning profiles, device types and rules are authored. A seeded generator produces load powers, assignments, branch limits, stock and budgets. The first board is authored as an introductory numerical reference. |
| Solvability | A reference plan is constructed with every configuration. Numerical tests apply every plan through the real assign/fit/start/step engine, checking all three profiles, stock, budget and completion. All 10,000 physical signatures are checked for uniqueness. This is not 10,000 human playtests or proof of entertainment quality. |
| Save/resume | Browser-local `adigun.campaign.v1.fuse-box`; sequential completion only, final mastery recorded separately. Shared campaign validation recovers from corrupted/disabled storage. Live feedback verifies persisted data and reports session-only completion when storage silently rejects writes. Unfinished wiring is not saved. |

## Controls and accessibility

| Input / requirement | Implementation / verification limit |
| --- | --- |
| Keyboard | Every action is available through native buttons/selects. Tab navigates; Enter/Space activates controls. On the scene, left/right selects a branch, Enter connects the selected load, and Space pauses/resumes an active trial. |
| Mouse | Select a load and branch; connect/disconnect; choose a breaker. Scene raycasting selects the actual branch housing. |
| Touch | The same labelled controls use ordinary pointer input; primary controls are at least 44 px high. Physical device testing remains open. |
| Pause / recovery | Pause/resume, automatic pause on tab hiding, explicit isolation, latched trip reset, retained-plan retry and clear-board restart. |
| Graphics failure | The same numerical game remains playable through the DOM controls without WebGL. An explicit failure state explains graphics availability; no fallback view is described as 3D. |
| Accessible state | Visible selection, pressed-state buttons, explicit labels, skip link, focus outlines, live action/status messages and text equivalents for branch currents and all three load profiles. Numeric telemetry is not continuously announced. |
| Reduced motion | Native preference suppresses device rotation; all electrical tests and controls remain available. |
| Responsive layouts | Layouts for narrow screens; browser tests cover 390 px and 320 px. Actual results require the release receipt. |
| Languages | English only in this milestone. Complete German, Yoruba and Nigerian Pidgin translation/review remains open. |
| Gamepad / screen reader | Gamepad mapping and a full physical screen-reader playthrough are **NOT TESTED**. An axe audit is partial automated evidence only. |

## Loading, performance and rights

The electrical engine and controls initialize before the dynamically imported
3D scene. The renderer and Three.js bundle load only when this route is opened.
There is no external font, texture, audio, model API or gameplay service.
The 3D scene redraws on input/state changes; visual device motion is throttled,
and the idle cabinet does not continuously render unchanged frames.

Initial-playable target: **3,000 ms**, cold cache, desktop Chromium on a midrange
laptop over a 4G-class network. This is a target, **not a measurement**. Hardware
GPU frame-time distributions, low-end devices and physical touch performance
remain **NOT TESTED** until separately recorded. Software-rendered 4K checks do
not establish smooth hardware 4K gameplay.

| Asset / dependency | Source and rights |
| --- | --- |
| Cabinet, bus, loads, cables, label textures | Original programmatic geometry and text authored for this Hephzibah Behulah product; no external models, equipment likenesses, photographs or commercial breaker branding. |
| Interface, profiles and scenario text | Original project work. Scientific formulas are cited above; reference text and diagrams are not copied into the game. |
| Three.js | Existing pinned local vendor bundle; MIT license in [`vendor/three/LICENSE`](../vendor/three/LICENSE). |
| Corporate logo | Existing exact official corporate artwork, unchanged; project rights/provenance in [ASSETS.md](../ASSETS.md). |
| Fonts / sound | Device system fonts; no audio assets. |

## Verification and deployment

| Evidence | Command / procedure | Current record |
| --- | --- | --- |
| Numerical / campaign tests | `node --test tests/fusebox.test.js` | **10 passed, zero failed/skipped** in the local working tree on 2026-11-04. Includes all 10,000 solved boards, independent current/energy reference, overload/isolation/reset, inventory/budget, timestep boundaries and persistence. Exact release revision belongs to the integration receipt. |
| Syntax | `node --check` for new game modules and browser test | Passed locally. |
| 4K / actual input completion | `npm run test:browser -- tests/browser/fusebox.spec.js` | Authored; **Verified in integration CI above**. Measures actual buffer; commissions, pauses/resumes, saves and reloads through player controls. |
| Failure / keyboard / storage | Same browser suite | Authored; graphics-capability failure, real overload/recovery and silently rejected storage are isolated test cases. No game-engine or campaign completion is injected. |
| Accessibility / reflow | Same browser suite and shared accessibility route | Authored; all applicable WCAG 2.1 A/AA axe tags, keyboard focus and 320/390 px layouts. Await integration result. |
| Public release | `/game8/` on the existing GitHub Pages/custom domain | New conversion **NOT VERIFIED PUBLIC** until the exact deployed bytes and release flows are recorded by [PROJECT_STATUS.md](../PROJECT_STATUS.md). |

## Adopted standards and acceptance

- Engineering: **HB-AI-ENGINEERING-001 v2.0**, `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`.
- Design system: `52f01f9986d97088413ca9785bc7a2d3f2967123`.
- Used foundation: Midnight Navy `#0B1220`, Royal Blue `#2563EB`, Metallic Gold `#D4AF37`, Ivory White `#F8FAFC`; Elektroniker accent Electric Cyan `#22D3EE`, shared header, controls, typography and visible focus.
- Acceptance: **In progress**. Hardware performance, full multilingual and assistive-technology validation remain open. The current project-wide candidate, verified release revision and deployment outcome are maintained only in [PROJECT_STATUS.md](../PROJECT_STATUS.md).
