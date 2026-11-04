# VALLEY OF ELAH — David’s Sling

The first playable **Bible Chronicles** chapter in Adigun Game Bank: a 3D sling precision game inspired by **1 Samuel 17**. Two practice shields teach the trajectory before a non-graphic encounter with an armored champion's bronze target. Five stones must complete all three shots. Missing, exhausting the stones, pausing, retrying, winning and progressing are implemented gameplay states.

This single chapter does **not** deliver the entire Genesis-to-Revelation story. Samson, Moses, Abimelech, other biblical conflicts and further chapters remain future product work; they are not represented as released games here.

## Game template

| Requirement | Implementation / acceptance |
| --- | --- |
| Title | VALLEY OF ELAH — David’s Sling |
| Genre | 3D projectile precision / Bible narrative adaptation |
| Target platform | Desktop and mobile browsers with WebGL 2; no native console claim |
| 4K / 3D | Real Three.js WebGL geometry, lighting, shadows and projectile scene. The selectable 4K mode requests a 3840 × 2160 drawing buffer and displays the actual resolution. Browser/frame inspection and production performance evidence belong in the project status; code alone is not acceptance |
| Levels | 10,000 distinct deterministic configurations, three target shots each; Beginner → Apprentice → Skilled → Expert → Professional Master |
| Controls | Keyboard, pointer/touch drag, sliders, explicit throw/pause/retry/next controls and three camera views |
| Accessibility | Keyboard focus, labelled controls and range values, textual target and aiming telemetry, optional trajectory guidance, reduced-motion effects, automatic inactivity pause |
| Performance | Static page and game-specific ES modules. Three.js and game geometry load only when this route is entered. Initial interactive-load goal: under five seconds on a documented broadband test; 4K frame-rate qualification remains a measured-device gate |
| Asset rights | Original procedural terrain, river stones, sling, shields and character geometry. Unchanged corporate artwork is documented in `docs/STANDARDS.md`. No player/actor likenesses, stock art, provider audio or third-party game textures |
| Testing evidence | `node --test tests/bible.test.js`: all configurations have a legal quantized solution and all 10,000 full simulated levels complete. Separate browser acceptance is required |
| Deployment | Existing Pages route `/AdigunGamesBank/game23/`; actual public URL and deployed commit must be verified in `PROJECT_STATUS.md` |
| Status | **In progress** pending browser, visual, 4K-buffer and performance acceptance. The core gameplay and generated-level validation are implemented; full Bible coverage is not |
| Policy adopted | HB-AI-ENGINEERING-001 v2.0 at `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e` |
| Design tokens | Design-system commit `52f01f9986d97088413ca9785bc7a2d3f2967123`; Midnight Navy, Ivory White, Royal Blue and Evangelism Metallic Gold, shared corporate header and original official artwork |

## Narrative source and adaptation boundaries

Source: [1 Samuel 17, World English Bible Classic](https://ebible.org/eng-web/1SA17.htm), verified on 2026-11-04. The chapter describes the armies at Elah, David selecting five stones, and his confrontation with Goliath. The source marks its text as public domain. The game uses an original summary, not a purported Scripture quotation.

Practice targets, controllable wind, measured distance, the stationary champion and a non-lethal shield objective are invented gameplay. They are explicitly distinguished from the biblical account. All figures are original procedural development art, not photorealistic, archaeological or likeness reconstructions. No graphic injury is shown.

## Rules and controls

Begin the challenge. Adjust direction (−25° to +25°), elevation (12° to 62°) and release speed (8 to 36 m/s). Strike inside the gold ring at each of the three target stations. The first two are practice shields; the third is the champion's bronze shield. Every throw consumes one of five stones. Three hits win. Exhausting the stones before all three hits loses. A retry restores the current level's five stones without deleting earlier progress.

Mouse/touch dragging adjusts aim and never releases a stone. Sliders and the **Throw stone** button provide the full touch interface. With the canvas focused, arrows adjust direction/elevation, Z/X adjust speed, Shift enables fine adjustment, Space throws, Enter starts/resumes, Escape pauses and R retries. All controls remain available as labelled page elements. Target view can inspect the ring; the overhead view shows the full trajectory.

Trajectory guidance and the text equivalent expose the projected error or hit using the actual physics. The aid never fires or clears a target. Turning it off changes the assistance, not the collision rules. Inactivity pauses a projectile without advancing its trajectory; reduced motion disables cosmetic shield wobble and no camera shake is used.

## Physics and solvability

The release point is `(0, 1.55, 0)` metres. The y axis is vertical; x crosses the valley and z points downrange. Given direction `a`, elevation `e` and release speed `s`, initial velocity is:

```text
vx = s cos(e) sin(a)
vy = s sin(e)
vz = s cos(e) cos(a)
x(t) = vx t + 0.5 wind t²
y(t) = 1.55 + vy t − 0.5 × 9.81 × t²
z(t) = vz t
```

Wind is explicitly a constant sideways acceleration in m/s², not an asserted meteorological wind-speed conversion. Drag, sling biomechanics and decorative terrain undulations are simplified; collision uses a level floor. A target is a circular disk in its downrange plane. The engine calculates the exact crossing time and landing time, preventing fast stones from skipping targets between frames. Target contact includes the stone's 0.045 m collision radius; the visible stone is slightly enlarged for readability.

Every generated target has a constructive solution: choose a flight time of `sqrt(2 × range / 9.81)`, solve the three velocity components for the target centre and convert them back to legal aim controls. The validation oracle snaps values to the same 0.1°/0.1 m/s precision as the actual UI and checks all 30,000 target shots. It also plays all 10,000 complete levels through the normal throw/flight/feedback/win state machine. The oracle is a verification utility, not a player auto-win control.

The campaign changes actual range, crosswind, sideways offset and target radius with increasing overall difficulty. Tests reject duplicated mechanical configurations. These are 10,000 challenges **inside one game**; they do not increase the distinct-game count. They have automated solvability evidence, not 10,000 separate human playtests.

## Progress and verification

Campaign progress is device-local. Only the next uncleared level can advance the saved campaign; replaying a win cannot award it twice. Storage failures preserve session play. There is no cloud account, paid reward or remote leaderboard claim.

Run `node --test tests/bible.test.js` from the repository root. The suite covers all-level uniqueness and complete solvability, constant-acceleration reference values, finite-ammunition wins/losses, pause preservation, progression replay safety and invalid inputs. See [TEST.md](TEST.md) for browser acceptance. The exact integrated commit, verification times and deployment receipts remain in [PROJECT_STATUS.md](../PROJECT_STATUS.md).
