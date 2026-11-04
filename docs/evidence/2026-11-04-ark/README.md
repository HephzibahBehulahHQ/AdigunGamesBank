# Ark chapter verification evidence

The new title is **Ark: The Waterline Commission**, `game24/`. It remains a development milestone under the full production brief.

## Current published development release

**`b3844bff8775b509ddda6f9002726bf4ec1dc89b`** passed **153 JavaScript + 52 API + 27 browser checks** in [CI 41887296841](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41887296841). Main readback was verified at **2026-11-04T18:36:31Z**; [Pages 41888830443](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41888830443) completed successfully at **18:36:58Z**. All **67 checked public files** returned HTTP 200 and matched the exact source bytes by **2026-11-04T18:41:10Z**.

**Play:** https://adigungamesbank.hephzibahbehulah.com/game24/

- [Passing source/build/browser receipt](verification-b3844bf.json)
- [Per-file public deployment receipt](deployment-b3844bf.json)
- [Latest 100% voyage completion](b3844bf-ark-win.png)
- [Latest football 2–0 result and applied substitution](b3844bf-football-fulltime.png)

The retained 4K scene and 320px image are byte-identical to the corresponding captures from this passing revision. The full target and production qualification remain in progress.

## Verified chapter behavior

[CI 41885055957](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41885055957), source `f5378f561bb7a8ef9c3a725d7ef6425f371c4234`, passed all three ark browser checks. They use player controls to load six stores, adjust ballast, reject an incomplete manifest, pause/resume, finish the numerical water trial, show 100%, unlock voyage 2 and restore it after reload. A deliberately unavailable-WebGL test uses keyboard commands to fail an unbalanced launch, retain the plan, rebalance and finish successfully. That test is command-play evidence, not 3D evidence.

The actual renderer produced **3840 × 2160**, WebGL2, with zero GL error. The original timber/cargo scene and the 100% completion frame were inspected. The 4K screenshot is a browser capture of the displayed canvas; drawing-buffer dimensions come from the WebGL query, not from resizing the screenshot. The 320px/390px layouts and all nine automated WCAG 2.1 A/AA audits passed without rule exclusions. Physical touch, full screen-reader, localization and hardware performance qualification remain open.

- [Original 4K-rendered scene](ark-4k.png)
- [Completed voyage: 100%, six loads, saved progress](ark-win.png)
- [320px layout](ark-mobile-320.png)
- [Immutable source/test/build receipt](verification-f5378f5.json)

## Aggregate gate history

`d3797b95d20c3ef22e925a83d718e944bb765b74` passed **153 JavaScript + 52 API + 27 browser checks** in [CI 41883610973](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41883610973). Visual review then found the successful ark trial displaying 99% because of floating-point rounding; `f5378f5` corrected that display and added two browser assertions.

The aggregate `f5378f5` gate was **not a pass**: 26 browser checks passed and the football roster assertion failed. Its own failure snapshot recorded a 2–0 win, one substitution and `Adigun #12: sent off`. The test had incorrectly required the dismissed substitute to remain in the active-player selector. The corrected test verifies the exact #11→#12 request, one applied substitution, removal of #11 and either active #12 or the explicit dismissal record. The corrected aggregate gate passed at `b3844bf` as recorded above. No assertion was simply removed and no failed candidate was approved for publication.

All 10,000 ark configurations complete their numerical launch through normal engine controls in seven domain tests. This is automated solvability coverage, not 10,000 manual playtests. Current acceptance and public deployment receipts belong in [PROJECT_STATUS.md](../../../PROJECT_STATUS.md).

## Final source publication blocker

[Publication receipt for e7c60ac](publication-e7c60ac.json) records the exact successful 153/52/27 application gate, verified main readback, two GitHub Pages deployment timeouts, and both unsuccessful checks of the 11 changed public files. The prior 67-file gameplay deployment remains the last verified public release. This additional recovery record is a work-branch checkpoint; its own release gate/publication is not claimed.
