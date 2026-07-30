# Research Brief — Confidential Voting on Nox

> **Historical research seed; current product authority is
> [CURRENT.md](../decisions/CURRENT.md).** The module shape, permanent public-chain choice
> confidentiality, re-voting, and privacy-floor intent remain useful. The original anti-bribery target,
> builder-disqualifier framing, claim that the voter encrypts locally, and candidate MVP positioning are
> superseded. Technical and competitor claims remain hypotheses unless verified in the current research.

**For:** research agents  
**Goal of the agents:** extract concrete architecture lessons from the systems that already solved
private on-chain voting, so we design the Nox-native version the right way—inspired by them, better
on the one axis they leave open.

## 1. What we are building

A **confidential voting module** for DAOs/governance on Nox—not a whole DAO app. Released Nox's SDK
sends the encoded choice to the attested Handle Gateway, which encrypts it and returns the opaque handle
used in the wallet transaction. The public chain never receives the support value. Nox computes over
the encrypted ballot state and the product publicly opens only the final verdict after a privacy floor.
Individual choices and exact option totals never become public. It plugs into an existing Governor or
Safe rather than replacing governance. It does not claim receipt-freeness or bribery/coercion resistance.

## 2. Why this is our edge

Other builders and prior voting-positioned projects are informational research, not product-selection
or build gates. Mature implementations on other chains are architecture and production-UX assets. The
intended product gap is that many tools hide votes during the round and then reveal every individual
choice after close. The Nox design should never publish those choices or exact totals and should reveal
only the governance verdict required for execution.

## 3. Reference systems

### A. MACI — Privacy & Scaling Explorations / Ethereum Foundation

Extract:

- The full guarantee set: collusion resistance, receipt-freeness, privacy, uncensorability,
  unforgeability, non-repudiation, and correct execution.
- The coordinator model. MACI relies on a coordinator that can decrypt votes while zk-SNARKs prevent
  it from faking the tally. Determine exactly what the coordinator can and cannot do and which seam
  a TEE genuinely improves.
- The key-change/re-vote mechanism. A voter can change keypair and re-vote, nullifying an earlier
  vote, so they cannot prove to a briber how they ultimately voted. Explain the bribe-at-start attack
  and the proposed mitigation of requiring the first message to be a key change.
- The four-phase workflow: sign up, publish message, process messages, tally. Map phases to contracts
  and calls.
- The exact role of zk-SNARKs in proving correct processing and tally execution.

Starting sources: MACI introduction; “Technical Introduction to MACI 1.0”; MACI 1.0 release
announcement. Research agents must prefer maintained official documentation and repositories when
they differ from older articles.

### B. Shutter Shielded Voting — Shutter Network + Snapshot

Extract:

- Threshold encryption, Keypers, and distributed key generation. Determine what a single party or a
  colluding minority below threshold can and cannot decrypt or censor. Contrast this honestly with
  the current single-KMS-node Nox MVP.
- Classic versus Permanent Shielded Voting. Classic is expected to hide votes during the round and
  later reveal individual votes. Permanent is expected to use threshold-homomorphic ElGamal plus ZK
  to keep individual votes private while making the tally verifiable. Verify both claims and the
  current production status.
- UX and integration lessons: one-click enablement, per-proposal toggle, module/service integration
  into an existing governance platform, and showing turnout/quorum without revealing choices.

Starting sources: Shutter shielded-voting pages and the Shutter articles about Permanent Shielded
Voting and homomorphic encryption.

### C. Honorable mentions

- **Oasis Sapphire confidential voting:** closest TEE-based architectural cousin; inspect how it
  frames confidential-computing trust for governance.
- **Vocdoni/Semaphore:** identity, eligibility, and anonymity primitives only; avoid expanding the
  MVP without evidence that a uniqueness layer is required.

## 4. Guarantee checklist

For each item, answer whether the proposed Nox design provides it and how:

1. **Privacy:** no one except the intended TEE trust boundary can read an individual vote.
2. **Receipt-freeness:** a voter cannot prove to a briber how the effective vote was cast.
3. **Collusion/bribery resistance:** follows from receipt-freeness only under an explicit adversary
   model.
4. **Uncensorability:** no authorized operator can silently drop a valid vote without detection or
   recovery.
5. **Unforgeability:** only an eligible key owner can cast the voter's effective vote.
6. **Non-repudiation:** a cast vote cannot be secretly deleted; an authorized re-vote may supersede it.
7. **Correct execution:** neither an operator nor the confidential-compute path can make the on-chain
   system accept a false tally under the declared proof/trust model.

## 5. Starting comparison to verify

| Requirement | MACI hypothesis | Shutter hypothesis | Nox hypothesis |
|---|---|---|---|
| Hide vote | Encrypt to coordinator key | Threshold encryption | Encrypt to handle plus proof before broadcast |
| Private tally | Coordinator processes off-chain | Homomorphic aggregation in permanent design | TEE arithmetic/comparison/select over handles |
| Honest tally | zk-SNARK verification | ZK/verifiable encrypted tally | Public decryption plus signed proof verified on-chain |
| Reveal only result | Selective reveal | Aggregate reveal, individual ciphertext retained | Only aggregate handle made publicly decryptable |
| Trusted party | Coordinator for privacy, proofs for correctness | Threshold Keyper set | TEE plus current KMS design |

Candidate positioning to pressure-test: “MACI's privacy trust sits with a coordinator that can see
votes; a Nox design moves that role into an attested TEE and emits a verifiable tally.” Do not claim
that the TEE cannot leak or be bribed without stating the hardware, operator, KMS, attestation, and
software trust assumptions.

## 6. Proposed starting architecture—not yet approved

- `VoteRegistry.sol`: eligibility, proposal lifecycle, deadline, quorum; public.
- `ConfidentialBallotBox.sol`: receives encrypted handles and proofs; stores appropriately restricted
  references; enforces one effective vote per voter and the re-vote/override rule.
- `TallyEngine.sol`: after the deadline, requests confidential aggregation and quorum computation.
- `ResultDisclosure.sol`: makes only the aggregate result decryptable and verifies the required proof.
- `GovernorAdapter.sol`: narrowly feeds an accepted result into an existing Governor or Safe.

Starting async flow:

1. Create a public proposal with options, deadline, and quorum.
2. Eligible voter encrypts a choice and submits a handle/proof. Participation is public; choice is not.
3. Voter may re-vote before the deadline; the effective-vote rule must provide real receipt-freeness.
4. Deadline passes; tally computation is requested and becomes pending.
5. Confidential computation returns an aggregate candidate and evaluates quorum.
6. If the disclosure policy passes, publish only the aggregate with its verification evidence.
7. An adapter makes the result consumable by existing governance execution.

## 7. Known Nox constraints to verify and design around

- **TEE, not FHE/ZK:** trust rests on the released confidential-computing architecture, attestation,
  KMS, gateway, worker, and software boundaries. Frame it honestly.
- **Single-KMS-node MVP hypothesis:** verify the current topology. If true, it is weaker against key
  compromise than Shutter's threshold Keypers; name that limitation and design a bounded MVP claim.
- **Async computation:** request and result/finalization are separate states; UX cannot imply an
  immediate result in the original transaction.
- **Permanent access per handle:** once a principal can view a value, revocation cannot erase what was
  learned. Audience changes require fresh handles/data.
- **Confidential is not anonymous:** wallet participation and timing remain public unless another
  mechanism is deliberately added.
- **Low-turnout inference:** an aggregate with very few voters can reveal individual choices. Require
  a minimum disclosure threshold and consider coarser output below stronger privacy thresholds.
- **Encryption is not receipt-freeness:** voter access to their own choice, screenshots before
  encryption, deterministic client behavior, and coercer-controlled keys all need explicit analysis.
  Re-vote/override is a starting mechanism, not an assumed proof.

## 8. Questions the research must answer

1. Exactly what can a malicious MACI coordinator do and not do? Which risks does a TEE remove, move,
   or retain?
2. How does MACI make a later vote or key change invalidate an earlier message, and what is the real
   answer to the bribe-at-first-message attack? Can a Nox design obtain the relevant property without
   reproducing MACI's zk circuits?
3. How does Shutter's permanent design keep choices private forever while making the tally verifiable?
   What is the exact Nox equivalent, if any, under public-decryption proofs?
4. How does Oasis Sapphire state the TEE governance trust model and its limitations?
5. Can token weights be fixed at a defensible snapshot, kept choice-private, and tallied without
   introducing double voting or post-vote transfer attacks?
6. Is token gating sufficient for a DAO hackathon MVP, or is a uniqueness/anonymous-eligibility layer
   required for the chosen product claim?
7. What minimum turnout or ambiguity rule should govern disclosure, and what should users see when it
   is not met?
8. Can the released Nox package and deployed ABI support the full flow with real Sepolia behavior and
   a Foundry-based contract workflow?

## 9. Historical candidate scope

> Superseded by the complete current product definition. “MVP” here must not be used to defer or remove
> selected product behavior.

- One proposal; a bounded set of eligible token holders; yes/no or three options.
- Encrypted vote submission with calldata showing a handle rather than the choice.
- Re-vote/override before deadline.
- Confidential tally after deadline with a disclosure quorum.
- Public reveal of only the aggregate result plus on-chain-verifiable evidence.
- Demo punchline: inspect any individual transaction and show that the choice is not public, while the
  final aggregate is public and verified under the declared Nox trust model.

Original candidate positioning is superseded because it claimed bribery resistance. Use the current
truthful positioning instead:

> A confidential-outcome module for Safe and compatible Governor deployments. Wallets and participation
> stay public; individual choices and exact totals never become public; after a privacy floor, the
> module opens only Passed or Rejected and can execute exactly the action committed before voting.
