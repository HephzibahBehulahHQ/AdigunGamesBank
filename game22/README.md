# AI Arena

A live-provider comparison client for Adigun Game Bank. Its secure gateway sends the same text prompt concurrently to selected configured providers: ChatGPT (OpenAI API), Claude, Gemini, DeepSeek, Grok, Kimi, Adigun AI and Ollama. Browser speech recognition can transcribe a voice prompt for review before submission.

## Game record

| Requirement | Current implementation |
| --- | --- |
| Title / genre | AI Arena / live AI comparison and judging |
| Target platform | Modern desktop and mobile browsers; separate Python API required |
| 4K / 3D | **Unimplemented**. The current client is a responsive comparison interface; no 3D game-rendering or 4K framebuffer claim is made |
| 10,000 levels | **Unimplemented**. Open prompt comparisons are not counted as authored levels |
| Controls | Keyboard, mouse and touch form controls; optional browser speech-to-text |
| Accessibility | Labelled controls/dialogs, keyboard focus, skip link, live status, selectable answer text, reduced-motion styling |
| Performance | Buildless HTML/CSS/ES modules; no 3D assets loaded; measured load evidence belongs in the project status |
| Asset rights | Original interface; unchanged official corporate artwork with provenance in `docs/STANDARDS.md`; no provider logos or likenesses |
| Testing | Backend unit/integration tests and frontend domain tests; browser evidence tracked separately |
| Deployment path | `/AdigunGamesBank/game22/` on the existing Pages project, with configured custom-domain routing retained |
| Release status | **Blocked for live play** until API hosting, active model IDs, provider credentials and live verification are supplied; 3D presentation and authored progression remain implementation work |
| Policy | HB-AI-ENGINEERING-001 v2.0, commit `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e` |
| Design system | Commit `52f01f9986d97088413ca9785bc7a2d3f2967123`; shared navy, royal blue, gold, ivory and AI violet tokens |

The current verified public URL and release commit must be read from [PROJECT_STATUS.md](../PROJECT_STATUS.md), not inferred from this path.

## Use the arena

1. Select **Connection** and enter the HTTPS origin of the deployed Game Bank API. Local development permits HTTP localhost.
2. Sign in. Create-account access appears only when the gateway permits registration.
3. Select at least two configured contenders. A configured judge is deselected initially so it does not judge itself.
4. Choose a factual, creative or restricted coding challenge. Coding needs explicit JSON test cases. Review any voice transcript before submission.
5. Compare actual answers, observed full-response latency, disclosed judge estimates and the resulting score. Missing metrics stay unknown. Rate an answer and reopen it through your account's history.

Each card identifies the configured model. An Adigun endpoint must exist and be operator-configured; it is not presented as an independently trained model by default. API responses do not imply equivalence to consumer products or subscriptions.

No provider credential belongs in the browser. Configuration is separate from observed live availability. A failed or empty provider answer is never filled with a fixture. A single match and model judge cannot establish which AI platform is best overall.

Backend deployment and rubric: [platform/README.md](../platform/README.md). Verification: [TEST.md](TEST.md).
