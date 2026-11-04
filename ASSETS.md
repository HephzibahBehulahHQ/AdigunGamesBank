# Asset record

- `game15` (TACTICS GRID): all board, terrain, and unit visuals are generated with Canvas drawing commands in `app.js`. No third-party images, fonts, sound, logos, or other external assets are included.
- Root brand asset `assets/hb-logo.svg` is the repository's supplied Hephzibah Behulah logo.
- `game16` (APEX STRATEGY): circuit visualization and timing chart are drawn in Canvas. No third-party images, fonts, sound, logos, or external race data are included.

- game17 (PENALTY PRO): pitch, goal, goalkeeper, ball and shot-path visuals are drawn using Canvas; no external images, fonts, logos or licensed sports assets.
- game18 (DEBATE ARENA): all visuals use native HTML/CSS; responses are authored local fixtures; no external images, fonts or licensed assets.
- game19 (CASEFILE): all interface visuals are native HTML/CSS; no external images, fonts or licensed assets.
- game20 (MARKET DUEL): price chart drawn in Canvas; no external images, data feeds, logos or licensed assets.

## Explicit 2026-11-04 adoption

- `assets/corporate/hephzibah-behulah-official.jpg`: supplied corporate artwork copied unchanged from hb-design-system commit `52f01f9986d97088413ca9785bc7a2d3f2967123`; original Git blob `f7b0e4a650d861fb9d52ed91ea894edec030e03b`, 54,461 bytes. Use for the new corporate header. The old SVG remains only on legacy pages and is not asserted to be the canonical design-system mark.
- `vendor/three/three.module.js`: Three.js 0.187.0, bundled from the pinned npm package with esbuild 0.25.12. MIT license retained in `vendor/three/LICENSE`; no hosted-CDN runtime dependency.
- Electronicer: original procedural resistor, patch-board, meter, fuse, cable and supply geometry/materials. No photographed people or external component-brand assets.
- World Football: original fictional team names, procedural articulated players, stadium, pitch, nets, ball and kit colors. No real player likenesses, club crests or licensed kits are used by the rebuilt game. Production rigging/art qualification remains unfinished.
- Catalog pitch art and category symbols are interface illustrations, not gameplay screenshots.
- Bible chapter: original procedural scene and original adaptation summaries, with passage references in its game README. No claim of archaeological reconstruction or entire-Bible coverage.
