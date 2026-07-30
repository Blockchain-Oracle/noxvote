# Current Product Decision

- **Status:** Confidential voting on Nox is the selected pivot. The user accepted the complete product
  definition, feature set, user flow, trust boundaries, normal-DAO execution semantics, and production
  technical architecture. The bounded local technical gate passes: real Nox-to-Safe, Runner restart,
  explicit JetStream negative-acknowledgement redelivery, the full named proof-negative matrix, and real
  Nox-to-compatible-Governor-to-Timelock execution all pass. The contract quality profile and
  contract-only implementation plan are now ready for review. General implementation and testnet
  deployment are not yet authorized.
- **Product shape:** A host-neutral confidential ballot core with a Safe execution adapter and a
  compatible OpenZeppelin Governor counting adapter, not a standalone DAO app. Safe is the primary
  judged retrofit/execution path; Governor is the native governance-framework integration.
- **Core promise:** Eligible, publicly visible voters submit confidential choices whose support values
  never appear on-chain or become public. After Handle Gateway ingestion, ballot handles,
  intermediates, and exact option totals remain non-public; after an independent
  privacy-participation floor, only the final pass/reject verdict is publicly decrypted and may drive
  an exact governance action.
- **Claim boundary:** Re-voting provides a coercion-recovery window, but released Nox cannot implement
  MACI's hidden reverse-valid key/nonce command chain. Do not claim receipt-freeness, bribe-proof voting,
  anonymity, or MACI-equivalent correctness.
- **Input trust boundary:** Released Nox does not perform browser-side encryption. The SDK sends the
  encoded plaintext choice to the iExec-operated, attested Handle Gateway, which encrypts it and returns
  the handle/proof used by the wallet transaction. Never claim that the choice stays on-device or that
  the Gateway cannot see it.
- **Participation decision:** The privacy floor counts unique eligible wallets whose newest effective
  ballot operation is Recorded. A replacement does not add another participant; pending, failed,
  rejected, and stale operations do not count. Abstain counts toward the privacy floor. The canonical
  encrypted input values represent For/Against/Abstain, and every other representable value is
  deterministically normalized to Abstain rather than creating a private validity class.
- **Governance decision:** Privacy participation is separate from governance quorum. The quorum and
  passage rule is committed before open and follows the compatible host; the primary demo uses the
  common rule in which Abstain contributes to quorum while passage is For weight greater than Against
  weight.
- **Design ownership:** `EXTERNAL_COMMISSION`. The user's external designer owns visual direction.
  Product mapping is accepted; visual direction, tokens, and UI implementation remain pending and may
  not be invented by the contract track.
- **Current gate:** Review the contract-only implementation plan. Contract implementation requires a
  later explicit authorization. Stop before frontend implementation, testnet deployment,
  funded/billable infrastructure, public publishing, or submission claims without another explicit
  user authorization.
- **Competitive-field decision:** Other hackathon builders and previous voting-positioned projects are
  informational research only. They are not an eligibility, positioning, product-selection, or build
  gate unless the user explicitly changes that decision.
- **User preferences:** Re-voting and minimum-quorum-before-reveal are non-negotiable starting
  constraints. Foundry is preferred if released Nox tooling and dependencies support it cleanly.
- **Canonical brief:**
  [`../briefs/2026-07-29-confidential-voting-research-brief.md`](../briefs/2026-07-29-confidential-voting-research-brief.md)
- **Plain-English product definition:**
  [`../briefs/2026-07-29-plain-english-product-definition.md`](../briefs/2026-07-29-plain-english-product-definition.md)
- **Product-definition acceptance decision:**
  [`2026-07-30-product-definition-acceptance.md`](2026-07-30-product-definition-acceptance.md)
- **Architecture and contract-planning authorization:**
  [`2026-07-30-contract-planning-authorization.md`](2026-07-30-contract-planning-authorization.md)
- **Accepted production technical architecture:**
  [`../design/2026-07-30-confidential-governance-technical-architecture.md`](../design/2026-07-30-confidential-governance-technical-architecture.md)
- **Active contract quality profile:**
  [`../quality/2026-07-30-contract-quality-profile.md`](../quality/2026-07-30-contract-quality-profile.md)
- **Active contract-only implementation plan:**
  [`../plans/2026-07-30-confidential-governance-contract-implementation-plan.md`](../plans/2026-07-30-confidential-governance-contract-implementation-plan.md)
- **Active research plan:**
  [`../plans/2026-07-29-confidential-voting-research-plan.md`](../plans/2026-07-29-confidential-voting-research-plan.md)
- **Historical first-pass architecture synthesis (technical evidence only):**
  [`../research/2026-07-29-confidential-voting-architecture-synthesis.md`](../research/2026-07-29-confidential-voting-architecture-synthesis.md)
- **Broader landscape:**
  [`../research/2026-07-29-open-source-private-voting-landscape.md`](../research/2026-07-29-open-source-private-voting-landscape.md)
- **Governance-host comparison:**
  [`../research/2026-07-29-governance-host-comparison.md`](../research/2026-07-29-governance-host-comparison.md)
- **Accepted product spec:**
  [`../specs/2026-07-29-confidential-governance-module.md`](../specs/2026-07-29-confidential-governance-module.md)
- **Accepted functional stories:**
  [`../stories/2026-07-29-confidential-governance-module.md`](../stories/2026-07-29-confidential-governance-module.md)
- **Accepted functional product surface; visual direction unresolved:**
  [`../design/2026-07-29-product-surface-map.md`](../design/2026-07-29-product-surface-map.md)
- **External product and architecture review:**
  [`../reviews/2026-07-30-fable-5-product-review.md`](../reviews/2026-07-30-fable-5-product-review.md)
- **Review reconciliation decision:**
  [`2026-07-30-fable-review-reconciliation.md`](2026-07-30-fable-review-reconciliation.md)
- **Active full-shape feasibility plan:**
  [`../plans/2026-07-30-full-shape-feasibility-spike.md`](../plans/2026-07-30-full-shape-feasibility-spike.md)
- **Bounded local PASS verification audit:**
  [`../verification/2026-07-30-full-shape-spike-report.md`](../verification/2026-07-30-full-shape-spike-report.md)
- **Historical first-pass delivery plan:**
  [`../plans/2026-07-29-confidential-voting-decision-plan.md`](../plans/2026-07-29-confidential-voting-decision-plan.md)
  (`REAL_MVP`, `REAL_LATER`, organizer-blocker, and unilateral feature-deferral labels are superseded.)
- **Previous project:** NoxLimit is superseded as the active product but preserved, not deleted, at
  `/Users/abu/dev/hackathon/wtf-noxlimit-archive-2026-07-29` with Git history and dirty working tree intact.

## Resolved Facts

1. MACI's re-vote property comes from a hidden reverse-valid signature/key/nonce state machine, not
   encryption or public latest-write-wins alone.
2. Deployed Shutter reveals individual plaintext ballots after close; its aggregate-only construction
   remains a PoC. Its threshold key management is stronger today than Nox's single-KMS MVP.
3. Nox ACL grants/public decryption are irreversible, compute is asynchronous, and public-decryption
   proof is a Gateway signature rather than a full computation proof.
4. Foundry compiles the released Solidity package, but official local Nox E2E support is Hardhat 3.
5. Outcome-only disclosure plus a distinct privacy floor is safer than publishing exact totals, but it
   cannot eliminate inference or create anonymity.
6. Released `encryptInput` sends the plaintext input to the attested Handle Gateway for encryption; the
   accurate product claim is off-chain/public confidentiality under the declared Nox trust model, not
   client-side encryption.
7. Public privacy-floor progress cannot depend on a hidden “valid choice” classification without
   another disclosed result. The adopted total ballot encoding makes every accepted input a defined
   choice and lets the floor use public Recorded participation.
8. Released local Nox resolves the selected four-voter, unequal-weight, three-option graph with a
   non-canonical normalization and two replacements; the latest measured full path is about 12 seconds
   on warm local Docker services.
9. An official Safe 1.5.0 proxy can enable the module through a normal owner-threshold transaction and
   execute only the committed action once without using the Safe owner nonce as replay protection.
10. OpenZeppelin Governor 5.6.1 permits disabling every plaintext cast route, but its standard state
    enum has no asynchronous tally/proof state. The compatible spike maps an ended unresolved proposal
    to standard Pending, exposes detailed TallyPending, then proves Succeeded/Queued/timelock-delayed
    execution after a real Nox proof. Arbitrary immutable Governors remain unsupported, and third-party
    tools may misread the compatibility Pending state.
11. The released Hardhat and Handle packages require bounded consumer workarounds locally: the plugin
    drops `PATH` from Docker Compose, and the Handle SDK derives owner from `getAddresses()[0]`.
12. A graph scheduled while the real local Runner is stopped remains unresolved, then resolves to the
    same stored expected verdict handle and finalizes successfully after Runner restart.
13. The real durable JetStream consumer redelivers a tally transaction after explicit `-NAK`; its
    delivery sequence advances twice and the Runner acknowledges the same deterministic result.
14. Wrong decryption signer, domain, cross-proposal handle, plaintext type/length, boolean encoding,
    early/wrong state, proof mutation, and duplicate finalization all reject independently.
15. A below-floor confidential Governor proposal maps to detailed Withheld and standard Defeated; a
    passed one queues through the real OpenZeppelin TimelockController and executes only after delay.
16. The user accepted the complete product and confirmed that execution remains normal DAO
    governance: a Passed Safe proposal executes its exact committed transaction once, while a Passed
    compatible Governor proposal queues through its configured timelock before normal execution.
17. The user accepted the production technical architecture, assigned visual design to an external
    designer, and authorized contract-only planning while UI planning remains paused.
18. The contract plan adopts Safe-threshold proposal registration, the proven four-wallet/floor-four
    judged configuration with two replacements, direct-call or `MultiSendCallOnly` Safe execution,
    indefinite tally-pending recovery, and immutable versioned contracts.

## External Gates And Unclaimed Scale

1. Larger electorates remain an unclaimed scale dimension until separately benchmarked; the judged
   contract configuration is four eligible wallets and floor four.
2. Live Ethereum Sepolia gas, latency, failure, addresses, deployment, and funded account use require
   same-day verification and explicit authorization.
3. Visual direction and frontend planning remain pending the external designer's return, audit, and
   user acceptance.
