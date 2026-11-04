# Adigun Game Bank

**One Company. Five Brands.** A Hephzibah Behulah browser-game collection being rebuilt to the owner's production requirements.

The authoritative brief is [Adigun Game bank pursuing goals and template.md](<Adigun Game bank pursuing goals and template.md>). The target is **2,000 individually designed games**, each with **10,000 meaningful levels**, real 3D scenes and verified 4K rendering. **The full target is not delivered.** Read [PROJECT_STATUS.md](PROJECT_STATUS.md) for current evidence and limitations.

## Current implementation

- **Electronicer · game3/** replaces the electrical quiz with a real DC circuit commissioning game: five network topologies, live meters, wiring/contact logic, fuse failures and 10,000 deterministic solvable tasks. It uses original 3D components.
- **World Football · game11/** replaces the old 2D match with original 11v11 gameplay, ball physics, passing, shots, keepers, goals, restarts, match results and 10,000 distinct difficulty/objective configurations. Players, teams and kits are fictional. Offside involvement, fouls, direct/indirect free kicks, penalties, yellow/red cards and five substitutions across three stoppage windows are implemented; rule simplifications are documented in its game README.
- **AI Arena · game22/** sends selected competitors the same prompt concurrently through server-side APIs. ChatGPT/OpenAI, Claude, Gemini, DeepSeek, Grok, Kimi, configurable Adigun AI and Ollama adapters are implemented. Speed is measured; judge scores include provenance and unknown scores remain unknown. **Live deployment needs an API host, provider credentials/model IDs and a configured judge.** An original 3D stage and 10,000 substantive coding/prediction challenges are implemented. All 10,000 authored references pass the actual restricted evaluator; progression requires fresh scored live results and an independent judge. Live play remains blocked until the gateway is configured.
- **Valley of Elah · game23/** introduces Bible Chronicles through David’s Sling: a real 3D ballistic game with gravity, crosswind, finite stones, win/loss states and 10,000 verified challenge configurations. The complete Genesis-to-Revelation story and separate Samson, Moses, Abimelech and other games remain unfinished.
- **TACTICS GRID · game15/** rebuilds the existing title with original 3D drones, 10,000 unique connected terrain layouts, elimination/uplink/retrieval objectives and full keyboard/text command controls. Genuine win/loss/retry and saved progression are tested; current browser evidence belongs in the project status.
- **Ark: The Waterline Commission · game24/** is a distinct Genesis 6–9 cargo and buoyancy game: six stores, sealed ballast tanks, numerical launch trials, loss/retry and saved progression. All 10,000 configurations pass complete engine trials. Actual 4K, 100% completion, keyboard fallback and reload are browser-verified; [play the published chapter](https://adigungamesbank.hephzibahbehulah.com/game24/). Production device, performance, accessibility and localization qualification remain open.
- **Neon Pulse · game1/** rebuilds the legacy colour activity as a 3D signal-routing puzzle: coupled pulses, a finite budget, undo/hints, explicit failure/completion and 10,000 computationally solvable matrices.
- **Fuse Box · game8/** provides a 3D DC cabinet commissioning game: load allocation, breaker inventory/budget, cable-current limits, overload trips, isolation/reset and a three-stage operating trial.
- **Apex Circuit · game10/** is a proper closed-course 3D time trial with steering/throttle/braking, grip and track limits, ordered lap gates and recovery penalties.
- **Penalty Pro · game17/** rebuilds penalty placement with ballistic shots, explicit frame/keeper collision, wind and finite five-kick objectives. These four conversions' verification and publication states are recorded in the current project status.
- Existing local games remain available, with explicit **Legacy 2D** labels. They have not passed the new production qualification. Original historical status is retained in [docs/history](docs/history/legacy-status-2026-10-27.md).

Stages, seeded variants and renamed templates are never counted as additional games. Automated generator checks are not claims of 10,000 manual playtests. Native PlayStation builds are not available.

The verified development build is live at **https://adigungamesbank.hephzibahbehulah.com/**. [Recorded test and deployment evidence](docs/evidence/2026-11-04/README.md) includes actual 4K buffers, completed gameplay flows, source hashes and the remaining qualification limits.

## Play and develop

Use Node.js 24+ and Python 3.12+. Serve through HTTP; opening index.html as a file is not supported.

```sh
npm ci
npm run check
npm test
npm run build
npm run serve
```

Open http://localhost:4173/ after `npm run serve`. The static export is in `dist/`. Three.js is locally vendored under its MIT license, so gameplay does not depend on a third-party script CDN. The heavy 3D module is loaded only on 3D game routes. `npm run vendor` reproduces the pinned bundle.

### Browser and API verification

```sh
npx playwright install --with-deps chromium
npm run test:browser
python -m pip install -r platform/backend/requirements.txt
python -m pytest platform/backend/tests -q
```

The browser suite starts its own static server on port 4180. CI uses Ubuntu 24.04, records actual WebGL drawing-buffer dimensions, plays through controls, checks 320px/390px responsive layouts and automated WCAG 2.1 A/AA rules without rule exclusions, and uploads screenshots and test reports. A software-rendered 3840 × 2160 frame verifies raster dimensions, not gaming-GPU performance. Hardware performance and complete accessibility need separate qualification.

For the separately hosted AI API, follow [platform/README.md](platform/README.md). Never put provider keys in client code or GitHub Pages. Test transports and fixtures stay in tests; production has no replay fallback.

## Standards and releases

The product explicitly adopts **HB-AI-ENGINEERING-001 v2.0**, pinned in [AGENTS.md](AGENTS.md). [docs/STANDARDS.md](docs/STANDARDS.md) pins the corporate, design-system and trading references. [docs/GAME_TEMPLATE.md](docs/GAME_TEMPLATE.md) defines the required evidence for every game.

The catalog and new games use the official unmodified corporate artwork, Midnight Navy, Royal Blue, Metallic Gold, Ivory, and approved division accents. The catalog includes working search, filters and a persistent light/dark theme. The interface is currently English; a language selector will be exposed only when translations are complete.

GitHub Pages publishes the existing main/root site and retains its CNAME. Work is checkpointed on a scoped branch, tested, integrated and verified against the actual public deployment. Repository status records exact commits and times. The existing Godot couch suite remains a separate development target; its Node2D scenes are not native console releases or 3D-certified games.

### Second-wave public milestone

The current source milestone `88c3035320044b254ed719ef840f527aa5520e2c` passed **142 JavaScript, 52 API and 23 browser checks**, including actual 4K on all five rebuilt routes, full-game completion, automated accessibility and explicit test-only AI contract regressions. **61 public files matched the deployed source exactly.** [Retained test/deployment evidence](docs/evidence/2026-11-04-wave2/README.md). Live AI configuration, full production/device qualification, the remaining 18 legacy rewrites and the wider 2,000-game/Bible/console scope are still unfinished.
