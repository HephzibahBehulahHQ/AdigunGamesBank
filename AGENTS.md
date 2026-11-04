# Adigun Game Bank repository instructions

## Explicit policy adoption

This product adopts **HB-AI-ENGINEERING-001 · v2.0** from
[hb-AI-policy](https://github.com/HephzibahBehulahHQ/hb-AI-policy/tree/d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e),
pinned to **`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`**.

Adoption owner: **Hephzibah Behulah**, through the repository owner's authorized
project request. Adoption date: **2026-11-04 (Europe/Berlin)**. Follow the actual
runtime instruction hierarchy and access controls. Record policy upgrades
explicitly; do not silently follow a moving branch.

## Product scope and authorization

- Product: **Adigun Game Bank**, repository **HephzibahBehulahHQ/AdigunGamesBank**.
  It is a cross-division product within the five-brand corporate identity.
- The owner's requirements are preserved in
  [Adigun Game bank pursuing goals and template.md](<Adigun Game bank pursuing goals and template.md>).
  The target is **2,000 individually designed games**, each with **10,000 levels**
  from Beginner to Professional Master. Generated catalog entries, reskins and
  level counters do not establish that this target is delivered.
- All application code, game data, tests, product documentation, checkpoint
  tooling and deployment work stay in this repository. Standards repositories
  are read-only references for this task.
- The one current status is **[PROJECT_STATUS.md](PROJECT_STATUS.md)**. It owns
  current acceptance state, branch, revisions, verification times, failures,
  deployment receipts and the next bounded action.
- Standing authorization covers scoped edits, tests, commits, pushes and the
  existing GitHub Pages deployment at
  **https://hephzibahbehulahhq.github.io/AdigunGamesBank/**. Inspect the actual
  branch and remote before writing. Preserve branch protections and unrelated
  work; no force pushes, new spending, changed audience or access-control changes.
- Use scoped work branches for incomplete or failing work. Integrate into
  `main` only after applicable release checks pass. An authorized deployment
  does not need another permission request.

## Read and work narrowly

Read this file and the current status once when resuming, then inspect the actual
working tree, branch and relevant source. Use the preserved specification as the
requirements source rather than copying it into each update. Read only affected
files and relevant reference sections. Show changed paths or relevant lines.

Complete finite milestones with explicit acceptance criteria and dependencies.
Use one integration owner; assign narrow independent work to specialists when
it improves correctness or saves time. Give each writer exclusive file ownership
or an isolated worktree. The integration owner reviews combined changes and
owns final verification.

## Product honesty and release gates

- A game is playable only when its controls, rules, progression, failure and
  completion states work. Never substitute a promotional screen or quiz shell
  for a requested simulation or match.
- Confirm 3D through an actual 3D renderer and scene. Confirm 4K through the
  renderer's **3840 × 2160 drawing buffer** and an inspected frame on a recorded
  browser/device. CSS dimensions, upscaling or a setting label alone are not
  evidence. Record actual resolution and performance; keep unverified claims
  marked **In progress**.
- Live AI requires configured, server-side provider APIs and observed real
  requests/responses. Keep credentials out of browser code and repository data.
  Label fixtures and simulations. Never present them as live results.
- Football uses original or appropriately cleared names, models, kits, audio
  and likenesses. Record rights before adding external assets.
- Browser builds are browser builds. Native PlayStation releases require the
  applicable developer access, approved tooling, rights and certification.
  Do not assert availability of an unverified future console platform.
- Engineering and trading simulations must state assumptions and units, cite
  technical references and validate calculations. Bible adaptations must name
  passage sources and distinguish original game dialogue from Scripture.
- Use [docs/GAME_TEMPLATE.md](docs/GAME_TEMPLATE.md) for every new game and
  [docs/STANDARDS.md](docs/STANDARDS.md) for pinned visual/domain references.
- Run the repository's declared unit/integration checks and browser checks for
  affected flows. Inspect keyboard/focus access, accessible names, reduced
  motion, contrast, responsive layouts, persistence, errors and visual quality.
  Record exact commands, candidate revision, environment and outcomes in the
  current status. Unavailable checks are **NOT TESTED**, never implicitly passed.
- Checkpoints may contain clearly marked WIP. Integration and deployment require
  all applicable checks against the exact candidate, with production URL and
  revision verification after publication. A reachable page alone is insufficient.

## Recoverable work

Follow the pinned
[checkpoint and recovery policy](https://github.com/HephzibahBehulahHQ/hb-AI-policy/blob/d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e/policies/checkpoint-and-recovery.md).
Start the clock at the first useful changed work. Commit and verify a first
remote WIP checkpoint within **five minutes**, then checkpoint changed work at
intervals no greater than five minutes and before long operations or handoffs.
Do not make empty commits or churn unchanged status.

Inspect owned paths and the staged diff for secrets and unrelated changes.
Coordinate writers, inspect the observed remote head, use expected-SHA checks
where available, and use only fast-forward synchronization. Read back the exact
remote revision. If the remote advanced, preserve both contributors' changes
and reconcile before retrying.

After two unchanged synchronization failures, diagnose and change approach.
After ten minutes unresolved synchronization, stop new feature work unless an
authorized bounded offline exception is documented with its reason, last verified
remote SHA, local checkpoint, durability limits and resumption condition.

Record actual recovery scenarios and receipts in the current status. Policy
adoption does not prove a recovery mechanism works; unexercised scenarios remain
**NOT TESTED**. A status receipt written after a push is locally pending until
its next checkpoint; do not claim it is already synchronized.

## Routine reporting

Use the pinned
[continuation and reporting standard](https://github.com/HephzibahBehulahHQ/hb-AI-policy/blob/d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e/standards/continuation-and-reporting.md):

```text
STATUS
- Done: observed acceptance stage and changed scope
- Tested: actual checks, revision and NOT TESTED limitations
- ESTIMATED FINISH TIME: full-task hours/minutes when supportable; otherwise unknown
- ETA: dated Europe/Berlin estimate when supportable; otherwise pending
- Next: next bounded action, including exact blockers and required dependencies
```

Distinguish saved, synchronized, verified, integrated, deployed and complete.
Never promise unattended continuation without a confirmed execution mechanism.
