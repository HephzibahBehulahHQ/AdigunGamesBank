# Electronicer

**Genre:** electrical construction, measurement and circuit commissioning.
**Platform:** desktop and mobile browsers with WebGL 2.
**Owner/division:** Hephzibah Behulah / HB Elektroniker.
**Status:** **In progress** toward the full production requirement. The game
implements playable DC circuits; release evidence and remaining qualification
are recorded in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

This replaces the earlier `game3/` quiz with a circuit bench. Select a network,
fit resistor values, connect patch leads, configure contact logic and a fuse,
then energize the source and match the commissioning targets. The meters are
computed from the circuit; they are not authored answer screens.

## Play and progression

Open `game3/` through an HTTP server. The first task uses a series circuit with
a 3 V source, 100 Ω R1 and R2, a 25 mA fuse, a direct contact link and both
resistor leads connected. Turn power on, inspect the 15 mA supply current and
1.5 V drop across R1, then verify the circuit to unlock level 2.

There are **10,000 deterministic commissioning tasks** across five tiers:

| Levels | Tier | Circuit / additional behavior |
| --- | --- | --- |
| 1–2,000 | Beginner | Two series resistors; total current and voltage drop |
| 2,001–4,000 | Apprentice | Two parallel branches; supply and branch currents |
| 4,001–6,000 | Skilled | Loaded divider; branch current, node voltage, AND contacts |
| 6,001–8,000 | Expert | Parallel branch containing two series resistors; OR contacts |
| 8,001–10,000 | Professional Master | Four-resistor mixed network, multiple meter targets, AND/OR contacts |

An invertible permutation assigns distinct source/resistor tuples. Uniqueness is
tested on the actual wiring, source, contact logic, fuse limit and meter targets,
excluding level names and IDs. Every generated reference solution is checked by
the electrical solver and independent closed-form resistance calculations.
These are **automated validity checks**, not a claim of 10,000 manual playtests
or 10,000 separately authored games.

Completed levels and the current bench settings save locally. Replay is limited
to unlocked levels. Restored benches start with power off. Storage failure falls
back to session play and is disclosed in the interface. No accounts, cloud saves
or personal data collection are implemented here.

## Controls and accessibility

- Keyboard, mouse and touch operate all labelled native controls. Tab moves
  through controls; Enter/Space activate buttons and checkbox switches.
- With the 3D view focused, arrow keys rotate the view, `+`/`−` zoom and `1`–`4`
  connect or disconnect active resistor leads.
- Drag the view to orbit; tap a resistor to toggle its lead. Separate **Top
  view** and **Bench view** buttons provide direct camera choices.
- **Reset this level**, **Show wiring guidance**, **Verify circuit targets**
  and **Next level** support the complete play/retry/progression flow.
- Native labels, focus outlines, live status messages, textual meter/target
  equivalents and a measurement table accompany the canvas. Gameplay does not
  depend on color or interpreting the rendered scene alone.
- There is no automatic camera motion. Shared reduced-motion rules suppress
  optional transitions; user-requested camera movement remains available.
- Responsive layout switches the control panel below the scene. Complete
  German, Yoruba and Nigerian Pidgin localization remains outstanding; the
  implemented interface is English and does not expose a nonfunctional selector.

## Electrical model and references

`circuit.js` solves a conductance matrix for the unknown node voltages. It
derives resistor currents and power from the solved voltages. Open leads are
removed from the circuit. Isolated passive islands carry zero current; their
absolute voltage is undefined, with 0 V used as a display reference.

Assumptions: ideal 3–15 V DC source, ideal zero-resistance wires, ohmic resistors
with exact selected values, ideal switch contacts and instantaneous opening when
source current exceeds the selected fuse rating. A blown fuse latches until
replaced with the source off. Resistors use a 5 W model; generated solutions are
checked to remain below that power. The 25% fuse margin is a challenge rule,
not a manufacturer rating or a physical-installation design standard.

Temperature, tolerances, AC, transients, nonlinear components, parasitics and
manufacturer fuse time/current curves are not modeled. This is a numerical
learning game, not hardware testing, safety certification or real mains wiring
instruction.

Technical references, verified 2026-11-04:

- [OpenStax, University Physics Volume 2, §10.2: Resistors in Series and Parallel](https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel).
- [OpenStax, University Physics Volume 2, §10.3: Kirchhoff’s Rules](https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules).

## 3D, 4K and performance

`bench.js` builds an actual Three.js scene: bench supply, digital readouts,
patchboard, axial resistor bodies and bands, terminals, insulated cables,
switch contacts and a glass fuse. Geometry, material definitions and label
textures are original programmatic assets. Wiring and instrument values reflect
the current solved configuration.

The shared renderer offers adaptive, 1920 × 1080 and 3840 × 2160 drawing buffers.
**4K acceptance requires an observed 3840 × 2160 buffer and inspected frame** on
the recorded runtime; a menu option does not establish that verification.
Refer to the project status for the actual graphics/browser evidence.

Loading target: first usable bench within **3 seconds** on a desktop with WebGL
2, a 10 Mbit/s connection and a cold cache. This is a target, not a measured
claim. The catalog does not need to load this game's 3D runtime; it loads on the
game route. There are no external model/texture downloads. The static bench
renders on interaction, changes or resize rather than running continuous idle
animation. Broad mobile/GPU load and frame-time qualification remains pending.

## Asset rights and standards

| Material | Provenance / rights |
| --- | --- |
| Circuit solver, generated tasks and bench geometry | Original implementation in this repository |
| Labels and component markings | Original programmatic canvas textures; system fonts |
| Corporate image | Owner-approved artwork copied unchanged from pinned hb-design-system; see [standards](../docs/STANDARDS.md) |
| Three.js | Shared vendored dependency; retain its supplied MIT license |
| Audio and external models | None used |

Policy: **HB-AI-ENGINEERING-001 · v2.0** at
`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`. Design system:
`52f01f9986d97088413ca9785bc7a2d3f2967123`. UI tokens: Midnight Navy `#0B1220`,
Royal Blue `#2563EB`, Metallic Gold `#D4AF37`, Ivory White `#F8FAFC`, Slate Grey
`#64748B` and Elektroniker Electric Cyan `#22D3EE`; contrast-appropriate muted
text is documented in the shared token stylesheet.

## Verification and deployment

| Check | Evidence |
| --- | --- |
| Unit/model/integration | `node --test tests/electronicer.test.js`: seven tests passed during implementation, including all 10,000 solutions, uniqueness, independent formulas, KCL/power balance, every open-lead mask, contacts, fuse behavior and failure cases |
| JavaScript syntax | `node --check game3/app.js` and `node --check game3/bench.js` passed during implementation |
| Browser play, storage and errors | Root browser suite; exact candidate and result belong in project status |
| 4K drawing buffer and visual inspection | Record actual runtime/frame evidence before claiming confirmation |
| Accessibility, responsive and performance qualification | Record tested coverage and remaining limitations in project status |
| GitHub Pages path | `/AdigunGamesBank/game3/` |
| Public URL | https://hephzibahbehulahhq.github.io/AdigunGamesBank/game3/ |
| Deployed revision and verified public play | See project status; a URL in documentation is not a deployment receipt |

No native PlayStation or other console release is claimed. Fully localized,
cross-device production qualification remains part of the broader project.
