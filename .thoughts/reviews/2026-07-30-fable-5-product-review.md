# Independent Fable 5 Product and Architecture Review

**Date:** 2026-07-30  
**Reviewer:** Claude Fable 5, max effort  
**Mode:** Read-only (`Read,Grep,Glob`; plan permission mode; no session persistence)  
**Scope:** The complete current confidential-governance product package named by
`.thoughts/decisions/CURRENT.md`, including the product definition, research brief, product spec,
stories, surface map, architecture research, open-source landscape, governance-host comparison,
Nox/MACI/Shutter reports, and source manifest.

**Disposition:** Accepted as advisory evidence on 2026-07-30. F1–F4, the Recorded-participation floor,
Abstain semantics, and the Safe execute-once clarification were reconciled across the active product
artifacts. The review itself did not authorize work; the user subsequently authorized planning and
bounded local proof work for the recommended full-shape feasibility spike.

This file preserves the substance, findings, evidence pointers, and recommendations of the external
review. Formatting and a few repeated transitions were normalized when recording the CLI output; no
finding or verdict was changed.

## Overall verdict

**CONDITIONAL PASS.** The product is coherent, unusually honest for a hackathon corpus, genuinely
valuable, and demoable. The Nox design is expressible with released primitives. It may advance to a
bounded critical-path feasibility spike after four definition-level corrections. Those conditions are
wording or mechanism decisions measured in hours, not a redesign, and do not require cutting a
feature.

The authority chain is coherent: `AGENTS.md` → `.thoughts/decisions/CURRENT.md` → the linked draft
artifacts. The review falls inside the authorized shared-review gate. No repository mutation was
requested from Fable. One operational observation is that the repository has zero commits and the
entire corpus is still untracked working-tree content.

## Product restatement

A confidential-outcome voting module that bolts onto existing DAO execution: a Safe module for the
primary judged path, plus a counting extension for a new or upgradeable OpenZeppelin Governor. A
proposal commits an exact action, voting dates, an eligibility and weight snapshot, a governance
passage rule, and a separate privacy-participation floor before voting opens.

Eligible wallets vote For, Against, or Abstain. The public chain receives an opaque Nox handle rather
than a support value. Wallets, weights, timing, participation, and replacements remain public. Voters
may replace a vote until close; this is a coercion-recovery window, not receipt-freeness. The weighted
tally runs as a chain of encrypted Nox operations. Below the privacy floor, the result is withheld
forever. At or above it, exactly one derived verdict boolean becomes publicly decryptable. The contract
accepts Gateway-signed evidence only for its pre-known expected handle, and a Passed verdict authorizes
only the precommitted action. Individual choices and exact option totals are never intentionally
decrypted.

The spec, stories, surface map, and `CURRENT.md` describe the same product. Two older artifacts drift:
the research brief still targets bribery resistance, and the architecture synthesis describes a
binary, unweighted one-address-one-vote MVP. The synthesis is explicitly non-current authority, but
the brief lacks the same warning.

## What is strong

- The guarantee matrix, non-goals, banned copy, and single-node KMS disclosure make the trust story
  unusually honest.
- The primary-source research checked by Fable was accurate: ACL access is monotonic; Nox handle proof
  binds owner, application, and creation time but not proposal; decryption proof signs the handle and
  result hash; the present MVP uses a single KMS; the official Foundry guide is a placeholder; and the
  Hardhat 3 package supplies the real local stack.
- The separate privacy floor and governance quorum is a meaningful product insight.
- The async and terminal failure states are fully named, including result-withheld and tally-timeout
  states, with no plaintext fallback or administrator-selected verdict.
- The value proposition survives without anti-bribery claims: unlike systems that reveal all choices
  after close, this product deliberately reveals only a one-bit verdict.

## Blocking product-definition findings

### F1 — “Client-side encryption” is false for released Nox

**Severity: High; honesty-critical but wording-fixable.**

The product spec says the choice is encrypted in the client
(`.thoughts/specs/2026-07-29-confidential-governance-module.md:115`), with equivalent claims in the
plain-English definition and stories. Released `encryptInput` encodes the plaintext choice and sends it
to `POST /v0/secrets` (`.thoughts/raw/iexec-nox/nox-handle-sdk/src/methods/encryptInput.ts:148`). The
Handle Gateway receives that plaintext and encrypts it inside its iExec-operated TDX environment
(`.thoughts/raw/iexec-nox/nox-handle-gateway/README.md:38`). Our Nox feasibility research already says
this correctly; the product artifacts drifted from it.

The endpoint also accepts caller-supplied `owner` and `applicationContract` fields. Ownership is
ultimately enforced by the on-chain import check, not by the encryption operation itself.

**Required correction:** replace “client-side encryption” with a truthful trust-boundary statement:
the attested iExec Handle Gateway receives the plaintext choice, encrypts it, and returns a handle; the
choice never appears in the wallet transaction or on-chain. Update the ballot preparation overlay and
trust panel accordingly. The demo claim “inspect any transaction and find no support value” remains
true.

### F2 — “Valid recorded ballots” cannot currently be the public privacy-floor counter

**Severity: High; a mechanism decision is required.**

R7 bases the floor on unique eligible voters with valid encrypted ballots, AC4 says an invalid choice
cannot affect privacy participation, and R6 asks the UI to expose valid recorded operations. But choice
validity is confidential: a range check yields an encrypted boolean. The public contract cannot count
only valid ballots without revealing or otherwise deriving a public validity signal. The spec lists
this tension as an open question but its acceptance criteria currently promise the unresolved
conjunction.

Fable gives three choices:

1. Count eligible wallets with recorded operations for the privacy floor and neutralize invalid choices
   only in the encrypted tally.
2. Publicly decrypt a separate “privacy floor met” boolean before the verdict, adding one disclosed bit
   and another async stage.
3. Use a structurally valid ballot encoding that cannot represent an out-of-range choice.

The choice must be made before the spike, along with whether Abstain contributes to the privacy floor.

### F3 — The canonical research brief still sells a forbidden claim

**Severity: Medium-high; authority hygiene.**

The canonical brief calls the target “real bribery/coercion resistance” and proposes a
“bribery-resistant voting module”
(`.thoughts/briefs/2026-07-29-confidential-voting-research-brief.md:13` and `:169`). That conflicts with
the newer guarantee boundary in `CURRENT.md` and the product spec. Because `CURRENT.md` still links it
as the canonical brief without a supersession note, a pitch written from that brief could revive a
forbidden claim.

**Required correction:** annotate the brief so its anti-bribery target and positioning sentence are
explicitly superseded by the current receipt-freeness boundary.

### F4 — Verdict-evidence binding is asserted but not specified as module laws

**Severity: Medium.**

R9 says finalization binds the evidence to the exact handle, proposal, chain, and expected result type.
The released decryption proof itself signs the handle and the hash of the decrypted result. Chain
binding comes from the EIP-712 domain, result type from the handle type byte, and proposal binding must
come from application state. The module must store the expected verdict handle at tally request, accept
only the correct boolean encoding for that handle, and finalize once. The on-chain validator checks the
Gateway signature; it does not independently prove that the tally arithmetic was correct.

**Required correction:** specify these module laws and negative tests explicitly. Say “the contract
binds the evidence to its stored expected handle,” not that the Gateway proof independently attests the
proposal or tally.

## Mandatory feasibility proofs before implementation

- **P1 — Full real chain at product shape:** prove three-option, weighted ballots with one replacement
  through real `encryptInput`, handle import, ACL, encrypted validation, one-hot weighted arithmetic,
  replacement, privacy gate, verdict derivation, public decryption, proof validation, and Safe action.
  The released Nox operation types require proving the exact arithmetic composition; do not assume a
  normal encrypted boolean AND/OR primitive exists.
- **P2 — Measured latency and gas:** measure submission-to-resolution and close-to-proof-ready at demo
  scale. The surface map’s example “22 seconds” is not evidence. A sequential Runner pipeline may make
  a live tally materially longer.
- **P3 — Replacement determinism and failure recovery:** reject stale, duplicate, and out-of-order
  replacements; prove at-least-once delivery cannot corrupt the tally; make a stalled dependency
  diagnosable and a deterministic retry safe.
- **P4 — Evidence-binding negative tests:** reject the wrong signer, handle, type, plaintext length,
  replay, early decryption, and duplicate finalization.
- **P5 — Ballot-privacy invariant:** after a complete flow, every ballot/intermediate handle must remain
  module-only, have zero viewers, and never emit public-decryption authorization. A below-floor proposal
  must emit no public-decryption authorization at all.
- **P6 — Safe least-authority invariant:** execute the precommitted action once and reject a modified
  target, value, calldata, or second execution. Safe owner nonces do not provide this replay protection;
  the adapter must enforce proposal-scoped execute-once.
- **P7 — Privacy-floor mechanism:** observe both sides of the selected floor rule with real behavior.
- **P8 — Governor paper gate:** before building it, show how a compatible Governor disables every
  plaintext standard cast path and reconciles synchronous Governor state/counting hooks with an
  asynchronous verdict while preserving the queue/timelock.

## Non-blocking improvements

- Commit the corpus so its claimed authority and provenance chain is versioned.
- Replace the invented “iExec Nox Sepolia” network name with a real configured test network.
- Remove the sample “Safe nonce binding” claim; module execution needs its own execute-once invariant.
- Decide Abstain’s governance-quorum and privacy-floor semantics before the arithmetic spike.
- Decide whether the operation tracker exposes a raw handle or a proposal-scoped ID.
- Add the coercer-prepared-handle scenario to the user-facing “not promised” rationale.
- State that the TDX measurement whitelist is presently off-chain and operator-controlled.

## Trust and security reality

- Ballot privacy trusts the Handle Gateway, which sees plaintext input; the single-node KMS; the Runner,
  which decrypts operands inside its enclave; the attestation and operator-controlled whitelist; S3
  ciphertext custody; and iExec as operator of the stack.
- Verdict integrity trusts the same parties. The accepted evidence proves that the configured Gateway
  signed a plaintext for a handle, not that a cryptographic tally proof established the arithmetic.
- Availability is centralized across the current Gateway/KMS/Runner/NATS path. “Tally failed or timed
  out” is a real product state, not cosmetic error copy.
- No external mechanism is imported without assumptions: the product does not claim MACI’s hidden
  reverse-valid chain, Shutter’s threshold custody, rerandomization, cast-or-spoil, or a tally SNARK.
- The privacy floor reduces but cannot eliminate inference in a known or uniquely weighted electorate.
- L1/L2 transaction inclusion governs ballot censorship; centralized Nox services govern tally
  liveness.

## Safe and Governor reality

The Safe path is honest and demoable. Enabling a module gives it broad Safe execution authority;
“least authority” is therefore an invariant of our adapter code, not a restriction Safe enforces. The
adapter must accept only the committed action hash, once, before expiry.

The Governor path is correctly limited to compatible new or upgradeable Governors. Its unresolved
work is mechanical: the standard OpenZeppelin cast path exposes plaintext support, while Governor
derives success synchronously. A compatible adapter must disable the standard cast path and keep the
proposal non-succeeded until asynchronous verdict finalization. Third-party Governor tooling may
therefore misread the intermediate state. Resolve that on paper before scoping the Governor build.

## Four-minute demo verdict

**Demoable, with one hard dependency: measured tally latency.** Do not allow live Nox computation to
become dead air.

1. Show the Safe module enabled and an exact 1,000-USDC action committed on a real explorer.
2. Use three prestaged voters, then cast one live replacement. Inspect raw calldata: handle and proof,
   no support value. Show the public operation history and no running result.
3. Close and request tally. Show named async stages and the expected verdict handle before evidence is
   ready. If real measured latency exceeds roughly one minute, switch transparently to an equivalent
   earlier on-chain proposal already at proof-ready; never fake the path.
4. Finalize the Gateway evidence. Show exactly one public-decryption authorization for the verdict
   handle, permanent private ACLs for ballots/intermediates, and a below-floor sibling proposal with no
   decryption event.
5. Execute exactly the committed Safe transfer and show a mismatched action reverting. End with the
   honest single-operator KMS/Gateway trust statement.

Encryption, handles, proofs, Nox operations, ACL state, below-floor withholding, and Safe execution
must never be mocked. If the pipeline fails live, show the honest failure state.

## Truthful positioning

> A drop-in confidential-outcome module for Safe and Governor: wallets and turnout stay public, every
> individual choice and the exact totals stay encrypted under iExec’s attested Nox stack, and after a
> privacy floor the chain decrypts exactly one bit — Passed or Rejected — which executes exactly the
> action the DAO reviewed before voting.

Do not claim: receipt-free, bribe-proof, coercion-resistant, anonymous, trustless, zero-knowledge,
tally SNARK, cryptographically proven tally, MACI-equivalent, threshold-key custody, “the TEE cannot
leak,” “first private voting on Nox,” client-side encryption, “your vote never leaves your device,” or
Shutter-grade key security.

## Recommended next gate

Advance to a bounded critical-path feasibility spike only after the user:

1. approves the F1 wording correction and Gateway-plaintext trust statement;
2. selects the F2 privacy-floor mechanism;
3. approves the canonical-brief supersession annotation; and
4. decides Abstain semantics.

The spike should exit only with P1–P7 evidence and the P8 Governor design note. General contract
implementation, deployment beyond the spike, publishing, and submission claims remain unauthorized
until the spike passes review.
