# Decision: Contract Plan Accepted And Local Implementation Authorized

- **Date:** 2026-07-30
- **Status:** Accepted
- **Authority:** Latest explicit user direction
- **Authorized work:** Local contract implementation and proportionate contract verification under the
  accepted phased plan
- **Not authorized:** Frontend implementation, testnet or mainnet deployment, funded or billable
  infrastructure, public publishing, or submission claims

## Decision

The user accepted the contract direction and said to continue. This authorizes implementation of the
accepted contract-only plan, beginning with Phase 1 production boundaries and pure state. The work may
add production Solidity source, Foundry tests, contract build configuration, and local verification
artifacts required by that plan.

This direction supersedes the earlier planning-only stop gate. It does not authorize UI work or any
external-state action. The external designer continues to own visual direction.

## First Bounded Delivery

Phase 1 will establish new production code under `src/contracts` without importing, inheriting, or
renaming the feasibility spike. Its first acceptance loop covers:

- immutable host and version boundaries;
- domain-separated configuration and ballot commitments;
- host-clock-derived Scheduled, Open, and Closed states;
- host-only pre-open cancellation; and
- public registration and terminal-state read models with unit and fuzz coverage.

Later phases remain authorized by the accepted plan, but each phase must pass its own quality and
integration gates before the next product claim is made.

## Continuing Gates

1. `src/spike` remains evidence-only and is not production architecture.
2. Mocks and pure fixtures may support unit isolation only; they support no Nox, privacy, Safe,
   Governor, or deployment claim.
3. Deployment, funding, paid services, frontend work, public publishing, and submission claims still
   require separate explicit authorization.
4. The full real-Nox suite must pass before an integration phase is called complete.

## Related Artifacts

- [Current decision](CURRENT.md)
- [Accepted contract implementation plan](../plans/2026-07-30-confidential-governance-contract-implementation-plan.md)
- [Contract quality profile](../quality/2026-07-30-contract-quality-profile.md)
- [Accepted technical architecture](../design/2026-07-30-confidential-governance-technical-architecture.md)
