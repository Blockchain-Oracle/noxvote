# Plan: Confidential Governance Contracts On Nox

**Date:** 2026-07-30  
**Status:** Accepted; local phased contract implementation authorized
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
11. Ethereum Sepolia is the first live gate. On 2026-08-01 the user authorized target accounts,
    funding checks, deployment, and required external transactions. The same-day dependency and
    bytecode preflight passes; broadcasting now waits only for a dedicated funded deployer.
12. Every deployed adapter/core pair has an immutable organization minimum privacy floor of at least
    four. A proposal may choose a higher floor. Its replacement ceiling must be one or two; the judged
    configuration uses two.

## Open Questions

No contract-design decision is delegated to the implementer. One operational prerequisite remains:

- **Dedicated funded deployer:** configure the Phase 6 account without reusing unrelated local
  keystores and satisfy the runner's dynamic funding gate.

The live dependency inventory and code hashes must be rechecked by the runner immediately before any
broadcast.

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

| Surface                                   | Classification                    | Concrete path and evidence                                                                                             |
| ----------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Nox Solidity operations and ACL           | `REAL_MVP`                        | `@iexec-nox/nox-protocol-contracts@0.2.4`; real local NoxCompute and current passing spike evidence                    |
| Handle preparation/input proof            | `REAL_MVP`                        | `@iexec-nox/handle@0.1.0-beta.13`; real Handle Gateway proof bound to wallet and core                                  |
| KMS, Gateway, ingestor, JetStream, Runner | `REAL_MVP`                        | Released Docker stack via `@iexec-nox/nox-hardhat-plugin@0.2.0`; no in-process substitute                              |
| Verdict public-decryption evidence        | `REAL_MVP`                        | Exact stored `ebool` handle plus released `Nox.publicDecrypt` verification and negative matrix                         |
| Safe singleton/proxy/module execution     | `REAL_MVP`                        | Official `@safe-global/safe-smart-account@1.5.0` artifacts and owner-enabled module path                               |
| Safe atomic action batches                | `REAL_MVP`                        | Official `MultiSendCallOnly`; inner calls only; immutable address/code-hash check                                      |
| Merkle Safe electorate                    | `REAL_MVP`                        | OpenZeppelin `MerkleProof` plus domain-separated weighted leaves                                                       |
| Governor `IVotes` snapshot                | `REAL_MVP`                        | OpenZeppelin `GovernorVotes`/`IVotes` with the linked core strategy                                                    |
| Governor/timelock execution               | `REAL_MVP`                        | OpenZeppelin 5.6.1 Governor and real `TimelockController` batch queue/execute                                          |
| Unit-test fixtures                        | `OUT_OF_SCOPE` for product claims | May isolate logic locally; cannot support privacy, Nox, Safe, Governor, or deployment claims                           |
| Frontend, indexer, visual design          | `OUT_OF_SCOPE` for this plan      | External designer owns direction; a later accepted design document reopens UI planning                                 |
| Database, backend auth, privileged keeper | `OUT_OF_SCOPE`                    | Contract transitions are event-driven and permissionless; no authority-bearing server                                  |
| MACI receipt-freeness/anonymous voting    | `OUT_OF_SCOPE`                    | Explicit product non-goals on released Nox                                                                             |
| Threshold KMS/Keypers                     | `OUT_OF_SCOPE`                    | Current Nox single-KMS trust is disclosed; no false threshold claim                                                    |
| Ethereum Sepolia judged deployment        | `AUTHORIZED; PREFLIGHT PASS`      | Same-day official address/code-hash checks pass; transactions wait for the dedicated funded deployer; no mock fallback |

No `REAL_LATER` or `SIMULATED_DEMO_ONLY` integration supports the contract product claim.

## Phase 1: Production Boundaries And Pure State

### Implementation Progress — 2026-07-30

The first bounded RED-to-GREEN slice passes. New production code now provides shared types and errors,
the host and eligibility interfaces, versioned domain-separated hashing, immutable adapter-owned core
construction, host-only registration and pre-open cancellation, host-clock-derived lifecycle state,
public commitment/read models, and terminal-result/receipt foundations. The production core is 6,983
bytes, all production Solidity files remain below the 200-line target, and the full Forge suite passes
23/23 including 256-run commitment fuzz coverage.

Concrete factory deployment entrypoints remain pending until the concrete Safe and Governor adapters
exist. A generic deployable host would not supply a valid governance clock or execution boundary and
would violate the product architecture. `ConfidentialCoreHost` already enforces the required
adapter-owned core construction; the versioned factory will directly deploy those real adapters in
their implementation phases, with no unbound initialization window.

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

### Implementation Progress — Eligibility Slice — 2026-07-30

The production eligibility-strategy slice passes RED-to-GREEN. `IVotesSnapshotStrategy` validates a
deployed token configuration, rejects an unexpected proof, reads a strictly past OpenZeppelin
`getPastVotes` checkpoint, and rejects zero public weight. `MerkleWeightedAllowlistStrategy` validates
the committed root, snapshot ID, nonzero eligible count, chain, and host; its double-hashed typed leaf
binds chain, host, snapshot ID, voter, and weight before OpenZeppelin sorted-pair proof verification.
Malformed proofs, zero weight, and cross-host/cross-chain reuse reject.

The full Forge suite passes 33/33. Both Foundry and Hardhat builds, formatting, high/medium lint,
TypeScript, and size gates pass. Runtime sizes are 972 bytes for `IVotesSnapshotStrategy` and 2,112
bytes for `MerkleWeightedAllowlistStrategy`. No confidential cast, replacement, ACL, tally, or verdict
claim is made by this pure strategy slice. Concrete factory publication remains coupled to the real
adapter deployment paths.

### Implementation Progress — Confidential Cast Slice — 2026-07-30

The production direct-wallet cast path passes RED-to-GREEN. The first successful operation resolves
the public strategy weight and records sequence 1. Replacements reuse that fixed weight, require empty
eligibility proof bytes, advance deterministically through sequences 2 and 3, and stop at the committed
two-replacement ceiling. Only the first Recorded operation increments unique participation and public
recorded weight. Unknown/non-Open ballots, wrong sequences, ineligible voters, unexpected replacement
proofs, and over-limit replacements all reject before Nox input validation.

The graph uses released Nox SDK operations for total choice normalization, encrypted weighted
contributions, and replacement subtraction/addition. It stores no encrypted-handle getter or operation
trace. Its persistent ACL events grant only the core, with no voter viewer/admin grant and no cast-stage
public-decryption grant. The Nox input proof remains bound to both the direct wallet and ballot core.

Eight focused tests deploy the released `NoxCompute` implementation behind a real `ERC1967Proxy` at
the released local address and use a test Gateway signer. The full Forge suite passes 41/41; formatting,
production high/medium lint, TypeScript, Foundry/Hardhat builds, and the size gate pass.
`ConfidentialBallotCore` runtime size is 10,654 bytes. Foundry's current linter cannot parse the
Solidity 0.8.35 `erc7201(...)` builtin in the imported released Nox implementation, so production lint
targets `src/contracts` while the concrete upstream implementation fixture remains compiler- and
test-covered. The core, cast boundary, storage boundary, and Nox graph library are split so every
production Solidity file remains under the 200-line target. Docker was unavailable for this slice, so
the real Handle Gateway/KMS/JetStream/Runner path was not rerun and no new resolved-result or off-chain
privacy claim is made. The subsequent tally and verdict slice is recorded below.

### Implementation Progress — Tally And Verdict Slice — 2026-07-30

The production tally/finalization path passes RED-to-GREEN. `requestTally` is permissionless but only
valid after the host clock closes voting. Below the public privacy floor, it moves directly to
Withheld, stores no expected verdict, and makes no Nox call. At or above the floor, the core obtains the
host's governance quorum for the committed host proposal and snapshot, constructs encrypted total
participation and `For > Against` checks, derives one boolean verdict, persists graph access only for
the core, and grants public decryption only to that expected verdict handle.

`finalize` remains permissionless and accepts only configured-Gateway evidence for the stored boolean
handle while the ballot is TallyPending. The released Nox SDK enforces proof signer/handle binding,
one-byte length, and canonical `0x00`/`0x01` encoding; core state enforces proposal association and
finalize-once replay safety. Success stores only Rejected or Passed. No exact option total or
intermediate getter was introduced.

Eight focused tests use the released `NoxCompute` implementation behind its real proxy shape with a
test Gateway signer. A forced clean full run passes 49/49 Forge tests; formatting, production and
non-Nox-fixture high/medium lint, TypeScript, Foundry/Hardhat builds, and size gates pass. The core is
12,807 runtime bytes, and every production Solidity file remains under the 200-line target. The test
signer can attest a chosen canonical boolean, so this evidence proves the production contract's state,
ACL, expected-handle proof binding, malformed-value rejection, and replay behavior—not the off-chain
computed plaintext. The subsequently completed released-stack integration below supplies that separate
off-chain evidence.

### Integration Completion — Released Nox Stack — 2026-07-30

Phase 2 is integration-complete for the judged four-wallet/floor-four configuration. The production
`ConfidentialBallotCore`, production weighted-Merkle strategy, and a test-only host clock/quorum fixture
ran twice consecutively through the released Docker-backed Handle Gateway, KMS, ingestor, JetStream,
Runner, and `NoxCompute` contract. Both runs submitted six Gateway-encrypted operations: four initial
ballots plus two replacements by one voter. The final encrypted graph is sensitive to correct removal
of both replaced contributions, uses unequal weights 4/3/2/1, normalizes `65535` to Abstain, applies
governance quorum seven, and resolves true.

The real Gateway returned a boolean decryption proof for the exact expected verdict handle, and the
production core finalized to Passed. Across the complete cast-and-tally graph, input handles remained
non-public, no viewer grant was emitted, every persistent ACL grant emitted by the core targeted the
core, and exactly one handle—the expected verdict—was marked publicly decryptable. End-to-end timings
were 13.289 seconds and 12.136 seconds; warm tally-request-to-proof timings were 535 ms and 431 ms.
This closes the remaining Phase 2 gate without using a spike contract or a test proof signer. It does
not prove a production host adapter because the clock/quorum host remains an explicit test fixture.

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

### Implementation Progress — Registration And Commitment Slice — 2026-07-30

The first production Safe-adapter slice passes RED-to-GREEN. `SafeConfidentialVotingModule` is
non-upgradeable and immutably bound to one deployed Safe, its adapter-owned production core, the two
published eligibility strategies supplied at construction, the organization privacy minimum, and one
deployed `MultiSendCallOnly` address plus its construction-time code hash. It exposes the timestamp
host clock and immutable per-proposal absolute quorum required by the core.

Registration accepts one or more actions only when `msg.sender` is the bound Safe and the Safe reports
the module enabled. The module-local nonce produces
`keccak256(abi.encode(chainId, module, Safe, nonce))`; every action hash commits target, value, and
calldata hash, and the ordered bundle hash also commits chain, module, Safe, and proposal ID. That exact
bundle hash is stored in the adapter and linked core. Empty action arrays, zero targets, zero quorum,
invalid Safe/batch construction, direct owner calls, and disabled-module Safe calls reject atomically.

Seven focused tests use an official Safe 1.5.0 singleton/proxy with two owners, threshold two, and real
ordered ECDSA owner signatures. They verify normal Safe enablement and registration, full action-hash
formula/domain sensitivity, distinct module/core proposal identities for repeated action bundles,
config propagation, and rollback on rejection. The full Forge suite passes 56/56. Foundry and Hardhat
builds, TypeScript, formatting, and production high/medium lint pass. The module is 131 source lines,
3,613 runtime bytes, and 17,603 initcode bytes. Slither is not installed in the current workspace.

This slice does not implement or claim Safe execution. Direct single-call execution, Safe boolean
failure rollback, Passed-only checks, retry/reentrancy/replay behavior, batch packing and code-hash
revalidation, and the versioned factory remain Phase 3 work.

### Implementation Progress — Direct Single-Call Execution Slice — 2026-07-30

The production module now executes one committed Safe action through the official module path. The
entrypoint is permissionless, but requires a known proposal, exactly one action, the module still
enabled on its bound Safe, an unconsumed record, a final core result of Passed, and an exact recomputation
of the registered target/value/calldata commitment. The outer Safe operation is fixed to Call. Pending,
Rejected, Withheld, and Canceled proposals cannot execute.

The module marks the record executed before its external Safe call, so a target cannot reenter and
execute the same proposal twice. If Safe returns false because the target reverts, the module reverts as
well, rolling the flag back and permitting a later exact retry. Successful execution leaves the Safe
owner transaction nonce unchanged because replay protection is the module's proposal record.

Six focused tests use an official Safe 1.5.0 singleton/proxy with two owners and threshold two, the
production adapter-owned core, the released `NoxCompute` proxy shape, and a test Gateway signer. They
cover exact permissionless success, changed target/value/data, multi-action rejection, every non-Passed
result, failed-target rollback and retry, reentrant target behavior, replay, and module disablement. The
full Forge suite passes 62/62; Foundry and Hardhat builds, TypeScript, formatting, production
high/medium lint, and size gates pass. The module is 163 source lines, 4,678 runtime bytes, and 18,697
initcode bytes. Solar cannot resolve the upstream Nox `erc7201(...)` symbol, so this concrete Nox fixture
joins the already documented test-only lint exceptions while remaining Solc-compiled and executed.
Slither is not installed in the current workspace.

This slice does not implement or claim multi-action execution. Official `MultiSendCallOnly` byte
packing, construction-bound runtime code-hash revalidation, call-only inner operations, atomic batch
failure, and the versioned factory remain Phase 3 work. The Docker-backed Nox services were not rerun;
the test Gateway signer proves the on-chain state gate and proof binding, not the off-chain computed
plaintext.

### Implementation Progress — Atomic Multi-Action Execution Slice — 2026-07-30

The production module now executes an exact committed multi-action bundle through the official
`MultiSendCallOnly` path. Its bounded encoder matches the official packed format
`operation | target | value | dataLength | data`, fixes every inner operation byte to Call, preserves
action order and arbitrary calldata length, and supplies that payload only to the immutable batch
address through the Safe's outer DelegateCall operation. Immediately before that delegatecall, the
module revalidates the batch contract's construction-bound runtime code hash.

The existing Passed-only, enabled-module, exact-hash, pre-call consumption, failure rollback, retry,
reentrancy, and execute-once gates apply identically to batches. A failed inner call makes the official
batch contract revert, Safe returns false, and the module reverts the complete transaction; prior inner
effects and the consumed flag therefore roll back together. A later retry must supply the same exact
ordered bundle.

Five focused batch tests use the official Safe 1.5.0 singleton/proxy and official
`MultiSendCallOnly`. They cover ordered value-bearing success in the Safe call context, execute-once,
changed-order rejection before any inner call, atomic failure and exact retry, batch reentrancy, and
runtime code-hash drift. A separate byte-level conformance test covers empty, short, and dynamic action
data and proves every packed operation byte is Call. The 11 combined execution tests and full 68/68
Forge suite pass; Foundry and Hardhat builds, TypeScript, formatting, and production high/medium lint
pass. The module is 182 source lines, 5,523 runtime bytes, and 19,584 initcode bytes; the encoder library
is 39 source lines. Solar's existing upstream Nox `erc7201(...)` limitation requires the new concrete
Nox batch fixture to share the documented test-only lint exception while Solc compiles and executes it.
Slither remains unavailable.

The Docker-backed Nox services were not rerun because this slice changes only post-verdict Safe
execution; the Foundry test Gateway signer proves the on-chain state gate and proof binding, not the
off-chain computed plaintext. The versioned factory deployment/event path is the remaining Phase 3
slice.

### Implementation Progress — Versioned Safe Factory Slice — 2026-07-30

Phase 3 is complete. `ConfidentialGovernanceFactory` publishes contract/rules version 1, deploys one
production `IVotesSnapshotStrategy` and one production `MerkleWeightedAllowlistStrategy`, and fixes one
official `MultiSendCallOnly` address. It stores each dependency's construction-time runtime code hash
and revalidates all three immediately before every module deployment.

Safe/module/core deployment is permissionless and has no owner, proxy, implementation pointer, or
upgrade administrator. The caller supplies the reviewed `SafeConfidentialVotingModule` creation
bytecode; the factory accepts it only when its hash matches the pinned compile-time artifact hash,
appends the exact Safe/strategy/floor/batch constructor arguments, and performs CREATE while preserving
constructor revert data. The exact module constructor creates its core with `host = module`, so there
is still no unbound initialization window. Each deployment emits the contract version, organization
floor, every Safe/module/core/strategy/batch address, the approved creation-code hash, and the current
runtime code hash of every component.

This verified-bytecode input keeps the shared versioned factory at 2,023 runtime bytes and 5,666
initcode bytes instead of embedding the 19,584-byte Safe-module initcode in factory runtime. That leaves
the accepted shared factory shape viable for the Phase 4 Governor deployment entrypoint without
crossing EIP-170. A test asserts that the pinned hash always equals the current compiler artifact, so
any reviewed module/compiler change fails locally until the version binding is deliberately updated.

Seven focused tests cover published versions/strategies/dependency hashes, permissionless exact pair
creation, host/core/floor binding, complete event evidence, distinct deployments, invalid Safe/floor/
batch construction, unreviewed creation bytecode, and strategy/batch runtime drift. The full Forge
suite passes 75/75; Foundry and Hardhat builds, TypeScript, formatting, production high/medium lint, and
size gates pass. The factory is 139 source lines. Slither remains unavailable. The Docker-backed Nox
stack was not rerun because this slice changes deployment/evidence only, not confidential computation.

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

### Implementation Progress — Construction, Proposal Binding, And Plaintext Shutdown — 2026-07-30

The production `ConfidentialGovernor` now composes OpenZeppelin 5.6.1 `Governor`,
`GovernorSettings`, `GovernorVotes`, `GovernorVotesQuorumFraction`, and `GovernorTimelockControl`
around an adapter-owned `ConfidentialBallotCore`. A single typed construction config preserves all
immutable token, timelock, settings, strategy, and privacy-floor inputs while avoiding the non-IR
compiler's constructor stack limit.

The only usable proposal entrypoint is `proposeConfidential`. It reproduces OpenZeppelin's restricted
description and proposal-threshold checks before `_propose`, supports normal one- or multi-action
arrays, and then atomically registers the linked core ballot. The core commitment uses the normal
proposal snapshot/deadline, the production token strategy and token config, two replacements, and
`bytes32(proposalId)` as both host proposal identity and exact OpenZeppelin action binding. If core
registration rejects, the proposal creation and event roll back with it.

Standard `propose`, all five public plaintext voting functions, both internal `_castVote` overloads,
and `_countVote` now revert with the same dedicated error. The signed entrypoints reject before
signature validation and nonce use. `hasVoted` reads the linked core receipt, and the host supplies the
Governor's ERC-6372 clock/mode and snapshot quorum to the core.

Eight focused tests cover construction/core ownership, exact multi-action binding, proposer guard
parity, atomic registration rollback, disabled standard proposal creation, five public plaintext
routes with unchanged nonce, and all three internal plaintext seams. The full Forge suite passes
83/83. Hardhat compile, TypeScript, and production high/medium Forge lint pass. Runtime is 16,849 bytes
and initcode is 33,304 bytes. The repository-wide format check still reports eight untouched historical
2026-07-29 Markdown files; all new Solidity passes Forge formatting. Slither remains unavailable, and
the Docker-backed Nox stack was not rerun because this slice does not change confidential computation.

This is deliberately not yet the complete Governor path. The next bounded slice must project Closed
and TallyPending truthfully, expose detailed state, synchronize proposer-only Scheduled cancellation
with the core, and prove that unresolved/withheld/rejected proposals cannot reach queue. Timelock role
configuration, real queue/delay/batch execution, and the factory Governor entrypoint remain after that.

### Implementation Progress — Async State And Synchronized Cancellation — 2026-07-30

The production Governor now exposes a truthful combined lifecycle: Uninitialized, Scheduled, Open,
Closed, TallyPending, Withheld, Rejected, Passed, Queued, Executed, and Canceled. Standard OpenZeppelin
state projects ended unresolved Closed/TallyPending ballots to Pending, keeps Withheld/Rejected at
Defeated, and restores normal Succeeded only for a finalized Passed core result. Queue validation
therefore rejects every unresolved or terminal non-Passed state before touching the timelock.

The inherited standard `cancel` route is disabled because it cannot synchronize the linked core.
`cancelConfidential` preserves OpenZeppelin's proposer-only Pending check and additionally requires the
core ballot to be Scheduled. It allows the exact snapshot boundary, matching OpenZeppelin's Pending
semantics, but rejects every block after voting opens. The Governor cancellation runs before the core
cancellation in one transaction; if the core rejects, all Governor state and events roll back.

Nine focused tests use the real production Governor/core, ERC20Votes strategy, TimelockController, and
released NoxCompute proxy shape. They cover Scheduled/Open/Closed detail, Closed/TallyPending standard
Pending projection and queue rejection, Withheld/Rejected standard Defeated and queue rejection,
Passed-to-Succeeded projection without execution, unknown detail, synchronized cancellation, outsider
and alternate-route rejection, post-open rejection, and the exact snapshot boundary. The 17 combined
Governor tests and full 92/92 Forge suite pass.

The implementation was split into a single linear inheritance chain after the combined adapter crossed
the quality profile's 300-line cap: a 116-line OpenZeppelin framework, 156-line proposal/core layer,
141-line counting/lifecycle layer, and 9-line concrete Governor. Runtime is 18,220 bytes and initcode is
34,722 bytes. Hardhat compile, TypeScript, production high/medium lint, scoped formatting, and diff
checks pass. Solar still cannot parse Nox's Solidity 0.8.35 `erc7201(...)` builtin, so the concrete Nox
lifecycle test and fixture share the established test-only lint exclusion while remaining compiler- and
execution-covered. The repository-wide format baseline still reports the same eight untouched
historical 2026-07-29 Markdown files. Slither remains unavailable, and the Docker-backed Nox stack was
not rerun.

The next bounded slice configures the real TimelockController with Governor as sole proposer/canceller,
renounces the setup administrator after verification, and proves Passed one- and multi-action queue,
delay, and execution behavior plus timestamp-clock compatibility. The factory Governor entrypoint
remains after that.

### Implementation Progress — Real Timelock And Clock Compatibility — 2026-07-30

The production Governor now passes its real OpenZeppelin 5.6.1 timelock execution boundary. The
production-shaped fixture deploys `TimelockController` with empty proposer/executor arrays and one
temporary setup administrator, deploys the immutable Governor, grants proposer and canceller only to
that Governor, opens execution through the zero-address executor role, verifies every required role,
then renounces the setup administrator. The timelock retains only self-administration outside normal
governance.

Finalized Passed proposals queue through the normal Governor API as real timelock batches. Single and
two-action proposals stay untouched before their exact ETA, reject early execution, and execute
permissionlessly at the ETA. Direct outsider scheduling and cancellation reject, so no alternate
proposer/canceller can inject or erase operations. `TimelockController.updateDelay` also rejects direct
callers but succeeds as a normal confidential proposal executed by the timelock itself.

A timestamp-mode ERC20Votes fixture proves the same production Governor inherits its ERC-6372 clock
from the token. Advancing block number without advancing time leaves the proposal Scheduled/Pending;
timestamp advances open and close the ballot, then the finalized Passed proposal uses the same real
queue/delay/execute path. The existing block-number tests and this timestamp execution test cover both
accepted host clock modes without adding a custom production clock override.

Six focused tests, 23 combined Governor tests, and the full 98/98 Forge suite pass. Hardhat compile,
TypeScript, production high/medium lint, size checks, scoped formatting, and diff checks pass. No
production contract changed in this slice, so Governor runtime remains 18,220 bytes and initcode
remains 34,722 bytes. The concrete Nox-backed test shares the established test-only Solar exclusion
because Solar cannot parse the upstream Solidity 0.8.35 `erc7201(...)` builtin, while Solc and runtime
execution pass. Node 25 remains outside the declared Node 22-24 range. Slither remains unavailable, and
the Docker-backed Nox stack was not rerun because no confidential-computation behavior changed.

The compatible Governor adapter and real timelock/clock execution path are complete. The next bounded
slice adds the versioned factory Governor/timelock deployment entrypoint with immutable binding and
complete creation/runtime code-hash evidence.

### Implementation Progress — Versioned Governor Factory — 2026-07-30

Phase 4 is complete. The versioned factory pins the exact reviewed Governor and TimelockController
creation-code hashes, revalidates every shared strategy and batch dependency runtime hash, and rejects
zero or non-contract vote tokens before deployment. One permissionless call atomically deploys the
TimelockController, Governor, and Governor-owned core with the complete immutable token, strategy,
settings, quorum, privacy-floor, and timelock binding.

The factory grants only the deployed Governor proposer/canceller authority, opens execution through
the zero-address executor role, verifies every required role and timelock self-administration, then
renounces and verifies removal of its temporary administrator. Its events bind the complete deployment
configuration hash and emit the reviewed creation-code and deployed runtime-code evidence. Invalid
creation code, dependency drift, invalid tokens, and Governor-constructor failure all roll the complete
deployment back; the constructor-failure test also proves the factory CREATE nonce remains reusable.

Eight focused Governor-factory tests, all 15 factory tests, 31 production Governor-plus-factory tests,
and the full 106/106 Forge suite pass. The factory's source split is 80/81/181/10 lines, and its concrete
runtime/initcode sizes are 5,731/9,424 bytes. Hardhat compile, TypeScript, Forge lint/build/tests/size,
scoped formatting, and diff checks pass. The Docker-backed Nox stack was not rerun because this slice
does not change confidential computation. The user explicitly removed Slither from the project
requirements; it is not a Phase 5 gate. The combined production invariant suite is next.

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

### Implementation Progress — Combined Production Invariants — 2026-07-30

The first Phase 5 slice passes one explicit stateful handler against production ballot cores, the
production Safe module, the official Safe 1.5.0 proxy/module path, and the released NoxCompute proxy
shape with a test Gateway signer. Deterministic token and clock fixtures control local inputs but do not
replace the production core, Nox proof validation, Safe module, or official execution path.

Three invariant properties jointly cover one effective public weight per voter, monotonic unique
participation, fixed snapshot weight despite later token minting, at most two replacements,
failed-sequence immutability, no below-floor verdict handle/result, single finalization, immutable Safe
action/ballot binding, retry-safe execution, and execute-once. The initial RED run showed that selector
targeting alone still permitted direct fuzzer calls to every deployed fixture; the final harness fixes
both the handler contract and its seven modeled selectors explicitly.

The `invariant` Foundry profile runs each property 10,000 times at depth 32. All three properties pass
320,000 modeled calls each—960,000 total—with zero handler reverts or discards. The full Forge suite
passes 110/110; Hardhat compile, TypeScript, Forge high/medium lint, production size checks, scoped
formatting, and diff checks pass. Production bytecode and size measurements are unchanged. The
Docker-backed off-chain Nox stack was not rerun because this slice adds local stateful verification, not
confidential-computation behavior. The then-next cross-proposal/cross-host/cross-chain proof-negative
matrix is resolved by the following slice.

### Implementation Progress — Proof-Negative Domain Matrix — 2026-07-31

Five focused production tests now cover the complete local verdict-proof matrix: short proof, signature
mutation, wrong signer, wrong EIP-712 version, wrong verifying contract, wrong stored handle, malformed
boolean length, noncanonical boolean value, identical-input reuse across proposals, same encrypted
handles with separate app signatures across hosts, a foreign chain domain, and foreign-host/
foreign-chain input proofs. Every negative preserves TallyPending/result/expected-handle state or an
unrecorded public receipt, and the corresponding correct proof remains usable.

The adversarial cross-proposal test deliberately reuses the same four valid encrypted input handles and
proofs on two proposals in one core. The production tally subtracts encrypted total participation from
itself, multiplies that encrypted zero by the public `ballotId`, and adds it back before quorum
evaluation. The plaintext participation and verdict remain unchanged, while every downstream handle
consumes the already chain/core/host/proposal/config-separated ballot domain. Independent Git review
later established that this construction was already present in the first committed production core
(`7f18524`); the earlier draft's post-hoc RED/fix/factory-repin chronology was not supported by
committed history. The same-handle cross-host case signs each shared input for its correct core and
independently proves the host boundary.

The factory's reviewed Safe-module and Governor creation-code hashes match this core-embedding path.
Five focused matrix tests and the clean full 115/115 Forge suite pass. The 10,000-run invariant profile
also passes all three properties at 320,000 calls each with zero handler reverts or discards.
Hardhat and Forge builds, TypeScript, Forge high/medium lint, formatting, production sizes, and diff
checks pass. Runtime sizes are 12,908 bytes for `ConfidentialBallotCore`, 5,523 for
`SafeConfidentialVotingModule`, 18,220 for `ConfidentialGovernor`, and 5,731 for the factory.

Because ballot-domain separation changes the real confidential graph, the Docker-backed released Nox
integration must pass again before this slice is integration-complete. The 2026-07-31 run attempt
stopped during environment setup because the plugin could not connect to the Docker daemon; none of the
nine integration cases exercised a contract path, and plugin cleanup completed. The previous Phase 2
real-stack passes do not substitute for this rerun.

### Implementation Progress — Released-Stack Repetition, Gas, And Audit — 2026-07-31

After Docker became available, the complete changed-graph integration suite passed three consecutive
clean-start repetitions: 9/9 each and 27/27 total. Every repetition exercised the full product-shaped
path, below-floor withholding, Runner stop/restart, the released signer/domain/cross-proposal/encoding
proof-negative case, explicit JetStream negative-acknowledgement redelivery, compatible
Governor-to-Timelock execution, the production four-wallet/floor-four core, local-stack deployment,
and a real Handle Gateway input. The
plugin cleaned the off-chain services after every run. The first repetition began without running Nox
services but reused cached Docker images; this is cold service-stack evidence, not a cold image-download
benchmark.

Full-path elapsed time was 14.482–15.539 seconds with 469–585 ms from close to proof. The production
core resolved from close to proof in 448–579 ms. Runner recovery took 4.075–4.149 seconds, JetStream
redelivery 4.997–5.927 seconds, and the compatible Governor proof-through-Timelock path 393–600 ms.
These are below the accepted investigation thresholds. The full-path on-chain measurements remained
810,636 gas for the first ballot, 767,760–767,784 for the other first ballots, 721,291–721,315 for
replacements, 560,368 for close, 73,199–73,211 for finalize, and 99,445 for Safe execution.

Four deterministic production-host gas tests now pin isolated call baselines and fail regressions above
20%: Safe direct execution 86,074 gas; Safe two-call `MultiSendCallOnly` execution 168,745; Governor
single-action queue/execute 102,732/52,792; and Governor two-action queue/execute 110,983/82,366. The
full Forge suite passes 119/119, and the 10,000-run invariant profile remains green at 960,000 total
modeled calls with zero handler reverts/discards. Builds, TypeScript, Forge format, production
high/medium lint, sizes, edited-file formatting, and diff checks pass.

The production contract verification audit passes the authorized local Phases 1–5 gate. It separates
local released-stack proof from external trust and marks the explicit AC9 testnet clause, frontend,
visual design, funded infrastructure, deployment, publishing, and submission as NOT RUN. Phase 6
remains blocked on explicit user authorization.

### Independent Review And Production-Adapter Real-Stack Closure — 2026-07-31

An independent Claude Opus 5 review of commit `9bcf601` found no P0/P1 Solidity defect and
independently reproduced 119/119 Forge tests and the production size evidence. It identified two
load-bearing preflight gaps: the nine-case Docker suite used production core but spike Safe/Governor
choreography, and the required CI gate was absent. It also corrected the encrypted-zero chronology,
the architecture's reversed choice-encoding prose, and stale Slither wording.

The remediation adds factory-deployed production Safe direct and official `MultiSendCallOnly`
execution, factory-deployed production Governor plus real `TimelockController` queue/delay/execution,
and real-stack adversarial proof rejection against the production core before correct-proof
acceptance. The expanded suite passes 11/11 in three consecutive clean repetitions—33/33 total—with
off-chain cleanup after each run. Because the factories pin exact Foundry creation bytecode,
`test:integration` now builds the Forge artifacts before Hardhat runs and the integration helper checks
the pinned creation-code hashes.

`.github/workflows/contracts.yml` installs five jobs for static/format checks, build/unit/fuzz/size,
the high-confidence invariant profile, contract-boundary reports, and three released-Nox repetitions.
The workflow is installed but not yet observed on a remote runner. This closes the local Phase 6
preflight remediation; it does not authorize Sepolia accounts, funding, deployment, transactions,
publishing, frontend work, or submission.

### Goal

Prove the combined production contracts meet the accepted claim boundary.

### Work

- Run the complete cross-proposal/cross-host/cross-chain proof-negative matrix. **PASS locally; the
  corrected confidential graph and released signer/domain/cross-proposal/encoding negatives also pass
  three complete released-stack repetitions.**
- Add invariants for one effective ballot, monotonic unique participation, fixed first weight, maximum
  two replacements, no below-floor verdict, single finalization, and execute-once. **PASS.**
- Repeat cold/warm Nox timing, Safe direct/batch gas, Governor queue/execute gas, Runner restart, and
  JetStream redelivery. **PASS for clean local service starts with cached images.**
- Run Forge high/medium lint, contract sizes, fuzz/invariants, and manual ACL/action review under the
  quality profile. **PASS.**
- Produce a verification audit that separates real proof, inferred safety, external trust, and unrun
  live behavior. **PASS for the authorized local contract gate.**

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

`COMPLETE; LIVE SEPOLIA PASS`. The authorized factory-deployed Safe/module/core and compatible
Governor/core/real-Timelock paths both consumed real released-Nox verdicts and executed their exact
actions once. The public checkpoint records `37/37` successful receipts through block `11396305`.

### Unblocking Actions

1. **COMPLETE:** user approves target accounts, funding, deployment, and external transactions.
2. Re-verify official Ethereum Sepolia NoxCompute, Gateway, Safe singleton/proxy factory/batch, and
   explorer addresses from current primary sources. **PASS read-only; the runner repeats this before
   every execution.**
3. Verify bytecode/code hashes before configuring the immutable factory/module. **PASS for the current
   official Nox and Safe deployments and the exact reviewed Foundry creation bytecode.**
4. Configure one dedicated deployer with the runner's required Sepolia ETH balance. **COMPLETE.**
5. Deploy versioned strategies, factory, one Safe module/core, one Governor/core, token, and timelock.
   **COMPLETE on Ethereum Sepolia.**
6. Execute the four-wallet floor-four judged path with real Handle Gateway inputs, verdict proof, and
   exact Safe action; then run the Governor queue/timelock path. **COMPLETE.**

### No Fallback

If funding, official addresses, or real Nox behavior is unavailable, report the transaction portion
of the live phase as not run. Do not replace it with local state, a mock, or a submission claim.

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
- clear separation between local PASS, read-only live preflight PASS, and observed live transaction
  PASS.

## Handoff Notes

- UI remains untouched until the external direction is returned, audited, user-accepted, and captured
  in a design document.
- Contract events/getters are designed for later indexing but no indexer or authority-bearing backend
  is part of this plan.
- Phase 6 credentials, funding checks, deployments, required Sepolia transactions, evidence
  maintenance, and commits are authorized by the 2026-08-01 decision. Frontend work, billable
  production infrastructure, publishing, and submission claims remain unauthorized.
- After plan acceptance, begin only when the user explicitly authorizes implementation.

## Evidence

- [Contract-planning authorization](../decisions/2026-07-30-contract-planning-authorization.md)
- [Phase 6 live authorization](../decisions/2026-08-01-phase6-live-authorization.md)
- [Phase 6 Sepolia live verification](../verification/2026-08-01-phase6-sepolia-live-verification.md)
- [Accepted technical architecture](../design/2026-07-30-confidential-governance-technical-architecture.md)
- [Contract quality profile](../quality/2026-07-30-contract-quality-profile.md)
- [Product specification](../specs/2026-07-29-confidential-governance-module.md)
- [Functional stories](../stories/2026-07-29-confidential-governance-module.md)
- [Full-shape local verification](../verification/2026-07-30-full-shape-spike-report.md)
- [Source manifest](../sources/source-manifest.md)
