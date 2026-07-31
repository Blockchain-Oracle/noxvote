# Independent Pre-Deployment Review: Claude Opus 5

## Review Scope

- Reviewer: Claude Opus 5, maximum-effort independent review
- Reviewed commit: `9bcf601`
- Scope: accepted plan, canonical state, production Solidity, Foundry and Docker tests, Git history,
  evidence claims, and Phase 6 preflight readiness
- Excluded: deployment, funding, publishing, submission, frontend implementation, and Slither
- Review mode: read-only

## Original Verdict

**Conditionally ready to enter Phase 6 preflight; not ready to deploy.**

The reviewer found no P0 or P1 code defect. Its independent Forge run passed 119/119, all reviewed
production deployables remained below the accepted size limits, and the security-critical contract
mechanisms were corroborated from source. The deployment blockers were evidence, process, and
documentation gaps rather than a demonstrated Solidity vulnerability.

## Findings

### P0

None. The bounded review found no path to expose an individual ballot, execute a non-Passed or altered
action, execute twice, or queue an unresolved proposal.

### P1

1. **Production-adapter real-stack evidence gap.** At reviewed commit `9bcf601`, the Docker suite ran
   the production `ConfidentialBallotCore`, but Safe and Governor choreography still used spike
   contracts. The production `SafeConfidentialVotingModule`, `ConfidentialGovernor`, real
   `TimelockController`, and factory were proven only under Foundry.
2. **Required CI absent.** The quality profile named four required jobs, but no workflow existed and the
   high-confidence invariant profile was not automated.

### P2

1. **Encrypted-zero chronology was not corroborated by Git.** The first committed production core,
   `7f18524`, already contained the ballot-ID-derived encrypted-zero construction. The later
   RED-to-GREEN and factory-repin narrative did not match committed chronology. The mechanism itself
   was judged correct.
2. **Handle separation is version-fragile.** It depends on released Nox 0.2.4 preserving the
   `add(total, mul(sub(total,total), ballotId))` handle graph rather than algebraically folding it.
3. **Choice encoding was reversed in architecture prose.** Production code and the accepted plan use
   `0 = Against`, `1 = For`, and all other `uint16` values as Abstain; the architecture said the
   opposite.

### P3

- The source manifest still described Slither as a future gate despite the user's explicit removal.
- `IVotesSnapshotStrategy` is a deployed contract whose name resembles an interface.
- The ended-but-unresolved Governor state deliberately projects to standard `Pending`; integrators
  must understand that compatibility caveat.
- Safe execution relies on checks-effects-interactions and execute-once rollback semantics rather than
  `ReentrancyGuard`.
- Gas baselines must be re-established after toolchain changes.
- Scale evidence remains bounded to four eligible wallets and privacy floor four.

## Evidence Classification

### Independently proven by the reviewer

- Forge: 119 passed, 0 failed, 22 suites.
- Runtime sizes: core 12,908 bytes; Safe module 5,523; Governor 18,220; factory 5,731.
- No production import from `src/spike`.
- Production core, Safe, Governor, Timelock, factory, casting, tally, finalization, and execution
  mechanisms matched the accepted design in direct source review.
- The first committed `ConfidentialTallyNox` already contained ballot-domain handle separation.

### Proven in the concurrent local verification

- The then-current Docker suite passed 9/9 under Node 24.18.0 with clean teardown.
- That run proved the released Nox stack, production core, and spike choreography, but did not close the
  production-adapter evidence gap.

### Unrun by the reviewer

- The 10,000-run by 32-depth invariant profile.
- Three consecutive complete Docker repetitions.
- Any Ethereum Sepolia behavior.

## Required Remediation

1. Correct overstated evidence claims, encrypted-zero chronology, choice encoding, and Slither status.
2. Add real-Nox tests for factory-deployed production Safe direct/batch and production
   Governor/real-Timelock execution, plus adversarial real-proof rejection in the production core.
3. Install the required contract CI gate and automate the high-confidence invariant and three-run Nox
   evidence.
4. Keep Nox pinned and retain an explicit handle-separation regression gate.
5. Reverify all live addresses and bytecode immediately before any separately authorized deployment.

## Disposition

The local remediation following this review closes P1-1 and installs the P1-2 workflow:

- the expanded released-stack suite passes 11/11 in three consecutive clean repetitions, 33/33 total;
- the factory-deployed production Safe module consumes real Nox verdicts for both direct and official
  `MultiSendCallOnly` execution;
- the factory-deployed production Governor consumes a real Nox verdict, queues through the real
  `TimelockController`, waits the configured delay, and executes;
- the production core rejects short, mutated, wrong-signer, wrong-domain, wrong-handle,
  malformed-length, and noncanonical-boolean proof evidence before accepting the real proof;
- `.github/workflows/contracts.yml` now defines static, build/unit, invariant, contract-boundary, and
  three-repetition real-Nox jobs, including an exact Nox 0.2.4 pin guard.

The workflow is installed but has not yet been observed on a remote GitHub runner. Ethereum Sepolia,
funding, deployment, frontend, publishing, and submission remain unrun or unauthorized.
