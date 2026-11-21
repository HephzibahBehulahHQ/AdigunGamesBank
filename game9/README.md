# Goal Line

Goal Line is an original browser football clearance drill for Adigun Game Bank. Move a defender along the goalmouth, meet a rolling ball and return it through a marked outlet gate. The live feed advances in real time; pause or use the step controls for 0.1 s increments. A missed contact, unsafe clearance or conceded goal ends the drill. Restart resets that drill. Clear every ball to unlock the next drill.

- **Rendering** — Three.js WebGL 2 with adaptive, 1080p and 4K UHD canvas modes. The experimental 16K setting renders the scene into a measured 15,360 × 8,640 GPU framebuffer and scales that scene to the browser canvas. A rejected framebuffer returns to adaptive mode. The text controls and numerical readings provide the same rules if graphics are unavailable.
- **Camera** — Goal view frames the clearance from behind the net. Broadcast view gives a lower, side-on look at the players and the approach. Switching views leaves the current drill in place. Reduced motion keeps either camera on its wide framing.
- **Campaign** — 10,000 deterministic drills, Beginner to Professional Master. Difficulty changes the pace, approach time, crossing positions, gate width, surface drift and ball count. From Apprentice onward, a moving opponent covers part of the outlet and can intercept an otherwise accurate clearance. From Expert onward, the receiving teammate moves along the outlet line and the pass is judged against the teammate's position on arrival. The automated solver uses the same movement and clearance commands as players. Browser-local storage persists completed drills under the shared campaign schema. Old penalty shootout results belong to the historical game and do not unlock clearance drills.
- **Model** — Positions are metres. The 7.32 m goal uses a full-ball goal-line crossing. Feeds keep constant horizontal velocity. From Skilled onward, selected feeds follow two gravity arcs with energy lost at the first bounce. The defender moves 0.45 m per tick and can strike balls up to 0.40 m high. A clearance knocks a bouncing ball down. Clearances start at 4–22 m/s upfield, slow by 1.8 m/s², and follow the selected angle and surface drift. A pressing player can intercept when the ball passes within 0.42 m plus its radius at their upfield position. Both interception and receiving use the calculated arrival time. Contact, resistance and gate thresholds are training-game abstractions. Goal and ball dimensions follow IFAB Laws 1 and 2.
- **Controls** — Tab and Enter activate all commands. Native arrow keys operate the aim slider. With the drill controls focused during a live feed, hold A or D to move and Q or E to aim, press F to clear, or Escape to pause. The standard browser gamepad mapping supports the left stick, D-pad aim, bottom face button to clear, Menu to start or pause, right face button to advance, and top face button to restart. Mouse and touch use the visible command buttons. The renderer interpolates the ball and defender between simulation states unless reduced motion is requested. Interface language is English.
- **Audio** — Enable Sound to hear original synthesized footfalls, ball strikes, interceptions and net impacts. Sound is muted on each new page load. The position and outcome text supplies the same information without sound.
- **Assets** — Original pitch layout, kits, poses and game logic. The three fictional players use MakeHuman's CC0 base mesh, skeleton, weights and skin atlases with different player builds. The turf uses the 1K diffuse and OpenGL normal maps from Charlotte Baglioni's CC0 [Leafy Grass](https://polyhaven.com/a/leafy_grass). Shared corporate identity artwork is covered by the repository asset record. Vendored Three.js uses its supplied MIT license. No club insignia or real-player likenesses.
- **Performance target** — First actionable controls within 3 seconds on a desktop browser with cold cache and a 20 Mbps connection. The 3D module loads after the controls initialize. Hardware timing and physical input qualification are open.
- **Verification** — Run `node --test tests/goal-line.test.js`. The release workflow also checks keyboard play, progression, fallback and the actual 4K buffer through Playwright. Current release evidence belongs in the project status.
- **Deployment** — GitHub Pages route `/AdigunGamesBank/game9/`. The conversion remains in progress until applicable release gates pass.
- **Standards** — HB-AI-ENGINEERING-001 v2.0 at the repository pin. Navy, Royal Blue, Metallic Gold and Ivory from the pinned design system.

## Hardware checks

On a machine with the repository's locked Playwright dependencies and Chrome
installed, run `npm run build`, then
`node scripts/check-goal-line-hardware.mjs 16k 30`. Use `4k` to check the 4K mode.
The optional second argument is the number of live feeds to sample.
The script opens the static build in Chrome without forced software rendering,
uses an isolated save for an Apprentice drill, and samples frames that submit
draw calls during live play. The report records the GPU renderer, WebGL limits,
actual render and display buffer sizes before and after play, and median and 95th-percentile
frame intervals. Restart gaps are excluded from the interval percentiles.
Files are written under `test-results/goal-line-hardware-16k/`
or the corresponding 4K directory. The viewport screenshot shows the scene;
the render buffer dimensions and framebuffer completeness come from WebGL. A fallback, lost context,
software renderer or incomplete workload does not qualify.

## Defender source and rebuild

The sky uses a 2048 × 1024 version of the CC0 panorama
[Kloppenheim 05 (Pure Sky)](https://polyhaven.com/a/kloppenheim_05_puresky)
from Poly Haven, photographed by Greg Zaal and edited by Jarod Guest.

The rig and mesh come from the MakeHuman contributors under [CC0 1.0](https://www.makehumancommunity.org/about/license.html). To rebuild the packed, metre-scale browser mesh, place these original inputs in the local `dist` directory and run `node scripts/build-goal-line-player.mjs`. The script checks each source blob before packing.

| Local input | Pinned source |
| --- | --- |
| `makehuman-base.obj` | [Base mesh](https://github.com/makehumancommunity/makehuman/blob/3c701a8e52f09e69922e8b598d23be2d7dfc49e3/makehuman/data/3dobjs/base.obj) |
| `makehuman-skeleton.json` | [Default rig](https://github.com/makehumancommunity/makehuman/blob/83e03219db67b639d15671a3ddc9d3ec2e76a121/makehuman/data/rigs/default.mhskel) |
| `makehuman-weights.json` | [Default skin weights](https://github.com/makehumancommunity/makehuman/blob/101de03dae28a612ab336524167b96222bd8217f/makehuman/data/rigs/default_weights.mhw) |

The three 1024 × 1024 skin JPEGs were made from the original PNGs in the
[MakeHuman system assets CC0 pack](https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip).
The defender uses `young_african_male`, the pressing player
`young_caucasian_male`, and the receiver `young_asian_male`. Skin textures
use the source atlas coordinates. Kit numbering and fabric remain on their
separate UV map.
