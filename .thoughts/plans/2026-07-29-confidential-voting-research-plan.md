# Research Plan: Confidential Voting on Nox

This is a completed research plan, not an implementation plan.

**Completed first pass:** 2026-07-29. The checkpoint output is
[`../research/2026-07-29-confidential-voting-architecture-synthesis.md`](../research/2026-07-29-confidential-voting-architecture-synthesis.md).
The user subsequently authorized a broader open-source private-voting landscape and full product
definition; that continuation is complete and the bounded local full-shape feasibility spike is now
authorized. This file remains the completed research plan, not the spike implementation plan.

## Objective

Return with architecture lessons, trust boundaries, contract-level mechanisms, and integration facts
that are strong enough to support a user-flow and architecture decision without relying on vibes.

## Tracks

1. **MACI:** coordinator powers, message processing, key change/re-vote invalidation, first-message
   bribery mitigation, proof boundaries, and contract-call phases.
2. **Shutter:** threshold/DKG trust, deployed classic flow, permanent shielded-voting construction,
   verifiability, module integration, operational behavior, and UX.
3. **Nox and adjacent TEE systems:** released primitives/ABIs, ACL permanence, async compute and
   proof lifecycle, KMS trust, Oasis Sapphire governance patterns, eligibility and weighted-vote fit,
   and Foundry compatibility.
4. **Synthesis:** guarantee-by-guarantee matrix; explicit adversaries; low-turnout disclosure rules;
   candidate Nox-native state machine; integration reality matrix; unresolved blockers.

## Evidence Standard

- Primary sources first; exact links and repository commits recorded.
- Deployed/current claims rechecked as of 2026-07-29.
- Contract mechanisms traced to code where possible.
- Every Nox claim labeled released/current, roadmap, inferred, or unknown.
- No mock or unpublished API used to declare the MVP feasible.

## Checkpoint

Reached for both research passes. The broader landscape, governance-host comparison, product spec,
stories, and surface map are linked from `.thoughts/decisions/CURRENT.md`. The follow-on delivery plan
is historical only. The user reviewed the reconciled definition and authorized a new evidence-backed
plan plus bounded local spike work; do not reuse the historical binary/unweighted scope.
