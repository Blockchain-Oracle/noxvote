# Open-source Private-voting Landscape

**Date:** 2026-07-29  
**Purpose:** Identify mechanisms, trust boundaries, production lessons, and failure modes that matter
to a confidential-governance module on Nox. This is a facts-first research artifact, not an approved
implementation design.

## Scope

The study covers maintained or academically significant open-source systems that contribute at least
one of the following: encrypted ballots, hidden interim results, aggregate-only decryption, anonymous
eligibility, verifiable tallying, re-voting, receipt resistance, or an integration pattern relevant to
DAO governance.

The systems inspected are MACI, Shutter/Snapshot, ElectionGuard, Helios, Belenios, VoteAgain, Cicada,
Semaphore, Vocdoni DAVINCI, Oasis Sapphire, and Nox. The first-pass MACI, Shutter, Oasis, and Nox
findings remain in their dedicated reports and are summarized here only to compare the full field.

## Sources Checked

Pinned source commits are recorded in
[`../sources/source-manifest.md`](../sources/source-manifest.md). The principal new sources were:

- [ElectionGuard 2.1 specification and concepts](https://electionguard.vote/spec/) and the
  [official source repository](https://github.com/Election-Tech-Initiative/electionguard);
- [Helios source](https://github.com/benadida/helios-server) and the
  [official Helios service](https://www.heliosvoting.org/);
- [Belenios source](https://gitlab.inria.fr/belenios/belenios) and the
  [official protocol instructions](https://www.belenios.org/instructions.html);
- [VoteAgain paper and artifacts](https://www.usenix.org/conference/usenixsecurity20/presentation/lueks),
  plus the later [weaker-trust analysis](https://orbilu.uni.lu/handle/10993/54382);
- [Cicada source](https://github.com/a16z/cicada);
- [Semaphore source](https://github.com/semaphore-protocol/semaphore) and
  [official documentation](https://docs.semaphore.pse.dev/);
- [DAVINCI paper](https://github.com/vocdoni/davinci),
  [contracts](https://github.com/vocdoni/davinci-contracts), and
  [current Vocdoni application](https://github.com/vocdoni/vocdoni-app).

Context7 resolved the maintained Semaphore corpus as `/semaphore-protocol/semaphore`; the retrieved
documentation confirmed that a proof exposes a public message and scope while proving membership and
deriving a scope-specific nullifier. Current repository code was used where the examples lagged the
maintained v4 contracts.

## Vocabulary Required For Honest Comparison

These properties are independent. A product cannot use “private voting” as a substitute for naming
which of them it provides.

| Property | Precise question |
|---|---|
| Choice confidentiality | Can the public map a voter to a choice? |
| Interim-result privacy | Can anyone learn option totals before close? |
| Permanent ballot privacy | Are individual choices still secret after tally? |
| Participation anonymity | Can the public learn that a particular voter participated? |
| Receipt-freeness | Can a voter convincingly prove the effective choice to a third party? |
| Coercion recovery | Can a voter change a coerced vote before close? |
| Cast-as-intended verification | Can the voter challenge a dishonest client encryption? |
| Recorded-as-cast verification | Can the voter find the accepted encrypted ballot or commitment? |
| Universal tally verification | Can anyone independently verify inclusion, processing, and tally? |
| Key decentralization | Must one key holder be trusted not to decrypt or withhold? |

## Verified Facts By System

### MACI: hidden effective-vote state plus proved processing

- The coordinator can decrypt commands and therefore remains trusted for voter privacy and
  availability.
- Reverse-order command processing, a hidden current state key, command signatures, and exact nonces
  make a revealed early command unreliable evidence of the final effective vote.
- Process and tally SNARKs constrain the accepted transition and result; they do not stop the
  coordinator from leaking plaintext or refusing to finish.
- MACI is the strongest direct lesson for anti-collusion, but its property does not reduce to encrypted
  storage plus public latest-write-wins.

### Shutter/Snapshot: production integration and threshold release

- Classic Shielded Voting encrypts choices in the client and uses a threshold Keyper set to release
  the proposal key after close.
- The deployed Snapshot path later decrypts individual ballots; it provides interim-result privacy,
  not permanent individual-choice privacy or receipt-freeness.
- The permanent threshold-ElGamal design aggregates ciphertexts and opens only the tally, but the
  inspected implementation remains a proof of concept.
- Its proposal toggle, normal voting flow, visible participation, automatic post-close transition,
  and host-level integration are the most relevant product lessons.

### ElectionGuard: public evidence and cast-or-spoil

- Guardians jointly establish an election key and a quorum of guardians is required at tally time.
- Each selection is ElGamal-encrypted and accompanied by zero-knowledge proofs that constrain ballot
  validity. Cast ciphertexts are homomorphically accumulated and only the aggregate is decrypted.
- Voters receive confirmation codes. A ballot may instead be challenged/spoiled and opened, allowing
  the voter to test whether the device encrypted the intended selections; that challenged ballot is
  not counted and the voter can prepare another.
- The published election record contains encrypted cast ballots, proofs, the encrypted aggregate,
  decryption shares/proofs, and opened challenged ballots so independent verifiers can reproduce the
  verification.
- This is a verifiability model, not a remote coercion-resistance mechanism. A voter who knows the
  client randomness or operates under supervision is not protected merely by aggregate decryption.

### Helios: mature end-to-end verifiability with visible re-voting

- Helios encrypts ballots, publishes ballot trackers, verifies ballot well-formedness, computes a
  homomorphic tally, and uses trustee decryption factors/proofs to open the aggregate.
- Its server stores every `CastVote`, while the voter's current row points to the newest verified
  ballot. Product copy explicitly says that voters may re-vote and only the last vote counts.
- The bulletin-board and tracker model gives useful recorded-as-cast feedback. It also makes the
  existence and sequence of re-votes observable; it is not MACI-style deniability.
- Optional public aliases can hide direct names in the tracking view, but the system's authentication,
  server, and election configuration remain separate trust boundaries.

### Belenios: formally specified public archive, credentials, and trustee separation

- Belenios separates an administrator, credential authority, voting server, trustees, and voters; its
  strongest configuration assigns those roles to different entities.
- Ballots contain ElGamal ciphertexts, well-formedness proofs, and signatures under voting
  credentials. The server maintains a hash-chained public archive of election events and ballots.
- Multiple ballots under one credential are permitted; the tally keeps only the last. The audit tools
  verify that removal occurs only through same-credential replacement.
- Simple questions use homomorphic aggregation and reveal only option totals. More expressive ballots
  can be shuffled and opened in random order, trading a different disclosure shape for flexibility.
- Threshold trustees collectively decrypt. The web service can collapse roles into one operator in
  its simplest and weakest configuration.
- Core Belenios re-voting is visible replacement, not receipt-freeness. BeleniosRF is a separate
  construction and relies on an honest voting server for that property.

### VoteAgain: hide the fact of a later override, with a major trust warning

- VoteAgain encrypts ballots, uses re-voting, and has a tally server shuffle and filter so only the
  latest ballot per voter remains.
- Deterministic dummy-ballot padding hides per-voter re-vote patterns that otherwise reveal whether a
  coerced vote was replaced. Trustees then verifiably mix and decrypt selected ballots.
- The repository is an experimental implementation of core cryptographic procedures and explicitly
  says it is not production-ready.
- Later peer-reviewed analysis found that the original design requires one election authority to be
  trusted for all security properties, contrary to its original weaker-trust claim, and proposed a
  modified construction. VoteAgain is therefore a mechanism reference and warning, not a production
  dependency.

### Cicada: no tally authority, but eventual per-ballot disclosure

- Cicada uses homomorphic time-lock puzzles to hide a running tally without relying on a tally key
  holder. Anyone can solve and finalize after the calibrated delay.
- On-chain proofs constrain a ballot to an allowed plaintext such as `0` or `1`; the aggregate puzzle
  is updated homomorphically.
- Every individual time-lock puzzle can also be solved after the delay. Cicada therefore needs a
  separate anonymity layer such as Semaphore if eventual decrypted ballots must not map to identities.
- The example verifies neither that the RSA modulus has unknown factorization nor that the time-lock
  base and delay parameters were generated correctly. The repository is unaudited and its example
  uses a single-vote nullifier rather than re-voting.

### Semaphore: anonymous eligibility, not private voting

- A Semaphore proof shows that the prover knows a secret belonging to a Merkle group without revealing
  which member produced it.
- The message and scope are public proof inputs. The nullifier is derived from the secret and scope, so
  the same identity cannot signal twice under the same scope when the application burns nullifiers.
- Semaphore neither encrypts a choice nor computes a private tally. A private-voting application must
  combine it with an encrypted-ballot system.
- Current contracts also expose proof verification without nullifier consumption. That makes more
  flexible application policies possible, but anonymous re-voting still needs a carefully defined
  stable pseudonym/latest-vote rule and must be reconciled with Nox's input-owner binding.

### DAVINCI: proof-enforced voting state with ciphertext refresh

- DAVINCI models an election as off-chain state transitions committed on Ethereum. Voters submit an
  encrypted ballot, ballot-validity proof, census proof, identity proof, and a fresh vote identifier to
  a sequencer.
- The state circuit maintains one census-authenticated ballot slot per voter. A replacement subtracts
  the old encrypted contribution, adds the new one, and proves the transition.
- Sequencers re-encrypt submitted ciphertexts and also refresh a random subset of stored ciphertexts.
  This is intended to break the voter's encryption-randomness receipt and to make an overwrite
  indistinguishable from ordinary refresh activity.
- A DKG-generated threshold ElGamal key is intended to prevent any one Keywarden from decrypting an
  individual ballot. Only the aggregate is threshold-decrypted, with a final result proof verified by
  the contract.
- The ballot abstraction supports bounded vectors for single-choice, approval, ranking, cumulative,
  and quadratic rules. State-transition batches use recursive Groth16 proofs and publish transition
  data through Ethereum blobs.
- The authors report roughly ten seconds for browser ballot proving and a fixed on-chain settlement
  verification cost for a batch. These are author benchmarks, not independent production measurements.
- The current implementation is work-in-progress, unaudited, and the DKG exists but is not integrated
  into the live protocol. Long-term availability after blob pruning is explicitly open.

### Nox and Oasis: confidential computation with a selective release boundary

- Nox can operate on encrypted handles and publicly decrypt only a selected derived handle. This fits
  permanent ballot privacy and verdict-only disclosure if ballot handles never receive viewers or
  public-decryption permission.
- Released Nox does not provide the hidden signatures/nonces of MACI, the ciphertext re-randomization
  of DAVINCI, or the universal transition proofs of the ZK systems above.
- The current single-node KMS holds the full key, so its key-compromise and availability model is
  weaker than threshold-Keyper/guardian/trustee systems.
- Oasis demonstrates confidential-state replacement voting and delayed aggregate release, but its
  signed request model remains receiptable. It is evidence for the state-update pattern, not a proof of
  receipt-freeness.

## Architecture Families

| Family | Examples | What it buys | Central residual risk |
|---|---|---|---|
| Coordinator plus ZK transition proofs | MACI | Hidden command processing and publicly constrained result | Coordinator reads votes and may halt |
| Threshold release encryption | Shutter classic | No early decryption below threshold | Individual ballots become readable after release |
| Homomorphic tally plus threshold decryption | ElectionGuard, Helios, Belenios | Permanent ciphertexts and aggregate opening with public proofs | Trustee setup/liveness; receipts remain possible |
| Time-lock homomorphic tally | Cicada | No tally key authority | Parameter trapdoors and eventual individual decryption |
| Anonymous membership/nullifier | Semaphore | Hide which eligible member acted; prevent repeated scope use | No choice secrecy or private tally by itself |
| Padded filter/mixnet | VoteAgain | Hide which re-vote became effective | Original design's election-authority trust failure |
| ZK state machine plus ciphertext refresh | DAVINCI | Proof-enforced replacement, unlinkable stored ciphertexts, aggregate-only opening | Complex proving/DKG/DA stack; currently unaudited WIP |
| TEE selective computation/disclosure | Nox, Oasis | Flexible private computation and narrow public output | Hardware/operator/KMS/gateway trust; limited public correctness proof |

## Cross-system Lessons That Survive Translation To Nox

These are evidence-backed inferences rather than claims that Nox already implements the source
mechanism.

1. **A ballot receipt must be designed out.** Encryption alone only hides the choice from observers.
   MACI invalidates disclosed early commands through hidden state; VoteAgain hides replacement patterns
   with padding; DAVINCI changes the public ciphertext through third-party re-randomization.
2. **Re-voting has two separate jobs.** Latest-vote-wins corrects mistakes and gives a recovery window.
   Hiding whether or how a replacement occurred is the additional anti-coercion job. Released Nox can
   support the first, not the second by itself.
3. **Verification needs a public record.** ElectionGuard, Helios, and Belenios publish enough artifacts
   for inclusion and tally checks. A gateway signature on one decrypted Nox handle proves the
   handle/plaintext association, not ballot inclusion or the complete confidential transition.
4. **Identity and choice privacy are separate layers.** Semaphore can hide the eligible member, while
   Nox can hide the choice. Combining them is plausible only after resolving input ownership,
   relaying, weighted eligibility, stable re-vote identity, and denial-of-service behavior.
5. **Threshold key custody is a substantive control.** Shutter Keypers, ElectionGuard guardians,
   Belenios trustees, and intended DAVINCI Keywardens all avoid one full decryption key holder. This is
   stronger than the current Nox KMS topology.
6. **The product must show asynchronous and failure states.** Tallying, proof generation, key shares,
   and result publication all fail independently in mature systems. “Closed” cannot mean “final.”
7. **A privacy floor is disclosure policy, not governance quorum.** Even outcome-only publication can
   expose a choice in a tiny or uniquely weighted electorate. Insufficient privacy participation must
   end with a deliberately withheld result.
8. **Module-shaped UX wins adoption.** Shutter, ElectionGuard integrations, OpenZeppelin Governor
   extensions, Safe modules, and the current Vocdoni organizer flow all keep privacy as a proposal
   configuration within a familiar governance process.

## Unknowns Remaining Before Implementation

- Whether a released Nox input can be relayed while preserving an owner-bound anonymous eligibility
  proof, and whether that can support replacement voting without publishing a stable voter link.
- Whether the real Nox operation queue can safely and deterministically reverse a previous encrypted
  weighted choice under concurrent re-votes.
- Whether a public append-only operation record can provide useful recorded-as-cast assurance without
  becoming a convincing choice receipt.
- Whether the product should expose only a verdict or allow an organizer-selected exact aggregate
  mode after a stronger privacy floor.
- Whether a future receipt-resistant mode should use MACI circuits, threshold re-randomization, or a
  DAVINCI-like state proof. Any of these is a different cryptographic architecture, not a Nox flag.

## Not Included As Product Claims

- No system above establishes that a released Nox-only module is receipt-free, bribe-proof, anonymous,
  or universally verifiable.
- DAVINCI author benchmarks and guarantees are not treated as production evidence.
- Existing hackathon projects are not used as a product gate, novelty gate, or scope constraint.
- This report does not authorize contracts, deployment, public claims, or a dependency choice.
