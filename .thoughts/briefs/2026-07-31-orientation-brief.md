# Brief: Confidential Governance Contract Track — State At 2026-07-31

Facts only. No proposals. Written by an orientation pass that read the artifacts and ran the suites.

## Objective

Establish what is already true on `codex/confidential-voting-research` before the next bounded slice,
and identify what is genuinely unknown or drifted.

## Already True

- **Product decision is settled and accepted.** `.thoughts/decisions/CURRENT.md` records the accepted
  product definition, trust boundaries, claim boundary, participation rule, and governance rule.
  Host-neutral confidential ballot core + Safe execution adapter + compatible OpenZeppelin Governor
  counting adapter.
- **Contract implementation is authorized locally.**
  `.thoughts/decisions/2026-07-30-contract-implementation-authorization.md` is committed. Testnet,
  frontend, funded infrastructure, publishing, and submission claims are not authorized.
- **Phases 1–5 are complete for the authorized local contract gate**, per CURRENT.md resolved facts
  20–35. Phase 6 remains blocked on explicit live-action authorization.
- **The full Forge suite is GREEN at 119/119** (`forge test`, run 2026-07-31, 22 suites, 0 failed).
  CURRENT.md and the other active routing artifacts are now reconciled to that result.
- **The cross-proposal/cross-host/cross-chain proof-negative matrix is implemented and passing.**
  `test/foundry/production/ConfidentialBallotProofNegativeMatrix.t.sol` (268 lines) holds exactly five
  focused tests:
  `testRejectsCompleteLocalVerdictProofMatrixWithoutMutation`,
  `testRejectsVerdictProofAcrossProposalsWithoutMutation`,
  `testRejectsVerdictProofAcrossHostsWithoutMutation`,
  `testRejectsVerdictProofAcrossChainsWithoutMutation`,
  `testRejectsInputProofAcrossHostsAndChainsWithoutRecording`.
  Each negative asserts non-mutation (state stays `TallyPending`, `Result.None`, unchanged expected
  verdict handle, or an unrecorded receipt with `recordedVoters == 0`) and then proves the correct proof
  still finalizes. The proposal and host cases deliberately reuse identical encrypted handles rather
  than relying on Gateway randomness.
- **The matrix proves production ballot-domain handle separation.** Reusing the same valid wallet/core
  input proofs across two same-core proposals still produces distinct deterministic verdict handles.
  The tally graph adds a ballot-ID-derived encrypted zero before quorum comparison, preserving
  plaintext semantics while binding every downstream handle to the ballot's
  chain/core/host/proposal/config domain. Independent Git review established that this construction
  was already present in the first committed production core; the earlier post-hoc RED/fix/repin
  chronology was unsupported.
- **Static and build gates pass now**: `pnpm lint:forge` exit 0, `npx tsc --noEmit` exit 0,
  `forge fmt --check` clean. The eight historical 2026-07-29 Markdown files recorded as known-red in
  CURRENT.md fact 29 are now explicit `.prettierignore` baseline entries, so current work remains
  repository-wide checkable without rewriting preserved research.
- **Production bytecode changed only along the core-embedding path.** Current sizes are
  `ConfidentialBallotCore` 12,908 runtime / 13,515 initcode, `SafeConfidentialVotingModule` 5,523 /
  19,685, `ConfidentialGovernor` 18,220 / 34,823, and `ConfidentialGovernanceFactory` 5,731 / 9,424.
  Every deployable remains below the active size targets.
- **Production source imports no spike code.** `grep -rn "spike" src/contracts/` returns nothing,
  satisfying that verification-checkpoint item.
- **The orientation pass began with the full production implementation uncommitted.** That work was
  subsequently delivered as the separately reviewable toolchain, core, Safe, Governor, factory,
  verification, and context commits now preceding review baseline `9bcf601`.

## Current Shape

Phase 5 ("Security, Failure Recovery, And Release Evidence") is complete for the authorized local
contract gate. The combined invariant suite passes 10,000 runs and 960,000 calls; the complete
proof-negative matrix passes; three expanded released-Nox repetitions pass 33/33 cases total with
factory-deployed production Safe direct/batch, factory-deployed production Governor/real-Timelock,
production-core adversarial proof rejection, Runner restart, JetStream redelivery, and cleanup; and
four deterministic Safe/Governor gas baselines enforce the quality profile's 20% regression ceiling.
`.thoughts/verification/2026-07-31-production-contract-verification-audit.md` records traceability,
measurements, manual ACL/action review, deviations, external trust, and all unrun live/UI behavior.
An independent Claude Opus 5 review found no P0/P1 Solidity defect, and the resulting five-job contract
workflow is installed but has not yet run on a remote GitHub runner.

## Genuine Unknowns

1. **Which design-ownership decision is active.** Two divergent decision records exist (below).
2. **Live Phase 6 behavior.** Sepolia addresses, accounts, funding, deployment, transactions, gas,
   latency, and explorer evidence remain unauthorized and NOT RUN.
3. **Larger-electorate behavior.** The verified graph remains bounded to four eligible wallets and a
   privacy floor of four.

## Constraints Discovered

- **Branch divergence on the canonical decision record.** `design/ui` (worktree
  `/Users/abu/dev/hackathon/worktrees/wtf-design`, clean, HEAD `df0d683`) forks from the same base
  `59b87e6` and carries its **own** `.thoughts/decisions/CURRENT.md`. That copy records
  `Design ownership: IN_REPO_TASTE as of 2026-07-30, explicitly assigned by the user` to the in-repo
  design session, citing `.thoughts/decisions/2026-07-30-design-ownership-in-repo.md`. The contract
  branch's CURRENT.md still says `EXTERNAL_COMMISSION` with an external designer. Conversely, the
  design branch's contract gate is stale ("Review the contract-only implementation plan"). Each branch
  is newer than the other on a different axis; neither is wholly authoritative.
- `design/ui` also carries `design-lab/{ledger,chamber,boundary}/` — three browser-verified direction
  candidates with real webfonts and renders — plus
  `.thoughts/design/2026-07-30-direction-return-audit.md`, a fresh-context audit whose contract verdict
  is **GREEN (all three), no BLOCKERs, three PASS-WITH-FINDINGS** (two MAJOR, several MINOR).
  That audit records **Abu's taste decision as PENDING**.
- Slither is removed from project requirements by explicit user direction; it must not be run or
  treated as a gate (AGENTS.md, quality profile line 146).
- Solar cannot parse Nox's Solidity 0.8.35 `erc7201(...)` builtin, so the concrete Nox test/fixture files
  including the new matrix test sit in the `lint:forge` skip list; all remain compiled and executed.
- Node 25 is outside the declared `>=22 <25` engine range (`node -v` reports `v25.9.0`;
  `package.json:8` declares `"node": ">=22 <25"`).

## Next Authorized Action

No further contract phase is authorized automatically. Phase 6 requires Abu's explicit approval of
accounts, funding, deployment, and external transactions plus same-day official-address verification.
The design-ownership conflict between the two branches is a real divergence in the canonical decision
record and needs Abu's direction, not an inferred merge. Frontend implementation, testnet deployment,
funded infrastructure, publishing, and submission claims remain unauthorized. The installed contract
workflow still needs a remote-run observation before CI can be called green; it does not replace the
recorded local real-Nox passes.

## Sources

- `/Users/abu/dev/hackathon/wtf/.thoughts/decisions/CURRENT.md`
- `/Users/abu/dev/hackathon/wtf/AGENTS.md`
- `/Users/abu/dev/hackathon/wtf/.thoughts/plans/2026-07-30-confidential-governance-contract-implementation-plan.md` (Phase 5, lines 795–861)
- `/Users/abu/dev/hackathon/wtf/.thoughts/quality/2026-07-30-contract-quality-profile.md`
- `/Users/abu/dev/hackathon/wtf/.thoughts/verification/2026-07-31-production-contract-verification-audit.md`
- `/Users/abu/dev/hackathon/wtf/test/foundry/production/ConfidentialBallotProofNegativeMatrix.t.sol`
- `git show design/ui:.thoughts/decisions/CURRENT.md`; `git show design/ui:.thoughts/design/2026-07-30-direction-return-audit.md`
- Commands run across the orientation and implementation passes: `forge test`,
  `FOUNDRY_PROFILE=invariant forge test`, `forge build --sizes --skip test`, `pnpm build`,
  `pnpm lint:forge`, `pnpm exec tsc --noEmit`, `forge fmt --check`, `prettier --check`,
  `pnpm test:integration`, and `git worktree list`.
