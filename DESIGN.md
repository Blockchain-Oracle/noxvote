---
version: alpha
name: ORBIT — NoxVote
description: Light-only warm-putty system. Sealed-record calm; one ember accent; state triad confined to chips and outcome rims.
colors:
  primary: "#141413" # = ink; primary actions are ink-filled pills
  canvas: "#f3f0ee"
  lifted: "#fcfbfa"
  white: "#ffffff"
  ink: "#141413"
  charcoal: "#262627"
  slate: "#696969"
  dust: "#d1cdc7"
  ghost: "#e8e2da"
  ember: "#c04a1e"
  recorded: "#1f5f8b"
  withheld: "#8a6d3b"
  passed: "#2e6f4e"
  danger: "#963022" # measured 6.75:1 on canvas, 7.41:1 on lifted — AA as text at every size used
typography-app:
  title: { fontFamily: Sofia Sans, fontSize: 18px, fontWeight: 500, letterSpacing: -0.02em } # list/row titles in app surfaces
typography:
  display-xl: { fontFamily: Sofia Sans, fontSize: 64px, fontWeight: 500, lineHeight: 1, letterSpacing: -0.02em }
  display-lg: { fontFamily: Sofia Sans, fontSize: 36px, fontWeight: 500, lineHeight: 1.22, letterSpacing: -0.02em }
  display-md: { fontFamily: Sofia Sans, fontSize: 24px, fontWeight: 500, lineHeight: 1.2, letterSpacing: -0.02em }
  lead: { fontFamily: Sofia Sans, fontSize: 20px, fontWeight: 450, lineHeight: 1.4 }
  body: { fontFamily: Sofia Sans, fontSize: 16px, fontWeight: 450, lineHeight: 1.4 }
  body-sm: { fontFamily: Sofia Sans, fontSize: 14px, fontWeight: 450, lineHeight: 1.45 }
  eyebrow: { fontFamily: Sofia Sans, fontSize: 14px, fontWeight: 700, lineHeight: 1, letterSpacing: 0.04em }
  mono: { fontFamily: JetBrains Mono, fontSize: 14px, fontWeight: 450, lineHeight: 1.4 }
  chip: { fontFamily: JetBrains Mono, fontSize: 12px, fontWeight: 500, lineHeight: 1.4 }
rounded:
  frame: 40px
  card: 24px
  pill: 999px
spacing:
  wrap: 32px
  gutter: 48px
  band: 120px
---

# DESIGN.md — NoxVote

ORBIT (Direction C, accepted by Abu 2026-08-01). Seeded from
`.thoughts/design/2026-08-01-orbit-direction.md` and the preserved render
`.thoughts/design/2026-08-01-orbit-direction-artifact.html` ("artifact"
below). Token authority for `apps/landing`, `apps/app`, `apps/docs`; the
`design-auditor` audits every batch against it. Sample screen (hero +
constellation + record) built and provisionally accepted by Abu 2026-08-01
(pass 1); tokens verified against the built screen — renders preserved in
`.screenshots/`. Final revision lands after Abu's detailed review.

## Overview

NoxVote is confidential governance voting: a host-neutral encrypted ballot
core for Safe and OpenZeppelin Governor on Nox. Wallets vote in public; their
choices stay private; only a pass/reject verdict is published, and only when
enough wallets took part. Emotional target: **the calm certainty of a sealed
record** — warm, architectural, unhurried, one wire of ember energy.

**Light-only** (`color-scheme: only light`; no dark mode by product law). The
canvas is warm putty; the ink stadium hero, CTA panel, and footer are the
deliberate dark counterweights.

Anti-references: Aceternity/Magic-UI house style (spotlights, beams, gradient
borders, glassmorphism); dark neon crypto dashboards; flat system-font drafts
(Inter on gray cards).

Sources: ORBIT record; artifact lines 3, 20–60.

## Colors

Values are normative in the frontmatter. The laws:

- **Accent scarcity:** `recorded`/`withheld`/`passed` appear **only** on
  lifecycle chips, outcome-panel rims, and the record card's privacy-floor
  pips (each lit pip is a recorded wallet — artifact line 620). Nothing else
  borrows them — the artifact's `.limit` card deliberately uses `dust`.
- **Ember is graphical:** arcs and dots only (incl. eyebrow/chip dots). At
  4.37:1 on canvas it fails AA for normal text; it never sets text.
- **True white is reserved** (deliberate `#ffffff`): floating nav, satellites,
  secondary pills — never a page canvas. No pure `#000000` anywhere.
- **Passed chip covers positive verification** (added 2026-08-01, B5 review,
  delegated): the `passed` triad chip may label a genuine positive
  verification verdict — a Verified adapter, a Compatible host — not only a
  Passed ballot. Both are affirmative, checked states; the chip stays the
  triad's home. It never labels a neutral or in-progress state.
- **Danger is for invalid, never for withheld** (added 2026-08-01, B1 review,
  delegated to the frontend agent): `danger` marks error and invalid/mismatch
  states only — wrong action hash, wrong proof signer, wrong handle, execution
  mismatch, failed reads/writes. It never marks the privacy-floor Withheld
  outcome (that is the deliberate `withheld` triad state) and is never
  decorative. Measured: 6.75:1 on canvas, 7.41:1 on lifted — legal as text.
  Ember remains graphical-only.
- **Dust carries text only on ink** (11.8:1) — footer links, on-ink leads —
  never text on canvas. On canvas it is hairlines/borders only.
- Text pairings: ink or charcoal on canvas/lifted; slate for secondary;
  canvas text on ink surfaces.

Sources: artifact lines 20–60, 147–148, 755–763, 811–813.

## Typography

Self-hosted variable woff2 only (extracted from the artifact into
`packages/ui/src/fonts/`): **Sofia Sans** 400–700 (`--sans`, Arial fallback) and
**JetBrains Mono** 400–600 (`--mono`, ligatures off). Body weight **450 is
load-bearing** — the variable font resolves it exactly; never snap to 400/500.

Frontmatter sizes are desktop values; display/lead sizes fluid-scale down:
`display-xl clamp(36px,4.4vw,64px)`, `display-lg clamp(28px,3.2vw,36px)`,
`display-md clamp(21px,1.9vw,24px)`, `lead clamp(17px,1.5vw,20px)`. Eyebrow is
uppercase with an 8px ember dot. Pill/nav labels: 16/15px, weight 500,
-0.03em. All hashes, addresses, weights, trackers, rule values set in mono.

App surfaces add one step (2026-08-01, B1 review, delegated): `title`
18px/500/-0.02em for list-row and item titles — between body and display-md,
named here so it is a scale step, not drift. Card padding rhythm on app
surfaces: 20–24px.

Sources: artifact lines 7–18, 64–75, 91–145, 152–171.

## Layout

- Content max `1280px`; `.wrap` pads 32px (20px ≤767). Section rhythm
  `band: 120px` (84 ≤900, 72 ≤767). Page gutter 48px (24 ≤900) frames the
  stadium hero and CTA panel.
- Spacing: loose 8-based scale — 8/10/12/14 control gaps, 16–24 card padding
  and heading gaps, 32 section padding, 40–64 band intros and grids.
- Grids: trio `3×1fr`; outcomes/trust `2×1fr`; facts `4×1fr`; footer
  `1.2fr+3×1fr`; rules `0.85fr/1.15fr`; record `1.5/0.9/1.2/1.1fr`.
- Breakpoints (max-width): **1180** nav tightens; **1080** constellation
  stacks, arcs removed (desktop-only law), rules single-column; **900**
  trio/outcomes/trust stack, facts 2-up, nav links hide; **767** small
  radii/bands, hero CTAs stack, record header hides; **480** nav CTA drops
  (hero repeats both CTAs).
- The constellation locks to a 1200×400 viewBox via `aspect-ratio` so circles
  and arcs share one coordinate space at every width.

Sources: artifact lines 43–49, 80–89, 443–448, 868–958.

## Elevation & Depth

Separation is surface steps (canvas→lifted) and 1px `dust` hairlines. Shadow
exists as exactly two named halos: `--halo: 0 24px 48px rgba(20,20,19,0.08)`
(hero frame, record card, CTA panel) and `--halo-nav: 0 4px 24px
rgba(20,20,19,0.04)` (nav, satellites). Wide low-opacity halos — **never a
directional drop shadow, never generic `shadow-md`**.

Sources: artifact lines 51–54, 281, 327, 557, 799.

## Shapes

`frame: 40px` (32 ≤767) — hero, CTA panel; `card: 24px` — cards/panels;
`pill: 999px` — pills, chips, nav, redact cell, outcome panels. Stated
rule-break: outcome panels relax from pill to frame radius below 767px (a
999px radius on a narrow column swallows its corners). Borders 1px dust;
1.5px on pills and outcome rims; stage/number circles are true circles.

Sources: artifact lines 43–45, 152–171, 407–412, 938–940.

## Components

Shared primitives live in `packages/ui`; screens compose, never re-invent.
States listed are the artifact's; app screens add the surface map's required
states on top.

| Component | Source (artifact lines) | States |
| --- | --- | --- |
| Pill button | `packages/ui` (152–196) | default, hover lift -2px, active scale .98, focus; variants ink / outline / on-ink / on-ink-ghost; arrow slide |
| Lifecycle chip | `packages/ui` (217–240) | recorded, withheld, passed — the only home of the state triad |
| Sealed cell `.redact` | `packages/ui` (244–253) | one state; never resolves; `#2b2b29` on ink |
| Eyebrow | `packages/ui` (120–137) | default; ember dot prefix |
| Link | `packages/ui` (206–213) | default, hover .62, focus |
| Floating nav | `apps/landing` (265–314) | default; ≤1180 tight; ≤900 links hidden; ≤480 CTA dropped |
| Stadium hero | `apps/landing` (316–370) | ember field arcs right half only; text never over strokes |
| Orbit stage + satellite | `packages/ui` (478–546) | undrawn → docked; hover lift; ≤1080 stacked row, no arcs |
| Orbit arcs | `packages/ui` (450–476) | undrawn → drawn; lengths via `getTotalLength()` |
| Record card | `packages/ui` (550–620) | rows stagger in; privacy-floor pips; ≤767 compact |
| Rules panel | `packages/ui` (634–652) | static dl rows, mono values |
| Outcome panel | `packages/ui` (656–701) | passed rim / withheld rim; ≤767 frame radius |
| Ghost watermark | `packages/ui` (376–390) | static, band-clipped, `ghost` only |
| Dark footer | `packages/ui` (815–866) | static; dust links on ink only |

Sources: artifact CSS/markup at the cited lines.

## Do's and Don'ts

**Motion.** `--ease: cubic-bezier(0.33,1,0.68,1)`; `--fast 220ms` controls,
`--base 420ms` reveals, `--draw 900ms`. One signature gesture: arcs draw on
first visibility (IntersectionObserver ~0.2), satellites dock in sequence
(260ms + 150ms stagger), record rows stagger at 110ms. Arc lengths measured
via `getTotalLength()`; authored `--len` is fallback. Reduced motion renders
the fully drawn end state — never a paused half-drawn one.

**Copy (verbatim, non-negotiable).** Always: "Result withheld", "Exact totals
are not disclosed", "Your wallet and participation are public; your choice is
private." Privacy floor ≠ governance quorum — never merged visually or
verbally. Banned: "anonymous", "receipt-free", "client-side encryption", any
running tally, any fabricated progress percentage (named stages + real
elapsed time only). Register: declarative, load-bearing sentences ("Five
stages. One of them is unreadable.").

**Accessibility.** WCAG AA all text pairings; the two measured constraints
are law (ember never text; dust text only on ink). Focus: `2px solid ink`
outline at 3px offset; canvas outline on ink surfaces. Pills min-height 52px
(44px nav variant).

**Signature elements:** the self-drawing five-stage orbit with docked
satellites; the sealed `.redact` cell that never resolves; the ink stadium
hero with sealed-field pattern and right-half ember arcs; the floating white
nav pill; band-clipped ghost watermarks.

Do:

- Keep the canvas warm putty; reserve true white (nav, satellites, pills).
- Use exactly two elevations, both halo tokens.
- Set every hash, address, weight, and rule value in JetBrains Mono.
- Render withheld data as the sealed cell — designed intent, not absence.
- Label fixture data visibly wherever it appears during iteration.

Don't:

- No state triad outside chips, outcome rims, and privacy-floor pips.
- No ember text; no dust-on-canvas text.
- No gradients, spotlights, beams, glass, or directional drop shadows.
- No running tally, exact totals, plaintext choice, or fake progress —
  anywhere, in any state.
- No arc between option labels — arcs connect lifecycle stages only.
- No orbit constellation below 1080px — stack stages, remove arcs.

Sources: artifact lines 56–59, 198–204, 255–261, 443–448, 465–476, 990–991,
1349–1398; copy laws restated from the ORBIT record and
`.thoughts/design/2026-07-29-product-surface-map.md`.
