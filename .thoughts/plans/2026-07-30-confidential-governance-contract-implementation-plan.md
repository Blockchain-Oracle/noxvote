# Plan: Confidential Governance Contracts On Nox

**Date:** 2026-07-30  
**Status:** Contract-only implementation plan for review; implementation not authorized  
**UI boundary:** External designer owns visual direction. This plan defines public contract data and
events needed by a later UI but does not choose a frontend stack, layout, component, or visual token.

## Inputs

- Accepted product definition and normal-DAO execution decision.
- Accepted product specification and functional stories.
- Accepted technical architecture and trust/guarantee matrix.
- Current Nox, Safe, OpenZeppelin, MACI, Shutter, and broader private-voting research.
- Passing bounded local proof for the real Nox-to-Safe and Nox-to-Governor/timelock paths.
- Active contract quality profile.
- Current pinned package source plus refreshed Context7 documentation for released Nox, Safe modules,
  and OpenZeppelin Governor 5.x.

The spike under `src/spike` is executable evidence. Production contracts must be new decomposed source
under `src/contracts` and must not import, inherit, or rename the spike as production code.

## Assumptions And Fixed Decisions

1. Safe is the primary judged retrofit; the compatible Governor remains a complete product contract,
   not a deferred idea.
2. A Safe itself must call the bound module to register a proposal, so registration uses a normal Safe
   owner-threshold transaction.
3. The judged electorate is four unequal-weight wallets, privacy floor four, with at most two accepted
   replacements after the initial ballot.
4. Safe action bundles contain only calls. One action uses a direct Safe module `Call`; multiple
   actions use official `MultiSendCallOnly` packed encoding through an outer `DelegateCall` restricted
   to one immutable expected-code-hash contract.
5. The compatible Governor uses its normal `IVotes` clock/snapshot, quorum fraction, proposal hash,
   action arrays, `TimelockController`, and execution path.
6. Choice encoding remains `0 = Against`, `1 = For`, and every other `uint16 = Abstain`.
7. Passage version 1 is fixed: For weight greater than Against weight, with For + Against + Abstain
   counting toward the host-provided governance quorum.
8. The privacy floor is a unique-wallet count and is separate from weighted governance quorum.
9. Recorded operations have no administrative expiry. The expected verdict handle and immutable state
   remain usable whenever the correct proof becomes available.
10. Contracts are non-upgradeable. A new ruleset or dependency set is a new factory/version.
11. Ethereum Sepolia is the planned first live gate, but deployment and funding are blocked pending
    explicit authorization and current address verification.
12. Every deployed adapter/core pair has an immutable organization minimum privacy floor of at least
    four. A proposal may choose a higher floor. Its replacement ceiling must be one or two; the judged
    configuration uses two.

## Open Questions

No contract-design decision is delegated to the implementer. Two external gates remain:

- **Live authorization:** user approval for target accounts, funding, deployment, and external
  transactions.
- **Current deployment inventory:** at that later gate, re-verify Nox, Safe, Gateway, and network
  addresses from official sources immediately before use.

Neither gate blocks local contract implementation or real local Nox verification.

## Public Contracts, Interfaces, And Data

### `IConfidentialHost`

Every core instance is bound to exactly one immutable host adapter.

```solidity
interface IConfidentialHost {
    function confidentialClock() external view returns (uint48);
    function confidentialClockMode() external view returns (string memory);
    function governanceQuorum(bytes32 hostProposalId, uint48 snapshot)
        external
        view
        returns (uint256);
}
```

Safe returns timestamp time and the proposal's absolute committed quorum. Governor returns its ERC-6372
clock and `quorum(snapshot)`. This keeps the core compatible with timestamp- or block-based Governors
without pretending every proposal uses `block.timestamp`.

### `IEligibilityStrategy`

```solidity
interface IEligibilityStrategy {
    function validateConfig(bytes calldata config) external view returns (uint32 eligibleCount);
    function weightOf(
        address voter,
        uint48 snapshot,
        bytes calldata config,
        bytes calldata proof
    ) external view returns (uint256);
}
```

- `IVotesSnapshotStrategy`: `config = abi.encode(token)`; `proof` is empty; weight comes from
  `IVotes(token).getPastVotes(voter, snapshot)`. Config validation returns zero because the number of
  eligible delegated accounts is not enumerable on-chain.
- `MerkleWeightedAllowlistStrategy`: config commits root, snapshot ID, eligible count, chain, and host;
  proof supplies weight and the Merkle path. Leaves domain-separate chain, host, snapshot ID, voter,
  and weight. Config validation returns the committed nonzero eligible count. Zero weight or invalid
  proof reverts.
- The core stores the first accepted public weight. Replacements reuse it.
- Only the two factory-published strategy addresses are accepted by version 1.

### `IConfidentialBallotCore`

`RegisterBallotParams` contains:

```solidity
struct RegisterBallotParams {
    bytes32 hostProposalId;
    bytes32 actionHash;
    address eligibilityStrategy;
    bytes eligibilityConfig;
    uint48 snapshot;
    uint48 voteStart;
    uint48 voteEnd;
    uint32 privacyFloor;
    uint8 maxReplacements;
}
```

The core constructor fixes the host, version-1 strategy addresses, and organization minimum privacy
floor. Registration requires `voteStart < voteEnd`, `privacyFloor >= organizationMinimum`, and one or
two replacements. For a Merkle electorate, the floor must also be no greater than the committed
eligible count. `ballotId` is a domain-separated hash of the chain, core, host, host proposal, action,
and configuration; duplicate registration reverts.

Required calls:

```solidity
function registerBallot(RegisterBallotParams calldata params)
    external
    returns (bytes32 ballotId); // only immutable host

function cancel(bytes32 ballotId) external; // only host, Scheduled only

function castVote(
    bytes32 ballotId,
    uint64 sequence,
    externalEuint16 choice,
    bytes calldata handleProof,
    bytes calldata eligibilityProof
) external;

function requestTally(bytes32 ballotId) external;
function finalize(bytes32 ballotId, bytes calldata decryptionProof) external;
function detailedState(bytes32 ballotId) external view returns (DetailedState);
function result(bytes32 ballotId) external view returns (Result);
function receipt(bytes32 ballotId, address voter) external view returns (BallotReceipt memory);
function expectedVerdictHandle(bytes32 ballotId) external view returns (bytes32);
```

Stored states are minimal; `Scheduled`, `Open`, and `Closed` are derived from the host clock. The public
detailed states are `Scheduled`, `Open`, `Closed`, `TallyPending`, `Withheld`, `Rejected`, `Passed`, and
`Canceled`.

Events expose proposal binding, voter, sequence, replacement flag, unique participation, expected
verdict handle, terminal verdict, and cancellation. They never emit choice support, exact option
totals, per-option contributions, or internal accumulator handles.

### `SafeConfidentialVotingModule`

Each module is immutable and bound to one Safe, one version-1 core, an organization minimum privacy
floor, and one `MultiSendCallOnly` address and code hash.

The module derives `safeProposalId = keccak256(abi.encode(block.chainid, address(this), safe,
++proposalNonce))`. Each action hash is
`keccak256(abi.encode(ACTION_TYPEHASH, to, value, keccak256(data)))`; the ordered bundle hash is
`keccak256(abi.encode(BUNDLE_TYPEHASH, block.chainid, address(this), safe, safeProposalId,
keccak256(abi.encode(actionHashes))))`. The same bundle hash is stored by the module and linked core.

```solidity
struct SafeAction { address to; uint256 value; bytes data; }

struct SafeBallotConfig {
    address eligibilityStrategy;
    bytes eligibilityConfig;
    uint48 snapshot;
    uint48 voteStart;
    uint48 voteEnd;
    uint32 privacyFloor;
    uint8 maxReplacements;
    uint256 governanceQuorum;
}

function registerProposal(
    SafeAction[] calldata actions,
    SafeBallotConfig calldata ballotConfig
) external returns (bytes32 safeProposalId, bytes32 ballotId); // only bound Safe

function hashActions(bytes32 safeProposalId, SafeAction[] calldata actions)
    external
    view
    returns (bytes32);

function execute(bytes32 safeProposalId, SafeAction[] calldata actions) external;
```

Registration checks that the module is currently enabled by the Safe. Execution is permissionless,
requires a Passed core result, recomputes the exact ordered action hash, and marks the proposal consumed
before the external Safe call. A failed Safe return reverts the whole transaction, rolling the consumed
flag back so only the exact bundle can be retried. Reentrancy observes the consumed state and fails.

For multiple actions, packed entries are `operation(0) | to | value | dataLength | data`; no inner
delegatecall byte is accepted. The only outer delegatecall target is the immutable verified
`MultiSendCallOnly` contract.

### `ConfidentialGovernor`

Compose OpenZeppelin `Governor`, `GovernorSettings`, `GovernorVotes`,
`GovernorVotesQuorumFraction`, and `GovernorTimelockControl`.

```solidity
function proposeConfidential(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description,
    uint32 privacyFloor
) public returns (uint256 proposalId, bytes32 ballotId);

function confidentialState(uint256 proposalId)
    external
    view
    returns (ConfidentialProposalState);

function cancelConfidential(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    bytes32 descriptionHash
) external returns (uint256 proposalId);
```

Do not add a Governor `castConfidentialVote` forwarding function: released `Nox.fromExternal` binds
input owner to `msg.sender`, so forwarding through Governor would make the Governor the apparent owner.
Wallets call the linked core's `castVote` directly.

`proposeConfidential` reproduces the base Governor description restriction and proposal-threshold
checks before `_propose`, then registers the linked core ballot with the normal proposal snapshot,
deadline, `bytes32(proposalId)` as both host proposal identity and normal OpenZeppelin action binding,
the token strategy, and privacy floor. Normal multi-action Governor arrays are supported.

Every public plaintext cast function and both internal `_castVote` overloads revert. While an ended
ballot is Closed or TallyPending, standard `state()` projects `Pending`; the detailed getter reports the
truthful state. Withheld maps to standard `Defeated`. A valid Passed result restores normal Succeeded,
queue, timelock, and execution behavior.

`cancelConfidential` is proposer-only and Pending/Scheduled-only. Version 1 has no post-open
administrator cancellation.

### Versioned Factory

The factory publishes version `1`, the two eligibility strategies, and deployment events. It deploys
new immutable Safe-module/core pairs or Governor/core pairs. Adapters construct their own core bound to
`address(this)`, avoiding an unbound initialization window. No proxy or upgrade administrator exists.

## Integration Reality Matrix

The required labels below classify whether an integration is real. `REAL_MVP` means “must be real in
the judged path”; it does not mean product features were cut into an MVP/later list.

| Surface                                   | Classification                    | Concrete path and evidence                                                                                         |
| ----------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Nox Solidity operations and ACL           | `REAL_MVP`                        | `@iexec-nox/nox-protocol-contracts@0.2.4`; real local NoxCompute and current passing spike evidence                |
| Handle preparation/input proof            | `REAL_MVP`                        | `@iexec-nox/handle@0.1.0-beta.13`; real Handle Gateway proof bound to wallet and core                              |
| KMS, Gateway, ingestor, JetStream, Runner | `REAL_MVP`                        | Released Docker stack via `@iexec-nox/nox-hardhat-plugin@0.2.0`; no in-process substitute                          |
| Verdict public-decryption evidence        | `REAL_MVP`                        | Exact stored `ebool` handle plus released `Nox.publicDecrypt` verification and negative matrix                     |
| Safe singleton/proxy/module execution     | `REAL_MVP`                        | Official `@safe-global/safe-smart-account@1.5.0` artifacts and owner-enabled module path                           |
| Safe atomic action batches                | `REAL_MVP`                        | Official `MultiSendCallOnly`; inner calls only; immutable address/code-hash check                                  |
| Merkle Safe electorate                    | `REAL_MVP`                        | OpenZeppelin `MerkleProof` plus domain-separated weighted leaves                                                   |
| Governor `IVotes` snapshot                | `REAL_MVP`                        | OpenZeppelin `GovernorVotes`/`IVotes` with the linked core strategy                                                |
| Governor/timelock execution               | `REAL_MVP`                        | OpenZeppelin 5.6.1 Governor and real `TimelockController` batch queue/execute                                      |
| Unit-test fixtures                        | `OUT_OF_SCOPE` for product claims | May isolate logic locally; cannot support privacy, Nox, Safe, Governor, or deployment claims                       |
| Frontend, indexer, visual design          | `OUT_OF_SCOPE` for this plan      | External designer owns direction; a later accepted design document reopens UI planning                             |
| Database, backend auth, privileged keeper | `OUT_OF_SCOPE`                    | Contract transitions are event-driven and permissionless; no authority-bearing server                              |
| MACI receipt-freeness/anonymous voting    | `OUT_OF_SCOPE`                    | Explicit product non-goals on released Nox                                                                         |
| Threshold KMS/Keypers                     | `OUT_OF_SCOPE`                    | Current Nox single-KMS trust is disclosed; no false threshold claim                                                |
| Ethereum Sepolia judged deployment        | `BLOCKED`                         | Requires explicit user authorization, funded account, and same-day official address verification; no mock fallback |

No `REAL_LATER` or `SIMULATED_DEMO_ONLY` integration supports the contract product claim.

## Phase 1: Production Boundaries And Pure State

### Goal

Create the production source tree and public interfaces without importing spike code.

### Work

- Add shared types, errors, `IConfidentialHost`, `IEligibilityStrategy`, core interface, and version
  constants.
- Implement core registration, domain-separated ballot ID/config hash, host-only cancellation,
  host-clock-derived states, immutable host binding, public receipts, and terminal-result getters.
- Implement the direct-deployment versioned factory shape and adapter-owned core construction.
- Preserve `src/spike` unchanged and label it evidence-only in build/test documentation.

### Mock Policy

Pure host/clock fixtures are allowed for unit tests only. They make no Nox or governance claim.

### Checks

- Registration collision, invalid host/config, invalid dates/floor, duplicate ballot, clock-mode,
  scheduled/open/closed derivation, cancel-before-open, and forbidden post-open cancellation tests.
- Fuzz all ballot/config hash fields and cross-chain/core/host/proposal separation.
- Enforce file-size and contract-size gates.

### Acceptance Criteria Covered

R2, R7, R8, R10, R12, R13; foundations for AC6–AC8.

### Stop Condition

Stop if the core cannot remain host-neutral while matching both the Safe timestamp clock and the
Governor ERC-6372 clock without adapter-specific branches.

## Phase 2: Eligibility, Confidential Ballots, And Verdict

### Goal

Implement the privacy-critical core using released Nox behavior.

### Work

- Implement the IVotes and Merkle strategies and allow only factory-published version-1 strategies.
- Accept encrypted input only through direct wallet calls to the core; reject eligibility, state, and
  sequence errors before calling Nox.
- Implement total choice normalization, public fixed weight, one effective ballot, two-replacement
  ceiling, encrypted subtraction/addition, and unique Recorded participation.
- Persist only core ACL access for ballot/intermediate/total handles.
- Implement permissionless `requestTally`: below floor becomes Withheld without a verdict permission;
  at/above floor derive quorum, For > Against, and one expected boolean verdict.
- Grant public decryption only to that verdict; validate/finalize exactly once.
- Remove production equivalents of spike-only accumulator and operation-trace getters.

### Real Integration Path

Use the real local Handle Gateway, NoxCompute, KMS, ingestor, JetStream, and Runner through Hardhat 3.

### Mock Policy

Pure strategy and state fixtures are allowed in Foundry. No mock supports AC1–AC7 or a privacy claim.

### Checks

- For/Against/Abstain and noncanonical normalization; unequal weights; initial ballot plus two
  replacements; out-of-order/duplicate/over-limit sequences; zero/invalid snapshot weights.
- Unique count and public recorded-weight invariants; replacement never changes either.
- Below-floor no-verdict/no-public-ACL property.
- Only verdict handle publicly decryptable; every ballot, contribution, total, and intermediate remains
  core-only.
- Full wrong signer/domain/handle/type/length/value/state/mutation/replay matrix.
- Four-wallet floor-four measured real-Nox runs, Runner restart, and JetStream negative-ack redelivery.

### Acceptance Criteria Covered

AC1–AC7 and contract portions of AC10–AC14.

### Stop Condition

Stop if any individual/total handle becomes viewable or publicly decryptable, if a failed/stale
operation affects participation, or if the four-wallet graph does not repeatedly resolve on the real
stack.

## Phase 3: Safe Module And Atomic Actions

### Goal

Deliver the installable Safe path with least possible executable authority.

### Work

- Implement one immutable module per Safe, only-Safe registration, module-enabled checks, Safe proposal
  nonce, exact action/config binding, and absolute quorum provider.
- Implement direct single-call execution and official `MultiSendCallOnly` multi-action encoding.
- Restrict outer delegatecall to the immutable code-hash-verified batch contract and forbid every inner
  delegatecall.
- Make execution permissionless, passed-only, exact-bundle, retry-on-failure, and execute-once.
- Add factory events exposing version, Safe, module, core, strategies, batch address, and code hashes.

### Real Integration Path

Use an official Safe 1.5.0 singleton/proxy, enable the module through a real owner-threshold Safe
transaction, and use the official batch artifact.

### Mock Policy

A reverting target fixture is allowed to test rollback. A fake Safe may not support any acceptance
claim.

### Checks

- Registration rejected from owners/proposers calling directly; accepted only when `msg.sender` is the
  bound Safe after normal Safe execution.
- Module disabled, wrong Safe, wrong action order/target/value/data, altered batch, unapproved outer
  delegatecall, inner delegatecall, failed target, retry, reentrancy, and replay tests.
- Passed exact one-call and multi-call atomic execution; Rejected/Withheld/Pending/Canceled execute none.
- Verify a failed Safe boolean return reverts and rolls execution state back.

### Acceptance Criteria Covered

AC8, AC15, R1, R2, R10, and Safe parts of Stories 1, 2, 8, and 10.

### Stop Condition

Stop if the module can reach an uncommitted target/data/value, perform arbitrary delegatecall, execute
twice, or mark execution successful when Safe reports failure.

## Phase 4: Compatible Governor And Timelock

### Goal

Deliver the native Governor path without any plaintext voting seam.

### Work

- Compose Governor settings, votes, quorum fraction, and timelock control with a bound core.
- Implement `proposeConfidential` with base description/proposer-threshold checks and normal action
  batches.
- Register token snapshot/start/deadline and action-bound ballot atomically with proposal creation.
- Disable all five public plaintext cast routes, both internal `_castVote` overloads, and `_countVote`.
- Read `hasVoted` and detailed state from the core; project ended unresolved proposals to standard
  Pending, Withheld to Defeated, and finalized verdicts to normal Governor states.
- Implement proposer-only Pending cancellation; preserve normal queue, timelock delay, batch execution,
  Governor settings changes, and governance-only timelock updates.
- Configure the timelock with Governor as sole proposer/canceller; renounce setup admin after roles are
  verified. Execution may remain permissionless.

### Real Integration Path

Use a real ERC20Votes fixture, proposal snapshot, OpenZeppelin 5.6.1 Governor, and real
`TimelockController` batch queue/execute.

### Mock Policy

No fake Governor or fake timelock supports AC16. Token and action targets may be deterministic local
fixtures.

### Checks

- Proposal threshold and description restriction parity with base Governor.
- Block-number and timestamp clock coverage.
- Every public/internal plaintext cast path rejects without consuming nonce or emitting VoteCast.
- Snapshot weight remains fixed across transfers/delegation changes; replacements reuse first weight.
- One- and multi-action proposal hashes bind to the linked ballot.
- TallyPending cannot queue; Passed queues then executes only after delay; Withheld/Rejected never
  queue; direct timelock interference maps truthfully.

### Acceptance Criteria Covered

AC8, AC16, R1, R3, R8–R10, and Governor parts of Stories 1, 2, 7, 8, and 10.

### Stop Condition

Stop if any inherited path emits plaintext support, an unresolved proposal can Succeed/queue, or the
core verdict can authorize a different Governor action batch.

## Phase 5: Security, Failure Recovery, And Release Evidence

### Goal

Prove the combined production contracts meet the accepted claim boundary.

### Work

- Run the complete cross-proposal/cross-host/cross-chain proof-negative matrix.
- Add invariants for one effective ballot, monotonic unique participation, fixed first weight, maximum
  two replacements, no below-floor verdict, single finalization, and execute-once.
- Repeat cold/warm Nox timing, Safe direct/batch gas, Governor queue/execute gas, Runner restart, and
  JetStream redelivery.
- Run Forge high/medium lint, Slither 0.11.5, contract sizes, fuzz/invariants, and manual ACL/action
  review under the quality profile.
- Produce a verification audit that separates real proof, inferred safety, external trust, and unrun
  live behavior.

### Real Integration Path

All privacy, proof, Safe, Governor, and recovery evidence uses released packages and real on-chain
state transitions in the local stack.

### Mock Policy

No mock, seeded plaintext tally, fabricated proof, or manual result is permitted in the judged path.

### Checks

- Full `pnpm build`, TypeScript, Forge, static/security, real-Nox, Safe, and Governor suites.
- At least three clean real-stack repetitions and one cold-stack run.
- Four-wallet floor-four demo graph must remain within the previously observed order of magnitude;
  investigate any median above 30 seconds or unresolved result after 120 seconds. These thresholds are
  investigation/stop gates, never permission for a plaintext fallback.
- Confirm only the verdict is publicly decryptable and all execution receipts match the commitment.

### Acceptance Criteria Covered

All contract acceptance criteria: AC1–AC9, AC15, and AC16.

### Stop Condition

Do not call the contract system complete with a high/medium untriaged finding, a failed real-Nox path,
an ACL leak, an action mismatch, or an unproven recovery claim.

## Phase 6: Live Ethereum Sepolia Gate

### Status

`BLOCKED` pending explicit user authorization. This phase is planned but must not begin automatically.

### Unblocking Actions

1. User approves target accounts, funding, deployment, and external transactions.
2. Re-verify official Ethereum Sepolia NoxCompute, Gateway, Safe singleton/proxy factory/batch, and
   explorer addresses from current primary sources.
3. Verify bytecode/code hashes before configuring the immutable factory/module.
4. Deploy versioned strategies, factory, one Safe module/core, one Governor/core, token, and timelock.
5. Execute the four-wallet floor-four judged path with real Handle Gateway inputs, verdict proof, and
   exact Safe action; then run the Governor queue/timelock path.

### No Fallback

If authorization, funding, official addresses, or real Nox behavior is unavailable, report the live
phase as not run. Do not replace it with local state, a mock, or a submission claim.

## Verification Checkpoint

Before contract completion, a separate verification audit must confirm:

- requirement/story/acceptance traceability;
- production source never imports spike evidence;
- exact package versions, addresses, and commit/source provenance;
- no individual or total public-decryption ACL;
- correct direct-wallet owner/application binding;
- Safe registration authority, batch restriction, failure rollback, and replay safety;
- Governor threshold/snapshot/cast/state/timelock compatibility;
- real Nox, Safe, Governor, restart, redelivery, and proof-negative results;
- static analysis, fuzz, invariant, size, and gas evidence;
- clear separation between local PASS and any still-blocked live gate.

## Handoff Notes

- UI remains untouched until the external direction is returned, audited, user-accepted, and captured
  in a design document.
- Contract events/getters are designed for later indexing but no indexer or authority-bearing backend
  is part of this plan.
- Do not create credentials, start funded services, deploy, commit, publish, or claim submission
  readiness without the corresponding explicit authorization.
- After plan acceptance, begin only when the user explicitly authorizes implementation.

## Evidence

- [Contract-planning authorization](../decisions/2026-07-30-contract-planning-authorization.md)
- [Accepted technical architecture](../design/2026-07-30-confidential-governance-technical-architecture.md)
- [Contract quality profile](../quality/2026-07-30-contract-quality-profile.md)
- [Product specification](../specs/2026-07-29-confidential-governance-module.md)
- [Functional stories](../stories/2026-07-29-confidential-governance-module.md)
- [Full-shape local verification](../verification/2026-07-30-full-shape-spike-report.md)
- [Source manifest](../sources/source-manifest.md)
