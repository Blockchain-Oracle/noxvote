# Verification: Frontend Milestone Checkpoint — Landing + Docs + UI Package

- **Date**: 2026-08-01
- **Branch**: `frontend/noxvote-apps`, commits `bb69bb8..caf3d78` on top of `3bc189a` (+ this pass's fixes)
- **Scope**: Honest **partial** checkpoint. `apps/landing`, `apps/docs`, `packages/ui`, and the pnpm
  workspace conversion are delivered; `apps/app` (SPEC R4, 16 screens) and the R6 chain-config module
  are **intentionally not built yet**. This report closes the landing+docs batch and returns the cycle
  to build for the remaining scope (per Abu's 2026-08-01 direction and approved plan).

## Verdict: Conditional pass

- **Pass** for everything this checkpoint delivers (R1, R2 provisional, R3, R5, R7, R8 on built surfaces).
- **Named conditions**: (1) `apps/app` + R6 config module unbuilt — the milestone's remaining scope;
  (2) DESIGN.md sample-screen acceptance is provisional pass 1 — Abu's detailed review lands with the
  first demo-critical app screens; (3) AC1/AC3/AC5 not exercisable until (1)/(2) close.

## 1. Review (reviewer subagent, fresh context)

**PASS — zero correctness defects** on `git diff 3bc189a..HEAD`. Verified: R7 grep-clean (banned terms
appear only as required denials), R3 token fidelity (tokens.css verbatim vs ORBIT record, no divergent
palette, real self-hosted webfonts), React/SSR safety (orbit timers cleaned, `useOnceVisible`
StrictMode-safe, mermaid effect guarded, docs prerender + serve consistent), R1 (contract scripts
byte-identical to `3bc189a`; no contract file touched).

Non-blocking observations, both fixed in this pass:
- `pnpm-workspace.yaml` used undocumented `allowBuilds:` key → replaced with documented
  `onlyBuiltDependencies: [esbuild]` (fresh-clone AC4 safety).
- `record.tsx` stagger timers lack cleanup (asymmetric with `orbit.tsx`) → scheduled as cleanup fix #1
  in the approved plan (shared stagger hook), landing immediately after this checkpoint.

## 2. Simplify (simplifier subagent, fresh context)

7 files, −24 net lines, builds stayed green: dead `DOMAIN` constant; dead barrel re-exports
(`packages/ui/src/index.ts`); unreachable `outline` pill variant + its CSS; dead `.link` CSS; speculative
`components` parameter in docs `getMDXComponents`. Kept-but-suspicious (deliberate): docs `isbot` /
`@react-router/node` deps (removal not build-verifiable), `useMDXComponents` fumadocs idiom, vite
`dedupe`/`allowedHosts` (real monorepo/deploy config).

## 3. Traceability

| Requirement | Implementation | Status |
|---|---|---|
| R1 workspace conversion, toolchain intact | `pnpm-workspace.yaml`, root `package.json` (additive `apps:*` only) | **Pass** — evidence below |
| R2 DESIGN.md + sample screen | `DESIGN.md`; hero+constellation+record accepted pass 1 (2026-08-01) | **Provisional** (Abu's detailed review pending by his decision) |
| R3 landing from ORBIT artifact | `apps/landing/src/sections/*` composing `packages/ui` | **Pass** (reviewer token-fidelity check) |
| R4 sixteen app screens | — | **Not built** (remaining scope) |
| R5 docs site | `apps/docs` (react-router 8 + fumadocs, 11 MDX pages, llms.txt) | **Pass** |
| R6 chain-config module | — | **Not built** (remaining scope; `phase6-live.json` arrives via merge) |
| R7 copy laws | grep evidence below | **Pass** |
| R8 honest states | labeled fixtures `orbit-band.tsx:33`, `rules.tsx:38`, `footer.tsx:61`; addresses page marks all NoxVote addresses "pending" | **Pass** on built surfaces |
| R9 design-auditor per batch | applies to app screen batches | **Pending** (starts with batch B1) |

### Evidence (actual output, this machine, 2026-08-01)

`pnpm install` → `Done in 761ms using pnpm v10.33.0` (lockfile up to date, 4 workspace projects).

`pnpm -r --filter "./apps/*" build` → landing + docs green; docs prerendered all pages, ends:
```
apps/docs build: llms.txt: 11 pages indexed
apps/docs build: Done
```

`forge test` (R1/AC4 proof — workspace change broke nothing):
```
Ran 22 test suites in 33.95s (69.14s CPU time): 119 tests passed, 0 failed, 0 skipped (119 total tests)
```

AC2 copy-law grep (`grep -rniE "anonymous|receipt-free|client-side encryption|running tally"` over
landing src, docs content, ui src) — all 4 hits are the required denial lists, zero claims:
```
apps/landing/src/sections/limits.tsx:5:    term: 'Client-side encryption',
apps/landing/src/sections/limits.tsx:13:    term: 'Receipt-freeness',
apps/docs/content/docs/limits.mdx:11:- **Client-side encryption.** …
apps/docs/content/docs/limits.mdx:16:- **Receipt-freeness.** …
```

### Acceptance criteria

- **AC1** (4-wallet demo through `apps/app`): not exercisable — surface unbuilt. Remaining scope.
- **AC2** (no banned vocab/tallies): **Pass** — grep output above.
- **AC3** (design-auditor clean per batch): pending — batches start with B1.
- **AC4** (fresh-ish build + forge green): **Pass for the two built apps** — outputs above.
- **AC5** (landing/docs at app's bar): judged at Abu's detailed review (his chosen timing).

### Integrations

| Surface | Classification | Shipped state |
|---|---|---|
| Sepolia addresses via `phase6-live.json` | REAL_MVP | File exists on contract branch (Phase 6 complete); merge is the next step; docs addresses page honestly says "pending" |
| Injected wallet / Handle SDK / local stack | REAL_MVP | Unbuilt with `apps/app` (remaining scope) |
| Design-time fixtures | SIMULATED_DEMO_ONLY | Visibly labeled on landing (3 sites) |
| Hosting/DNS | BLOCKED | Untouched, as required |
| Brand constant | REAL_MVP | `BRAND` in `packages/ui/src/brand.ts` |

## Next authorized work (per approved plan)

Merge `codex/confidential-voting-research` (Phase 6 evidence) → frontend cleanup fixes → build
`apps/app` foundation and screen batches B1–B6 with design-auditor per batch → full SPEC verification.
