# Reality Research: Nox Private-Voting Collision and WTF Eligibility

> **Current-authority note:** Preserved as factual research only. The user explicitly decided that
> other builders and prior voting-positioned projects do not gate or steer this product.

## Scope

Verify the brief's load-bearing claims that private voting has not appeared on Nox, that no prior
VIBE project creates a collision, and that the current WTF field can be checked before architecture
work proceeds.

## Sources Checked

- Current official [WTF detail page](https://dorahacks.io/hackathon/wtf-hackathon/detail).
- Current official [WTF BUIDL page](https://dorahacks.io/hackathon/wtf-hackathon/buidl).
- Prior official [VIBE BUIDL page](https://dorahacks.io/hackathon/vibe-coding-iexec/buidl), expanded
  through all 60 visible entries.
- [`NOX Confidential Investment Club`](https://dorahacks.io/buidl/43637) and its repository at
  commit `31240f5e9fdd97c62d63519080c5a9d83506708c`.
- [`ChainEstate`](https://dorahacks.io/buidl/43622) and its repository at commit
  `82ec9753d150f172af0826f28cebf99ce63b530c`.
- GitHub repository/code/issue searches for `iExec Nox voting`, `Nox confidential voting`,
  `ConfidentialBallot`, `Nox.sol vote`, and `@iexec-nox voting`.

## Verified Facts

### Current WTF rule

The official page says: “Any builder reusing a project from the previous Vibe Coding Hackathon will
be disqualified,” and invites builders to validate ideas with the organizers. Grammatically, the rule
targets a builder resubmitting a previous project; it does not explicitly declare that every idea or
feature ever mentioned by another VIBE entrant is banned.

The current challenge prefers a clean integration into a real open-source protocol, a real product
rather than a proof of concept, end-to-end behavior without mock data, Ethereum Sepolia deployment,
a functional frontend, and a four-minute demo.

### Prior VIBE collision exists

The statement “voting was not a VIBE project” is false. At least two of the 60 prior entries publicly
claimed governance voting:

1. `NOX Confidential Investment Club` says members “propose, and vote with zero plaintext leakage,”
   advertises encrypted FOR/AGAINST voting, and links deployed Arbitrum Sepolia contracts.
2. `ChainEstate` advertises “governance voting through iExec Nox” and names a
   `ConfidentialGovernance` contract.

### Neither prior entry implemented confidential choices

The Investment Club source is explicit that the end-to-end flow uses “demo clear vote mode.” Its
frontend sends the public 32-byte values `0` or `1` plus a one-byte pseudo-proof. Its contract
`_decodeSupport` reads the last proof byte or treats a nonzero handle as `true`, increments public
`forVotes`/`againstVotes`, and has no Nox import, confidential operation, re-vote, aggregate proof, or
quorum-gated disclosure on the voting path.

ChainEstate's `ConfidentialGovernance` also accepts a plaintext `VoteOption`, stores the voter's
choice in public `voteRecord`, emits the choice in `VoteCast`, and keeps public per-option totals.
It uses Nox elsewhere for token balances and points, but not to hide votes. It rejects re-voting.

Therefore the prior projects are evidence of **positioning/category collision**, not evidence that a
permanently private or bribery-resistant voting protocol already exists.

### Current-field visibility is unavailable

The current WTF page reports 13 submissions, but the organizer has marked the BUIDL list private.
Their names and descriptions cannot currently be inspected from the canonical page. Public GitHub
searches returned no Nox voting match, but that is not proof that none of the 13 private submissions
targets voting.

## Historical Inferences — Superseded As Product Inputs

The following were reasonable observations during the first pass, but the user later decided that
other builders and organizer validation do not gate or steer the product.

- A submission from a different builder with wholly new code is not automatically disqualified by
  the literal reuse sentence, but organizer confirmation is prudent because two prior projects already
  marketed Nox governance voting.
- The honest novelty claim cannot be “the first private voting project on Nox.” A defensible narrower
  claim would need to be proved, such as the first Nox module built specifically around permanent
  individual-choice privacy, aggregate-only disclosure, and a MACI-derived coercion threat model.
- The prior projects' weak implementations may help the technical contrast, but judges may still see
  “private voting on Nox” as an already-used category unless the module/integration wedge is concrete.

## Historical Unknowns — Not Gates

1. Will the organizer treat a new anti-bribery voting module as sufficiently distinct from BUIDLs
   `43637` and `43622`?
2. Does any of the 13 private current submissions target confidential governance?
3. Which existing open-source governance protocol—OpenZeppelin Governor, Safe/Snapshot, or another
   deployed system—would make this a clean integration rather than a standalone voting proof of concept?

## Not Included

This report does not select the integration target or design the replacement architecture. Its source
facts are retained for provenance only. The product does not require an answer to the historical
organizer/field questions before research, design, or implementation authorization.
