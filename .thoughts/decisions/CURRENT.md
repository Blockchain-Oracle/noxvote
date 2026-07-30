# Current Product Decision

- **Status:** Confidential voting on Nox is the selected pivot. The user accepted the complete product
  definition, feature set, user flow, trust boundaries, normal-DAO execution semantics, and production
  technical architecture. The bounded local technical gate passes: real Nox-to-Safe, Runner restart,
  explicit JetStream negative-acknowledgement redelivery, the full named proof-negative matrix, and real
  Nox-to-compatible-Governor-to-Timelock execution all pass. The contract quality profile and
  contract-only implementation plan are accepted, and local phased contract implementation is
  authorized. Testnet deployment is not authorized.
- **Product shape:** A host-neutral confidential ballot core with a Safe execution adapter and a
  compatible OpenZeppelin Governor counting adapter, not a standalone DAO app. Safe is the primary
  judged retrofit/execution path; Governor is the native governance-framework integration.
- **Core promise:** Eligible, publicly visible voters submit confidential choices whose support values
  never appear on-chain or become public. After Handle Gateway ingestion, ballot handles,
  intermediates, and exact option totals remain non-public; after an independent
  privacy-participation floor, only the final pass/reject verdict is publicly decrypted and may drive
  an exact governance action.
- **Claim boundary:** Re-voting provides a coercion-recovery window, but released Nox cannot implement
  MACI's hidden reverse-valid key/nonce command chain. Do not claim receipt-freeness, bribe-proof voting,
  anonymity, or MACI-equivalent correctness.
- **Input trust boundary:** Released Nox does not perform browser-side encryption. The SDK sends the
  encoded plaintext choice to the iExec-operated, attested Handle Gateway, which encrypts it and returns
  the handle/proof used by the wallet transaction. Never claim that the choice stays on-device or that
  the Gateway cannot see it.
- **Participation decision:** The privacy floor counts unique eligible wallets whose newest effective
  ballot operation is Recorded. A replacement does not add another participant; pending, failed,
  rejected, and stale operations do not count. Abstain counts toward the privacy floor. The canonical
  encrypted input values represent For/Against/Abstain, and every other representable value is
  deterministically normalized to Abstain rather than creating a private validity class.
- **Governance decision:** Privacy participation is separate from governance quorum. The quorum and
  passage rule is committed before open and follows the compatible host; the primary demo uses the
  common rule in which Abstain contributes to quorum while passage is For weight greater than Against
  weight.
- **Design ownership:** `EXTERNAL_COMMISSION`. The user's external designer owns visual direction.
  Product mapping is accepted; visual direction, tokens, and UI implementation remain pending and may
  not be invented by the contract track.
- **Current gate:** Continue the accepted contract plan locally. Phase 2 is implementation- and
  integration-complete for the judged four-wallet/floor-four configuration, and Phase 3 is complete
  across Safe registration, direct execution, official `MultiSendCallOnly` batching, and the versioned
  factory deployment/evidence path. Phase 4 is complete: the compatible Governor passes immutable
  construction, exact confidential-proposal/core registration binding, complete plaintext-cast
  shutdown, truthful asynchronous state projection, non-Passed queue rejection, synchronized
  proposer-only Scheduled cancellation, real TimelockController queue/delay/execution and role
  boundaries, both accepted clock modes, and versioned factory deployment of the complete immutable
  Governor/timelock/core stack with creation/runtime evidence. Phase 5's combined production invariant
  suite now passes the accepted ballot-accounting, disclosure/finalization, and Safe execute-once
  properties at 10,000 stateful runs each. The complete local proof-negative matrix also passes after a
  ballot-domain tally fix closed identical-input verdict-handle aliasing across proposals and hosts.
  The next bounded action is the released Docker-backed Nox rerun for that changed graph; the 2026-07-31
  attempt stopped before execution because the Docker daemon was unavailable. Stop before frontend
  implementation, testnet deployment, funded/billable infrastructure, public publishing, or submission
  claims without another explicit user authorization.
- **Implementation progress:** Fourteen bounded RED-to-GREEN slices now pass locally. Phase 1 provides
  production interfaces, immutable adapter-owned core construction, ballot/config commitments,
  registration, derived Scheduled/Open/Closed state, pre-open cancellation, and public reads. Phase 2
  now includes production IVotes-snapshot and domain-separated weighted-Merkle eligibility plus the
  direct-wallet confidential-cast path: fixed first-cast weight, strict sequences 1/2/3, at most two
  replacements, unique public participation, encrypted subtraction/addition, and core-only ACL
  persistence. Invalid state, sequence, eligibility, replacement limit, and replacement-proof inputs
  reject before Nox input validation. The production core now also provides permissionless close-time
  tally request, terminal below-floor withholding without touching Nox, host-provided weighted quorum,
  encrypted `For > Against` passage, one expected boolean verdict, verdict-only public-decryption
  permission, configured-Gateway proof validation, canonical boolean decoding, and finalize-once
  Passed/Rejected state. Two consecutive Docker-backed runs of the production core through the released
  Handle Gateway, KMS, ingestor, JetStream, and Runner resolve and finalize the expected Passed verdict.
  The production Safe module is now immutably bound to one Safe/core/`MultiSendCallOnly`, accepts
  proposal registration only from its enabled Safe, derives nonce-separated proposal IDs, commits the
  exact ordered action bundle, and stores the absolute host quorum. Any caller may now execute a Passed
  exact single-call bundle once through the official Safe module path; failed Safe execution rolls the
  consumed flag back for exact retry, while pre-call consumption prevents reentrant double execution.
  Multiple actions now use the official `MultiSendCallOnly` through an outer DelegateCall to the one
  immutable construction-bound address after runtime code-hash revalidation. The encoder emits only
  inner Call operation bytes, exact order/value/data packing is independently checked, and any failed
  inner action rolls back the whole bundle and the consumed flag. The versioned factory publishes
  contract/rules version 1, deploys the reviewed IVotes and weighted-Merkle strategies once, and creates
  distinct immutable Safe/module/core pairs without an owner, proxy, or upgrade path. Callers supply the
  Safe-module creation bytecode, which must match the factory's pinned creation-code hash; the factory
  revalidates every published dependency runtime hash before CREATE and emits the complete
  Safe/module/core/strategy/batch address and code-hash evidence.
- **Competitive-field decision:** Other hackathon builders and previous voting-positioned projects are
  informational research only. They are not an eligibility, positioning, product-selection, or build
  gate unless the user explicitly changes that decision.
- **User preferences:** Re-voting and minimum-quorum-before-reveal are non-negotiable starting
  constraints. Foundry is preferred if released Nox tooling and dependencies support it cleanly.
  Slither is explicitly not required and must not be run or treated as a project gate.
- **Canonical brief:**
  [`../briefs/2026-07-29-confidential-voting-research-brief.md`](../briefs/2026-07-29-confidential-voting-research-brief.md)
- **Plain-English product definition:**
  [`../briefs/2026-07-29-plain-english-product-definition.md`](../briefs/2026-07-29-plain-english-product-definition.md)
- **Product-definition acceptance decision:**
  [`2026-07-30-product-definition-acceptance.md`](2026-07-30-product-definition-acceptance.md)
- **Architecture and contract-planning authorization:**
  [`2026-07-30-contract-planning-authorization.md`](2026-07-30-contract-planning-authorization.md)
- **Contract implementation authorization:**
  [`2026-07-30-contract-implementation-authorization.md`](2026-07-30-contract-implementation-authorization.md)
- **Accepted production technical architecture:**
  [`../design/2026-07-30-confidential-governance-technical-architecture.md`](../design/2026-07-30-confidential-governance-technical-architecture.md)
- **Active contract quality profile:**
  [`../quality/2026-07-30-contract-quality-profile.md`](../quality/2026-07-30-contract-quality-profile.md)
- **Active contract-only implementation plan:**
  [`../plans/2026-07-30-confidential-governance-contract-implementation-plan.md`](../plans/2026-07-30-confidential-governance-contract-implementation-plan.md)
- **Active research plan:**
  [`../plans/2026-07-29-confidential-voting-research-plan.md`](../plans/2026-07-29-confidential-voting-research-plan.md)
- **Historical first-pass architecture synthesis (technical evidence only):**
  [`../research/2026-07-29-confidential-voting-architecture-synthesis.md`](../research/2026-07-29-confidential-voting-architecture-synthesis.md)
- **Broader landscape:**
  [`../research/2026-07-29-open-source-private-voting-landscape.md`](../research/2026-07-29-open-source-private-voting-landscape.md)
- **Governance-host comparison:**
  [`../research/2026-07-29-governance-host-comparison.md`](../research/2026-07-29-governance-host-comparison.md)
- **Accepted product spec:**
  [`../specs/2026-07-29-confidential-governance-module.md`](../specs/2026-07-29-confidential-governance-module.md)
- **Accepted functional stories:**
  [`../stories/2026-07-29-confidential-governance-module.md`](../stories/2026-07-29-confidential-governance-module.md)
- **Accepted functional product surface; visual direction unresolved:**
  [`../design/2026-07-29-product-surface-map.md`](../design/2026-07-29-product-surface-map.md)
- **External product and architecture review:**
  [`../reviews/2026-07-30-fable-5-product-review.md`](../reviews/2026-07-30-fable-5-product-review.md)
- **Review reconciliation decision:**
  [`2026-07-30-fable-review-reconciliation.md`](2026-07-30-fable-review-reconciliation.md)
- **Active full-shape feasibility plan:**
  [`../plans/2026-07-30-full-shape-feasibility-spike.md`](../plans/2026-07-30-full-shape-feasibility-spike.md)
- **Bounded local PASS verification audit:**
  [`../verification/2026-07-30-full-shape-spike-report.md`](../verification/2026-07-30-full-shape-spike-report.md)
- **Historical first-pass delivery plan:**
  [`../plans/2026-07-29-confidential-voting-decision-plan.md`](../plans/2026-07-29-confidential-voting-decision-plan.md)
  (`REAL_MVP`, `REAL_LATER`, organizer-blocker, and unilateral feature-deferral labels are superseded.)
- **Previous project:** NoxLimit is superseded as the active product but preserved, not deleted, at
  `/Users/abu/dev/hackathon/wtf-noxlimit-archive-2026-07-29` with Git history and dirty working tree intact.

## Resolved Facts

1. MACI's re-vote property comes from a hidden reverse-valid signature/key/nonce state machine, not
   encryption or public latest-write-wins alone.
2. Deployed Shutter reveals individual plaintext ballots after close; its aggregate-only construction
   remains a PoC. Its threshold key management is stronger today than Nox's single-KMS MVP.
3. Nox ACL grants/public decryption are irreversible, compute is asynchronous, and public-decryption
   proof is a Gateway signature rather than a full computation proof.
4. Foundry compiles the released Solidity package, but official local Nox E2E support is Hardhat 3.
5. Outcome-only disclosure plus a distinct privacy floor is safer than publishing exact totals, but it
   cannot eliminate inference or create anonymity.
6. Released `encryptInput` sends the plaintext input to the attested Handle Gateway for encryption; the
   accurate product claim is off-chain/public confidentiality under the declared Nox trust model, not
   client-side encryption.
7. Public privacy-floor progress cannot depend on a hidden “valid choice” classification without
   another disclosed result. The adopted total ballot encoding makes every accepted input a defined
   choice and lets the floor use public Recorded participation.
8. Released local Nox resolves the selected four-voter, unequal-weight, three-option graph with a
   non-canonical normalization and two replacements; the latest measured full path is about 12 seconds
   on warm local Docker services.
9. An official Safe 1.5.0 proxy can enable the module through a normal owner-threshold transaction and
   execute only the committed action once without using the Safe owner nonce as replay protection.
10. OpenZeppelin Governor 5.6.1 permits disabling every plaintext cast route, but its standard state
    enum has no asynchronous tally/proof state. The compatible spike maps an ended unresolved proposal
    to standard Pending, exposes detailed TallyPending, then proves Succeeded/Queued/timelock-delayed
    execution after a real Nox proof. Arbitrary immutable Governors remain unsupported, and third-party
    tools may misread the compatibility Pending state.
11. The released Hardhat and Handle packages require bounded consumer workarounds locally: the plugin
    drops `PATH` from Docker Compose, and the Handle SDK derives owner from `getAddresses()[0]`.
12. A graph scheduled while the real local Runner is stopped remains unresolved, then resolves to the
    same stored expected verdict handle and finalizes successfully after Runner restart.
13. The real durable JetStream consumer redelivers a tally transaction after explicit `-NAK`; its
    delivery sequence advances twice and the Runner acknowledges the same deterministic result.
14. Wrong decryption signer, domain, cross-proposal handle, plaintext type/length, boolean encoding,
    early/wrong state, proof mutation, and duplicate finalization all reject independently.
15. A below-floor confidential Governor proposal maps to detailed Withheld and standard Defeated; a
    passed one queues through the real OpenZeppelin TimelockController and executes only after delay.
16. The user accepted the complete product and confirmed that execution remains normal DAO
    governance: a Passed Safe proposal executes its exact committed transaction once, while a Passed
    compatible Governor proposal queues through its configured timelock before normal execution.
17. The user accepted the production technical architecture, assigned visual design to an external
    designer, and authorized contract-only planning while UI planning remains paused.
18. The contract plan adopts Safe-threshold proposal registration, the proven four-wallet/floor-four
    judged configuration with two replacements, direct-call or `MultiSendCallOnly` Safe execution,
    indefinite tally-pending recovery, and immutable versioned contracts.
19. The user accepted the contract direction and authorized local phased contract implementation;
    frontend work and external-state actions remain separately gated.
20. The first production-core slice passes 23/23 Forge tests and both build systems. A concrete factory
    must deploy real Safe/Governor adapters; a generic factory-deployed host would be architecturally
    invalid, so adapter-owned core construction is established first.
21. The production IVotes and weighted-Merkle eligibility strategies pass their focused tests. They
    resolve only public eligibility and first-cast weight.
22. The production confidential-cast slice passes 8 focused tests and the full 41/41 Forge suite. It
    binds the released Nox input proof to the direct wallet and core, fixes weight on first cast,
    enforces sequences 1/2/3 with two replacements, preserves unique Recorded participation, and
    persists confidential graph access only for the core without public-decryption or viewer grants.
    This Foundry slice uses the released `NoxCompute` implementation behind its proxy with a test
    Gateway signer; it does not rerun the Handle Gateway, KMS, JetStream, or Runner and therefore does
    not independently prove the resolved plaintext result or off-chain privacy behavior.
23. The production tally/finalization slice passes 8 focused tests and a forced full 49/49 Forge run.
    Below-floor proposals become Withheld without a Nox call or verdict handle. At or above the floor,
    the core obtains the host quorum for the committed proposal/snapshot, derives one encrypted boolean
    verdict, grants public decryption only to that handle, and finalizes Passed or Rejected exactly once
    from canonical configured-Gateway evidence. The Foundry Gateway signer is a test fixture: these
    tests prove contract state, ACL, handle/proof binding, malformed-value rejection, and replay safety,
    but do not alone prove that the off-chain Runner resolved the production graph to the signed
    plaintext.
24. The production-core Hardhat integration test now passes twice consecutively against the released
    Docker-backed Handle Gateway, KMS, ingestor, JetStream, and Runner. Each run uses four weighted
    Merkle-eligible wallets, privacy floor four, six encrypted operations including two replacements,
    a non-canonical value normalized to Abstain, governance quorum seven, one public boolean verdict,
    the real public-decryption proof, and production-core finalization to Passed. The measured runs were
    13.289 seconds and 12.136 seconds end to end; warm proof availability after tally request was 535 ms
    and 431 ms. Submitted input handles remained non-public, no viewer was granted, every persistent
    grant emitted by the core targeted the core itself, and exactly the expected verdict was marked
    publicly decryptable. This proves the Phase 2 production graph under the judged local configuration;
    it uses a test-only host clock/quorum fixture and therefore does not prove the production Safe adapter.
25. The production Safe registration/commitment slice passes 7 focused tests against an official Safe
    1.5.0 singleton/proxy configured with two owners and threshold two; no fake Safe supports the claim.
    Only the Safe can register, registration requires the module to be enabled, and rejected owner/Safe
    calls roll back the module proposal nonce. Proposal IDs bind chain, module, Safe, and module-local
    nonce. Ordered action hashes bind proposal ID, target, value, calldata hash, and order. The same
    action hash is stored in the adapter and linked production core, while the adapter immutably stores
    the absolute quorum. The module also binds the official batch address and construction-time code
    hash. Invalid Safe/batch construction, empty actions, zero targets, and zero quorum reject. The full
    Forge suite passes 56/56; module runtime is 3,613 bytes. Execution, `MultiSendCallOnly` packing,
    replay consumption, retry, and the versioned factory are not implemented by this slice.
26. The production direct single-call Safe execution slice passes 6 focused tests against the same
    official Safe 1.5.0 singleton/proxy and the production module/core. Execution is permissionless but
    requires a known unexecuted proposal, an enabled module, exactly one action, the core's final Passed
    result, and a recomputed action hash identical to registration. It fixes the Safe operation to Call,
    marks the proposal executed before the external Safe call to block reentrancy, reverts and rolls that
    flag back when Safe returns false, permits an exact retry, leaves the Safe owner nonce unchanged, and
    rejects altered target/value/data, multiple actions, replay, disabled-module execution, and
    None/Rejected/Withheld/Canceled results. The full Forge suite passes 62/62; Hardhat compilation,
    TypeScript, production high/medium lint, formatting, and size gates pass. The module is 163 source
    lines and 4,678 runtime bytes. Its Foundry Nox fixture uses the released `NoxCompute` proxy shape with
    a test Gateway signer, so this slice proves contract and official-Safe state transitions but does not
    rerun or independently prove the off-chain Gateway/KMS/JetStream/Runner computation. Multi-action
    `MultiSendCallOnly` execution and the versioned factory remain pending.
27. The production Safe atomic-batch slice passes 5 focused official-Safe tests plus 1 byte-level
    encoding-conformance test. Multiple actions are packed as
    `operation(0) | target | value | dataLength | data`, every operation byte is fixed to Call, and the
    Safe delegates only to the immutable construction-bound official `MultiSendCallOnly` after its
    runtime code hash is revalidated. Ordered value-bearing execution succeeds in the Safe context;
    altered order rejects before any inner call; one failing action rolls back the complete batch and
    permits an exact retry; pre-call consumption blocks batch reentrancy and replay. The full Forge
    suite passes 68/68, all build/TypeScript/format/production-lint gates pass, and the module remains
    182 source lines, 5,523 runtime bytes, and 19,584 initcode bytes. Slither remains unavailable. This
    slice uses the released `NoxCompute` proxy shape with a test Gateway signer and does not rerun the
    Docker-backed off-chain stack. Only the versioned factory remains in Phase 3.
28. The versioned factory slice passes 7 focused tests. The factory publishes contract and rules
    version 1, owns one production IVotes strategy and one production weighted-Merkle strategy, fixes
    one official `MultiSendCallOnly` address, and stores all three construction-time runtime code hashes.
    Safe/module/core pair deployment is permissionless but accepts only bytecode matching the pinned
    `SafeConfidentialVotingModule` creation-code hash; mismatched creation code or drifted strategy/batch
    runtime code rejects before CREATE. Each successful call creates a distinct non-upgradeable module
    whose constructor creates its own host-bound core, then emits the version, every Safe/module/core/
    strategy/batch address, the organization floor, the approved creation-code hash, and every runtime
    code hash. Supplying verified creation code instead of embedding it keeps the shared factory open for
    the later Governor path and reduces factory runtime from the initial embedded 21,259-byte shape to
    2,023 bytes with 5,666-byte initcode. The factory is 139 source lines. The full Forge suite passes
    75/75 and all build, TypeScript, formatting, and production high/medium lint gates pass. Slither
    remains unavailable; the Docker-backed Nox stack was not rerun because factory deployment does not
    change ballot computation. Phase 3 is complete.
29. The first Phase 4 Governor slice passes 8 focused tests and the full 83/83 Forge suite. The
    production `ConfidentialGovernor` composes OpenZeppelin 5.6.1 `Governor`, `GovernorSettings`,
    `GovernorVotes`, `GovernorVotesQuorumFraction`, and `GovernorTimelockControl` around an
    adapter-owned core. One typed immutable construction config keeps the non-IR compiler below its
    constructor stack limit. `proposeConfidential` reproduces OpenZeppelin's restricted-description and
    proposal-threshold checks, creates a normal one- or multi-action proposal, then atomically registers
    its token snapshot/start/deadline and `bytes32(proposalId)` host/action commitment in the core.
    Standard `propose`, all five public plaintext cast routes, both internal `_castVote` overloads, and
    `_countVote` reject; signature rejections do not consume nonces. Failed core registration rolls the
    Governor proposal back. The contract is 16,849 runtime bytes and 33,304 initcode bytes. Hardhat
    compile, TypeScript, and production high/medium lint pass. The global format check remains red only
    on eight untouched historical 2026-07-29 Markdown files; all new Solidity is Forge-formatted.
    Slither remains unavailable, and the Docker-backed Nox stack was not rerun because this slice changes
    only host registration and inherited voting entrypoints. Honest async state projection, synchronized
    cancellation, timelock role configuration/queue/execute coverage, and the factory Governor entrypoint
    remain pending; this contract must not yet be treated as the complete Governor path.
30. The Governor lifecycle/cancellation slice passes 9 focused tests, 17 combined Governor tests, and
    the full 92/92 Forge suite. The production detailed getter now distinguishes Uninitialized,
    Scheduled, Open, Closed, TallyPending, Withheld, Rejected, Passed, Queued, Executed, and Canceled.
    Standard OpenZeppelin state remains Pending for Closed/TallyPending, maps Withheld/Rejected to
    Defeated, and maps Passed to Succeeded; unresolved and terminal non-Passed proposals reject at the
    Governor queue state gate. The inherited standard cancellation entrypoint is disabled.
    `cancelConfidential` uses OpenZeppelin proposer/Pending validation plus the core's Scheduled state,
    permits the exact proposal-snapshot boundary, rejects outsiders and post-open cancellation, then
    cancels Governor and core atomically. The implementation is split into one linear inheritance chain:
    116-line OpenZeppelin framework, 156-line proposal/core adapter, 141-line confidential
    counting/lifecycle layer, and 9-line concrete Governor, keeping every production file below the
    200-line target. Runtime is 18,220 bytes and initcode is 34,722 bytes. Hardhat compile, TypeScript,
    production high/medium lint, scoped formatting, and diff checks pass. Solar's known inability to
    parse Nox's Solidity 0.8.35 `erc7201(...)` builtin requires the concrete Nox lifecycle test/fixture to
    share the existing test-only lint exclusion; both remain compiled and executed. The Foundry lifecycle
    tests use the released NoxCompute proxy shape with a test Gateway signer, not the Docker-backed
    off-chain stack. Slither remains unavailable. Real timelock roles, queue/delay/batch execution,
    timestamp-clock coverage, and the factory Governor entrypoint remain pending.
31. The real Governor-to-Timelock slice passes 6 focused tests, 23 combined Governor tests, and the full
    98/98 Forge suite. A production-shaped deployment fixture constructs the real OpenZeppelin 5.6.1
    `TimelockController` with no initial proposer/executor, deploys the immutable Governor, grants only
    that Governor proposer/canceller authority, opens execution through the zero-address executor role,
    verifies the role boundary, and renounces the temporary setup administrator while preserving
    timelock self-administration. The real Governor path queues finalized Passed single and two-action
    batches, exposes the exact ETA, rejects execution before the one-day delay, and executes
    permissionlessly at the exact ETA. Unauthorized direct scheduling and cancellation reject; a delay
    change rejects direct callers but succeeds when proposed, queued, and executed through governance.
    A timestamp-mode ERC20Votes fixture proves that block-number changes do not advance a timestamp
    proposal, while the inherited ERC-6372 clock drives the same confidential lifecycle and timelock
    execution path. No production bytecode changed: Governor runtime remains 18,220 bytes and initcode
    remains 34,722 bytes. Hardhat compile, TypeScript, production high/medium lint, scoped formatting,
    and diff checks pass. The concrete Nox-backed timelock test joins the established test-only Solar
    exclusion because Solar still cannot parse Nox's Solidity 0.8.35 `erc7201(...)` builtin; Solc and all
    execution tests pass. Node 25 remains outside the declared Node 22-24 engine range, Slither remains
    unavailable, and the Docker-backed Nox stack was not rerun because this slice changes host
    deployment choreography and execution evidence, not confidential computation. The versioned
    factory Governor/timelock deployment and complete code-hash evidence entrypoint is next.
32. The versioned Governor factory slice passes 8 focused Governor-factory tests, all 15 factory tests,
    31 production Governor-plus-factory tests, and the full 106/106 Forge suite. The factory is split
    into an 80-line shared dependency layer, 81-line Safe path, 181-line Governor path, and 10-line
    concrete entrypoint. It pins the exact reviewed Governor and TimelockController creation-code
    hashes, revalidates every shared dependency runtime hash, rejects a zero or non-contract vote token,
    and atomically deploys TimelockController, Governor, and the Governor-owned core with the complete
    immutable settings, quorum, privacy-floor, token, strategy, and timelock binding. It grants only the
    Governor proposer/canceller authority, opens execution through the zero-address executor role,
    verifies timelock self-administration, and renounces and verifies removal of the factory's temporary
    admin. Deployment events bind the complete configuration hash and emit reviewed creation-code and
    deployed runtime-code evidence. Negative tests cover altered Governor/Timelock creation code,
    strategy drift, invalid tokens, role configuration, and atomic constructor-failure rollback without
    consuming the factory CREATE nonce. The factory is 5,731 runtime bytes and 9,424 initcode bytes;
    Hardhat compile, TypeScript, Forge lint/build/tests/size, scoped formatting, and diff checks pass.
    The Docker-backed Nox stack was not rerun because this deployment/evidence slice does not change
    confidential computation. Phase 4 is complete. The user subsequently removed Slither from the
    active project requirements; the Phase 5 combined production invariant suite is next.
33. The first Phase 5 slice adds one explicit stateful handler around production ballot cores, the
    production Safe module, the official Safe 1.5.0 proxy/module path, and the released NoxCompute proxy
    shape with a test Gateway signer. Three invariant properties cover one effective public weight per
    voter, monotonic unique participation, fixed snapshot weight despite later token minting, at most
    two replacements, failed-sequence immutability, no below-floor verdict handle/result, finalize-once,
    exact action-hash/ballot stability, retry-safe execution, and execute-once. The initial RED harness
    run revealed that selector targeting alone still allowed direct calls to every deployed fixture;
    adding the explicit handler target removed those invalid mutation paths. The high-confidence profile
    passes 10,000 runs and 320,000 modeled calls for each property—960,000 calls total—with zero handler
    reverts or discards. The full Forge suite passes 110/110; Hardhat compile, TypeScript, Forge
    high/medium lint, production size checks, scoped formatting, and diff checks pass. No production
    bytecode changed. The Docker-backed off-chain Nox stack was not rerun because this slice adds local
    stateful verification rather than confidential-computation behavior. The then-next
    cross-proposal/cross-host/cross-chain proof-negative matrix is resolved in fact 34.
34. The second Phase 5 slice adds five focused production proof-negative tests against the released
    `NoxCompute` proxy shape with a test Gateway signer. The matrix covers short, mutated, wrong-signer,
    wrong-version, wrong-verifying-contract, wrong-handle, malformed-length, and noncanonical-boolean
    verdict evidence; unchanged TallyPending state after every rejection; identical-input
    cross-proposal isolation; same-handle, separately app-signed cross-host isolation; foreign-chain
    verdict evidence; and foreign-host/foreign-chain input proofs without public receipt mutation. The
    initial adversarial RED case proved that reusing every valid encrypted input across two same-core
    proposals could produce the same deterministic expected verdict handle. `ConfidentialTallyNox`
    now derives an encrypted zero from total participation, multiplies it by the public `ballotId`, and
    adds it back before quorum comparison. This preserves the plaintext tally while binding all
    downstream handles to the already chain/core/host/proposal/config-separated ballot ID. Factory Safe
    and Governor creation-code pins were updated to the resulting reviewed bytecode. Five focused tests,
    the clean 115/115 Forge suite, Hardhat and Forge builds, TypeScript, high/medium Forge lint,
    formatting, production size checks, and diff checks pass. The high-confidence invariant profile
    also passes again at 10,000 runs and 320,000 calls per property with zero handler reverts or
    discards. `ConfidentialBallotCore` is 12,908 runtime bytes; `SafeConfidentialVotingModule` is 5,523;
    `ConfidentialGovernor` is 18,220; and `ConfidentialGovernanceFactory` is 5,731. The changed graph's
    required released Docker-backed Nox integration was attempted on 2026-07-31, but the plugin could
    not connect to the Docker daemon and stopped before any contract path ran; cleanup completed. The
    latest audited Phase 2 real-stack passes remain historical evidence, not proof of this graph change.
    Do not call this Phase 5 slice integration-complete until the real-stack rerun passes.

## External Gates And Unclaimed Scale

1. Larger electorates remain an unclaimed scale dimension until separately benchmarked; the judged
   contract configuration is four eligible wallets and floor four.
2. Live Ethereum Sepolia gas, latency, failure, addresses, deployment, and funded account use require
   same-day verification and explicit authorization.
3. Visual direction and frontend planning remain pending the external designer's return, audit, and
   user acceptance.
