# WORLD FOOTBALL

## Identity and scope

| Field | Record |
| --- | --- |
| Stable game ID / source | `game11` · `game11/` |
| Genre | Real-time 11-a-side football against a local tactical opponent |
| Owner | Hephzibah Behulah · Adigun Game Bank, cross-division corporate foundation |
| Target platforms | Desktop and touch browsers with WebGL 2; no native console release |
| Status | **In progress** · playable implementation; production acceptance remains open |
| Outstanding dependencies | Hardware performance, physical touch/assistive-technology QA, fuller football rules and production-art qualification; verified browser milestones below do not establish a completed production release |

Adigun XI plays an original fictional opponent. Each side has ten outfield players
and a goalkeeper. Control movement, sprinting, passing, shooting, player selection
and tackling while teammates hold formation and opponents press, pass and shoot.
A qualifying full-time result clears the campaign level; a draw, defeat or
insufficient winning margin can be retried. Restart creates a fresh match at the
same level. Selecting a player changes control without moving that player.

The simulation implements possession, grounded and airborne ball movement,
gravity, bounce, drag, swept player contact, goalkeeper interception, solid
posts/crossbar, whole-ball goal-line crossing, own goals, kickoffs, throw-ins,
corners and goal kicks. Restarts reposition the designated taker and briefly
stop play. Match time is 120–180 active seconds. The simulation runs fixed 1/60-second steps, processing up to 0.25 seconds per rendered frame; severe stalls beyond that cap can slow game time. Offside, fouls, cards,
substitutions, extra time, penalties, leagues and network multiplayer are not
implemented. This is a football game with a stated rules subset, not a claim to
reproduce every law or a licensed professional competition.

## Rendering and level structure

| Requirement | Implemented behavior and evidence |
| --- | --- |
| 3D | `scene.js` constructs a real Three.js scene: a 105 × 68 metre pitch, original stadium, seating, roofs, lighting, nets, patterned spherical ball and 22 articulated players. An actual rendered frame was inspected from [CI run 41770210966](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41770210966), commit `484141c50acfebe5526085fd983b7964a2b02e44`. |
| Human/ball scale | A constructed player measures about 1.83 m high. Ball radius is 0.11 m; model and collision dimensions use the same value. No circles or flat sprites substitute for players. |
| 4K | The same CI run verified the actual WebGL 2 drawing buffer as **3840 × 2160**, with `getError() === 0`, and produced the inspected `football-4k.png` frame. Auto and 1920 × 1080 remain available. Chromium SwiftShader verifies software-rendered 4K output, not hardware FPS. |
| Rendering budget | Approximately 70,948 triangles and 489 mesh objects, including instanced stadium seats, structural boxes, lights and pitch strips, from source inspection on 2026-11-04. This is a scene count, not an FPS measurement. |
| Levels | 10,000 reproducible procedural match configurations, Beginner → Apprentice → Skilled → Expert → Professional Master. They are levels of this one game. |
| Actual progression | Opponent running speed 4.65–6.5 m/s, decision interval 1.0–0.29 s, pressing range, shot error, goalkeeper speed and formation width change with the level. Match length rises from 120 to 180 s; required goals and winning margin rise from one to three. |
| Validation | All 10,000 configurations have validated numeric bounds and distinct gameplay parameters after excluding their level, seed, tier and opponent labels. This does not establish 10,000 individually authored matches or manual playthroughs. |
| Completion | CI run 41770210966 completed a Beginner match through real keyboard movement/tackle/shot controls; the inspected full-time screenshot showed **4–0** and level 2 unlocked. The match ran at adaptive resolution after the separate 4K check. Engine tests also validate draw, defeat, win and harder unmet targets. All-level completion, balance and enjoyment remain **NOT TESTED**. |
| Save | Shared campaign schema `adigun.campaign.v1.football` stores cleared/unlocked levels in browser-local storage. Full-time qualification is required; unlocking the final level does not clear it. Matches in progress are not saved. |

## Controls and accessibility

| Input | Behavior |
| --- | --- |
| Keyboard movement | Focus the pitch; WASD or arrow keys move. Hold Shift to sprint, spending recoverable stamina. |
| Keyboard actions | P pass, Space shoot, Q switch, E tackle, Escape pause/resume, R restart. J/K/L choose far-post/centre/near-post shot targets. Enter starts a ready match. |
| Mouse | Click an Adigun player model or use the labelled player selector. Buttons handle match actions; there is no click-to-teleport movement. |
| Touch | Hold the directional pad; use pass/shoot/switch/tackle buttons and the sprint toggle. Pointer release/cancel releases the held direction. Physical touch testing remains open. |
| Pause | Explicit pause and hidden-tab/window-blur pause freeze simulation and clear held input. Resume does not advance missed background time. |
| Accessible feedback | Visible focus, named buttons/selectors, a focusable canvas, text score/time/possession, match-event announcements and a visible pitch-coordinate readout. Coordinates use metres from centre: +x attacks right, −y is the far touchline. |
| Reduced motion | Fixed broadcast camera, no camera shake, no decorative transitions; player vertical bob is suppressed under reduced-motion preference. Core player/ball movement remains necessary to play. |
| Limits | A 390 px browser layout, absence of page overflow, keyboard entry focus and reduced-motion preference passed in CI. Spatial play still depends on seeing the pitch. Full screen-reader play parity, measured contrast and physical touch-device behavior remain **NOT TESTED**. |
| Gamepad / languages | No gamepad mapping. English interface; further languages are not represented as implemented. |

## Loading, performance and asset rights

Initial-playable target: **under 5 seconds** on a hardware-accelerated desktop
browser with a 10 Mbps connection and an empty cache. Frame-time target: **16.7 ms
or lower at 1080p** on suitable hardware. These targets have not been measured.
4K may require stronger hardware; the visible quality selector permits a lower
resolution. The selected game dynamically loads its modules and the repository's
local Three.js bundle when the route is opened. No remote 3D models, fonts,
player images, audio or texture downloads are required. A loading/WebGL failure
is shown as an error instead of a simulated game screen.

| Asset | Source / permission record |
| --- | --- |
| Stadium, pitch, players, animation, goal nets, ball and kit colors | Original procedural geometry authored for this product in `scene.js`; no real-player likeness, real-club crest or professional kit is represented. |
| Fictional teams | Adigun XI and four original fictional opponent identities; no official league, club affiliation or endorsement claim. |
| Corporate identity | Owner-specified official image at `assets/corporate/hephzibah-behulah-official.jpg`, adopted by the integration owner from corporate reference assets. |
| Three.js | Repository-pinned version 0.187.0; MIT license retained at `vendor/three/LICENSE`. |
| Fonts | System font stack; no third-party font download. |
| Audio | None included. |

The original match rules use a 105 × 68 m field and the 7.32 × 2.44 m goal opening
from the dimensional ranges/requirements in [IFAB Law 1](https://www.theifab.com/laws/latest/the-field-of-play/).
The 0.11 m ball radius approximates the 68–70 cm circumference in
[IFAB Law 2](https://www.theifab.com/laws/latest/the-ball/).
Whole-ball scoring and ball-out rules are based on
[IFAB Law 10](https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/)
and [Law 9](https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/).
These references inform the implemented subset and do not imply official
certification. Numerical dynamics, short match duration, AI behavior, automatic
restarts and progression targets are original game design choices.

## Testing and deployment evidence

The initial implementation check was recorded **2026-11-04T04:53:47+01:00** on a
working tree based on `0b83cef21788fc6d2b06e2aaf47041af4a8e4e05`. Subsequent
[CI run 41770210966](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41770210966)
succeeded at **`484141c50acfebe5526085fd983b7964a2b02e44`**, passing all nine
browser tests across the covered games and catalog. Its completion metadata was
updated at **2026-11-04T05:01:28+01:00**. Current candidate and deployment
receipts belong in the authoritative
[project status](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/blob/main/PROJECT_STATUS.md).

| Evidence | Procedure | Outcome at this checkpoint |
| --- | --- | --- |
| Unit and logic integration | `node --test --test-reporter=tap tests/football.test.js` | **16 tests passed**: all 10,000 configs; 11v11 roster; selection without teleport; pass possession; whole-ball goals; missed shots; frame collisions; saves; throw-ins; delta-time equivalence; pause; full-time targets; finite unattended match; input-only complete win; own goals; corners. |
| Syntax | `node --check game11/app.js` and `node --check game11/scene.js` | Passed before handoff. |
| Scene construction | Import `buildFootballScene`, build a real `THREE.Scene`, update with an engine state, inspect geometry bounds/counts in Node | Passed; does not exercise a WebGL context or render a frame. |
| Real-browser match and rendering | Chromium/SwiftShader in CI run 41770210966 | Passed: movement, shot input, pause and full-time completion with no page errors. Inspected frame showed a 4–0 win and level 2 unlocked. The separate native cloud preview has GL disabled and was not the source of this render evidence. |
| 4K frame | Read actual drawing buffer/error; inspect screenshot | Passed at `484141c50acfebe5526085fd983b7964a2b02e44`: `[3840, 2160, 0]` and inspected `football-4k.png`. |
| Responsive entry and focus | 390 px browser viewport; reduced-motion preference; keyboard entry | Passed in the same run; this does not establish physical touch or full assistive-technology play. |
| Hardware / accessibility qualification | Device benchmarks, contrast and assistive/touch checks | **NOT TESTED** for sustained hardware FPS, physical touch, measured contrast or complete screen-reader play. |
| Pages path | `/AdigunGamesBank/game11/` | Final deployment verification pending. |
| Public URL | https://hephzibahbehulahhq.github.io/AdigunGamesBank/game11/ | Public verification of the final deployed revision remains pending. |

## Adopted standards and acceptance

- Policy: **HB-AI-ENGINEERING-001 v2.0**, immutable commit `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`.
- Design system: immutable commit `52f01f9986d97088413ca9785bc7a2d3f2967123`.
- Shared components: `shared/game.css`, `shared/tokens.css`, `shared/three-stage.js`, `shared/progression.js`.
- Tokens used: Midnight Navy `#0B1220`, Royal Blue `#2563EB`, Metallic Gold `#D4AF37`, Ivory White `#F8FAFC`, Electric Cyan `#22D3EE`, Copper Orange `#F97316`; accessible muted text uses the explicitly adopted brighter secondary token.
- Full production acceptance: **In progress**. The recorded 4K frame and browser match are verified milestones. Sustained hardware performance, exhaustive level playtesting, complete accessibility, fuller football rules, multiplayer and native PlayStation release are not established by those checks.
