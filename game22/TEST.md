# AI Arena verification procedure

Current acceptance, actual commands, candidate commits and verification times are recorded in [PROJECT_STATUS.md](../PROJECT_STATUS.md). This file defines repeatable checks and does not claim a live integration or 4K/3D acceptance.

## Automated tests

From the repository root:

```sh
python -m pytest platform/backend/tests -q
node --test game22/test.js
node --check game22/app.js
```

The provider API tests use `httpx.MockTransport` or explicitly named async test doubles. Their “live” state assertions test the production contract under mocked transport; they are **not evidence of real external model output**.

Coverage includes eight provider request formats, concurrent scheduling, empty/failed/timeout results, secret redaction, HTTP redirect refusal, response/payload bounds, server-side model readiness, disabled providers, atomic reservations, per-minute admission, account-scoped history/ratings, judge provenance, formula output, self-judging exclusion, unknown/invalid scores and bounded coding evaluation. Frontend tests cover safe origin parsing, session-origin prerequisites, live-output classification, unknown metrics and coding-test structure.

## Browser acceptance

1. Start with no saved API: all eight names are visible, the connection dependency is explicit, and no answer is fabricated.
2. Enter a malformed or credential-bearing URL: it must be rejected without saving it. Enter an unavailable HTTPS API: it must show an offline state and retain typed fallback.
3. Against a controlled test API, sign in, choose two providers and submit one prompt. Check the request contains the selected keys and the prompt exactly once per match.
4. Verify two answers, model identifiers, latency, unknown metrics without a judge, and complete estimates with judge provenance. A fixture, empty body or error must never be styled as live.
5. Rate an answer, refresh history, reopen the saved match, sign out and confirm that prompts/answers/history are cleared. A second user must not receive the first user's records. Change gateway during a pending request and confirm stale results cannot repopulate the page.
6. Exercise coding JSON validation and the restricted-function path. Missing/malformed test cases must not launch a paid request.
7. Verify keyboard reachability and visible focus, dialog Escape/close, 320px and desktop layouts, reduced-motion preference, high-zoom text, readable contrast and overflowed-answer keyboard scrolling.
8. In a speech-capable browser with a microphone, grant and deny permission; confirm a transcript is editable and never submitted automatically. Where unsupported, typed prompts remain available.

A mock API is acceptable for browser integration checks only if that fact is recorded. Real-live acceptance additionally requires operator-provided credentials, gateway hosting, active model IDs and observed provider requests/responses. Do not enter real keys into browser code or test fixtures. Native console, microphone-hardware, 3D/4K rendering and 10,000 authored levels cannot be inferred from these checks.
