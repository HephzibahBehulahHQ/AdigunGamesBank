# AI Arena verification

[PROJECT_STATUS.md](../PROJECT_STATUS.md) owns exact revisions, times, browser
artifacts and deployment receipts. Procedures below do not themselves prove a real
API integration, rendered 4K frame, speech hardware or completed live campaign.

## Domain and evaluator checks

From the repository root:

```sh
node --test tests/ai-campaign.test.js game22/test.js
node --check game22/app.js
node --check game22/scene.js
python -m pytest platform/backend/tests/test_campaign_contract.py -q
python -m pytest platform/backend/tests -q
```

The focused Node suite passed **13/13** during implementation: all 10,000 mechanically
distinct specifications, deterministic generation, bounded cases, five tiers, twenty
families, independent arithmetic/state examples, frozen attempts, forecast/tie
outcomes, malformed evidence rejection, fixture suppression, truthful stage states
and gateway/account progression isolation.

The separate backend contract check passed all **10,000 reference functions** through
the actual restricted evaluator and their exact generated cases. These test oracles
never enter response cards. This is algorithmic validation, not real model output or
10,000 manually played levels. Transport doubles are explicitly test data, never a
production fixture mode. Existing backend tests cover provider formats, concurrent
dispatch, timeouts, bounds, auth, history/ratings, admission, judge provenance and code
execution. The current release receipt determines which checks apply to its revision.

## Browser selectors and acceptance

### No API, 3D and 4K

1. Open `/game22/` with clean storage: zero configured contenders, eight disabled
   checkboxes, empty `#results`; no simulated response or score.
2. Wait for `#arena-stage[data-renderer="WebGL2"]`, then select `4k` in
   `#arena-quality`. Inspect actual `canvas.getContext('webgl2').drawingBufferWidth`
   and `drawingBufferHeight` equal **3840 × 2160**. Save and inspect that frame.
   `#render-status` and `data-resolution` must agree with the actual buffer.
3. Inspect original deck/cabinet geometry, lighting, shadows and readable labels.
   With no gateway, `data-live-responses` remains `0`, and no score column or winner
   is fabricated. `#stage-ledger` contains equivalent accessible evidence.
4. Exercise `#arena-view`: `overview`, `front`, `plan`; canvas arrows, +/−, Home;
   pointer orbit and configured-cabinet selection. No camera control submits a match.
5. Select `campaign` in `#play-mode`; preview level `10000` using `#campaign-level`
   and `#load-challenge`. Expect Professional Master, Queue admission and 17 cases.
   Invalid inputs, `#resume-challenge` and custom draft restoration must work.
   Preview requires no API and never awards progress.

### API integration — record mocked versus real

1. Reject credential-bearing/non-origin URLs. Disclose an unreachable gateway
   without substitute output. Authentication returns a numeric account ID.
2. A controlled test API can configure `anthropic` and `gemini` as contenders with
   `openai` as judge. Health uses the real fields `service`, `ai_mode`, `providers`,
   `provider_details`, `judge`, `registration_allowed`.
3. Select campaign and `anthropic` in `#prediction`; enter an optional hint in
   `#campaign-hint`; click `#submit-match`. Verify exactly one POST, coding task,
   chosen providers, unchanged required specification plus hint, and exact
   `createChallenge(level).tests`. Inputs freeze while pending.
4. Pending state says “Request sent”; no progress percentage, answer, score or winner.
   Latency appears only from a returned response.
5. For labelled **mocked integration**, return mathematically consistent evidence:
   correct case counts, `accuracy_source: restricted_test_cases`, complete metrics,
   `judge_state: scored`, independent judge/provider IDs and known live source.
   A correct forecast plus perfect leading reference cases clears once, saves,
   reveals `#next-challenge` and resumes for the same account. Such fixture tests
   are never reported as real provider output.
6. Wrong forecast, failed leading case, replay source, missing contender/judge or
   inconsistent arithmetic cannot clear. Selecting the judge blocks campaign
   dispatch. Opening history cannot award progress; cards say “RECORDED LIVE RESPONSE.”
7. Deny storage writes: completion may remain in memory, but UI must say session only.
   Different accounts/gateways load separate progress. Sign out or change gateway
   while pending; stale results must neither repopulate UI nor award another user.
8. In `custom` mode verify factual/creative/coding paths, malformed cases, ratings,
   history and retained drafts. Missing judging can leave custom output unranked;
   campaign clears stay blocked.

### Accessibility, lifecycle and performance

- Run no-exclusion WCAG 2.1 A/AA axe scans at 320px and desktop with the campaign
  open. Check visible first-link focus, names/regions, contrast, high zoom, reference
  and answer keyboard scrolling, and no page overflow. All gameplay must work in DOM.
- Emulate reduced motion before load and during a request; request light pulsing stops.
  Hidden tabs pause animation. Back/forward cache restores a usable scene/controls.
- Lose WebGL context: disclose recovery while keeping DOM comparison usable. Ordinary
  exit disposes texture/listener/observer resources and aborts pending requests.
- Measure cold load and frame-time distributions on a recorded device, network,
  cache profile and quality. Headless/software-rendered frames prove neither mobile
  GPU performance nor the documented load target.
- On speech-capable hardware grant/deny permission, verify reviewed custom prompt or
  strategy hint, and no auto-submit. Late transcripts after mode/session changes
  must not enter the new context.

## Remaining real-live dependencies

Operator-hosted HTTPS gateway, allowed page origin, server-side credentials and active
model IDs for at least two contenders plus independent judge, account access, and real
request/response receipts with model identities, measured latency, reference results,
judge provenance and completion. Do not put secrets in browser code or fixtures.
Native console certification, microphone hardware and representative device GPU/load
performance need their own evidence. See the current candidate receipt for actual
passed checks and exact remaining blockers.
