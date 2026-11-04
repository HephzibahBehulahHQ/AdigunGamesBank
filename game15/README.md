# Tactics Grid — design and evidence record

## Identity and scope

| Field | Record |
| --- | --- |
| Title / stable ID | **Tactics Grid** / `game15`, campaign key `tactics-grid` |
| Genre | Turn-based tactical strategy: activation economy, range, line of sight, hard cover, shielding and contested objectives |
| Corporate owner / division | Hephzibah Behulah / Artificial Intelligence; inherits the five-brand corporate foundation |
| Target platform | Browser with WebGL 2 for the 3D view; the equivalent labelled command map also works when graphics initialization fails |
| Source | `game15/` |
| Status | **In progress**: implemented playable browser game; full release qualification remains open |
| Exact remaining dependencies | Candidate browser/4K/accessibility results must be recorded by the integration owner; representative physical-device performance and assistive-technology review remain unverified |

This is one existing title with its own rules and campaign. Three original industrial drones face three heuristic-controlled opposing drones on an 8 × 8 sector board. It does not use a live AI provider. The opponent evaluates legal movement, firing opportunities, exposure, hull strength, cover and objectives after each friendly phase.

Each surviving drone receives one activation per round: move, fire, guard, or collect a data core. Moving and firing cannot occur in the same activation. Hard cover blocks both movement and fire; intervening drones block shots. Diagonal movement cannot cut a blocked corner. A pulse removes one hull point. Guard absorbs one incoming pulse and expires at the start of that drone's next friendly phase. Disabled wrecks do not obstruct routes.

| Friendly drone | Hull | Move distance | Firing range | Tactical role |
| --- | ---: | ---: | ---: | --- |
| P1 Vanguard | 4 | 2 | 3 | Balanced assault |
| P2 Ranger | 3 | 3 | 4 | Fast, long-range reconnaissance with less hull |
| P3 Guardian | 5 | 2 | 3 | Durable support and objective carrier |

Distances use the larger coordinate difference. Movement additionally requires a clear route; firing requires clear line of sight. Sector names combine a row letter and column number, such as `B1`.

### Objectives and outcomes

- **Secure the sector:** disable every opponent. Losing the friendly squad loses the mission.
- **Hold the uplink:** occupy a sector within one cell of the terminal with no opponent in that area for two consecutive round boundaries, rising to three in Expert/Master missions. Contested or lost control resets that side's count. Either squad can win the uplink.
- **Recover the data core:** enter its sector, spend an activation collecting it, then move that carrier to column 1. A disabled carrier drops the core in its sector, allowing another friendly drone to retrieve it. Disabling all opponents alone does not complete this objective.

Every mission also has a finite round budget. Losing the squad, losing the uplink, or exhausting the budget produces an explicit defeat. Retry recreates the same mission without deleting previous clears. Replaying an earlier clear never grants another unlock.

## Rendering and level structure

| Requirement | Implementation / evidence |
| --- | --- |
| Actual 3D scene | Three.js WebGL 2, perspective camera, metallic tracked drone geometry, turrets/sensors, raised terrain, opaque cover crates, dynamic hull indicators, lights and shadow maps. `scene.js` builds original geometry; `shared/three-stage.js` owns renderer lifecycle and resolution. Browser inspection is recorded separately below. |
| 4K requirement | Implemented explicit `3840 × 2160` render target using the shared renderer, plus `1920 × 1080` and automatic resolution. **Do not infer confirmation from the setting:** exact drawing-buffer and inspected-frame receipts belong in the candidate verification record. |
| Camera / interaction | Command perspective, overhead and west-approach cameras; pointer raycasting maps actual unit, terrain and tile geometry back to game coordinates. |
| Motion / rendering work | Static tactical scene with redraws after actions, selection, resize and quality changes; no perpetual animation loop. A short pulse trace is omitted under reduced motion. |
| Campaign count | **10,000 reproducible configurations**, Beginner → Apprentice → Skilled → Expert → Professional Master, 2,000 missions per tier. These are levels of this one title. |
| Topology | The authored first mission has six barriers. The other 9,999 missions have four fixed perimeter barriers and four uniquely selected central barriers. The generator rejects layouts with disconnected open sectors, then permutes 9,999 accepted combinations. All 10,000 resulting terrain signatures are distinct. |
| Other variation | Seeded deployment rows, relay positions, three objective modes, enemy hull, movement, range, tactical scoring and round limits. These change actual reachable routes and decisions. |
| Difficulty | Round budget narrows from 40 to 28. Enemy hull rises from 3 to 3–4, then 4; Sentinel range increases from 3 to 4 after mission 4,000; Flanker movement rises from 2 to 3 after mission 6,000. Heuristic exposure/cover weighting also increases. |
| Determinism / versioning | `campaign.js`, reproducible `randomFor(15000 + level × 37)` from shared progression; deployed source revision defines the generator. Saved schema version is 1. A future incompatible generator requires an explicit campaign migration. |
| Validation | Automated checks enumerate every configuration for distinct geometry, connected open sectors, legal non-overlapping deployment and reachable objectives/extraction. Complete legal-input playthroughs cover all three objectives and all five tiers, including a mission 10,000 recovery victory. These checks do **not** establish 10,000 manually completed, equally balanced or individually reviewed missions. |
| Persistence | Completed missions only, browser-local key `adigun.campaign.v1.tactics-grid`. Active missions restart after reload. Exact save schema is checked; malformed/inconsistent data is reset with visible feedback. Denied reads and failed writes retain session play and explicitly avoid claiming a durable save. No personal data is collected. |

## Controls and accessibility

| Input / requirement | Implementation and qualification |
| --- | --- |
| Keyboard | Tab reaches a visible skip link, navigation, mission controls, squad and commands. On the scene or command map: arrows inspect cells, Enter selects or acts, 1/2/3 select drones, G guards, C collects, E ends the phase, Esc pauses, R retries, M focuses the destination selector, F focuses targets. Native labelled buttons/selects provide the same actions without shortcuts. |
| Mouse / pointer | Select a drone and raycast a legal destination or visible target in the 3D scene; alternatively use the sector map and labelled command controls. Camera and resolution are explicit selects. |
| Touch | Tap scene tiles, squad cards, command-map cells or command buttons. No hover or precision drag is required. Small-screen reflow is implemented; actual viewport results must be captured by browser checks. |
| Gamepad | No gamepad mapping or native console build is claimed. |
| Accessible names / state | Every squad and sector has a textual name; names include their visible labels. The command map uses a roving tab stop with arrow navigation. Hull, position, available moves/targets, objective location, activation state and outcomes have DOM equivalents. Status announcements use a polite live region. |
| Focus / contrast | Visible keyboard outlines, navy/ivory foundation and contrast-conscious secondary text. Automated WCAG 2.1 A/AA checks are required; automated success does not replace assistive-technology review. |
| Reduced motion | Removes pulse traces and the opponent's presentation delay; gameplay and legal choices remain identical. |
| Pause / lifecycle | Pausing or hiding the page cancels pending opponent work. Returning resumes a pending phase. Retry clears pending actions. Browser page caching preserves resumable page state; actual page teardown disposes the renderer. |
| Graphics failure | Explicit “3D rendering unavailable” state opens the equivalent command map and moves focus to its visible cell. It does not describe that fallback as 3D. Resolution/camera controls are disabled when unavailable. |
| Responsive targets | 320 px wide mobile through 4K desktop; viewport and touch evidence remain distinct from implementation. |
| Language | English implemented. Complete DE/YO/PCM localization and language review are not implemented. |

## Loading, performance and asset rights

**Initial-load target:** first interactive command controls within 3 seconds on a four-core laptop with 8 GB RAM, current Chromium, a 10 Mb/s connection with 50 ms latency, cold HTTP cache. **Target only; not a measured device result.** The 4K redraw target is under 33 ms on a supported hardware GPU; physical-device timing remains unverified.

Game-specific modules and Three.js are fetched when this game route is opened; the catalog does not preload this game's scene. Geometry is constructed locally, with no remote model, texture or audio downloads. Further generated maps are built only when a mission beyond the authored first map is requested. The owned runtime files plus shared renderer, progression, CSS and vendored Three.js total approximately 0.82 MB before compression; the unchanged official corporate image adds 54,461 bytes. Network transfer size and cache behavior require browser measurement. Graphics failures retain the complete command interface; reload retries rendering.

| Asset / dependency | Source / author | Rights and attribution | Verification scope |
| --- | --- | --- | --- |
| Drone models, terrain, UI geometry, labels and mission content | Original source created for Hephzibah Behulah in this repository | No external models, likenesses, club marks, kits, textures, sound or fictional franchise material | Source reviewed; no third-party asset requests in game code |
| Corporate image | Pinned HB design-system `assets/corporate/hephzibah-behulah-official.jpg` | Owner-supplied official corporate artwork; unchanged use under the user's corporate-template instruction | Provenance and immutable blob `f7b0e4a650d861fb9d52ed91ea894edec030e03b` documented in `docs/STANDARDS.md` |
| Three.js | Vendored Three.js dependency | MIT; bundled notice at `vendor/three/LICENSE` | Package version and integrity maintained in the product lockfile |
| Fonts | Operating-system UI/serif fallback stack | No external font file or font service | No font download required |

This is a fictional abstract tactics game. It represents no real military force, weapon system or operational model. It contains no financial data, Scripture quotation or live-model scoring. Browser support is not a certified PS5 or future PlayStation release.

## Testing and deployment evidence

Local verification capture: **2026-11-04, Europe/Berlin**. `PROJECT_STATUS.md` remains the authoritative record of exact synchronized candidate SHAs, verification timestamps, CI runs, artifacts and deployment receipts; this working record must not imply that uncommitted files were already released.

| Evidence | Command / procedure | Outcome / limitation |
| --- | --- | --- |
| Historical rules | `node --test game15/test.js` | All **8 existing tests pass unchanged**, preserving activation, movement, attack, AI-phase and finished/dead-state protections. |
| Campaign / integration / saves | `node --test tests/tactics-campaign.test.js game15/test.js` | **25/25 pass** in local Node v24.22.1. Includes all 10,000 layouts, three complete objective wins, real enemy turns, representative higher-level wins/losses, passive defeat/retry, guard/cover/carrier rules, safe persistence, actual objective markers and cancelled/multi-pointer/drag input regressions. |
| Syntax | `node --check` on `game15/app.js`, `game15/scene.js`, `game15/save.js`, `game15/interaction.js` | Passed locally. |
| Browser playthrough | Repository Playwright suite; real UI selection/move/attack sequence, next-level unlock and reload | Integration owner is running this against the current candidate. Do not substitute engine tests for browser evidence. |
| Accessibility / reflow | Axe WCAG 2.1 A/AA at 320 px, visible first-link focus, overflow checks; keyboard/touch flow | An earlier candidate exposed visible-label/name mismatches. Source corrected; candidate CI result must verify the fix. Manual screen-reader/device review remains unverified. |
| Actual 4K / visual quality | Inspect a rendered frame and actual WebGL drawing buffer `3840 × 2160`, record browser/device and graphics errors | **NOT YET CONFIRMED in this local authoring record.** Use current candidate artifacts and `PROJECT_STATUS.md` for subsequently verified results. |
| Performance | Frame timing / initial interaction on the named physical device and network | **NOT TESTED** on physical hardware; source byte count and bounded generation are not frame-rate proof. |
| Asset rights | Source inventory above and pinned corporate provenance | Original geometry and licensed renderer recorded; no external commercial character/player content added. |
| Pages path | `/AdigunGamesBank/game15/` | Candidate deployment owned by the integration workflow; not inferred from local files. |
| Public URL | `https://hephzibahbehulahhq.github.io/AdigunGamesBank/game15/` | **Current rewritten version not yet publicly verified in this local authoring record.** See exact release receipt in `PROJECT_STATUS.md`. |

To run from the repository root, serve the repository with `python3 -m http.server 4173` and open `/game15/`. Direct `file://` access cannot reliably load browser ES modules.

### Reproducible first-mission browser victory

Begin mission 1. Select a ready drone, choose the destination or target, and execute the action. Wait for “Your turn” after every complete friendly phase. Coordinates below use the visible row-letter/column-number labels:

1. P1 → C3; P2 → F4; P3 → D3.
2. P1 fires E1; P2 fires E2; P3 → C2.
3. P1 fires E1; P2 fires E2; P3 → B3.
4. P1 fires E1; P3 → C5.
5. P1 fires E3; P3 fires E2.
6. P1 fires E3; P3 → C4.
7. P3 → D3.
8. P3 fires E3; mission clears.

This sequence uses ordinary legal controls and the real local opponent; units may be lost. Browser automation uses `#start`, `#unit-P1`/`P2`/`P3`, `#move-to`, `#move`, `#target-select`, `#attack`, `#phase`, and `#next`. Complete command inputs are also recorded in `tests/tactics-campaign.test.js`.

## Adopted standards and acceptance

- Policy: **HB-AI-ENGINEERING-001 v2.0**, immutable commit **`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`**, adopted by product `AGENTS.md`.
- Design system: immutable commit **`52f01f9986d97088413ca9785bc7a2d3f2967123`**, as documented in `docs/STANDARDS.md`.
- Tokens used: Midnight Navy `#0B1220`, Royal Blue `#2563EB`, Metallic Gold `#D4AF37`, Ivory White `#F8FAFC`, Slate Grey `#64748B`, with AI Violet `#A78BFA` as the division accent. Accessible text uses brighter supporting tints; opposing pieces use copper/orange with textual team labels.
- Shared consuming components: `shared/game.css` corporate shell and focus treatment; `shared/three-stage.js` rendering/quality/lifecycle; `shared/progression.js` bounded campaign persistence. Their use is exercised by product unit and browser checks.
- Acceptance remains **In progress** until the applicable browser, graphics, accessibility, performance and deployment evidence is recorded for the exact release candidate. The project-wide 2,000-game target remains unfinished; this rewrite contributes one title.
