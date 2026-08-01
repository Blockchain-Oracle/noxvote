# Accepted Visual Direction: ORBIT (Direction C)

**Status:** Accepted by Abu on 2026-08-01. This supersedes the three `design/ui`-branch candidates
(`design-lab/{ledger,chamber,boundary}`), whose taste decision was PENDING and is now resolved by
this choice. The frontend agent derives the project `DESIGN.md` from this direction; it does not
re-open the direction question.

**Provenance:** Chosen from the claude.ai artifact "Direction C — ORBIT"
(`https://claude.ai/code/artifact/cb192590-eb5a-43fe-80f1-c671f8e9b1dc`), produced by a separate
design-exploration agent. The complete rendered artifact is preserved verbatim at
[`2026-08-01-orbit-direction-artifact.html`](2026-08-01-orbit-direction-artifact.html) — open it in a
browser to see the direction live. The artifact references an `orbit/DESIGN.md` contract that lives
in the other agent's session; the tokens and laws below are extracted directly from the artifact CSS
so nothing depends on that session.

## Tokens (extracted verbatim from the artifact)

### Color

| Token        | Value     | Role                                                                                                             |
| ------------ | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `--canvas`   | `#f3f0ee` | Page background — warm putty. Light theme only.                                                                  |
| `--lifted`   | `#fcfbfa` | Raised surfaces (cards).                                                                                         |
| `--white`    | `#ffffff` | Reserved: floating nav, satellites, secondary pills. **Never a page canvas.**                                    |
| `--ink`      | `#141413` | Primary text, ink pills/bands, dark footer.                                                                      |
| `--charcoal` | `#262627` | Secondary dark.                                                                                                  |
| `--slate`    | `#696969` | Secondary text.                                                                                                  |
| `--dust`     | `#d1cdc7` | Hairlines/borders; carries text **only on `--ink`** (11.8:1), never on `--canvas`.                               |
| `--ghost`    | `#e8e2da` | Ghost watermarks, faint fills.                                                                                   |
| `--ember`    | `#c04a1e` | Accent. **Arcs and dots only** — 4.37:1 on canvas fails AA for normal text; restriction enforced by measurement. |
| `--recorded` | `#1f5f8b` | State triad: recorded/lifecycle blue.                                                                            |
| `--withheld` | `#8a6d3b` | State triad: withheld amber.                                                                                     |
| `--passed`   | `#2e6f4e` | State triad: passed green.                                                                                       |

### Type

- `--sans: "Sofia Sans", Arial, sans-serif` — variable font, embedded as real woff2 in the artifact.
  Body weight **450** is load-bearing (the variable font resolves it exactly; do not snap to 400/500).
- `--mono: "JetBrains Mono", ui-monospace, monospace` — hashes, addresses, trackers, receipts.

### Geometry, elevation, motion

- Radii: `--r-frame: 40px` (32px small screens), `--r-card: 24px`, `--r-pill: 999px`.
- Layout: `--max: 1280px`, `--gutter: 48px` (24px small), `--band: 120px` (84/72px smaller).
- Elevation: exactly two — `--halo: 0 24px 48px rgba(20,20,19,0.08)` and
  `--halo-nav: 0 4px 24px rgba(20,20,19,0.04)`. Wide low-opacity halos, **never a directional drop
  shadow**.
- Motion: `--ease: cubic-bezier(0.33,1,0.68,1)`, `--fast: 220ms`, `--base: 420ms`, `--draw: 900ms`.

## Laws (from the artifact's authored comments — these are contract, not taste)

1. **Accent scarcity:** the state triad (`--recorded/--withheld/--passed`) appears **only** on
   lifecycle chips and outcome rims. Nothing else may borrow those colors.
2. **Ember is graphical:** `--ember` draws arcs and dots. It never sets normal text (measured AA
   failure on canvas).
3. **True white is reserved** for the floating nav, satellites, and secondary pills — the page canvas
   is always warm putty.
4. **Two elevations only**, both named halo tokens.
5. **Signature gesture — the orbit draws itself:** five circular lifecycle stages
   (Preparing encrypted handle → Ready for wallet → Submitting → Confidential computation →
   Recorded) joined by thin ember arcs on a locked 1200×400 viewBox; a white satellite docks onto
   each rim in sequence after its arc draws. Reduced motion renders the fully drawn end state.
   Measure real arc lengths via `getTotalLength()`; authored `--len` values are fallback only.
6. **The sealed cell never resolves** at any breakpoint — the deliberately-hidden tally is rendered
   as intent, not absence.
7. **Ghost watermarks** are positioned/clipped to their band; any band may carry one.
8. **Responsive:** the orbit constellation is desktop-only — below 1080px stages stack and arcs are
   removed (arcs only mean something against asymmetric placement). Pill-shaped outcome panels relax
   to `--r-frame` on narrow columns. The nav pill drops its CTA when the wordmark + two-word CTA no
   longer fit one line (the hero repeats both CTAs).
9. **Dark warm footer** on `--ink` with `--dust` links (contrast-verified for that pairing only).

## Voice established by the artifact (aligns with the accepted copy laws)

- H1: "Your wallet and participation are public; your choice is private."
- Section heads in the same register: "A public tally changes the vote it is counting." /
  "Five stages. One of them is unreadable." / "Only one of these ever reaches the public record." /
  "What this does not promise." / "Who you are trusting, named." /
  "Participation in public. Choice in private."
- The artifact already encodes the honesty laws: a named denial list, a named trust boundary, and no
  fabricated progress.

## What the frontend agent does with this

- Write the project `DESIGN.md` (harness design stage) from these tokens and laws, then build every
  screen inside that system. The landing page should treat the artifact itself as its base draft —
  it is already a full landing composition.
- Contrast claims above are measured, not aesthetic; keep a contrast check in the loop when
  extending the palette.
