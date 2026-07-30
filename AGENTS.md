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
contract quality profile and contract-only implementation plan are active for review. The spike
artifacts are not production components, and general implementation is not yet approved.

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
not a product or build gate. The contract quality profile and contract-only implementation plan are
ready for review. UI planning is paused under external design ownership. Contract or frontend
implementation, deployments, billable infrastructure, public publishing, and submission claims are
not yet authorized.
