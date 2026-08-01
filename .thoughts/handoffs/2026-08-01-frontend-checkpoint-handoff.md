# Handoff: Frontend Milestone Checkpoint (Landing + Docs + UI)

## Objective

Close the landing+docs batch of the NoxVote frontend milestone honestly, protect all work in git,
and hand a clean runway to the remaining scope: contract-branch merge, cleanup fixes, and the
16-screen `apps/app` build.

## Decisions made and why

- **Committed the entire milestone in five logical commits** (`bb69bb8..caf3d78`) — all 81 files were
  uncommitted working-tree state on a branch whose HEAD was a contract commit; loss risk outweighed
  any commit-message perfectionism.
- **Deleted the worktree's untracked `scripts/phase6-sepolia.ts` + `.env.example`** without asking:
  the script copy was a stale pre-fix version and `.env.example` byte-identical to the contract
  branch's tracked copy; both return canonical via the upcoming merge.
- **`pnpm-workspace.yaml`: `allowBuilds` → `onlyBuiltDependencies`** — the former is not a documented
  pnpm field; builds only succeeded because esbuild ships binaries as optional deps. Documented form
  protects AC4's fresh-clone clause.
- **Accepted the simplifier's 24-line trim** including barrel exports `apps/app` may later re-need
  (`useOnceVisible`, `Redact`, …) — re-exporting at first real point of use beats keeping dead surface.
- **Contract scaffolding retirement deferred to a pre-submission pass** (Abu's explicit 2026-08-01
  choice): deleting `phase6:*`/spikes now would violate SPEC R1 while remote CI observation is pending.
- **Verdict is Conditional pass, not Pass** — `apps/app` and R6 are unbuilt; certifying the full SPEC
  now would be dishonest.

## Artifacts

- Verification report: `.thoughts/verification/2026-08-01-frontend-landing-docs-checkpoint.md`
- Approved execution plan: `/Users/abu/.claude/plans/phase-6-is-complete-vast-thompson.md`
- SPEC: `SPEC.md` · Design contract: `DESIGN.md` (provisional pass 1)
- Milestone authorization: `.thoughts/decisions/2026-08-01-frontend-milestone-authorization.md`
- Phase 6 live evidence (contract branch): `deployments/sepolia/phase6-live.json` @ `codex/confidential-voting-research`

## Current state

- Branch `frontend/noxvote-apps` @ `ddd2391` — checkpoint commit `3321b6c` plus the completed merge of
  `codex/confidential-voting-research` (`0f205c4`). Working tree clean.
- Landing + docs + `packages/ui` built and verified; post-merge re-prove passed: `pnpm install` clean,
  both apps build green, `forge test` 119/119.
- `deployments/sepolia/phase6-live.json` (12 live addresses, both proofs) is now ON this branch.
  Merge conflicts were resolved newest-truth-per-fact: Phase 6 status from the contract side,
  ORBIT/frontend/NoxVote facts from this side (`CURRENT.md`, `AGENTS.md`, `README.md`,
  phase6 authorization + contract plan docs).
- `apps/app` does not exist yet — that is the remaining scope.

## Commands to resume

```bash
cd /Users/abu/dev/hackathon/wtf/.claude/worktrees/frontend-noxvote
# Phase 0 is complete. Resume at Phase 1 (cleanup fixes) then Phase 2 (apps/app foundation)
# per the approved plan: /Users/abu/.claude/plans/phase-6-is-complete-vast-thompson.md
pnpm install && pnpm -r --filter "./apps/*" build && forge test   # sanity: all green as of ddd2391
```

## Known risks and open items

- Merge overlap possible in `README.md`, `AGENTS.md`, `.thoughts/decisions/CURRENT.md`,
  root `package.json` — resolve keeping both tracks.
- Local demo profile has no self-discoverable addresses (integration test deploys fresh per run via
  node-only APIs) — `apps/app` ships an honest "local stack not configured" state; a dev helper
  emitting `deployments/local.json` would touch the frozen contract track → ask Abu first.
- Docs deps `isbot`/`@react-router/node` look unused but removal isn't build-verifiable — left alone.
- DESIGN.md acceptance is provisional; Abu reviews in detail at batch B1.

## Next steps

1. ~~Merge `codex/confidential-voting-research`~~ — DONE (`ddd2391`), re-proven green.
2. Apply the five cleanup fixes (stagger hook/timer leak, docs brand/Mark imports, hero `var(--canvas)`,
   docs home tokens, `@noxvote/ui` CSS exports map).
3. Build `apps/app` foundation (config module, wagmi, ABIs, state selectors, QueryBoundary convention).
4. Screen batches B1–B6, design-auditor after each; Abu's detailed design review at B1.
5. Full SPEC verification (AC1–AC5) and cycle close.
