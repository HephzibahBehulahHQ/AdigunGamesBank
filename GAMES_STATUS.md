# Game inventory

Current acceptance and verification live in [PROJECT_STATUS.md](PROJECT_STATUS.md). This inventory replaces earlier unconditional DONE labels. The nine new conversions are published at `5547a53`, after [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881) passed 269 JavaScript, 52 API and 69 browser checks. Their 115-file public comparison matched exactly. Broader production acceptance remains open; [current evidence](docs/evidence/2026-11-04-nine-games/README.md).

| Route | Title | Current implementation | Acceptance |
|---|---|---|---|
| game1/ | NEON PULSE | New 3D signal-puzzle conversion; published; 4K, control completion/save and fallback verified | In progress |
| game2/ | CIRCUIT RUSH | New 3D conductor-network campaign; published; 4K, control completion/save and fallback verified | In progress |
| game3/ | ELECTRONICER | Playable 3D DC bench; verified 4K/circuit/fuse/reload milestone | In progress |
| game4/ | VOLT DODGE | New 3D rover retrieval campaign; published; 4K, control completion/save and fallback verified | In progress |
| game5/ | RESISTOR MATCH | New 3D component-memory campaign; published; 4K, control completion/save and fallback verified | In progress |
| game6/ | CAPACITOR CHARGE | New 3D RC commissioning campaign; published; 4K, control completion/save and fallback verified | In progress |
| game7/ | BINARY FLASH | New 3D digital-register campaign; published; 4K, control completion/save and fallback verified | In progress |
| game8/ | FUSE BOX | New 3D DC-cabinet conversion; published; 4K, control completion/save and fallback verified | In progress |
| game9/ | GOAL LINE | New 3D keeper-reading/feint shootout;10,000 numerical campaigns and 6 scoped browser scenarios verified, including 4K; publication pending | In progress |
| game10/ | APEX CIRCUIT | New 3D driving conversion; published; 4K, control completion/save and fallback verified | In progress |
| game11/ | WORLD FOOTBALL | Playable 3D 11-a-side match; verified 4K and full-time UI win | In progress |
| game12/ | CORTEX PRIME | Legacy 2D | In progress |
| game13/ | SYNAPSE SPRINT | Legacy 2D | In progress |
| game14/ | BILLIONAIRE CHALLENGE | Legacy 2D | In progress |
| game15/ | TACTICS GRID | Playable 3D tactical campaign; verified 4K and mission win | In progress |
| game16/ | APEX STRATEGY | Legacy 2D | In progress |
| game17/ | PENALTY PRO | New 3D penalty conversion; published; 4K, control completion/save and fallback verified | In progress |
| game18/ | DEBATE ARENA | Legacy 2D | In progress |
| game19/ | CASEFILE | Legacy 2D | In progress |
| game20/ | MARKET DUEL | Legacy 2D | In progress |
| game22/ | AI ARENA | Live API client; configuration required | Blocked |
| game21/ | LAST SIGNAL | Legacy 2D | In progress |
| game23/ | VALLEY OF ELAH | First Bible chapter; verified 4K, first-level UI completion and reload | In progress |
| game24/ | ARK: THE WATERLINE COMMISSION | Playable 3D cargo/buoyancy chapter; verified water trial and 4K | In progress |

Electronicer and football milestones are supported by
[successful CI run 41770210966](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41770210966)
at `484141c50acfebe5526085fd983b7964a2b02e44`: nine browser checks passed;
actual 3840 × 2160 WebGL 2 buffers and rendered screenshots were inspected.
This is software-rendering and browser-flow evidence. Hardware FPS, physical
touch and full assistive-technology play remain open. The later `b9db74c` milestone passed all 93 JS, 49 API and 11 browser checks and was publicly deployed with exact-source verification; see [PROJECT_STATUS.md](PROJECT_STATUS.md). See the per-game records for the exact tested scope.

The David chapter's first-level milestone is supported by
[CI run 41771833545](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41771833545)
at `1002ca420bd76b10e94f29fd916374dfb13ed5f7`: **88 JavaScript, 49 API and 11
browser tests passed with no skips** across the repository. This does not claim
all Bible chapters, 10,000 human playtests or production completion.

The ten Godot couch-suite source games remain separate Node2D implementations. Their previous headless checks have not been rerun here; hardware controller validation and 3D conversion remain unfinished.

Scale: 2,000 individual titles is the target, not the delivered count. The data manifest records per-game platforms, levels, controls, rights, tests, rendering status and pinned standards. Historical reports are preserved in docs/history/.
