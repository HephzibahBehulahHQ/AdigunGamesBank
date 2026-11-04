# PENALTY PRO

## Integration evidence — 4 November 2026

The implementation at **`10e3b16af8c314379e540da65b8aa7da0f536775`** passed this game’s actual **3840 × 2160 WebGL2** drawing-buffer check (zero GL error), real-control completion, saved progression and fallback scenarios in [CI 41926291553](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). The integration owner inspected the original captured scene. [Immutable measured/frame receipt](../docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

The whole run passed **269 JavaScript, 52 API and 67/69 browser checks**. Its only failures were advanced narrow-screen layouts in Circuit Rush and Binary Flash; those styles are now corrected and await the final exact-candidate gate. This is development rendering evidence, with hardware performance, physical devices, complete assistive-technology play and production qualification still open. Current release/publication state belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).


## Identity and scope

| Field | Record |
| --- | --- |
| Stable ID / source | `game17` · `game17/` |
| Genre | Ballistic penalty shooting and goalkeeper placement simulation |
| Owner | Hephzibah Behulah · Adigun Game Bank; cross-division corporate foundation |
| Platform | Browser; actual 3D requires WebGL 2, equivalent command play does not |
| Status | **In progress** · implemented ten-turn campaign; production acceptance remains open |
| Outstanding qualification | Exact-candidate browser/rendering evidence, hardware performance, physical touch and assistive-technology play, full localization and production art review |

Take five penalties, then control the goalkeeper against five opposition shots.
Your shot uses horizontal aim, elevation and power. Your goalkeeper uses dive
position, height and delay after the kick. Both roles use the same physical ball
and body-contact rules; saves and goals are not probability rolls. The opponent
is original deterministic local game logic, with readable preparation cues.
There is no external AI service.

The challenge clears after all ten attempts when your score exceeds the
opposition's and reaches the level's minimum goal target. A draw requires a
retry. Winning the score below the target does not unlock a level. A goalkeeper
save never increases the opponent's score. Retry restores the same deterministic
challenge, and completed earlier challenges remain available.

This replaces the active legacy direction/probability game. `engine.js` and its
seven `test.js` checks are retained as historical compatibility code; the live
page imports **`penalty-engine.js`**. Existing games 18–21 consume `style.css`, so
that inherited stylesheet remains unchanged. The rewritten page uses
**`penalty.css`**.

## Physics, football references and deliberate limits

The geometry follows [IFAB Law 1: The Field of Play](https://www.theifab.com/laws/latest/the-field-of-play/),
checked on **2026-11-04**: clear opening **7.32 m wide × 2.44 m high**, penalty
mark **11 m** from goal. White frame tubes have 0.06 m radius; their centre lines
sit outside the clear opening. Goalkeeper preparation uses the goal line before
the kick, following the relevant starting position in
[IFAB Law 14: The Penalty Kick](https://www.theifab.com/laws/latest/the-penalty-kick/).
These references establish selected geometry and starting rules, not full IFAB
shootout compliance or endorsement.

| Model | Implemented assumption |
| --- | --- |
| Ball | Sphere, radius 0.11 m |
| Power | Launch speed `8 + 0.24 × power` m/s; 25–100%, further limited by each challenge |
| Launch | Horizontal angle −24° to +24°; elevation 0° to 28° |
| Airborne motion | Constant vertical acceleration −9.81 m/s² and the displayed lateral acceleration; no spin or aerodynamic drag |
| Grass | Vertical motion settles at the ball radius. Landing retains 80% horizontal speed, then rolling friction decelerates at 1.7 m/s². A ball launched along the grass has no landing-speed penalty |
| Goalkeeper | Moving capsules for torso, arms, gloves, legs and head; visible body segments share the engine's endpoints and radii |
| Opponent keeper | Advertised left/right commitment, high/low posture, varied start offset, reaction delay and dive duration |
| Player keeper | Target centre −3.4 m to +3.4 m, low/chest-high dive and 50–300 ms delay; 0.2 s dive movement |
| Collision | Bounded flight-window sampling followed by bisection of first body/frame contact; independent of render-frame step size |
| Goal | Entire ball crosses the goal plane inside the clear opening, with no earlier keeper/frame contact |
| Outcome | Goal, keeper save, post/crossbar contact or miss. The first physical event ends that attempt |

Crosswind is deliberately reported as acceleration in **m/s²**, not an invented
weather-speed reading. The gold aiming sight shows the launch line; it does not
compensate gravity or wind. In goalkeeper mode it marks the selected dive centre.
Study pace slows visual playback; it leaves the physical trajectory and result
unchanged. A hidden tab pauses flight. Pause/resume preserves the exact shot.

This training format takes all five player shots before all five opposition
shots. It does not model alternating official shootouts, sudden death, VAR,
encroachment, fouls, contested rebounds, spin or full-body motion capture.
Frame hits and saves end the kick without a rebound attempt. Grass settlement
and capsule bodies are explicit approximations. It is not a licensed club,
professional player likeness or complete football officiating simulation.

## Rendering and level structure

| Requirement | Implementation / evidence |
| --- | --- |
| Actual 3D | `scene.js` uses the shared Three.js WebGL 2 stage. Original goal tubes, three-dimensional nets, striped training pitch, ball panels, seated stand, floodlight structures and two capsule-based players |
| 4K | Adaptive, 1080p and 3840 × 2160 options use actual renderer size. **Confirmed in integration CI as recorded above**; exact buffer plus screenshot verification is in `tests/browser/penalty.spec.js` for root/CI execution |
| Hardware performance | **NOT TESTED**. Software renderer results must not be reported as gaming-GPU qualification |
| Levels | 10,000 deterministic physical configurations, generator version 1, sequential campaign |
| Difficulty | Five tiers of 2,000 levels: Beginner, Apprentice, Skilled, Expert, Professional Master. Goal target advances 3 → 4 → 5; wind ranges expand, available shot power decreases and keeper reactions accelerate |
| Authorship | One individually designed game. Parameters and opponent placements are reproducible procedural content, not 10,000 individually authored stories or separate titles |
| Distinctness | Test compares physical kick/opponent configurations, excluding level names and IDs; all 10,000 unique |
| Solvability | All 10,000 campaigns completed in numerical tests using public shot, dive, next-kick and stepping functions: 50,000 physically resolved player goals and 50,000 physical saves. No score mutation or forced-win hook |
| Manual playtests | **NOT CLAIMED** for all levels. Numerical solvability does not prove every level is enjoyable or human difficulty is balanced |

## Controls, persistence and accessibility

Mouse and touch use native sliders, placement shortcuts, dive buttons and the
Shoot/Face penalty controls. Both roles have complete visible command controls.
If WebGL cannot start or loses its context, command play retains the same
engine, score, keeper scouting, numerical telemetry and progression; the page
does not claim 3D availability in that mode.

| Input | Shooting | Goalkeeping |
| --- | --- | --- |
| Left/right arrows on focused pitch | Horizontal aim ±0.5° | Dive position ±0.1 m |
| Up/down arrows | Shot elevation ±0.5° | Chest-high / low dive |
| W / S | Power ±1% | Earlier / later dive delay by 10 ms |
| Space | Shoot penalty | Face penalty |
| Escape | Pause/resume flight | Pause/resume flight |
| N / R | Next kick / retry challenge | Next kick / retry challenge |

All commands also remain available through Tab and ordinary native controls;
keyboard commands are scoped to the pitch and do not intercept typing in other
controls. Role changes retain a predictable camera: left/right always mean the
view from the penalty spot. The blue kit identifies the player-controlled role.
Reduced motion suppresses the decorative striker lean; essential ball/dive
movement remains. Results and state changes use status announcements, explicit
labels and score text; colour is not the only feedback.

Saved data lives in browser storage at
`adigun.campaign.v1.penalty-pro`: `{version:1, completed, unlocked}`. Only a fully
qualifying result triggers completion. Reload begins the highest unlocked
challenge; unfinished attempts are not saved. Sequential validation, corrupted
records, cross-tab refresh and final-level semantics use shared progression.
The UI reads back the stored record before saying it saved. Blocked or silently
rejected writes retain session progress with an explicit warning. There are no
accounts, uploaded prompts, cloud saves or score-network requests.

**English is implemented.** Complete German, Yoruba and Nigerian Pidgin strings
and human language review remain unfinished. Physical touch, voice input,
gamepad mapping and full screen-reader play are **NOT TESTED**. Browser tests
cover the starting controls, the separate goalkeeper controls, 320/390 px
layouts, focus, reduced motion and WCAG 2.1 A/AA automated audits without rule
exclusions; root records their actual execution results.

## Loading, assets and rights

The index loads only this game's engine/application. Three.js and the scene are
dynamically imported when entering this title. The vendored Three.js module is
748,863 uncompressed bytes; the new engine, application, scene, stylesheet and
HTML together are approximately 59 KB before transport compression at this
checkpoint. No remote art/font download is required for play. A missing graphics
module leaves command play usable; reloading retries the graphics load.

Initial playable target: **under 3,000 ms** on a recorded desktop Chromium/WebGL
2 device, cold cache and a 10 Mbps connection. **NOT MEASURED** in this change;
this is an acceptance target, not a performance result. Root/CI rendering checks
do not substitute for physical-device frame-time distributions.

| Asset | Origin / rights | Attribution / limitation |
| --- | --- | --- |
| Pitch, goal, net, stands and lights | Original procedural geometry written for this project | No external stadium models or marks |
| Players, kit and club name | Original capsule geometry, original colour assignments and fictional Adigun Athletic | No real player likeness, league badge or licensed kit |
| Ball | Original sphere and geometric pentagonal panels | Generic unbranded football |
| Stadium signs | Original text painted into runtime textures | No generated replacement corporate logo |
| Corporate logo | Existing approved design-system artwork; provenance in `ASSETS.md` and `docs/STANDARDS.md` | Reused unchanged |
| Three.js | Existing vendored dependency and its MIT notice | Shared dependency; preserve its notice |
| Font | System fallback stack | No downloaded proprietary font file |
| Audio | None | No audio rights claim or silent sound control |

## Verification record

Local command on the **working candidate**, completed **2026-11-04T22:57:43+01:00**:

```sh
node --test tests/penalty.test.js game17/test.js
```

**20 passed, zero failed/skipped:** 13 new physical/campaign tests plus seven
retained legacy compatibility tests. The full 10,000-campaign numerical check
took about 15.5 s in this local run. This is a working-tree observation, not an
immutable source or deployment receipt. Root must record the tested candidate
SHA and any later rerun before acceptance.

| Verification | Current evidence |
| --- | --- |
| Engine / numerical tests | Local pass above; dimensions, gravity/rolling, wind, goal/frame/body contact, no frame-step tunnelling, pause, score separation, ten-turn roles, draw/loss/win, power bounds, sequential saves, 10,000 complete campaigns |
| JavaScript syntax | `node --check` passed for `app.js`, `scene.js`, `penalty-engine.js` during implementation |
| Browser real play / 4K | **Executed in integration CI above**; three new Playwright flows prepared in `tests/browser/penalty.spec.js` |
| Browser fallback / persistence / reflow | **Executed in integration CI above**; test fixtures explicitly remove WebGL or reject storage. These are failure-path tests, not graphics evidence |
| Physical touch / screen reader / gaming GPU | **NOT TESTED** |
| Exact release / deployment | Root integration owner records in `PROJECT_STATUS.md`; no new publication claimed by this file |

## Standards and acceptance

Policy: **HB-AI-ENGINEERING-001 v2.0**, pinned to
`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`. Design-system pin:
`52f01f9986d97088413ca9785bc7a2d3f2967123`. The page consumes shared corporate
tokens: navy `#0B1220`, royal blue `#2563EB`, gold `#D4AF37`, ivory `#F8FAFC`,
slate/contrast-adjusted muted text and the existing official logo. Football is a
cross-division game; no sixth corporate division is created.

The GitHub Pages route is `/game17/`, with the existing custom-domain route
`https://adigungamesbank.hephzibahbehulah.com/game17/`. Publishing and exact
production verification belong to the integration owner's release gate.
**Status remains In progress.** A playable, numerically verified game does not
establish finished 4K hardware qualification, complete accessibility, full
localization, console certification or the 2,000-game project target.
