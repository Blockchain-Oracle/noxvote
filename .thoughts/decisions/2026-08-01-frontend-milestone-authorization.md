# Decision: Frontend Milestone Authorization And Orbit Direction (2026-08-01)

Recorded from Abu's direct instructions in the 2026-08-01 session (voice-transcribed message plus
`AskUserQuestion` answers). This lifts the frontend portion of the former Phase 6 block and resolves
the design-ownership divergence recorded in the 2026-07-31 orientation brief.

## What Abu decided

1. **Frontend work is authorized now.** A dedicated frontend agent (a separate Claude session with a
   clean context) builds the UI end to end: landing page, app, and docs site. This session's job was
   to produce the complete handoff (`SPEC.md` plus the design-direction record), not to implement.
2. **Visual direction is decided: Direction C — ORBIT**, chosen by Abu from the claude.ai artifact
   `cb192590-eb5a-43fe-80f1-c671f8e9b1dc`. See
   [`../design/2026-08-01-orbit-direction.md`](../design/2026-08-01-orbit-direction.md). This
   resolves the previously PENDING taste decision and supersedes the `design/ui` branch candidates
   (`ledger`, `chamber`, `boundary`) and both prior design-ownership records
   (`EXTERNAL_COMMISSION` on this branch, `IN_REPO_TASTE` on `design/ui`): the frontend agent owns
   UI implementation inside the accepted Orbit direction and writes the project `DESIGN.md` from it.
3. **Repo layout:** the frontend lives in this repository as a pnpm `apps/` workspace —
   `apps/landing`, `apps/app`, `apps/docs` — mirroring Abu's `stellar-zk-wallet` monorepo pattern
   and its `domain / app.domain / docs.domain` deployment scheme.
4. **Parallel tracks:** testnet contract deployment is being handled by a separate agent, and
   hosting/deployment of the frontend by another. This track builds deploy-ready apps and consumes
   testnet addresses through configuration when they land; it does not deploy contracts, fund
   accounts, or configure hosting/DNS itself.
5. **Product name: NoxVote**, on `noxvote.xyz` (`app.noxvote.xyz`, `docs.noxvote.xyz`). Chosen by
   Abu on 2026-08-01 after a researched shortlist (no crypto-namespace collisions; `noxvote.xyz`
   RDAP-verified unregistered that day — the deployment track should register it promptly).
6. **Failure bar** (all four named by Abu): generic AI-slop UI; the judged demo flow breaking live;
   dishonest privacy copy; landing/docs not reaching the same bar as the app.

## What remains gated

- Submission claims and public publishing of claims remain gated on Abu.
- Funded/billable infrastructure beyond what the parallel deployment agents own remains gated.
- Contract source is frozen at the verified local gate; the frontend track does not modify
  `src/contracts/`.
