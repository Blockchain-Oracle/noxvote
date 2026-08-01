# Phase 6 Ethereum Sepolia Live Verification

## Verdict

**PASS.** The authorized production contract graph was deployed to Ethereum Sepolia and completed
both judged four-wallet/floor-four paths through the released Nox infrastructure. The Safe path
finalized a real Passed verdict and executed its exact action once. The compatible Governor path
finalized a real Passed verdict, queued through its factory-deployed `TimelockController`, observed
the configured delay, and executed its exact action once.

The public resumable checkpoint is
[`deployments/sepolia/phase6-live.json`](../../deployments/sepolia/phase6-live.json). It contains no
private key or secret material.

## Run Identity

- Chain: Ethereum Sepolia, chain ID `11155111`
- Deployer: `0x489C96d802edB3aF3675f6Fa0817b35159EEE851`
- Checkpoint status: `complete`
- Started: `2026-08-01T11:29:57.995Z`
- Completed: `2026-08-01T12:10:07.643Z`
- First/last confirmed blocks: `11396112` / `11396305`
- Confirmed transactions: `37/37` successful; zero reverted receipts
- Runner commits: `6fdacd5` (reviewed runner), `651f0a4` (measured funding calibration), `e80cbed`
  (Safe registration/resume correction)

## Deployed Addresses

| Component                        | Address                                      |
| -------------------------------- | -------------------------------------------- |
| Production factory               | `0x3d1c0ff97a603ca5edadc7737c0bb6d4d4fd1675` |
| Official Safe proxy              | `0xF15f852D0669cac06c3e00E7b5E701A5Dd93a31f` |
| Safe confidential module         | `0x2EEf405eBe209eA4261Bc77e665e535C29feC162` |
| Safe confidential core           | `0xB4B732bc35687322727ff9fba261fe5eE15f4b33` |
| IVotes snapshot strategy         | `0x1663283ffdf37656ADF7576B57561444c4Dc3398` |
| Merkle weighted strategy         | `0x4dAA040D91fCCe1b7105dFb500210621BC7425c6` |
| Phase 6 votes token              | `0xbeb6c66d19e329daf4f82cb71156867d054da5a5` |
| Compatible confidential Governor | `0x061C799DC284b0Cd0501b442b8a4e262c31Ac12d` |
| Governor `TimelockController`    | `0x66F0a59bA4d5f6C1E3ee4251E77D41Ce97A9Dc3b` |
| Governor confidential core       | `0x2Be76a5ab935DB855aa8E1386847d9182064147d` |
| Safe exact-action target         | `0xff4e5ce5610bbbd1982c0f0a44bd16fcb257b158` |
| Governor exact-action target     | `0x84bf42da8517994923b05a084b85ff4b99fb06f8` |

The live runner reverified the official Nox proxy/implementation, Gateway signer, one-hour proof
lifetime, Handle Gateway, current subgraph, and official Safe 1.5.0 singleton/proxy factory/
`MultiSendCallOnly`/fallback handler before broadcasting. It also reverified the exact reviewed local
factory, Safe module, Governor, and Timelock creation-code hashes.

## Exact Proof Results

### Safe

- Ballot: `0x53f1f629337e55f2e286825ce8371598487f8c96ab78be227758827e945bb29a`
- Verdict handle: `0x0000aa36a70001abec41e89c3f40bab57abde6f690a522781310f34089662652`
- Four unique voter receipts recorded; individual input handles remained non-public.
- Core result: `Passed` (`3`); detailed state: `Finalized` (`7`).
- Verdict handle is publicly decryptable after tally; exact totals remain undisclosed.
- Official Safe reports the production module enabled.
- Target value/calls: `41` / `1`.

### Governor And Timelock

- Proposal ID:
  `87161134043484488476303952220190058599048259578979794098525347993149698358624`
- Ballot: `0x1979b9a202a6a8e0a29f941da84aa106754c769553638532b7f2a43f4e503022`
- Verdict handle: `0x0000aa36a70001c865edb1cb3faa33d4980d7ce3b2099b76977f23194e28fca8`
- Snapshot/deadline: blocks `11396235` / `11396295`.
- Four unique voter receipts recorded; individual input handles remained non-public.
- Core result: `Passed` (`3`); detailed state: `Finalized` (`7`).
- Governor final state: `Executed` (`7`).
- Target value/calls: `77` / `1` after the real Timelock delay.

## Independent Post-Run Readback

A separate read-only RPC pass after runner completion verified:

- all `37` checkpoint hashes have successful receipts;
- all `12` checkpointed component addresses contain runtime code;
- the Safe module remains enabled;
- both core results and detailed states are Passed/Finalized;
- both verdict handles are publicly decryptable;
- the Governor is Executed; and
- both execution targets were called exactly once with their committed values.

Post-run local regression checks also pass: Forge `119/119`, TypeScript, Solidity formatting, and
edited-file formatting/diff checks.

Selected independently observed runtime code hashes:

| Component     | Runtime code hash                                                    |
| ------------- | -------------------------------------------------------------------- |
| Factory       | `0xafc84b1519b23ff2540571fe5a346dea52d9937fb01aad3d5176c42757161324` |
| Safe module   | `0x72a40f155da17ba9161fa188a33701c8f5efe032286dc6aef45cd330104408c1` |
| Safe core     | `0x2caf9ab6d383997b0b5796c70a3d02b9a46ee5e7ff67b42cc03ccb560d205e76` |
| Governor      | `0xe968cedc7840484e8c94ad55ce3275dbf2a0dbf766c672d0a79e2dca3b903e63` |
| Timelock      | `0xeaeb349c5f983f6acf1bc2b165010356d4b9335e4cb095f5b69fc5d3cf58e451` |
| Governor core | `0x1b35ac37ce505a148a93fa5bad500480aced64b6ceaf89ff51b70a79458bcae4` |

## Gas And Funding Evidence

- Total gas across all actors: `24,934,037`.
- Total gas cost across all actors: `0.026998384736126343` Sepolia ETH.
- Deployer gas cost: `0.021254397407534394` Sepolia ETH.
- Voter prefunding transferred: `0.012` Sepolia ETH total.
- Deployer starting/final balance: `0.05` / `0.016745602592465606` Sepolia ETH.

This validates the user's decision that a quarter-ETH testnet reserve was unnecessary for this exact
graph. The measured `0.045` initial gate retained enough headroom and the run completed without a
funding failure.

## Live Runner Finding And Recovery

The first live attempt exposed one runner-only Safe wiring defect missed by the pre-deployment and
focused Opus reviews. The call encoded `Safe.enableModule(module)` but targeted the module contract.
RPC simulation reverted before broadcast, so there is no failed receipt. The production Safe test
fixture already contained the correct self-targeted operation. Commit `e80cbed` corrected the target
and made the funding gate checkpoint-aware by subtracting confirmed deployer gas and existing voter
balances on resume. The resumed run reused all seven prior confirmed hashes, enabled the module, and
completed normally.

Production Solidity source and bytecode were unchanged by either runner correction.

## Remaining Gates

- The five-job contract CI workflow is installed but has not yet been observed on a remote runner.
- Larger electorates remain unbenchmarked and unclaimed.
- Frontend implementation/verification, billable production infrastructure, public publishing,
  domain registration, and hackathon submission remain separate gates.
