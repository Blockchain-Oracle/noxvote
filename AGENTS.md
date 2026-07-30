# AGENTS.md

## Project Snapshot

This is a clean research workspace for a selected hackathon pivot: a confidential voting module
for existing DAO governance on iExec Nox. The released Handle Gateway prepares encrypted ballot
handles, Nox tallies them through its TEE stack, and the module discloses only the final verdict while
never intentionally publishing individual choices or exact totals.

The primary-source corpus supports permanent public-chain individual-choice confidentiality and
outcome-only disclosure, but not browser-side encryption or MACI-equivalent receipt-freeness on
released Nox. On 2026-07-30 the user accepted the complete product definition, user flow, trust
boundaries, normal-DAO execution semantics, and production technical architecture. The bounded local technical gate passes: real
Nox-to-Safe, Runner restart, explicit JetStream negative-acknowledgement redelivery, the complete named
proof-negative matrix, and real Nox-to-compatible-Governor-to-Timelock execution all pass. A production
contract quality profile and contract-only implementation plan are accepted. Local phased contract
implementation is authorized. Production registration, public eligibility, direct-wallet confidential
casting/replacement, privacy-floor withholding, encrypted verdict derivation, verdict-only ACL, and
proof finalization pass local Foundry gates. The production core also passes two consecutive
Docker-backed runs through the released Gateway/KMS/JetStream/Runner stack for the judged
four-wallet/floor-four graph. Phase 2 is complete. The Phase 3 production Safe module now passes its
official-Safe registration, exact-commitment, direct single-call execution, and official
`MultiSendCallOnly` atomic-batch slices. Passed-only, exact-bundle, call-only inner operations,
runtime batch-code-hash revalidation, atomic failure/retry, reentrancy, execute-once, and
disabled-module gates pass. The versioned factory now publishes the two reviewed strategies and
deploys immutable Safe/module/core pairs with complete creation/runtime code-hash evidence. Phase 3 is
complete. The production compatible Governor now passes immutable construction, exact confidential
proposal/core registration, OpenZeppelin proposer-guard parity, normal multi-action binding, and
complete public/internal plaintext-cast shutdown. Its detailed lifecycle and standard asynchronous
projection now prevent unresolved or non-Passed queueing, and proposer-only Scheduled cancellation
atomically cancels both Governor and core. The real TimelockController path now passes Governor-only
proposer/canceller authority, bootstrap-admin renunciation, permissionless execution, one- and
multi-action queue/delay/execution, governance-only delay changes, direct-interference rejection, and
block-number/timestamp clock coverage. The versioned factory now atomically deploys the exact reviewed
TimelockController, Governor, and Governor-owned core, verifies the complete role handoff, renounces its
temporary admin, and emits complete creation/runtime code-hash evidence. Phase 4 is complete. The first
Phase 5 stateful suite now passes one-effective-ballot accounting, monotonic unique participation, fixed
snapshot weight, two-replacement maximum, below-floor withholding, finalize-once, and Safe execute-once
at 10,000 runs per property. The complete local proof-negative matrix now passes signer/domain/handle/
encoding, identical-input cross-proposal, same-handle cross-host, and cross-chain boundaries. Its RED
case exposed same-core proposal verdict-handle aliasing when every encrypted input was deliberately
reused; the production tally now injects a ballot-ID-derived encrypted zero, preserving the plaintext
result while separating downstream handles by ballot, host, and chain. The changed graph passes three
consecutive complete released Docker-backed Nox runs—27/27 cases total—including production core,
official Safe, compatible Governor/Timelock, proof negatives, Runner restart, and JetStream redelivery,
with cleanup after every run. Deterministic Safe direct/batch and Governor queue/execute gas baselines
now enforce the quality profile's 20% regression ceiling. The full Forge suite passes 119/119, the
high-confidence invariant profile passes again at 960,000 modeled calls, and the production verification
audit passes the authorized local contract gate. Phase 5 is complete locally. Phase 6 live Ethereum
Sepolia work remains blocked pending explicit authorization. The spike artifacts are not production
components.

Visual design ownership is `EXTERNAL_COMMISSION`. The external designer owns visual language. Do not
choose UI taste, tokens, layouts, or frontend architecture until returned direction is audited,
accepted by the user, and captured in a design document.

The previous NoxLimit product is historical and preserved intact at
`/Users/abu/dev/hackathon/wtf-noxlimit-archive-2026-07-29`. Do not copy its product decisions,
architecture, or code into this repository by default. Its Nox integration evidence may be consulted
later only when a specific fact is relevant and reverified against current released documentation.

## Authority

1. Latest explicit user direction.
2. `.thoughts/decisions/CURRENT.md`.
3. Accepted brief/spec/architecture/plan named by `CURRENT.md`.
4. Current primary-source research and executable evidence.
5. Handoffs and historical material.

## Working Rules

- Reconcile context before research, planning, specification, review, or implementation.
- Separate verified facts, inferences, design proposals, and unknowns.
- Prefer primary sources: official documentation, maintained repositories, deployed contracts, and
  original technical writing by the system's authors.
- For SDK, API, package, framework, CLI, or cloud-service questions, use Context7 before relying on
  model memory. If Context7 has no useful corpus, record that limitation and inspect official sources.
- Clone third-party source and documentation only under `.thoughts/raw/`; never commit those mirrors.
- Record exact repository URLs and commit SHAs in `.thoughts/sources/source-manifest.md`.
- Do not implement contracts until the threat model, guarantee matrix, Nox primitive mapping, and
  user flow are reviewed with the user and the active contract plan is explicitly approved for execution.
- Foundry is the selected primary contract-tooling recommendation. The released Nox package compiles
  under Foundry, but the official Foundry integration guide is still a placeholder; use a bounded
  Hardhat 3 harness for the real local Nox stack unless newer official support is verified.
- Slither is explicitly not required by the user. Do not run it or treat its availability as a gate.

## Non-negotiable Design Questions

- Encryption alone is not receipt-freeness. Released Nox cannot reproduce MACI's hidden reverse-valid
  key/nonce/signature chain; describe public re-voting only as a coercion-recovery window.
- Enforce a minimum-turnout policy before aggregate disclosure; low turnout can reveal choices.
- Treat Nox as confidential TEE computation, not anonymity, FHE, or zero-knowledge.
- Released `encryptInput` sends plaintext to the attested iExec Handle Gateway for encryption. Never
  claim client-side encryption, that the choice remains on-device, or that the Gateway cannot see it.
- Wallet address and participation are public unless a separate eligibility/identity layer is added.
- Treat handle access as permanent once granted. Do not assume ACL revocation erases knowledge.
- Model Nox as asynchronous: submit/request, pending, result-ready, and finalize are distinct states.
- Count unique eligible wallets with on-chain Recorded effective operations for the privacy floor.
  Abstain counts; replacements do not add participants; submitted, reverted, rejected, and stale
  operations do not count. Once Recorded, later infrastructure delay does not erase participation.
  Keep this public participation rule separate from the committed governance quorum rule.
- State honestly that Shutter's current threshold-Keyper model is stronger against key compromise
  than a single-node Nox KMS MVP.
- A judged proof path must use real released Nox behavior and real on-chain state transitions; no
  mock may support a product claim.

## Current Stop Gate

Broader research, product definition, stories, feature inventory, functional surface map, governance
host comparison, architecture, and bounded local feasibility spike are complete. Other builders are
not a product or build gate. Local phased contract implementation is authorized under the accepted
plan. UI planning is paused under external design ownership. Frontend implementation, deployments,
billable infrastructure, public publishing, and submission claims are not authorized.
