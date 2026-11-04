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
corners and goal kicks. Offside involvement, tackle fouls, direct/indirect free
kicks, penalties, yellow/red cards and roster substitutions now affect the real
match. Match time is 120–180 active seconds. The simulation runs fixed
1/60-second steps, processing up to 0.25 seconds per rendered frame; severe
stalls beyond that cap can slow game time. This is a football game with the
explicit rules subset below, not a claim to reproduce every law or a licensed
professional competition.

## Playable rules milestone

- **Offside:** each pass/shot stores the ball position and second-last active
  opponent's line at the kick. A player in their own half, level with that line,
  or behind the ball is onside. Position alone does not stop play: a flagged
  player must touch the ball or challenge its holder. Returning into their own
  half does not erase the original snapshot. Goal-frame rebounds and deliberate
  goalkeeper saves preserve it; deliberate opposing control resets it. Direct
  throw-in, corner and goal-kick receptions are exempt. The receiving player's
  subsequent play creates a normal new snapshot. An offence gives the other
  side an indirect free kick at involvement, with the attacking goal-area
  adjustment. Reference: [IFAB Law 11](https://www.theifab.com/laws/latest/offside/).
- **Contact and discipline:** the player and AI use the same tackle decision.
  A reachable ball-first challenge wins possession; body-first or late contact
  awards a direct free kick, or a penalty inside the offender's penalty area.
  Careless contact carries no automatic card, reckless contact a yellow,
  excessive-force contact a red. A second yellow also sends the player off.
  Clear-chance denial uses goal distance, direction, control and covering
  opponents; a genuine ball challenge inside the area receives the penalty/yellow
  exception. A dismissed player disappears from the pitch, selection, AI and
  collision system. Reference: [IFAB Law 12](https://www.theifab.com/laws/latest/fouls-and-misconduct/).
- **Free kicks and penalties:** opponents are placed at least 9.15 m away for
  free kicks and corners. The penalty ball is 11 m from goal, the keeper begins
  on the goal line, and other players start behind the mark and outside the area.
  Pass/shot input releases the actual physical ball; the outcome still depends
  on aim, flight and keeper contact. A restart taker cannot touch again before
  another player. An indirect kick directly entering the opposing goal gives a
  goal kick; a restart directly entering its own goal gives a corner. References:
  [IFAB Law 13](https://www.theifab.com/laws/latest/free-kicks/) and
  [Law 14](https://www.theifab.com/laws/latest/the-penalty-kick/).
- **Boundary restarts:** the throw-in has a raised two-arm pose and an airborne
  ball release; opponents start at least 2 m away. It cannot score directly.
  Goal kicks start within the goal area with opponents outside the penalty area;
  corners start inside the corner arc. References:
  [IFAB Law 15](https://www.theifab.com/laws/latest/the-throw-in/),
  [Law 16](https://www.theifab.com/laws/latest/the-goal-kick/) and
  [Law 17](https://www.theifab.com/laws/latest/the-corner-kick/).
- **Substitutions:** seven original reserves per side include one goalkeeper.
  The home coach can queue up to five replacements over three stoppages.
  Several changes at the same stoppage consume one opportunity. The outgoing
  identity leaves the active roster; the incoming player has fresh stamina and
  inherits the formation slot, position and control/possession when applicable.
  Used reserves cannot return and dismissed players cannot be replaced. An
  emergency outfielder takes the keeper role after a keeper dismissal; the
  reserve keeper can replace that active player at a stoppage. Fewer than seven
  active players abandons the match without a campaign award or invented score.
  Reference: [IFAB Law 3](https://www.theifab.com/laws/latest/the-players/).

**Deliberate simplifications:** offside uses player body centres rather than
individual permitted body parts. It detects touching/challenging, but does not
model every line-of-sight obstruction or other visual interference. Tackle
classification uses explicit game thresholds: ball reach 1.24 m, reckless actor
speed above 6.8 m/s or relative speed above 8 m/s, excessive relative speed above
13.4 m/s. These are simulation choices, not numeric IFAB laws. Referees do not
model advantage, handball, off-ball misconduct, VAR or every restart infringement.
Penalty kicks use a shot rather than a passed penalty; throw-in foot placement,
keeper time limits and substitution time protocols are not simulated. Stoppages
reposition players immediately; the clock freezes during the 1.1-second setup
and until the actual kick. The AI takes its restart after 0.65 seconds and a
home taker acts automatically after four idle seconds. Kickoffs retain the
existing centre-possession setup. There is one short period, no switching ends,
extra time, shootout, league management or network multiplayer. Reserve controls
are available for the home team; the opponent does not yet manage its bench.

## Rendering and level structure

| Requirement | Implemented behavior and evidence |
| --- | --- |
| 3D | `scene.js` constructs a real Three.js scene: a 105 × 68 metre pitch, original stadium, seating, roofs, lighting, nets, patterned spherical ball and 22 articulated players. An actual rendered frame was inspected from [CI run 41770210966](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41770210966), commit `484141c50acfebe5526085fd983b7964a2b02e44`. |
| Human/ball scale | A constructed player measures about 1.83 m high. Ball radius is 0.11 m; model and collision dimensions use the same value. No circles or flat sprites substitute for players. |
| 4K | The same CI run verified the actual WebGL 2 drawing buffer as **3840 × 2160**, with `getError() === 0`, and produced the inspected `football-4k.png` frame. Auto and 1920 × 1080 remain available. Chromium SwiftShader verifies software-rendered 4K output, not hardware FPS. |
| Rendering budget | Initial-roster source inspection on 2026-11-04 counted approximately 70,948 triangles and 489 mesh objects, including instanced stadium geometry. Incoming substitute models are created only when used; departed/dismissed models are hidden, with at most 22 active rendered players. Cached reserve models are reused on retries. This is a geometry/lifecycle record, not an FPS measurement. |
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
| Restarts | At a free kick, P/Pass or Space/Shoot releases play. At a throw-in, P/Pass throws. At a penalty, J/K/L or the shot-target selector chooses aim and Space/Shoot kicks. Movement and switching wait for the kick. A home restart is taken automatically after four idle seconds. |
| Substitutions | After kickoff, use the labelled Player leaving and Reserve entering selectors, then Queue substitution. The change happens at the next real goal/boundary/foul/offside stoppage; during a stoppage it can happen immediately. Cancel queued removes pending changes. Keyboard, mouse and touch use the same native controls. |
| Pause | Explicit pause and hidden-tab/window-blur pause freeze simulation and clear held input. Resume does not advance missed background time. |
| Accessible feedback | Visible focus, named buttons/selectors, a focusable canvas, text score/time/possession, restart/card/substitution announcements, active-player counts and a visible pitch-coordinate readout. Coordinates use metres from centre: +x attacks right, −y is the far touchline. |
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

The later [successful run 41771833545](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41771833545)
at `1002ca420bd76b10e94f29fd916374dfb13ed5f7` passed all **11 browser tests**
across the expanded suite. Its inspected football full-time frame showed a
**3–0 win**; the earlier **4–0** receipt above applies to commit `484141c50acfebe5526085fd983b7964a2b02e44`.

| Evidence | Procedure | Outcome at this checkpoint |
| --- | --- | --- |
| Unit and logic integration | `node --test tests/football.test.js tests/football-rules.test.js` | **37 tests passed** on 2026-11-04 during the rules milestone: all 16 prior checks, including all 10,000 configurations and input-only full-match victory, plus 21 rule/roster/scene checks covering offside timing and involvement, exemptions, rebound/save persistence, fouls/cards, playable free kicks, a physically scored penalty, minimum team size, restart restrictions and placement, swept keeper save, substitutions/limits and visible model replacement/removal. Latest scoped verification used the working tree based on `8304cd89e3e13abdc388407bafa1104fffec4aff`; exact final candidate and CI results remain in project status. |
| Save resilience | `node --test tests/app-resilience.test.cjs` | All **5** cross-game checks passed alongside the 37 football checks, including football saved-vs-session-only reporting. |
| New UI/rules browser evidence | Real-input full match plus queued/cancelled/applied substitution and roster replacement | **Passed** in CI 41789834075 at `2bfd8bf`; inspected 4–0 result, one substitution and level 2 unlock. [Receipt](../docs/evidence/2026-11-04-wave2/README.md). |
| Syntax | `node --check game11/app.js` and `node --check game11/scene.js` | Passed before handoff. |
| Scene construction | Import `buildFootballScene`, build a real `THREE.Scene`, update with an engine state, inspect geometry bounds/counts in Node | Passed; does not exercise a WebGL context or render a frame. |
| Real-browser match and rendering | Chromium/SwiftShader in CI run 41770210966 | Passed: movement, shot input, pause and full-time completion with no page errors. Inspected frame showed a 4–0 win and level 2 unlocked. The separate native cloud preview has GL disabled and was not the source of this render evidence. |
| 4K frame | Read actual drawing buffer/error; inspect screenshot | Passed at `484141c50acfebe5526085fd983b7964a2b02e44`: `[3840, 2160, 0]` and inspected `football-4k.png`. |
| Responsive entry and focus | 390 px browser viewport; reduced-motion preference; keyboard entry | Passed in the same run; this does not establish physical touch or full assistive-technology play. |
| Hardware / accessibility qualification | Device benchmarks, contrast and assistive/touch checks | **NOT TESTED** for sustained hardware FPS, physical touch, measured contrast or complete screen-reader play. |
| Pages path | `/AdigunGamesBank/game11/` | Published development milestone at `b9db74c1406b44d47afb48c219548f2bdc7d4434`. |
| Public URL | https://adigungamesbank.hephzibahbehulah.com/game11/ | HTTP 200 and exact candidate bytes verified; see the [deployment receipt](../docs/evidence/2026-11-04/deployment-b9db74c.json). |

## Adopted standards and acceptance

- Policy: **HB-AI-ENGINEERING-001 v2.0**, immutable commit `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`.
- Design system: immutable commit `52f01f9986d97088413ca9785bc7a2d3f2967123`.
- Shared components: `shared/game.css`, `shared/tokens.css`, `shared/three-stage.js`, `shared/progression.js`.
- Tokens used: Midnight Navy `#0B1220`, Royal Blue `#2563EB`, Metallic Gold `#D4AF37`, Ivory White `#F8FAFC`, Electric Cyan `#22D3EE`, Copper Orange `#F97316`; accessible muted text uses the explicitly adopted brighter secondary token.
- Full production acceptance: **In progress**. The recorded 4K frame and browser match are verified milestones. Sustained hardware performance, exhaustive level playtesting, complete accessibility, fuller football rules, multiplayer and native PlayStation release are not established by those checks.
