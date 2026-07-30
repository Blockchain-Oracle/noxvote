# Governance-host Comparison For Confidential Voting

**Date:** 2026-07-29  
**Decision type:** Product-integration recommendation; no implementation is authorized.

## Question

Where should the confidential ballot engine attach so it is genuinely a module, inherits real
governance behavior, and can demonstrate an exact on-chain action after a private result?

## OpenZeppelin Governor

### Verified facts

- Governor is explicitly modular. Voting-power, quorum, counting, timelock, storage, and other
  behaviors are supplied through extensions or custom implementations.
- A counting implementation must define how quorum, success, and vote counting work. Voting power can
  come from an `IVotes` snapshot and execution can flow through a Governor or a timelock.
- Proposal identity commits to the target list, values, calldata, and description hash. A successful
  proposal can be queued and executed through the established state machine.
- Standard Governor vote events and counting modules are designed around public support values and
  running totals. A confidential implementation cannot call the normal plaintext counting path and
  still claim choice privacy.

### Product consequence

A confidential Governor integration is clean for a **new or deliberately upgradeable Governor**:
Nox-backed counting replaces the public counting extension while the host retains proposal identity,
voting-power snapshots, queueing, timelock, and execution. It is not a universal toggle that can be
attached to every already-deployed immutable Governor.

This is the best reference integration for protocol composability and token-weighted governance, but
it asks the demo audience to understand a custom Governor deployment.

## Safe

### Verified facts

- An enabled Safe module may validate its own rules and ask the Safe to execute a transaction. Owners
  enable or remove the module through the Safe's normal confirmation threshold.
- Modules are separate from the Safe core and can be attached to an existing Safe.
- Safe warns that modules are security-critical because a malicious or over-broad module can take over
  the account's assets.
- Safe supplies custody and execution, not proposal creation, eligibility snapshots, vote counting, or
  quorum. The confidential module must provide or bind those pieces.

### Product consequence

A Safe adapter gives the cleanest hackathon proof: owners enable one narrowly constrained module, a
proposal commits to one exact Safe action, and a valid confidential verdict authorizes only that
action. The module must never receive a generic “execute anything after any pass” permission surface;
proposal target, value, calldata, chain, nonce, and expiry must be committed before voting opens.

Safe is the strongest **retrofit and demo host**, while Governor is the strongest **native governance
framework host**.

## Snapshot/Shutter

Snapshot demonstrates the desired proposal-level toggle and voter UX, but it is an off-chain voting
host. Its classic Shutter path reveals choices after close. Reusing Snapshot as the authoritative
tally would also weaken the proof that Nox performed the confidential count and drove the on-chain
state transition.

Snapshot remains a UX reference, not the primary judged execution host.

## Recommendation

Keep one host-neutral confidential ballot core with two explicit adapter contracts in the product
model:

1. **Safe Execution Adapter — primary judged path.** Enable the adapter on an existing test Safe,
   create a proposal that commits to one Safe transaction, finalize a Nox-backed verdict, and execute
   only the committed transaction.
2. **Governor Counting Adapter — product integration.** Supply a confidential counting extension for
   a new/custom OpenZeppelin Governor while retaining its `IVotes` snapshot and timelock lifecycle.

This is not a “ship one, maybe do the other later” decision. Both are part of the product definition.
The Safe path is the shortest proof of an installable module and real execution; the Governor path is
the formal adapter contract for token-governed DAOs. Each still needs its own critical-path feasibility
test before implementation scope is approved.

## Shared Boundary Required By Both Hosts

- The proposal action hash is immutable once voting opens.
- Eligibility and weight are fixed at a pre-vote snapshot.
- Governance quorum and the privacy-participation floor are different values.
- A finalizer may only submit a decryption proof for the proposal's expected verdict handle.
- A passed verdict authorizes exactly one host action; a rejected or withheld result authorizes none.
- Execution failure does not reopen voting or change the verdict; the same committed action can be
  retried under a bounded, idempotent rule.
- Cancelation after opening cannot expose ballots or substitute an administrator's result.

## Sources

- [OpenZeppelin Contracts 5.x governance API](https://docs.openzeppelin.com/contracts/5.x/api/governance)
- [OpenZeppelin on-chain governance guide](https://docs.openzeppelin.com/contracts/5.x/governance)
- [Safe module documentation](https://docs.safe.global/advanced/smart-account-modules)
- [Safe module security warning](https://docs.safe.global/advanced/smart-account-modules/smart-account-modules-tutorial)
- [Shutter/Snapshot architecture report](./2026-07-29-shutter-architecture-lessons.md)

## Open Technical Questions

- The smallest Governor hook surface that avoids all plaintext-support events while preserving
  proposal state and timelock compatibility.
- The least-authority Safe module design and exact replay/idempotency boundary.
- Whether the hackathon test network has the required Safe deployment and supported Nox call path, or
  whether a test Safe must be deployed as part of the judged setup.
