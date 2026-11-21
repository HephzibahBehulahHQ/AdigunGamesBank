# Goal Line

Goal Line is an original browser football clearance drill for Adigun Game Bank. Move a defender along the goalmouth, meet a rolling ball and return it through a marked outlet gate. Each command advances simulation time by 0.1 s. A missed contact, unsafe clearance or conceded goal ends the drill. Restart resets that drill. Clear every ball to unlock the next drill.

- **Rendering** — Three.js WebGL 2 with adaptive, 1080p and 4K UHD modes. The experimental 16K UHD setting requests 15,360 × 8,640 only if the device reports sufficient limits. A rejected drawing buffer returns to adaptive mode. Actual 16K on supported hardware is unverified. The text controls and numerical readings provide the same rules if graphics are unavailable.
- **Campaign** — 10,000 deterministic drills, Beginner to Professional Master. Difficulty changes the pace, approach time, crossing positions, gate width, surface drift and ball count. The automated solver uses the same movement and clearance commands as players. Browser-local storage persists completed drills under the shared campaign schema. Old penalty shootout results belong to the historical game and do not unlock clearance drills.
- **Model** — Positions are metres. The 7.32 m goal uses a full-ball goal-line crossing. Grounded feeds follow straight paths at fixed velocity. The defender moves 0.45 m per tick. The clearance model projects the chosen angle and quadratic surface drift to an outlet 8 m upfield. Contact and gate thresholds are training-game abstractions. Goal and ball dimensions follow IFAB Laws 1 and 2.
- **Controls** — Tab and Enter activate all commands. Native arrow keys operate the aim slider. Mouse and touch use the same controls. The pitch is rendered as discrete simulation states without animation. Interface language is English.
- **Assets** — Original pitch, kit treatment, defender poses and game logic. The fictional defender uses MakeHuman's CC0 base mesh, skeleton and weights. Shared corporate identity artwork is covered by the repository asset record. Vendored Three.js uses its supplied MIT license. No club insignia or real-player likenesses.
- **Performance target** — First actionable controls within 3 seconds on a desktop browser with cold cache and a 20 Mbps connection. The 3D module loads after the controls initialize. Hardware timing and physical input qualification are open.
- **Verification** — Run `node --test tests/goal-line.test.js`. The release workflow also checks keyboard play, progression, fallback and the actual 4K buffer through Playwright. Current release evidence belongs in the project status.
- **Deployment** — GitHub Pages route `/AdigunGamesBank/game9/`. The conversion remains in progress until applicable release gates pass.
- **Standards** — HB-AI-ENGINEERING-001 v2.0 at the repository pin. Navy, Royal Blue, Metallic Gold and Ivory from the pinned design system.

## Defender source and rebuild

The rig and mesh come from the MakeHuman contributors under [CC0 1.0](https://www.makehumancommunity.org/about/license.html). To rebuild the packed, metre-scale browser mesh, place these original inputs in the local `dist` directory and run `node scripts/build-goal-line-player.mjs`. The script checks each source blob before packing.

| Local input | Pinned source |
| --- | --- |
| `makehuman-base.obj` | [Base mesh](https://github.com/makehumancommunity/makehuman/blob/3c701a8e52f09e69922e8b598d23be2d7dfc49e3/makehuman/data/3dobjs/base.obj) |
| `makehuman-skeleton.json` | [Default rig](https://github.com/makehumancommunity/makehuman/blob/83e03219db67b639d15671a3ddc9d3ec2e76a121/makehuman/data/rigs/default.mhskel) |
| `makehuman-weights.json` | [Default skin weights](https://github.com/makehumancommunity/makehuman/blob/101de03dae28a612ab336524167b96222bd8217f/makehuman/data/rigs/default_weights.mhw) |
