# Goal Line: 5 November 2026 evidence

## Scope

One existing title, `game9`, is converted from a random nine-zone activity to a
real 3D striker-only shootout with keeper patrol, one-use run-up feint and an
expiring commitment, physical ball/contact scoring and 10,000 distinct numerical
configurations. This does not create 10,000 separate games or complete the
2,000-game project. Current release state belongs in
[PROJECT_STATUS.md](../../../PROJECT_STATUS.md).

## Verified local candidate

Source **`1ad5287a79473b214b95b8e48f5b4166e603af38`**, clean build; Node 24.22.1,
Playwright Chromium 141, Linux/SwiftShader. [Structured receipt](verification-1ad5287.json)
contains build hashes, exact commands, all six results and original frame hashes.

- Release integrity passed; static build contains 193 runtime files.
- Actual **3840×2160 WebGL2**, error 0, and **1920×1080** drawing buffers.
- All **six** browser scenarios passed with no skips or flaky results.
- Actual five-kick win, saved unlock and reload; keyboard defeat and retry;
  corrupt/legacy progression rejection; blocked-storage session progress;
  final-level mastery and 320/390px reflow; graphics loss with paused recovery;
  real-time keeper/shot play and pause.
- The final-level test preloads 9999 completed challenges as an explicit test
  fixture; all five final kicks still use the actual controls and simulation.
- 21 Goal Line numerical tests pass, including all 10,000 distinct configurations
  and 50,000 actual public-command kicks. The full local JavaScript suite passed
 290 checks and the backend passed 52, with the existing Starlette warning.

## Original inspected frames

- [Actual4K scene](1ad5287-goal-line-4k.png): screenshot at its displayed canvas
  size; the accompanying WebGL measurement establishes the actual 4K raster.
- [Five-kick win](1ad5287-goal-line-win.png).
- [Final mastery at 320px](1ad5287-goal-line-mastered-320.png), with the resized
  scene visibly redrawn after the correction.

## Preserved failure and corrections

[The initial 88e517f browser run](verification-88e517f.json) passed 4/5 flows.
Its context-loss test omitted the required Resume action and timed out against
the correctly disabled shooting control. The corrected test explicitly checks
the paused state, resumes and completes the same kick; the safety pause remains.

Review also corrected the 1080 option value, focus handoff after buttons disable,
BFCache preservation, an extreme-time arithmetic guard and manual-mode repaint
after resizing. The failed 320px frame had a blank pitch after a viewport resize;
the corrected original frame above shows the scene again. Shared rendering,
other game logic and official artwork were not changed.

## Limits

These are software-rendering and browser-control checks. Hardware frame-time
budgets, real touch/gamepad devices, full screen-reader play, human difficulty
balance, production art review and complete EN/DE/YO/PCM language coverage are
still open. Public deployment and full exact-candidate CI are recorded separately.
