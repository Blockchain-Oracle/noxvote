# Decision: Product Definition And User Flow Accepted

- **Date:** 2026-07-30
- **Status:** Accepted
- **Authority:** Latest explicit user direction
- **Supersedes:** The product-definition review gate in `CURRENT.md`
- **Does not authorize:** General implementation, testnet deployment, funded or billable
  infrastructure, public publishing, or submission claims

## Decision

The selected product is a confidential voting module for otherwise normal DAO governance.

The privacy layer changes how ballots are prepared, recorded, replaced, tallied, and disclosed. It
does not replace the host DAO's proposal, quorum, passage, queue, timelock, or execution semantics.

If a confidential proposal passes:

- a Safe executes the exact transaction committed before voting, once; or
- a compatible OpenZeppelin Governor becomes `Succeeded`, queues through its configured timelock, and
  executes its committed proposal actions through the normal Governor lifecycle.

If the proposal is rejected, withheld for insufficient privacy participation, canceled, or never
validly finalized, no action is enabled.

## Accepted Product Laws

1. The product is a module for existing governance, not a standalone DAO platform.
2. Safe is the primary retrofit and judged demo path.
3. A new or upgradeable compatible OpenZeppelin Governor is the native framework path; arbitrary
   immutable Governors are not retrofit targets.
4. Proposal authors commit the action, eligibility and voting-power snapshot, dates, governance
   quorum, passage rule, privacy floor, and replacement rule before voting opens.
5. Wallet address, voting weight, participation, and replacement timing remain public.
6. For, Against, and Abstain choices remain confidential and exact option totals are never
   intentionally published.
7. Released Nox input preparation is not browser-only encryption: the attested iExec Handle Gateway
   receives the encoded plaintext choice and returns the handle and proof used by the wallet
   transaction.
8. Public re-voting is a coercion-recovery window, not MACI-equivalent receipt-freeness or a
   bribe-proof guarantee.
9. The newest accepted ballot operation is effective. Replacements do not increase the unique-voter
   privacy count.
10. Abstain counts toward the privacy-participation floor. Privacy participation and governance quorum
    are separate rules.
11. Below the privacy floor, the result is `Withheld`: no verdict is publicly decrypted and nothing
    executes.
12. At or above the privacy floor, only a boolean Passed or Rejected verdict becomes public. Individual
    choices and exact totals remain confidential.
13. Submission, recording, Nox computation, proof readiness, finalization, queuing, and execution are
    separate states and must be shown truthfully.
14. The verification surface must bind the proposal, result evidence, and host execution without
    claiming that the Gateway signature proves the complete private tally history.
15. Nox is confidential TEE computation under its stated Gateway/KMS trust model. It is not anonymity,
    threshold custody, FHE, zero knowledge, or a tally SNARK.
16. Shutter's deployed threshold-Keyper custody is stronger against a single key compromise than the
    current single-KMS-node Nox design, and the product must say so.

## Scope Clarification

This is the full agreed product definition. It is not divided into unilateral `MVP`, `view later`, or
feature-deferral buckets. A later implementation plan may sequence work to manage dependencies, but it
must continue to represent every accepted product law and clearly distinguish sequencing from product
removal.

## Authorized Next Action

Write and reconcile a production technical-architecture candidate grounded in:

- the accepted product definition and user flow;
- the current primary-source research;
- the passing bounded local Nox-to-Safe and Nox-to-Governor proof;
- the permanent Nox trust, ACL, disclosure, and asynchronous-computation limits.

Return that architecture for user review before creating a general implementation plan or changing
product code.

## Related Artifacts

- [Current decision](CURRENT.md)
- [Plain-English product definition](../briefs/2026-07-29-plain-english-product-definition.md)
- [Product specification](../specs/2026-07-29-confidential-governance-module.md)
- [User stories](../stories/2026-07-29-confidential-governance-module.md)
- [Product surface map](../design/2026-07-29-product-surface-map.md)
- [Bounded local verification](../verification/2026-07-30-full-shape-spike-report.md)
