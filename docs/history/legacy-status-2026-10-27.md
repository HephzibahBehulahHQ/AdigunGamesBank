> Historical record. These DONE labels do not establish compliance with the 2026-11-04 production brief. See ../../PROJECT_STATUS.md.

# Game Bank — Live Game Status

Updated 2026-10-27. Status changes to DONE only after implementation, playable end state, and required checks pass. Update this file after each completed game before moving to the next.

## Existing web catalog

| Catalog | Game | Status |
|---:|---|---|
| 1 | NEON PULSE | DONE — existing library; not revalidated in this turn |
| 2 | CIRCUIT RUSH | DONE — existing library; not revalidated in this turn |
| 3 | OHM HUNTER | DONE — existing library; not revalidated in this turn |
| 4 | VOLT DODGE | DONE — existing library; not revalidated in this turn |
| 5 | RESISTOR MATCH | DONE — existing library; not revalidated in this turn |
| 6 | CAPACITOR CHARGE | DONE — existing library; not revalidated in this turn |
| 7 | BINARY FLASH | DONE — existing library; not revalidated in this turn |
| 8 | FUSE BOX | DONE — existing library; not revalidated in this turn |
| 9 | GOAL LINE | DONE — existing library; not revalidated in this turn |
| 10 | APEX CIRCUIT | DONE — existing library; not revalidated in this turn |
| 11 | WORLD FOOTBALL | DONE — existing library; not revalidated in this turn |
| 12 | CORTEX PRIME | DONE — existing library; not revalidated in this turn |
| 13 | SYNAPSE SPRINT | DONE — existing library; not revalidated in this turn |
| 14 | BILLIONAIRE CHALLENGE | DONE — existing library; not revalidated in this turn |
| 15 | TACTICS GRID | DONE — local commit bdafb9c; 6 checks passed |
| 16 | APEX STRATEGY | DONE — local commit c120bc8; 7 checks passed; race browser-finished |
| 17 | PENALTY PRO | DONE — local commit 69f7185; 5 checks passed; shootout browser-finished |
| 18 | DEBATE ARENA | DONE — local commit 31e30cf; 5 checks passed; debate browser-finished |
| 19 | CASEFILE | DONE — local commit a397ea4; 5 checks passed; case solved in browser |
| 20 | MARKET DUEL | DONE — local commit 4322eee; 5 checks passed; 30-day match browser-finished |
| 21 | AI ARENA | IN PROGRESS — secure API source exists; live providers still need secrets and API hosting |
| 22 | LAST SIGNAL | DONE — six engine tests pass; deployed match started, player elimination, bot winner and result screen verified in browser |

## First 20-game expansion request

| Brief order | Game | Status |
|---:|---|---|
| 1 | AI Turn-Based Tactics Arena | DONE — catalog entries 15 |
| 2 | AI Racing Manager | DONE — catalog entries 16 |
| 3 | AI Football (Soccer) Penalty Shootout | DONE — catalog entries 17 |
| 4 | AI Debate Arena | DONE — catalog entries 18 |
| 5 | AI Detective | DONE — catalog entries 19 |
| 6 | AI Stock Trader Showdown | DONE — catalog entries 20 |
| 7 | AI Battle Royale (Top-Down 2D) | DONE — Last Signal released as catalog game 22; complete live match and final result verified |
| 8 | Real Football (Soccer) Match Engine | PENDING |
| 9 | Real Racing (Circuit) | PENDING |
| 10 | Real Drag Racing | PENDING |
| 11 | Real Football (Soccer) Manager — Match Day | PENDING |
| 12 | Real Basketball (2v2) | PENDING |
| 13 | Real Tennis (Singles) | PENDING |
| 14 | Real Cycling (Time Trial) | PENDING |
| 15 | Matrix Reasoning (Raven's-Style) | PENDING |
| 16 | Number Sequence Sprint | PENDING |
| 17 | Verbal Analogies (Adaptive) | PENDING |
| 18 | Spatial Rotation Test | PENDING |
| 19 | Working Memory Challenge (Dual N-Back) | PENDING |
| 20 | Processing Speed Gauntlet | PENDING |

## Second 20-game expansion request

| Brief order | Game | Status |
|---:|---|---|
| 21 | AI Chess Variant — Fog of War Chess | PENDING — follows the first expansion batch |
| 22 | AI Poker (Texas Hold'em, 1v1) | PENDING — follows the first expansion batch |
| 23 | AI Go (9×9) | PENDING — follows the first expansion batch |
| 24 | AI Civilization Builder (Turn-Based) | PENDING — follows the first expansion batch |
| 25 | AI Escape Room | PENDING — follows the first expansion batch |
| 26 | AI Negotiation Game | PENDING — follows the first expansion batch |
| 27 | AI Wargame (Hex, WWII-style) | PENDING — follows the first expansion batch |
| 28 | Real Volleyball (2v2 Beach) | PENDING — follows the first expansion batch |
| 29 | Real Table Tennis | PENDING — follows the first expansion batch |
| 30 | Real Boxing (2D Side View) | PENDING — follows the first expansion batch |
| 31 | Real Skiing (Downhill Slalom) | PENDING — follows the first expansion batch |
| 32 | Real Golf (Driving Range + 3 Holes) | PENDING — follows the first expansion batch |
| 33 | Real American Football (2-Minute Drill) | PENDING — follows the first expansion batch |
| 34 | Real Cricket (T20 Over Simulation) | PENDING — follows the first expansion batch |
| 35 | Tower of Hanoi (Adaptive) | PENDING — follows the first expansion batch |
| 36 | Mental Arithmetic Sprint | PENDING — follows the first expansion batch |
| 37 | Pattern Recognition (Abstract) | PENDING — follows the first expansion batch |
| 38 | Logic Grid Puzzle | PENDING — follows the first expansion batch |
| 39 | Memory Palace (Sequence Recall) | PENDING — follows the first expansion batch |
| 40 | Reaction Time Duel | PENDING — follows the first expansion batch |

## 100-game couch multiplayer suite

Separate Godot 4 target, preserving the current GitHub Pages hub. Ten suite games are implemented and pass their headless playable checks. Godot 4.7.2 stable is downloaded to an ignored local tools folder; physical-controller hardware validation remains outstanding.

| Suite order | Game | Status |
|---:|---|---|
| 1 | Kart Grand Prix | DONE — local commit 895a1b8; 8-track simulation, four-race cup, scene start/results/end flow, and local career save pass automated Godot checks; physical controller not available for hardware validation |
| 2 | Rally Stage Time Trial | DONE — local commit 72af270; 10 authored routes, co-driver notes, target qualification/unlock, retry/final screens, gamepad button flow, and saved best-time progression pass Godot checks; analog controller hardware not available for live validation |
| 3 | Formula Sprint | DONE — local commit d0b380b; five 10-lap circuits, 2-player/eight-car fields, fuel/tyre wear, AI pit strategy, four-lug timing stop, podium/results, and career-save checks pass; no physical controller available for analog hardware validation |
| 4 | Truck Trial | DONE — local commit 40e616f; eight authored obstacle courses, safe-speed rollover physics, crane gates, gamepad/keyboard controls, finish ratings, stage unlocks, and saved best times pass Godot checks; physical controller not available for hardware validation |
| 5 | Motorcycle Hill Climb | DONE — local commit 7ae0a8d; eight authored mountain profiles, traction/slope/pitch physics, jumps and crash checks, stage unlocks, gamepad flow, and local career save pass Godot checks; physical controller not available for hardware validation |
| 6 | Soapbox Derby | DONE — eight complete routes, all gates/hazards, gamepad pause/start, finish scoring, hub launch, and save reload pass Godot 4.7 checks |
| 7 | Hovercraft Time Attack | DONE — eight complete water courses, gate and buoy physics, boost, gamepad flow, hub launch, and career save pass Godot 4.7.2 headless checks; physical controller not available for hardware validation |
| 8 | Stock Car Oval | DONE — five authored ovals, six-car field, local two-player controls, drafting, tire temperature, contact damage, six-lap finishes, progression and hub launch pass Godot 4.7.2 headless checks; physical controller not available for hardware validation |
| 9 | Monster Truck Arena | DONE — five authored arenas, six trucks, breakable targets, stunt scoring, AI field, timer/winner flow, gamepad pause, career save and hub registration pass Godot 4.7.2 headless checks; physical controller not available for hardware validation |
| 10 | Drone Racing | DONE — five authored routes, ordered gates, battery/boost, hazards, six-pilot field, three-lap win, gamepad pause, career save and hub registration pass Godot 4.7.2 headless checks; physical controller not available for hardware validation |
| 11 | Boat Racing | PENDING |
| 12 | Snowmobile Sprint | PENDING |
| 13 | 5-a-Side Street Football | PENDING |
| 14 | Penalty Shootout Pro | PENDING |
| 15 | Freekick Challenge | PENDING |
| 16 | Headers & Volleys | PENDING |
| 17 | Goalkeeper Hero | PENDING |
| 18 | Football Tennis | PENDING |
| 19 | Futsal Tournament | PENDING |
| 20 | Crossbar Challenge | PENDING |
| 21 | Keepy-Uppy Battle | PENDING |
| 22 | Football Golf | PENDING |
| 23 | Wall Ball 1v1 | PENDING |
| 24 | Street Football 3v3 Tournament | PENDING |
| 25 | 2v2 Street Basketball | PENDING |
| 26 | 3-Point Contest | PENDING |
| 27 | Slam Dunk Contest | PENDING |
| 28 | Free Throw Pressure | PENDING |
| 29 | 1v1 Basketball | PENDING |
| 30 | Horse | PENDING |
| 31 | Tennis Singles | PENDING |
| 32 | Tennis Doubles | PENDING |
| 33 | Table Tennis | PENDING |
| 34 | Badminton | PENDING |
| 35 | Squash | PENDING |
| 36 | Padel | PENDING |
| 37 | Boxing 2P | PENDING |
| 38 | Wrestling | PENDING |
| 39 | Sumo | PENDING |
| 40 | Sword Duel | PENDING |
| 41 | Kung Fu Arena | PENDING |
| 42 | Laser Tag | PENDING |
| 43 | Paintball | PENDING |
| 44 | Dodgeball | PENDING |
| 45 | 2D Platformer Campaign | PENDING |
| 46 | Endless Runner (Themed) | PENDING |
| 47 | Puzzle Platformer | PENDING |
| 48 | Speedrun Platformer | PENDING |
| 49 | Co-op Platformer | PENDING |
| 50 | Vertical Climbing | PENDING |
| 51 | One-Button Platformer | PENDING |
| 52 | Gravity-Flip Platformer | PENDING |
| 53 | Tetris-Style Block Drop | PENDING |
| 54 | Match-3 Battle | PENDING |
| 55 | Sokoban (Box Push) | PENDING |
| 56 | Pipe Connection | PENDING |
| 57 | 2048 Battle | PENDING |
| 58 | Minesweeper Race | PENDING |
| 59 | Sudoku | PENDING |
| 60 | Word Search Battle | PENDING |
| 61 | Top-Down Twin-Stick Shooter | PENDING |
| 62 | Side-Scrolling Shooter | PENDING |
| 63 | First-Person Arena Shooter | PENDING |
| 64 | Tower Defense Shooter | PENDING |
| 65 | Bullet Hell | PENDING |
| 66 | Zombie Survival | PENDING |
| 67 | Boss Rush | PENDING |
| 68 | Space Shooter | PENDING |
| 69 | Chess | PENDING |
| 70 | Checkers | PENDING |
| 71 | Backgammon | PENDING |
| 72 | Reversi (Othello) | PENDING |
| 73 | Connect Four | PENDING |
| 74 | Battleship | PENDING |
| 75 | Risk-Style Map Game | PENDING |
| 76 | Catan-Style Resource Game | PENDING |
| 77 | Minigame Collection | PENDING |
| 78 | Trivia Battle | PENDING |
| 79 | Drawing Guess Game | PENDING |
| 80 | Word Race | PENDING |
| 81 | Reaction Battle | PENDING |
| 82 | Tower Stack Battle | PENDING |
| 83 | Sumo Push Party | PENDING |
| 84 | Bomb Tag | PENDING |
| 85 | Golf 9 Holes | PENDING |
| 86 | Cricket 5 Overs | PENDING |
| 87 | Volleyball 2v2 | PENDING |
| 88 | Table Tennis Tournament | PENDING |
| 89 | Bowling | PENDING |
| 90 | Pool / 8-Ball | PENDING |
| 91 | Darts | PENDING |
| 92 | Air Hockey | PENDING |
| 93 | Rhythm Tap | PENDING |
| 94 | Dance Battle | PENDING |
| 95 | Karaoke Battle | PENDING |
| 96 | Drum Hero | PENDING |
| 97 | Cooking Rush 2P | PENDING |
| 98 | Overcooked-Style Chaos | PENDING |
| 99 | Escape Room Co-op | PENDING |
| 100 | Tower Defense Co-op | PENDING |

## Other requested platform work

| Requirement | Status |
|---|---|
| AI answer competition: ChatGPT, Gemini, Grok, DeepSeek, Claude, Ollama; user judging | PENDING — needs secured backend and actual provider credentials |
| Shared accounts, cross-game progress, user dashboard and Hephzibah Behulah admin controls | PENDING |
| Real football rosters, named players, clubs and seasons | PARTIAL — existing competition selections; verified rosters and likeness rights are not included |
| 100,000–1,000,000 individual games and 10,000–100,000 authored levels each | PENDING — long-term target; current catalog has 22 games |
| PS5/PS6, Apple, Android and Windows store releases | PENDING — no platform certification or store releases |
| Desktop launchers | DONE for released work — 22 browser shortcuts and 7 Godot suite shortcuts created by the installer |
| GitHub push/deploy | DONE — main commit 2cdaa87 publishes 20 browser games; GitHub Pages run 40560350861 succeeded. Godot couch-suite source for games 1–5 is in main but is not exported for web. Direct local Git push still fails because the Windows credential helper cannot start. |

## Recent local commits

- 7ae0a8d — Motorcycle Hill Climb (couch suite game 5)
- 40e616f — Truck Trial (couch suite game 4)
- d0b380b — Formula Sprint (couch suite game 3)

- 72af270 — Rally Stage Time Trial (couch suite game 2)

- 895a1b8 — Kart Grand Prix (couch suite game 1)

- 4322eee — market game (catalog 20)
- a397ea4 — detective (catalog 19)
- 31e30cf — debate (catalog 18)
- 69f7185 — penalty shootout (catalog 17)
- c120bc8 — racing manager (catalog 16)
- bdafb9c — tactics (catalog 15)

The changes listed above are included in main commit 2cdaa87. GitHub received them as one API-created snapshot commit after the local Windows Git credential helper failed; the original local commit hashes are not individually preserved in GitHub history.

## Update rule

After each tested full playthrough, mark that single game DONE, record its commit and test evidence here, and continue to the next pending item. Keep web catalog numbering and couch-suite numbering separate.




