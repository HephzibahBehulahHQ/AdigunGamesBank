# BINARY FLASH — design and evidence record

## Published milestone — 5 November 2026 (Europe/Berlin)

Source **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** passed the complete repository gate: **269 JavaScript, 52 API and 69 browser checks** in [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881). This game’s actual **3840 × 2160 WebGL 2** buffer, genuine-control completion, save/reload and fallback scenarios passed. [Successful exact-source receipt](../docs/evidence/2026-11-04-nine-games/verification-5547a53.json).

The release completed [Pages publication](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41936442011); **115/115 selected public files matched exactly**, including this game’s entry and JavaScript/CSS. [Public-source receipt](../docs/evidence/2026-11-04-nine-games/deployment-5547a53.json). Original inspected scene frames retain their earlier 10e3b16 provenance in the [evidence index](../docs/evidence/2026-11-04-nine-games/README.md).

Hardware performance, physical devices, complete assistive-technology play, language coverage and production qualification remain open. Current acceptance belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Identity and scope

| Field | Record |
| --- | --- |
| Title / stable ID | **BINARY FLASH** / `game7`; campaign ID `binary-flash` |
| Genre / distinct mechanics | Digital-register and packet commissioning: staging switches, parallel latch, serial clock, logical shifts, rotations, signed interpretation and parity |
| Corporate owner / division | Hephzibah Behulah / Elektroniker; shared five-brand foundation |
| Target platform | Browser; actual Three.js scene through WebGL 2, with the same complete register mission available through labelled controls when graphics fail |
| Source / route | `game7/` / `/AdigunGamesBank/game7/` |
| Status | **In progress**: implementation and exhaustive command-based mathematical checks completed; actual candidate browser/rendering/deployment receipts remain in `PROJECT_STATUS.md` |
| Remaining qualification | Final corrected release gate, physical GPU/touch devices, full screen-reader review, performance measurements, localization and production publication |

The original binary-to-decimal purpose is preserved in a stateful digital
bench. The player builds and transmits words instead of answering a sequence
of multiple-choice questions. Input switches, the active register and the
receiver are separate state. A switch change alone never delivers a frame.
This is one game with 10,000 deterministic missions, not 10,000 separate games.

### Rules and meaningful decisions

The receiver requests an ordered packet of decimal targets. Each frame
specifies its word width, signed or unsigned interpretation, and even or odd
parity. The active register must contain the target word, and the parity switch
must produce the required total number of one bits, before a transmission is
accepted. Accepted words remain in the register for the next frame.

The staging switches prepare a parallel word. A latch pulse copies that word
to the active register. Alternatively, a clock pulse shifts the active word
left and inserts the serial-input bit at bit zero. Logical shifts insert zero;
rotations wrap the outgoing bit. Register operations leave staging switches
unchanged. The player can reuse the previous word, rotate or shift a useful
pattern, or construct another parallel input word.

Each changed bit, changed serial/parity switch, latch, clock, register transform
or attempted transmission costs one operation. Merely selecting a switch or
choosing an already selected input value costs nothing. There is no reaction
timer, background clock or idle completion. A rejected word or parity check
uses one fault allowance without advancing the receiver. Exhausting that
allowance loses the mission. Exhausting operations before the complete packet
arrives also loses it. A correct final frame on the last operation still wins.
Pause blocks all mutations; restart restores the same mission and preserves
completed campaign progress.

### First packet: a complete playable example

Mission 1 starts with an empty four-bit register and staging word. Its targets
are unsigned decimal 9, then 7, both with even parity. The operation budget is
16 and the fault allowance is two rejected transmissions.

1. Begin the mission. Set staging bits 3 and 0 to one; the staged word is `1001`.
2. Latch it into the register. The active decimal display becomes 9. Parity
   stays zero because the data contains two ones. Transmit the first frame.
3. Set serial input to one. Clock twice: the retained register changes from
   `1001` to `0011`, then to `0111`, decimal 7. Staging remains `1001`.
4. Set parity to one so the three data ones plus the parity bit total four.
   Transmit again. Both ordered frames are now received, and mission 2 unlocks.

This uses nine operations, including both transmissions. A purely parallel
solution also works. Transmitting the initial zero value twice fails; a correct
value with the wrong parity is also rejected. Partial packets never save a
mission clear.

## Rendering and level structure

| Requirement | Implementation and evidence boundary |
| --- | --- |
| Original 3D scene | Raised PCB and enclosure, physical staging levers, separate active-register lamps, readout, serial/parity switches, clock/latch/transmit controls, receiver lamps and connection traces. Three.js lighting, depth, perspective and shadows; actual raycasting invokes the same engine commands as the DOM controls. |
| 4K drawing buffer | Shared stage offers adaptive, 1920 × 1080 and explicit 3840 × 2160 modes. The authored browser test waits for a rendered frame, reads actual WebGL buffer dimensions and captures the canvas. **The selector is not a passed 4K rendering receipt.** |
| Camera / rendering | Static perspective bench and overhead views. Redraw on state, viewport or quality changes; no perpetual decorative animation. |
| Implemented / validated count | 10,000 deterministic missions, 2,000 per tier. All complete through public engine commands in the unit test; none require an injected success flag. |
| Distinctness | Tests compare actual width, initial register state and first two target words. Those signatures are distinct across all 10,000 missions; IDs, titles, parity labels and random seeds are not used as substitutes for a distinct configuration. |
| Generation | Version 1. Mission number seeds a reproducible integer generator. Injective payload/state permutations guarantee distinct configurations; subsequent frames, parity rules and staging states use seeded choices. First packet targets and initial states are authored. |
| Reachability / finite budget | The generator computes the cost of an explicit parallel-load solution, including every toggle, latch, parity change and transmission. Tier-dependent finite margins leave each mission solvable. Tests execute that exact command sequence and confirm accepted payloads. Largest observed canonical solution: 83 operations. |
| Save / resume | Device-local `adigun.campaign.v1.binary-flash` uses the shared validated version-1 schema. Sequential full packet clears unlock missions; retry and repeated clears do not award extra progress. The UI reads storage back before claiming a durable save. |

| Missions | Tier | Width | Ordered frames | Added demands |
| --- | --- | ---: | ---: | --- |
| 1–2,000 | Beginner | 4 bits | 2 | Unsigned values, even parity, generous operation margin |
| 2,001–4,000 | Apprentice | 6 bits | 3 | Even/odd rules, larger values and three retained-register transitions |
| 4,001–6,000 | Skilled | 8 bits | 4 | Alternating signed/unsigned interpretation, negative values and two-fault allowance |
| 6,001–8,000 | Expert | 12 bits | 5 | Five-frame sequences, mixed interpretations, more switches and a smaller relative operation margin |
| 8,001–10,000 | Professional Master | 16 bits | 6 | Six frames, full 16-bit ranges, tighter relative margin, first rejected transmission fails |

Outside the authored first mission, operation budgets are the canonical
solution cost multiplied by 1.5, 1.4, 1.3, 1.2 or 1.1 for the successive tiers,
rounded upward, plus four. The extra budget is finite and visible. This
canonical route establishes reachability; it is not asserted to be globally
optimal. Serial operations and rotations may provide shorter alternatives.

Exhaustive automated completion is not 10,000 human playtests or a claim of
equal enjoyment. Old quiz-score storage is not converted into completed
register missions. Saves contain only campaign version and completion/unlock
counts; they contain no account details or user input history. Corrupt,
inconsistent or unavailable storage starts safely at mission 1 while allowing
session progress. The receiver and register state of an unfinished packet are
not persisted.

## Controls and accessibility

| Input / requirement | Implementation / qualification |
| --- | --- |
| Mouse / pointer | Click physical 3D switches and clock/latch/transmit controls, or use the matching labelled buttons. Separate DOM controls provide every register transform. |
| Touch | The same visible buttons; bit targets remain at least 52 px wide and 90 px tall, action buttons at least 44 px high. Real touch-device qualification remains **NOT TESTED**. |
| Keyboard switches | Roving focus with bounded arrows. Enter or Space toggles the focused bit. Tab reaches latch, serial, parity, transmission and mission controls. Bit values and weights appear as text. |
| Keyboard scene | Arrows select a bit; Enter/Space toggles; L latches, C clocks, T transmits. Commands are scoped to the focused canvas. |
| Phase / budget access | Text readings for phase, received frames, remaining operations, rejections, shifted-out bit and active decimal/binary values. Error/success explanations use a polite live region. |
| Focus / state | Visible gold focus; switch values use `aria-pressed` as well as visible zero/one labels. Status does not rely on colour alone. |
| Reduced motion | Static scene with immediate camera changes, no looping motion or animation-dependent decisions. Shared reduced-motion styles remain active. |
| Responsive layout | Wider switch banks scroll inside their own bounded panel. The authored browser check covers a 16-bit mission at 390 px and 320 px without widening the page. |
| Graphics failure | Complete controls and original engine remain usable. A visible message names the missing 3D view. Graphics failure does not claim successful 3D rendering. Context loss pauses active play and permits continuation through controls. |
| Gamepad | No mapping claimed. |
| Language coverage | English implemented. German, Yoruba and Nigerian Pidgin are not yet localized. |
| Unverified review | Complete screen-reader sessions, physical touch, measured colour contrast and device-specific performance remain **NOT TESTED** until recorded by integration. |

## Digital model and technical references

The state is an exact unsigned integer word between zero and `2^n − 1`, with
`n` from 4 to 16 in the campaign. Signed interpretation uses two’s complement:
the most significant bit has weight `−2^(n−1)`. If that bit is set, decoding
subtracts `2^n` from the raw unsigned value. Decimal targets are exactly
representable integers; there is no floating-point approximation or voltage
unit in this model.

Parity includes the transmitted data word and one separate parity bit.
Even parity sets the parity bit to the data-one count modulo two; odd parity
uses its complement. The receiver additionally checks the exact requested
word. Thus this game’s receiver does not treat parity alone as proof that a
payload is correct. Logical right shift always fills with zero, including
when a frame is interpreted as signed. Arithmetic right shift is not provided.

The clock and storage controls illustrate separate state transitions rather
than a particular chip’s pinout. The simulation omits propagation delay,
voltage thresholds, setup/hold intervals, metastability, electrical drive
strength and manufacturer-specific behavior. The operation/error budgets,
packet format and receiver rules are original game design. They do not
establish hardware conformance or network error-correction guarantees.

Primary references, checked 2026-11-04:

- [MIT OpenCourseWare, 6.004 Computation Structures: integer encodings and error detection](https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c1/c1s1/).
- [Nexperia, 74HC595DB: shift register and storage register](https://www.nexperia.com/product/74HC595DB).
- [Texas Instruments, CD54HC280/CD74HC280/CD54HCT280: odd/even parity generators/checkers](https://www.ti.com/de/lit/gpn/cd54hct280).

## Loading and asset rights

First-playable target: **3,000 ms**, cold cache, 20 Mbps connection and 40 ms
latency, on a ThinkPad T14 Gen 2 with Intel Core i5/Iris Xe and Chromium.
This is a target device/profile, **not a measured result**. Target redraw time
is at most 33 ms at the 95th percentile in 1080p mode on that device. The selected
scene module imports lazily after the complete controls are built. Scene
loading failures show the working command mode and a reload-graphics action.
Download size, redraw timings, GPU memory and actual first-playable times
remain unmeasured for the candidate.

| Asset / dependency | Source / author | Rights / attribution |
| --- | --- | --- |
| Board, levers, register lamps, buttons, receiver, chassis, traces and readout | Original procedural geometry and runtime text in `game7/scene.js`, created for Hephzibah Behulah in this implementation | Original project work; no external model, photo, audio, character or likeness imported |
| Labels and texture readouts | Runtime canvas text from the current exact register state | Original labels; local system font, no downloaded font |
| Corporate artwork | Existing approved `assets/corporate/hephzibah-behulah-official.jpg` | Unchanged; provenance retained in `ASSETS.md` |
| Three.js | Existing pinned `vendor/three/three.module.js` | Existing MIT license/attribution retained |
| Digital logic references | MIT, Nexperia and Texas Instruments sources above | Linked and paraphrased; no textbook figures or manufacturer diagrams reproduced |

## Verification and publication

| Evidence | Command / procedure | Observed scope or remaining gate |
| --- | --- | --- |
| Integer model and state-machine tests | `node --test tests/binary-flash.test.js` | **16 passed locally**, zero failures/skips, at 2026-11-04T23:27:17+01:00 (Europe/Berlin); working-tree scope, exact integrating SHA recorded in `PROJECT_STATUS.md` |
| Exhaustive completion | Same suite; construct each frame with public toggle/latch/parity/transmit commands | All 10,000 missions unique and completed with exact received words, zero errors and computed finite operation costs |
| Numerical boundaries | Unsigned/signed ranges, all raw words through eight bits, 16-bit extrema, parity, serial sequence, shifts/rotations | Passed within the 16 tests; invalid bit positions and values cannot mutate state or spend operations |
| Failure / progression | Wrong value, wrong parity, operation/fault exhaustion, exact-last-operation completion, pause, retry, corrupt/blocked storage, duplicate clear | Passed within the 16 tests |
| Syntax | `node --check game7/app.js`; `node --check game7/scene.js` | Passed locally; final integration repeats affected checks |
| Actual controls / graphics | `npm run test:browser -- tests/browser/binary-flash.spec.js` | Four scenarios authored; candidate browser execution, rendered frames and inspected artifacts remain the integration owner’s gate |
| Browser error recovery | Real failed transmissions, retry, parity correction, WebGL unavailable, storage silently rejects writes | Executed integration coverage is recorded above |
| Accessibility / mobile | Product axe route audit; visible keyboard focus; 390 px and 320 px 16-bit layout | Actual candidate outcomes belong in `PROJECT_STATUS.md` |
| Build / CI / performance | Exact-candidate product checks and device measurements | Integration records observed results and limitations; 4K performance is not inferred from engine tests |
| Deployment / public flow | Existing `/AdigunGamesBank/game7/` publication | **Not claimed here**; require exact-source deployment and real public-flow verification |

The full-packet browser tests manipulate the shipped switches and controls;
they never inject a winning state. The small-screen case explicitly loads a
valid saved-progress fixture to reach the widest 16-bit layout. That fixture
does not claim browser completion of 8,000 missions. Screenshots and real WebGL
buffer readings are requested by the tests but count as evidence only after
execution and inspection.

## Adopted standards and acceptance

- **HB-AI-ENGINEERING-001 v2.0**, commit
  `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`, adopted in `AGENTS.md`.
- **HB design system**, commit `52f01f9986d97088413ca9785bc7a2d3f2967123`.
  Used tokens: Navy `#0B1220`, Royal Blue `#2563EB`, Gold `#D4AF37`, Ivory
  `#F8FAFC`, Slate `#64748B`, Electric Cyan `#22D3EE`, with readable supporting
  text tints and original green PCB surfaces.
- Shared components: `shared/game.css`, `shared/three-stage.js` and
  `shared/progression.js`. Original app logic, assets and domain tests remain
  scoped to this game.
- Acceptance remains **In progress** until applicable browser, accessibility,
  rendering, performance and publication gates are recorded. This browser
  title makes no native PlayStation or other console-release claim.
