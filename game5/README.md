# RESISTOR MATCH

## Integration evidence — 4 November 2026

The implementation at **`10e3b16af8c314379e540da65b8aa7da0f536775`** passed this game’s actual **3840 × 2160 WebGL 2** drawing-buffer check (zero GL error), real-control completion, saved progression and fallback scenarios in [CI 41926291553](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). The integration owner inspected the original captured scene. [Immutable measured/frame receipt](../docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

That historical measured run passed **269 JavaScript, 52 API and 67/69 browser checks** and exposed two advanced mobile-layout failures. Corrected source **`09385bd8105e235f90493390fccbbe133083bd72`** then passed the complete gate: **269 JavaScript, 52 API and 69/69 browser checks**, including both 390px/320px layout regressions, in [CI 41929244609](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41929244609). [Successful immutable receipt](../docs/evidence/2026-11-04-nine-games/verification-09385bd.json). Hardware performance, physical devices, complete assistive-technology play and production qualification remain open. Current publication evidence belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).


## Identity and scope

| Field | Record |
| --- | --- |
| Stable ID / source | `game5` · `game5/` |
| Genre | Component identification and flip-and-match memory game |
| Owner / division | Hephzibah Behulah · Adigun Game Bank · Elektroniker |
| Target platform | Browser; WebGL 2 for 3D, equivalent numbered command trays without WebGL |
| Status | **In progress** · implemented game and numerical evidence; full production acceptance remains open |
| Remaining dependencies | Root's exact-candidate browser/rendering and publication receipts; hardware, physical touch, assistive-technology and language qualification |

This converts the existing Resistor Match title, preserving its real
flip-and-match mechanic. It does **not** add a new catalog title. Reveal two
opaque trays, read their four-band resistors, and compare nominal resistance
and tolerance. A matched pair is stored; a mismatch is covered. Both parts stay
readable until the player explicitly resolves the comparison. Store every pair
within a finite move budget to clear the challenge. Retry restores the same
layout so the player can use what they learned.

This is a component-identification game. It does not energize a circuit,
measure actual resistance or establish a part's wattage or voltage rating.

## Rules and meaningful decisions

- One move is counted when two different covered components are revealed.
- An already revealed or stored component cannot be selected again in that
  comparison. A third component cannot be exposed while a comparison is open.
- Matching requires equal **nominal resistance and tolerance**, not merely a
  shared band colour, object identity or a component ID.
- A match is committed by **Store matched pair**. A mismatch stays visible
  until **Cover mismatched pair** is selected; there is no timed concealment.
- Clearing the last pair on the last allowed move wins. An unresolved final
  mismatch or remaining pairs after using the budget loses and awards no level.
- There is no countdown. No pause control is needed for this untimed game.
- Covered DOM controls contain tray numbers and cover labels, not hidden
  values, band patterns or colour names. The inspection panel clears when the
  pair is covered. Stored pairs remain visible.

## Electrical facts and numerical assumptions

Primary manufacturer references, checked **2026-11-04**:

1. [Vishay, Color Code and Standard Resistance Series, document 20143](https://www.vishay.com/docs/20143/colorcod.pdf),
   revision 28-Aug-2009. It identifies the four-band order, digit colours,
   multiplier colours and tolerance codes.
2. [Vishay, Resistor Color Code Calculator chart, document 49411](https://www.vishay.com/docs/49411/resistor_color_code_calculator.pdf),
   confirming the same colour mapping and fractional multipliers.
3. [TE Connectivity, Resistor Color Codes](https://www.te.com/en/products/passive-active-electronic-components/resistors/intersection/resistor-color-codes.html),
   a second manufacturer's explanation of resistor band conventions.

The four bands mean two significant digits, a multiplier, and tolerance. Black
through white encode digits 0–9; the first digit is nonzero. Gold and silver
serve as ×0.1 and ×0.01 multipliers. This game uses red ±2%, gold ±5% and silver
±10% tolerance. For example, yellow–violet–red–gold gives **4.7 kΩ ±5%** and a
nominal tolerance interval of **4.465–4.935 kΩ**.

The engine represents nominal values in integer hundredths of an ohm, then
formats Ω, kΩ or MΩ for display. Tolerance intervals are derived from the
nominal value; they are not measured samples. Four-band encoding and decoding
round-trip every supported two-digit value, multiplier and tolerance in tests.
The encoder supports multiplier exponents −2 through +9; generated challenges
use −2 through +6. Display colour swatches are approximate screen colours, not
calibrated physical-material samples.

The selected value sets use E6/E12/E24 nominal-number subsets for learning.
They do not claim that every generated nominal value/tolerance combination is
sold in a particular manufacturer's series. Parts are enlarged original visual
models, with no implied physical body size, power rating or safe circuit use.

## Rendering and campaign structure

| Requirement | Implementation / current evidence |
| --- | --- |
| Actual 3D implementation | `scene.js` uses the shared Three.js WebGL 2 stage. Modelled cylindrical resistor bodies, four individually coloured rings, axial metal leads, foam tray beds, metal walls, opaque hinged covers, fasteners and a numbered bench |
| Correct band order | First/second digits and multiplier run left to right; the tolerance band is separated at the right. DOM labels show the same component data |
| Hidden components | Opaque depth-tested covers conceal resistors; no transparent lid effect. The camera is fixed, and a stored cover is removed only after a real matching comparison |
| Pointer input | Raycasting selects the actual numbered 3D tray; native DOM tray controls execute the same `reveal` command |
| 4K | Adaptive, 1080p and actual 3840 × 2160 renderer options. **Browser/frame evidence confirmed in integration CI above**, not confirmed merely by the selector |
| Hardware performance | **NOT TESTED**. Software-renderer checks are not gaming-GPU or physical-device qualification |
| Level count | 10,000 deterministic component arrangements, generator version 1 |
| Distinctness | Verified from ordered component-code arrangements, excluding level names/IDs: 10,000 unique decks |
| Solvability | All 10,000 decks completed through public reveal/compare commands in the minimum number of moves; each selected component appears exactly twice |
| Authored vs procedural | One individually designed memory/identification game with procedural component choices and Fisher–Yates arrangements; not 10,000 manually authored games |
| Human acceptance | 10,000 manual playtests, enjoyment/balance review and full production completion are **not claimed** |

| Tier | Challenges | Pairs | Move budget | Nominal exercise range |
| --- | --- | ---: | ---: | --- |
| Beginner | 1–2,000 | 4 | 14 | 10 Ω–6.8 kΩ |
| Apprentice | 2,001–4,000 | 6 | 14 | 10 Ω–82 kΩ |
| Skilled | 4,001–6,000 | 8 | 14 | 1 Ω–910 kΩ |
| Expert | 6,001–8,000 | 10 | 14 | 0.1 Ω–9.1 MΩ |
| Professional Master | 8,001–10,000 | 12 | 16 | 0.1 Ω–91 MΩ |

Larger decks, more similar band patterns, fractional multipliers, wider ranges,
mixed tolerances and smaller mistake allowances increase the task demands.
These are nominal pool bounds; a particular board samples a subset. The opening
challenge deliberately teaches 10 Ω, 100 Ω, 1 kΩ and 4.7 kΩ at ±5%.

## Controls, accessibility and persistence

Mouse/touch can select a real 3D cover or a numbered button. Every gameplay
action has a visible native control. Tab reaches trays and commands. Arrow keys
select a tray within the command grid or focused 3D bench, Enter/Space reveals,
C stores/covers a comparison, and R retries. Keyboard handling stays scoped to
the tray controls and canvas; it does not intercept typing in other fields.
The selected tray has a visible focus marker. Comparison controls receive focus
after the second keyboard reveal.

Revealed components show resistance, tolerance, colour names and a numbered band
pattern such as **1 · 0 · ×100 · ±5%**. Colour perception is optional. Physical
band colours remain correct instead of adding invented markings to the model.
Text and patterns communicate the code alongside those colours. Status messages
announce comparisons and results. A mismatch stays readable until explicitly
covered. Reduced motion removes cover animation while retaining the same game.

When WebGL is unavailable or lost, the numbered trays keep the same components,
hidden-state rules, move budget, scoring and progression. The quality selector
is disabled, and the page says graphics are unavailable. It does not label the
fallback a rendered 3D game. Back/forward restoration restarts the render loop
without resetting the match.

Campaign storage uses `adigun.campaign.v1.resistor-match` with
`{version:1, completed, unlocked}`. Only a complete winning board can award the
next sequential challenge. Unfinished comparisons are not saved. Reload starts
the highest unlocked challenge. Shared progression validates records, rejects
skipped levels and refreshes cross-tab progress. The UI reads back storage before
reporting a durable save; rejected writes are labelled session-only. No account,
server request, analytics or cloud-save capability is added.

English is implemented. Complete German, Yoruba and Nigerian Pidgin translation
and language review remain open. Physical touch, gamepad, voice and full
screen-reader play are **NOT TESTED**. Automated 320/390 px reflow, keyboard,
comparison-state WCAG 2.1 A/AA and storage-failure browser checks are prepared;
root records their observed results. No accessibility audit rules are excluded.

## Loading, asset rights and provenance

The entry point loads only this game's application and component engine.
Three.js and the scene are dynamically imported when this title is opened. The
existing vendored Three.js module is approximately 749 KB uncompressed; no
external fonts, component photos, model files or network AI calls are needed.
If scene loading fails, the command game remains usable; reloading retries the
graphics load.

Initial-playable target: **under 3,000 ms** on a recorded desktop Chromium
device, cold cache and a 10 Mbps connection. **NOT MEASURED** for this new
implementation. Capture actual hardware, cache, network and frame-time
distributions before treating the target as an achieved result.

| Asset / dependency | Source / rights | Attribution / evidence |
| --- | --- | --- |
| Resistors, bands and leads | Original geometry authored for this project | Unbranded axial component models; no manufacturer product image copied |
| Tray, covers, bench, screws and signs | Original procedural geometry and runtime text textures | No stock model or generated replacement corporate logo |
| Colour-code facts | Manufacturer documents linked above | Factual educational mapping; no copied reference-chart artwork |
| Corporate logo | Existing approved design-system artwork | Reused unchanged; provenance in `ASSETS.md` and `docs/STANDARDS.md` |
| Three.js | Existing vendored dependency, MIT license | Preserve the supplied license notice |
| Typography | System font fallback | No downloaded proprietary font |
| Audio | None | No audio asset or unimplemented sound control |

## Verification record

Working-tree numerical command, completed **2026-11-04T23:14:22+01:00**:

```sh
node --test tests/resistor-match.test.js
```

**11 passed, zero failed/skipped**, approximately 1.53 s. Coverage includes
manufacturer examples and tolerance intervals, exhaustive four-band round
trips, invalid values, hidden/revealed state, duplicate/third-pick rejection,
nominal-and-tolerance comparison, finite budget loss, a last-allowed-move win,
retry, persistence and every one of the 10,000 decks. The full-deck test executes
**160,000 reveals and 80,000 comparisons** through the public game commands;
it does not assign a winning score directly.

| Check | Current evidence |
| --- | --- |
| New engine tests | Local working-tree 11/11 pass above |
| Syntax | `node --check` passed for `engine.js`, `app.js`, `scene.js` and the new browser spec during implementation |
| Browser / actual 4K | **Executed in integration CI above**; `tests/browser/resistor-match.spec.js` prepares opened-cover 4K capture, true UI memory win and reload |
| Responsive / accessible / failure paths | **Executed in integration CI above**; specs cover 320 px compared parts, axe without exclusions, 390 px keyboard loss/retry/fallback win and silently rejected storage |
| Touch hardware / screen reader / GPU | **NOT TESTED** |
| Immutable revision / production | Root integration owner records exact candidate, CI and deployment receipts in `PROJECT_STATUS.md` |

These local results do not establish that a later changed candidate was tested.
Root must associate the release checks with the exact committed source before
acceptance and publication.

## Adopted standards and acceptance

Policy: **HB-AI-ENGINEERING-001 v2.0**, pinned to
`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`. Design-system pin:
`52f01f9986d97088413ca9785bc7a2d3f2967123`. The page consumes corporate navy
`#0B1220`, royal blue `#2563EB`, gold `#D4AF37`, ivory `#F8FAFC`,
contrast-adjusted muted text and the Elektroniker cyan accent `#22D3EE` through
the shared tokens. Official corporate artwork and five-division inheritance are
preserved; product logic stays in this repository.

The existing route is `/game5/`, with the intended published custom-domain URL
`https://adigungamesbank.hephzibahbehulah.com/game5/`. This file does not claim a
new deployment. **Status remains In progress** until the remaining game-template
acceptance evidence is recorded. The conversion adds no extra title to the
2,000-game target and establishes no native console release.
