# Spec: Confidential Governance Module On Nox

**Status:** Accepted product contract as of 2026-07-30; the technical architecture is accepted, the
contract-only implementation plan is under review, and general implementation is not authorized.  
**Working description:** A proposal-level confidential voting layer that keeps every wallet's support
value off-chain and non-public, counts replacement votes in Nox, releases only the executable verdict
after a privacy floor, and plugs into Safe or OpenZeppelin Governor.

## Objective

Let a DAO run sensitive on-chain decisions without creating a permanent public map from wallets to
choices. An eligible member should use a familiar proposal flow, privately cast or replace a weighted
For/Against/Abstain choice, verify that the encrypted ballot operation was recorded, and later see only
the final Passed/Rejected/Withheld outcome. If the proposal passes, the module should authorize the
exact action committed before voting began.

The product is a governance module, not a replacement DAO platform and not a generic election service.

## Background And Current Reality

MACI shows that serious anti-bribery depends on a hidden authenticated command state, not encryption
alone. Shutter shows that privacy adoption works when it is a proposal toggle inside an existing host,
but its deployed path reveals individual ballots after close. ElectionGuard, Helios, and Belenios show
the value of an append-only verification record and voter-facing ballot trackers. VoteAgain and
DAVINCI show that hiding a replacement requires padding or ciphertext re-randomization in addition to
latest-vote-wins.

Released Nox can compute on encrypted handles and selectively open a derived result, which can provide
permanent individual-choice privacy and verdict-only disclosure. It does not currently expose the
private signature/hash machinery needed for MACI's command chain or DAVINCI's third-party ciphertext
refresh. Its current single KMS holds the full key, and its final public-decryption evidence is a
Gateway signature over a handle/plaintext pair rather than a proof of the full ballot-processing
history.

Therefore the honest product promise is **confidential choices, permanent ballot secrecy, replacement
voting, narrow disclosure, and exact on-chain execution**. The current product does not promise
anonymity, receipt-freeness, or bribe-proof voting.

## Users

- **DAO member/voter:** an eligible wallet with fixed proposal voting weight.
- **Proposal author:** prepares an action and enables confidential voting.
- **DAO administrator/Safe owner:** installs the module or deploys the compatible Governor and sets
  organization-level safety bounds.
- **Finalizer/keeper:** advances an ended proposal through asynchronous tally and proof states; this
  role has no authority to choose the result.
- **Auditor/observer:** checks public configuration, encrypted ballot-operation inclusion, proof
  provenance, and execution without seeing choices.

## Goals

1. Keep every support value out of public calldata/events and keep ballot handles, intermediate values,
   individual choices, and exact option totals non-public after Handle Gateway ingestion and
   finalization.
2. Let eligible voters replace a vote before the deadline, with only the newest accepted vote counting.
3. Withhold every result when a separate minimum privacy-participation floor is not met.
4. Bind a successful result to one immutable precommitted governance action.
5. Make the asynchronous Nox lifecycle and every failure/recovery state legible to ordinary users.
6. Provide a public verification record without producing a plaintext choice receipt.
7. Integrate as a Safe module and as a confidential counting extension for compatible Governors.
8. State the Nox/KMS/Gateway trust model prominently enough that users do not mistake confidential
   computation for threshold cryptography, anonymity, FHE, or a tally SNARK.

## Non-goals

- Claiming receipt-freeness, bribery resistance, coercion resistance, or MACI equivalence on released
  Nox.
- Hiding whether a public wallet participated or replaced a vote.
- Decrypting individual ballots, publishing exact For/Against/Abstain totals, or giving an administrator
  a ballot-view function.
- Running national/public elections or solving proof-of-personhood.
- Replacing Safe, Governor, token delegation, treasury custody, or timelock execution.
- Treating a local mock, plaintext fallback, or fabricated proof as evidence for the product claim.
- Letting a finalizer, proposer, or module administrator substitute a result when Nox is unavailable.

## Requirements

### R1. Installable host adapters

- The product has one host-neutral confidential proposal/ballot core.
- A Safe adapter can be enabled by the Safe's normal owner threshold and can execute only a proposal's
  precommitted transaction after an accepted Passed verdict.
- A Governor adapter supplies confidential counting to a compatible new or upgradeable Governor while
  retaining its voting-power snapshot and queue/timelock execution semantics.
- During the post-deadline Nox gap, the compatible Governor maps the standard state to `Pending` so it
  cannot queue early and exposes a separate truthful `TallyPending` state to product clients. After an
  accepted proof it maps to the normal Succeeded/Defeated and queue/timelock lifecycle. Third-party
  Governor tools that ignore the detailed state may display Pending after the public deadline.
- The interface labels compatibility honestly; it must not imply retrofit support for an arbitrary
  immutable Governor.

### R2. Proposal creation and immutable commitment

Before opening, the author supplies:

- title, description, and discussion link;
- host and chain;
- one or more exact action targets, values, and calldata;
- voting start and deadline;
- voting-power source and snapshot timepoint;
- governance quorum/passage rule, including whether Abstain contributes to governance quorum;
- minimum unique-voter privacy floor;
- allowed choices: For, Against, and Abstain;
- maximum replacements per voter, if an organization safety ceiling is enabled; and
- a human-readable trust/guarantee acknowledgement.

Publishing commits these fields. The action, eligibility snapshot, rules, privacy floor, and deadlines
cannot change after voting opens.

### R3. Eligibility and fixed weight

- Eligibility and voting weight are derived from an immutable proposal snapshot, not the wallet's
  current transferable balance.
- The UI shows the connected wallet's eligibility and weight before it can prepare a ballot.
- Only an eligible wallet may submit an effective ballot operation.
- A wallet has at most one effective ballot at any time; an accepted replacement supersedes rather than
  adds to its previous weight.
- Participation identity and replacement count are explicitly public in the current product.

### R4. Confidential ballot preparation

- Released Nox performs Handle Gateway encryption, not browser-side encryption. The SDK sends the
  encoded plaintext choice, application, and claimed owner to iExec's attested Handle Gateway; it
  returns the opaque handle/proof before the wallet transaction is broadcast.
- The ballot core accepts an imported handle only after checking the released proof, configured Gateway
  signer, expected application, expected owner (`msg.sender`), and expected encrypted integer type.
- Public calldata/events expose an opaque handle/proof and proposal association, never a plaintext
  support value or reason string that encodes the choice.
- The ballot core persists only the minimum Nox access required to update and tally; it never grants
  ballot viewer/admin/public-decryption access to voters, authors, finalizers, adapters, or operators.
- The official client encodes For, Against, and Abstain as three canonical encrypted integer values.
  The ballot encoding is total: every other representable value deterministically normalizes to Abstain
  during encrypted tallying. There is therefore no hidden “valid-choice” class that public privacy-floor
  accounting must discover. The feasibility spike must prove this exact normalization and weighted
  one-hot arithmetic on released Nox.

### R5. Cast and replace flow

- Casting has visible `Preparing encrypted handle`, `Wallet confirmation`, `Submitted`, `Computing`,
  `Recorded`, and failure states.
- A recorded operation receives a public operation tracker that proves inclusion/status without
  revealing or cryptographically attesting the plaintext choice.
- Until the deadline, the voter can select a new choice and submit a replacement through the same
  flow. The UI says that the newest accepted operation counts.
- The UI must also say that replacement timing and the wallet are public, so replacement is a recovery
  window rather than receipt-freeness.
- Concurrent, duplicate, delayed, or out-of-order replacements resolve deterministically by a
  proposal-scoped voter sequence rule.

### R6. No running choice result

- While open, the proposal page may show the number of unique participating wallets, total eligible
  wallets/weight, time remaining, and progress toward the privacy floor.
- It must not show For/Against/Abstain weight, leading option, estimated verdict, or any derived signal
  that leaks the confidential tally.
- Public participation counts distinguish eligible wallets with newest effective Recorded operations
  from merely submitted, pending, failed, rejected, superseded, or stale operations.

### R7. Independent privacy floor

- Governance quorum and the privacy floor are separate named policies.
- The privacy floor is based on unique eligible wallets whose newest effective ballot operation is
  Recorded, not transaction count, replacement count, or token weight. For, Against, Abstain, and
  inputs normalized to Abstain all count as participation; a replacement never adds another unique
  participant.
- The product enforces an organization-level hard minimum and warns that no finite floor eliminates all
  inference in a known, weighted electorate.
- If the floor is not met at close, the terminal result is `Result withheld — insufficient private
participation`. No option tally or verdict handle is made publicly decryptable, and no host action
  is authorized.

### R8. Asynchronous close and tally

The product represents these states distinctly:

`Draft → Scheduled → Open → Closed → Tally requested → Computing → Proof ready → Finalized`

Terminal/result states are:

- `Passed`;
- `Rejected`;
- `Result withheld`;
- `Tally failed or timed out`;
- `Canceled before open`; and
- `Execution failed` after a valid Passed result.

Any account may request/finalize after the permitted transition time. Duplicate requests and
finalizations are idempotent or rejected without changing the result.

For compatible Governors, the detailed lifecycle remains authoritative during asynchronous tallying;
the standard Governor enum is a compatibility projection and must never expose Succeeded before the
accepted verdict proof.

### R9. Verdict-only disclosure

- After close and only after the privacy floor passes, Nox derives governance quorum and passage from
  the encrypted effective ballot state.
- The system requests public decryption only for the proposal's single expected verdict handle.
- At tally request, the module stores one expected verdict handle and its proposal association. That
  handle's encrypted type must be boolean and the request/finalization state is proposal-scoped.
- Finalization validates the configured Gateway's EIP-712 evidence for that exact stored handle under
  the expected chain domain, decodes exactly one valid boolean result, and rejects a wrong signer,
  handle, type/length, proposal state, or replay. The proposal binding and finalize-once rule are module
  invariants; they are not fields independently proven by the Gateway evidence.
- Public output is Passed or Rejected plus proof provenance. Individual choices and exact option totals
  are never made public; stored ballot and intermediate handles receive no public-decryption grant.

### R10. Exact governance execution

- Passed authorizes only the action hash committed before open.
- Rejected, withheld, failed, canceled, or pending proposals authorize no action.
- Safe execution uses the installed adapter's least possible authority. Governor execution preserves
  the configured queue/timelock boundary.
- The Safe adapter enforces proposal-scoped execute-once and rejects any target, value, or calldata that
  does not match the commitment. Safe owner nonce behavior is not used as module replay protection.
- Execution is separately visible as Ready, Queued, Executed, or Failed. An execution failure does not
  alter the accepted vote result.

### R11. Verification center

Every proposal exposes a public verification view containing:

- proposal/action commitment and host;
- voting-power source and snapshot;
- rules, deadlines, governance quorum, and privacy floor;
- accepted operation trackers, voter address/alias, sequence number, and status, without choices;
- tally request identifier and expected result handle;
- decryption-proof status, Gateway signer/provenance, and final verdict;
- execution transaction and host state when applicable; and
- a plain-language list of what this evidence does and does not prove.

The voter can find the newest accepted operation for their wallet. The view must not claim that the
operation tracker proves which choice was encrypted.

### R12. Trust and guarantee disclosure

Creation review, the proposal page, and the verification center state:

- choice privacy trusts the released Nox TEE/off-chain stack, current KMS, Gateway, software, hardware,
  and access configuration;
- the Handle Gateway receives the encoded plaintext choice during encryption; the product does not
  claim that the choice stays on-device or is private from that trusted service;
- the current Nox KMS is a single full-key node and is weaker against key compromise/outage than
  Shutter's threshold Keypers;
- wallet participation and replacement timing are public;
- replacement voting is not receipt-freeness; and
- the Gateway proof validates a signed handle/plaintext result; module state supplies proposal/type/
  replay binding, and neither layer proves the complete encrypted operation graph or tally arithmetic.

### R13. Failure and recovery

- A submitted ballot that has not become Recorded does not count and is not shown as final.
- Users can retry encryption/submission after a recoverable failure without accidentally creating two
  effective ballots.
- A stalled tally shows the stalled dependency and permits a safe retry of the same expected result,
  never a plaintext fallback.
- If the confidential infrastructure cannot finish, the proposal remains failed/withheld and the host
  action remains unauthorized.
- Cancelation is permitted before open. Any exceptional post-open cancellation mechanism must be
  visible, must not publish choices, and must not install an administrator-selected verdict.

### R14. Product-level proposal experience

- Confidential voting is a proposal-level choice with a concise guarantee preview, inspired by
  Shutter's toggle rather than a separate DAO application.
- A host can make confidential voting mandatory for all proposals or optional within organization
  bounds.
- The proposal page is useful to voters, observers, and finalizers without exposing operator-only
  controls to everyone.
- The UI supports shareable proposal and verification links and clear network/contract identifiers.

## Acceptance Criteria

### Privacy and ballot behavior

- **AC1:** For each of For, Against, and Abstain, transaction calldata and emitted public data contain
  no plaintext choice or trivially decodable substitute.
- **AC2:** No supported call grants a non-core account viewer/admin/public-decryption access to an
  individual ballot handle.
- **AC3:** Two accepted replacements by one voter leave exactly one effective weight contribution: the
  newest accepted operation.
- **AC4:** A non-canonical encrypted input produces the same effect as Abstain and no extra capability;
  an out-of-order replacement cannot change the effective tally or unique Recorded participation.
- **AC5:** No page or public contract method exposes a running option tally.

### Disclosure and execution

- **AC6:** Below the privacy floor, close reaches Result withheld and produces no public verdict or
  option-total decryption permission.
- **AC7:** At/above the floor, only the proposal's stored expected boolean verdict handle may be
  finalized, and a wrong signer, chain domain, handle, type/length, proposal state, or replay is rejected.
- **AC8:** A passed proof enables exactly the committed host action; every non-passed terminal state
  enables none.
- **AC9:** The judged path performs a real encrypted Nox operation, real released proof validation, and
  a real testnet host state transition without mocks.

### UX and verification

- **AC10:** The UI never conflates Submitted, Recorded, Closed, Computing, Proof ready, Finalized, and
  Executed.
- **AC11:** A voter can find the newest accepted operation and see whether a retry or replacement is
  required without learning any other choice.
- **AC12:** An observer can reconstruct the public proposal/action commitment and verify the accepted
  result/execution provenance from the verification view.
- **AC13:** Every privacy-facing screen distinguishes confidential choice from anonymous participation
  and replacement voting from receipt-freeness.
- **AC14:** The exact current KMS and Gateway proof limitations appear before proposal publication and
  remain reachable from the live proposal.

### Adapter compatibility

- **AC15:** A test Safe can enable the adapter through its normal owner threshold, execute one passed
  committed action, and reject a different action and a second execution of the committed action.
- **AC16:** A compatible Governor can use the confidential result without emitting plaintext support
  or bypassing its configured queue/timelock.

## Constraints

- Use released Nox behavior and packages. No privacy or proof claim may depend on a local substitute.
- Nox computation is asynchronous; result readiness is not delivered as a synchronous callback.
- Nox handle access is monotonic once granted. A fresh handle does not erase access already granted to
  an older handle.
- Foundry is the primary contract toolchain. Until official support changes, a bounded Hardhat 3
  harness is required for the real local Nox stack.
- The selected disclosure policy is verdict-only. Exact aggregate publication is a separate product
  policy decision and is not implied by this spec.
- The current participation model is public wallet identity with a fixed token/allowlist snapshot.
  Semaphore-style anonymous eligibility is a separate architecture that must first resolve Nox owner
  binding, relaying, weights, and replacement identity.

## Stories Needed

1. Install the Safe or Governor adapter.
2. Create and review a confidential proposal.
3. Check eligibility and prepare an encrypted ballot.
4. Cast and track a ballot operation.
5. Replace a vote before close.
6. Observe a live proposal without seeing the tally.
7. Close below the privacy floor.
8. Request, monitor, and finalize a valid verdict.
9. Execute the committed action.
10. Inspect and independently reason about the verification record.
11. Recover from encryption, recording, tally, proof, and execution failures.

## Open Questions

1. What hard minimum and default privacy floor are defensible for the target demo electorate?
2. What voter and replacement bounds are safe at measured worst-case Nox dependency depth and gas?
3. Should Safe proposal registration require a Safe threshold transaction or an immutable configured
   proposer-policy contract?
4. Which Safe-native atomic batch encoding and operation values should the production adapter permit?
5. What delay thresholds and operator guidance should the product show without adding a plaintext or
   administrator fallback?
6. Which Safe deployment and compatible Governor instance will form an explicitly authorized judged
   testnet path?
7. Does the user want a separate future receipt-resistant architecture track based on MACI/DAVINCI,
   knowing that it is not a feature flag on the released Nox design?

## Source References

- [Broader private-voting landscape](../research/2026-07-29-open-source-private-voting-landscape.md)
- [MACI architecture lessons](../research/2026-07-29-maci-architecture-lessons.md)
- [Shutter architecture lessons](../research/2026-07-29-shutter-architecture-lessons.md)
- [Nox feasibility](../research/2026-07-29-nox-tee-voting-feasibility.md)
- [Governance-host comparison](../research/2026-07-29-governance-host-comparison.md)
- [Source manifest](../sources/source-manifest.md)
