# MACI Architecture Lessons for Confidential Voting on Nox

**Date:** 2026-07-29  
**Research track:** MACI coordinator, message processing, key change/re-vote, proof boundaries, and
guarantees  
**Status:** Primary-source architecture research; not a proposed Nox architecture

## Executive findings

1. **Verified — MACI separates privacy trust from tally correctness.** The coordinator possesses the
   decryption key and can read every decryptable command. Zero-knowledge proofs do not hide ballots
   from that coordinator; they prevent an accepted on-chain state transition or tally from departing
   from the circuit rules. A malicious coordinator can leak ballots or halt a round, but—assuming the
   circuits, verifying keys, proof system, contracts, and setup are sound—cannot publish a false tally
   that the contracts accept.
2. **Verified — current MACI v3 is more than the familiar four-step v1 diagram.** The maintained flow
   is global `MACI.signUp` → per-poll `Poll.joinPoll` → encrypted `Poll.publishMessage` → post-deadline
   state merge/padding → batched `MessageProcessor.processMessages` proofs → batched
   `Tally.tallyVotes` proofs → disclosure/verification of tally leaves. The older four labels remain a
   useful summary, but omitting poll joining and result opening hides important eligibility and
   disclosure boundaries.
3. **Verified — a “re-vote” is not a mutable ballot-box row.** Each encrypted command contains a state
   index, replacement public key, option, replacement weight, nonce, poll id, and salt, plus a
   signature. Messages are processed in reverse publication order. A command changes state only if its
   signature matches the *current circuit state key*, its nonce is the ballot nonce plus one, its
   indices are valid, and it has enough credits. A valid command replaces the selected weight, advances
   the nonce, and can replace the state key. Invalid commands provably leave state unchanged.
4. **Verified — “latest vote wins” is only a shorthand.** A later command with nonce `1`, signed by the
   poll/signup key, can supersede an earlier simple vote and change to a fresh key; the earlier command
   then fails signature or nonce validation. More elaborate valid command chains are possible when
   messages are published in reverse nonce order. The effective ballot is the result of the proved
   reverse-valid command chain, not merely the ciphertext with the largest block/log index.
5. **Verified — the original first-message mitigation was a proposal, not a proved MACI invariant.** In
   the 2019 forward-processing proposal, the first message after the start had no possible older hidden
   key change. Vitalik suggested default clients immediately submit a key switch, or let the operator
   include received key switches before the official period. Current v3 instead uses reverse processing
   and a nonce-`1` first-*processed* rule. It does **not** require the first-*published* command to switch
   to a different key: the maintained SDK defaults `newPublicKey` to the signing key, and exposes a
   separate explicit invalidation helper.
6. **Inference — the clean Nox opportunity is narrower than “replace the coordinator with a TEE.”** A
   correctly isolated confidential program could remove the human/operator's intended plaintext access,
   but it also moves trust into enclave code, hardware, attestation, KMS/key release, logging, and
   availability. MACI's zk proofs independently constrain the whole message-processing and tally
   transition. A TEE or public-decryption proof is not automatically an equivalent proof of that whole
   transition.
7. **Architecture lesson — preserve three separations:** encrypted inclusion, deterministic effective
   vote selection, and result correctness. Encryption supplies none of the latter two by itself;
   re-voting supplies no correctness proof; a correct tally says nothing about coordinator privacy or
   liveness.

## Context and evidence basis

### Context reconciliation snapshot

- **Objective:** extract MACI mechanisms and trust boundaries that a later Nox comparison must answer.
- **Canonical authority:** `.thoughts/decisions/CURRENT.md`, the canonical research brief, and the active
  research plan.
- **Already established:** confidential voting is the selected research direction; re-voting and a
  minimum disclosure quorum are starting constraints.
- **Superseded history:** NoxLimit product decisions and code are archived and were not consulted.
- **Genuine unknown addressed here:** MACI coordinator powers, exact current contract flow, effective
  vote mechanics, first-message status, proof scope, and guarantee limits.
- **Next authorized action:** research artifact only. No contract design or implementation follows from
  this report.
- **Mutation safety:** this report is the sole tracked artifact created by this track. The source
  manifest is intentionally untouched per task scope.

### Primary sources

The maintained official repository was inspected at commit
[`919c433d09aa776a05ca2d89a0074324d6199e91`](https://github.com/privacy-ethereum/maci/tree/919c433d09aa776a05ca2d89a0074324d6199e91)
(2026-07-21, package version `3.0.0`). The former
`privacy-scaling-explorations/maci` URL currently redirects to `privacy-ethereum/maci`.

Primary documentation and author sources:

- [MACI v3 introduction and guarantee table](https://maci.pse.dev/docs/introduction)
- [MACI v3 workflow and coordinator trust assumptions](https://maci.pse.dev/docs/core-concepts/workflow)
- [MACI v3 key-change documentation](https://maci.pse.dev/docs/core-concepts/key-change)
- [MACI v3 process-messages circuit](https://maci.pse.dev/docs/technical-references/zk-snark-circuits/processMessages)
- [MACI v3 tally circuit](https://maci.pse.dev/docs/technical-references/zk-snark-circuits/tallyVotes)
- [MACI 1.0 technical introduction by Kyle Charbonnet](https://maci.pse.dev/blog/maci-1-0-technical-introduction)
- [MACI 1.0 release by Koh Wei Jie](https://maci.pse.dev/blog/maci-1-0-release)
- [Vitalik Buterin's original MACI proposal and author discussion](https://ethresear.ch/t/minimal-anti-collusion-infrastructure/5413)
- [HashCloak MACI v3 audit, stored in the official repository](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/apps/website/static/audit_reports/20260317_Hashcloak_audit_report.pdf)

Context7 was queried first as required, but it resolved “MACI” only to the unrelated `Macy.js` layout
library and had no useful MACI corpus. No Context7 answer was used; the official docs, repository, code,
audit, and author discussion were inspected directly.

### Documentation/code drift resolved

The high-level v3 workflow still describes a message Merkle tree and says final results are visible
immediately after `tallyVotes`. Current code is more precise:

- The v3 audit records that messages moved from a Merkle tree to a hash chain; the current `Poll`
  increments `numMessages`, updates the rolling `chainHash`, checkpoints batch hashes, and emits the
  ciphertext and ephemeral key in `PublishMessage`. See
  [`Poll.publishMessage`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/Poll.sol#L261-L283)
  and
  [`Poll.updateChainHash`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/Poll.sol#L309-L321).
- `Tally.tallyVotes` verifies and stores a *commitment*, not plaintext option totals. Plaintext result
  leaves become on-chain state only when someone supplies values, salts, and Merkle paths that verify
  against the final commitment through `addTallyResults`. See
  [`Tally.tallyVotes`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/Tally.sol#L124-L151)
  and
  [`Tally.addTallyResults`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/Tally.sol#L341-L425).

Where prose and current code differed, this report follows the pinned code.

## Exact participant and trust model

### Voter

**Verified.** A voter uses several credential layers in the current flow:

1. an Ethereum transaction sender used by signup/poll policies and to pay for direct calls;
2. a global MACI BabyJubJub key registered in the MACI state tree and inserted as the initial poll key
   during `joinPoll`;
3. any replacement poll key installed by a later valid command;
4. ephemeral ECDH keys used per encrypted message.

The join circuit explicitly constrains the initial poll public key to equal the public key derived from
the private key whose hash is in the global state tree. It hides the private key and Merkle path; it does
not make that public key unlinkable from the global signup. See
[`PollJoining.circom`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/circuits/circom/voter/PollJoining.circom#L32-L53).

The poll command is signed by the key currently committed in the poll state leaf. The Ethereum address
that submits `publishMessage` is not the voting credential; any address can relay a valid ciphertext.

### Coordinator

**Verified.** The coordinator is cryptographically the holder of the private key corresponding to the
public key fixed in the `Poll`. The current contracts are non-ownable for processing and tally calls:
any address can submit a proof, but only a party with the coordinator private key can construct the
message-processing witness because the circuit derives each ECDH shared key from it and constrains its
public-key hash to the poll's coordinator key. See the
[`MessageProcessor` public inputs](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/MessageProcessor.sol#L107-L134)
and [process-circuit statements](https://maci.pse.dev/docs/technical-references/zk-snark-circuits/processMessages#statements-that-the-circuit-proves).

The deployer and coordinator may be different, although official workflow prose often treats them as
one operational role.

### Coordinator power/limit matrix

| Capability | Status | Evidence and boundary |
|---|---|---|
| Decrypt commands | **Can** | The coordinator private key derives every ECDH shared key. Official docs explicitly say the coordinator can decrypt and even publish/bribe from votes. |
| Decrypt during the open period | **Can in principle** | **Inference from code/cryptography:** the private key and ciphertext are available at publication; the contract does not time-lock decryption. Docs describe processing after close as workflow, not a cryptographic restriction. |
| Link a decrypted command to poll state index | **Can** | The state index is inside the command. The joining proof hides the private witness/path, but the initial poll public key is constrained to equal the globally signed-up key. |
| Leak plaintext ballots | **Can** | ZK is zero knowledge toward public verifiers, not toward the witness holder. The official workflow names publication of ballots as a coordinator power. |
| Withhold processing proofs | **Can** | There is no fallback prover without the coordinator private key. The round can remain closed/unfinalized. |
| Withhold tally openings/results | **Can** | The proof stores commitments. Revealing tally leaves needs the openings/Merkle paths. The coordinator can withhold these even after proof generation. |
| Omit an included valid message while publishing an accepted transition | **Cannot, under proof assumptions** | Batch hash, state/ballot commitment, coordinator key, reverse decryption, and every validity transition are constrained by the process proof. |
| Count a forged user command | **Cannot, under proof/signature assumptions** | Validity requires signature verification under the current state key, correct nonce, valid indices, and sufficient credits. |
| Publish an arbitrary accepted tally | **Cannot, under proof assumptions** | Tally proofs bind ballot membership and accumulated result commitments; disclosed leaves must open the final commitment. |
| Modify a deployed poll's deadline/key/options | **Cannot through the normal interface** | These parameters are fixed during clone initialization. `publishMessage` is gated by fixed start/end dates. |
| Choose bad parameters at creation | **Can as deployer** | `MACI.deployPoll` accepts coordinator key, dates, policy, voice-credit source, relayers, vote options, tree depths, batch size, and mode. Users must assess the deployed instance before joining. |
| Censor a direct message before chain inclusion | **Not a special MACI power** | `Poll.publishMessage` is public during the window. Base-chain inclusion can still fail. A configured off-chain relayer can refuse its own batch path, but direct publication remains available. |

The important distinction is **safety versus liveness**: MACI strongly constrains what can be accepted,
but the sole decryption/proving key creates a hard liveness dependency.

## Current contract and protocol flow

### 0. Setup and poll deployment

**Verified.** `MACI` is constructed with a global signup policy, verifier, verifying-key registry,
factories, state-tree depth, and empty ballot roots. `MACI.deployPoll` deploys a `Poll`, a
`MessageProcessor`, and a `Tally` with fixed dates, tree/batch parameters, coordinator public key,
poll policy, voice-credit proxy, relayers, option count, and voting mode. See
[`MACI.deployPoll`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/MACI.sol#L164-L233).

### 1. Global signup — `MACI.signUp`

**Verified.** The caller supplies a BabyJubJub public key and policy evidence. The contract checks tree
capacity and curve membership, calls the configured policy against `msg.sender`, hashes the public key
into the global state tree, stores the new root, and emits the state index, timestamp, and public key.
Current v3 stores only the global public key at this stage; poll-specific voting credits are assigned
when joining a poll. See
[`MACI.signUp`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/MACI.sol#L140-L162).

### 2. Per-poll joining — `Poll.joinPoll`

**Verified.** Before the deadline, the voter submits:

- a poll-specific nullifier;
- a poll public key;
- an indexed global state-root snapshot;
- a ZK proof of knowledge/membership;
- poll-policy and voice-credit data.

The contract rejects a reused nullifier, verifies the joining proof, applies the poll eligibility policy
to `msg.sender`, obtains its poll-specific voice credits, and inserts `hash(pollPublicKey,
voiceCreditBalance)` into the poll state tree. See
[`Poll.joinPoll`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/Poll.sol#L357-L408).

**Boundary:** MACI supplies pluggable eligibility enforcement; it does not itself prove “one legitimate
human” or define a DAO snapshot. The guarantee is only as good as the chosen policies, nullifier, and
voice-credit source.

### 3. Publish encrypted commands — `Poll.publishMessage`

**Verified.** A command contains:

- poll state index;
- replacement public key (which may equal the existing key);
- vote option index;
- replacement vote weight;
- nonce;
- poll id;
- random salt.

The voter signs the command, derives an ECDH shared key with the fixed coordinator public key using a
fresh ephemeral keypair, and Poseidon-encrypts the command and signature. The contract checks only that
the ephemeral encryption public key is on-curve, increments the count, folds the message hash into the
rolling chain hash, and emits the ciphertext/key. Semantic validity remains private and is proved after
the poll. See the
[`VoteCommand` generation path](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/sdk/ts/vote/generate.ts#L52-L78)
and `Poll.publishMessage` cited above.

Messages can be posted directly, in a direct batch, or through an authorized relayer that commits
message hashes and an IPFS hash. Direct publication is not restricted to the voter's Ethereum address.

### 4. Close, pad, and merge

**Verified.** After `endDate`, anyone may call `padLastBatch` to checkpoint a partial final message batch
and `mergeState` once to freeze the poll state-tree root, derive actual tree depth, and initialize the
state-and-ballot commitment from the joined-user root and empty ballot root. See
[`Poll.padLastBatch`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/Poll.sol#L323-L335)
and
[`Poll.mergeState`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/Poll.sol#L477-L509).

### 5. Process messages — `MessageProcessor.processMessages`

**Verified.** Off-chain, the coordinator reconstructs the emitted/relayed message sequence and poll
state, decrypts messages, applies validity rules in reverse order, and generates one SNARK per batch.
On-chain, `processMessages(newSbCommitment, proof)`:

1. initializes from `Poll.currentSbCommitment` on the first batch;
2. pads/loads poll batch hashes and proceeds from the newest batch backward;
3. derives public inputs including signup count, output batch hash, actual state depth, coordinator key
   hash, option count, old/new state-ballot commitments, and batch bounds;
4. retrieves the verifying key for the exact tree/batch/mode parameters;
5. accepts only if the verifier validates the proof;
6. advances the commitment and marks processing complete after the oldest batch.

See
[`MessageProcessor.processMessages`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/contracts/contracts/MessageProcessor.sol#L58-L105).

### 6. Tally — `Tally.tallyVotes`

**Verified.** After processing completes, the coordinator tallies ballots off-chain in forward state
index batches and proves each accumulator transition. Each call verifies a proof from the final
state-ballot commitment and current tally commitment to a new tally commitment. The final commitment
covers a result-tree root plus salts and, depending on QV/non-QV/full mode, spent-credit data. It does
not expose individual ballots.

### 7. Open and verify aggregate results

**Verified.** A party with the tally openings supplies option totals, a common result salt, Merkle paths,
and spent-credit commitments. `verifyTallyResult` recomputes the result-tree root and checks it against
the proved final commitment; `addTallyResults` persists verified plaintext leaves and total spent
credits. This is a separate disclosure transaction from `tallyVotes`.

**Architecture lesson:** a proof of a hidden commitment is not yet a usable governance result. Result
availability, permitted granularity, quorum policy, and adapter execution remain explicit protocol
steps.

### Legacy four-phase mapping

| Familiar MACI 1.0 phase | MACI 1.0 call | Current v3 equivalent/extension |
|---|---|---|
| Sign up | `MACI.signUp` | `MACI.signUp`, then required per-poll `Poll.joinPoll` with a membership proof and poll-specific credits |
| Publish message | `Poll.publishMessage` | Same direct call, plus batch/relayer paths and hash-chain checkpoints |
| Process messages | `PollProcessorAndTallyer.processMessages` | Separate `MessageProcessor.processMessages` contract with one proof per reverse batch |
| Tally results | `PollProcessorAndTallyer.tallyVotes` | Separate `Tally.tallyVotes`, followed by opening/verification and optionally `addTallyResults` |

## Exact state, key-change, and re-vote mechanics

### State objects

**Verified.** At processing time each real poll participant has:

- a **state leaf**: current MACI/poll public key plus remaining voice-credit balance;
- a **ballot**: an array of weights by option plus a nonce starting at `0`.

The command's replacement public key is part of every vote command. There is no wholly separate
on-chain “change key” method; a valid vote command may also change the key. The maintained
[`Ballot` documentation](https://maci.pse.dev/docs/core-concepts/ballot) states that the first valid
processed command must use nonce `1`.

### Validity predicate

**Verified.** The non-QV circuit illustrates the shared core checks:

1. `stateTreeIndex < totalSignups` (with index zero reserved for the blank leaf);
2. `voteOptionIndex < voteOptions`;
3. `commandNonce == ballotNonce + 1`;
4. the command signature verifies under the public key currently in the state leaf;
5. the requested replacement weight is affordable.

See
[`MessageValidatorNonQv`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/circuits/circom/utils/non-qv/MessageValidator.circom#L45-L90).
QV and full-credit modes adjust the credit rule, not the key/nonce principle.

For a valid command, the state/ballot transformer selects the replacement key and command nonce;
downstream logic replaces the requested option weight and updates remaining credits. For an invalid
command, multiplexers select the unchanged state. See
[`StateLeafAndBallotTransformerNonQv`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/circuits/circom/utils/non-qv/StateLeafAndBallotTransformer.circom#L70-L104)
and the matching
[`Poll.processMessage` model](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/core/ts/Poll.ts#L302-L421).

### Why reverse order matters

Suppose the on-chain publication order is:

1. Alice's original-key vote for A, nonce `1`, keeping key `K1`;
2. a briber-induced key change/vote involving key `K2`;
3. Alice's later original-key vote for B, nonce `1`, replacing the key with `K3`.

The circuit considers message 3 first against the initial poll state `(key=K1, nonce=0)`. If valid,
state becomes `(key=K3, nonce=1)` and B's weight is applied. Messages 2 and 1 are then evaluated against
that new state and normally fail signature and/or nonce checks. Thus the briber cannot make transfer to
`K2` irrevocable while Alice still controls `K1` and can publish a later nonce-`1` command before close.

The current docs explicitly say reverse processing was introduced to counter a voter handing control to
a briber and later being unable to recover. The code performs the reverse traversal in
[`Poll.processMessages`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/core/ts/Poll.ts#L627-L704).

### Explicit vote invalidation

**Verified.** The maintained SDK's `invalidateVotes` helper publishes a command signed by the user's
poll private key with:

- a fresh random replacement public key;
- nonce `1`;
- option `0` and weight `0`.

Because it is processed before older messages, those older commands would need to have been signed by
the fresh unknown key to form a valid reverse chain. They therefore become ineffective. See
[`invalidateVotes`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/sdk/ts/vote/invalidate.ts#L11-L53).

### Multi-command nuance

**Verified.** Reverse processing does not mean only one message per voter can ever be valid. A client
may publish a logical nonce chain in reverse: an earlier on-chain command with nonce `2`, signed by the
key that a later on-chain nonce-`1` command installs, can become valid when processed after that key
change. The SDK warns batch submitters to order messages in reverse nonce order and reverses its own
batch before submission. See
[`submitVoteBatch`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/sdk/ts/vote/submit.ts#L23-L46)
and
[`publishBatch`](https://github.com/privacy-ethereum/maci/blob/919c433d09aa776a05ca2d89a0074324d6199e91/packages/sdk/ts/vote/publish.ts#L95-L120).

That distinction matters for any later Nox design: “one active vote per wallet” is not MACI's actual
state machine, and copying only a last-write-wins mapping would not reproduce its anti-collusion logic.

## First-message bribery: exact issue and current mitigation status

### Original 2019 attack

**Verified historical fact.** The original proposal processed messages forward. Its receipt-freeness
argument was that a voter who revealed a ciphertext and plaintext for action A could not prove there
was no *earlier* hidden key-change message that made A invalid. In the author discussion, Barry
WhiteHat observed that the first message after `T_start` has no possible older message, so its sender
can initially prove the absence of such a prior key change. He extended this to voting and then
invalidating/burning the key to make the bribed action stick.

Vitalik's immediate mitigation suggestions were:

- default software should make every voter switch to another key immediately after `T_start`, making
  the unique first position hard to capture;
- or the operator could receive key-switch messages through another channel and include them before
  the official period.

These are deployment/client policies in the discussion, not a contract-enforced theorem. The same
thread explicitly leaves trusted-hardware key selling, coercer-controlled original keys, and endpoint
monitoring outside the basic guarantee.

### Current v3 status

**Verified.** v3 changed the construction:

- messages are processed newest-to-oldest;
- the first *valid message processed* for a ballot must have nonce `1`;
- any valid command can replace the public key;
- the voter can publish another original-key nonce-`1` command later and supersede earlier public
  actions;
- an explicit SDK helper can rotate to a fresh random key and invalidate prior votes.

**Verified absence.** Current contracts and SDK do **not** mandate that a voter's first published
message replace their key with a different fresh key. `generateVote` uses `newPublicKey ??
keypair.publicKey`, and the normal `publish` path accepts the caller-supplied poll public key. Therefore
the sentence “MACI mandates the first message be a key change” is not supported by maintained v3 code.

### Residual coercion limits

**Inference, consistent with the primary sources.** Reverse re-voting makes a static receipt unreliable
because the voter may have submitted an unlinkable effective command. It does not defeat a briber who:

- controls the voter's signing key or voting client for the whole window;
- continuously monitors the endpoint or physically observes every action;
- can prevent the voter from publishing a later command;
- bribes on the aggregate outcome rather than an individual's receipt;
- acts at a boundary where the voter has no practical chance to override.

**Unknown:** no maintained MACI document found in this review provides a formal current-v3 proof that
the 2019 first-message/burn-key family is completely eliminated. The honest claim is *receipt
unreliability under the declared coordinator/key/endpoint assumptions*, not universal coercion
resistance.

## Where zero knowledge enforces correctness—and where it does not

### Joining proof

**Verified.** The join circuit proves knowledge of the global MACI private key and inclusion of the
corresponding signup key, derives a poll-specific nullifier, and binds a poll public key and poll id.
This lets the poll accept a new state leaf without exposing the private key or Merkle path. It does not
hide the initial public key's link to global signup. The separate poll policy and voice-credit proxy
still define practical eligibility and weight.

### Process-messages proof

**Verified.** For each batch the process circuit proves that:

- the prover knows the old state root, ballot root, and salt opening the old commitment;
- the coordinator private key corresponds to the poll's fixed coordinator public-key hash;
- the supplied ciphertexts/ephemeral keys match the committed batch hash;
- every command is decrypted and processed in reverse order;
- the state-index, option, signature, nonce, and credit rules are applied;
- the resulting roots and fresh salt open the new state-ballot commitment.

This is the proof that prevents an accepted coordinator from silently treating a valid included vote as
invalid or inventing a valid vote.

### Tally proof

**Verified.** For each batch the tally circuit proves that the ballots are members of the final ballot
tree committed by message processing and that accumulating their option weights produces the new
result/spent-credit commitment. The final plaintext totals remain hidden until their salted result-tree
leaves are opened.

### ZK does not prove

- that the coordinator never decrypted, copied, logged, leaked, or sold individual commands;
- that the coordinator waited until the deadline to decrypt;
- that the coordinator will generate or publish proofs and openings;
- that an eligible voter is a unique human or has the intended DAO weight—the configured policies and
  credit proxy decide that;
- that the Ethereum address, timing, participation, or network metadata is anonymous;
- that the user's endpoint and key custody were free from coercer control;
- that a low-turnout aggregate is privacy-safe;
- that a governance adapter executes the intended semantic proposal;
- that the circuits/contracts/verifying keys/setup are bug-free. Correct execution is conditional on
  those implementation and cryptographic assumptions.

## Guarantee-by-guarantee assessment of MACI

| Guarantee | MACI mechanism | What is actually obtained | Trust/failure boundary |
|---|---|---|---|
| **Privacy** | ECDH/Poseidon encryption to the coordinator; ZK hides witnesses while proving transitions | Public observers should not learn commands or individual ballots; only aggregates/openings need be public | The coordinator can decrypt; endpoint, key, encryption, circuit, and metadata risks remain |
| **Receipt-freeness** | Encrypted/unlinkable commands, reverse processing, key replacement, nonces, deliberate invalid messages/re-votes | A revealed command is not reliable proof that it was effective under the hidden reverse-valid chain | Coordinator knows validity; full-session key/client control and timing/coercion attacks remain; first-published fresh rotation is not mandated |
| **Collusion/bribery resistance** | Receipt unreliability makes individual conditional bribes hard to settle | Conditional on an honest non-colluding coordinator and a voter retaining some override channel | Coordinator collusion, group/outcome bribes, coercer-controlled devices/keys, and denial of override are outside the core protection |
| **Uncensorability** | Public direct publication; immutable event/hash chain; process proof covers committed batches | An included valid command cannot be omitted from an *accepted* transition; any sender can relay a direct ciphertext | Base-chain inclusion, deadline races, relayer censorship, and coordinator refusal to finalize are liveness gaps |
| **Unforgeability** | Poll membership/nullifier plus EdDSA signature under current state key, nonce, indices, and credits in circuit | A coordinator/public caller cannot make a command valid without the relevant current private key | Compromised/sold keys and flawed eligibility policies defeat the intended identity meaning |
| **Non-repudiation** | Published ciphertext/event and rolling hash are immutable; proofs preserve the ordered set; only a valid later command changes effectiveness | No one can delete history; an authorized re-vote or key change can supersede it under public rules | The public cannot classify each hidden command; coordinator can refuse to prove/finalize |
| **Correct execution** | Process and tally SNARKs; parameter-specific verifying keys; on-chain proof verification; commitment openings | Contracts reject a state transition, tally commitment, or result leaf inconsistent with proved rules | Soundness depends on circuits/contracts/verifier/VKs/setup; liveness and privacy against the coordinator are not proved |

The official guarantee word “uncensorability” should be read narrowly: **safety of included valid
messages in an accepted result**, not guaranteed inclusion and completion under a malicious coordinator.

## What replacing the coordinator with a Nox TEE would remove, move, and retain

This section states comparison requirements, not a Nox architecture. Nox-specific primitives and proof
semantics must be established by the separate released-Nox research track.

### Potentially removed—only if verified end to end

1. **Human/operator plaintext access.** If encryption terminates only inside attested code, keys are
   released only to that code, no host/admin/viewer can decrypt, and plaintext never escapes through
   output, logs, errors, storage, or side channels, the coordinator operator no longer intentionally
   sees each vote.
2. **Discretionary off-chain validity decisions.** A fixed confidential program can deterministically
   apply the effective-vote rules rather than relying on coordinator software behavior—provided its
   exact code identity and inputs are bound to the accepted result.

These are conditional improvements. “TEE cannot leak or be bribed” is not a verified architectural
statement without those boundaries.

### Moved into a new trust boundary

1. **Confidentiality trust:** from a human holding the coordinator private key to enclave code,
   hardware/firmware, attestation, KMS/key release, deployment identity, upgrade policy, and every output
   path.
2. **Correctness trust if MACI SNARKs are removed:** from public circuit verification to the correctness
   of the attested program and whatever Nox proof actually binds. A signed/public decryption proof may
   prove that a ciphertext/handle decrypted to a plaintext; it does not necessarily prove that the
   plaintext is the result of processing every eligible ballot under the intended state machine.
3. **Availability trust:** from one coordinator prover to the Nox/KMS/worker/operator path. A TEE can
   still be offline, censored, upgraded, or refused key release.
4. **Key-compromise trust:** from one coordinator key to the Nox key-management topology. Whether this
   is stronger or weaker is a Nox fact to verify, not assume.

### Retained protocol problems

- an on-chain commitment to every submitted ballot and its exact order;
- a deterministic, reviewable re-vote/key-override rule;
- a way to prevent one voter/credential from creating multiple effective poll identities;
- unforgeability and immutable eligibility/weight snapshot semantics;
- inclusion recovery and a truthful halt/failure state;
- deadline and last-moment coercion behavior;
- endpoint/key-control and shoulder-surfing attacks;
- public participation/timing metadata unless a separate anonymity layer exists;
- low-turnout aggregate leakage and a minimum-disclosure policy;
- final result availability and governance-adapter execution.

### Proof-equivalence question that must remain open

**Unknown pending Nox research:** What exact public statement does the released Nox proof verify?

For parity with MACI correctness, the accepted evidence would have to bind at least:

1. the full ordered set/commitment of eligible submitted ciphertexts;
2. the proposal/poll identifier and immutable parameters;
3. the voter credential/weight snapshot and duplicate-prevention rule;
4. the exact re-vote/override state transition;
5. the tally and quorum/disclosure computation;
6. the final plaintext aggregate accepted by the governance adapter;
7. the exact authorized confidential code identity and key-access policy.

Until that is proved, “MACI's coordinator becomes a TEE” is a useful product hypothesis, not a complete
correctness argument.

## Architecture lessons to carry into synthesis

1. **Specify the effective-vote state machine before choosing encryption.** MACI's anti-bribery value
   is in the hidden validity chain: current key + exact next nonce + replacement key + reverse order +
   immutable message inclusion.
2. **Do not expose a public `activeVote[voter]` replacement flag that reveals which ciphertext won.**
   MACI's public cannot classify the effective message; the proof can.
3. **Separate inclusion safety from finalization liveness.** A proof can make omission detectable while
   the sole confidential actor can still halt the round.
4. **Keep result opening explicit.** A commitment proof, a disclosed aggregate, and governance execution
   are three different transitions.
5. **Treat “re-vote” as a coercion recovery window, not a universal receipt-free proof.** Its value
   depends on the voter retaining a secret key, access to an inclusion path, and enough time before the
   deadline.
6. **Do not claim the original first-message problem is solved by copying a nonce.** Current MACI's
   reverse processing is a substantial redesign, and current code still does not mandate a fresh first
   published key rotation.
7. **Preserve public verifiability when removing the human coordinator.** Confidential execution is a
   privacy mechanism. It replaces MACI's correctness proof only if the evidence binds the same complete
   ordered transition.
8. **Make coordinator/TEE failure a named terminal product state.** An indefinitely “processing” vote is
   not uncensorable governance.
9. **Eligibility is upstream of MACI.** Policy and credit-source correctness must be fixed before voting;
   MACI does not manufacture sybil resistance or a token snapshot.
10. **Keep the honest pitch asymmetric.** A Nox TEE may improve MACI's coordinator-confidentiality seam;
    MACI's mature SNARK pipeline may remain stronger for publicly proving the entire effective-vote and
    tally transition.

## Remaining unknowns for later tracks

1. Does released Nox attest arbitrary confidential computation, or only authorize/decrypt outputs?
2. Can its public proof be verified on-chain and bound to ordered ballot commitments and code identity?
3. Who can ultimately obtain/decrypt handle plaintext under the current KMS/ACL topology?
4. Can a confidential program maintain and prove a MACI-like reverse-valid command chain without
   reproducing MACI's circuits?
5. What recovery exists if the confidential worker/KMS never completes a tally?
6. How will the selected DAO integration bind eligibility and weights at a fixed proposal snapshot?
7. What minimum turnout/ambiguity policy blocks aggregate inference?
8. Is a forced fresh key rotation at first use technically and ergonomically justified, or does a
   different override construction better address the current threat model?

No final Nox contract decomposition, user flow, or toolchain choice is approved by this report.
