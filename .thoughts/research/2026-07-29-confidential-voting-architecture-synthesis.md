# Confidential Voting Architecture Synthesis

**Date:** 2026-07-29  
**Decision:** Conditional GO for permanent-choice-private governance; NO GO for a MACI-equivalent
anti-bribery claim on released Nox alone  
**Implementation status:** Not authorized; stop at the architecture/user-flow checkpoint

> **Current-authority note:** This was the first synthesis pass. Later user direction removed
> competitor/organizer positioning as a gate and reopened the complete feature definition pending a
> broader open-source private-voting study. Its technical findings remain evidence; its scope and gate
> recommendations are not current authority. It also predates the corrected input trust boundary:
> released `encryptInput` sends encoded plaintext to the attested Handle Gateway for encryption. Do not
> reuse its “encrypted forever,” local-encryption implication, binary/unweighted MVP, or feature-scope
> language as the current product definition; use `../decisions/CURRENT.md` and the current spec.

## Outcome first

There is a real product here, but its defensible edge is narrower than the seed brief.

The buildable Nox product is a **governance module that keeps every individual choice encrypted
forever and publicly releases only the final governance verdict after a separate privacy-participation
threshold is met**. Voter addresses, participation, timing, and re-vote transactions remain public.

The released Nox stack cannot reproduce MACI's anti-bribery machinery. It has encrypted arithmetic and
comparisons, but no arbitrary confidential program, private hashing, or signature verification. A Nox
`latestVote` rule is observable last-write-wins, not MACI's hidden reverse-valid command/key chain.

Therefore:

- **Say:** permanent choice privacy, aggregate/outcome-only disclosure, coercion-recovery through
  re-voting, real on-chain execution, and explicit current KMS trust.
- **Do not say:** anonymous voting, receipt-free voting, bribe-proof voting, a TEE that “cannot leak,”
  or correctness equivalent to MACI's process/tally SNARKs.

## What the reference systems actually teach

### MACI

MACI's coordinator can decrypt every command and can halt processing or result publication. Its proofs
do something separate and crucial: they prevent an accepted state/tally from violating the command,
nonce, key-change, credit, inclusion, and tally rules.

Re-voting is not a mutable public ballot row. Commands are processed newest-to-oldest, and only a
command signed by the current hidden state key with the exact next nonce can change the effective
ballot/key. A revealed early command is therefore unreliable evidence of the final effective choice.
Even MACI does not defeat supervised endpoints, full-session key control, denial of an override, or
last-moment coercion.

### Shutter

Production Snapshot/Shutter is the UX and operations reference: local encryption, a normal wallet
action, a proposal-level privacy toggle, visible participation/quorum, automatic asynchronous
finalization, and no new DAO application.

Its deployed privacy is temporary. After close, Snapshot obtains the proposal key, decrypts every
ballot, replaces ciphertext choices with plaintext, and computes the result. Shutter's aggregate-only
threshold-ElGamal design is the relevant permanent-privacy construction, but the published
implementation is still a proof of concept.

Shutter's distributed threshold Keypers are stronger today than Nox's single-KMS-node MVP against key
compromise and service outage. Shutter still has threshold-collusion, share-withholding, host-inclusion,
and trigger-liveness dependencies.

### Nox

Nox can accept encrypted booleans/numbers, compute encrypted counters/comparisons, retain opaque result
handles, and publicly decrypt only an approved final handle. That makes an outcome-only governance
module plausible.

The final proof is a configured Gateway signature over a handle/plaintext pair, not a SNARK of the
complete ballot corpus or operation graph. Nox computation is asynchronous, ACL grants are permanent,
and the current KMS holds one full key. These must appear in the architecture and pitch, not in fine
print.

## Guarantee matrix

| Guarantee | MACI v3 | Shutter classic | Shutter permanent PoC | Bounded Nox proposal |
|---|---|---|---|---|
| Hide choice while open | Yes from public; coordinator can read | Yes below Keyper threshold | Yes below Keyper threshold | Yes under Nox/Gateway/KMS/TEE trust |
| Keep individual choice private after close | Yes from public; coordinator still knows | No | Intended yes | Yes if ballot handles never get viewers/public decryption |
| Reveal aggregate/outcome only | Configurable tally openings, not TEE-enforced | No | Yes | Yes: decrypt verdict handle only |
| Receipt-freeness / anti-bribery | Conditional, via hidden reverse-valid key/nonce chain | No | No | No; public last-write-wins only mitigates early coercion |
| Full transition correctness proof | Process and tally SNARKs | No complete inclusion/tally proof | Proof-carrying bounded homomorphic tally | No; Gateway-signed decryption result |
| Anonymous participation | No by default | No | No by itself | No |
| Distributed key authority | One coordinator key | Threshold Keypers | Threshold Keypers intended | No; current Nox MVP has one KMS key |
| Production voting evidence | Maintained protocol | Deployed at scale | PoC only | Must be proved on Sepolia |

## Proposed bounded architecture

This is a review candidate, not an approved contract decomposition.

### Authority separation

1. **Governance host/adapter** owns proposal creation, exact target/calldata/value commitment, and
   execution authority.
2. **Eligibility source** fixes who may vote and, if used, the weight snapshot before opening.
3. **Confidential ballot module** accepts Nox handles, owns all persistent ballot/accumulator access,
   enforces phases and updates, and never grants ballot viewers.
4. **Nox protocol path** encrypts inputs, executes the fixed encrypted operations, stores results, and
   signs public-decryption output.
5. **Finalizer** supplies the final verdict proof after close; anyone may call it if the proof is valid.

No single label such as “the TEE” should collapse these authorities.

### Ballot state

For the smallest truthful MVP:

- choice is encrypted `bool` (`yes` or `no`);
- eligibility is one address/one vote from an immutable proposal allowlist or host snapshot;
- each address has one public opaque latest handle and a public update counter;
- first vote increments public unique turnout;
- re-vote replaces the opaque handle and adjusts encrypted accumulators by reversing the prior choice;
- the application persists its access to every handle needed by the dependency chain;
- voters and operators never receive viewer/admin access.

The public can see that an address voted or re-voted, but not its choice. A coercer can still supervise a
known handle or the final update, which is why the mechanism is not receipt-free.

### Close and disclosure

At close:

1. reject all new ballots;
2. if unique turnout is below the independent privacy floor, enter
   `PRIVACY_THRESHOLD_NOT_MET` and never request public decryption;
3. otherwise compute encrypted governance quorum and encrypted passage conditions;
4. derive a single encrypted `passed` boolean;
5. request public decryption only for that verdict handle;
6. accept the Gateway proof only for the proposal's exact expected handle;
7. persist `PASSED` or `REJECTED`; and
8. permit the host adapter to execute only the exact precommitted action when `PASSED`.

Exact yes/no totals remain encrypted forever. Outcome-only disclosure reduces low-turnout leakage more
than an exact aggregate, but it does not eliminate inference: a public one-voter or uniquely weighted
election can reveal that voter's choice from the outcome. The MVP must therefore use a separately named
privacy floor; governance quorum and privacy participation are different laws.

### Product states

`DRAFT → SCHEDULED → OPEN → CLOSED → TALLY_REQUESTED → AWAITING_PROOF → PASSED/REJECTED → EXECUTED`

Terminal alternatives:

- `PRIVACY_THRESHOLD_NOT_MET` — result deliberately withheld;
- `TALLY_FAILED_OR_TIMED_OUT` — confidential infrastructure did not produce the expected result;
- `EXECUTION_FAILED` — verdict is final, adapter action needs explicit retry.

“Voting ended” must never be presented as “result ready,” and a missing proof must never be rendered as
zero votes.

## First-use flow

1. A DAO proposal author enables **Confidential outcome** inside the existing proposal flow.
2. The form shows voting dates, normal passage rule, and a distinct privacy-participation minimum.
3. An eligible member selects Yes/No and signs one normal transaction; the choice is encrypted before
   reaching the voting contract. The UI states: “Your wallet and participation are public; your choice
   is not.”
4. Before close, the member can change the choice with the same action. The UI calls this “change vote,”
   not “bribe-proof.”
5. The proposal page shows public turnout and whether the privacy minimum is reachable, but no running
   option score.
6. At close, the page moves to **Tally requested** and explains that confidential computation is
   asynchronous.
7. Below the privacy floor, it ends as **Result withheld — insufficient participation**.
8. Otherwise, the page verifies and displays only **Passed** or **Rejected**, plus the proof provenance;
   no wallet-choice pairs or exact option totals appear.
9. A passed proposal executes through the host adapter, providing the demo's real public state change.

The demo moment is: two visible wallets vote and one changes its vote; no running or final individual
choice appears; after close only the verdict is decrypted and the precommitted governance action
executes on Sepolia.

## Historical collision research

Two prior VIBE entries already marketed Nox governance voting:

- [NOX Confidential Investment Club](https://dorahacks.io/buidl/43637), whose actual vote path used a
  clear `0/1` demo value and public counters;
- [ChainEstate](https://dorahacks.io/buidl/43622), whose governance contract stored and emitted the
  plaintext option.

They did not implement confidential choices, re-voting, aggregate-only disclosure, or the architecture
above. Per the user's later decision, this is background evidence only and does not gate or steer the
product.

Do not pitch “the first private voting project on Nox.” The narrower defensible positioning is: **a
clean-room governance integration that keeps individual choices encrypted permanently and decrypts only
the final executable outcome.**

## Toolchain decision

Use Foundry as the primary contract toolchain. It compiled the released Nox package and gives the
preferred unit/fuzz/invariant workflow. Keep one bounded Hardhat 3 integration harness because the
official Foundry Nox guide is still “Coming Soon,” while the released Hardhat plugin starts the real
local Nox services. The judged proof must run against released packages and Sepolia; neither harness is
allowed to substitute plaintext or a fake decryption proof.

## Decision gate

Proceed to a contract skeleton only after the user confirms the complete product definition and the
remaining technical boundaries. The earlier organizer-validation condition is superseded.

1. Decide whether the product promise remains permanent choice privacy plus outcome-only disclosure or
   adds a separate mechanism for stronger receipt resistance.
2. Select the governance host integration after a bounded adapter comparison.
3. Approve the full feature set, user flow, and critical-path proof.

Until then, the approved next action is broader research and the complete product definition—not
product code.
