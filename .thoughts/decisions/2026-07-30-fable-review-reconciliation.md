# Decision Record: Fable 5 Review Reconciliation

**Date:** 2026-07-30  
**Status:** Adopted product-definition decisions; bounded local spike authorized after this decision  
**Review input:**
[`../reviews/2026-07-30-fable-5-product-review.md`](../reviews/2026-07-30-fable-5-product-review.md)

## Objective

Reconcile the external review into one complete confidential-governance product definition without
turning a hackathon feasibility concern into a feature cut, reviving competitor gates, or overstating
the released Nox trust model.

## Evidence Reconciled

1. Released SDK `encryptInput` posts the encoded plaintext value, owner, application, and type to
   `POST /v0/secrets`; the iExec Handle Gateway encrypts it and returns a handle/proof. “Client-side
   encryption” was false for the released stack.
2. Choice validity is confidential when represented as an encrypted range check. A public privacy-floor
   count therefore cannot promise to include only privately valid choices without another disclosure or
   a total encoding.
3. Gateway decryption evidence signs a handle/plaintext result. Proposal association, expected type,
   replay prevention, and execute-once behavior must be application invariants.
4. The original research seed retained anti-bribery wording that conflicts with the adopted
   non-receipt-free product boundary.

## Adopted Decisions

### D1. Accurate input trust boundary

The SDK sends the encoded plaintext choice to iExec's attested Handle Gateway. The Gateway encrypts it
and returns the opaque handle/proof before the wallet transaction. Product copy may promise that no
support value appears in public calldata/events and that individual choices are never later publicly
disclosed. It may not promise browser-side encryption, on-device-only handling, or privacy from the
Gateway.

### D2. Total three-option ballot encoding

The official client uses three canonical encrypted integer values for For, Against, and Abstain. Every
other representable value deterministically normalizes to Abstain during encrypted tallying. This avoids
a hidden validity category and gives a malicious client no governance action it could not already take
by selecting Abstain. The bounded feasibility spike must prove the exact arithmetic on released Nox
before this becomes implementation architecture.

### D3. Public privacy-floor participation

The privacy floor counts unique eligible wallets whose newest effective ballot operation is Recorded.
Pending, failed, rejected, superseded, and stale operations do not count. Replacements never increase
the unique-wallet count. For, Against, Abstain, and non-canonical values normalized to Abstain all count.
This floor mitigates low-participation inference but does not assert honest participation or eliminate
collusion/inference.

### D4. Abstain and governance rules

Abstain always counts toward the privacy floor. Governance quorum remains a separate immutable host
rule. The primary Safe/Governor demo uses the common rule in which For + Against + Abstain weight may
satisfy governance quorum while passage requires For weight greater than Against weight.

### D5. Verdict evidence and execution binding

At tally request, module state stores the proposal's expected boolean verdict handle. Finalization
accepts only configured-Gateway evidence for that handle under the expected chain domain, validates the
result encoding, and rejects wrong proposal state or replay. The Safe adapter independently restricts
execution to the precommitted target/value/calldata and one execution. These are module properties, not
facts independently proven by the Gateway signature or Safe owner nonce.

### D6. Claim and scope boundary

The complete selected feature set remains: Safe plus compatible Governor, fixed weighted
For/Against/Abstain, public Recorded participation, vote replacement, no running result, privacy-floor
withholding, async tally/failure states, verdict-only public disclosure, verification center, and exact
host action execution. No feature is labeled “later” by this reconciliation. The product does not claim
anonymity, receipt-freeness, bribe/coercion resistance, threshold custody, a tally SNARK, or client-side
encryption.

## Subsequent Gate Decision

The user subsequently said “okay lets continue” after the bounded **full-shape feasibility spike** was
named as the next gate. This authorizes the evidence-backed plan and bounded local proof work, not a
cut-down product or general contract build. The spike covers the real three-option weighted replacement
path, latency/gas, ordering/retry behavior, proof-negative tests, ACL/public-decryption invariants, Safe
execute-once, both sides of the privacy floor, and the Governor hook design note. Testnet deployment,
billable infrastructure, publishing, submission claims, and general product implementation remain
unauthorized.
