# Verification Audit: Confidential Governance Production Contracts

## Verdict

**PASS for the authorized local contract gate (Phases 1–5).** The production core, Safe adapter,
compatible Governor/Timelock path, factories, proof boundaries, invariants, recovery behavior, gas
baselines, and released local Nox integration align with the accepted contract plan. Three consecutive
changed-graph runs pass all nine Docker-backed integration cases and clean the off-chain stack.

This is not a product-completion or deployment verdict. Ethereum Sepolia, funded accounts, external
transactions, frontend behavior, visual design, publishing, and submission remain **NOT RUN** or
unauthorized. In particular, AC9 is only locally proven; its explicit testnet clause belongs to the
blocked Phase 6 gate.

## Artifacts Checked

- `.thoughts/decisions/CURRENT.md`
- `.thoughts/specs/2026-07-29-confidential-governance-module.md`
- `.thoughts/stories/2026-07-29-confidential-governance-module.md`
- `.thoughts/design/2026-07-30-confidential-governance-technical-architecture.md`
- `.thoughts/plans/2026-07-30-confidential-governance-contract-implementation-plan.md`
- `.thoughts/quality/2026-07-30-contract-quality-profile.md`
- `src/contracts/**`
- `test/foundry/production/**`
- `test/integration/**`
- `package.json`, `foundry.toml`, and the pinned dependency lockfile

## Requirement Traceability

| Requirement                        | Contract-gate status                                    | Evidence                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 host adapters                   | PASS (local)                                            | Official Safe 1.5.0 proxy/module registration and execution; compatible OpenZeppelin Governor 5.6.1 with real TimelockController roles, delay, queue, and execution; immutable factory deployments.                                     |
| R2 immutable proposal commitment   | PASS (contract scope)                                   | Core ballot/config hash tests; Safe action-domain/order/value/data tests; Governor exact normal proposal hash; factory configuration and code-hash events. Title/discussion-link UI is outside the contract gate.                       |
| R3 eligibility and fixed weight    | PASS (local)                                            | IVotes snapshot and host/chain-bound weighted-Merkle strategies; casting tests and invariants prove first-cast weight remains fixed and one effective contribution survives replacements.                                               |
| R4 confidential ballot preparation | PASS (local released stack)                             | Real Handle Gateway inputs reach released Nox without plaintext choice calldata; proof owner/application/type binding passes; ACL tests prove core-only persistence. The Gateway remains inside the disclosed plaintext trust boundary. |
| R5 cast and replace                | PASS (contract scope)                                   | Strict sequences 1/2/3, two-replacement ceiling, stale/out-of-order immutability, operation receipts, and invariant coverage pass. Product operation-state UI is not run.                                                               |
| R6 no running choice result        | PASS (contract scope)                                   | Public reads expose participation/receipts but no option totals; only opaque handles and the final verdict are exposed. No UI was built.                                                                                                |
| R7 privacy floor                   | PASS (local)                                            | Organization hard minimum, proposal floor, unique Recorded-wallet accounting, Abstain inclusion, replacement non-increment, and below-floor terminal withholding all pass.                                                              |
| R8 asynchronous close and tally    | PASS (contract scope), PARTIAL (product)                | Closed, TallyPending, Withheld, Passed, Rejected, and finalize-once paths pass; Governor keeps unresolved proposals Pending and unqueueable. Product timeout/retry presentation is not implemented.                                     |
| R9 verdict-only disclosure         | PASS (local released stack)                             | Only the stored boolean verdict receives public-decryption permission; signer/domain/handle/length/encoding/proposal/replay negatives pass locally and the changed graph resolves on released Nox.                                      |
| R10 exact execution                | PASS (local)                                            | Safe direct and call-only batch execution are exact, atomic, retry-safe, reentrancy-safe, disabled-module-safe, and execute-once. Governor preserves its TimelockController boundary.                                                   |
| R11 verification center            | PASS (contract evidence), NOT RUN (UI)                  | Events/getters expose commitments, receipts, expected verdict, result, execution, versions, and code hashes. The user-facing verification surface is not implemented.                                                                   |
| R12 trust disclosure               | PASS (corpus), NOT RUN (UI)                             | Accepted artifacts state Gateway plaintext visibility, single-KMS trust, public participation, and no receipt-freeness. No screen exists.                                                                                               |
| R13 failure and recovery           | PASS (local infrastructure/contract), PARTIAL (product) | Failed/stale operations do not mutate receipts; same-result Runner restart, explicit JetStream NAK redelivery, Safe failure rollback/retry, and no plaintext fallback pass. Product timeout/retry UX is not implemented.                |
| R14 proposal experience            | NOT RUN                                                 | Frontend and visual design are outside the authorized contract track.                                                                                                                                                                   |

## Acceptance Criteria Coverage

| Criterion                                    | Status                      | Evidence                                                                                                                                                                            |
| -------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 no plaintext public choice               | PASS (local)                | Released Handle Gateway test imports opaque `uint16` evidence; calldata/events contain no plaintext choice field.                                                                   |
| AC2 no non-core ballot ACL                   | PASS (local)                | Casting and tally ACL tests plus manual `Nox.allow*` review: ballot/intermediate handles use `allowThis`; only verdict uses `allowPublicDecryption`.                                |
| AC3 newest replacement only                  | PASS (local)                | Two replacements and encrypted subtract/add path pass deterministic tests and 10,000-run stateful invariants.                                                                       |
| AC4 noncanonical is Abstain; stale immutable | PASS (local released stack) | Full-shape real-Nox graph resolves with noncanonical input normalized to Abstain; stale/out-of-order calls do not mutate public accounting.                                         |
| AC5 no running public tally                  | PASS (contract scope)       | No option-total getter or public-decryption ACL exists. UI is not run.                                                                                                              |
| AC6 below-floor withholding                  | PASS (local released stack) | Below-floor request terminates as Withheld without constructing or publishing a verdict.                                                                                            |
| AC7 exact verdict proof                      | PASS (local released stack) | Complete local signer/domain/handle/type/length/state/replay/cross-host/cross-chain matrix plus three released-stack signer/domain/cross-proposal/encoding repetitions pass.        |
| AC8 exact Passed-only action                 | PASS (local released stack) | Official Safe direct/batch and Governor/Timelock paths execute only the committed Passed action; every non-Passed state rejects.                                                    |
| AC9 real Nox and host transition             | PARTIAL                     | Released local Nox, official Safe, and compatible Governor/Timelock state transitions pass without mocks. The criterion's explicit testnet clause is NOT RUN under blocked Phase 6. |
| AC10–AC14 UI and verification UX             | NOT RUN                     | Frontend and visual design are unauthorized in this contract gate.                                                                                                                  |
| AC15 Safe compatibility                      | PASS (local released stack) | Normal owner threshold enables the module; exact Passed action executes once; changed action, replay, disabled module, failure, and reentrancy reject safely.                       |
| AC16 Governor compatibility                  | PASS (local released stack) | All public/internal plaintext cast seams reject; real Nox verdict reaches normal Governor queue and TimelockController execution.                                                   |

## Quality Gates

| Gate                              | Result                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Forge tests                       | PASS, 119/119 after four gas-baseline tests                                                                     |
| Stateful invariants               | PASS, 10,000 runs × 32 depth for each of three properties; 960,000 modeled calls; zero handler reverts/discards |
| Released Nox integration          | PASS, 9/9 in each of three consecutive clean-stack runs; 27/27 total; cleanup confirmed after every run         |
| Hardhat and Forge builds          | PASS                                                                                                            |
| TypeScript                        | PASS                                                                                                            |
| Forge format and high/medium lint | PASS                                                                                                            |
| Production sizes                  | PASS; all deployables remain below the 22 KiB target and EIP-170 limit                                          |
| Production-source spike imports   | PASS; none found                                                                                                |
| Diff and edited-file formatting   | PASS                                                                                                            |

The first changed-graph run began from no running Nox services with cached Docker images; two further
clean-start repetitions followed. This is a cold service-stack measurement, not a cold image-download
benchmark.

### Released-stack measurements

| Measurement                                   |            Three-run observation |
| --------------------------------------------- | -------------------------------: |
| Full product-shaped path                      | 14.482–15.539 s; median 15.230 s |
| Full-path close to proof                      |        469–585 ms; median 558 ms |
| Production-core close to proof                |        448–579 ms; median 555 ms |
| Runner stop/restart recovery                  |    4.075–4.149 s; median 4.088 s |
| JetStream negative-acknowledgement redelivery |    4.997–5.927 s; median 5.660 s |
| Governor proof through queue/timelock         |        393–600 ms; median 596 ms |
| First ballot gas                              |                          810,636 |
| Other first-ballot gas                        |                  767,760–767,784 |
| Replacement gas                               |                  721,291–721,315 |
| Close/finalize/Safe execute gas               | 560,368 / 73,199–73,211 / 99,445 |

### Deterministic production host gas baselines

`ConfidentialGovernanceGas.t.sol` measures the isolated Foundry call after proposal setup and fails
future regressions above 20% of these pinned baselines:

| Path                                      |              Gas |
| ----------------------------------------- | ---------------: |
| Safe direct execute                       |           86,074 |
| Safe two-call `MultiSendCallOnly` execute |          168,745 |
| Governor single-action queue / execute    | 102,732 / 52,792 |
| Governor two-action queue / execute       | 110,983 / 82,366 |

## Deviations From Plan

- The production proof-negative RED case exposed identical expected verdict handles when identical
  valid encrypted inputs were reused across same-core proposals. The production graph now consumes a
  ballot-ID-derived encrypted zero; plaintext semantics are unchanged and three released-stack runs
  verify the corrected graph.
- The cold-stack run reused cached Docker images. It proves clean service startup and graph execution,
  not network image-download latency.
- Solar still cannot parse the released Nox Solidity 0.8.35 `erc7201(...)` builtin. Concrete Nox test
  files, including the gas fixture, remain explicit test-lint exclusions but compile and execute under
  Solc/Forge. Production source passes high/medium Forge lint.
- Slither is intentionally absent by explicit user decision and is not a gate.

## Gaps And Risks

- Phase 6 Ethereum Sepolia behavior, addresses, gas, latency, accounts, funding, deployment, and
  external transactions are NOT RUN and require explicit authorization.
- Larger electorates are unbenchmarked; evidence is bounded to the judged four-wallet/floor-four graph.
- The current single-node Nox KMS and plaintext-seeing Handle Gateway remain trusted dependencies.
- Confidential choice does not make participation anonymous and re-voting is not receipt-freeness.
- Frontend status, verification, and trust-disclosure criteria AC10–AC14 remain NOT RUN under the
  separate design/frontend gate.
- CI jobs described by the quality profile are not yet installed; local evidence is complete, but a
  recorded real-Nox CI/manual gate remains mandatory before merge or public claims.

## Follow-ups

1. Stop at the Phase 6 authorization boundary unless the user explicitly approves accounts, funding,
   deployment, and external transactions.
2. Reverify official Sepolia Nox, Gateway, Safe, and explorer addresses immediately before any live
   action.
3. Resolve visual-design authority separately; do not infer UI authorization from this contract pass.
4. Add the required CI jobs before a merge/public-release gate.

## Evidence Log

- `mise exec -- pnpm test:integration`: three consecutive runs, each 9/9, with released Gateway, KMS,
  ingestor, JetStream, Runner, NoxCompute, official Safe, and compatible Governor/Timelock paths.
- `mise exec -- forge test --match-path test/foundry/production/ConfidentialGovernanceGas.t.sol -vv`:
  four gas baselines pass twice with identical isolated measurements.
- `FOUNDRY_PROFILE=invariant forge test --match-contract ConfidentialGovernanceInvariantTest -vv`:
  three properties at 320,000 calls each and zero handler reverts/discards.
- `mise exec -- pnpm test:forge`, `mise exec -- pnpm build`,
  `mise exec -- pnpm exec tsc --noEmit`, `mise exec -- pnpm lint:forge`,
  `mise exec -- forge fmt --check`, `mise exec -- forge build --sizes --skip test`, and scoped
  Prettier/diff checks: PASS.
- Manual review covered external calls, reentrancy consumption/rollback, action/proposal domains,
  Timelock roles, permanent ACL grants, public-decryption paths, factory creation/runtime hashes, and
  production-source isolation from `src/spike`.
