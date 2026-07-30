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
  `.thoughts/decisions/2026-07-30-contract-implementation-authorization.md` (untracked). Testnet,
  frontend, funded infrastructure, publishing, and submission claims are not authorized.
- **Phases 1–4 are complete and Phase 5 is in progress**, per CURRENT.md resolved facts 20–33.
- **The full Forge suite is GREEN at 115/115** (`forge test`, run 2026-07-31, 20 suites, 0 failed).
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
- **The matrix found and closed a production binding defect.** Reusing the same valid wallet/core input
  proofs across two same-core proposals originally produced the same deterministic verdict handle. The
  tally graph now adds a ballot-ID-derived encrypted zero before quorum comparison, preserving plaintext
  semantics while binding every downstream handle to the ballot's chain/core/host/proposal/config
  domain. Safe and Governor factory creation-code pins were updated accordingly.
- **Static and build gates pass now**: `pnpm lint:forge` exit 0, `npx tsc --noEmit` exit 0,
  `forge fmt --check` clean. `prettier --check` fails on exactly the eight historical 2026-07-29
  Markdown files already recorded as known-red in CURRENT.md fact 29 — no new formatting debt.
- **Production bytecode changed only along the core-embedding path.** Current sizes are
  `ConfidentialBallotCore` 12,908 runtime / 13,515 initcode, `SafeConfidentialVotingModule` 5,523 /
  19,685, `ConfidentialGovernor` 18,220 / 34,823, and `ConfidentialGovernanceFactory` 5,731 / 9,424.
  Every deployable remains below the active size targets.
- **Production source imports no spike code.** `grep -rn "spike" src/contracts/` returns nothing,
  satisfying that verification-checkpoint item.
- **The pass began with the full production implementation uncommitted.** `HEAD` was `59b87e6` ("Add
  bounded local feasibility spike workspace"), and the user explicitly asked for all accumulated work
  to be committed. The delivery is therefore split into separately reviewable toolchain, core, Safe,
  Governor, factory, verification, and context boundaries under the quality profile's commit policy;
  the toolchain ships with the core boundary.

## Current Shape

Phase 5 ("Security, Failure Recovery, And Release Evidence") has the combined invariant suite complete
locally (3 properties + 1 setup assertion, `ConfidentialGovernanceInvariantTest`, 10,000 runs and
960,000 calls under `FOUNDRY_PROFILE=invariant`) and the proof-negative matrix complete locally. The
matrix's production graph change is not integration-complete until the released Docker stack reruns.
Still unrun for Phase 5 are repeated cold/warm real-Nox timing, refreshed Safe direct/batch and Governor
queue/execute gas, Runner restart, JetStream redelivery, and the Phase 5 verification audit.
`.thoughts/verification/` contains only `2026-07-30-full-shape-spike-report.md`.

## Genuine Unknowns

1. **Whether the changed ballot-domain graph passes the real stack.** `pnpm test:integration` was
   attempted, but the Nox plugin could not connect to the Docker daemon. All nine cases stopped during
   environment setup before a contract path ran, and cleanup completed.
2. **Which design-ownership decision is active.** Two divergent decision records exist (below).
3. **Fresh Phase 5 timing and gas.** No refreshed gas snapshot or repeated cold/warm timing exists for
   the ballot-domain graph yet.

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
- Solar cannot parse Nox's Solidity 0.8.35 `erc7201(...)` builtin, so twelve test/fixture files
  including the new matrix test sit in the `lint:forge` skip list; all remain compiled and executed.
- Node 25 is outside the declared `>=22 <25` engine range (`node -v` reports `v25.9.0`;
  `package.json:8` declares `"node": ">=22 <25"`).

## Next Authorized Action

Under the accepted plan the contract track continues locally with Phase 5. The next contract action is
the released Docker-backed rerun once Docker is made available; repository rules prohibit diagnosing or
starting it without a separate request. The design-ownership conflict between the two branches is a real
divergence in the canonical decision record and needs Abu's direction, not an inferred merge. Frontend
implementation, testnet deployment, funded infrastructure, publishing, and submission claims remain
unauthorized.

## Sources

- `/Users/abu/dev/hackathon/wtf/.thoughts/decisions/CURRENT.md`
- `/Users/abu/dev/hackathon/wtf/AGENTS.md`
- `/Users/abu/dev/hackathon/wtf/.thoughts/plans/2026-07-30-confidential-governance-contract-implementation-plan.md` (Phase 5, lines 795–861)
- `/Users/abu/dev/hackathon/wtf/.thoughts/quality/2026-07-30-contract-quality-profile.md`
- `/Users/abu/dev/hackathon/wtf/test/foundry/production/ConfidentialBallotProofNegativeMatrix.t.sol`
- `git show design/ui:.thoughts/decisions/CURRENT.md`; `git show design/ui:.thoughts/design/2026-07-30-direction-return-audit.md`
- Commands run across the orientation and implementation passes: `forge test`,
  `FOUNDRY_PROFILE=invariant forge test`, `forge build --sizes --skip test`, `pnpm build`,
  `pnpm lint:forge`, `pnpm exec tsc --noEmit`, `forge fmt --check`, `prettier --check`,
  `pnpm test:integration`, and `git worktree list`.
