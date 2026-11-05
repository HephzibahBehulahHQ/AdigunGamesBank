# Capacitor Charge — The Transient Lab

## Published milestone — 5 November 2026 (Europe/Berlin)

Source **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** passed the complete repository gate: **269 JavaScript, 52 API and 69 browser checks** in [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881). This game’s actual **3840 × 2160 WebGL 2** buffer, genuine-control completion, save/reload and fallback scenarios passed. [Successful exact-source receipt](../docs/evidence/2026-11-04-nine-games/verification-5547a53.json).

The release completed [Pages publication](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41936442011); **115/115 selected public files matched exactly**, including this game’s entry and JavaScript/CSS. [Public-source receipt](../docs/evidence/2026-11-04-nine-games/deployment-5547a53.json). Original inspected scene frames retain their earlier 10e3b16 provenance in the [evidence index](../docs/evidence/2026-11-04-nine-games/README.md).

Hardware performance, physical devices, complete assistive-technology play, language coverage and production qualification remain open. Current acceptance belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Identity and playable scope

| Field | Record |
| --- | --- |
| Stable title / ID | Capacitor Charge / `capacitor-charge`; existing catalog route `game6/` |
| Genre | RC component selection, timed switching and energy commissioning |
| Owner / division | Hephzibah Behulah · HB Elektroniker |
| Target platform | Modern desktop/mobile browser; WebGL 2 for the original 3D laboratory. No native-console release is claimed. |
| Source | `campaign.js`, `engine.js`, `app.js`, `scene.js`, `index.html`, `style.css` |
| Status | **In progress:** complete playable implementation and local numerical verification; release and deployment evidence remain owned by [PROJECT_STATUS.md](../PROJECT_STATUS.md). |

Fit a capacitor bank, a charge resistor and a discharge resistor. Predict the
resulting time constant and stored energy, then operate the circuit switches:

1. Charge through R1 and capture the required **voltage and energy** windows.
2. Open the source and pass a timed **leakage hold** above the voltage floor.
3. Discharge through R2 to the stated release voltage, within the current,
   resistor-power and discharge-time limits.

An early/late capture, wrong stored energy, excessive current/power, overvoltage,
voltage droop or missed deadline stops the trial without awarding completion.
Reset retains component choices but starts a fresh virtual experiment at zero
charge. Successful discharge unlocks the next experiment.

The hold stage pauses automatically at its final measurement. The player then
starts the discharge test. This is an explicit **simulation pause**; the game
does not claim that real leakage physically stops. Manual pause and 0.1-second
advancement operate the same electrical solver and allow precise keyboard/touch
play without a reflex requirement.

This replaces the route's former percentage-meter game with component-dependent
RC physics, three switch topologies, real thresholds and a full commissioning
sequence. Old percentage-game progress is not reinterpreted as completing these
new experiments. This remains one title, not 10,000 separate games.

## Electrical model and independent reference

Units inside the solver are volts, amperes, ohms, farads, seconds and joules.
The interface additionally uses microfarads, milliamperes and millijoules.
The source is ideal DC at 5, 9, 12, 18 or 24 V. A fixed leakage resistance is
always included across the capacitor in active simulation time.

Let `Rparallel = (Ra × Rb) / (Ra + Rb)`. For each switch topology the solver uses
`V(t + Δt) = V∞ + (V(t) − V∞) × exp(−Δt / τ)`:

| Switch state | Asymptote V∞ | Time constant τ | Branch behavior |
| --- | --- | --- | --- |
| Charge | `Vs × Rleak / (R1 + Rleak)` | `C × (R1 || Rleak)` | Source through R1; leakage remains connected |
| Hold | 0 V | `C × Rleak` | Source and R2 disconnected; leakage only |
| Discharge | 0 V | `C × (R2 || Rleak)` | Source disconnected; R2 and leakage in parallel |

Source current is `(Vs − Vc) / R1` when charging. Bleed current is `Vc / R2`
when discharging. Leakage current is `Vc / Rleak`. Capacitor current is their
signed sum. Resistor power is `I²R`, and stored energy is `½CV²`. Threshold-event
times are solved analytically so a large numerical step cannot skip a trip,
hold completion or discharge deadline.

The first experiment provides an independently documented reference:

| Quantity | Value |
| --- | --- |
| Source / bank | 12 V; 2,200 µF = 0.0022 F |
| R1 / R2 / leakage | 1,000 Ω / 680 Ω / 100,000 Ω |
| Initial charge current / R1 power | 12 mA / 0.144 W |
| Charging time constant including leakage | 2.1782178218 s |
| Capture midpoint / energy | 8 V / 70.4 mJ |
| Time to midpoint from zero | 2.4370227635 s |
| Hold | 3 s; endpoint 7.8916495231 V |
| Discharge endpoint / time | 0.5 V after 4.0995160195 s |
| Total active simulation time | 9.5365387831 s |
| Energy remaining at release | 0.275 mJ, not zero |

Current and resistor-power exceedances stop the game instantly; there is no
thermal accumulation or real failure model. Capacitor tolerance, ESR, dielectric
absorption, source internal resistance, temperature and switching transients are
omitted. The fixed leakage element is a model parameter rather than a commercial
capacitor specification. Resistor bodies are unbanded and their printed captions
give the exact modeled resistance in ohms and the selected power rating in watts.
No rounded colour code or physical tolerance is implied; the leakage model has
no invented component power rating. Reset is a virtual restart, not an instruction to short a
physical capacitor. The game is not a procedure for energized equipment.

Primary sources checked on 2026-11-04:

- [OpenStax, University Physics Volume 2 §10.5: RC Circuits](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits), exponential charging/discharging and the RC time constant.
- [OpenStax, University Physics Volume 2 §8.3: Energy Stored in a Capacitor](https://openstax.org/books/university-physics-volume-2/pages/8-3-energy-stored-in-a-capacitor), the stored-energy relation.

The added leakage topology is derived from the same circuit relations. No source
illustration, photograph, textbook passage or exercise is copied into the game.

## Rendering and level structure

| Requirement | Implementation / evidence |
| --- | --- |
| Actual 3D | Existing local Three.js / shared WebGL 2 stage; original DC source, component board, unbanded axial resistors with exact printed-value captions, metal capacitor bank, conductors, source switch, clickable C/H/D keys and a separate voltage indicator. Component choices and actual switch state update the scene. |
| 4K | Selector requests 3840 × 2160 through the shared renderer. The browser test reads the actual drawing buffer and GL error and saves a frame. **The selector is not proof of a verified 4K frame; consult the release receipt.** |
| Levels | **10,000 deterministic physical experiments**, generator version 1; Beginner through Professional Master. |
| Difficulty | Higher tiers narrow the relative voltage window, lengthen the leakage hold and increase leakage. Source voltage, bank/resistor choices, energy window, retention floor and deadlines vary with the experiment. |
| Authored / procedural | Original mechanics, laboratory layout, component families and first reference experiment are authored. A seed generates further physical parameter sets. Every scenario includes an analytically derived reference procedure. |
| Solvability | All 10,000 reference procedures are applied through actual select/start/capture/hold/discharge engine operations. Uniqueness excludes level IDs, names and selector-option ordering. Automated validity is not 10,000 manual playtests or proof of production quality. |
| Progress | Browser-local `adigun.campaign.v1.capacitor-charge`; sequential unlocks and separate final mastery. Corrupted/disabled storage recovers to session play, and feedback confirms the saved record before asserting persistence. Incomplete experiments are not saved. |

## Controls and accessibility

| Input / requirement | Implementation / remaining evidence |
| --- | --- |
| Keyboard | Native labelled selects and buttons. On the scene: C starts charge, H captures/holds, D starts discharge, Space pauses/resumes and right arrow advances a paused circuit by 0.1 s. |
| Mouse / pointer | Component selectors, equivalent switch buttons, raycastable 3D C/H/D keys and two camera views. |
| Touch | The same native controls; main gameplay buttons are at least 44 px high. Physical touch-device testing remains open. |
| Pause / recovery | Manual pause; exact 0.1-second stepping; automatic pause on tab hiding; explicit pause between hold and discharge; reset/refit/retry. |
| Accessible information | Skip link, visible focus, labels, live action/failure messages, explicit switch availability through enabled/disabled buttons, text voltmeter/current/energy readings, target windows, plan meter and SVG trace description. Color and the 3D image are not required to play. |
| Graphics failure | An explicit fallback keeps the same numerical experiment and controls. It is never described as a rendered 3D scene. |
| Reduced motion | No idle camera or decorative animation. State changes follow physical/user changes; site preference suppresses optional CSS effects. |
| Responsive checks | Browser suite authored for 390 px and 320 px, keyboard focus and full WCAG 2.1 A/AA axe tags. Actual results require the integration receipt. |
| Languages | English only in this milestone; complete German, Yoruba and Nigerian Pidgin translation/review remains open. |
| Gamepad / assistive technology | Native gamepad mapping and complete physical screen-reader play **NOT TESTED**. Automated checks are partial evidence only. |

## Loading, performance and original assets

The engine and command controls initialize before the dynamically imported 3D
scene. The existing Three.js bundle loads only on the selected game route. The
scene redraws on state/input changes; it does not continuously render an
unchanged idle laboratory. No external font, image, sound, model API or gameplay
service is required.

Initial-playable target: **3,000 ms**, desktop Chromium, a midrange laptop,
4G-class network and cold cache. This is **not a measured result**. GPU frame-time
profiles, low-end hardware, physical touch and broad browser testing remain
unverified. A software-rendered 4K test does not prove hardware 4K performance.

| Asset / dependency | Provenance and rights |
| --- | --- |
| Laboratory source, board, capacitor, resistors, conductors and switch keys | Original programmatic geometry authored for this Hephzibah Behulah product; no external model or commercial equipment likeness. |
| Labels and voltage trace | Original generated text and exact SVG numerical trace. No source textbook diagrams or images. |
| Three.js | Existing pinned local vendor bundle, MIT license at [`vendor/three/LICENSE`](../vendor/three/LICENSE). |
| Corporate logo | Existing exact official corporate image, unchanged; provenance in [ASSETS.md](../ASSETS.md). |
| Fonts / audio | Device system fonts; no audio assets. |

## Tests and deployment

| Evidence | Procedure | Current record |
| --- | --- | --- |
| Numerical / campaign | `node --test tests/capacitor.test.js` | **15 passed, zero failed/skipped** in the local working tree on 2026-11-04; includes exact printed resistance and power captions across all 10,000 scenarios. |
| Independent physics | Same suite | Normalized exponential reference values, explicit first-experiment current/energy/timing and independent fine-step Euler/Kirchhoff comparison for every topology passed. |
| Full generator | Same suite | All 10,000 normalized physical signatures were distinct, and every reference procedure reached actual `won` after all three stages. |
| Failure / recovery | Same suite | Component locks; incorrect voltage/energy; current, power, voltage, leakage and time failures; exact event thresholds; pause/stepping; reset and sequential/final save boundaries passed. |
| Browser rendering / game flow | `npm run test:browser -- tests/browser/capacitor.spec.js` | Four tests authored; **Verified in integration CI above**. Real 4K buffer, actual component/switch inputs, pause/hold/discharge, save and reload. |
| Browser fallback / accessibility | Same suite | Authored WebGL failure and repaired current trip, 320/390 px reflow, axe/focus and silently rejected campaign storage. No engine, time or completion state is injected. |
| Syntax | `node --check` on new modules/test | Passed locally. |
| Public release | Existing `/game6/` route on GitHub Pages/custom domain | New conversion **NOT VERIFIED PUBLIC** until the exact release revision and public files are verified by the integration owner. |

The exact candidate revision, CI outcomes, inspected frames and deployment
receipt are maintained in [PROJECT_STATUS.md](../PROJECT_STATUS.md). A passing
engine test is not a browser or deployment pass.

## Adopted standards and acceptance

- **HB-AI-ENGINEERING-001 v2.0**, `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`.
- Design-system revision `52f01f9986d97088413ca9785bc7a2d3f2967123`.
- Used tokens: Midnight Navy `#0B1220`, Royal Blue `#2563EB`, Metallic Gold `#D4AF37`, Ivory White `#F8FAFC`, Elektroniker Electric Cyan `#22D3EE`; shared header, controls, typography and focus foundation.
- Acceptance remains **In progress** for the remaining hardware, language and assistive-technology qualification; the recorded release gate passed. Browser support does not establish native PlayStation availability.
