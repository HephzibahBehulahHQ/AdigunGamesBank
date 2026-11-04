# Recorded browser evidence — 4 November 2026

[Verification run](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41771833545) tested commit `1002ca420bd76b10e94f29fd916374dfb13ed5f7`. It passed 88 JavaScript, 49 API and 11 browser tests. [verification.json](verification.json) retains the exact case outcomes, timings, environment, clean build fingerprint and screenshot hashes. The subsequent resilience checkpoint adds five JavaScript tests; see the current project status for its separate receipt.

The images below are unmodified browser screenshots. Each 4K test also read the actual WebGL2 drawing buffer as **3840 × 2160**, with GL error **0**. Full-page screenshot dimensions follow the CSS viewport; the screenshots themselves are not presented as raw 4K framebuffer exports. Frames were visually inspected.

- [Electronicer 4K rendering and commissioned circuit](electronicer-4k.png)
- [Football 4K rendering](football-4k.png)
- [Valley of Elah 4K rendering](bible-4k.png)
- [Valley of Elah first-level win through real aiming controls](bible-win.png)

Football completed a real keyboard-controlled match 3–0 in this run; the earlier successful run `41770210966` finished 4–0. Both inspected results unlocked level 2. The Bible test hit all three targets, advanced to level 2 and verified persistence after reload. Electronicer verified a real 15 mA circuit, fuse failure/repair and level persistence. API fixtures are test doubles and were not displayed as live AI answers.

These checks ran with a **software renderer**. They establish real 3D rendering and the drawing-buffer size, not sustained 4K performance on physical devices, production visual quality, full screen-reader parity or the complete 2,000-game requirement.
