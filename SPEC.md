# Spec: Confidential Governance Frontend — Landing, App, And Docs

## Objective

After this milestone, this repo carries a pnpm `apps/` workspace with three deploy-ready surfaces —
`apps/landing` (marketing site, `noxvote.xyz`), `apps/app` (the voting product, `app.noxvote.xyz`),
and `apps/docs` (documentation, `docs.noxvote.xyz`) — the product is **NoxVote** — all built inside
the accepted ORBIT visual direction,
wired to the Sepolia contracts the parallel Phase 6 agent deploys, and able to walk the judged demo
story (four wallets cast encrypted votes, one replacement, close, tally, verdict-only reveal, exact
Safe execution) live in a browser without a single dishonest state or copy violation.

## Handoff context (read these before any code, in this order)

1. `.thoughts/briefs/2026-07-29-plain-english-product-definition.md` — what the product is, the
   complete user flow, the demo story, and what the product is **not**. This is the mental model.
2. `.thoughts/design/2026-07-29-product-surface-map.md` — the accepted functional contract: every
   screen, every required state, on-screen data shapes with sample values, copy/vocabulary laws, and
   what is decided vs the designer's call. The `design-auditor` agent enforces this inventory.
3. `.thoughts/design/2026-08-01-orbit-direction.md` — the accepted visual direction (tokens + laws),
   with the full rendered artifact preserved at
   `.thoughts/design/2026-08-01-orbit-direction-artifact.html` (open it in a browser).
4. `.thoughts/decisions/CURRENT.md` — canonical decisions, trust/claim boundaries, and gates.
5. `.thoughts/decisions/2026-08-01-frontend-milestone-authorization.md` — what this track owns and
   what parallel agents own.
6. `test/integration/production-confidential-ballot.test.ts` — the canonical, passing wiring example
   for the full confidential flow (eligibility, Handle Gateway encryption, cast, replacement, close,
   tally request, verdict finalization). Treat it as executable documentation of the contract API.
7. `src/contracts/` — production interfaces (`interfaces/`), core, Safe module, Governor, factory.
   Read the interfaces; do not modify anything under `src/contracts/`.
8. Reference monorepo for layout/stack/docs patterns: `/Users/abu/dev/hackathon/stellar-zk-wallet`
   (`apps/landing` Vite+React 19+Tailwind 4, `apps/docs` react-router 8+fumadocs, `packages/ui`
   shared components, and its README's `domain / app. / docs.` deployment scheme).

If anything in these documents is unclear, ask Abu directly before inventing an answer — he has
asked for exactly that.

## Requirements

- R1 — Convert the repo root into a pnpm workspace (`pnpm-workspace.yaml`, root `package.json`
  update) with `apps/landing`, `apps/app`, `apps/docs`, and `packages/ui` (shared ORBIT tokens,
  fonts, and primitives). The existing contract toolchain (`hardhat`, `forge`, `pnpm test:*`,
  `pnpm phase6:*`) must keep working unchanged — verify before and after.
- R2 — Run the harness design stage first: write `DESIGN.md` derived from
  `.thoughts/design/2026-08-01-orbit-direction.md` (tokens, laws, type scale, motion), build **one**
  living sample screen (the landing hero + orbit constellation is the natural candidate), iterate it
  to Abu's taste, and only then scale to the full inventory. Use the `premium-ui` skill with real
  self-hosted webfonts (Sofia Sans variable, JetBrains Mono — both embedded in the preserved
  artifact), 21st.dev registries for component inspiration, and tweakcn if a shadcn base is used.
  Abu rejects flat/system-font drafts; the ORBIT laws are the bar.
- R3 — `apps/landing`: the preserved ORBIT artifact **is** the accepted landing draft (hero,
  problem band, five-stage constellation, record band, outcomes, denial list, trust boundary, CTA,
  footer). Rebuild it as real components under the **NoxVote** name, resolving to the same visual
  result or better.
- R4 — `apps/app`: implement the sixteen product screens in the Surfaces table below with every
  required state from the surface map. Build order: DEMO-CRITICAL A (proposal detail), B (tally
  status), C (verification center) and the voter flow first; admin/author surfaces after.
- R5 — `apps/docs`: follow the `stellar-zk-wallet` docs pattern (react-router + fumadocs + llms.txt
  build step). Ask Abu for his docs format/structure at session start — he has a standard one he
  will provide. Minimum content: overview, how it works (the five stages + trust boundary), the
  honest-limits page (what is not promised), integrator guides (Safe path, Governor path), voter
  guide, verification guide, and deployed addresses.
- R6 — Chain wiring goes through one config module in `apps/app` that loads deployed addresses from
  `deployments/sepolia/phase6-live.json` (the Phase 6 agent's public resumable checkpoint — not yet
  created; treat its absence as the signal to use the local-stack profile) plus a local-stack
  profile for the Docker-backed Hardhat environment. No
  hardcoded fake addresses anywhere. Wallet connection is a standard injected EIP-1193 provider;
  vote encryption uses the released Nox Handle SDK exactly as the integration test does.
- R7 — Copy laws from the surface map are verbatim and non-negotiable: never "anonymous",
  "receipt-free", "client-side encryption", or a running tally; always "Result withheld",
  "Exact totals are not disclosed", "Your wallet and participation are public; your choice is
  private." Privacy floor and governance quorum stay visually and verbally distinct.
- R8 — Honest states only: no fabricated progress percentages (named stages + elapsed time), no
  optimistic Recorded, fixture data used during design carries a visible label and never ships in a
  wired screen's REAL path.
- R9 — After every batch of 3–4 screens, run the `design-auditor` agent against the surface map and
  `DESIGN.md`; fix findings before the next batch.

## Out of scope

- No changes to `src/contracts/`, `test/`, `scripts/phase6-sepolia.ts`, or the Foundry/Hardhat
  config — the contract track is frozen and verified; the Phase 6 agent owns its runner.
- No contract deployment, account funding, or Sepolia transactions from this track — the parallel
  Phase 6 agent owns them; consume its checkpoint file only.
- No hosting, DNS, or deploy configuration beyond making each app build and `start` cleanly — a
  separate deployment agent owns hosting.
- No mobile app (`apps/mobile` in the reference repo has no counterpart here); responsive web only,
  honoring the ORBIT responsive laws.
- No custom backend or indexer this milestone — reads come from RPC and the released Nox
  subgraph/SDK the integration test already uses; no funded infrastructure.
- No dark mode: ORBIT is a light-only system (the artifact pins `color-scheme: only light`).
- No re-opening of the visual direction, and no admin ballot-export or decrypted-ballot surface of
  any kind (product law).
- No submission claims or public publishing — still gated on Abu.

## Files

- `pnpm-workspace.yaml` — new: workspace roots `apps/*`, `packages/*`.
- `package.json` — root: workspace scripts only; contract scripts unchanged.
- `DESIGN.md` — new: design-stage output derived from the ORBIT direction record.
- `apps/landing/**` — new: Vite + React 19 + Tailwind 4 marketing site.
- `apps/app/**` — new: the voting product (same stack; `src/config/addresses.ts` is the single
  chain-config module reading `deployments/sepolia/phase6-live.json`).
- `apps/docs/**` — new: react-router + fumadocs documentation site.
- `packages/ui/**` — new: ORBIT tokens, font files, shared primitives (pills, chips, halo cards,
  constellation stage circle).
- `.thoughts/verification/*.md`, `.thoughts/handoffs/*.md` — harness process artifacts: the verify
  stage's dated evidence reports and handoffs for this milestone (required by the verify skill).

## Integrations

| Surface                                                                              | Classification      | Note                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sepolia factory/core/Safe-module/Governor via `deployments/sepolia/phase6-live.json` | REAL_MVP            | Addresses land from the Phase 6 agent; until the file has addresses, wiring is built and exercised against the local stack profile — never against invented addresses. |
| Injected wallet (EIP-1193) in `apps/app`                                             | REAL_MVP            | Real signatures, real transactions.                                                                                                                                    |
| Nox Handle SDK encryption path (Handle Gateway)                                      | REAL_MVP            | Exactly the released SDK flow proven in `test/integration/production-confidential-ballot.test.ts`.                                                                     |
| Local Docker Nox + Hardhat stack profile                                             | REAL_MVP            | The proven 4-wallet/floor-4 environment; used for development and as demo fallback.                                                                                    |
| Design-time fixture data (screens under iteration)                                   | SIMULATED_DEMO_ONLY | Visibly labeled; removed from any screen the moment it wires.                                                                                                          |
| Hosting/DNS for `noxvote.xyz / app.noxvote.xyz / docs.noxvote.xyz`                   | BLOCKED             | Separate deployment agent; domain verified unregistered 2026-08-01 — register promptly.                                                                                |
| Product name/brand constant                                                          | REAL_MVP            | Decided 2026-08-01: **NoxVote** on `noxvote.xyz`. One `BRAND` constant in `packages/ui`; no placeholder needed.                                                        |

## Surfaces (UI only)

Required states are enumerated in full in `.thoughts/design/2026-07-29-product-surface-map.md`
("Per-screen Required States") — the rows below index it; the map is the contract.

| Screen                                        | Required states (from map)                                                                                                                                             | Data shown                                                              | Entry point                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Landing page (`apps/landing`)                 | static + reduced-motion; constellation desktop-only                                                                                                                    | Product promise, five stages, outcomes, denial list, trust boundary     | domain root                           |
| Docs site (`apps/docs`)                       | nav/search/light                                                                                                                                                       | Guides, mechanism, limits, addresses                                    | docs.domain                           |
| 1. Confidential voting overview               | compatible / unsupported / wrong network / not connected / installed                                                                                                   | Capability + guarantee summary, four public/private boundaries          | app onboarding                        |
| 2. Adapter permission review                  | Safe + Governor variants; confirming / awaiting owners / rejected / failed / installed                                                                                 | Exact module authority, threshold, addresses                            | overview → install                    |
| 3. Installation verification                  | unverified / verifying / verified / mismatch / removed                                                                                                                 | Host + adapter addresses, network, status                               | install flow end                      |
| 4. Host proposal editor + Confidential toggle | off / on / mandatory-by-policy / unavailable                                                                                                                           | Native proposal fields + guarantee preview                              | author flow                           |
| 5. Confidential voting configuration panel    | blank / restored draft / valid / field errors (7 product-specific)                                                                                                     | Snapshot, privacy floor, choices, replacement policy, dates             | editor → configure                    |
| 6. Publish review                             | loading / valid / unrecognized-calldata / mismatch / publishing / rejected / failed / published                                                                        | Decoded action, immutable commitments, trust acknowledgement            | configure → publish                   |
| 7. Proposal detail — DEMO-CRITICAL A          | 14 states: loading → scheduled → open (disconnected/ineligible/eligible/pending/recorded/superseded) → closed → withheld/computing/passed/rejected → execution → error | Header, rules card, participation card, connected-voter card            | shared link; app home                 |
| 8. Vote drawer                                | disconnected / checking / eligible / ineligible / wrong network / not open / ceiling reached / choice selected                                                         | Fixed weight, equal For/Against/Abstain, privacy explanation            | proposal detail                       |
| 9. Ballot progress overlay                    | 5 ordered stages + per-stage tailored failure/retry                                                                                                                    | Stage names, elapsed time — never a fake percentage                     | vote drawer confirm                   |
| 10. Ballot operation receipt                  | submitted / computing / effective / superseded / rejected / timed out / stale                                                                                          | Tracker, sequence, tx, timestamps + "status, not your plaintext choice" | overlay; proposal detail              |
| 11. Change-vote confirmation                  | allowed / pending-previous / too late / ceiling / wrong sequence / recorded                                                                                            | Replacement warning, newest-vote rule, public-visibility note           | proposal detail                       |
| 12. Verification center — DEMO-CRITICAL C     | loading / pre-open / open / closed-pending / withheld / finalized / partial-indexer / invalid-mismatch                                                                 | Commitments, operation record, proof provenance, execution match        | every status + receipt                |
| 13. Tally status panel — DEMO-CRITICAL B      | 10 states: disabled → privacy check → floor failed / ready → submitting → computing → proof ready → bad proof / timed out → finalized                                  | Privacy check, request ID, expected verdict handle, elapsed (real)      | proposal detail at close              |
| 14. Execution panel                           | unavailable / waiting timelock / ready / submitting / executed / failed-retry / mismatch-blocked                                                                       | Decoded committed action, queue/delay, tx                               | proposal detail after Passed          |
| 15. Proposal list rows/cards                  | 10 lifecycle labels; participation vs floor, never percentages                                                                                                         | Badge, state, privacy-floor progress                                    | app home                              |
| 16. Guarantee/trust explainer overlay         | single overlay, 5 stable sections                                                                                                                                      | Private / Public / Trusted today / What the proof checks / Not promised | install, create, detail, verification |

## Acceptance criteria

- AC1 — Given the local stack profile (and Sepolia once addresses land), when the demo story is
  driven entirely through `apps/app` in a browser — four eligible wallets cast, one replaces, close,
  tally request, verdict finalizes Passed, Safe executes the committed action — then every screen
  shows only honest states and the flow completes without console errors or dead ends.
- AC2 — Given any recorded/closed proposal state, when any surface is inspected, then no running
  tally, no exact totals, no plaintext choice, and no banned vocabulary appears anywhere
  (grep-auditable against the copy laws).
- AC3 — Given `DESIGN.md`, when the `design-auditor` runs over each screen batch, then ORBIT token
  fidelity, accent-scarcity, required states, and contrast laws pass with no unresolved findings.
- AC4 — Given a fresh clone, when `pnpm install && pnpm -r --filter "./apps/*" build` runs, then all
  three apps build and typecheck green while `forge test` and the contract scripts still pass.
- AC5 — Given the landing page and docs site, when Abu reviews them, then they read as the same
  product and bar as the app (his stated failure mode: "landing/docs feel unfinished").

## Verification

```bash
# 1. Workspace + contract toolchain intact
pnpm install
pnpm -r --filter "./apps/*" build
forge test    # still 119/119 — proves the workspace change broke nothing

# 2. End-to-end demo flow (local profile; rerun on Sepolia when phase6-live.json has addresses)
pnpm test:integration        # Hardhat Nox plugin boots the released Docker stack and proves the flow
pnpm --filter app dev        # against that same local stack profile, drive the full demo story:
                             # connect 4 wallets → 4 encrypted casts (1 replacement) → close →
                             # request tally → Passed verdict → execute Safe action →
                             # verification center shows the complete green evidence chain
```

## Checklist

- [ ] R1 workspace conversion, contract toolchain proven unchanged
- [ ] R2 DESIGN.md + accepted sample screen (Abu taste checkpoint)
- [ ] R3 landing rebuilt from the ORBIT artifact
- [ ] R4 sixteen app screens with required states (A, B, C first)
- [ ] R5 docs site in Abu's format
- [ ] R6 single chain-config module; Sepolia checkpoint + local profile
- [ ] R7 copy-law audit clean
- [ ] R8 honest states; labeled fixtures only
- [ ] R9 design-auditor pass per batch
- [ ] AC1–AC5

## Sources

- `.thoughts/decisions/CURRENT.md` (canonical decisions; 2026-08-01 frontend + Phase 6 updates)
- `.thoughts/decisions/2026-08-01-frontend-milestone-authorization.md`
- `.thoughts/design/2026-08-01-orbit-direction.md` + preserved artifact HTML
- `.thoughts/design/2026-07-29-product-surface-map.md` (screens, states, data, copy laws)
- `.thoughts/briefs/2026-07-29-plain-english-product-definition.md`
- `.thoughts/decisions/2026-08-01-phase6-live-authorization.md` (parallel testnet track + checkpoint path)
- `/Users/abu/dev/hackathon/stellar-zk-wallet` (layout, stack, docs, and domain-scheme reference)
- Abu's 2026-08-01 interview answers (repo layout, integration reality, failure bar, name direction)
