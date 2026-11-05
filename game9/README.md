# GOAL LINE

## Identity and acceptance

| Field | Record |
| --- | --- |
| Stable ID / source | `game9` · `game9/` |
| Genre | Keeper-reading and timing: striker-only penalty training |
| Owner | Hephzibah Behulah · Adigun Game Bank; corporate sport and strategy |
| Target | Browser; WebGL 2 for the 3D scene, equivalent command play without graphics |
| Current stage | **In progress.** Scoped conversion on `work/goal-line-2026-11-05`; local browser milestone verified; final repository gate and publication pending |
| Production qualification | Hardware performance, physical touch, full assistive-technology play, localization and art review remain open |

Current acceptance belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).
This converts an existing title; it adds no catalog filler or separate-game
count. The old `assets/game9.js` is preserved as historical code. The new entry
uses its own `goal-line-engine.js`, not the legacy probability-based result.

## Playable objective and distinct decisions

Take five penalties and reach the challenge's goal target. Read the keeper's
actual position, choose one of nine zones, set shot power and decide when to
kick. One run-up feint per attempt captures the selected zone. After a short
reaction delay the keeper commits to that zone for a visible, finite window.
Change the aim and strike while the commitment is active. Shooting before commitment starts
or after its window expires lets the keeper react to the actual shot instead.
Commitment is sampled when the shot is released: a kick taken within the window
retains that dive through its flight.

The keeper patrols along the line before a shot. Its position changes the
distance and time needed to reach the ball. A visible manual-step command advances preparation and ball flight in
0.10-second increments and allows the same decisions without depending on a player's reaction speed.
Waiting carries no automatic defeat: the cost is losing the one-use feint's
commitment window. Shot power changes travel time and gravity drop. The target
markers are calibrated at 85% power in calm air; they do not promise exact
placement at every power or compensate for crosswind.

Only physical contact can produce a save. Goal-frame contact ends the kick;
the whole ball must cross inside the opening for a goal. Each result remains
visible until the player selects the next kick. All five kicks are taken before
success or defeat is declared. A defeat never unlocks a challenge. Retry starts
the same deterministic configuration.

This is distinct from Penalty Pro's five shooting turns followed by five
player-goalkeeper turns. Goal Line owns its patrol, bait/commit/recovery timing,
state machine, campaign and result log. It reuses only the repository's pure
ballistic and capsule-contact helpers from `game17/penalty-engine.js`. It does
not import that game's scoring or campaign state.

## Football references and numerical assumptions

Selected geometry follows [IFAB Law 1](https://www.theifab.com/laws/latest/the-field-of-play/):
a 7.32 m by 2.44 m clear opening and a penalty mark 11 m away.
[IFAB Law 14](https://www.theifab.com/laws/latest/the-penalty-kick/) distinguishes
permitted run-up feints from illegal feinting after completing the run-up, and
allows keeper movement along the goal line. Both sources were checked on
**5 November 2026**. These references establish selected geometry and context;
this original training drill does not claim full official-match compliance.

| Model | Implemented assumption |
| --- | --- |
| Units | Metres, seconds; lateral wind is a stated acceleration in m/s² |
| Ball / frame | Ball radius 0.11 m; goal-tube radius 0.06 m outside the clear opening |
| Launch speed | `8 + 0.24 × power` m/s; power 25–100%, subject to each kick's cap |
| Placement zones | Left/centre/right at x = −2.8/0/+2.8 m; high/middle/low at y = 1.95/1.15/0.4 m, analytically calibrated at 85% power in calm air |
| Airborne flight | Constant gravity 9.81 m/s²; displayed lateral acceleration; no spin or aerodynamic drag |
| Grass | Ball settles at its radius; 80% horizontal velocity retained after landing, then rolling deceleration 1.7 m/s² |
| Keeper before kick | Upright lateral patrol/feint shuffle on the line |
| Keeper after kick | Moving capsules for torso, arms, gloves, legs and head; visible geometry shares the collision endpoints/radii |
| Collision | First contact along a bounded sampled sweep, refined by bisection; result is independent of rendering frame size |
| Scoring | First keeper/frame contact or whole-ball crossing ends the attempt; five attempts, target 3–5 goals |

The model does not include contested rebounds, encroachment decisions, VAR,
fouls, alternating official shootouts, sudden death, licensed players or
motion-captured bodies. A run-up feint is a preparation command before the
final kick; no illegal post-run-up stopping is simulated. The keeper's
behaviour is deterministic local game logic, not a live AI service.

## Level structure and verification method

The generator owns **10,000 deterministic configurations**, version 1. There
are five tiers of 2,000 levels: Beginner, Apprentice, Skilled, Expert and
Professional Master. The minimum score progresses 3 → 4 → 5. Later tiers widen
crosswind variation, increase patrol speed and dive speed, shorten reactions
and commitment windows, and reduce available shot power. Every kick has its
own readable conditions.

Tests compare physical kick parameters while excluding title/level labels,
then exercise the public aim, feint, timing-step, shot and next-kick commands.
They check complete five-kick campaigns, not an incremented counter or injected
score. Numerical solvability is not evidence that all 10,000 challenges were
manually played or that human difficulty and enjoyment are fully qualified.
Exact executed commands, counts and immutable source receipts are recorded in
the project status after verification.

## Controls, accessibility and persistence

The interface provides nine named placement buttons, a labelled power control,
keeper readouts, a run-up feint, a manual timing step, shoot, pause/resume,
next-kick and retry. Every required action is available through ordinary
keyboard-accessible native controls. Preparation and flight pause together;
hiding the page pauses active play. Dynamic keeper information is available
as text, and event announcements do not continuously repeat every rendered frame.

The application uses shared campaign validation with a new save key:
`adigun.campaign.v1.goal-line`. It stores only `{version:1, completed, unlocked}`.
Reload resumes the highest unlocked challenge and restarts unfinished kicks.
Old `hbgb.level.v1.game9` counters are not imported as newly earned progression.
Corrupt saves start safely, and failed storage writes retain session progress
with honest feedback. No account, external score endpoint or cloud save is used.

**English is implemented.** German, Yoruba and Nigerian Pidgin translation and
language review remain open. Browser WCAG/keyboard/reflow checks are partial
evidence; physical touch, gamepads and full screen-reader play remain
**NOT TESTED**. Actual execution results belong in the verification record.

## Rendering, loading and rights

The scene uses the shared locally vendored Three.js WebGL 2 stage, with adaptive,
1080p and 3840 × 2160 render settings. The readout describes the actual drawing
buffer. A menu label alone does not establish 4K: buffer measurement and an
inspected rendered frame are required before the catalog marks it verified.
Three.js and the selected scene are imported lazily. A graphics load failure
or context loss leaves the same engine available through command controls.

Initial playable target: under **3,000 ms** on a recorded desktop Chromium/WebGL
2 device with cold cache and a 10 Mbps connection. This is **NOT MEASURED** yet.
Software rendering evidence does not establish gaming-GPU performance.

| Asset | Source / rights |
| --- | --- |
| Pitch, goal, net, ball, keeper and stadium structures | Original procedural geometry authored for this project; no external models, player likenesses or club marks |
| Corporate logo | Existing approved image reused unchanged; provenance in [ASSETS.md](../ASSETS.md) |
| Three.js | Existing local dependency with preserved MIT notice in `vendor/three/LICENSE` |
| Text and materials | Original game copy/materials; no copied sports dataset or live sports feed |
| Typography / audio | System font stack; no downloaded proprietary fonts or audio |

## Verification and publication

[Exact local candidate 1ad5287 receipt](../docs/evidence/2026-11-05-goal-line/verification-1ad5287.json)
and [inspected frames](../docs/evidence/2026-11-05-goal-line/README.md).
`npm run check`, `npm run build` and the six Goal Line browser scenarios passed
on the clean candidate. The full repository CI gate and public verification
are separate release steps; their current state is recorded in PROJECT_STATUS.

| Gate | Current evidence |
| --- | --- |
| Numerical engine | **21/21 Goal Line tests passed**; all 10,000 distinct configurations complete through 50,000 public-command kicks. Full local JavaScript suite290/290 and backend52/52 passed |
| Genuine-control browser completion / failure / save | **6/6 scenarios passed** at 1ad5287: real-control win/save/reload, keyboard failure/retry, rejected storage, final mastery, context loss and real time |
| Actual 4K frame / zero GL error | **3840×2160 WebGL2, GL error 0**, with an inspected original frame at 1ad5287;1080p also reports1920×1080 |
| Accessibility / reflow / storage failures | **Passed** in the scoped browser suite:320/390px, keyboard focus, WCAG2.1 A/AA automated audit without rule exclusions, corrupt legacy/save data and blocked writes |
| Hardware / physical touch / screen reader | **NOT TESTED** |
| Publication | New conversion **NOT DEPLOYED** at this checkpoint; existing legacy route remains public |

Route: `/game9/` at the existing Pages/custom-domain host. Integration requires
the repository release gate against the exact candidate, followed by successful
Pages publication and exact public-source comparison.

## Adopted standards

Policy: **HB-AI-ENGINEERING-001 v2.0**, pinned to
`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`. Design-system pin:
`52f01f9986d97088413ca9785bc7a2d3f2967123`. The page consumes corporate navy
`#0B1220`, royal blue `#2563EB`, gold `#D4AF37` and ivory `#F8FAFC`, plus
contrast-appropriate muted text. Football is a cross-division game; no sixth
corporate division is created. Status remains **In progress** until broader
production qualification is complete.
