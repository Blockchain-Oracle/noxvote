# Claude Opus 5 Phase 6 Runner Review

## Scope

An independent Claude Opus 5 review inspected the uncommitted Ethereum Sepolia runner,
`package.json`, `.env.example`, the accepted contract plan, the production verification audit, and
the live authorization. The review was read-only: it did not edit files, inspect credentials, sign,
fund, deploy, run Slither, or make a product claim.

## Initial Verdict

The initial review found no P0 and no Solidity defect. It confirmed that the proposal-ID and Merkle
derivations, factory creation-code binding, Safe execution encoding, Governor clock separation, Nox
Handle SDK use, and credential persistence boundary matched the reviewed contracts.

It returned a transaction **NO-GO** because of one P1 runner-liveness risk: the Safe proof used a
fixed 180-second voting window while encrypting and confirming four votes sequentially. A closed,
partially cast ballot could not resume without manually editing evidence. It also identified P2
hardening needs around `.env` loading, the funding floor, crash-time checkpoint gaps, and the
deterministic Safe salt.

## Remediation

The runner now:

- uses a 600-second Safe window and a 60-block Governor period;
- prepares outstanding encrypted inputs before waiting for the on-chain voting window;
- checks recorded receipts on-chain before every cast;
- preserves incomplete expired proofs and automatically creates attempt-scoped replacement
  proposals for both Safe and Governor paths;
- scopes every proposal transaction key by host and attempt;
- checks on-chain ballot/proposal/target state before tally, finalization, queue, or execution resume;
- derives the Safe salt from a checkpointed per-run ID, avoiding clean-run address collisions;
- loads an optional ignored `.env` with Node 24's official `--env-file-if-exists` flag;
- raises the funding gate to `max(current gas budget plus four voter balances, 0.25 Sepolia ETH)`;
- waits for two confirmations and writes evidence atomically through a temporary file;
- pins the full live Nox Gateway signer and one-hour proof lifetime; and
- provides a read-only `pnpm phase6:account` command that reports only public addresses and funding
  state without creating evidence or broadcasting.

Local verification after remediation passes under the pinned Node 24 runtime: TypeScript, live
read-only preflight, account-mode fail-closed/no-write checks, 119/119 Forge tests, high/medium Forge
lint, formatting, and diff checks. The production contracts and bytecode are unchanged. The released
Docker-backed graph remains the fresh 11/11 pass from the same contract checkpoint.

## Follow-Up Review

The focused Opus follow-up found **no P0/P1 and no contract defect**. It confirmed that the historical
fixed-window/resume P1 is structurally resolved by the Safe/Governor expiration recovery,
`abandonedProofs` ledger, fresh attempt path, and mid-cast guards. Its live verdict is **conditional
GO** once the dedicated deployer passes the funding gate and the runner is frozen in a commit.

The remaining findings are operational and recoverable:

- **P2:** a transaction evicted after its hash is checkpointed will time out repeatedly until the
  operator proves it dropped and removes only that transaction key;
- **P3:** a crash after deterministic Safe broadcast but before hash persistence requires recovering
  the original hash rather than blindly replaying the CREATE2 deployment;
- **P3:** the live run should prefer a dedicated RPC and remain topped up because funding and gas
  price are point-in-time observations; and
- **P3:** the package engine range needed to match the pinned Node 24 runtime used for native
  TypeScript execution.

The Sepolia runbook now documents dropped-transaction and Safe-broadcast recovery, recommends a
dedicated RPC, and forbids whole-checkpoint deletion during an ambiguous resume. `package.json` now
requires Node `>=24 <25`, matching `.mise.toml` and the verified runtime. The runner, environment
template, deployment runbook, authorization, and review are frozen together in the contract/deployment
commit. The separately owned frontend `SPEC.md` is intentionally excluded from this review and commit.

## Subsequent Testnet Funding Calibration

After funding the dedicated account, the user explicitly rejected the review's conservative `0.25`
Sepolia ETH reserve. This does not alter the Opus code/security findings above. The operational gate
was narrowed from a blanket reserve to measured actor-scoped budgets: 25 million deployer gas,
3 million gas per voter, and a `0.045` Sepolia ETH floor. Local factory gas reports measured the two
heaviest calls at ~8.7 million gas for the Governor stack and ~4.1 million gas for the Safe
module/core pair. The runner still increases the required balance when the current gas price exceeds
that floor and remains resumable if the testnet balance eventually needs a top-up.
