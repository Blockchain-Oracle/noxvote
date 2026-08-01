# Handoff: NoxVote Frontend Milestone (Landing + App + Docs)

## Objective

Complete the confidential-governance frontend milestone: three deploy-ready
surfaces (`apps/landing`, `apps/app`, `apps/docs`) built in the accepted ORBIT
direction, with the 16-screen voting product wired to the live Sepolia Phase 6
deployment. This handoff closes the full-milestone build (Phases 1-4 of the
approved plan); the landing+docs checkpoint was closed earlier.

## Decisions made and why (including ones made without asking)

- **Harness stage marker corrected to `build`.** On resume the stage inferred
  `close` from the already-closed landing+docs checkpoint; the remaining
  `apps/app` scope is build work. Wrote `.thoughts/state.json` `{"stage":"build"}`.
- **Read RPC transport rebuilt (drpc + tenderly).** The demo surfaced that the
  app's discovery/history/execution all need `eth_getLogs` over the
  deployment-to-latest range, which viem's default (thirdweb) flakily
  CORS-blocks and the free tiers of Alchemy (10-block getLogs cap) and
  publicnode (no archive) reject. Switched to drpc primary + tenderly fallback
  (keyless, CORS, archive), added topic-filtered getLogs (`lib/logs.ts`) and
  JSON-RPC batching, kept a `VITE_SEPOLIA_RPC_URL` override. Abu offered an
  Alchemy key mid-session; not used because its free tier cannot serve the
  getLogs ranges — the override is there if he wants a paid endpoint.
- **Three B1 review items resolved as delegated:** added a measured `danger`
  token (#963022), an app `title` type step, and blessed the `passed` chip for
  positive verification — all recorded in `DESIGN.md`; the surface map gained a
  dated data-shape reconciliation.
- **Author flow: Governor path only, in-app.** `proposeConfidential` is
  caller-open so it is a real in-app write; the Safe `registerProposal` path is
  `onlySafe`-gated and ships as a decoded-calldata handoff, not a faked flow.
- **Draft persistence added** to realize the surface map's "restored draft"
  state (session-scoped, cleared on publish).
- **~175 lines of dead foundation code deleted** in the simplify pass (unused
  selectors/types/ABIs) after confirming zero importers.

## Artifacts (links only)

- Verification report: `.thoughts/verification/2026-08-01-frontend-apps-milestone.md`
- Spec / design: `SPEC.md`, `DESIGN.md`
- Surface map (+ 2026-08-01 addenda): `.thoughts/design/2026-07-29-product-surface-map.md`
- Approved plan: `/Users/abu/.claude/plans/phase-6-is-complete-vast-thompson.md`
- Live renders (per batch, Sepolia): `.screenshots/b1..b6-*.png`
- Checkpoint consumed: `deployments/sepolia/phase6-live.json`
- Prior checkpoint handoff: `.thoughts/handoffs/2026-08-01-frontend-checkpoint-handoff.md`

## Current state

- Branch `frontend/noxvote-apps` @ `bc15733`. Working tree has this report +
  handoff uncommitted (the closing commit adds them).
- All 16 `apps/app` screens built; landing + docs built. `pnpm install` clean;
  all three apps build+typecheck green; `forge test` 119/119; `pnpm
  test:integration` 11/11 on the Docker Nox stack.
- Every read/verification/honest-state surface verified in-browser against live
  Sepolia with zero console errors.

## Commands to resume

```bash
cd /Users/abu/dev/hackathon/wtf/.claude/worktrees/frontend-noxvote
pnpm install
pnpm -r --filter "./apps/*" build      # all three apps
forge test                             # 119/119
pnpm --filter @noxvote/app dev         # drive the app (reads live Sepolia)
# optional, for the live write-drive: point VITE_LOCAL_* / deployments/local.json
# at a running Docker Nox stack, or connect funded Sepolia wallets.
```

## Known risks and open items

- **AC1 live write-drive** (four wallets cast → tally → finalize → execute
  through the browser) not performed: the live ballots are finalized/executed
  and fresh writes need funded Sepolia keys — Abu's call. Write path is verified
  by construction (reviewer-confirmed identical wiring to the passing
  integration test) and the flow passes end-to-end in `pnpm test:integration`.
- **AC5 same-product judgment** is Abu's subjective review.
- **RPC**: set `VITE_SEPOLIA_RPC_URL` to a paid archive endpoint for production
  reliability; the keyless defaults are rate-limited.
- Hosting/DNS for `noxvote.xyz` / `app.` / `docs.` remains the deployment
  agent's BLOCKED scope; the domain was RDAP-verified unregistered 2026-08-01.
- Contract-scaffolding retirement (`phase6:*` scripts, `src/spike/*`) is still
  deferred to a pre-submission pass per Abu's 2026-08-01 choice.

## Next steps (exact, ordered)

1. Abu reviews the app alongside landing + docs (AC5) and drives (or authorizes
   driving) the live 4-wallet write cycle to close AC1.
2. Deployment agent: register `noxvote.xyz`, host the three apps, wire subdomains.
3. Pre-submission cleanup pass: retire contract scaffolding once remote CI is
   observed (separate from this track).
4. Open the PR for `frontend/noxvote-apps` → `main` when Abu is ready.
