# Second-wave verification evidence

Source: `2bfd8bfa6c676a3caaa763f332fadb3fb78b1362`. [CI run 41789834075](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41789834075) passed 137 JavaScript, 50 API and 20 browser checks (seven accessibility plus thirteen gameplay/reflow). No skipped or flaky browser cases.

[Immutable receipt](verification-2bfd8bf.json) retains test timings, build fingerprint, artifact ID and SHA-256 hashes for the original inspected screenshots:

- [Tactics 4K](tactics-4k.png): actual 3840 × 2160 WebGL2 drawing buffer, zero GL error.
- [Tactics victory](tactics-win.png): first mission completed using 17 real command inputs; round 8, one surviving drone, all opponents disabled. Level 2 unlock/reload passed.
- [AI stage 4K](ai-arena-4k.png): original 3D scene with eight unconfigured providers and unknown scores. Previewing a challenge invents no results or progress.
- [Football full time](football-fulltime.png): 4–0 win, one substitution applied, level 2 unlocked.

The framebuffer was measured directly, while the screenshots record the browser viewport. SwiftShader is a software renderer; these checks are not gaming-GPU benchmarks. Automated accessibility checks do not establish full screen-reader, physical touch or controller conformance. No live AI request or certified console build was exercised.

Later acceptance and deployment belong to [PROJECT_STATUS.md](../../../PROJECT_STATUS.md), with their own exact revision receipts.

## Final second-wave candidate

[CI run 41791946076](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41791946076) at `88c3035320044b254ed719ef840f527aa5520e2c` passed **142 JavaScript, 52 API and all 23 browser checks** (eight accessibility, two isolated contract/fallback checks, thirteen actual-gameplay/reflow checks), with no skipped or flaky browser cases. [Exact receipt](verification-88c3035.json).

The AI/tactical 4K and tactical-win PNGs from this candidate are byte-identical to the inspected originals above. The [new football full-time frame](88c3035-football-fulltime.png) was inspected and shows **3–0**, one substitution, and level 2 unlocked. All five rebuilt 3D routes obtained actual 3840 × 2160 WebGL2 buffers, with zero GL error. Local and CI clean builds match the 131-file runtime SHA-256 `f12939e10ff338b787f4b693af6a8ee2fca82da9472a6019dc96c044c34baf75`.

The gateway browser regression explicitly labels its responses as **TEST-ONLY** doubles. It verifies frontend request binding, stale-result clearing and account isolation; it does not establish live model output.

## Public deployment

The candidate was integrated at 08:32:55 CET and Pages run [41793027036](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41793027036) succeeded at 08:34:02 CET. [Exact public-source receipt](deployment-88c3035.json): **61 files matched** at 08:35:24 CET on 2026-11-04. The canonical public site is https://adigungamesbank.hephzibahbehulah.com/. Use `scripts/verify-public.py COMMIT --output receipt.json` from the checkout of the exact revision to repeat the availability/hash check.
