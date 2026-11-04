# Second-wave verification evidence

Source: `2bfd8bfa6c676a3caaa763f332fadb3fb78b1362`. [CI run 41789834075](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41789834075) passed 137 JavaScript, 50 API and 20 browser checks (seven accessibility plus thirteen gameplay/reflow). No skipped or flaky browser cases.

[Immutable receipt](verification-2bfd8bf.json) retains test timings, build fingerprint, artifact ID and SHA-256 hashes for the original inspected screenshots:

- [Tactics 4K](tactics-4k.png): actual 3840 × 2160 WebGL2 drawing buffer, zero GL error.
- [Tactics victory](tactics-win.png): first mission completed using 17 real command inputs; round 8, one surviving drone, all opponents disabled. Level 2 unlock/reload passed.
- [AI stage 4K](ai-arena-4k.png): original 3D scene with eight unconfigured providers and unknown scores. Previewing a challenge invents no results or progress.
- [Football full time](football-fulltime.png): 4–0 win, one substitution applied, level 2 unlocked.

The framebuffer was measured directly, while the screenshots record the browser viewport. SwiftShader is a software renderer; these checks are not gaming-GPU benchmarks. Automated accessibility checks do not establish full screen-reader, physical touch or controller conformance. No live AI request or certified console build was exercised.

Later acceptance and deployment belong to [PROJECT_STATUS.md](../../../PROJECT_STATUS.md), with their own exact revision receipts.
