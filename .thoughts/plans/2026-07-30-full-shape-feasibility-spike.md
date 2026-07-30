# Plan: Full-Shape Confidential Governance Feasibility Spike

**Date:** 2026-07-30  
**Status:** Bounded local proof complete; PASS  
**Not authorized:** Testnet deployment, funded/billable infrastructure, public publishing, submission
claims, production hardening, or general product implementation

## Goal

Determine whether the complete selected confidential-governance critical path works with released Nox
behavior before a product contract architecture is approved:

`Handle Gateway input → fromExternal → weighted For/Against/Abstain contribution → replacement →
Recorded-participation floor → encrypted quorum and passage → one public verdict handle → Gateway
evidence → proposal-bound finalization → official Safe exact action once`

## Execution Status — 2026-07-30

- Phase 0: PASS; released hybrid stack compiles and starts.
- Phases 1–2: PASS locally; four unequal-weight voters, every choice class, non-canonical
  normalization, and two replacements resolve through released Nox.
- Phase 3: PASS locally; both floor branches, one public verdict, and the full named
  signer/domain/handle/type/length/state/replay matrix pass against the released verifier.
- Phase 4: PASS locally; repeated gas/latency, stale-sequence checks, real Runner stop/restart, and
  explicit JetStream negative-acknowledgement redelivery all pass.
- Phase 5: PASS locally; an official Safe module is enabled through a normal 1-of-1 owner transaction
  and executes only the exact action once.
- Phase 6: PASS locally; all plaintext OZ Governor cast paths are disabled, the async compatibility
  mapping is explicit, and a real Nox verdict preserves OZ queue/timelock execution.
- Phase 7: PASS for the bounded local technical gate; see
  [`../verification/2026-07-30-full-shape-spike-report.md`](../verification/2026-07-30-full-shape-spike-report.md).

The bounded local spike exit gate is closed. Product architecture, UI implementation, deployment, and
public claims remain separate authorization gates.

This is not a reduced MVP. The skill-required `REAL_MVP` label below means “must be real in the judged
proof path”; it does not authorize feature deferral. No selected behavior is classified `REAL_LATER`.

## Inputs

- Current authority: [`../decisions/CURRENT.md`](../decisions/CURRENT.md)
- Fable reconciliation:
  [`../decisions/2026-07-30-fable-review-reconciliation.md`](../decisions/2026-07-30-fable-review-reconciliation.md)
- Product spec:
  [`../specs/2026-07-29-confidential-governance-module.md`](../specs/2026-07-29-confidential-governance-module.md)
- Stories:
  [`../stories/2026-07-29-confidential-governance-module.md`](../stories/2026-07-29-confidential-governance-module.md)
- Nox feasibility research:
  [`../research/2026-07-29-nox-tee-voting-feasibility.md`](../research/2026-07-29-nox-tee-voting-feasibility.md)
- Governance-host comparison:
  [`../research/2026-07-29-governance-host-comparison.md`](../research/2026-07-29-governance-host-comparison.md)
- External review:
  [`../reviews/2026-07-30-fable-5-product-review.md`](../reviews/2026-07-30-fable-5-product-review.md)
- Pinned primary sources and versions:
  [`../sources/source-manifest.md`](../sources/source-manifest.md)
- Current official documentation refreshed through Context7 on 2026-07-30 for Foundry, Hardhat 3,
  iExec Nox, Safe Smart Account, and OpenZeppelin Contracts 5.x.

A project quality profile is not present. It is intentionally waived for this local protocol spike:
the governing quality bar is the spec's no-mock evidence standard plus the proof obligations below.
UI implementation is out of scope, so visual-direction acceptance is not a prerequisite for this plan.

## Verified Toolchain Baseline

| Component                |            Verified local/current value | Decision                                                                       |
| ------------------------ | --------------------------------------: | ------------------------------------------------------------------------------ |
| Forge / Cast             |                                   1.7.1 | Primary compile, unit, fuzz, invariant, and gas-test toolchain                 |
| Node.js installed        |                                  25.9.0 | Do not treat as the reproducible target; Nox plugin CI documents Node 22/24    |
| Reproducible Node target |                                      24 | Pin with `mise`; satisfies Nox's Node 22+ requirement and matches tested range |
| pnpm                     |                                 10.33.0 | Workspace package manager                                                      |
| Docker client/server     |                         29.4.1 / 29.4.0 | Local Nox off-chain stack is available                                         |
| Solidity                 |                                  0.8.35 | Matches released Nox SDK and official Nox Hardhat example                      |
| Hardhat                  | 3.11.1 current; plugin accepts `^3.4.0` | Bounded real Nox integration harness only                                      |
| Nox Hardhat plugin       |                                   0.2.0 | Starts real local Gateway/KMS/Runner/NATS/S3/Ingestor stack                    |
| Nox protocol contracts   |                                   0.2.4 | Released Solidity SDK and NoxCompute ABI/artifact                              |
| Hardhat Viem toolbox     |                                   5.0.7 | Wallet/deployment integration for the Nox helper                               |
| OpenZeppelin Contracts   |                                   5.6.1 | Governor and action-target primitives                                          |
| Safe Smart Account       |                                   1.5.0 | Official local Safe module execution proof                                     |

Foundry and Hardhat share the same Solidity sources and npm-installed dependencies. Foundry includes
`node_modules` in `libs`; Hardhat uses its Foundry compatibility plugin/remappings and the Nox plugin.
The official Nox Foundry guide is still a placeholder, so no Foundry-only test may support a real Nox
claim.

## Product Laws Under Test

1. **Choice encoding:** `0 = Against`, `1 = For`, `2 = Abstain`; every other `uint16` value has the same
   encrypted tally effect as Abstain.
2. **Weight:** each eligible wallet has one public, immutable proposal-snapshot weight.
3. **Sequence:** an accepted operation must use exactly the next proposal-scoped wallet sequence.
4. **Effective ballot:** a wallet has one effective encrypted contribution; replacement subtracts the
   former contribution and adds the new one.
5. **Privacy participation:** the first effective Recorded operation increments the unique-wallet count;
   replacement does not. Pending/failed/stale operations do not count.
6. **Governance rule:** encrypted `For + Against + Abstain >= quorum` and encrypted `For > Against`;
   verdict is their encrypted conjunction.
7. **Disclosure:** below the public privacy floor, no verdict handle is made publicly decryptable. At or
   above it, only the stored expected boolean verdict handle may be public.
8. **Finalization:** configured-Gateway evidence is checked against the proposal's stored expected handle
   and may finalize once.
9. **Execution:** Passed permits exactly the committed Safe target/value/calldata once; every other state,
   mismatch, and replay is rejected.
10. **Privacy invariant:** ballot, prior-ballot, contribution, accumulator, quorum, and passage handles
    never receive viewer or public-decryption permission.

## Assumptions

- The local proof fixture uses six eligible wallets, four Recorded voters, a privacy floor of three, and
  unequal public weights. These are measurement fixtures, not the final organization hard minimum.
- Official clients submit only canonical `0/1/2`; malicious or buggy non-canonical `uint16` input is
  normalized to Abstain so it cannot create an undisclosed validity class.
- Solidity transactions give a deterministic total order; the proposal-scoped sequence rule rejects
  stale/duplicate replacement transactions before confidential arithmetic is scheduled.
- Real Nox integration evidence comes only from the plugin-managed local stack. Foundry fixtures may test
  ordinary state-machine laws but cannot substitute for Nox.
- The Safe proof uses the official Safe contracts locally with a one-owner/one-threshold fixture and a
  real enabled module. A fake Safe interface is not exit evidence.
- The Governor integration remains selected. This spike must produce a source-backed hook note and
  compile/test seam against the real OpenZeppelin version; it does not deploy a Governor.

## Open Questions

1. Does the released Runner resolve the resulting dependency graph reliably at four-voter/one-replacement
   and six-voter/two-replacement bounds?
2. What is the actual operation count, gas, ballot-to-Recorded time, and close-to-proof-ready time?
3. Does subtract-old/add-new remain correct under NATS redelivery and a deliberately interrupted Runner?
4. Can every intermediate handle's ACL/public flag be inspected locally with released views/events?
5. Can malformed proof length/type be rejected through the SDK's typed `publicDecrypt`, or is an explicit
   application length/type guard also required?
6. Which OpenZeppelin Governor entrypoints are virtual/overridable in 5.6.1, and can every plaintext
   `VoteCast` path be disabled without forking the base Governor?
7. Testnet network, account, gas funding, and live evidence remain a later authorization decision.

## Integration Reality Matrix

| Surface                             | Classification | Concrete real path                                                                   | Gate meaning                                                               |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Handle preparation                  | `REAL_MVP`     | `@iexec-nox/nox-hardhat-plugin@0.2.0` → real local Handle Gateway `POST /v0/secrets` | Gateway must really receive/encrypt input and return released proof        |
| On-chain handle import              | `REAL_MVP`     | `@iexec-nox/nox-protocol-contracts@0.2.4` `Nox.fromExternal(euint16)`                | Wrong owner/app/type/proof must fail                                       |
| Confidential operations             | `REAL_MVP`     | Released NoxCompute + Runner/KMS/Gateway stack                                       | No local arithmetic mock supports feasibility                              |
| Weighted three-option normalization | `REAL_MVP`     | `eq`, `select`, `sub`, `add` on real handles                                         | Canonical and non-canonical inputs must match product laws                 |
| Replacement ordering                | `REAL_MVP`     | Contract sequence state plus real Nox contribution handles                           | One effective contribution after replacement                               |
| Privacy floor                       | `REAL_MVP`     | Public Recorded-wallet counter; no private validity signal                           | Both above/below branches observed                                         |
| Verdict derivation                  | `REAL_MVP`     | Real encrypted comparisons, `select` to `euint256`, `mul`, final `eq`                | No assumed boolean AND primitive                                           |
| Public decryption/evidence          | `REAL_MVP`     | Real Gateway `publicDecrypt` + on-chain typed `Nox.publicDecrypt`                    | Exactly one expected verdict handle accepted                               |
| ACL/privacy audit                   | `REAL_MVP`     | Released NoxCompute ACL views and `MarkedAsPubliclyDecryptable` events               | Zero ballot/intermediate public grants                                     |
| Safe adapter                        | `REAL_MVP`     | `@safe-global/safe-smart-account@1.5.0` official local Safe                          | Real module enablement and execution, mismatch/replay rejection            |
| Governor compatibility seam         | `REAL_MVP`     | `@openzeppelin/contracts@5.6.1` source/compile/tests                                 | Disable plaintext cast paths; async state note must pass                   |
| Wallet account behavior             | `REAL_MVP`     | Hardhat Viem wallet clients used by Nox helper                                       | Owner binding uses the actual submitting account                           |
| Foundry tests                       | `REAL_MVP`     | Forge 1.7.1 with npm remappings                                                      | State, fuzz, invariant, replay, action-binding tests                       |
| Hardhat Nox tests                   | `REAL_MVP`     | Hardhat 3.11.1 + Viem toolbox + Nox plugin                                           | Sole local end-to-end Nox evidence                                         |
| Ethereum Sepolia proof              | `BLOCKED`      | Released Ethereum Sepolia Nox deployment                                             | Blocked only by explicit deployment/funding authorization after local PASS |
| Frontend/indexer                    | `OUT_OF_SCOPE` | Product surface remains specified separately                                         | Excluded from this technical spike, not removed from product               |
| Anonymous eligibility               | `OUT_OF_SCOPE` | Spec non-goal                                                                        | No anonymity claim                                                         |
| Threshold KMS                       | `OUT_OF_SCOPE` | Current Nox is single-KMS                                                            | Disclose weaker custody; do not simulate Keypers                           |
| Receipt-freeness/MACI chain         | `OUT_OF_SCOPE` | Unsupported by released Nox                                                          | Re-vote remains a recovery window only                                     |

There are no `REAL_LATER` or `SIMULATED_DEMO_ONLY` rows. Unit-test fixtures may induce failures, but no
fixture or mock can be cited as proof of Nox, Safe, privacy, or execution behavior.

## Phase 0: Reproducible Hybrid Workspace

### Goal

Create the smallest workspace in which Foundry and Hardhat compile the same Solidity sources against
the exact released dependencies.

### Work

- Add `package.json`, `pnpm-lock.yaml`, `foundry.toml`, `hardhat.config.ts`, `tsconfig.json`, and a
  workspace Node 24 pin.
- Install exact direct dependencies for Nox protocol contracts, Nox plugin, Hardhat/Viem, OpenZeppelin,
  Safe, Forge standard library, and Hardhat/Foundry compatibility.
- Use shared `src/`, `test/foundry/`, and `test/integration/` paths.
- Add deterministic commands for `forge build`, `forge test`, Hardhat compile, and Nox integration tests.

### Real Integration Path

Official npm packages only. The Nox plugin must resolve the consuming project's exact NoxCompute 0.2.4
artifact and start its shipped Docker Compose services.

### Mock/Simulation Policy

No protocol mock. A trivial action target is allowed only as the real Safe execution destination.

### Checks

- Both compilers accept the shared source tree with Solidity 0.8.35.
- Dependency and runtime versions are captured in the verification report.
- Docker health and Nox plugin connection pass.

### Acceptance Criteria Covered

Foundation for AC9, AC14, AC15, and AC16.

### Stop Condition

Stop if the released Nox package/plugin cannot coexist with the pinned Foundry/Hardhat workspace without
patching third-party source.

## Phase 1: Proposal, Sequence, Floor, and Evidence-Binding Laws

### Goal

Implement only the state required to drive the full Nox proof: proposal commitment, eligibility/weight,
operation sequence, public Recorded participation, terminal states, expected verdict handle,
finalization-once, and exact-action-once.

### Work

- Add a bounded spike contract supporting at least two proposals for cross-proposal negative tests.
- Store immutable proposal action, public weight snapshot, governance rule, privacy floor, and deadlines.
- Reject ineligible, wrong-phase, wrong-sequence, duplicate, stale, mismatch, and replay paths.
- Add Foundry unit/fuzz/invariant tests for all ordinary public state laws.

### Real Integration Path

Contract imports the real Nox encrypted types and SDK. Ordinary state tests do not claim confidential
feasibility; that claim waits for Phase 2.

### Mock/Simulation Policy

Foundry may avoid executing Nox calls in tests limited to precondition/state-machine behavior. No
Nox-mocked success path counts as evidence.

### Checks

- One effective sequence per proposal/wallet.
- Replacements do not increment unique participation.
- Below-floor close cannot create an expected verdict handle.
- Wrong proposal/action/replay always rejects.

### Acceptance Criteria Covered

AC3–AC6, AC8, AC10, and the public parts of AC15.

### Stop Condition

Stop if proposal/action/sequence binding requires exposing a choice or weakening execute-once.

## Phase 2: Real Nox Three-Option Weighted Replacement

### Goal

Prove the complete confidential arithmetic path with released local Nox services.

### Work

- Import external `euint16` choices through real Handle Gateway proofs.
- Persist application access to every ballot and derived handle required by later computation.
- Derive encrypted weighted contributions:
  - `Against = select(choice == 0, weight, 0)`;
  - `For = select(choice == 1, weight, 0)`;
  - `Abstain = weight - Against - For`, making every other value Abstain.
- Replace by subtracting the stored old contributions and adding the new contributions.
- Use unequal weights and prove For, Against, Abstain, non-canonical normalization, and one replacement.

### Real Integration Path

Hardhat calls `nox.encryptInput`, the contract calls released `Nox.fromExternal/eq/select/sub/add`, and
the plugin-managed Runner/Gateway/KMS resolves the actual handles.

### Mock/Simulation Policy

No mocked handle, proof, NoxCompute, KMS, Runner, Gateway, or plaintext accumulator.

### Checks

- Real handles resolve within a measured bound.
- Replacement leaves exactly one effective contribution.
- Non-canonical input matches Abstain's tally effect.
- Public transactions/events contain no support value.
- Ballot and contribution handles remain non-public with no viewers.

### Acceptance Criteria Covered

AC1–AC5, AC9, AC11, AC13, and AC14.

### Stop Condition

Stop with FAIL if any selected path needs plaintext tallying, a local substitute, forbidden handle
access, or an impractical dependency graph at the fixture bound.

## Phase 3: Privacy Floor, Verdict-Only Disclosure, and Negative Proofs

### Goal

Prove both privacy-floor branches and exactly-one-bit disclosure.

### Work

- Below floor: close as Result withheld without creating or publishing a verdict handle.
- Above floor: derive encrypted total/quorum and For>Against; convert both booleans to encrypted uints,
  multiply, compare to one, and store one expected `ebool` verdict handle.
- Grant public decryption only to that verdict handle.
- Obtain the real Gateway proof and finalize through typed `Nox.publicDecrypt`.
- Test wrong signer, wrong handle, wrong proposal, wrong type/length, early proof, proof mutation, replay,
  and duplicate finalization.

### Real Integration Path

Real Nox public-decryption flag, Gateway/KMS response, signed proof, and on-chain NoxCompute validation.

### Mock/Simulation Policy

Proof mutation is a negative-test technique only. No locally signed replacement proof is accepted.

### Checks

- Exactly one `MarkedAsPubliclyDecryptable` event for a successful proposal: the expected verdict.
- Zero such events below the floor.
- All negative proofs reject; duplicate finalization is rejected or idempotent without state change.
- Verification records the proof signer and exact expected handle.

### Acceptance Criteria Covered

AC6–AC9, AC12–AC14.

### Stop Condition

Stop with FAIL if an unexpected handle/proof can finalize, any ballot/intermediate becomes public, or
the Gateway proof cannot drive the real module state transition.

## Phase 4: Ordering, Interruption, Retry, and Measurements

### Goal

Measure and pressure-test the asynchronous pipeline instead of assuming demo-friendly behavior.

### Work

- Record gas and operation/event count for first vote, replacement, close/tally, and finalization.
- Record Handle Gateway input-to-resolution and close-to-proof-ready wall time across repeated runs.
- Submit duplicate/stale sequences and concurrent next-sequence attempts.
- Interrupt the local Runner/NATS path after scheduling work, observe unresolved status, restart, and
  verify deterministic recovery or a clearly reproducible failure.
- Capture dependency handle/status and service logs needed to diagnose a stall.

### Real Integration Path

Plugin-shipped Docker services and released status endpoint. No artificial progress percentage.

### Mock/Simulation Policy

Service interruption is an explicit failure injection against the real local stack.

### Checks

- No double contribution under transaction races or service redelivery.
- Retry does not create a second verdict or change the expected handle.
- Measurements include median, maximum, fixture size, software versions, and cold/warm image state.

### Acceptance Criteria Covered

AC3, AC10, AC11, AC14 and failure/recovery requirements R8/R13.

### Stop Condition

Stop with conditional FAIL if recovery is nondeterministic or latency exceeds the four-minute demo
budget at the smallest honest fixture; do not hide it with a mocked precomputed result.

## Phase 5: Official Safe Exact-Action Proof

### Goal

Prove that a real enabled Safe module can execute only the proposal's committed action once.

### Work

- Deploy and initialize the official Safe locally; enable the spike module through the normal owner
  threshold path.
- Finalize a Passed proposal and execute a deterministic action target through
  `execTransactionFromModule` using `Call`, never `DelegateCall`.
- Attempt modified target, value, calldata, non-passed state, expired/invalid proposal, and second
  execution.
- Record the Safe/module state and action-target before/after values.

### Real Integration Path

Official `@safe-global/safe-smart-account@1.5.0` contracts and real module enablement/execution.

### Mock/Simulation Policy

The action target is a real local contract with observable state. A fake Safe is not allowed.

### Checks

- Safe reports the module enabled.
- Exact committed action succeeds once.
- Every mismatch and replay rejects before arbitrary Safe execution.
- No Safe owner nonce is claimed as module replay protection.

### Acceptance Criteria Covered

AC8, AC12, and AC15.

### Stop Condition

Stop with FAIL if the adapter can call anything other than the exact committed action or if replay is
possible.

## Phase 6: Governor Compatibility Gate

### Goal

Resolve the smallest real OpenZeppelin hook surface without claiming universal Governor retrofit.

### Work

- Trace every public standard cast entrypoint to `_castVote` and its plaintext `VoteCast` event in the
  pinned OpenZeppelin source.
- Determine which entrypoints can be overridden/disabled and whether a compatible Governor must fork or
  replace the base voting surface.
- Specify how `_quorumReached`, `_voteSucceeded`, `_countVote`, `_tallyUpdated`, `state`, queue, and
  timelock behave before and after asynchronous finalization.
- Compile and locally test the smallest compatible seam if the hooks permit it; otherwise record the
  exact source-level blocker and required custom Governor boundary.

### Real Integration Path

Pinned official `@openzeppelin/contracts@5.6.1`, not remembered API assumptions.

### Mock/Simulation Policy

No fake Governor API. This gate may end in a source-backed design constraint rather than deployment.

### Checks

- No supported cast path emits plaintext support.
- Pending confidential tally cannot appear Succeeded early.
- Final Passed/Rejected state preserves configured queue/timelock semantics.
- Compatibility label remains limited to new/upgradeable compatible Governors.

### Acceptance Criteria Covered

AC16 and R1/R8/R10/R14.

### Stop Condition

Stop the Governor implementation path if base entrypoints cannot be safely disabled without a custom
Governor. This does not stop the Safe-primary spike or remove Governor from product design; it fixes the
required integration boundary.

## Phase 7: Verification Audit and Gate Verdict

### Goal

Return evidence, not a green narrative.

### Work

- Produce `.thoughts/verification/2026-07-30-full-shape-spike-report.md` with commands, versions,
  transaction hashes/local receipts, event/ACL evidence, measurement tables, negative-test results,
  failures, and exact reproduction steps.
- Map every result to P1–P8 from the Fable review and AC1–AC16 from the spec.
- Classify each obligation PASS / FAIL / NOT RUN; never convert NOT RUN to PASS.
- Run an independent verification-audit checkpoint before updating `CURRENT.md`.

### Real Integration Path

Evidence is generated from the pinned local toolchain and released services/packages.

### Mock/Simulation Policy

The report labels unit fixtures separately and excludes them from protocol proof claims.

### Checks

- Reproduction commands work from the repository root.
- All relative document links resolve.
- No secrets, private keys, paid resources, or public deployment appear in the evidence bundle.

### Acceptance Criteria Covered

All ACs, with testnet portion of AC9 explicitly remaining NOT RUN until separately authorized.

### Stop Condition

Do not advance to architecture/general implementation unless the local spike verdict is PASS or a user
explicitly accepts a named, honest limitation. Do not deploy merely because the local spike passes.

## Verification Checkpoint

The local spike passes only if:

1. the full weighted three-option replacement path resolves through real local Nox;
2. below-floor disclosure emits no public-decryption grant;
3. above-floor disclosure publishes exactly the expected boolean verdict handle;
4. wrong evidence, proposal, type, sequence, action, and replay paths reject;
5. every ballot/intermediate ACL remains private;
6. measured latency is compatible with an honest four-minute demo strategy;
7. an official Safe executes exactly one committed action; and
8. the Governor hook boundary is source-backed and contains no plaintext cast path.

Passing locally authorizes nothing automatically. The next user gate would choose whether to allow an
Ethereum Sepolia deployment and live Nox proof.

## Handoff Notes

- Do not reuse the historical binary/unweighted decision plan.
- Do not interpret `REAL_MVP` as permission to remove or defer selected features.
- Use Node 24 for reproducibility even though the current shell has Node 25.
- Keep raw third-party mirrors under `.thoughts/raw/`; depend on released packages in the spike.
- Preserve the previous NoxLimit archive; it is not a code source for this clean spike.
