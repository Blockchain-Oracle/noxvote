# Confidential Voting on Nox

This repository is the fresh research and decision corpus for an iExec WTF Hackathon pivot: a
confidential governance module that never publishes individual choices or exact totals and publicly
decrypts only the final pass/reject outcome.

Current status: the user accepted the complete product definition, user flow, trust boundaries,
normal-DAO execution semantics, and production technical architecture on 2026-07-30. The bounded local technical gate passes across real
Nox-to-Safe execution, Runner recovery, explicit JetStream redelivery, the full named proof-negative
matrix, and real Nox-to-compatible-Governor-to-Timelock execution. The research supports permanent
public-chain choice confidentiality and verdict-only disclosure, but not client-side encryption or a
MACI-equivalent receipt-free claim on released Nox. A contract quality profile and contract-only
implementation plan are accepted and local phased contract implementation is underway. Visual design
is externally owned and UI planning is paused. The first production core-boundary slice passes local
build and unit/fuzz gates, and production IVotes/Merkle eligibility strategies now pass the expanded
suite. The direct-wallet confidential-cast slice now fixes first-cast weight, enforces one initial
ballot plus two sequenced replacements, rejects invalid public conditions before Nox, and persists only
core ACL access. Permissionless close now withholds below the privacy floor without touching Nox; above
the floor it constructs a host-quorum-aware encrypted verdict, exposes only that boolean handle for
public decryption, and finalizes configured-Gateway evidence exactly once. A forced full Forge run
passes 49/49. The production core also passes two consecutive Docker-backed runs through the released
Handle Gateway, KMS, ingestor, JetStream, and Runner using the judged four-wallet/floor-four graph,
six encrypted operations, two replacements, one public verdict, and real proof finalization. Phase 2
is complete. The first production Safe-adapter slice now binds one immutable Safe/core/batch setup and
permits exact proposal registration only through an enabled, normal Safe threshold transaction. Seven
focused official-Safe registration tests pass. Direct and official `MultiSendCallOnly` execution are
now permissionless but Passed-only, exact-commitment, reentrancy-safe, retryable after Safe failure,
and execute-once. The batch path packs only inner Calls, revalidates the immutable batch runtime code
hash, and rolls every inner effect back when one action fails. Eleven focused execution tests, one
byte-level packing test, and the full 68/68 Forge suite pass against the official Safe 1.5.0 proxy and
batch path. The versioned factory now publishes both reviewed eligibility strategies, accepts only the
reviewed Safe-module creation bytecode, revalidates dependency runtime hashes, and emits complete
Safe/module/core/strategy/batch deployment evidence. Seven focused factory tests and the full 75/75
Forge suite pass. Phase 3 is complete. The production compatible Governor now constructs an immutable
OpenZeppelin 5.6.1 Governor/settings/votes/quorum/timelock composition with its own bound core.
`proposeConfidential` preserves OpenZeppelin proposer guards and atomically binds normal multi-action
proposal hashes to token-snapshot core ballots, while standard proposal creation and every public or
internal plaintext vote seam reject. Its detailed lifecycle now distinguishes Closed/TallyPending from
terminal outcomes while the standard Governor state keeps unresolved proposals Pending and unqueueable.
Withheld/Rejected map to Defeated, Passed maps to Succeeded, and proposer-only Scheduled cancellation
atomically cancels Governor and core. Its real TimelockController now gives only the Governor
proposer/canceller authority, renounces the setup admin, permits public execution, enforces the delay on
Passed single and multi-action batches, rejects direct interference, and permits delay changes only
through governance. Block-number and timestamp ERC-6372 modes both pass the complete lifecycle. The
versioned factory pins the exact reviewed Governor and TimelockController creation code, atomically
deploys the complete Governor/timelock/core stack, verifies Governor-only proposer/canceller authority
and permissionless execution, renounces its temporary admin, and emits complete configuration and
code-hash evidence. The 23 standalone Governor tests, 8 focused Governor-factory tests, all 15 factory
tests, and 31 production Governor-plus-factory tests pass. Phase 4 is complete. The first Phase 5
stateful suite now checks one-effective-ballot accounting, monotonic unique participation, fixed
snapshot weight, the two-replacement ceiling, below-floor withholding, finalize-once, immutable Safe
action binding, retry, and execute-once. All three invariant properties pass 10,000 runs and 320,000
modeled calls each. The complete production proof-negative matrix now passes five focused tests across
signer/domain/handle/encoding mutation, identical-input cross-proposal isolation, same-handle
cross-host isolation, foreign-chain verdict evidence, and foreign-host/foreign-chain input proofs. Its
adversarial RED case exposed identical verdict handles when the same valid encrypted inputs were reused
across two same-core proposals; the tally graph now injects a ballot-ID-derived encrypted zero so the
plaintext result is unchanged while every downstream handle is ballot/host/chain separated. The full
115/115 Forge suite and the 10,000-run invariant profile pass. The released Docker-backed Nox rerun was
attempted on 2026-07-31 but could not start because the Docker daemon was unavailable, so that rerun is
the next gate before this production graph change is called integration-complete. Slither is not
required. Testnet deployment remains unauthorized.

Start here:

1. `.thoughts/decisions/CURRENT.md`
2. `.thoughts/decisions/2026-07-30-product-definition-acceptance.md`
3. `.thoughts/decisions/2026-07-30-contract-planning-authorization.md`
4. `.thoughts/decisions/2026-07-30-contract-implementation-authorization.md`
5. `.thoughts/design/2026-07-30-confidential-governance-technical-architecture.md`
6. `.thoughts/quality/2026-07-30-contract-quality-profile.md`
7. `.thoughts/plans/2026-07-30-confidential-governance-contract-implementation-plan.md`
8. `.thoughts/briefs/2026-07-29-plain-english-product-definition.md`
9. `.thoughts/specs/2026-07-29-confidential-governance-module.md`
10. `.thoughts/stories/2026-07-29-confidential-governance-module.md`
11. `.thoughts/design/2026-07-29-product-surface-map.md`
12. `.thoughts/verification/2026-07-30-full-shape-spike-report.md`
13. `.thoughts/plans/2026-07-30-full-shape-feasibility-spike.md`
14. `.thoughts/decisions/2026-07-30-fable-review-reconciliation.md`
15. `.thoughts/research/2026-07-29-open-source-private-voting-landscape.md`
16. `.thoughts/briefs/2026-07-29-confidential-voting-research-brief.md` (historical research seed)
17. `.thoughts/plans/2026-07-29-confidential-voting-research-plan.md`
18. `.thoughts/research/2026-07-29-confidential-voting-architecture-synthesis.md` (historical first pass)
19. `.thoughts/reviews/2026-07-30-fable-5-product-review.md`
20. `.thoughts/plans/2026-07-29-confidential-voting-decision-plan.md` (historical first-pass scope)

The previous NoxLimit repository was preserved intact at
`/Users/abu/dev/hackathon/wtf-noxlimit-archive-2026-07-29`.
