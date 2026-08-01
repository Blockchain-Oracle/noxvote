# Verification Audit: Confidential Governance Production Contracts

## Verdict

**PASS for the authorized local contract gate (Phases 1–5).** The production core, Safe adapter,
compatible Governor/Timelock path, factories, proof boundaries, invariants, recovery behavior, gas
baselines, and released local Nox integration align with the accepted contract plan. Three consecutive
expanded-graph runs pass all 11 Docker-backed integration cases and clean the off-chain stack. The
factory-deployed production Safe direct/batch paths and production Governor/real-Timelock path now
consume real released-Nox verdicts.

This is not a product-completion or live-transaction verdict. The user authorized Phase 6 accounts,
funding checks, deployment, and required Ethereum Sepolia transactions on 2026-08-01. The read-only
live dependency/code-hash preflight passes, but funded accounts and external transactions remain
**NOT RUN** because no dedicated deployer is configured. AC9 is therefore still only locally proven
until the authorized Phase 6 transaction path executes. The separate ORBIT frontend track is now
authorized, but remains NOT RUN and outside this contract audit. Publishing and submission remain
unauthorized.

## Artifacts Checked

- `.thoughts/decisions/CURRENT.md`
- `.thoughts/specs/2026-07-29-confidential-governance-module.md`
- `.thoughts/stories/2026-07-29-confidential-governance-module.md`
- `.thoughts/design/2026-07-30-confidential-governance-technical-architecture.md`
- `.thoughts/plans/2026-07-30-confidential-governance-contract-implementation-plan.md`
- `.thoughts/quality/2026-07-30-contract-quality-profile.md`
- `.thoughts/reviews/2026-07-31-opus-5-predeployment-review.md`
- `src/contracts/**`
- `test/foundry/production/**`
- `test/integration/**`
- `package.json`, `foundry.toml`, and the pinned dependency lockfile

## Requirement Traceability

| Requirement                        | Contract-gate status                                    | Evidence                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 host adapters                   | PASS (local released stack)                             | Factory-deployed production Safe module with official Safe 1.5.0 direct/batch execution; factory-deployed production OpenZeppelin Governor 5.6.1 with real TimelockController roles, delay, queue, and execution.                       |
| R2 immutable proposal commitment   | PASS (contract scope)                                   | Core ballot/config hash tests; Safe action-domain/order/value/data tests; Governor exact normal proposal hash; factory configuration and code-hash events. Title/discussion-link UI is outside the contract gate.                       |
| R3 eligibility and fixed weight    | PASS (local)                                            | IVotes snapshot and host/chain-bound weighted-Merkle strategies; casting tests and invariants prove first-cast weight remains fixed and one effective contribution survives replacements.                                               |
| R4 confidential ballot preparation | PASS (local released stack)                             | Real Handle Gateway inputs reach released Nox without plaintext choice calldata; proof owner/application/type binding passes; ACL tests prove core-only persistence. The Gateway remains inside the disclosed plaintext trust boundary. |
| R5 cast and replace                | PASS (contract scope)                                   | Strict sequences 1/2/3, two-replacement ceiling, stale/out-of-order immutability, operation receipts, and invariant coverage pass. Product operation-state UI is not run.                                                               |
| R6 no running choice result        | PASS (contract scope)                                   | Public reads expose participation/receipts but no option totals; only opaque handles and the final verdict are exposed. No UI was built.                                                                                                |
| R7 privacy floor                   | PASS (local)                                            | Organization hard minimum, proposal floor, unique Recorded-wallet accounting, Abstain inclusion, replacement non-increment, and below-floor terminal withholding all pass.                                                              |
| R8 asynchronous close and tally    | PASS (contract scope), PARTIAL (product)                | Closed, TallyPending, Withheld, Passed, Rejected, and finalize-once paths pass; Governor keeps unresolved proposals Pending and unqueueable. Product timeout/retry presentation is not implemented.                                     |
| R9 verdict-only disclosure         | PASS (local released stack)                             | Only the stored boolean verdict receives public-decryption permission; signer/domain/handle/length/encoding/proposal/replay negatives pass locally and against production core before its real proof is accepted.                       |
| R10 exact execution                | PASS (local released stack)                             | Factory-deployed production Safe direct/call-only batch execution consumes real verdicts; Governor preserves and crosses its real TimelockController boundary only after a real Passed verdict.                                         |
| R11 verification center            | PASS (contract evidence), NOT RUN (UI)                  | Events/getters expose commitments, receipts, expected verdict, result, execution, versions, and code hashes. The user-facing verification surface is not implemented.                                                                   |
| R12 trust disclosure               | PASS (corpus), NOT RUN (UI)                             | Accepted artifacts state Gateway plaintext visibility, single-KMS trust, public participation, and no receipt-freeness. No screen exists.                                                                                               |
| R13 failure and recovery           | PASS (local infrastructure/contract), PARTIAL (product) | Failed/stale operations do not mutate receipts; same-result Runner restart, explicit JetStream NAK redelivery, Safe failure rollback/retry, and no plaintext fallback pass. Product timeout/retry UX is not implemented.                |
| R14 proposal experience            | NOT RUN                                                 | Frontend and visual design are outside the authorized contract track.                                                                                                                                                                   |

## Acceptance Criteria Coverage

| Criterion                                    | Status                      | Evidence                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 no plaintext public choice               | PASS (local)                | Released Handle Gateway test imports opaque `uint16` evidence; calldata/events contain no plaintext choice field.                                                                          |
| AC2 no non-core ballot ACL                   | PASS (local)                | Casting and tally ACL tests plus manual `Nox.allow*` review: ballot/intermediate handles use `allowThis`; only verdict uses `allowPublicDecryption`.                                       |
| AC3 newest replacement only                  | PASS (local)                | Two replacements and encrypted subtract/add path pass deterministic tests and 10,000-run stateful invariants.                                                                              |
| AC4 noncanonical is Abstain; stale immutable | PASS (local released stack) | Full-shape real-Nox graph resolves with noncanonical input normalized to Abstain; stale/out-of-order calls do not mutate public accounting.                                                |
| AC5 no running public tally                  | PASS (contract scope)       | No option-total getter or public-decryption ACL exists. UI is not run.                                                                                                                     |
| AC6 below-floor withholding                  | PASS (local released stack) | Below-floor request terminates as Withheld without constructing or publishing a verdict.                                                                                                   |
| AC7 exact verdict proof                      | PASS (local released stack) | Complete local matrix plus production-core released-stack rejection of short, mutated, wrong-signer/domain/handle, malformed-length, and noncanonical-boolean evidence.                    |
| AC8 exact Passed-only action                 | PASS (local released stack) | Factory-deployed production Safe direct/batch and production Governor/real-Timelock paths execute only the committed action after a real Passed verdict.                                   |
| AC9 real Nox and host transition             | PARTIAL                     | Released local Nox and production Safe/Governor host transitions pass without mocks. Live Sepolia dependencies pass read-only verification; the criterion's transaction clause is NOT RUN. |
| AC10–AC14 UI and verification UX             | NOT RUN                     | A separate ORBIT frontend track is authorized, but no UI result is assessed by this contract audit.                                                                                        |
| AC15 Safe compatibility                      | PASS (local released stack) | Factory-deployed module consumes a real verdict for official Safe direct/batch execution; Foundry proves changed action, replay, disabled module, failure, and reentrancy rejection.       |
| AC16 Governor compatibility                  | PASS (local released stack) | Factory-deployed production Governor consumes a real verdict, queues through the real TimelockController, observes delay, and executes.                                                    |

## Quality Gates

| Gate                              | Result                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Forge tests                       | PASS, 119/119 after four gas-baseline tests                                                                     |
| Stateful invariants               | PASS, 10,000 runs × 32 depth for each of three properties; 960,000 modeled calls; zero handler reverts/discards |
| Released Nox integration          | PASS, 11/11 in each of three consecutive clean-stack runs; 33/33 total; cleanup confirmed after every run       |
| Hardhat and Forge builds          | PASS                                                                                                            |
| TypeScript                        | PASS                                                                                                            |
| Forge format and high/medium lint | PASS                                                                                                            |
| Production sizes                  | PASS; all deployables remain below the 22 KiB target and EIP-170 limit                                          |
| Production-source spike imports   | PASS; none found                                                                                                |
| Diff and edited-file formatting   | PASS                                                                                                            |
| Contract CI definition            | INSTALLED; five jobs defined, remote-run observation still pending                                              |
| Phase 6 live dependency preflight | PASS; Nox/Safe code hashes, Gateway, subgraph, source provenance, and exact Foundry creation bytecode verified  |

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

- Independent Git review established that the ballot-ID-derived encrypted-zero construction was
  already present in the first committed production core (`7f18524`). The earlier post-hoc
  RED-to-GREEN and factory-repin chronology was not supported by committed history. The mechanism is
  covered by the local cross-domain matrix and released-stack regression suite.
- The original nine-case released-stack suite used the production core but spike Safe/Governor
  choreography. The expanded 11-case suite closes that evidence gap with factory-deployed production
  adapters.
- The cold-stack run reused cached Docker images. It proves clean service startup and graph execution,
  not network image-download latency.
- Solar still cannot parse the released Nox Solidity 0.8.35 `erc7201(...)` builtin. Concrete Nox test
  files, including the gas fixture, remain explicit test-lint exclusions but compile and execute under
  Solc/Forge. Production source passes high/medium Forge lint.
- Slither is intentionally absent by explicit user decision and is not a gate.

## Gaps And Risks

- Phase 6 Ethereum Sepolia addresses and dependency code hashes pass current read-only verification.
  Live gas, latency, failure behavior, accounts, funding, deployment, and external transactions are
  still NOT RUN because the dedicated deployer is not configured.
- Larger electorates are unbenchmarked; evidence is bounded to the judged four-wallet/floor-four graph.
- The current single-node Nox KMS and plaintext-seeing Handle Gateway remain trusted dependencies.
- Confidential choice does not make participation anonymous and re-voting is not receipt-freeness.
- Frontend status, verification, and trust-disclosure criteria AC10–AC14 remain NOT RUN in this
  audit; the dedicated ORBIT implementation track is now separately authorized.
- The contract CI workflow is installed but has not yet been observed on a remote GitHub runner. The
  recorded local three-repetition real-Nox pass remains the current executable evidence.

## Follow-ups

1. Configure a dedicated Phase 6 deployer and satisfy the runner's dynamic funding gate without
   implicitly reusing unrelated local keystores.
2. Let `pnpm phase6:execute` repeat the official Sepolia Nox, Gateway, Safe, explorer, and exact
   creation-code checks immediately before its first authorized broadcast.
3. Keep ORBIT frontend implementation and its later verification audit separate from this contract
   deployment evidence.
4. Observe the installed contract workflow on a remote runner before treating CI as independently
   green.

## Evidence Log

- `mise exec -- pnpm test:integration`: three consecutive runs, each 11/11, with released Gateway,
  KMS, ingestor, JetStream, Runner, NoxCompute, factory-deployed production Safe direct/batch, and
  factory-deployed production Governor/real-Timelock paths.
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
- `pnpm phase6:preflight`: PASS against Ethereum Sepolia chain `11155111`; live Nox proxy and
  implementation, Gateway, subgraph, official Safe 1.5.0 dependencies, and exact reviewed Foundry
  factory/module/Governor/Timelock creation-code hashes match. No transaction was signed or broadcast.
- `pnpm test:integration`: the first attempt stopped before contract execution because the active
  OrbStack daemon was not running; after starting the configured daemon, one fresh complete 11/11
  released-stack run passed and cleaned the stack.
