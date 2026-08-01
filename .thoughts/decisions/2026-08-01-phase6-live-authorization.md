# Phase 6 Live Ethereum Sepolia Authorization

## Decision

On 2026-08-01 the user explicitly authorized the Phase 6 target accounts, funding checks, deployment,
and required Ethereum Sepolia transactions. This supersedes the earlier testnet stop gate for the
accepted contract-only Phase 6 plan.

The authorization covers:

- same-day read-only verification of the official Nox, Handle Gateway, subgraph, and Safe dependencies;
- a dedicated funded Sepolia deployer and four testnet voter accounts;
- deployment of the exact reviewed Foundry factory/module/Governor/Timelock creation bytecode;
- one factory-deployed Safe/module/core proof and one Governor/core/Timelock proof through real Nox;
- transaction, address, code-hash, verdict, and exact-execution evidence maintenance; and
- commits containing the runner, reconciled context, and public deployment evidence.

It does not authorize frontend or visual implementation, billable production infrastructure, public
publishing, hackathon submission, or claims beyond the observed live evidence.

## Current Execution Gate

The read-only live preflight passes. At block `11395848`, the released Sepolia Nox proxy and current
implementation code hashes matched the official `0.2.4` deployment artifact after normalizing only
the compiler-declared immutable slots. The configured Handle Gateway and subgraph returned HTTP 200,
the subgraph was current, the on-chain Gateway signer was
`0xE13191F53671957C8a48A7A3Ff15E16450a1552F`, and the proof lifetime was one hour. The official Safe 1.5.0 singleton, proxy factory,
`MultiSendCallOnly`, and compatibility fallback handler matched the current Safe deployment registry.
The exact reviewed Foundry factory, Safe-module, Governor, and Timelock creation-code hashes also pass.

Before execution, the dedicated deployer was made available through the explicitly selected local
credential boundary. After the original `0.25` Sepolia ETH blanket floor blocked the funded account,
the user explicitly rejected that conservative testnet reserve. The runner uses
measured actor-scoped budgets: 25 million gas for deployer transactions, 3 million gas per voter, and
a `0.045` Sepolia ETH minimum. The local factory measurements include ~8.7 million gas for the
Governor stack and ~4.1 million gas for the Safe module/core pair. The dynamic gate can still rise
with current gas. Unrelated local keystores must not be reused implicitly.

## Completion

Phase 6 completed on Ethereum Sepolia at block `11396305`. The factory-deployed official Safe/module/
core path and the compatible Governor/core/real-Timelock path each consumed a real released-Nox
Passed verdict and executed the committed target exactly once. All `37` recorded transaction receipts
succeeded. The canonical public evidence is
[`../verification/2026-08-01-phase6-sepolia-live-verification.md`](../verification/2026-08-01-phase6-sepolia-live-verification.md)
and [`../../deployments/sepolia/phase6-live.json`](../../deployments/sepolia/phase6-live.json).

## Evidence Routing

- Runner: `scripts/phase6-sepolia.ts`
- Read-only command: `pnpm phase6:preflight`
- Read-only account/funding command: `pnpm phase6:account`
- Authorized transaction command: `pnpm phase6:execute`
- Public resumable checkpoint: `deployments/sepolia/phase6-live.json`
- Active plan: `../plans/2026-07-30-confidential-governance-contract-implementation-plan.md`
