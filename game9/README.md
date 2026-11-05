# GOAL LINE

## Current milestone

**In progress: individual 3D conversion.** The existing published route is still
the legacy game until the new candidate passes the release gate and publication
is verified. Current project evidence belongs in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

Goal Line is a striker-only five-kick training shootout. Its distinctive decision
is when to strike against a moving goalkeeper: read the actual position, use one
run-up feint, and shoot before the commitment window closes. Nine placement
zones and shot power determine a physical ball trajectory. This is separate
from Penalty Pro's five shooting turns followed by five goalkeeper turns.

## Acceptance for this conversion

- Deterministic, distinct configurations for 10,000 sequential challenges,
  Beginner through Professional Master, with increasing goal targets and
  meaningful keeper/shot parameters.
- Contact-based saves, frame hits, goals and misses; explicit next-kick,
  defeat/retry and completed-challenge persistence.
- A real Three.js scene, original procedural stadium geometry, unchanged
  corporate artwork, and actual 3840 × 2160 rendering evidence.
- Complete visible keyboard/pointer commands, manual timing steps, reduced
  motion, narrow-screen reflow, honest storage failures and the same engine
  when WebGL is unavailable.
- Numerical tests, real-control browser play, accessibility checks and exact
  candidate/publication verification before integration.

## Rules and references

This is an original training drill, not a full official match or shootout rules
simulation. A run-up feint is a game command before the final kick; the game
does not simulate illegal stopping after a completed run-up or adjudicate
encroachment. Selected geometry follows [IFAB Law 1](https://www.theifab.com/laws/latest/the-field-of-play/):
the goal opening is 7.32 m by 2.44 m and the mark is 11 m from the goal.
[IFAB Law 14](https://www.theifab.com/laws/latest/the-penalty-kick/) distinguishes
permitted run-up feints and goalkeeper movement on the line from offences.
Both references were checked on 5 November 2026. Model assumptions and exact
test results will be recorded here after implementation.

## Standards and honest limits

Policy: HB-AI-ENGINEERING-001 v2.0 at
`d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`. Design-system pin:
`52f01f9986d97088413ca9785bc7a2d3f2967123`. Corporate navy, royal blue, gold and
ivory tokens remain in force. This is one game, not 10,000 separate titles.
Browser automation does not establish hardware performance, physical touch,
full screen-reader play, localization or native-console certification.
