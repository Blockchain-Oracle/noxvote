# Confidential Voting Decision and Delivery Plan

**Date:** 2026-07-29  
**Status:** Superseded first-pass plan. The user rejected competitor/organizer gating and did not
authorize `REAL_LATER` as a feature-deferral decision. Preserve this file as planning history only;
follow `.thoughts/decisions/CURRENT.md` and the current draft spec/surface map.

## Goal

Build a clean integration into an existing governance host that accepts real encrypted Nox ballots,
keeps individual choices private permanently, discloses only a verifiable final verdict after a privacy
floor, and executes one exact proposal action on Ethereum Sepolia.

## Historical Integration Reality Matrix

The labels below expressed technical readiness hypotheses, not shipped/unshipped feature decisions.
They are not current scope authority.

| Classification | Capability |
|---|---|
| Historical `REAL_MVP` | Released Nox `encryptInput → fromExternal`, encrypted bool/numeric operations, persistent application ACL, outcome handle, public-decryption proof, and on-chain finalization |
| Historical `REAL_MVP` | Public voter identity/participation, public re-vote timing, one-address/one-vote eligibility, and outcome-only disclosure |
| Historical `REAL_MVP` | Existing governance host adapter and one real Sepolia execution |
| Historical `REAL_MVP` | Foundry contract suite plus bounded Hardhat 3 Nox integration harness |
| Product draft now includes | Fixed token-weight snapshots, For/Against/Abstain, replacement voting, permissionless finalization, verification center, and Safe plus Governor adapters |
| Separate architecture/hardening | Anonymous eligibility, threshold Nox KMS, formal audit, and a MACI/DAVINCI-style receipt-resistant design |
| Honest claim boundary | Do not claim “receipt-free,” “bribe-proof,” or MACI-equivalent correctness on released Nox alone |
| Resolved | Safe is the primary judged retrofit/execution path; compatible Governor is the native governance integration |
| Superseded | Other hackathon builders and organizer validation do not gate positioning, product selection, or implementation |

No silent mock is permitted. If the Nox path fails, the product does not fall back to a plaintext tally,
frontend-only encryption, a fake TEE attestation, or a locally signed proof.

## Historical Phase 0 — Resolved By Later User Direction

### Inputs

- architecture synthesis;
- MACI, Shutter, Nox, Oasis, and broader private-voting reports;
- the selected narrow product promise.

### Actions

1. Confirm the honest promise: permanent choice privacy and outcome-only disclosure, with re-vote as
   coercion recovery rather than receipt-freeness.
2. Compare two existing-host adapter candidates on execution authority, proposal identity,
   eligibility/snapshot source, one-click UX, Sepolia deployability, and demo clarity.
3. Define both host adapters and select one judged path; do not build a standalone DAO app.

### Exit evidence

- no competitor or organizer validation requirement;
- recorded Safe-primary/Governor-native integration boundary;
- user approval to advance from research to the feasibility spike.

## Phase 1 — Released-Nox critical-path spike

### Bounded vertical

`encryptInput → fromExternal → persist app ACL → encrypted initial vote → encrypted replacement vote → privacy floor → encrypted verdict → allow public decryption → Gateway proof → on-chain verdict → adapter test action`

### Proof obligations

- official published packages only;
- real local Nox services through the supported Hardhat plugin;
- Foundry tests for phase, replay, ACL, expected-handle, proof, and finalization invariants;
- at least one non-mock Ethereum Sepolia end-to-end record;
- measured gas, operation count, finalization latency, and failure/retry behavior.

### Stop conditions

- no reliable persistent access to dependency handles;
- a ballot can be replayed across proposals or generations;
- a proof can finalize a different handle or proposal;
- the tally chain is impractical at the demo voter bound; or
- a real Nox proof cannot drive the adapter state change.

## Phase 2 — Canonical architecture and product laws

Only after the spike passes:

1. write the single canonical contract architecture;
2. freeze proposal identity, phases, eligibility, update ordering, disclosure, timeout, and execution
   laws;
3. write user stories and the full product-surface map;
4. specify proof artifacts and the exact honest copy;
5. review the architecture before implementation.

Required invariants include permanent ballot ACL isolation, no public ballot or exact-count decryption,
no disclosure below the privacy floor, immutable action binding, one effective credential per proposal,
idempotent expected-handle finalization, and explicit failed/timed-out states.

## Phase 3 — Contract and adapter implementation

- Foundry-first contract workspace;
- proposal registry and phase machine;
- eligibility/turnout rule;
- confidential ballot update and accumulator;
- result-proof finalizer;
- exact governance-host adapter;
- unit, fuzz, invariant, boundary, and mutation tests.

Implementation remains one-address/one-vote and binary unless Phase 1 evidence proves a larger scope is
safe and the user explicitly approves it.

## Phase 4 — Product surface

- privacy toggle inside the selected host's familiar proposal flow;
- explicit identity-visible/choice-private copy;
- encrypted ballot and change-vote flow;
- public turnout with separate governance and privacy thresholds;
- truthful asynchronous tally states;
- outcome-only result and verification details;
- exact action execution and recovery.

## Phase 5 — Submission evidence

- public Sepolia deployment and source verification;
- real encrypted first vote and replacement vote;
- irreversible ballot-privacy checks showing no viewers/public decryption;
- below-threshold tally-withheld case;
- above-threshold verdict-only case;
- proof-bound real governance action;
- four-minute narrative that names single-KMS and non-anonymity limits.

## Superseded Organizer Validation Draft — Do Not Send

This historical draft is retained only to explain the earlier plan. The latest user decision removes
this gate and does not authorize sending it.

> Hi iExec team — we are considering a clean-room WTF project that integrates Nox into an existing
> open-source governance host. We found the prior VIBE entries “NOX Confidential Investment Club” and
> “ChainEstate,” so we checked their code rather than assuming the category was unused. Their voting
> paths use clear/public choices and public counters; we would reuse none of their code. Our proposed
> distinction is permanent individual-choice confidentiality: ballots and exact option totals are never
> decrypted, re-voting is supported, a separate minimum privacy turnout gates disclosure, and only the
> final pass/reject verdict can be publicly decrypted to execute a precommitted Sepolia governance
> action. We would describe re-voting as coercion mitigation, not claim MACI-grade receipt-freeness.
> Would this clean integration be considered sufficiently distinct and eligible, and is any current
> private WTF submission already occupying this exact outcome-only governance direction?

Do not send this message without the user choosing the destination/channel.
