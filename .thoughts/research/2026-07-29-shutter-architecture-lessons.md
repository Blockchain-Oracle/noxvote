# Shutter Architecture Lessons for Confidential Voting on Nox

**Date:** 2026-07-29  
**Scope:** Shutter's deployed Snapshot integration, threshold trust model, permanent-voting construction, production status, UX, and comparison with the released single-node Nox KMS MVP  
**Decision status:** Research evidence only. This document does not approve a Nox architecture.

## Executive finding

Shutter provides two different reference systems. They must not be blended in a pitch or architecture diagram:

1. **Classic Shutter Shielded Voting is a mature temporary-shielding product.** A voter encrypts a choice in the browser, Snapshot stores the signed ciphertext, and a threshold Keyper network releases a proposal-specific decryption key after voting closes. Snapshot then decrypts **every individual vote**, replaces the stored ciphertext with plaintext, and calculates the result. It protects the voting period from running-tally influence; it does not provide permanent ballot privacy, receipt-freeness, anonymity, or coercion resistance.
2. **Permanent Shielded Voting is a materially different threshold-ElGamal design.** Clients attach proofs that their ciphertext encodes an allowed choice; valid ciphertexts are homomorphically aggregated; Keypers threshold-decrypt only the aggregate and prove correct partial decryption. This is the relevant construction for "disclose only a verifiable aggregate," but the official implementation found is a proof of concept, not the production Snapshot path.

Shutter's threshold-Keyper model is stronger **today** than Nox's released single-KMS-node MVP against key compromise and a single decryption-service outage. That comparison does not make Shutter trustless: a threshold coalition can decrypt early, a liveness-blocking coalition may be smaller than the decryption threshold, the Snapshot host/collator remains a separate availability and inclusion authority, and Shutter's current API warns that its Keyper set is not fully decentralized.

The most important product lesson is modularity: Shutter did not ask DAOs to migrate governance. It added one privacy setting to the existing proposal lifecycle, preserved public participation/quorum signals, encrypted locally, and finalized asynchronously. The most important security lesson is the opposite: a smooth toggle cannot be allowed to collapse distinct guarantees into the word "private."

## Evidence labels and method

- **Verified fact** means directly supported by current official documentation, source at an exact commit, or a live deployed record observed on 2026-07-29.
- **Inference** means a conclusion drawn from two or more verified facts.
- **Design lesson** means a constraint this evidence suggests for a future Nox module; it is not a Shutter feature and is not an approved Nox architecture.
- **Unknown** means the public material inspected did not establish the fact.

The source trace used these repository snapshots:

| Repository | Commit inspected |
|---|---|
| `snapshot-labs/sx-monorepo` | [`23e7c9f1ae17f221ef5f569c70c8681249dce965`](https://github.com/snapshot-labs/sx-monorepo/tree/23e7c9f1ae17f221ef5f569c70c8681249dce965) |
| `shutter-network/rolling-shutter` | [`d143fffcf51f85b30375134d2d29756417f333b9`](https://github.com/shutter-network/rolling-shutter/tree/d143fffcf51f85b30375134d2d29756417f333b9) |
| `shutter-network/shutter` | [`9843a061b3f7243dc5d3f59ad212fc5222cedfb8`](https://github.com/shutter-network/shutter/tree/9843a061b3f7243dc5d3f59ad212fc5222cedfb8) |
| `shutter-network/shutter-api` | [`c516e85a23eff6f49381109ba010512397efd468`](https://github.com/shutter-network/shutter-api/tree/c516e85a23eff6f49381109ba010512397efd468) |
| permanent Snapshot/Shutter ElGamal PoC | [`5c59aec14d12f9f1e2df4e41f6ca366735881a53`](https://github.com/pepae/sx-monorepo-elgamal/tree/5c59aec14d12f9f1e2df4e41f6ca366735881a53) |
| `iExec-Nox/documentation` | [`ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7`](https://github.com/iExec-Nox/documentation/tree/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7) |
| `iExec-Nox/nox-kms` | [`5cf23f2743033dafbe878db9342bd1da4d3341dc`](https://github.com/iExec-Nox/nox-kms/tree/5cf23f2743033dafbe878db9342bd1da4d3341dc) |

## 1. Deployed classic Shutter architecture

### 1.1 End-to-end data and authority flow

#### A. A DAO opts in inside Snapshot

**Verified fact.** A space admin can choose Shutter from Snapshot's Privacy setting. The current UI supports three space policies: `none`, `shutter`, and `any`. If a space uses `any`, a proposal author can choose either unshielded or Shutter voting for that proposal. The feature therefore supports both a space-wide default and a per-proposal decision without replacing Snapshot.

Evidence:

- [Snapshot settings documentation](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/docs/user-guides/spaces/settings.mdx#L68-L82)
- [Privacy selector](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/apps/ui/src/components/Modal/SelectPrivacy.vue#L1-L44)
- [`any` maps to author-selectable `none` or `shutter`](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/apps/ui/src/composables/useEditor.ts#L143-L164)

#### B. The browser encrypts the choice before wallet signing

**Verified fact.** Snapshot's offchain client converts the choice to bytes and encrypts it locally with Shutter's eon public key. The proposal ID is passed as the encryption identity and the client generates fresh random `sigma`. Snapshot then places the ciphertext in the typed vote message and obtains the wallet signature over that encrypted message.

Evidence:

- [Local Shutter encryption](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/packages/sx.js/src/clients/offchain/utils.ts#L8-L55)
- [Ciphertext inserted before typed-data signing](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/packages/sx.js/src/clients/offchain/ethereum-sig/index.ts#L298-L324)

**Architecture lesson.** Encryption should be bound to the exact proposal/election identity, not only to a reusable platform key. Fresh encryption randomness prevents equal choices from yielding equal ciphertexts.

#### C. Snapshot remains the eligibility, weight, and message-ingestion layer

**Verified fact.** Snapshot's sequencer verifies the signed envelope and voting window. For a Shutter proposal it accepts a hex ciphertext instead of applying the normal plaintext choice validator. Snapshot separately runs proposal vote validation and computes voting power. Thus Shutter protects the choice; it does not replace Snapshot's identity, eligibility, token-weight, or transport rules.

Evidence: [sequencer vote verification](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/apps/sequencer/src/writer/vote.ts#L18-L90).

**Verified fact.** Snapshot keeps one latest vote per `(voter, proposal, space)` and overwrites the prior record when a later signed vote arrives.

Evidence: [latest-vote overwrite](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/apps/sequencer/src/writer/vote.ts#L159-L213).

**Security interpretation.** This is a useful vote-update mechanism but is not MACI-style receipt-freeness. In classic Shutter the final plaintext choice is published with the voter after close. A coercer can therefore learn the final vote, and can also supervise the voter near the deadline. Last-write-wins alone does not make a briber unable to verify compliance.

#### D. During the vote, choices and option scores are hidden but participation is visible

**Verified fact.** Shutter's current product page says members see deployed voting power and quorum status while votes are encrypted. Snapshot necessarily retains public voter identity and voting power to apply its normal governance rules.

Evidence: [Shutter Shielded Voting product flow](https://shutter.network/shielded-voting/#how-shielded-voting-keeps-votes-private).

This is temporary **choice confidentiality**, not anonymity:

- voter wallet/address is public;
- participation is public;
- voting power is public;
- the option selected is encrypted until close;
- running per-option totals are withheld until close.

#### E. Snapshot requests release only after close

**Verified fact.** When a Shutter proposal is closed, Snapshot's score updater requests its decryption key instead of calculating final scores immediately. The Snapshot-Shutter bridge maps the proposal ID to the Shutter identity, checks whether a key is cached, and otherwise emits a signed decryption trigger.

Evidence:

- [closed proposals request a key](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/apps/sequencer/src/scores.ts#L117-L139)
- [Snapshot bridge creates the signed trigger](https://github.com/shutter-network/rolling-shutter/blob/d143fffcf51f85b30375134d2d29756417f333b9/rolling-shutter/snapshot/snapshot.go#L125-L155)
- [Keypers accept only the configured collator's valid trigger](https://github.com/shutter-network/rolling-shutter/blob/d143fffcf51f85b30375134d2d29756417f333b9/rolling-shutter/keyperimpl/snapshot/trigger.go#L44-L100)

**Important authority boundary.** Keypers do not independently infer the Snapshot proposal state in this integration. They authenticate a trigger from the configured collator. Therefore the collator/bridge is a release-liveness dependency: it can delay or withhold the trigger even when enough Keypers are healthy. The Keypers' signature check prevents an arbitrary party from triggering release, but it does not decentralize the trigger decision.

#### F. Keypers derive and reconstruct a proposal-specific key

**Verified fact.** Shutter runs DKG for eon key material. A configured threshold of Keypers produces decryption-key shares for an identity; shares are combined into a proposal/epoch secret key. The Snapshot bridge verifies a received epoch secret key against the eon public key and proposal identity before accepting it, then sends the valid key to Snapshot Hub.

Evidence:

- [current Shutter component and threshold flow](https://docs.shutter.network/docs/protocol/api/how_it_works)
- [Rolling Shutter DKG and configuration spec](https://github.com/shutter-network/rolling-shutter/blob/d143fffcf51f85b30375134d2d29756417f333b9/docs/spec.md#L120-L150)
- [proposal-key verification and Hub submission](https://github.com/shutter-network/rolling-shutter/blob/d143fffcf51f85b30375134d2d29756417f333b9/rolling-shutter/snapshot/handler.go#L59-L152)

#### G. Snapshot decrypts every ballot and persists plaintext

**Verified fact.** Snapshot accepts the proposal key only after the proposal end time. It loads every stored vote, decrypts each ciphertext, executes `UPDATE votes SET choice = ?`, and then recomputes final scores from the now-plaintext vote set.

Evidence: [Snapshot's classic decryption/finalization path](https://github.com/snapshot-labs/sx-monorepo/blob/23e7c9f1ae17f221ef5f569c70c8681249dce965/apps/sequencer/src/helpers/shutter.ts#L69-L106).

This implementation detail settles classic reveal semantics: **it is not aggregate-only disclosure.** Once the key is released, anyone possessing the archived ciphertexts and proposal key can decrypt each choice, and Snapshot's public data model exposes the resulting per-voter plaintext.

#### H. Live deployment corroboration

**Verified fact.** On 2026-07-29, the official Snapshot GraphQL endpoint returned a closed Shutter proposal for `shutterdao0x36.eth`, proposal `0x20741e1bd72f2574fccd34e91ff10e94f08862848c53fa5bd688b3a495edb761`, with `privacy: "shutter"`, `scores_state: "final"`, ten votes, and a public plaintext `choice: 1` beside each voter address and voting power.

Evidence:

- [Snapshot GraphQL endpoint](https://hub.snapshot.org/graphql)
- [proposal in the Snapshot UI](https://snapshot.box/#/s:shutterdao0x36.eth/proposal/0x20741e1bd72f2574fccd34e91ff10e94f08862848c53fa5bd688b3a495edb761)

The observation matches the source trace: classic Shutter encrypts during the period and reveals individual choices after close.

### 1.2 Classic component and failure map

| Component | What it controls | What it does not solve | Relevant failure |
|---|---|---|---|
| Snapshot client | choice encoding, local randomness, encryption, wallet signature | eligibility, key release, final tally | malicious/buggy client may encode malformed content; classic backend only checks ciphertext shape before later decryption |
| Snapshot sequencer/Hub | message admission, latest-vote selection, eligibility, voting power, stored corpus, score computation | threshold confidentiality by itself | can reject, omit, delay, or lose offchain ballots; central inclusion dependency |
| Snapshot-Shutter collator/bridge | authenticates and sends the post-close decryption trigger; forwards valid key | DKG secrecy | withholding/delay stalls reveal even if Keypers are ready |
| Keyper committee | DKG, decryption shares, threshold reconstruction | host inclusion, voter authentication, tally logic | threshold collusion breaks confidentiality; too few live/cooperative Keypers stalls release |
| Public observers | can inspect signed votes and, after classic reveal, recompute visible plaintext totals | cannot force Hub inclusion or bridge progress | audit detects some failures but does not guarantee liveness or completeness |

## 2. Threshold trust, early decryption, and censorship

Let the committee have `n` Keypers and require `t` valid shares.

| Property | Exact threshold statement |
|---|---|
| Confidentiality before release | Any coalition smaller than `t` cannot reconstruct the secret under the cryptographic assumption. A coalition of at least `t` can derive the proposal key early and decrypt individual classic votes. |
| Key-release liveness | At least `t` cooperative, online Keypers are required. A coalition of `n - t + 1` refusing Keypers can leave fewer than `t` shares and stall the result. |
| Single-Keyper resilience | One Keyper cannot decrypt alone when `t > 1`; one Keyper cannot stall alone only when at least `t` other Keypers remain available. |
| DKG liveness | The DKG must itself complete with sufficient valid participants. Accusation/apology and configuration machinery handle faults, but they do not make an unavailable threshold disappear. |
| Trigger liveness | In the Snapshot integration, the configured collator must send a valid trigger. Threshold Keypers do not remove this separate single-role dependency. |
| Ballot inclusion | Threshold encryption says nothing about whether Snapshot accepted every signed offchain ballot. The sequencer remains the admission path. |

This yields two corrections to common shorthand:

1. **"No colluding minority below threshold can decrypt" is correct only for confidentiality.**
2. **"No colluding minority below threshold can censor" is not generally correct.** The blocking threshold is `n - t + 1`, not `t`. For a high decryption threshold, a numerically smaller coalition can remove enough shares to break liveness. Separately, Snapshot's host or collator can censor or stall within their own roles without compromising a Keyper threshold.

Shutter's own permanent-voting technical post states both failure cases honestly: a threshold coalition may decrypt votes early, while refusal to participate may block publication of the tally. The current Shutter API README also warns that the API is early-stage, uses a decentralized set of Keypers that is not yet fully decentralized, and should not yet be entrusted with high-value sensitive information.

Sources:

- [Permanent Shielded Voting technical post, limitations](https://blog.shutter.network/coming-soon-to-daos-permanent-shielded-voting-via-homomorphic-encryption/#limitations-and-comparison-with-other-approaches)
- [current Shutter API disclaimer](https://github.com/shutter-network/shutter-api/blob/c516e85a23eff6f49381109ba010512397efd468/README.md#L3-L9)

### 2.1 Classic verifiability is useful but incomplete

**Verified fact.** The bridge cryptographically verifies that the reconstructed proposal key matches the eon public key and proposal identity. After release, public plaintext ballots make score recomputation possible.

**Verified limitation.** Classic Snapshot does not attach a zero-knowledge proof that Snapshot included the complete ballot corpus, applied the intended latest-vote rule, decrypted every ballot correctly, and computed the declared result. The 2026 Shutter/PSE report likewise distinguishes classic public-after-close auditability from a proof-carrying permanent tally.

**Inference.** A third party can detect a wrong arithmetic total from the public ballots it sees. It cannot infer that an otherwise valid offchain ballot was never admitted or was omitted from the host's public corpus unless it independently received that signed ballot. Verifiable decryption does not automatically imply verifiable inclusion.

Source: [The State of Private Voting 2026 report](https://pse.dev/articles/state-of-private-voting-2026/state-of-private-voting-2026-v2.pdf?ref=blog.shutter.network).

## 3. What classic Shutter does and does not guarantee

| Guarantee | Classic Snapshot + Shutter | Reason |
|---|---|---|
| Hide running option totals | **Yes, assuming fewer than `t` Keypers collude** | individual choices are ciphertexts until the proposal key is released |
| Permanent individual-choice privacy | **No** | Snapshot decrypts and stores each choice after close |
| Aggregate-only disclosure | **No** | the released proposal key opens every ciphertext |
| Receipt-freeness | **No** | final voter-choice pairs are public; signed/ciphertext records do not create deniable credentials |
| Coercion/bribery resistance | **No** | a coercer can verify final choice after reveal; latest-vote overwrite is not sufficient |
| Voter anonymity | **No** | wallet, participation, and voting power remain public |
| Vote update/re-vote | **Yes, host-mediated latest-write-wins** | a later signed vote overwrites the earlier row |
| Eligibility and weights | **Delegated to Snapshot** | Snapshot validation and voting-power strategies run outside Shutter |
| Correct key check | **Yes at the bridge** | proposal secret key is verified against eon public key and identity |
| Universally verifiable tally | **Partial** | plaintext makes arithmetic recomputation possible, but the host controls offchain inclusion and processing |
| Availability without any single Keyper | **Usually, configuration-dependent** | works while at least `t` Keypers cooperate; collator and host remain separate dependencies |
| Minimum turnout before reveal | **Not established** | current flow releases after proposal close; product UI exposes quorum status but no cryptographic turnout disclosure gate was found |

## 4. Permanent Shielded Voting construction

Permanent Shielded Voting is not a small flag added to the classic decrypt-all path. It changes both the cryptography and the public audit object.

### 4.1 Intended construction

For a simple `Yes / No / Abstain` election, the official design maps choices to a bounded set such as `{1, -1, 0}`.

1. **Threshold key setup.** Keypers jointly create an ElGamal public key while each retains only a secret share. No single Keyper should hold the full decryption key in a real deployment.
2. **Ballot encryption.** A client encodes the selected option in the exponent and creates ElGamal ciphertext `(c1, c2) = (g^r, g^m h^r)` with fresh randomness `r`.
3. **Ballot-validity proof.** The voter supplies a non-interactive OR proof that the ciphertext encrypts one of the allowed values without revealing which one. This prevents a malicious voter from encoding, for example, `10,000` votes inside one ciphertext.
4. **Authentication and eligibility.** A separate layer authenticates the voter, applies voting weight, and enforces the accepted latest ballot. The cryptographic post explicitly treats this as separate from ballot privacy.
5. **Public validation and aggregation.** Invalid ballot proofs are rejected. Valid ciphertexts are multiplied component-wise, which adds their hidden exponents and yields a ciphertext of the aggregate tally.
6. **Threshold partial decryption.** At least `t` Keypers apply their shares to the aggregate ciphertext. Each partial decryption is accompanied by a discrete-log-equality proof tying the partial result to that Keyper's public share.
7. **Combination.** Valid partial decryptions are combined using Lagrange coefficients in the exponent. This removes the shared encryption factor without reconstructing or publishing the master secret.
8. **Bounded plaintext recovery.** The remaining group element is `g^sum`. The tally is recovered by solving a discrete logarithm over the bounded result range. This is practical only because election tallies occupy a constrained message space.
9. **Public verification.** An observer needs the accepted ciphertext corpus, ballot-validity proofs, deterministic aggregation rule, public Keyper shares, partial decryptions, decryption proofs, and final result. With all of them, the observer can reject invalid ballots, recompute the encrypted aggregate, verify shares, and check that the disclosed tally corresponds to it.

Primary sources:

- [official construction and proof roles](https://blog.shutter.network/permanent-shielded-voting-is-coming-to-snapshot/#why-elgamal)
- [longer official technical construction](https://blog.shutter.network/coming-soon-to-daos-permanent-shielded-voting-via-homomorphic-encryption/#a-simple-example)
- [PoC encryption, OR proof, DLEQ proof, and Lagrange combination](https://github.com/pepae/sx-monorepo-elgamal/blob/5c59aec14d12f9f1e2df4e41f6ca366735881a53/crypto/elgamal.py)

### 4.2 What each proof proves

| Proof/artifact | Proves | Does not prove by itself |
|---|---|---|
| Wallet signature/eligibility evidence | authorized address submitted this ballot under host rules | allowed encrypted choice, privacy, complete inclusion |
| Ballot OR proof | ciphertext plaintext is in the allowed choice set | voter eligibility, uniqueness, correct voting weight |
| Public accepted-ballot corpus | which ciphertexts the tally claims to include | that the host did not suppress another valid offchain ballot |
| Deterministic homomorphic aggregation | aggregate ciphertext corresponds to the published accepted corpus | that the corpus is complete |
| Keyper DLEQ/decryption proof | a partial decryption uses the secret matching a public share | honest timing or Keyper availability |
| Final tally check | plaintext aggregate matches the aggregated ciphertext and valid shares | anonymity, receipt-freeness, minimum-turnout safety |

This separation matters for a Nox comparison. A TEE attestation can support statements about the measured tally program and its inputs, but it does not automatically prove that a host admitted all eligible messages or that public participation metadata did not leak an individual choice.

### 4.3 Permanent does not mean receipt-free

**Verified fact.** Shutter's permanent construction keeps individual vote plaintexts encrypted after the election if the threshold is not compromised. It does not, by itself, prevent a voter from revealing encryption randomness, producing a convincing receipt through the surrounding application, or submitting under coercer observation. Shutter lists receipt-freeness and coercion resistance as future desirable properties rather than properties already delivered by the construction.

Source: [official future-work section](https://blog.shutter.network/coming-soon-to-daos-permanent-shielded-voting-via-homomorphic-encryption/#conclusion-and-future-work).

**Design lesson.** A Nox module cannot claim anti-bribery from aggregate-only TEE tallying. It needs a separate, concrete re-vote/credential-override mechanism and an explicit answer to supervised final voting and MACI's bribe-at-first-message problem.

### 4.4 Permanent production status as of 2026-07-29

| Evidence | What it establishes |
|---|---|
| October 2025 Shutter/Snapshot announcement | Stage 1 was a PoC in a **forked** Snapshot UI; testnet integration was next; mainnet launch was Stage 3. |
| PoC README at `5c59…` | all Keypers run locally on one machine; no persistence; no authentication; binary voting only; no production hardening or cryptographic audit. |
| Shutter/PSE 2026 report | permanent Shutter voting is described as a research-stage PoC/partnership with low maturity, while classic Shutter is the mature deployed system. |
| current Snapshot source at `23e7…` | production code still uses classic encryption under an eon key and decrypts each ballot after close. No threshold-ElGamal ballot-proof/aggregate-only finalization path was found. |
| current Shutter product page | publicly marketed Snapshot flow still says Snapshot decrypts all votes after voting ends. |

**Verified fact.** The published permanent PoC is not production-ready. Its own README calls it a proof-of-concept demonstration and lists central local Keypers, in-memory data, missing authentication, no audit, and substantial engineering still required.

Evidence: [PoC README and disclaimer](https://github.com/pepae/sx-monorepo-elgamal/blob/5c59aec14d12f9f1e2df4e41f6ca366735881a53/README.md#L38-L60).

**Current-status inference.** No primary-source evidence of a permanent-voting Snapshot mainnet launch was found as of 2026-07-29. The latest official product page and the current Snapshot repository still implement the classic reveal-all path. Therefore permanent Shutter voting should be treated as a useful construction and prototype, not as deployed production precedent, unless a later deployment artifact is produced.

**Important PoC caveat.** The Python code is useful for understanding proof shape, but it uses toy/educational parameter generation and central Shamir share creation. It is not evidence of a distributed production key ceremony or audited cryptography.

## 5. Turnout, quorum, and low-participation disclosure

Shutter's classic UX preserves a useful governance signal: voters can see deployed voting power and quorum status while option totals are hidden. This reduces uncertainty about whether participation is sufficient without revealing a running winner.

That UX does **not** solve low-turnout privacy:

- classic Shutter later reveals every choice regardless, so low turnout only makes an already-public final mapping more obvious;
- aggregate-only permanent voting can still reveal a choice when the anonymity set is one, or allow subtraction/differencing when public voter weights and successive related tallies make an individual's contribution uniquely recoverable;
- public voter identity and voting power can make a weighted aggregate identifying even with more than one participant.

**Design lesson, not a Shutter feature.** Before any aggregate is disclosed, a Nox design needs a policy-defined privacy threshold distinct from passage quorum. If the threshold is not met, the safe terminal outcome is something like `insufficient participation — tally withheld`, not a decrypted total. The system must also define whether weighted-vote distributions, repeated elections, and public abstentions can defeat that threshold by inference.

The UX must distinguish:

- **participation progress:** public count/power submitted;
- **governance quorum:** enough power for the proposal to be valid or pass;
- **privacy threshold:** enough independent uncertainty to permit disclosure;
- **option result:** withheld until both time and privacy policy allow it.

These values may be numerically different. Calling all three "quorum" invites an implementation bug.

## 6. Modular adoption and asynchronous UX lessons

### 6.1 What Shutter got right

1. **Module, not migration.** DAO identity, proposals, eligibility, voting power, results pages, and governance culture remain in Snapshot. Shutter supplies a narrow confidentiality service.
2. **One understandable control.** The admin chooses privacy in the same settings panel used for voting period and quorum. A space can enforce shielded voting or let authors choose per proposal.
3. **Client-side encryption.** Plaintext does not need to reach Snapshot before close.
4. **Preserved familiar signals.** Participation/voting power and quorum remain visible; only choice distribution is hidden.
5. **Normal wallet action.** The user still signs one vote message. Threshold coordination is backend infrastructure rather than a voter ceremony.
6. **Automatic release/finalization.** Users do not manually reveal their ballots, avoiding the non-reveal dropout of naive commit-reveal voting.
7. **Honest label in current Snapshot docs.** Snapshot calls classic Shutter "partial privacy" and says choices are revealed at close.

The current Shutter site reports more than 881 DAOs protected and more than 372,914 votes encrypted. These are first-party metrics rather than an independently audited adoption count, but they support the claim that the module-style UX has substantial real use.

Source: [current Shutter Shielded Voting page](https://shutter.network/shielded-voting/).

### 6.2 States the UI must expose

The integration source shows an asynchronous process even though the user-facing product feels simple. A robust host should represent at least:

1. `draft` — privacy mode and thresholds configured;
2. `scheduled` — proposal exists but voting has not started;
3. `open` — encrypted ballots accepted, participation visible, choices hidden;
4. `closed / key requested` — voting ended; no more ballots; release trigger pending;
5. `shares pending` or equivalent — Keyper/compute threshold not yet complete;
6. `result ready` — aggregate/plaintexts available to the finalizer;
7. `finalized` — result and verification artifacts published;
8. `insufficient participation / result withheld` — privacy gate failed;
9. `finalization delayed` — liveness problem, not silently displayed as a zero vote.

**Design lesson.** “Voting ended” and “result finalized” are different events. A Nox module should not pretend TEE/KMS computation is synchronous or map pending computation to `0 / 0 / 0` scores.

### 6.3 Copy and product claims must be guarantee-specific

Good copy says one of:

- “Choices are hidden until voting closes.”
- “Only the aggregate result is disclosed after the privacy threshold is met.”
- “Participation and wallet addresses remain public.”

Bad copy says “anonymous,” “bribe-proof,” “receipt-free,” or “permanently private” unless the complete system actually supplies those properties.

## 7. Honest comparison with the current Nox KMS MVP

Nox's current protocol documentation explicitly distinguishes a future threshold architecture from the MVP: the MVP runs **one KMS node holding the full EC private key**; `t/n` threshold operation with DKG is a production target. The KMS repository describes one service deriving ECDH shared secrets and delegating them for authorized decryption requests.

Sources:

- [Nox KMS protocol documentation](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/kms.md#L74-L98)
- [current Nox KMS role](https://github.com/iExec-Nox/nox-kms/blob/5cf23f2743033dafbe878db9342bd1da4d3341dc/README.md#L27-L31)

| Property | Shutter threshold-Keyper system today | Nox released MVP today |
|---|---|---|
| Decryption authority cardinality | distributed shares; at least `t` Keypers required | one KMS holds the full private key |
| Compromise tolerance | fewer than `t` Keypers do not reconstruct/decrypt under the scheme | compromise of the KMS private key defeats the single-key boundary |
| Service availability | can tolerate unavailable Keypers while at least `t` remain, plus other bridge/host dependencies | one KMS is a decryption/delegation liveness point |
| Collusion assumption | explicit threshold coalition | single service/operator and its software/hardware trust chain |
| Early/unauthorized disclosure risk | `t` colluding Keypers can derive early; current network not fully decentralized | single-key compromise or authorized-overbroad delegation can expose protected data |
| Computation expressiveness | classic releases keys; permanent PoC homomorphically tallies a narrow bounded vote type | Nox can authorize confidential computation in a TEE/Runner workflow, potentially including richer tally logic |
| Production evidence for voting | classic Snapshot path has multi-year live use; permanent aggregate-only path remains PoC | released Nox primitives exist, but a real confidential-governance proof path still has to be demonstrated |
| Verifiability | key checks and classic public-after-close audit; permanent design adds proof-carrying tally | depends on attestation, signed delegation, onchain state, and publication of an unambiguous input/output commitment |

### 7.1 The honest better-than story

The defensible claim is **not** “Nox replaces a corruptible human with an incorruptible TEE.” A TEE and its KMS still have a measured software stack, supply-chain assumptions, operator availability, authorization logic, and—today—one full KMS key.

The defensible distinction is:

- classic Shutter removes running-result visibility but eventually releases a key that opens every ballot;
- permanent Shutter avoids individual reveal but is still a PoC and remains bounded by threshold cryptography and narrow homomorphic tally logic;
- Nox may let a measured confidential program enforce richer policies and disclose only an approved result, but that advantage must be shown using released Nox behavior, real attestation/delegation, and real onchain state transitions;
- Shutter is currently stronger on distribution of decryption authority, so a Nox MVP must name the one-node KMS limitation rather than imply threshold-equivalent security.

**Inference.** “TEE instead of human coordinator” can become a meaningful architecture story only if the proposal specifies who can authorize the TEE, which encrypted handles it receives, the exact measured tally/re-vote program, what it commits to, what the contract verifies, and what happens when the single KMS or Runner is unavailable. The slogan alone is not a guarantee.

## 8. Concrete architecture lessons for the Nox research phase

These are constraints to carry into an architecture comparison, not an approved design:

1. **Name the disclosure object.** Classic per-ballot decryption, permanent aggregate decryption, and TEE-computed policy output are different systems. “Encrypted voting” does not choose among them.
2. **Keep encryption proposal-bound.** Bind ciphertexts to chain/domain, governance module, proposal ID, election version, voter/credential context as appropriate, and use fresh randomness.
3. **Separate four authorities.** Ballot admission, eligibility/weight, confidential computation/decryption, and onchain finalization should be diagrammed independently. Shutter shows why key decentralization does not decentralize the host.
4. **Specify corpus completeness.** A proof of correct decryption over an aggregate is not a proof that every eligible ballot was included. Publish or commit to an append-only accepted-ballot corpus and deterministic update rule.
5. **Model re-vote as a security protocol.** Snapshot's latest-row overwrite improves UX but does not create receipt-freeness. The Nox design must incorporate MACI lessons rather than treating any `updateVote` function as anti-bribery.
6. **Gate disclosure on privacy turnout, not only governance quorum.** Below threshold, withhold the tally. Define inference risks for weighted voters and repeated proposals.
7. **Treat finalization as asynchronous.** Expose pending, ready, failed/withheld, and finalized states. Add retry/idempotency semantics and a timeout/failure policy.
8. **Verify each handoff.** Client ciphertext format, admitted-ballot commitment, KMS delegation, TEE measurement, tally output, and contract finalization each need an evidence-bearing link.
9. **Be exact about liveness thresholds.** Confidentiality breaks at `t`; share-withholding liveness breaks at `n - t + 1`; host and trigger dependencies are additional failure domains.
10. **Do not inherit Shutter's claims wholesale.** The live classic product is strong evidence for UX and temporary shielding, not for permanent privacy or anti-bribery. The permanent PoC is strong evidence for proof structure, not production maturity.
11. **Do not hide the KMS delta.** If the hackathon MVP uses one Nox KMS node, state that it is weaker than Shutter's threshold committee against key compromise and operator outage. A future threshold roadmap is not a current property.
12. **Keep the judged proof path real.** A mock Keyper, fake attestation, local plaintext tally, or frontend-only encrypted state cannot support a confidential-governance claim.

## 9. Genuine unknowns before an architecture can be approved

1. **Current classic Snapshot committee composition:** the exact active production Keyper members, `n/t` parameters, operator diversity, rotation process, and economic/accountability mechanism were not established by the current public Snapshot integration sources inspected.
2. **Trigger operator and redundancy:** the production collator/bridge deployment topology and failover procedure for Snapshot were not established.
3. **Complete-ballot audit path:** the degree to which a voter can independently prove that Snapshot received, retained, and included a signed encrypted ballot needs an executable production test.
4. **Permanent deployment:** no official Snapshot testnet or mainnet deployment artifact for Permanent Shielded Voting was found as of 2026-07-29.
5. **Permanent audit status:** no independent cryptographic/security audit of the published PoC was found; its README explicitly lists an audit as production work.
6. **Weighted/multi-choice permanent proofs:** the PoC is binary and unweighted. Proof size, gas, tally range, and privacy behavior for Snapshot-style weighted/quadratic/ranked systems remain open.
7. **Nox primitive fit:** separate Nox research must establish how released handle ACLs, permanent access once granted, KMS delegation, TEE attestation, asynchronous execution, and contract callbacks map to the desired vote-update and aggregate-withholding rules.

## 10. Source index

### Shutter and Snapshot product/architecture

- [Shutter Shielded Voting product page](https://shutter.network/shielded-voting/)
- [Shutter API: how it works](https://docs.shutter.network/docs/protocol/api/how_it_works)
- [Shutter API voting use case](https://docs.shutter.network/docs/protocol/api/use_cases)
- [Shutter API source and deployment disclaimer at `c516e8…`](https://github.com/shutter-network/shutter-api/tree/c516e85a23eff6f49381109ba010512397efd468)
- [Snapshot source at `23e7c9…`](https://github.com/snapshot-labs/sx-monorepo/tree/23e7c9f1ae17f221ef5f569c70c8681249dce965)
- [Rolling Shutter source at `d143ff…`](https://github.com/shutter-network/rolling-shutter/tree/d143fffcf51f85b30375134d2d29756417f333b9)
- [The State of Private Voting 2026 report, Shutter + PSE](https://pse.dev/articles/state-of-private-voting-2026/state-of-private-voting-2026-v2.pdf?ref=blog.shutter.network)

### Permanent Shielded Voting

- [Permanent Shielded Voting is Coming to Snapshot, 2025-10-21](https://blog.shutter.network/permanent-shielded-voting-is-coming-to-snapshot/)
- [Permanent Shielded Voting via Homomorphic Encryption, 2025-07-22](https://blog.shutter.network/coming-soon-to-daos-permanent-shielded-voting-via-homomorphic-encryption/)
- [Snapshot/Shutter threshold-ElGamal PoC at `5c59ae…`](https://github.com/pepae/sx-monorepo-elgamal/tree/5c59aec14d12f9f1e2df4e41f6ca366735881a53)

### Nox comparison

- [Nox KMS protocol documentation at `ce4262…`](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/kms.md)
- [Nox KMS implementation at `5cf23f…`](https://github.com/iExec-Nox/nox-kms/tree/5cf23f2743033dafbe878db9342bd1da4d3341dc)

## Bottom line

Shutter's deployed success is evidence that confidential voting sells when it is an almost invisible module inside the governance system DAOs already use. Its source also shows the exact limit of that success: classic Shutter is an encrypted-until-close service whose host later decrypts every ballot. The permanent design supplies the right aggregate-only proof pattern, but not yet the production precedent or anti-bribery guarantee.

For Nox, the credible opportunity is not to claim that a TEE is automatically more trustworthy than Shutter. It is to demonstrate a real, measured confidential policy engine that can enforce re-vote and turnout-disclosure rules while publishing only a verifiable aggregate—then state plainly that the current one-node KMS is a weaker key-management assumption than Shutter's threshold Keypers.
