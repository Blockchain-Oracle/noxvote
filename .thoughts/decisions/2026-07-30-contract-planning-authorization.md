# Decision: Architecture Accepted And Contract Planning Authorized

- **Date:** 2026-07-30
- **Status:** Accepted
- **Authority:** Latest explicit user direction
- **Design ownership:** `EXTERNAL_COMMISSION`
- **Authorized work:** Context maintenance, contract quality profile, and contract-only implementation planning
- **Not authorized:** Contract implementation, frontend implementation, deployment, funding, public publishing, or submission claims

## Decision

The user accepted the production technical architecture and authorized the next context-engineering
step: plan the contract system while an external designer works independently on visual direction.

The functional product surface remains authoritative input for the designer. The contract track must
not choose visual language, frontend architecture, components, layouts, tokens, motion, or other taste.
Visual artifacts returned by the designer remain evidence until the user accepts them and a later
design document captures them.

## Contract Defaults Adopted For Planning

The user delegated contract planning without selecting the remaining architecture options individually.
The plan therefore adopts the architecture's recommended security defaults:

1. **Safe proposal authority:** A confidential Safe proposal may be registered only through a normal
   transaction executed by the bound Safe, which means the Safe's current owner threshold approves
   registration.
2. **Judged electorate:** Four fixed, unequal-weight eligible wallets; privacy floor four; one initial
   ballot plus at most two replacements per wallet. Version 1 has an immutable organization minimum
   privacy floor of at least four; proposals may choose a higher floor. This is the already-proven
   judged configuration, not a claim that larger electorates are impossible.
3. **Safe execution:** A one-action proposal uses `Enum.Operation.Call`. A multi-action proposal uses
   the official `MultiSendCallOnly` packed encoding. The module may use an outer `DelegateCall` only to
   an immutable, expected-code-hash `MultiSendCallOnly` contract; inner delegatecalls are rejected.
4. **Delay semantics:** There is no on-chain timeout that discards a Recorded ballot or substitutes a
   result. A proposal remains tally-pending until the exact expected verdict proof is validly finalized.
5. **Versioning:** Production contracts are non-upgradeable and versioned. New logic requires a new
   deployment/version; an administrator cannot change the rules of an open ballot.
6. **Future live target:** Ethereum Sepolia is the planned first live Nox gate because it is an
   officially documented Nox network. Deployment, accounts, funding, current Safe addresses, and live
   evidence still require separate authorization and re-verification.

These are configuration and security decisions. They do not revive the superseded `MVP/later`
feature-cut framing. Both Safe and compatible Governor paths remain in the contract plan.

## Baseline At This Decision

- Forge and Hardhat builds pass.
- TypeScript checking passes.
- Forge formatting and high/medium lint pass.
- All 11 Forge tests pass.
- The current Docker-backed Nox rerun could not start because Docker Desktop was not running.
- The most recent audited real-stack result remains 19/19 passing, including Safe, Governor/timelock,
  Runner restart, JetStream redelivery, and the full proof-negative matrix.

## Next Gate

Review the contract-only implementation plan. Approval of the plan may authorize implementation in a
later explicit direction. UI planning remains paused until the external visual direction is returned,
audited, accepted, and captured in a design document.

## Related Artifacts

- [Current decision](CURRENT.md)
- [Accepted technical architecture](../design/2026-07-30-confidential-governance-technical-architecture.md)
- [Contract quality profile](../quality/2026-07-30-contract-quality-profile.md)
- [Contract implementation plan](../plans/2026-07-30-confidential-governance-contract-implementation-plan.md)
- [Product surface map for the external designer](../design/2026-07-29-product-surface-map.md)
