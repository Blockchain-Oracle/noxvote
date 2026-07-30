# Plain-English Product Definition

## The Product In One Sentence

A DAO turns on confidential voting for a sensitive proposal; members' wallets and participation stay
public, their For/Against/Abstain choices never appear on-chain or become public, only the final
Passed/Rejected verdict is revealed after enough eligible wallets record operations, and a Passed
verdict can execute the exact Safe or Governor action everyone reviewed before voting.

## The Problem It Solves

Normal on-chain governance permanently publishes who voted for what. That is bad for sensitive votes:
treasury grants, contributor removals, partnership decisions, incident response, delegate confidence,
or any proposal where public choices create retaliation, social pressure, or copy-voting.

Many “shielded” products hide choices only while voting is open and reveal every ballot afterward.
This product does not open individual ballots at the end. It uses Nox to compute over encrypted ballot
handles and releases only the decision needed by governance.

## The Complete Product

- A Safe module and a compatible OpenZeppelin Governor counting adapter.
- A proposal-level **Confidential outcome** setting, with an organization policy that may make it
  mandatory.
- Immutable action, voting dates, voting-power snapshot, governance quorum, passage rule, privacy
  floor, and replacement rule.
- Fixed snapshot weight and For/Against/Abstain choices.
- Handle Gateway encryption before the wallet broadcasts an opaque handle/proof transaction. The
  Gateway receives the encoded plaintext choice inside the declared Nox trust boundary.
- A public opaque operation tracker and clear Submitted/Computing/Recorded status.
- Vote replacement before close; the newest accepted encrypted choice is effective.
- Public participation progress, but no running option scores or projected winner.
- A separate privacy floor. Below it, the result is deliberately withheld and nothing executes.
- Asynchronous close, tally request, computation, proof-ready, finalization, and execution states.
- Verdict-only publication: Passed or Rejected, never wallet choices or exact option totals.
- Permissionless tally requesting/finalization under fixed rules.
- A verification center that connects proposal commitment, encrypted operation status, Nox result
  evidence, final verdict, and the exact host execution.
- Safe execution of only the precommitted transaction; Governor queue/timelock preservation.
- A compatible Governor shows a truthful `Tally pending` product state after its public deadline while
  standard Governor clients see `Pending`; it cannot become `Succeeded` or queue until the accepted
  Nox verdict proof arrives.
- Honest failure paths with no plaintext fallback or administrator-selected result.
- A permanent guarantee panel explaining what is private, what is public, whom the system trusts, what
  the proof checks, and what it does not promise.

## The Main User Flow

1. The DAO enables the adapter on its Safe or deploys a compatible confidential Governor.
2. An author prepares a normal proposal and enables **Confidential outcome**.
3. The author commits the exact action, token/allowlist snapshot, dates, governance rule, privacy floor,
   and replacement policy.
4. An eligible member connects a wallet and sees the fixed voting weight.
5. The member selects For, Against, or Abstain. The SDK sends the encoded choice to iExec's attested
   Handle Gateway, which encrypts it and returns the handle/proof before wallet confirmation.
6. The public transaction contains an opaque Nox handle/proof, not the support value.
7. The operation moves from Submitted to Computing to Recorded. Only an eligible wallet's newest
   effective Recorded operation counts toward public privacy-floor participation.
8. Before close, the member may change the vote. The newest accepted operation replaces the old one;
   both operations remain choice-private.
9. Everyone can see Recorded participation and progress toward the privacy floor, but no running result.
   Abstain counts as participation; replacements do not increase the unique-wallet count.
10. At close, too few eligible wallets with Recorded operations produce **Result withheld** and no
    verdict decryption.
11. Otherwise, anyone can request the encrypted tally. The page visibly waits for Nox computation and
    result evidence.
12. The contract accepts configured-Gateway evidence only for the exact verdict handle stored for that
    proposal, validates the boolean encoding and chain domain, prevents replay, and publishes Passed or
    Rejected. Exact totals remain private.
13. If Passed, the Safe adapter executes exactly the committed call, or the compatible Governor moves
    through its normal queue and timelock before executing the committed action.
14. Anyone can inspect the verification center without being able to retrieve an individual choice.

## The Demo Story

A Safe treasury proposes a 1,000 USDC security-review grant. Four visible member wallets cast encrypted
votes; one member changes the vote. The audience inspects every transaction and sees no support value.
The live proposal shows participation but no leader. After close, Nox releases only `Passed`; the
contract verifies the expected result evidence, and the Safe transfers exactly 1,000 USDC to the
committed recipient. The verification page proves the public chain of commitments and execution while
showing no wallet's choice or exact option totals.

## What The Product Is Not

It is not anonymous today: wallets, weights, participation, and replacement timing are public.

It is not client-side encryption. The released SDK sends the encoded plaintext choice to iExec's
attested Handle Gateway for encryption. The privacy claim is that the support value never appears in
the wallet transaction or on-chain and is not later publicly disclosed; the Gateway is a trusted party
that sees the input during preparation.

It is not honestly receipt-free or bribe-proof on released Nox. Public latest-vote-wins gives a voter a
chance to recover from pressure, but a coercer can still supervise the final action. MACI prevents
convincing receipts through a hidden authenticated command/key state. DAVINCI uses third-party
ciphertext re-randomization and silent refreshes. Released Nox supplies neither mechanism by itself.

It is not threshold-keyed today. Shutter's Keypers and ElectionGuard/Belenios trustees distribute key
authority; current Nox uses one full-key KMS node. Nox's product advantage is flexible confidential
computation and selective output, not stronger current key decentralization.

It is not a tally SNARK. The accepted Nox evidence says that the configured Gateway signed a plaintext
for a handle. Proposal binding, expected type, and execute-once behavior come from module state; the
evidence does not independently prove the complete private operation history or tally arithmetic.

## Why It Still Has A Strong Edge

The product solves a concrete problem that temporary shielded voting does not: individual choices do
not become public after the proposal ends. The output is also narrower than a normal private tally:
even exact option totals remain encrypted, and only the governance decision needed for execution is
released. The demo closes the loop with a real committed action rather than stopping at a private poll.

## Adopted Product Definition And Next Gate

The active product promise is:

> Individual choices and exact totals never become public; participation is public; replacement voting
> is a recovery window; low Recorded participation withholds the result; sufficient participation opens
> only the verdict; and a Passed verdict authorizes exact Safe/Governor execution.

The privacy floor counts unique eligible wallets with a newest effective Recorded operation, including
Abstain. Governance quorum is separate and follows the immutable compatible-host rule; the primary demo
includes Abstain in quorum and uses For weight greater than Against weight for passage.

If the product must instead promise true receipt-freeness or bribery resistance, the architecture must
change to include MACI-style hidden command processing or DAVINCI-style threshold re-randomization and
proofs. That is a different cryptographic system, not an extra checkbox in the Nox-only module.

The bounded full-shape local spike now passes, including Safe execution, JetStream redelivery, the
public-proof negative matrix, and compatible Governor timelock execution. The user accepted this
complete product definition, user flow, trust boundary, and normal DAO execution model on 2026-07-30.
The user accepted the production technical architecture and assigned visual design to an external
designer. The active next gate is review of the contract-only implementation plan while UI planning
remains paused. This is not a cut-down MVP, automatic permission to begin implementation, or testnet
authorization.
