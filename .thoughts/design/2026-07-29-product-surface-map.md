# Product Surface Map: Confidential Governance Module On Nox

**Status:** Accepted functional product-surface contract as of 2026-07-30. Visual ownership is
`EXTERNAL_COMMISSION`; the user's external designer owns direction. This map defines screens and
states, not accepted visual language or implementation architecture.

## Entry Points And Navigation Flow

### Administrator installation

`Safe apps/modules or Governor setup → Confidential voting overview → Permission review → Host
confirmation → Installation verification`

### Proposal author

`Existing host proposal creation → Enable Confidential outcome → Configure privacy and voting rules →
Review decoded action and guarantees → Publish → Proposal detail`

### Voter shortest path

`Shared proposal link → Connect wallet → Eligibility confirmed → Choose For/Against/Abstain → Handle
Gateway prepares encrypted handle → Wallet confirm → Operation computing → Recorded`

### Replacement path

`Proposal detail → Your ballot operation → Change vote → New choice → Prepare handle/confirm → New
operation recorded → Previous operation superseded`

### Close, finalization, and execution

`Proposal detail → Closed → Request tally → Computing → Proof ready → Finalize → Passed/Rejected →
Queue/execute committed action → Executed`

Alternative terminal path:

`Closed → Privacy floor not met → Result withheld`

Every proposal status and receipt links to the same Verification center. The product does not introduce
a separate DAO home, treasury, member directory, or discussion product.

## Screen Inventory (by role)

### Administrator

1. **Confidential voting overview** — capability, compatibility, and guarantee summary.
2. **Adapter permission review** — exact Safe module authority or Governor compatibility.
3. **Installation verification** — installed contracts, host relationship, network, and status.

### Proposal author

4. **Host proposal editor with Confidential outcome control** — existing proposal/action fields plus
   one product toggle.
5. **Confidential voting configuration panel** — snapshot, privacy floor, choices, replacement policy,
   governance rule, and dates.
6. **Publish review** — decoded action, immutable commitments, trust acknowledgement, and validation.

### Voter and observer

7. **Proposal detail** — shared public surface for proposal content, participation, lifecycle, user
   operation, result, and execution. **DEMO-CRITICAL A**
8. **Vote drawer** — eligibility, fixed weight, choice, and privacy explanation.
9. **Ballot progress overlay** — Handle Gateway preparation, confirmation, submission, Nox computing,
   and recording.
10. **Ballot operation receipt** — public tracker, sequence, status, and supersession relationship.
11. **Change-vote confirmation** — replacement warning and newest-vote rule.
12. **Verification center** — proposal/action commitment, operation record, result proof provenance,
    limits, and execution match. **DEMO-CRITICAL C**

### Finalizer/executor

13. **Tally status panel** — privacy check, tally request, computation, proof, retry, and finalization.
    **DEMO-CRITICAL B**
14. **Execution panel** — decoded committed action, queue/delay, execution, retry, and transaction.

### Cross-host compact surfaces

15. **Proposal list row/card additions** — `Confidential` badge, public lifecycle state, privacy-floor
    progress or terminal result; never a running tally.
16. **Guarantee/trust explainer overlay** — reusable explanation reachable from installation, creation,
    proposal detail, and verification center.

## Per-screen Required States (demo-critical tier + full inventory)

### DEMO-CRITICAL A: Proposal detail

- **Loading:** proposal skeleton; no zero-value participation placeholders.
- **Scheduled:** countdown to open; immutable rules visible; vote control disabled.
- **Open, disconnected:** connect-wallet action; public participation shown; no option tally.
- **Open, ineligible:** reason and snapshot reference; verification remains accessible.
- **Open, eligible, not voted:** fixed weight and Cast confidential vote action.
- **Open, operation pending:** latest tracker and stage; participation not counted until Recorded.
- **Open, recorded:** `Your encrypted ballot is recorded`; Change vote action and replacements left.
- **Open, superseded history:** newest tracker marked Effective; older trackers marked Superseded.
- **Closed:** no new operations; transition explanation.
- **Result withheld:** deliberate privacy-floor outcome; no manual reveal control.
- **Computing:** tally request/progress; no fake percentage unless a real progress source exists.
- **Passed/Rejected:** verdict only; exact totals deliberately absent.
- **Execution queued/ready/executed/failed:** host action state separate from verdict.
- **Error:** corrupted/missing proposal data or wrong network with an actionable recovery path.

### DEMO-CRITICAL B: Tally status panel

- **Disabled before close:** deadline and why tally cannot start.
- **Privacy check pending:** effective Recorded-operation status still resolving.
- **Privacy floor failed:** terminal Result withheld and no decryption request.
- **Ready to request:** permissionless action and expected verdict handle description.
- **Request submitting / requested:** transaction and request identifier.
- **Computing:** Nox dependency status and elapsed time.
- **Proof ready:** provenance summary and Finalize action.
- **Bad proof:** rejected evidence details without accepting a result.
- **Timed out:** safe retry if the same deterministic request is allowed, otherwise terminal failure.
- **Finalized:** immutable verdict, finalizer address, proof transaction, and timestamp.

### DEMO-CRITICAL C: Verification center

- **Loading individual evidence sections independently.**
- **Pre-open:** commitments available; no ballot operations.
- **Open:** accepted and pending opaque operations; no choices or result handle decryption.
- **Closed/pending:** tally request and expected result handle, proof absent.
- **Withheld:** privacy policy check and proof that no result was finalized.
- **Finalized:** verdict evidence and execution comparison.
- **Partial indexer failure:** direct on-chain values remain distinguishable from temporarily unavailable
  enrichment.
- **Invalid/mismatch:** prominent red state for wrong action hash, wrong proof signer, wrong handle, or
  execution mismatch.

### Confidential voting overview

- **Compatible host detected**, **unsupported host**, **wrong network**, **not connected**, and **already
  installed**.
- Success state explains the four public/private boundaries before showing Install.

### Adapter permission review

- **Safe:** decoded adapter address, exact execution constraint, owner threshold, current enabled state,
  and full-authority module warning.
- **Governor:** implementation/version detection, compatible/incompatible reason, snapshot and timelock
  boundary; explain that standard clients see Pending during the post-deadline Nox gap while this
  product shows the detailed Tally pending state.
- **Confirming**, **awaiting additional Safe owners**, **rejected**, **failed**, and **installed**.

### Installation verification

- **Unverified**, **verifying**, **verified**, **configuration mismatch**, and **removed/disabled**.
- Must display host and adapter addresses even if friendly metadata fails.

### Host proposal editor with Confidential outcome control

- **Off:** native host behavior untouched.
- **On:** concise guarantee preview and Configure action.
- **Mandatory by organization policy:** on and locked with explanation.
- **Unavailable:** incompatible adapter/network with no false toggle.

### Confidential voting configuration panel

- **Blank/new**, **restored draft**, **valid**, and **field-validation error**.
- Product-specific errors: mutable/missing snapshot, privacy floor below hard minimum, floor above
  eligible population, deadline too short, replacement limit invalid, action not supported by adapter,
  and quorum/privacy labels accidentally equal but semantically unexplained.

### Publish review

- **Loading decoded action**, **valid review**, **unrecognized calldata warning**, **commitment mismatch**,
  **publishing**, **wallet rejected**, **transaction failed**, and **published**.
- Publication is disabled until the author checks the trust/guarantee acknowledgement.

### Vote drawer

- **Disconnected**, **checking eligibility**, **eligible**, **ineligible**, **wrong network**, **not open**,
  **replacement ceiling reached**, and **choice selected**.
- For/Against/Abstain are equal visual options; no preselected choice.
- The drawer never asks for a public reason because free text can disclose the vote.

### Ballot progress overlay

- Ordered stages: `Preparing encrypted handle → Ready for wallet → Submitting → Confidential
computation → Recorded`.
- The preparation explanation says that the released SDK sends the encoded choice to iExec's attested
  Handle Gateway for encryption; it does not claim browser-side encryption or on-device-only handling.
- Failure at each stage has a tailored retry. Closing the overlay does not change the operation.
- A delayed operation remains Pending and is not converted to Recorded optimistically.

### Ballot operation receipt

- **Submitted**, **computing**, **recorded/effective**, **recorded/superseded**, **rejected**, **timed out**,
  and **stale sequence**.
- It includes `This confirms operation status, not your plaintext choice` in every successful state.

### Change-vote confirmation

- **Allowed:** deadline and newest-accepted rule.
- **Pending previous operation:** block or explain the deterministic queue rule.
- **Too late**, **ceiling reached**, **wrong sequence**, and **replacement recorded**.

### Execution panel

- **Unavailable for non-passed result**, **waiting for timelock**, **ready**, **submitting**, **executed**,
  **failed/retry same action**, and **action mismatch blocked**.
- It never offers an editable transaction after voting has opened.

### Proposal list row/card additions

- Lifecycle labels: Scheduled, Open, Closed, Computing, Result withheld, Passed, Rejected, Executed,
  Tally failed, Execution failed.
- Open rows show unique recorded participation versus privacy floor, never option support percentages.

### Guarantee/trust explainer overlay

- Stable sections: `Private`, `Public`, `Trusted today`, `What the proof checks`, and `Not promised`.
- Links to current contract/network identifiers and the proposal's verification center.

## On-screen Data Shapes And Sample Data

### Proposal header

| Field         | Sample                      |
| ------------- | --------------------------- |
| Title         | Fund the ZK security review |
| Host          | Abu Research Safe           |
| Network       | Ethereum Sepolia (11155111) |
| Proposal ID   | `0x8f2a…91c4`               |
| Status        | Open — 01h 42m remaining    |
| Privacy badge | Confidential outcome        |
| Author        | `0xA13e…70B9`               |

### Proposal rules card

| Field             | Sample                                                             |
| ----------------- | ------------------------------------------------------------------ |
| Choices           | For / Against / Abstain                                            |
| Weight snapshot   | NOX Votes at block `7,482,119`                                     |
| Governance quorum | 10,000 voting weight including Abstain                             |
| Passage           | For weight greater than Against weight                             |
| Privacy floor     | 3 unique eligible wallets with Recorded operations; Abstain counts |
| Replacements      | Up to 10; latest accepted counts                                   |
| Opens             | 29 Jul 2026, 18:00 WAT                                             |
| Closes            | 29 Jul 2026, 19:00 WAT                                             |

### Participation card

| Field                 | Sample                  |
| --------------------- | ----------------------- |
| Recorded participants | 4 of 9 eligible wallets |
| Privacy progress      | Floor met: 4 / 3        |
| Pending operations    | 1                       |
| Running result        | `Hidden by design`      |

### Connected-voter card

| Field                  | Sample               |
| ---------------------- | -------------------- |
| Wallet                 | `0x71C4…f9A2`        |
| Eligibility            | Eligible at snapshot |
| Fixed weight           | 1,250                |
| Latest operation       | `op_7E19…A44C`       |
| Sequence               | 2                    |
| Status                 | Recorded — Effective |
| Replacements remaining | 8                    |

The connected-voter card does **not** repeat the selected choice after submission.

### Operation receipt

| Field                   | Sample                                |
| ----------------------- | ------------------------------------- |
| Tracker                 | `op_7E19…A44C`                        |
| Proposal                | `0x8f2a…91c4`                         |
| Wallet                  | `0x71C4…f9A2`                         |
| Sequence                | 2                                     |
| Submitted transaction   | `0x39bd…21f0`                         |
| Opaque ballot reference | `0x0200…9ab3`                         |
| Submitted at            | 29 Jul 2026, 18:34:12 WAT             |
| Recorded at             | 29 Jul 2026, 18:34:29 WAT             |
| Effective state         | Effective; supersedes `op_61B2…883A`  |
| Receipt limit           | Confirms status, not plaintext choice |

### Tally status

| Field                   | Sample                                                   |
| ----------------------- | -------------------------------------------------------- |
| Privacy check           | Passed — 4 unique eligible wallets Recorded              |
| Request ID              | `tally_0D77…B012`                                        |
| Expected verdict handle | `0x0200…4ed8`                                            |
| Requested by            | `0x4B0a…17D1`                                            |
| Compute state           | Proof ready                                              |
| Elapsed                 | Measured runtime shown here; never a fabricated estimate |

### Final result

| Field                    | Sample                                              |
| ------------------------ | --------------------------------------------------- |
| Verdict                  | Passed                                              |
| Exact option totals      | Not disclosed                                       |
| Finalization transaction | `0xb487…aa04`                                       |
| Proof signer             | Nox Gateway `0x90F2…110C`                           |
| Proof statement          | Expected verdict handle decrypts to `true`          |
| Proof limitation         | Does not prove the complete ballot-processing graph |

### Committed Safe action

| Field                  | Sample                            |
| ---------------------- | --------------------------------- |
| Action                 | Transfer 1,000 USDC               |
| Target                 | USDC `0x1c7D…C7238`               |
| Recipient              | `0xD0c3…3e91`                     |
| Value                  | 0 ETH                             |
| Calldata hash          | `0x2a11…f08d`                     |
| Module execution guard | Proposal commitment; execute once |
| Execution state        | Ready                             |

### Trust summary

| Field                   | Sample copy                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Private from the public | Your choice and exact option totals                                                                                  |
| Public                  | Wallet, weight, participation time, and replacements                                                                 |
| Trusted today           | The Handle Gateway sees the input; Nox TEE stack, single-node KMS, Gateway signer, deployed module code              |
| Proof checks            | The configured Gateway signed this plaintext for the stored expected handle; module state binds proposal/type/replay |
| Not promised            | Client-side encryption, anonymity, receipt-freeness, bribe-proof voting, full tally SNARK                            |

## Generated Artifacts (documents, exports, receipts)

- **Proposal share link:** opens the public proposal detail on the exact chain/host.
- **Ballot operation receipt:** copyable link/JSON containing public status fields only. It is always
  called an operation receipt, never a vote/choice receipt.
- **Verification record:** shareable page and machine-readable export of public commitments, accepted
  operation statuses, proof provenance, verdict, and execution linkage.
- **Execution record:** host transaction link and decoded comparison against the committed action.
- **No ballot export:** there is no individual decrypted-ballot CSV, admin view, or recovery download.

## Copy And Vocabulary Rules

- Say **Confidential outcome**, **encrypted choice**, **operation recorded**, **change vote**, **privacy
  floor**, **result withheld**, **tally requested**, and **proof ready**.
- Do not say **anonymous** unless a separate anonymous eligibility mode is actually implemented.
- Do not say **bribe-proof**, **coercion-resistant**, **receipt-free**, **trustless**, **fully verified**,
  **unhackable TEE**, or **zero knowledge** for the Nox path.
- Do not say **client-side encryption**, **encrypted in your browser**, or **your choice never leaves your
  device**. Say that the Handle Gateway prepares the encrypted handle before the wallet transaction.
- Use `Your wallet and participation are public; your choice is private.` near the voting action.
- Use `Changing your vote can help you recover from pressure, but the replacement is publicly visible.`
  in the replacement flow.
- Use `Exact totals are not disclosed` rather than rendering blank, zero, or unavailable totals.
- Use `Result withheld` rather than `Failed quorum` for the privacy-floor branch.
- Keep governance quorum and privacy floor visually and verbally distinct.
- Never show a fake computation percentage. Use named stages and elapsed time.

## Decided vs Designer's Call

### Decided product behavior

- One proposal detail surface, not a new DAO application.
- Proposal-level confidential toggle plus organization policy.
- For/Against/Abstain; fixed snapshot weight; replacement voting.
- No running option result and no final exact totals.
- Distinct privacy floor and governance quorum.
- The privacy floor counts unique eligible wallets with effective Recorded operations; Abstain counts,
  while replacements do not add another participant. Governance quorum follows the committed host rule.
- Async state names and all terminal/failure states listed above.
- Public operation receipt without plaintext-choice proof.
- Verdict-only finalization and exact-action execution.
- Permanent, reachable guarantee/trust explanation.

### Designer's call

- Layout, density, typography, color, motion, iconography, and responsive composition.
- Whether proposal rules use a card, table, or disclosure panel, provided every required field remains
  visible before voting.
- How the async stages are visualized without implying fabricated progress.
- How the verification center groups evidence while preserving the distinction between on-chain facts,
  indexed enrichment, and explanatory copy.
- The visual treatment of deliberately hidden totals; it must communicate intent rather than absence.

## Traceability

- Screens 1–3: Story S1; spec R1, R12.
- Screens 4–6: Story S2; spec R2, R3, R7, R12, R14.
- Screens 7–11: Stories S3–S6, S10; spec R3–R8, R13–R14.
- Screen 12: Story S9; spec R11–R12.
- Screens 13–14: Stories S7–S8, S10; spec R8–R10, R13.
- Screens 15–16: Stories S1, S5, S9; spec R6, R11, R12, R14.

## Open Questions

- Whether Safe installation can live inside a standard Safe app surface or requires a shareable
  transaction-builder flow for the hackathon environment.
- Whether the connected-voter card may safely show the raw opaque handle or should show only a derived
  proposal-scoped tracker.
- How much technical proof detail belongs on the first verification screen versus an advanced drawer.
- The real Nox status signals available between Submitted and Recorded; the surface must not invent
  stages the released stack cannot observe.
- Whether mobile wallet handoff can preserve the encrypted input without forcing the voter to repeat
  the choice after connection.
