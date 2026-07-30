# Verification Audit: Full-Shape Confidential Governance Feasibility Spike

**Date:** 2026-07-30  
**Gate audited:** Bounded local feasibility spike; not production architecture approval  
**Verdict:** **PASS for the bounded local technical gate.** The product-shaped Nox-to-Safe path, real
JetStream redelivery, full public-proof negative matrix, and Nox-to-Governor-to-Timelock path all pass
with released packages. This is not production architecture approval: UI/product implementation,
testnet behavior, scale bounds, and deployment remain NOT RUN or unauthorized.

## Verdict

The strongest uncertainties are resolved: released Nox can execute a real unequal-weight,
For/Against/Abstain graph with a canonical Abstain, a non-canonical input normalized to Abstain, and two
accepted replacements; publicly decrypt only one derived boolean; validate the Gateway evidence
on-chain; drive one exact action through a real, owner-enabled Safe module; survive both Runner
restart and explicit JetStream negative-acknowledgement redelivery; reject the complete named public
proof matrix; and feed a compatible OpenZeppelin Governor through its real timelock.

That closes the bounded local feasibility gate. It does not authorize calling the product finished or
promoting these spike contracts directly into production architecture. Product/UI requirements that
were outside this technical gate remain PARTIAL or NOT RUN. Ethereum Sepolia, funded infrastructure,
deployment, publishing, and submission claims remain unauthorized and NOT RUN.

## Artifacts Checked

- Authority: `../decisions/CURRENT.md`
- Plan: `../plans/2026-07-30-full-shape-feasibility-spike.md`
- Product spec: `../specs/2026-07-29-confidential-governance-module.md`
- Stories: `../stories/2026-07-29-confidential-governance-module.md`
- Fable proof obligations: `../reviews/2026-07-30-fable-5-product-review.md`
- Source/version manifest: `../sources/source-manifest.md`
- Nox/Safe spike contract: `../../src/spike/ConfidentialGovernanceSpike.sol`
- Real Safe action fixture: `../../src/spike/SafeSpikeFixtures.sol`
- Governor cast-surface probe: `../../src/spike/GovernorCompatibilityProbe.sol`
- Governor/Nox/timelock spike: `../../src/spike/ConfidentialGovernorTimelockSpike.sol`
- OpenZeppelin timelock constructor fixture: `../../src/spike/GovernorTimelockFixtures.sol`
- Foundry state tests: `../../test/foundry/ConfidentialGovernanceSpike.t.sol`
- Foundry Governor tests: `../../test/foundry/GovernorCompatibilityProbe.t.sol`
- Real Nox/Safe integration: `../../test/integration/confidential-governance.test.ts`
- Real Nox/Governor/timelock integration: `../../test/integration/governor-timelock.test.ts`
- Released-stack smoke proof: `../../test/integration/stack.test.ts`

No project quality profile exists. The accepted local risk standard is the spec's no-mock rule plus
the plan's explicit proof obligations. UI/design verification is outside this technical spike and is
therefore NOT RUN, not waived as product work.

## What The Real Test Does

The main integration test starts the plugin-shipped RPC relay, Handle Gateway, KMS, Runner, NATS, S3,
and Ingestor against the released `NoxCompute` contract. It then:

1. deploys the official Safe 1.5.0 singleton and proxy artifacts;
2. initializes a one-owner/one-threshold Safe with no module;
3. submits a normal 1-of-1 Safe owner transaction that enables the governance module;
4. creates one proposal with public weights `5, 3, 2, 1`, privacy floor `4`, and governance quorum
   `11`;
5. records `Against(5)`, `Against(3)`, canonical `Abstain(2)`, and non-canonical `65535(1)`;
6. replaces the first ballot `Against(5) → Abstain(5) → For(5)` using sequences 1, 2, and 3;
7. closes to the effective encrypted tally `For=5, Against=3, Abstain=3` without decrypting those
   totals;
8. derives `quorum reached AND For > Against`, marks only that boolean verdict public, obtains the real
   Gateway proof, and finalizes Passed;
9. rejects modified target, value, and calldata, then executes the exact call once through
   `execTransactionFromModule(Call)`; and
10. proves the Safe owner-transaction nonce does not move during module execution and rejects replay.

The Passed result is sensitive to both replacement and normalization. If old 5-weight contributions
remain, For does not beat Against. If the non-canonical 1-weight input does not normalize to Abstain,
the total is below the committed quorum of 11.

## Requirement Traceability

| Requirement                      | Status                      | Evidence and limitation                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 host adapters                 | PASS (bounded local)        | Official Safe path passes. A new/custom OZ Governor binds its action to the Nox tally, maps async state explicitly, and preserves real queue/timelock execution. The fixture uses explicit fixed weights; production IVotes snapshot sourcing remains architecture work. Arbitrary immutable Governors remain unsupported. |
| R2 immutable proposal commitment | PARTIAL                     | Action, deadline, snapshot weights, floor, and quorum are immutable locally. Product metadata, scheduling, organization bounds, and UI acknowledgement are outside the spike.                                                                                                                                              |
| R3 eligibility and fixed weight  | PASS (local)                | Proposal-scoped allowlist/weights, ineligible rejection, one effective ballot, and public replacement sequence are tested.                                                                                                                                                                                                 |
| R4 confidential preparation      | PASS (local)                | Real Gateway inputs and `fromExternal(euint16)` are used; owner mismatch rejects; every value has a tally meaning; no viewer method exists. The Gateway still sees plaintext by design.                                                                                                                                    |
| R5 cast and replace              | PARTIAL                     | Two replacements, stale sequence rejection, and newest-operation lookup pass. Product async status UX is not implemented.                                                                                                                                                                                                  |
| R6 no running result             | PASS (contract)             | Public surface exposes participation and opaque handles, never plaintext support or option totals. UI is NOT RUN.                                                                                                                                                                                                          |
| R7 privacy floor                 | PASS (local)                | Unique Recorded wallets count once; both above-floor and below-floor branches pass; below floor creates no verdict handle.                                                                                                                                                                                                 |
| R8 async close and tally         | PARTIAL                     | `Open → TallyRequested → Finalized → Executed` and Withheld are real. Closed/Computing/Proof-ready/timeout/recovery product states are not implemented.                                                                                                                                                                    |
| R9 verdict-only disclosure       | PASS (local)                | Exact stored boolean handle and the full named signer/domain/handle/type/length/state/replay matrix pass against the released verifier.                                                                                                                                                                                    |
| R10 exact execution              | PASS (local)                | Safe exact action/execute-once and Governor exact action/real timelock pass. Mismatches, replay, and execution before timelock expiry reject.                                                                                                                                                                              |
| R11 verification center          | PARTIAL                     | Contract getters/events expose commitments, sequences, handles, verdict, and execution evidence. User-facing verification view is NOT RUN.                                                                                                                                                                                 |
| R12 trust disclosure             | PASS (corpus), NOT RUN (UI) | Active documents state Gateway plaintext visibility, single KMS, public participation, and no receipt-freeness. No screen was built.                                                                                                                                                                                       |
| R13 failure and recovery         | PARTIAL                     | Wrong owner, stale sequence, full proof negatives, action mismatch, replays, Runner restart, and explicit JetStream NAK redelivery pass. Product timeout/retry policy and UI are NOT RUN.                                                                                                                                  |
| R14 proposal-level UX            | NOT RUN                     | This was a technical spike, not frontend implementation.                                                                                                                                                                                                                                                                   |

## Acceptance Criteria Coverage

| AC   | Status                        | Evidence                                                                                                                                                                                                                                                      |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | PASS (local)                  | For, Against, canonical Abstain, and non-canonical input all use opaque handle/proof calldata; contract events contain no support value.                                                                                                                      |
| AC2  | PASS (local)                  | Sixty enumerated ballot/intermediate handles remain non-public; zero `ViewerAdded` events originate from the module; exactly one verdict is public.                                                                                                           |
| AC3  | PASS (local)                  | One voter reaches sequence 3 after two accepted replacements and counts once with one final 5-weight contribution.                                                                                                                                            |
| AC4  | PASS (local)                  | Non-canonical weight is required for quorum; stale duplicate sequence rejects before touching Nox.                                                                                                                                                            |
| AC5  | PASS (contract), NOT RUN (UI) | No plaintext count getter or event exists; only opaque handles are inspectable.                                                                                                                                                                               |
| AC6  | PASS (local)                  | Below-floor close reaches Withheld with four zero handles and no public verdict permission.                                                                                                                                                                   |
| AC7  | PASS (local)                  | Stored handle binding, boolean decoding, wrong signer/domain/handle/type/length, early/wrong state, mutation, and duplicate finalization all reject independently.                                                                                            |
| AC8  | PASS (local)                  | Only a finalized Passed proposal reaches exact Safe execution; Withheld/pending and mismatched/replay paths reject.                                                                                                                                           |
| AC9  | PARTIAL                       | Real released local Nox operation, proof, and Safe transition pass. The required real testnet portion is NOT RUN.                                                                                                                                             |
| AC10 | NOT RUN                       | UI state presentation is outside this spike.                                                                                                                                                                                                                  |
| AC11 | PARTIAL                       | `getBallot` returns newest sequence and opaque operation state; retry/replacement UI is NOT RUN.                                                                                                                                                              |
| AC12 | PARTIAL                       | Public contract evidence is reconstructable; verification-center UI is NOT RUN.                                                                                                                                                                               |
| AC13 | PASS (corpus), NOT RUN (UI)   | Claim boundary is documented; screens are not built.                                                                                                                                                                                                          |
| AC14 | PASS (corpus), NOT RUN (UI)   | KMS/Gateway limitations are documented; pre-publication/live-proposal placement is not built.                                                                                                                                                                 |
| AC15 | PASS (local)                  | Official Safe is initialized, module is enabled through a normal 1-of-1 owner transaction, exact action executes once, mismatches/replay reject.                                                                                                              |
| AC16 | PASS (local)                  | All five standard plaintext cast entrypoints and both internal `_castVote` routes are disabled. A real Nox verdict moves the custom Governor through Succeeded, Queued, timelock-delayed execution, and Executed; Withheld maps to Defeated and cannot queue. |

## Fable Proof Obligations

| Proof                          | Status               | Result                                                                                                                                                                                  |
| ------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 full real chain             | PASS (local)         | Full product-shaped Nox-to-Safe chain passes without a protocol mock.                                                                                                                   |
| P2 latency and gas             | PASS (bounded local) | Fourteen identical Nox graphs complete well inside four minutes with gas recorded. Cold Docker image download, larger electorates, and live networks remain outside this bounded claim. |
| P3 determinism and recovery    | PASS (local)         | Stale sequence rejects; Runner restart preserves the queued handle; an explicit JetStream `-NAK` delivers the same tally message twice and resolves deterministically.                  |
| P4 evidence negatives          | PASS (local)         | Owner, signer, domain, handle, type/length, boolean encoding, state, mutation, stale sequence, duplicate finalization, and execution replay negatives pass.                             |
| P5 privacy invariant           | PASS (local)         | Sixty private handles checked, zero module viewer events, one verdict public; below-floor verdict remains zero.                                                                         |
| P6 Safe least authority        | PASS (local)         | Owner-enabled official Safe, exact target/value/calldata, execute-once, and nonce independence pass.                                                                                    |
| P7 privacy floor               | PASS (local)         | Both branches observed under the selected Recorded-wallet rule.                                                                                                                         |
| P8 Governor compatibility gate | PASS (local)         | Cast surface is closed; unresolved ended proposals map to standard Pending plus detailed TallyPending; accepted verdicts preserve real OZ queue/timelock execution.                     |

## Measurements

Fixture: four voters, unequal weights, six accepted ballot operations, two replacements, one canonical
Abstain, one non-canonical normalization, official Safe deployment/enablement/execution, and the real
local Nox stack. Docker images were warm; one of the fourteen repetitions included Solidity compilation.

| Measurement                                            |                         Observed |
| ------------------------------------------------------ | -------------------------------: |
| Full test critical-path elapsed, 14 runs               | 11.931–17.800 s; median 12.355 s |
| Close transaction through proof ready, 14 runs         |        560–779 ms; median 664 ms |
| Queued graph through Runner stop/restart recovery test |                    4.258–4.873 s |
| Explicit JetStream NAK/redelivery test                 |                    5.276–5.865 s |
| Nox verdict through Governor queue/timelock execution  |          251–685 ms in warm runs |
| First ballot gas                                       |                  810,624–810,636 |
| Other first-ballot gas                                 |             767,748–767,784 each |
| Replacement gas                                        |             721,279–721,315 each |
| Close/tally request gas                                |                          560,368 |
| Finalize gas                                           |                    73,187–73,211 |
| Safe module execution gas                              |                           99,445 |
| Private handles explicitly checked                     |                               60 |
| Module `ViewerAdded` events                            |                                0 |
| Module public-decryption events                        |          1, exact verdict handle |

These are local-development measurements, not Sepolia estimates. The close-to-proof value is fast in
this fixture because prior ballot dependency work may already be resolved by the Runner before close.
It must not be generalized to cold services, larger electorates, or a congested live network.

## Governor Compatibility Finding

OpenZeppelin Contracts 5.6.1 makes the five standard public casting methods and both `_castVote`
overloads virtual. The compile/test probe overrides every public route and both internal routes to
revert, so no supported standard path can reach `_countVote` or emit `VoteCast`/`VoteCastWithParams`.

The structural boundary remains real: standard `Governor.state()` calls `_quorumReached` and
`_voteSucceeded` synchronously once `proposalDeadline` passes, while released Nox may still be
computing, and `IGovernor.ProposalState` has no TallyPending or ProofReady value. The spike now proves
one explicit compatibility rule:

- an ended unresolved proposal maps to standard `Pending` so it cannot queue early;
- `confidentialState()` exposes the truthful detailed `TallyPending` state;
- the linked Nox tally enforces its deadline independently of the standard enum mapping;
- `_quorumReached/_voteSucceeded` become true only after an accepted Passed proof;
- a Passed proposal becomes standard `Succeeded`, queues through the real `TimelockController`, rejects
  early execution, and executes the exact committed action after the delay; and
- a below-floor tally becomes detailed `Withheld`, standard `Defeated`, and cannot queue.

Third-party Governor tools may still display `Pending` after the public deadline unless they consume
the detailed getter. This supports a new or deliberately upgradeable compatible Governor, not a
drop-in module for arbitrary immutable Governors. The spike proves one action; production architecture
must preserve the same binding for normal Governor action batches. The spike also accepts explicit
fixed voter/weight arrays; production architecture must derive or verify those against the compatible
host's committed snapshot rather than trusting proposer-supplied weights.

## Quality Gates

| Command                               | Result                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| `mise exec -- pnpm build`             | PASS: Forge and Hardhat compile Solidity 0.8.35 sources         |
| `mise exec -- pnpm exec tsc --noEmit` | PASS                                                            |
| `mise exec -- pnpm test:forge`        | PASS: 11/11 Solidity tests                                      |
| `mise exec -- pnpm test:integration`  | PASS: 19 total (11 Solidity + 8 Node) with real local Nox stack |

Compiler warnings come from OpenZeppelin identifiers that a future Solidity release may reserve,
expected unreachable base code after the deliberate `_castVote` override, and Foundry timestamp lint
on explicit proposal-deadline comparisons. No warning changed the observed test result.

## Deviations From Plan

1. `nox-hardhat-plugin@0.2.0` passes a two-variable environment to `docker-compose`, dropping `PATH` and
   causing `spawn docker ENOENT`. `hardhat.config.ts` augments the plugin's runtime Compose environment
   without patching dependency files. This is a bounded but brittle consumer workaround.
2. `@iexec-nox/handle@0.1.0-beta.13` derives input owner from `getAddresses()[0]` rather than the
   account-bound Viem client's `account`. Hardhat clients return all node accounts, so the test scopes
   `getAddresses()` to the actual submitting wallet. Without this, real Nox correctly rejects the
   proof as Owner mismatch.
3. The spike exceeded the plan's minimum one replacement and proves two accepted replacements because
   AC3 requires that stronger case.
4. The official Safe singleton/proxy use the package's released build artifacts. The module is enabled
   after initialization through a real Safe owner transaction, not through a fake Safe or initializer
   shortcut.
5. Phase 4 now uses the NATS core protocol from inside the shipped container to pull the real durable
   consumer message, publish `-NAK` to its ACK subject, and assert the consumer delivery sequence moves
   twice before the Runner acknowledges the deterministic result. No dependency file is patched.
6. The Governor proof chooses standard `Pending` during the post-deadline async gap and exposes
   `TallyPending` separately. The proof contract supports one action to keep this bounded; that is not a
   product decision to remove Governor action batches. It uses explicit fixed voter/weight arrays and
   does not claim that the production IVotes snapshot bridge is already implemented.

## Gaps And Risks

### Bounded local gate closure

No named P1–P8 local proof obligation remains open. This does not resolve production architecture,
frontend behavior, organization policy, larger-electorate bounds, or live-network operations.

### Blocking before any live/testnet claim

- Explicit user authorization for deployment, account/funding use, and live evidence.
- Real configured Nox testnet and host state transition.
- Cold-stack and live latency/gas measurements.
- A testnet-safe operational/status/indexing strategy; an on-chain transaction currently records the
  scheduled confidential operation before separately proving Runner completion.

### Product work still intentionally absent

- Frontend, proposal-level toggle, operation tracker, verification center, status recovery UX, and
  trust disclosures in screens.
- Organization hard minimum/default privacy floor and electorate-size policy.
- Production authorization, audit, upgrade, cancellation, retry, and administrative boundaries.
- Production Safe/Governor snapshot derivation and multi-action Governor binding.

## Follow-ups

1. Review the complete product definition, feature set, user flow, trust claims, and proven design laws
   with the user.
2. If accepted, turn the spike laws into an architecture/design document, including multi-action
   Governor binding and product timeout/retry policy. Do not promote the spike contract itself.
3. Treat frontend/product implementation as a later authorization gate, not as evidence supplied by
   this technical spike.
4. Return separately for any deployment/testnet, funded-resource, or public-claim authorization; local
   PASS never grants it automatically.

## Evidence Log

- Repeated real-stack output: 19 passing tests in the final suite; Nox RPC relay, released NoxCompute, and shipped
  off-chain stack started and cleaned successfully.
- Latest full run: main critical path 12.325 s; close-to-proof 560 ms; ballot gas
  `810636, 767772, 767772, 767772, 721315, 721303`; close `560368`; finalize `73211`; execute `99445`.
  Runner recovery passed in 4.464 s, explicit JetStream NAK redelivery in 5.832 s, and the real
  Governor/timelock path in 685 ms.
- Thirteen preceding identical Nox-graph runs plus the latest produced the ranges in the measurement table;
  three recorded repetitions were `12.250 s`, `11.931 s`, and `12.502 s`, with close-to-proof
  `685 ms`, `672 ms`, and `604 ms`.
- No external deployment, transaction, credential, paid resource, commit, or public publication was
  created by this spike.
