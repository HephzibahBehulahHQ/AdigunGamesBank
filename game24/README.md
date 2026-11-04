# Genesis Ark Commissioning

**Status: In progress. Acceptance: NOT ACCEPTED.** Stable game ID: `game24`.

This game is being built as an ark cargo, ballast, and launch simulation inspired by Genesis 6–9. Players prepare a load plan, inspect its buoyancy and balance, make corrections, and attempt a controlled launch. Cargo position, total load, and ballast must affect the result. The intended challenge is physical commissioning through experimentation; the Scripture references provide the narrative setting.

This is an implementation checkpoint. The final displayed title, control mappings, campaign factorization, equations, and save schema will be reconciled with the implementation. **No gameplay, browser, 4K, performance, or public deployment acceptance is claimed by this document.**

## 1. Identity and scope

| Field | Specification / current evidence |
| --- | --- |
| Product / title | AdigunGamesBank / Genesis Ark Commissioning (working title) |
| Stable ID / source | `game24` / `game24/` |
| Owner | Hephzibah Behulah |
| Relevant divisions | HB Evangelism: Scripture context; HB Elektroniker: engineering learning; HB Artificial Intelligence: deterministic challenge generation |
| Genre | Cargo planning, hydrostatics, and launch simulation |
| Distinct mechanics | Place and redistribute cargo; adjust ballast; interpret displacement, freeboard, heel, and trim; satisfy commissioning constraints before launch. Implementation verification pending. |
| Platforms | Browser delivery is intended. Desktop, keyboard, pointer, touch, and mobile support require verification. Console distribution or platform approval is not claimed. |
| Delivery state | In progress; implementation, independent review, candidate CI evidence, and public verification remain open. |

### Objective, choices, and outcomes

The intended loop is to inspect a challenge manifest and hull limits, place the required cargo, adjust the load or ballast, and inspect the resulting vessel condition. The player chooses how to distribute weight and how much ballast to carry. A successful launch must depend on the challenge's physical limits, including adequate freeboard and acceptable balance. A failed check should identify an actionable reason, let the player revise the plan, and support a clear restart. Exact thresholds, scoring, stage boundaries, and unlock behavior are pending reconciliation with the code.

The campaign must offer 10,000 materially different, reproducible challenges. Repeated question wording, a relabeled counter, or cosmetic changes alone do not establish a distinct physical challenge. The scope is commissioning and launch; any flood journey or covenant epilogue is an original narrative adaptation and must remain distinguishable from the simulated engineering rules.

## 2. Rendering, campaign, and persistence

| Requirement | Target / current verification |
| --- | --- |
| Actual 3D | A rendered hull, cargo, water, and camera view are intended. Renderer, geometry, lighting, camera behavior, and inspected frame: **NOT CONFIRMED**. |
| Actual 4K | A real `3840 × 2160` drawing buffer and inspected rendered frame are required. Browser/device, exact command, candidate SHA, drawing-buffer measurement, and frame receipt: **NOT CONFIRMED**. CSS size, an upscale, or a resolution menu do not prove this. |
| Campaign count | 10,000 challenge variants required; implemented count and validated count: **NOT CONFIRMED**. |
| Progression | Beginner through Professional Master. Exact tier boundaries, parameter ranges, and milestones await the implemented generator. |
| Authored / procedural structure | Original narrative and commissioning rules with deterministic physical variants are intended. Exact factorization, seed mapping, generator version, and uniqueness check: **NOT CONFIRMED**. |
| Solvability | Every generated challenge must have a valid reachable plan. Constructive witnesses, boundary cases, automated campaign checks, and sampled complete playthroughs: **NOT TESTED**. |
| Numerical behavior | Bounded inputs, finite outputs, stable time stepping, and meaningful failure limits: **NOT TESTED**. |
| Save behavior | Storage location, key, schema/version, migrations, challenge identity, resume behavior, and corrupted-save recovery: **NOT CONFIRMED**. |
| Privacy | Local-only progress is intended; actual storage/network behavior must be inspected before making a privacy claim. |
| Performance evidence | Named hardware, browser version, resolution/settings, scene, frame-time distribution, and memory behavior: **NOT TESTED**. |

A generator count does not establish that all 10,000 challenges have been played by people, are enjoyable, or are well balanced. Automated uniqueness and solvability evidence must be reported separately from human playtesting.

## 3. Controls and accessibility

| Input / requirement | Target / current verification |
| --- | --- |
| Keyboard | Complete challenge selection, cargo/ballast editing, launch, pause, resume, and restart with visible focus. Exact key mappings and focus order: **NOT TESTED**. |
| Pointer | Clear cargo selection/placement and commissioning controls; camera interaction must not prevent controls from working. **NOT TESTED**. |
| Touch | Reachable controls, clear selection state, and targets of at least `44 × 44` CSS pixels where practical. Gestures, scrolling, and small-screen layouts: **NOT TESTED**. |
| Gamepad | No support claim; mapping and tested devices: **NOT CONFIRMED**. |
| Screen readers | Named controls, instructions, readable manifests/results, and status announcements are required. The 3D scene needs a useful textual account of the physical state. Actual coverage and limitations: **NOT TESTED**. |
| Contrast and focus | WCAG 2.2 AA contrast targets; no color-only pass/fail information; visible focus on all interactive controls. Measurements: **NOT TESTED**. |
| Reduced motion | Respect `prefers-reduced-motion` for decorative camera/water motion and transitions without hiding necessary physical-state information. **NOT TESTED**. |
| Responsive layout | Planned checks at `360 × 800`, `768 × 1024`, `1366 × 768`, and `1920 × 1080`, including landscape where appropriate. Overflow, orientation, zoom, and touch coverage: **NOT TESTED**. |
| Pause and lifecycle | Pause/restart, tab visibility, held input, repeated initialization, and completion/failure transitions: **NOT TESTED**. |
| English / German / Yoruba / Nigerian Pidgin | Supported languages, translated string coverage, correct language metadata, fallback behavior, and native-speaker review: **NOT CONFIRMED**. |

Controls listed here are requirements, not evidence that a particular key or gesture is already implemented. The final controls table must match the shipped controls and their help text.

## 4. Loading and performance targets

These are proposed engineering targets, **not measurements**. They may be revised with the delivery owner when the implementation and measurement environment are known.

| Target | Measurement conditions / status |
| --- | --- |
| First playable ≤ 5 seconds | Cold cache; 20 Mbps downlink; 50 ms round-trip latency; four-core laptop with 8 GB RAM and integrated GPU; current stable Chromium. **NOT TESTED**. |
| Normal play frame times | At `1920 × 1080`, median ≤ 16.7 ms and 95th percentile ≤ 33.3 ms over a representative 60-second active scene on the named laptop. **NOT TESTED**. |
| 4K play frame times | At actual `3840 × 2160`, 95th percentile ≤ 33.3 ms on a named supported device, with actual quality settings reported. **NOT TESTED**. |
| Loading boundary | Load the selected game's 3D engine and assets only when needed; report compressed transfer sizes and first-playable timing. Actual import graph and sizes: **NOT CONFIRMED**. |
| Failure and recovery | Readable load-error state with a working retry, and graceful behavior when WebGL or storage is unavailable. **NOT TESTED**. |
| Sustained lifecycle | No unbounded animation loops, event listeners, geometry/material allocations, or save writes across repeated rounds. **NOT TESTED**. |

## 5. Assets and rights

| Material | Author / source | Rights / attribution | Verification |
| --- | --- | --- | --- |
| Game narrative and instructions | Original project-authored adaptation | Project rights; passage references identify inspiration. Do not present invented rules as translated Scripture. | Final text review pending. |
| Hull, cargo, water, textures, and interface art | Original procedural/project-authored assets intended | No external model or image license is assumed. Record any imported asset here before release. | Final asset inventory pending. |
| Music and sound | No asset inventory yet | Authorship, license, attribution, and source required for every added sound. | **NOT CONFIRMED**. |
| Fonts | System-font stack intended | No bundled commercial font is assumed. Any included font file requires its actual license. | Final inventory pending. |
| Three.js | Repository's vendored Three.js, if used | MIT; retain the applicable software license/notice. | Actual import and version/license inventory pending. |
| Corporate logo | Existing approved project corporate asset: `assets/corporate/hephzibah-behulah-official.jpg` | Existing corporate identity asset; authorization derives from the project adoption, not an invented public-domain claim. | Adopted asset blob `f7b0e4a650d861fb9d52ed91ea894edec030e03b`; use in game pending. |
| Scripture reference text | [World English Bible official site](https://worldenglish.bible/) and linked eBible Classic edition | The translation is public domain. The World English Bible name and logo are trademarks; do not label modified game prose as that translation. | Official rights statement checked 2026-11-04; this README uses original summaries. |
| People, marks, or third-party likenesses | None needed for the proposed game | Any addition requires an identified source and authorization where applicable. | Final inventory pending. |

No large Scripture excerpts or copied web pages are included. No universal public-domain claim is made for the King James Version: its United Kingdom publication rights require separate consideration. The World English Bible's published permission is the chosen rights reference if a short direct quotation is introduced later.

## 6. Scripture and engineering integrity

### Passage map

The following are original narrative summaries. References link to the primary translation text; they do not turn game parameters into claims about the historical vessel.

| Passage | Narrative basis | Boundary of the adaptation |
| --- | --- | --- |
| [Genesis 6:9–12](https://ebible.org/eng-web/GEN06.htm) | Noah, his family, and the setting of violence and corruption | Characterization and context; no invented engineering assignment is attributed to these verses. |
| [Genesis 6:14–16](https://ebible.org/eng-web/GEN06.htm) | Ark construction instructions, compartments, pitch, three decks, and dimensions of 300 × 50 × 30 cubits | These are the textual dimensions. A modern cubit-to-meter conversion or engineering interpretation is an explicit game assumption. |
| [Genesis 6:19–22](https://ebible.org/eng-web/GEN06.htm) | Living creatures, provisions, and carrying out the instructions | Cargo masses, positions, capacity limits, and menus are invented for play. |
| [Genesis 7:2–3](https://ebible.org/eng-web/GEN07.htm) | Different instructions for clean animals, unclean animals, and birds | A generic two-of-every-animal manifest must not be presented as an exhaustive summary of these instructions. |
| [Genesis 7:11–12, 17–20](https://ebible.org/eng-web/GEN07.htm) | The flood and rising water that lifts the ark | Wave models, rain rates, timers, and launch trials are game mechanics. |
| [Genesis 8:4, 6–12](https://ebible.org/eng-web/GEN08.htm) | Resting on the mountains of Ararat, followed by the raven and dove episodes | Use the passage's plural “mountains of Ararat”; the game does not establish a particular modern landing location. |
| [Genesis 8:13–19](https://ebible.org/eng-web/GEN08.htm) | Dry ground and departure from the ark | Any completion sequence or scoring is an original adaptation. |
| [Genesis 9:8–17](https://ebible.org/eng-web/GEN09.htm) | Covenant and rainbow | Narrative context; no engineering or scoring rule is implied by the covenant. |

Primary text and rights were consulted on 2026-11-04. The game is not a replacement for reading Genesis 6–9 in its full context, and it does not settle historical, archaeological, or theological interpretations.

### Simplified engineering model

The game is intended to teach relationships among loading, displaced water, waterline clearance, and balance. **It is not a real vessel design, certification, loading instrument, or safety assessment.**

| Quantity | Meaning / required units |
| --- | --- |
| Mass / displacement | Total modeled vessel, cargo, and ballast mass. Report kilograms (`kg`) or metric tonnes (`t`) consistently; `1 t = 1,000 kg`. |
| Buoyancy | Support from displaced water; density in `kg/m³`, displaced volume in `m³`, force in newtons (`N`) when force is modeled. |
| Draft | Vertical distance from the modeled keel/bottom to the waterline, in meters (`m`). |
| Freeboard | Modeled vertical clearance from the waterline to the relevant deck/edge, in meters (`m`); specify the actual measurement location in the implementation. |
| Heel | Transverse inclination to port or starboard, reported in degrees (`°`); define the sign convention. |
| Trim | Longitudinal bow/stern inclination or draft difference; specify degrees (`°`) or meters (`m`) and the sign convention. |
| Stability | If metacentric height or a restoring moment is used, document its units, geometry, assumptions, and limits. Do not equate a single game metric with complete vessel safety. |

A primary government reference for buoyancy, freeboard, metacentric height, and vessel motion is the [NSW Government Dogging and Rigging guide: The vessel](https://www.nsw.gov.au/employment/dogging-and-rigging/guide/part-2-dogging-and-rigging-activities/cranes-barges/vessel). It describes real operating concerns; this game uses a deliberately reduced model. It is not a source for historical ark performance.

The final documentation must identify the implemented hull geometry, water density, gravitational acceleration, cubit conversion (if used), cargo centers, ballast treatment, free-surface treatment or omission, waterline clipping, force/moment equations, time step, numerical clamps, and failure thresholds. **Those implementation details and their validation are currently pending.** Any rectangular-hull, small-angle, fixed-density, rigid-body, or idealized-weather assumption must be explicit rather than silently treated as a real-world conclusion.

## 7. Validation and deployment evidence

Checkpoint authored: **2026-11-04T18:29:07+01:00** (`Europe/Berlin`).

Root reported branch base `870b93b`; this is context only, not a game24 acceptance candidate. The final evidence must identify the complete candidate SHA and exact environment. Evidence from other games is not substituted for game24 evidence.

| Evidence | Exact command / procedure | Candidate and result |
| --- | --- | --- |
| Scripture / rights research | Read the primary Genesis 6–9 pages and official World English Bible rights statement linked above. | Research checked 2026-11-04. No gameplay acceptance implied. |
| README template review | Inspect this document against `docs/GAME_TEMPLATE.md`, `AGENTS.md`, and `docs/STANDARDS.md`. | Initial document checkpoint; final reconciliation pending. |
| Unit / campaign tests | Run the final game24 test files by exact path; record their names, counts, and output. | **NOT TESTED**. |
| Integration / full repository | `npm test`; `npm run check`; `npm run build` on the actual candidate. | **NOT TESTED** for this game/candidate. |
| Browser play and errors | Root-owned Playwright workflow: complete setup → loading → play → fail/retry → win → progression → reload; check console and network errors. | **NOT TESTED**. |
| Solvability / uniqueness | Enumerate all 10,000 generated challenges, validate witnesses and physical signatures, and check tier boundaries. | **NOT TESTED**. |
| Independent review | Bounded code and executable-model review of solvability, numerical edge cases, input, save recovery, and lifecycle. | **NOT TESTED**; implementation is awaited. |
| Accessibility / responsive | Keyboard-only completion; accessible names/status; focus; contrast measurement; reduced motion; required viewport/orientation checks. | **NOT TESTED**. |
| Actual 3D / actual 4K | Measure drawing buffer `3840 × 2160`, inspect the rendered scene, record browser/device/settings and frame receipt. | **NOT CONFIRMED**; root CI evidence pending. |
| Load / frame performance | Measure under the named conditions in section 4; report median and tail frame times and first-playable timing. | **NOT TESTED**. |
| Asset rights | Reconcile every shipped asset/dependency with section 5 and its license/notice. | Final inventory **NOT CONFIRMED**. |
| Pages deployment | Expected project path `/AdigunGamesBank/game24/`; root owns deployment and receipt. | **NOT DEPLOYED** for this candidate. |
| Public production flow | Expected public route `https://adigungamesbank.hephzibahbehulah.com/game24/`; verify the deployed SHA and essential user flow at that exact route. | **NOT VERIFIED**. |

Expected project Pages route: [game24](https://hephzibahbehulahhq.github.io/AdigunGamesBank/game24/). Expected custom-domain route: [game24](https://adigungamesbank.hephzibahbehulah.com/game24/). These are intended destinations, not proof of deployment, availability, or successful play. The final receipt must state which public route was actually verified.

## 8. Adopted standards and acceptance

| Standard | Exact adopted pin / application |
| --- | --- |
| AI engineering policy | **HB-AI-ENGINEERING-001 v2.0**, SHA `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`; [pinned source](https://github.com/HephzibahBehulahHQ/hb-AI-policy/tree/d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e). |
| Design system | SHA `52f01f9986d97088413ca9785bc7a2d3f2967123`; adopted sources `tokens/corporate.json`, `tokens/brands.json`, `docs/brand-and-product-naming.md`, and `templates/universal-product/`, as recorded in [STANDARDS](../docs/STANDARDS.md). |
| Corporate identity | SHA `bd116504412b37105166805018f64a6e7bbe3cde`; preserve the approved corporate identity and single corporate-logo treatment. |
| Trading policy | SHA `65b28cfc20925494b056321d57955e304eb09ac7`; not applicable to this game's mechanics. |
| Product requirements | [GAME_TEMPLATE](../docs/GAME_TEMPLATE.md), [STANDARDS](../docs/STANDARDS.md), [AGENTS](../AGENTS.md), and the adopted “Adigun Game bank pursuing goals and template.md” specification. |

Adopted corporate colors are Navy `#0B1220`, Blue `#2563EB`, Gold `#D4AF37`, Ivory `#F8FAFC`, and Slate `#64748B`. Relevant division accents are Evangelism `#D4AF37`, Elektroniker `#22D3EE`, and Artificial Intelligence `#A78BFA`. These are source tokens; actual component usage and measured contrast must be recorded after implementation. Intended system-font fallback is `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`; it does not imply a font-file license or successful font loading.

**Current acceptance state: NOT ACCEPTED.** Work remains in progress until the implemented mechanics and all 10,000 challenges have appropriate evidence, the actual 4K claim is demonstrated, accessibility and lifecycle checks pass, asset rights are reconciled, and the exact deployed public candidate has been verified. The delivery owner records the release decision and checkpoints in the repository's project status and evidence records.
