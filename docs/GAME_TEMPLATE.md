# Per-game design and evidence record

Copy this document into the individual game's documentation and replace its
unrecorded values with evidence. **This is an authoring template, not a released
game or proof that any requirement is satisfied.** Keep project-wide progress
and blockers in `PROJECT_STATUS.md`; this record documents the particular game.

## Identity and scope

| Field | Record |
| --- | --- |
| Title and stable game ID | Not recorded |
| Genre and distinct core mechanics | Not recorded |
| Corporate owner and applicable division(s) | Hephzibah Behulah; division selection not recorded |
| Target platform(s) | Not recorded; browser and native-console builds must be distinguished |
| Source path | Not recorded |
| Status | **In progress**; no release acceptance evidence recorded |
| Blocking dependency, if any | Not assessed; identify the exact missing access, asset, implementation or verification |

Describe the playable objective, rules, meaningful decisions, win/fail states,
restart behavior and how this title differs from other games. A reskin, renamed
template or higher level number does not establish a separately designed game.

## Rendering and level structure

| Requirement | Evidence to record |
| --- | --- |
| Actual 3D scene and renderer | **NOT CONFIRMED**; renderer, scene geometry, camera and inspected frame |
| 4K drawing buffer | **NOT CONFIRMED**; actual `3840 × 2160` renderer dimensions, browser/device, frame and verification command |
| Rendering quality and performance | **NOT TESTED**; measured frame-time distribution, hardware, scene, quality setting and limitations |
| Level structure | **Target: 10,000 levels, Beginner → Professional Master. Implemented count and validated count: not recorded.** |
| Difficulty progression | Not recorded; define mechanics, parameter ranges and milestones, not only increasing labels |
| Authored/procedural design | Not recorded; distinguish authored content from reproducible generators and state seeds/versioning |
| Level validity and completion | **NOT TESTED**; solvability/reachability constraints, difficulty boundaries, representative full playthroughs and automated validation where appropriate |
| Save and resume | **NOT TESTED**; storage location, schema/version, privacy, corrupted-storage recovery and persistence test |

Do not infer 4K from a CSS size, canvas attribute before rendering, enlarged
screenshot or menu label. Record the drawing buffer that actually produced the
inspected frame. A lower-resolution accessibility/performance mode must show its
actual quality. Procedural generation does not prove 10,000 levels are enjoyable
or all were manually tested; state the validation method precisely.

## Controls and accessibility

| Input / requirement | Record |
| --- | --- |
| Keyboard | Not recorded; include complete playable controls, pause/restart and focus behavior |
| Mouse / pointer | Not recorded; describe applicable actions |
| Touch | Not recorded; include touch controls and relevant screen sizes |
| Gamepad, where supported | Not recorded; claim only verified mappings |
| Screen-reader names and state | **NOT TESTED**; accessible controls, instructions, status/error announcements and limitations |
| Contrast and focus | **NOT TESTED**; measured combinations and keyboard inspection |
| Reduced motion | **NOT TESTED**; describe implemented changes and verification |
| Responsive layouts | **NOT TESTED**; record tested viewport sizes and orientations |
| Language coverage | Not recorded; EN/DE/YO/PCM require complete implemented strings and language review |

## Loading and asset rights

Set a numerical initial-load/first-playable target with a named device, network
and cache condition. Record measured results separately from the target. Lazy
load the selected game's 3D code/assets; record download size, loading failure
behavior and retry path. No performance target has been verified by this template.

| Asset or dependency | Source / author | License or permission | Required attribution | Verification |
| --- | --- | --- | --- | --- |
| Not recorded | Not recorded | **NOT CONFIRMED** | Not recorded | No rights receipt recorded |

Include images, models, textures, audio, fonts, software, Scripture translations,
player likenesses, club marks and kits. Original assets must identify their
creator. Do not substitute unlicensed search-result images for cleared assets.

## Game-specific integrity

- **AI competition:** record backend deployment, actual provider/model IDs,
  concurrent dispatch evidence, speech-input support, timing methodology,
  judging rubric, failures/timeouts and real response receipts. Protect secrets
  and user prompts. Fixtures are test data; they must never be shown as live AI.
- **Football:** record playable match rules, controls, physics/opponents and
  rights for every represented team, player and kit.
- **Electronicer:** record circuit topology, component model assumptions,
  units, numerical/reference validation and playable construction/logic tasks.
- **Bible narrative:** record book/chapter/verse coverage, playable objectives,
  translation rights and the distinction between Scripture and adaptation.
- **Trading:** identify simulated/historical/live data, numerical validation,
  source/time/currency and limits. No guaranteed-return claims.
- **Console:** native releases need verified platform access, approved tooling,
  licensing and certification. Browser compatibility does not establish a
  native PS5, PS6 or PS8 release.

## Testing and deployment evidence

| Evidence | Command / procedure | Candidate SHA | Outcome / receipt |
| --- | --- | --- | --- |
| Unit tests | Not recorded | Not recorded | **NOT TESTED** |
| Integration tests | Not recorded | Not recorded | **NOT TESTED** |
| Browser playthrough and error recovery | Not recorded | Not recorded | **NOT TESTED** |
| Accessibility and responsive checks | Not recorded | Not recorded | **NOT TESTED** |
| 3D / 4K rendering inspection | Not recorded | Not recorded | **NOT TESTED** |
| Performance and initial-load checks | Not recorded | Not recorded | **NOT TESTED** |
| Asset-rights review | Not recorded | Not recorded | **NOT CONFIRMED** |
| GitHub Pages path | Not recorded | Not recorded | **NOT DEPLOYED** |
| Verified public URL and production flow | Not recorded | Not recorded | **NOT VERIFIED** |

Record verification times in ISO 8601 with an offset, with Europe/Berlin as the
human-facing time zone. Cite check logs, artifacts and deployment receipts.
Identify mocked coverage and checks that were unavailable. Do not convert an
unrun check into a pass or use an earlier candidate's results without verifying
their applicability to the release revision.

## Adopted standards and acceptance

- Policy: **HB-AI-ENGINEERING-001 · v2.0**, commit
  **`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`**.
- Design system: **`52f01f9986d97088413ca9785bc7a2d3f2967123`**.
- Design tokens actually used: **not recorded**; list corporate tokens and
  applicable division accent(s), with component/documentation references.
- Applicable technical or content references: **not recorded**.
- Acceptance: **In progress**. Mark **Real** only with demonstrated playable
  behavior and recorded scope; it must not imply that unverified 4K, 10,000-level,
  live-provider or console requirements have passed. Record **Blocked** with an
  exact dependency when it prevents further progress.
- Full game release: **NOT ACCEPTED** until all applicable requirements and
  evidence gates above are satisfied. Do not count this template in the
  2,000-game delivery target.
## Universal Game Studio layout

- Lock `html`, `body`, and `#studio` to `100vw` × `100vh` with zero margin,
  padding, and document scrolling. Use `100dvh` where supported so the layout
  follows the visible mobile viewport. Put the full-bleed gameplay canvas at
  `z-index: 1`. For games played through HTML, give the primary playfield the
  equivalent full-viewport treatment.
- Keep 90% of the playfield open during ordinary play. Visible interface chrome
  may cover at most 15%. Keep menus, dashboards, permanent text panels and
  multi-line sidebars out of the default view. Design controls for the title's
  own mechanics.
- Place up to four small, single-line glass pills at the top left, 16px from
  each edge. Each pill shows an icon and a short live value. Give icons and
  values accessible names without adding visible descriptions or sub-labels.
- Place compact 40 × 40px icon controls for help, audio and pause or menu at the
  top right, 16px from each edge. Use labels accessible to keyboard and
  assistive technology users. Include controls that apply to the title.
- Center the hotbar 16px from the bottom. Keep it at most 76px high, with
  60 × 60px square item, card, tool or ability tiles showing an icon and a short
  badge. Put no more than two primary actions, plus applicable reset or undo
  icons, at the bottom right. Adapt spacing and tile size at narrow widths
  so the zones never overlap or cover the playable target.
- Put instructions, detailed statistics, specifications and settings inside
  centered glass modals at `z-index: 20`. Open them on request through help
  or menu, or as appropriate at game start and game over. Give modal controls
  accessible names, keyboard dismissal and focus restoration.
- Use `pointer-events: none` on full-screen HUD wrappers and passive readouts.
  Apply `pointer-events: auto` to interactive controls and docks. Check that
  clicks and taps pass through passive overlays to the playfield.
- Verify the open-playfield area, absence of document scrolling, overlay
  separation, keyboard focus and touch input on desktop, phone portrait and
  phone landscape before releasing the title.

Each game uses one fixed viewport with zero document scrolling. Set `html`,
`body` and the main wrapper to `100vw` × `100vh` with zero margin and padding
and hidden overflow. Where supported, use `100dvh` to follow the visible mobile
viewport. A gameplay canvas fills that wrapper. Menus, HUDs, start and finish
screens and controls are positioned layers over the play surface. Set
`pointer-events: none` on passive HUDs and `pointer-events: auto` on controls.
Keep long content in bounded panels. Verify touch, keyboard, focus and layout
at desktop, phone portrait and phone landscape sizes.
