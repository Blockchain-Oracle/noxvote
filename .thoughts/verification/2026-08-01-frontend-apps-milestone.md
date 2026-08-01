# Verification: NoxVote Frontend Milestone — Landing + App + Docs

Date: 2026-08-01 · Branch: `frontend/noxvote-apps` · Head: `bc15733`
Skill: `/abu-harness:verify` · Spec: `SPEC.md`

## Verdict: **Conditional pass**

All three surfaces are built inside the accepted ORBIT direction; the 16-screen
`apps/app` is complete, wired to the live Sepolia Phase 6 deployment, and every
read/verification/honest-state surface is proven in a browser against real
on-chain data with zero console errors. The contract toolchain is untouched
(`forge test` 119/119, integration 11/11).

**Named condition:** the full four-wallet *write*-drive through the browser
(AC1's "four wallets cast, one replaces, close, tally, finalize, execute") was
**not** performed this session. The two live Sepolia ballots are already
finalized and executed (they cannot be re-voted), and casting or authoring
fresh writes requires funded Sepolia wallets holding the voters' keys — a
real-funds action gated to Abu. The write path is therefore verified **by
construction** (see AC1) rather than by a fresh live drive.

## 1. Review (correctness) — PASS

`abu-harness:reviewer` in a fresh context over the whole `apps/app/src` tree
against `SPEC.md`, the contract enums/interfaces, and the canonical
`test/integration/production-confidential-ballot.test.ts`. Verdict **PASS**, no
triggerable defect. Independently re-confirmed here:

- `DetailedState` (0 Uninitialized … 8 Canceled) and `Result` (0 None … 4
  Canceled) in `apps/app/src/state/chain.ts` match
  `src/contracts/types/ConfidentialGovernanceTypes.sol` exactly.
- The Governor's **distinct** `ConfidentialProposalState` (…Passed=7, Queued=8,
  Executed=9, Canceled=10 in `GovernorGovernanceTypes.sol`) is read correctly:
  `apps/app/src/hooks/useHostExecuted.ts` uses `GOVERNOR_EXECUTED = 9`, and the
  core's `detailedState` stays at Passed while the host moves to Queued/Executed.
- Vote encoding `{against:0, for:1, abstain:65535}` uint16, first-cast
  `sequence=1n`, replacement `prev+1` with empty proof, and the
  `(uint256 weight, bytes32[] siblings)` eligibility proof match the integration
  test line-for-line (`apps/app/src/write/castVote.ts`, `apps/app/src/lib/eligibility.ts`).
- Cast retry never re-submits a spent sequence: a reverted receipt clears the
  tx checkpoint (re-simulate + re-submit the never-spent sequence); a
  confirmed-but-no-`VoteRecorded` result and a timeout keep the checkpoint and
  only re-poll (`apps/app/src/write/castVote.ts`).
- `hostProposalId = bytes32(proposalId)` round-trips: `BigInt(record.hostProposalId)`
  recovers the exact uint256 (`apps/app/src/hooks/useExecution.ts`).
- `deployments/sepolia/phase6-live.json` field mapping in
  `apps/app/src/config/addresses.ts` is correct; `governorProof.proposalId` is a
  quoted string so `BigInt()` parses it losslessly (no float trap).

One tightening applied (out of correctness scope, no wrong output): `draftToArgs`
now trims to match `validateDraft` (`apps/app/src/state/proposalForm.ts`).

## 2. Simplify — PASS

`abu-harness:simplifier` in a fresh context. Removed ~175 lines of code the
screen build left dead: the unused `proposalDetailState` projection + its types
(the detail route composes from hooks; `VoterStanding` kept), the unused
`verification.ts` helpers (`Provenance` kept), two ABIs no screen reads
(governance factory, merkle strategy), the `HandleClient`/`BallotStageName`
types, a dead CSS rule, and `scanFromBlock`'s superfluous export. Kept as
spec-mandated: `FixtureBanner` (R8), `tallyFailed`/`executionFailed` labels
(surface map). All three apps still build green (`bc15733`).

## 3. Traceability

### Requirements → code

| Req | Where | Evidence |
| --- | --- | --- |
| R1 workspace + contract toolchain unchanged | `pnpm-workspace.yaml`, root `package.json` | `forge test` 119/119 and integration 11/11 below; `pnpm install` clean |
| R2 DESIGN.md + sample screen | `DESIGN.md` (+ 2026-08-01 danger/title/passed-chip addenda) | accepted pass 1; per-batch design-auditor |
| R3 landing rebuilt from ORBIT artifact | `apps/landing/**` | built green; accepted at the landing+docs checkpoint |
| R4 sixteen app screens | `apps/app/src/routes/*`, `components/{detail,vote,verify,install,create}/*`, `components/{GuaranteeOverlay,LifecycleChip}.tsx` | all 16 mapped below; live renders in `.screenshots/b1..b6-*.png` |
| R5 docs site | `apps/docs/**` | built green (fumadocs + llms.txt) |
| R6 single chain-config module | `apps/app/src/config/addresses.ts` (parses `phase6-live.json`) | grep: zero hardcoded contract addresses in components |
| R7 copy laws verbatim | `apps/app/src/lib/copy.ts` | AC2 grep below |
| R8 honest states, labeled fixtures | `QueryBoundary.tsx` (`FixtureBanner`), state selectors | grep: no fixture ships a wired path; no fabricated progress |
| R9 design-auditor per batch | 6 audits (B1-B6) | all findings fixed before the next batch |

Screen map (R4): S1 `Install.tsx`+`Boundaries.tsx` · S2 `Safe/GovernorHostCard.tsx`
· S3 `state/install.ts`+`SafeHostCard` · S4 `ProposalEditor.tsx` · S5
`ConfigPanel.tsx`+`proposalForm.ts` · S6 `PublishReview.tsx`+`write/propose.ts` ·
S7 `ProposalDetail.tsx`+`detail/*` · S8 `VoteDrawer.tsx`+`state/voteDrawer.ts` ·
S9 `ProgressOverlay.tsx`+`write/castVote.ts` · S10 `ReceiptPanel.tsx`+`state/receipt.ts`
· S11 `ChangeVoteConfirm.tsx` · S12 `VerificationCenter.tsx`+`verify/*` · S13
`TallyPanel/TallyFlow.tsx`+`state/tally.ts` · S14 `ExecutionPanel.tsx`+`state/execution.ts`
· S15 `ProposalList.tsx` · S16 `GuaranteeOverlay.tsx`+`lib/trust.ts`.

### Integrations (SPEC table) → what shipped

| Row | Class | Shipped |
| --- | --- | --- |
| Sepolia factory/core/Safe/Governor via `phase6-live.json` | REAL_MVP | `config/addresses.ts` parses it; list/detail/verify/install/create all read the live contracts (renders in `.screenshots/`) |
| Injected wallet (EIP-1193) | REAL_MVP | `config/wagmi.ts` injected connector; real `writeContract`/`simulateContract` |
| Nox Handle SDK encryption | REAL_MVP | `lib/handle.ts` reproduces the integration test's `createViemHandleClient`; SDK pinned `0.1.0-beta.13` |
| Local Docker Nox + Hardhat | REAL_MVP | integration 11/11 below; `config/addresses.ts` local profile |
| Design-time fixtures | SIMULATED_DEMO_ONLY | `FixtureBanner` exists, used by nothing — no fixture ships |
| Hosting/DNS | BLOCKED | untouched (separate agent) |
| Brand constant | REAL_MVP | `@noxvote/ui` `BRAND` |

### Acceptance criteria → evidence

- **AC1 (demo story, honest states, no console errors) — Conditional.** All 16
  screens driven in-browser against **live Sepolia** with **zero console
  errors** (`.screenshots/b1..b6`): the list discovers both real Phase 6
  ballots via `BallotRegistered` logs with real floor counts and Executed
  chips; detail shows real quorum/weight/sealed-result/Passed outcome;
  verification center renders all 8 evidence sections with real ACL checks
  (verdict handle publicly decryptable, inputs core-only) and real execution;
  install reads real Safe (Verified, real threshold) + Governor (Compatible,
  v1); create drives editor→config(live Governor settings)→publish with the
  acknowledgement + wallet gates enforced. The **write** cycle is proven **by
  construction**: the reviewer confirmed `castVote`/`requestTally`/`finalize`/
  `execute`/`proposeConfidential` reproduce the integration test's wiring
  line-for-line, all simulate-first; and that exact flow passes end-to-end
  below. Not performed: a fresh 4-wallet browser cast→execute drive (real-funds,
  gated to Abu).
- **AC2 (no banned vocabulary / totals / plaintext / running tally) — PASS.**
  Grep across `apps/*/src`: banned terms appear **only** in "Not promised" /
  limits contexts (required denials, per the map's Trust summary); "running
  tally" and fabricated-percentage patterns: none. Required verbatim strings
  ("Result withheld", "Exact totals are not disclosed", "…your choice is
  private", "status, not your plaintext choice") all present.
- **AC3 (design-auditor per batch) — PASS.** Six audits (B1-B6); every BLOCKER/
  FIX resolved before the next batch (danger-token law, accent scarcity,
  contrast, copy verbatim, required states). No unresolved finding at close.
- **AC4 (fresh clone builds; contracts still pass) — PASS.** `pnpm install`
  clean; `pnpm -r --filter "./apps/*" build` → all three apps build+typecheck;
  `forge test` → **119 passed, 0 failed** (output below).
- **AC5 (landing + docs read as the same product) — Conditional (Abu's call).**
  All three surfaces share `@noxvote/ui` tokens/fonts/primitives and the ORBIT
  system; landing accepted at the prior checkpoint. Final same-product judgment
  is Abu's subjective review.

### SPEC end-to-end command — output

```
$ pnpm install && pnpm -r --filter "./apps/*" build && forge test
pnpm install → Done
apps/landing build: Done
apps/docs build: Done
apps/app build: Done
forge test → Ran 22 test suites: 119 tests passed, 0 failed, 0 skipped (119 total)

$ pnpm test:integration        # Docker Nox stack, full confidential flow
11 passing (26897ms)
  ✔ resolves the four-wallet floor-four graph through the released Nox stack (720ms)
  ✔ imports a real Handle Gateway uint16 proof without putting the choice in calldata
  ✔ factory-deploys the real Timelock stack and executes a real-Nox verdict end to end (848ms)
  ✔ factory-deploys the official-Safe module and executes real-Nox direct and batch verdicts (1111ms)
  ✔ withholds a below-floor proposal without creating a public verdict
  ✔ resolves the same queued verdict after the real Runner is stopped and restarted (4380ms)
  ✔ rejects the complete public-verdict proof matrix without mutating either proposal (611ms)
  ✔ redelivers a negatively acknowledged JetStream tally message deterministically (6802ms)
  … (11/11)
```

This is the end-to-end proof of the exact contract flow the frontend write
orchestrators reproduce (encrypt → cast → replacement → close → requestTally →
publicDecrypt → finalize → execute).

## Known risks / open items

- The demo's read surfaces depend on an archive-capable `eth_getLogs` RPC. Free
  managed tiers reject the historical range (Alchemy free caps getLogs at 10
  blocks; publicnode refuses archive; thirdweb — viem's default — flakily
  CORS-blocks). Transport is now drpc primary + tenderly fallback (keyless,
  archive, CORS), topic-filtered, with a `VITE_SEPOLIA_RPC_URL` override for a
  paid endpoint. Set the override for production reliability.
- AC1's live write-drive and AC5's same-product judgment are the two items only
  Abu can close (real funds; taste).
- Local-stack profile needs `deployments/local.json` or `VITE_LOCAL_*` from a
  running Docker Nox stack; absent that, the app shows the honest unconfigured
  state.

## Artifacts (links, not copies)

- Spec: `SPEC.md` · Design: `DESIGN.md`
- Surface map: `.thoughts/design/2026-07-29-product-surface-map.md`
- Live renders: `.screenshots/b1..b6-*.png`
- Checkpoint consumed: `deployments/sepolia/phase6-live.json`
- Build commits: `aa30a52..bc15733` on `frontend/noxvote-apps`
