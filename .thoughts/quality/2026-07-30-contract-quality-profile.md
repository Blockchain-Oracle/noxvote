# Project Quality Profile: Confidential Governance Contracts

**Date:** 2026-07-30  
**Status:** Active for contract planning and implementation
**Scope:** Solidity contracts, Foundry tests, Hardhat real-Nox integration tests, TypeScript harnesses,
and contract CI. Frontend and visual-design quality gates are intentionally excluded.

## Detected Stack

- Solidity `0.8.35` with optimizer enabled at 200 runs.
- Foundry/Forge `1.7.1` as the primary contract build, unit, fuzz, invariant, formatting, and lint tool.
- Hardhat `3.11.1` plus `@iexec-nox/nox-hardhat-plugin@0.2.0` for the released real local Nox stack.
- `@iexec-nox/nox-protocol-contracts@0.2.4` and `@iexec-nox/handle@0.1.0-beta.13`.
- `@openzeppelin/contracts@5.6.1` for Governor, `IVotes`, Merkle verification, and timelock behavior.
- `@safe-global/safe-smart-account@1.5.0` for official Safe proxy/module interfaces and batching code.
- Node.js 22–24, TypeScript `5.8.3`, Viem `2.55.10`, and pnpm `10.33.0`.
- Docker is required for the real local Handle Gateway, KMS, ingestor, JetStream, and Runner path.

The stack detector also sees thousands of files under `.thoughts/raw/`. Those are ignored third-party
research mirrors, not project source, and are excluded from every quality, size, lint, and CI count.

## Existing Commands

| Purpose              | Command                               | Current state                                                                                                        |
| -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Full build           | `mise exec -- pnpm build`             | PASS                                                                                                                 |
| Forge build          | `mise exec -- pnpm build:forge`       | PASS                                                                                                                 |
| Hardhat build        | `mise exec -- pnpm build:hardhat`     | PASS                                                                                                                 |
| TypeScript           | `mise exec -- pnpm exec tsc --noEmit` | PASS                                                                                                                 |
| Forge format         | `mise exec -- forge fmt --check`      | PASS                                                                                                                 |
| Forge lint           | `mise exec -- pnpm lint:forge`        | PASS                                                                                                                 |
| Forge tests          | `mise exec -- pnpm test:forge`        | PASS, 115/115                                                                                                        |
| Real Nox integration | `mise exec -- pnpm test:integration`  | Latest audited Phase 2 path PASS twice; 2026-07-31 changed-graph rerun NOT RUN because Docker daemon was unavailable |

The repository-wide Prettier command also checks historical Markdown and currently reports formatting
drift in eight untouched research files. Contract acceptance must not be blocked by that historical
documentation baseline. New or edited planning documents are checked explicitly until a separate
documentation-format cleanup is authorized.

## Required Local Checks

### Fast loop for each contract change

1. `mise exec -- forge fmt --check`
2. `mise exec -- pnpm lint:forge`
3. `mise exec -- forge build --sizes --skip test`
4. `mise exec -- pnpm exec tsc --noEmit`
5. `mise exec -- forge test -vvv`

The Foundry tests that deploy the released `NoxCompute` implementation are the test-file exceptions to
Solar lint. Foundry's current linter cannot parse Solidity 0.8.35's `erc7201(...)` builtin in that
upstream implementation, although Solc compiles it and the tests execute it. `lint:forge` therefore
lints all production source and all other Foundry tests in isolated lint caches, while `forge test`
remains the compile/execution gate for the concrete Nox fixtures. Automatic lint-on-build is disabled
so a prior fixture compilation cannot contaminate later Solar input; explicit `pnpm lint:forge` is the
required lint gate. Production builds skip test artifacts for the same parser limitation; they do not
skip production contracts.

On 2026-07-30 the user explicitly removed Slither from the project requirements. Do not run it,
report its availability as a blocker, or gate any phase on it. Forge lint, builds, tests, fuzz and
invariant suites, bytecode-size checks, and manual contract review remain required.

### Real-integration loop before completing an integration phase

1. Confirm Docker is running; do not silently replace the Nox stack with a mock.
2. Run `mise exec -- pnpm build`.
3. Run `mise exec -- pnpm test:integration`.
4. Confirm the plugin cleans the off-chain stack after the run.
5. Save gas, latency, retry, and proof-negative evidence in the verification artifact.

### Security loop before plan completion

- Run Forge fuzz and invariant suites with at least 10,000 fuzz cases per property locally and 50,000
  in CI for the privacy/action invariants.
- The local high-confidence profile is
  `FOUNDRY_PROFILE=invariant forge test --match-contract ConfidentialGovernanceInvariantTest -vv`.
  It fixes 10,000 runs at depth 32 against the explicit production handler boundary.
- Inspect deployed bytecode size. Target each deployable contract below 22 KiB and hard-fail at the
  EIP-170 24,576-byte limit.
- Establish gas snapshots after the first production-shaped real-Nox run; fail later regressions above
  20% unless the plan/verification record explains and accepts the increase.
- Review every external call, reentrancy boundary, action hash, proposal/chain domain, role, permanent
  ACL grant, and public-decryption path manually.

## Required CI Gates

CI is absent today. Future contract implementation must add four required jobs:

1. **Static:** Forge format, high/medium lint, TypeScript check, and edited-file Prettier check.
2. **Build/unit:** Forge and Hardhat builds, contract-size report, unit tests, fuzz, and invariants.
3. **Contract review:** Selector/interface and storage-layout reports plus manual role, ACL,
   external-call, and action-commitment review.
4. **Real Nox integration:** Docker-backed released Nox stack, official Safe proxy/module path,
   compatible Governor/timelock path, proof-negative matrix, Runner restart, and JetStream redelivery.

The real-Nox job is required before merging an integration phase or making a product claim. It may be
manually dispatched if CI infrastructure cannot reliably run nested Docker, but a passing recorded run
is still mandatory.

## Suggested Hooks

- Pre-commit: `forge fmt --check`, Forge high/medium lint on changed Solidity, and Prettier on changed
  TypeScript/Markdown/JSON only.
- Pre-push: TypeScript check and Forge unit/fuzz tests.
- Do not run the Docker-backed Nox suite automatically on every commit; run it before phase completion
  and in the required CI integration job.

Hooks are recommendations until implementation is authorized. CI remains the final authority.

## File Size Policy

- Target: at most 200 source lines per production contract, library, or interface.
- Warning: above 200 source lines.
- Hard cap: above 300 source lines unless the quality profile records a concrete security/readability
  reason.
- Split core state, eligibility strategies, Safe adapter, Governor adapter, factory, and interfaces
  rather than promoting the 500-line spike into production.
- Test files should also target 300 lines and be split by behavior; integration orchestration may exceed
  this only with a written reason.
- Exclusions: `.thoughts/raw`, `node_modules`, generated artifacts, build output, fixtures, vendored
  code, lockfiles, and compiler output.

## Commit Policy

The repository has no commits yet and no established commit convention. Do not introduce a commit-msg
hook. When the user authorizes commits, use concise imperative subjects and separate context-only,
core, Safe, Governor, and verification changes so each security boundary is reviewable.

## AGENTS.md Notes

- Keep Foundry primary and Hardhat mandatory for the real released Nox stack.
- No mock may support a privacy, proof, Nox, Safe, Governor, or testnet product claim.
- Production source must not import `src/spike`; spike code remains evidence only.
- Treat external-designer work as visual evidence, not contract or frontend implementation authority.
- Require explicit authorization before deployment, funding, public publishing, or submission claims.

## Open Environmental Gates

The latest audited Phase 2 production-core path passes twice against the Docker-backed released Nox
stack. The Phase 5 ballot-domain fix changes the confidential tally graph, so those prior runs do not
verify the new graph. A complete rerun was attempted on 2026-07-31, but the plugin could not connect to
the Docker daemon; all nine cases stopped during environment setup before exercising a contract path,
and plugin cleanup completed. Run the complete integration suite again before this slice or the
combined contract system is called integration-complete. Do not diagnose or change Docker without a
separate request.

Slither is not an open environmental gate and is not required for project completion.
