# Adopted engineering and design standards

Adopted for Adigun Game Bank on **2026-11-04 (Europe/Berlin)** under the owner's
project instruction. This file records reference provenance and implementation
rules. **PROJECT_STATUS.md** remains the only current project status.

## Immutable reference revisions

| Reference | Adopted revision | Source files |
| --- | --- | --- |
| [HB AI engineering policy](https://github.com/HephzibahBehulahHQ/hb-AI-policy/tree/d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e) | HB-AI-ENGINEERING-001 · v2.0; `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e` | `templates/product-AGENTS.md`, `policies/`, `standards/continuation-and-reporting.md` |
| [HB design system](https://github.com/HephzibahBehulahHQ/hb-design-system/tree/52f01f9986d97088413ca9785bc7a2d3f2967123) | `52f01f9986d97088413ca9785bc7a2d3f2967123` | `tokens/corporate.json`, `tokens/brands.json`, `docs/brand-and-product-naming.md`, `templates/universal-product/` |
| [Corporate identity](https://github.com/HephzibahBehulahHQ/HephzibahBehulahHQ.github.io/tree/bd116504412b37105166805018f64a6e7bbe3cde) | `bd116504412b37105166805018f64a6e7bbe3cde` | `README.md`, `index.html` |
| [Trading division](https://github.com/HephzibahBehulahHQ/hb-trading/tree/65b28cfc20925494b056321d57955e304eb09ac7) | `65b28cfc20925494b056321d57955e304eb09ac7` | `docs/financial-guidance.md` |

These are explicit product adoptions, not floating dependencies. Application
logic, tests and deployments remain in AdigunGamesBank. Adoption is not evidence
that every existing game already conforms.

## Corporate foundation

| Token / role | Value | Provenance |
| --- | --- | --- |
| Midnight Navy / primary background | `#0B1220` | Design-system `colors.navy` |
| Royal Blue / corporate accent | `#2563EB` | Design-system `colors.royalBlue` |
| Metallic Gold / corporate identity | `#D4AF37` | Design-system `colors.gold` |
| Ivory White / primary text | `#F8FAFC` | Design-system `colors.ivory` |
| Slate Grey / secondary elements | `#64748B` | Corporate README and owner requirements; absent from the pinned corporate JSON |

Use contrast-appropriate combinations. A brand color is not automatically
suitable for small text on every surface. Verify actual text/background contrast,
visible focus indicators and control states in the consuming product.

| Division | Canonical brand key | Accent | Division repository |
| --- | --- | --- | --- |
| HB Elektroniker | `elektroniker` | `#22D3EE` | [hb-elektroniker](https://github.com/HephzibahBehulahHQ/hb-elektroniker) |
| HB Trading | `trading` | `#22C55E` | [hb-trading](https://github.com/HephzibahBehulahHQ/hb-trading) |
| HB Artificial Intelligence | `artificialIntelligence` | `#A78BFA` | [hb-artificial-intelligence](https://github.com/HephzibahBehulahHQ/hb-artificial-intelligence) |
| HB Evangelism | `evangelism` | `#D4AF37` | [hb-evangelism](https://github.com/HephzibahBehulahHQ/hb-evangelism) |
| HB Politics | `politics` | `#F97316` | [hb-politics](https://github.com/HephzibahBehulahHQ/hb-politics) |

The cross-division catalog inherits this foundation. Individual games may use
their applicable approved accents; do not introduce a sixth corporate division.

## Logo, typography and shared layout

Use the existing approved image from design-system
`assets/corporate/hephzibah-behulah-official.jpg`. Its Git blob is
`f7b0e4a650d861fb9d52ed91ea894edec030e03b` (54,461 bytes). Copy the supplied artwork
without alteration and retain its provenance. Do not generate a replacement and
call it the official logo.

Use one corporate logo in the main header, the product name as text and a subtle
division or cross-division text label. Avoid competing product/division logos in
the header. An application icon is a separate icon-specific use.

The pinned corporate page uses `Inter, ui-sans-serif, system-ui, -apple-system,
BlinkMacSystemFont, "Segoe UI", sans-serif`, with `Georgia, serif` for editorial
display text. The design-system tree contains no packaged font file; a fallback
stack does not establish that a proprietary official font has been supplied.

Provide accessible navigation, responsive layout, visible keyboard focus and
reduced-motion behavior. Show theme and language controls only for implemented
capabilities. The naming standard specifies English (`en`), German (`de`), Yoruba
(`yo`) and Nigerian Pidgin (`pcm`); complete translations are the acceptance
condition. A selector alone does not satisfy localization.

The footer identifies corporate ownership, the product and relevant divisions
in text, plus working documentation/support links and the current year. Shared
components require documentation and functional tests within this product.

## Owner-provided corporate channels

These addresses are recorded in the pinned naming standard. Verify reachability
when shipping links; their appearance here is not a connectivity test.

| Channel | Canonical address |
| --- | --- |
| Corporate website | https://hephzibahbehulah.com/ |
| GitHub organization | https://github.com/HephzibahBehulahHQ |
| Facebook | https://www.facebook.com/Hephzibahbehulah/ |
| X | https://x.com/HephzibaBehulah |
| LinkedIn, personal profile | https://www.linkedin.com/in/isaacoluwoleadigun/ |
| TikTok | https://www.tiktok.com/@hephzibahbhehulah |
| Instagram | https://www.instagram.com/hephzibahbehulah |

## Capability and domain rules

The universal product configuration is **schemaVersion 3**. Supply actual
identity, links and implemented capabilities; keep unavailable services and
features `null` or `false`. Configuration is not proof of account, cloud-save,
translation, AI, deployment or administrative functionality.

If Adigun BOT is implemented, follow the pinned `components/AdigunBot/` standard:
server-side provider access, typed and validated product actions, authorization,
previews/confirmation for consequential changes, and native undo/redo where
supported. Expose only capabilities the product actually implements.

For trading content, record data source, time range, currency, assumptions and
historical/simulated/delayed/live status. Validate numerical transformations and
financial calculations. Do not describe hypothetical performance as guaranteed
returns or store sensitive financial/personal data in public files.

For circuit and engineering content, record references, units and model
assumptions. Distinguish numerical simulation from hardware validation or
certification. For Bible narratives, record passage references and translation
rights, and identify original adaptation dialogue rather than presenting it as
Scripture.
