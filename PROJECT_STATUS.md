# Adigun Game Bank — current project status

Updated **2026-11-04T23:22:00+01:00 (Europe/Berlin)**. This is the current acceptance record.

## Acceptance

**In progress.** The original target of **2,000 individually designed games, each with 10,000 meaningful levels**, is not delivered. The four-game candidate keeps **24 existing titles** and converts four of them individually: **14 legacy 2D, nine local 3D games and one API-dependent 3D competition client**. These are candidate implementation counts, not a claim of complete production qualification. The public site still has the preceding counts until publication is verified.

This continuation does not add renamed templates or count procedural levels as separate games. Full Genesis–Revelation coverage, production art/device qualification, complete EN/DE/Yoruba/Nigerian Pidgin localization and native-console releases remain unfinished.

## Source and public state

| State | Verified revision / evidence |
| --- | --- |
| Integration branch | `work/finish-games-2026-11-04` |
| Latest verified work checkpoint | `24819e438121c52f2e47cbcb638934b735ca7c9a`, exact remote head read back **2026-11-04T22:00:05Z** |
| Current local changes | Final Penalty Pro game guide and reviewed wording/focus fixes; this status. New exact-candidate release gate pending. |
| Remote main at recovery | `e7c60ac89f987c93d7af5fc03ac6b21eaadcef18` |
| Last verified public gameplay source | `b3844bff8775b509ddda6f9002726bf4ec1dc89b`; [67-file exact-byte receipt](docs/evidence/2026-11-04-ark/deployment-b3844bf.json) |
| Existing public URL | <https://hephzibahbehulahhq.github.io/AdigunGamesBank/>, redirecting to <https://adigungamesbank.hephzibahbehulah.com/> |
| New publication | **NOT DEPLOYED** until the final candidate passes its gate and exact public-byte verification |

The preceding documentation-only Pages run [41891598230](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41891598230) timed out twice. Read-only diagnosis confirmed build/upload succeeded while publishing stalled; the preceding successful release used the same action revision and runner. Live catalog/status bytes still matched `b3844bf` when recovery began. No host, audience, permissions or action-version change was justified. The next tested source will use the existing Pages flow; an unchanged third retry is not the plan. [Previous failure receipt](docs/evidence/2026-11-04-ark/publication-e7c60ac.json).

## Implemented in the four-game candidate

| Existing title | Distinct playable work |
| --- | --- |
| **Neon Pulse — game1** | Original 3D LED matrix and coupled three-state signal puzzle. Target patterns, finite pulse budget, undo, hints, pause, loss/retry, keyboard/scene/DOM controls and sequential saves. All 10,000 distinct boards are solved through the actual engine within budget. |
| **Fuse Box — game8** | Original 3D DC distribution cabinet. Assign loads, fit finite breaker stock, respect budget/cable/supply current limits, run three operating profiles, isolate/reset real trips and repair the retained plan. All 10,000 distinct reference configurations complete through the numerical engine. |
| **Apex Circuit — game10** | Original closed-course 3D vehicle/track. Steering, throttle, brake, grip, ordered lap gates, invalid-sector latch, recovery/time penalties, finite qualification/loss, step driving and saves. All 10,000 physical configurations are distinct and geometrically checked; 12 representative complete races cover every tier boundary and the final level. |
| **Penalty Pro — game17** | Original 3D training ground and ten-turn shootout: five physical kicks followed by five player-controlled goalkeeper dives. Aim/elevation/power/wind, frame and goalkeeper collision, separate opponent-goal/save counters, explicit win/draw/loss, pause/retry and saves. All 10,000 campaigns complete through 50,000 physical shots and 50,000 physical saves. |

Each conversion includes its own game-template README, original-asset record, numerical tests, real-control browser tests and equivalent commands when WebGL is unavailable. Existing legacy assets/styles needed by other routes are retained. In particular, games 18–21 still depend on `game17/style.css`.

The catalog and asset inventory reflect these implementations without prematurely claiming new 4K or deployment evidence. `GAMES_STATUS.md` now includes Ark and correctly identifies the previously released Tactics Grid as 3D. Release syntax checks derive routes from the complete catalog. A concrete racing input defect was fixed: a second touch/focus change no longer releases an already held throttle or steering control.

## Verification so far

Exact candidate `8a9ff73d1de2184f4b9abe5b646012892830b81e` failed [CI 41921885769](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41921885769): **197 JavaScript + 52 API tests passed**, **13 accessibility + 8 contract/fallback + 22/23 rendered gameplay checks passed**. The sole failure was the Penalty Pro test’s exact `getByLabel` locator on a wrapping select label; the captured accessibility tree correctly exposes a Graphics combobox. The test now addresses that actual accessible role/name. No gameplay assertion was removed and no timeout was increased. A new exact-candidate gate remains required. The inspected Neon and Apex frames show actual original 3D; Neon’s first-board camera framing will be improved in the engineering integration.

| Check | Actual outcome / limit |
| --- | --- |
| Existing regressions + Neon, Fuse Box and racing tests | **182 passed**, zero failed/skipped in the local combined run before final penalty tests were added |
| Simultaneous racing input | **2 passed**: independent touches, focus blur, cancellation, lost capture, keyboard overlap and reset |
| Penalty numerical + legacy compatibility | **20 passed**, zero failed/skipped; includes the 10,000 complete campaigns described above |
| Release integrity | Passed for 24 unique catalog routes, local links, official artwork blob, policy pin and JavaScript syntax |
| Preliminary CI at `3b94403` | Node, API, build, accessibility/reflow and gateway/graphics-fallback stages passed; final rendered stage was still running when the next required recovery checkpoint was pushed. This preliminary run is not the final release gate. |
| Manual cloud-browser play | Neon first-board completion/save; Fuse Box valid 5/7/11 A branch plan, all three stages, 100% completion, 0.920 Wh, board 2 unlock and save feedback observed through the actual controls |
| Cloud-browser graphics | Explicit WebGL-disabled environment. Command play works; no 3D/4K claim comes from that browser. |
| Actual 4K, final accessibility and all affected browser flows | **PENDING** on the final exact candidate in Chromium/Ubuntu CI; inspect captured frames as well as real WebGL drawing-buffer measurements |
| Physical hardware/touch/gamepad/full screen-reader play | **NOT TESTED**; automated checks do not substitute for these |

The release workflow runs `npm run check`, `npm test`, the pinned Python API tests, a clean build and the browser suite. Tests assert true controls, failure/retry, save/reload, actual 3840 × 2160 buffers and narrow layouts; transport fixtures remain explicitly test-only. No live AI result is claimed.

Initial WIP failures were retained rather than published: the first Neon checkpoint lacked its newly linked README; the early accessibility run found redundant Neon accessible labels and legacy-route name mismatches before their conversions were included. The current Neon buttons derive accessible names from their visible text. A later intermediate WIP lacked the new racing README; all game guides now exist. Final release checks must verify these repairs.

## Recovery receipts

Plain Git write authentication was unavailable. The existing authorized GitHub connector created **identical Git trees**, used expected-head checks and normal fast-forward ref updates, then read back each exact head. Public Git fetch reconciled the local work branch to the identical-tree connector commit while preserving unstaged work. No credentials were exposed, force pushes performed or repository access changed.

| Useful work checkpoint | Exact remote verification |
| --- | --- |
| `f9a6a982947e8530b30ec195f8a6d83ea14e6b4e` | 21:44:17Z; first changed work was 21:41:59Z |
| `a14c4f5b54a74a40cbc66d940d90e01cd11ef516` | 21:46:36Z |
| `148954a88d43f84dd5a382c2ff4ce9769de16087` | 21:50:55Z |
| `3b94403ae1f62834a46854e4980109d61a96e71b` | 21:55:06Z |
| `24819e438121c52f2e47cbcb638934b735ca7c9a` | 22:00:05Z |

All above dates are 2026-11-04 UTC; add one hour for Europe/Berlin. First/subsequent changed checkpoints met the five-minute cadence. WIP status does not waive release gates. Simulated concurrent writers/interrupted-push recovery and the remaining policy recovery scenarios are **NOT TESTED** unless separately recorded. This receipt text is locally pending until its next checkpoint.

## Parallel engineering work

`work/finish-engineering-2026-11-04` is isolated at `/workspace/scratch/fc3241df4f14/AdigunGamesBank-engineering`. Its first RC engine checkpoint **`7db0840741f7ea29508bedf5dcaf88cc86f75cb8`** was remotely verified at **2026-11-04T21:59:16Z**, following first changed work at 21:56:34Z. Capacitor Charge, Circuit Rush and Resistor Match have exclusive writers. These conversions must be integrated and independently verified before their counts are included in a release.

## Remaining acceptance and external dependencies

- **Catalog:** the original 2,000-title target and remaining individual legacy conversions are open. Automated level generators are not separate titles or 10,000 manual playtests.
- **Bible:** the released David and Genesis ark chapters do not complete the full Genesis–Revelation campaign or requested Moses/Samson/Abimelech coverage.
- **Live AI:** an API host, server-side provider credentials, active model IDs and independent judge configuration are required. Adigun AI needs a real endpoint. No client key exposure or replay-as-live substitution is permitted.
- **Native consoles:** platform-holder developer access, approved tooling/SDKs, licensing and certification are required. Browser games and the separate Godot Node2D suite are not native PlayStation releases; future console availability is not assumed.
- **Production qualification:** hardware frame-time/initial-load measurements, physical device controls, complete language review, screen-reader play and production-art work remain open. The 3,000 ms load target is not a measured result.

Policy remains **HB-AI-ENGINEERING-001 v2.0**, `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`; design system remains `52f01f9986d97088413ca9785bc7a2d3f2967123`. [Standards](docs/STANDARDS.md), [asset rights](ASSETS.md) and [prior release evidence](docs/evidence/2026-11-04-ark/README.md) remain in force.

## Next bounded action

Run the complete exact-candidate release gate, inspect actual 4K captures, correct observed failures, fast-forward main only after it passes, then publish and verify source bytes at the existing public URL. Continue the isolated engineering conversions without representing them as released. Full-project finish time is **unknown**; ETA **pending**.
