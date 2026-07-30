# Stories: Confidential Governance Module On Nox

**Status:** Accepted functional stories as of 2026-07-30; no implementation plan is implied.

## Traceability

| Story                                  | Primary spec requirements |
| -------------------------------------- | ------------------------- |
| S1 Install a host adapter              | R1, R10, R12              |
| S2 Publish a confidential proposal     | R2, R3, R7, R12, R14      |
| S3 Cast a confidential vote            | R3, R4, R5                |
| S4 Replace a vote                      | R3, R5                    |
| S5 Observe a live proposal             | R6, R7, R14               |
| S6 Withhold a low-participation result | R7, R8, R9                |
| S7 Finalize a verdict                  | R8, R9, R12, R13          |
| S8 Execute the approved action         | R1, R10                   |
| S9 Verify the public record            | R5, R11, R12              |
| S10 Recover from failure               | R5, R8, R13               |

## Story 1: Install A Host Adapter

As a DAO administrator,
I want to install the confidential voting module into our Safe or compatible Governor,
so that sensitive proposals can use private counting without replacing our treasury or timelock.

### Acceptance Criteria

- A Safe owner sees the exact module address, network, permissions, and warning that an enabled module
  is security-critical before creating the enable transaction.
- The Safe's existing owner threshold authorizes installation.
- A Governor administrator sees whether the Governor is compatible and that immutable incompatible
  Governors cannot be retrofitted.
- Installation verification shows the host, adapter, confidential core, and allowed execution path.

### Scenarios

```gherkin
Given the adapter has not been enabled on the Safe
When the required owners confirm the exact adapter address
Then the Safe records the adapter as enabled
And the product verifies the relationship on-chain
And no proposal action has been authorized yet
```

### Notes

The installation flow must not imply that Nox or the module inherits the Safe's audit status.

## Story 2: Publish A Confidential Proposal

As a proposal author,
I want to configure confidential voting while preparing a real host action,
so that the rules and execution target cannot be changed after members begin voting.

### Acceptance Criteria

- The form captures the action, snapshot, dates, choices, governance rule, privacy floor, and replacement
  policy.
- The form explains that the privacy floor counts unique eligible wallets with Recorded operations,
  including Abstain, while governance quorum follows the separately committed host rule.
- A guarantee preview says what is private, what remains public, and which Nox parties are trusted.
- The review step renders the decoded action and immutable commitment.
- Publication is blocked when the privacy floor violates organization bounds, the deadline is invalid,
  or the adapter cannot authorize the action.
- After opening, no committed field is editable.

### Scenarios

```gherkin
Given an author configured a Safe transfer and a privacy floor of three voters
When the author publishes after reviewing the decoded transfer and trust statement
Then the proposal commits the exact target, value, calldata, snapshot, rules, and deadlines
And the proposal becomes Scheduled or Open according to the configured start
```

### Notes

Governance quorum and privacy floor must appear as separate controls with separate explanations.

## Story 3: Cast A Confidential Vote

As an eligible DAO member,
I want to cast For, Against, or Abstain without publishing my choice,
so that I can participate without creating a permanent wallet-to-choice record.

### Acceptance Criteria

- The connected wallet sees its eligibility and fixed voting weight.
- Before wallet submission, the SDK sends the encoded choice to iExec's attested Handle Gateway, which
  returns an encrypted handle/proof. The UI does not describe this as client-side encryption.
- The transaction exposes no plaintext choice.
- The UI progresses through encryption, wallet confirmation, submission, confidential computing, and
  recorded status.
- Only Recorded counts; a submitted or failed operation does not.
- The voter receives an operation tracker that does not attest to the plaintext choice.

### Scenarios

```gherkin
Given my wallet is eligible with a fixed weight of 1250 votes
When I choose For and complete Handle Gateway encryption and wallet confirmation
Then the public transaction contains an opaque handle and proof
And the proposal eventually marks my operation Recorded
And no observer can read For from the supported public interface
```

### Notes

If the real Nox stack cannot satisfy this end to end, the product claim fails; a plaintext fallback is
not an acceptable scenario. The Handle Gateway is nevertheless inside the declared trust boundary and
sees the encoded plaintext input during encryption; the support value never enters the public wallet
transaction.

## Story 4: Replace A Vote

As a voter who changed my mind or acted under pressure,
I want to replace my vote before the deadline,
so that only my newest accepted choice contributes to the outcome.

### Acceptance Criteria

- The proposal shows the replacement deadline, replacements already used, and any declared ceiling.
- A replacement follows the same encryption and recording states as the first vote.
- The previous operation remains in the public history as superseded, without revealing either choice.
- Exactly one effective weight contribution remains after the replacement.
- The page explicitly states that the wallet, time, and fact of replacement are public and that the
  mechanism is not receipt-freeness.

### Scenarios

```gherkin
Given my For operation is Recorded and voting is still open
When I submit an accepted Against replacement with the next sequence number
Then the new operation becomes Recorded
And the previous operation becomes Superseded
And only the encrypted Against contribution is effective
```

```gherkin
Given two replacements arrive out of order
When the ballot core resolves their proposal-scoped sequence numbers
Then only the valid next operation becomes effective
And the late stale operation cannot alter the tally
```

### Notes

This is a coercion-recovery window. It does not hide that a replacement happened.

## Story 5: Observe A Live Proposal

As a DAO member or observer,
I want to understand participation and privacy status without seeing a running result,
so that the proposal is usable without leaking the confidential tally.

### Acceptance Criteria

- The live page shows time remaining, unique Recorded participants, eligible population/weight, privacy
  floor progress, and the user's newest operation status.
- It shows no option totals, leader, projected verdict, or choice-coded visualization.
- Submitted/pending operations are not counted as recorded participation.
- The trust summary and verification link remain visible.

### Scenarios

```gherkin
Given seven eligible voters have Recorded effective operations and two operations are still computing
When I open the proposal page
Then I see seven recorded participants and two pending operations
And I cannot see which choice is leading or any option weight
```

## Story 6: Withhold A Low-participation Result

As a voter,
I want the system to disclose nothing when too few people participated,
so that a nominal aggregate does not trivially reveal individual choices.

### Acceptance Criteria

- Close checks unique eligible wallets with newest effective Recorded operations against the privacy
  floor independently of governance quorum. Abstain counts and replacements do not add participants.
- Below the floor, the terminal state is Result withheld.
- No verdict or option total is decrypted.
- No Safe/Governor action becomes executable.
- The page explains why the result is deliberately unavailable and why it cannot be “manually
  released” by an administrator.

### Scenarios

```gherkin
Given the privacy floor is three and only two eligible voters have effective Recorded operations
When the proposal closes
Then the proposal becomes Result withheld
And no tally output receives public-decryption permission
And the committed action remains unauthorized
```

## Story 7: Finalize A Verdict

As a keeper or ordinary community member,
I want to advance an ended eligible proposal through tally and proof verification,
so that finalization does not depend on one privileged operator.

### Acceptance Criteria

- Close, tally request, computing, proof-ready, and finalized are separate visible states.
- Anyone may trigger an allowed transition, but no caller supplies the result value.
- Finalization accepts only configured-Gateway evidence for the proposal's stored expected boolean
  verdict handle under the expected chain domain; the module rejects malformed results and replay.
- The final public result is Passed or Rejected; exact option totals remain private.
- A duplicate finalization cannot alter the stored verdict.

### Scenarios

```gherkin
Given the privacy floor has been met and the vote has closed
When any account requests the confidential tally
Then the proposal shows Tally requested and then Computing
When valid evidence for the expected verdict handle is submitted
Then the proposal becomes Passed or Rejected exactly once
```

## Story 8: Execute The Approved Action

As a DAO member,
I want a Passed verdict to authorize only the proposal I reviewed,
so that confidential counting cannot become generic control of the treasury.

### Acceptance Criteria

- The execution panel decodes the same action committed before open.
- Safe execution rejects a different target, value, calldata, chain, nonce, or expired proposal.
- Governor execution preserves its queue and timelock.
- Rejected, withheld, failed, canceled, and pending proposals cannot execute.
- Execution failure is retryable only for the same committed action and does not change the verdict.

### Scenarios

```gherkin
Given the proposal passed and committed a transfer of 1000 USDC to 0x71C...9A2
When an executor submits the exact action after any required delay
Then the host executes it and records Executed
But a transfer to any other recipient or amount is rejected
```

## Story 9: Verify The Public Record

As a voter or auditor,
I want one place to inspect the public evidence and its limits,
so that I can distinguish a real confidential process from a privacy-themed interface.

### Acceptance Criteria

- The verification center shows proposal/action commitment, snapshot, rules, privacy floor, operation
  history, expected verdict handle, evidence status, signer provenance, result, and execution.
- A voter can locate the newest operation associated with their wallet.
- The view explains that the operation tracker proves recorded status, not the plaintext choice.
- The view explains that the Gateway evidence validates handle/plaintext output, not the entire private
  computation graph.
- The view explains that proposal association, expected type, and finalize-once behavior are enforced by
  module state rather than independently proven by the Gateway signature.
- Individual ballot decryption controls do not exist.

### Scenarios

```gherkin
Given a proposal has finalized and executed
When an observer opens its verification center
Then they can match the committed action to the execution transaction
And validate the verdict evidence provenance
And still cannot retrieve any wallet's choice or exact option totals
```

## Story 10: Recover From Failure Without Changing The Rules

As a voter or finalizer,
I want clear recovery when encryption, recording, tallying, proof delivery, or execution fails,
so that a technical failure never silently becomes a vote or result.

### Acceptance Criteria

- Encryption failure returns to choice review without submitting a transaction.
- A rejected or timed-out ballot operation is visibly not counted and can be retried with safe
  sequencing before the deadline.
- A stalled tally can retry the same deterministic expected result request.
- A bad proof is rejected and the proposal remains awaiting valid evidence.
- Permanent Nox failure ends as Tally failed or timed out, not as zero votes or an administrator result.
- Execution failure exposes a retry for the same action only.

### Scenarios

```gherkin
Given the proposal is Computing and the tally deadline has expired without valid evidence
When the failure policy is applied
Then the proposal becomes Tally failed or timed out
And the action remains unauthorized
And no plaintext fallback or manual verdict control is offered
```

## Open Questions

- Whether failed ballot operations consume a replacement sequence or only accepted operations do.
- Whether the visible tracker should be the raw Nox handle, a proposal-scoped hash, or a separate
  operation identifier.
- The primary demo's exact organization-level hard minimum privacy floor and replacement ceiling.
