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

## Browser acceptance checklist

1. Load `game23/` through HTTP. Inspect real terrain, river, leather sling, human-shaped figures and target geometry. Confirm no console errors and working official header/logo/navigation.
2. Begin, adjust direction/elevation/speed using keyboard, sliders and pointer/touch drag, then throw. Confirm the visible stone follows the trajectory and reacts to crosswind.
3. Miss a shot and verify measured error/shortfall, ammunition decrement and continued play. Exhaust all five stones and verify the loss screen and retry.
4. Strike both practice targets and the bronze target. Confirm the non-graphic victory, one campaign completion, next-level unlock and no repeated reward from replay. Reload to verify device-local persistence.
5. Pause in flight. Confirm position and time remain frozen; resume to finish the same throw. Switch tabs/windows and verify automatic pause.
6. Change camera modes and disable aiming guidance. Confirm text controls still permit play and the same collision rules apply.
7. Select 4K. Read the actual WebGL drawing buffer (3840 × 2160), inspect a rendered frame and record device/browser performance. A CSS size or option label is not evidence.
8. Check 320px mobile, desktop, zoom, focus visibility, labels, target/aim telemetry, reduced-motion preference and clear WebGL failure messaging. Verify touch controls on actual supported hardware when available.

Record observed outcomes, exact candidate/deployment revision and Europe/Berlin times in [PROJECT_STATUS.md](../PROJECT_STATUS.md). The browser, visual and 4K gates remain unverified until those observations exist.
