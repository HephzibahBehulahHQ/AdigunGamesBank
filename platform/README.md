# Game Bank API and live AI Arena gateway

The GitHub Pages client at `game22/` calls this separate authenticated Python API. Provider credentials remain on the API host. No cloud API has been deployed or live provider request verified as part of the repository implementation. Current acceptance and deployment evidence belong in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## Run and configure

1. Copy `.env.example` to `platform/.env`. Set a unique random `JWT_SECRET` of at least 32 characters. Production startup rejects the example and weak values before accessing the database.
2. Set exact `CORS_ORIGINS` for your browser client. Serve the public API over HTTPS. Configure the reverse proxy's request-size, timeout and authentication abuse limits.
3. Set `AI_MODE=live` and at least two provider key/model pairs. Model IDs must be active in your own accounts; this repository supplies no invented default IDs.
4. Choose `JUDGE_PROVIDER` if automated quality scoring is wanted. It uses that provider's configured model. Prefer a judge excluded from the competitor selection; its own provider is never self-scored.
5. Production account registration defaults to disabled. Bootstrap the first account using `POST /api/auth/bootstrap-admin` with the configured `ADMIN_EMAIL` and `ADMIN_BOOTSTRAP_TOKEN`, plus `email`, `display_name` and a password of at least 12 characters. Enable `ALLOW_REGISTRATION=true` only when the intended deployment has account-abuse and provider-budget controls. Remove the bootstrap token after provisioning. Existing accounts can sign in without open registration.
6. From `platform/`, run `docker compose -f docker-compose.api.yml up --build`. The database is persisted in the named volume. A separate HTTPS reverse proxy/host is still required for public use.
7. Visit `/api/health`. A provider's `configured: true` means its settings are present, **not** that a live request succeeded. On `/game22/`, enter the API origin, sign in and select at least two configured contenders.

GitHub Pages cannot execute this backend or protect provider keys. Operator-provided hosting, credentials, active model IDs, provider budgets and real acceptance requests remain external deployment dependencies.

## Supported providers

| Arena key | Service | Required settings |
| --- | --- | --- |
| `openai` | OpenAI Responses API; labelled ChatGPT (OpenAI API) | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `anthropic` | Claude Messages API | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| `gemini` | Gemini generateContent API | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| `deepseek` | DeepSeek Chat Completions | `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` |
| `grok` | xAI Responses API | `XAI_API_KEY`, `GROK_MODEL` |
| `kimi` | Moonshot Kimi Chat Completions | `KIMI_API_KEY`, `KIMI_MODEL`; optional `KIMI_BASE_URL` |
| `adigun` | Operator-deployed OpenAI-compatible endpoint | `ADIGUN_AI_BASE_URL`, `ADIGUN_AI_API_KEY`, `ADIGUN_AI_MODEL` |
| `ollama` | Explicit local/cloud OpenAI-compatible service | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`; key if the service requires it |

The Adigun adapter does not establish a new independent foundation model. Its configured model identifier is displayed with the answer. API models also need not behave identically to a vendor's consumer subscription product. Custom origins require HTTPS, except explicitly permitted local Ollama addresses. Redirects are not followed with credentials.

Primary protocol references: [OpenAI Responses](https://platform.openai.com/docs/api-reference/responses), [Claude Messages](https://platform.claude.com/docs/en/api/messages/create), [Gemini generation](https://ai.google.dev/api/generate-content), [DeepSeek API](https://api-docs.deepseek.com/api/create-chat-completion/), [xAI Responses](https://docs.x.ai/developers/rest-api-reference/inference/responses), [Moonshot provider configuration](https://moonshotai.github.io/kimi-code/en/configuration/providers), [Ollama compatibility](https://docs.ollama.com/openai). Endpoint/model availability still requires live acceptance with the operator's accounts.

## Competition and scoring contract

Competitors receive the same prompt in concurrently scheduled async requests. Each has a 50-second wall-time deadline, 1,200-token requested output budget, 512,000-byte transport limit and 32,000-character answer limit. Empty responses and failures never become successful live answers. Requests use native asynchronous HTTP and cancel on timeout; no abandoned synchronous SDK threads remain. Different providers count tokens differently, and recorded latency includes network and service conditions. This is a prompt comparison, not a controlled claim of overall platform superiority.

Judging begins after competitor response times have been recorded. The explicitly configured judge receives anonymous answer labels and a common rubric. Provider identity is omitted from the scoring prompt, but anonymity cannot prevent an answer revealing its own source. Prompt-injection resistance is not treated as a guarantee. Invalid, missing, non-finite and out-of-range scores remain unknown. The API returns the judge provider, model ID, rationale, score source, test results and formula; the same information is persisted with each answer.

| Metric | Weight | Evidence |
| --- | ---: | --- |
| Correctness | 50% | A model estimate for factual/creative tasks; supplied test pass rate for coding |
| Quality | 30% | Judge estimate of clarity, completeness and useful reasoning |
| Suggestions | 10% | Judge estimate of relevance/actionability, or direct relevance when suggestions are not requested |
| Speed | 10% | `max(0, 1 - answer_latency_ms / 50000)` |

The final score is 100 times the weighted sum. All four metrics must exist; missing quality is **not zero**. Model judgments are subjective estimates, not independently verified factual truth. A winner is returned only when at least two successful answers have complete comparable scores and the highest score is not tied. Failed/unavailable providers are excluded and no “best AI overall” claim is made. Individual human ratings are stored separately from the automated rubric.

## Restricted coding evaluation

Coding challenges require 1–25 explicit `{ "args": [...], "expected": ... }` cases and exactly one simple Python function. The evaluator interprets an allowlisted syntax tree; it never uses `eval`, `exec`, imports, network access or subprocess execution. It supports arithmetic, comparisons, conditionals, bounded `for`/`range` loops, simple assignment and small `abs`/`min`/`max`/`sum`/`len` calls.

Limits cover code size (16,000 characters), AST nodes (400), aggregate evaluation steps (20,000 across the supplied cases), a loop's size (1,000), value magnitude, nesting, collection size and expansion before allocation. Unsupported code is not executed. Passing user-supplied cases proves only those cases; it is not a general code correctness or security certificate.

## Admission and account isolation

- A database lock serializes admission. A match and per-account lease are committed **before** any billable provider call.
- An account can run one concurrent match and start at most three per minute. All accounts together are limited by `ARENA_MAX_CONCURRENT_MATCHES` (default four).
- Expired leases are reclaimed after 180 seconds; normal completion or interruption releases the lease. Failed completed attempts still count toward the per-minute budget.
- Health and readiness are public; matches, ratings and history require signed-in ownership. Disabled model rows are honored.
- Production registration is opt-in; this is not a replacement for deployment-level identity, rate limits, spend caps, monitoring or backups.
- JSON request bodies are bounded at 64 KiB, including chunked input. Provider exceptions are not returned verbatim because they can contain credentials or private request details.
- Browser session credentials are scoped to the chosen API origin in session storage. Signing out clears displayed answers, history and prompt state. Changing origins invalidates the session.

## Verification

Run from the repository root:

```sh
python -m pip install -r platform/backend/requirements.txt
python -m pytest platform/backend/tests -q
node --test game22/test.js
```

The automated provider tests use explicitly named test doubles and `httpx.MockTransport`; they never contact or claim to verify live providers. Cases cover protocol formats for every adapter, concurrent requests, failure redaction, empty answers, score provenance, malformed scores, self-judging exclusion, account isolation, pre-call reservation, quotas and interpreter limits. Browser checks and operator acceptance remain separate evidence; see [game22/TEST.md](../game22/TEST.md).
