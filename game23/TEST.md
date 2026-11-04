# Valley of Elah verification

## Deterministic engine checks

From the repository root:

```sh
node --test tests/bible.test.js
node --check game23/app.js
node --check game23/scene.js
```

The all-level test verifies 10,000 distinct mechanical configurations, 30,000 legal target solutions at actual UI precision, and a complete three-hit victory through every level's real state machine. It does not claim human playtesting or graphical verification of all levels.

Other tests verify reference projectile coordinates, landing time, finite stones, failure/retry, pause/resume without hidden time advancement, sequential persistent progression and duplicate-clear rejection.

## Verified browser milestone

[CI run 41771833545](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41771833545)
succeeded at **`1002ca420bd76b10e94f29fd916374dfb13ed5f7`**, completed
**2026-11-04T05:17:33+01:00**. The repository run passed **88 JavaScript tests,
49 API tests and 11 browser tests, with no skips**.

| Check | Recorded result |
| --- | --- |
| Actual 4K rendering | WebGL 2 returned drawing-buffer width **3840**, height **2160** and `getError()` **0**. This used Chromium/SwiftShader software rendering |
| Playable first-level completion | Three successful throws through actual aiming controls; next level became available, level 2 opened, and reload retained level 2; no page errors |
| Responsive entry | 390 px viewport, no horizontal page overflow, keyboard entry focus and reduced-motion preference passed |
| Visual inspection | Run 41771833545: `bible-4k.png`, the mobile frame and `bible-win.png` inspected. The victory frame shows **3/3 targets in three throws, one cleared level and challenge 2 unlocked** |
| Hardware and complete access | Sustained physical-GPU FPS, physical touch devices, complete assistive-technology play, measured contrast and 320 px/zoom qualification remain **NOT TESTED** |
| Final deployment | Public verification of the final deployed revision remains pending |

The earlier [run 41770823345](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41770823345)
passed its Bible 4K check but failed the subsequent completion test because the
test attempted to change an aiming slider during disabled feedback. The revised
test waits for the real control to become enabled; the later successful run
above supplies completion evidence. The native cloud preview has GL disabled
and is not the source of these rendering results. Software-rendered 4K is not a
device performance measurement.

The browser report recorded **11 expected, zero unexpected, zero skipped and
zero flaky** results. Its run began at **2026-11-04T05:13:48.663+01:00** and
reported a duration of **218,962.25 ms**. These are test-run timing receipts, not
game frame-time measurements.

## Browser acceptance checklist

This is the broader qualification procedure. The receipt above covers only the
checks explicitly recorded; it does not imply that every step below has passed.

1. Load `game23/` through HTTP. Inspect real terrain, river, leather sling, human-shaped figures and target geometry. Confirm no console errors and working official header/logo/navigation.
2. Begin, adjust direction/elevation/speed using keyboard, sliders and pointer/touch drag, then throw. Confirm the visible stone follows the trajectory and reacts to crosswind.
3. Miss a shot and verify measured error/shortfall, ammunition decrement and continued play. Exhaust all five stones and verify the loss screen and retry.
4. Strike both practice targets and the bronze target. Confirm the non-graphic victory, one campaign completion, next-level unlock and no repeated reward from replay. Reload to verify device-local persistence.
5. Pause in flight. Confirm position and time remain frozen; resume to finish the same throw. Switch tabs/windows and verify automatic pause.
6. Change camera modes and disable aiming guidance. Confirm text controls still permit play and the same collision rules apply.
7. Select 4K. Read the actual WebGL drawing buffer (3840 × 2160), inspect a rendered frame and record device/browser performance. A CSS size or option label is not evidence.
8. Check 320px mobile, desktop, zoom, focus visibility, labels, target/aim telemetry, reduced-motion preference and clear WebGL failure messaging. Verify touch controls on actual supported hardware when available.

Record further observed outcomes, exact candidate/deployment revision and
Europe/Berlin times in [PROJECT_STATUS.md](../PROJECT_STATUS.md). Preserve the
verified milestone above while keeping unrun device, accessibility and broader
gameplay checks **NOT TESTED**. Later candidates need their own required checks.
