<p align="center">
  <img src="https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/brand/noxvote-mark.png" width="112" alt="NoxVote orbit mark" />
</p>

<h1 align="center">NoxVote</h1>

<p align="center"><strong>Where private DAO lives.</strong></p>

<p align="center">
  Confidential governance for existing Safe and Governor stacks, powered by iExec Nox.
</p>

<p align="center">
  <a href="#demo-video">Demo video</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#live-proof">Live proof</a> ·
  <a href="#run-locally">Run locally</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/launch/readme-hero.png" width="960" alt="NoxVote — Where private DAO lives" />
</p>

## The privacy destination for DAO decisions

Every DAO operates in public. Not every decision should.

NoxVote gives sensitive governance decisions somewhere private to happen without asking the DAO to
move. Safe keeps its treasury. Governor keeps its rules and Timelock. Proposals, voting power,
participation, the final verdict, and execution remain public. Individual choices and exact totals do
not.

[iExec Nox](https://github.com/iExec-Nox/documentation) is confidential infrastructure built on
Trusted Execution Environments. NoxVote turns that confidential compute into a complete governance
path: encrypted ballot operations go in, one outcome-only verdict comes back, and only the exact
action committed before voting opened can execute.

> **The positioning:** Nox is the privacy destination. NoxVote is where private DAO lives.

## Demo video

<p align="center">
  <a href="https://vimeo.com/1214870008">
    <img src="https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/launch/demo-thumbnail.jpg" width="720" alt="Watch the NoxVote 60-second demo" />
  </a>
</p>

<p align="center">
  <a href="https://vimeo.com/1214870008"><b>▶ Watch the 60-second demo</b></a>
</p>

The film uses the real NoxVote product surfaces and the completed Sepolia proof — the same live
checkpoint documented under [Live proof](#live-proof).

## What NoxVote changes

Traditional on-chain voting can expose a running leader and permanently attach a wallet to a choice.
That is the wrong social environment for a sensitive treasury, contributor, security, or strategy
decision.

NoxVote separates public accountability from public choice disclosure:

| Public and verifiable                           | Confidential or deliberately withheld        |
| ----------------------------------------------- | -------------------------------------------- |
| Proposal, rules, choices, and action commitment | Each member's choice                         |
| Wallet eligibility and voting-power snapshot    | The running leader                           |
| Wallet participation and replacement sequence   | Exact `For / Against / Abstain` totals       |
| Privacy-floor progress                          | Any result below the privacy floor           |
| Final `Passed` or `Rejected` verdict            | Encrypted tally intermediates                |
| Safe or Governor execution                      | Anything beyond the verdict governance needs |

Participation is public; voters are not anonymous. The released iExec SDK sends the encoded choice to
the attested Handle Gateway for encryption, so the Gateway is an explicit trust boundary. NoxVote does
not claim browser-only encryption, zero knowledge, FHE, or MACI-equivalent receipt-freeness.

## How it works

1. **Commit the decision.** A Safe or compatible Governor registers the proposal, ballot rules,
   voting-power strategy, privacy floor, and exact action commitment before voting opens.
2. **Prepare a confidential ballot.** The released Nox flow sends the member's encoded choice to the
   attested Handle Gateway and returns an encrypted handle plus proof.
3. **Record public participation.** The wallet submits the opaque ballot operation on-chain. Its
   participation and sequence are visible; its choice is not intentionally published.
4. **Replace safely before close.** A member may record up to two replacements. Only the latest
   accepted operation counts, and replacement does not inflate the unique-participant total.
5. **Enforce the privacy floor.** Below the configured minimum turnout, no aggregate outcome is
   disclosed. Abstain counts toward participation; stale, rejected, and reverted operations do not.
6. **Derive one verdict in Nox.** After close, Nox tallies the encrypted handles and releases only
   `Passed` or `Rejected`—never individual choices or exact totals.
7. **Execute the committed action once.** A Passed verdict can authorize only the pre-committed Safe
   call or the standard Governor → Timelock path.

![NoxVote product topology](https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/architecture/product-topology.png)

![NoxVote ballot lifecycle](https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/architecture/ballot-lifecycle.png)

## Two governance paths, one confidentiality model

### Safe

The factory deploys a Safe, its confidential-voting core, and the reviewed Safe module as one
immutable pair. A Passed verdict authorizes either one exact direct call or an official
`MultiSendCallOnly` batch. The module revalidates the committed bundle and runtime code hash, rejects
delegate calls, preserves atomic retry on failure, and executes once.

[View the Safe execution diagram](https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/architecture/safe-execution.png)

### Governor + Timelock

The compatible Governor preserves normal OpenZeppelin-style governance semantics: proposal binding,
queueing, delay, permissionless execution, and governance-controlled Timelock changes. It blocks every
plaintext vote path. An unresolved or non-Passed confidential outcome cannot queue, and the exact
committed proposal can execute only after the Timelock delay.

[View the Governor and Timelock diagram](https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/architecture/governor-timelock.png)

## Live proof

NoxVote's production graph completed its public Ethereum Sepolia checkpoint on **2026-08-01**:

- **37 / 37** deployment and execution transactions succeeded;
- the Safe and Governor paths each consumed a real released-Nox `Passed` verdict;
- both exact committed targets executed once;
- the full Forge suite passed **119 / 119** tests after the live run;
- three consecutive released-stack integration runs passed **33 / 33** cases in total.

| Public contract         | Sepolia                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Versioned factory       | [`0x3d1c…1675`](https://sepolia.etherscan.io/address/0x3d1c0ff97a603ca5edadc7737c0bb6d4d4fd1675) |
| Production Safe         | [`0xF15f…a31f`](https://sepolia.etherscan.io/address/0xF15f852D0669cac06c3e00E7b5E701A5Dd93a31f) |
| Safe module             | [`0x2EEf…C162`](https://sepolia.etherscan.io/address/0x2EEf405eBe209eA4261Bc77e665e535C29feC162) |
| Compatible Governor     | [`0x061C…c12d`](https://sepolia.etherscan.io/address/0x061C799DC284b0Cd0501b442b8a4e262c31Ac12d) |
| Real TimelockController | [`0x66F0…Dc3b`](https://sepolia.etherscan.io/address/0x66F0a59bA4d5f6C1E3ee4251E77D41Ce97A9Dc3b) |

Read the [live verification report](.thoughts/verification/2026-08-01-phase6-sepolia-live-verification.md)
or inspect the [machine-readable checkpoint](deployments/sepolia/phase6-live.json).

![NoxVote trust and evidence boundary](https://raw.githubusercontent.com/Blockchain-Oracle/noxlimit/main/assets/architecture/trust-evidence-boundary.png)

## Run locally

### Requirements

- Node.js `24.x`
- pnpm `10.33.0`
- Foundry
- Docker, for the released Nox integration stack

### Install and open the product

```bash
pnpm install
pnpm apps:dev
```

The landing page opens on `http://localhost:5178`. In separate terminals:

```bash
pnpm app:dev
pnpm docs:dev
```

### Verify the implementation

```bash
pnpm apps:build
pnpm test:forge
pnpm test:integration
```

`test:integration` boots the released Gateway, KMS, JetStream, and Runner stack in Docker. It is the
real local Nox path—not a mock supporting the product claim.

## Repository map

| Path                                         | Purpose                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| [`apps/landing`](apps/landing)               | Public ORBIT launch page                                                       |
| [`apps/app`](apps/app)                       | Proposal, ballot, receipt, tally, execution, and verification product          |
| [`apps/docs`](apps/docs)                     | Product and trust-boundary documentation                                       |
| [`src/contracts`](src/contracts)             | Production confidential core, Safe module, Governor, strategies, and factories |
| [`test/foundry`](test/foundry)               | Unit, negative-proof, integration-model, gas, and invariant suites             |
| [`test/integration`](test/integration)       | Released Nox Docker-stack integration harness                                  |
| [`assets/architecture`](assets/architecture) | Editable Mermaid sources and rendered architecture diagrams                    |
| [`assets/brand`](assets/brand)               | ORBIT identity source and review board                                         |
| [`assets/launch`](assets/launch)             | README hero, demo thumbnail, social card, and their deterministic HTML sources |

## Privacy and security boundaries

- **Confidentiality, not anonymity.** Wallet address and participation remain public.
- **TEE compute, not ZK or FHE.** Nox performs confidential computation inside its released TEE
  stack.
- **Gateway trust is explicit.** The attested Handle Gateway receives the plaintext encoded choice
  during encryption.
- **Replacement is recovery, not receipt-freeness.** It offers a public chance to change a vote; it
  does not recreate MACI's coercion resistance.
- **The privacy floor matters.** Low-turnout results remain withheld because a small aggregate can
  reveal individual choices.
- **Handle access is durable.** Revoking an ACL does not erase knowledge already granted.
- **Key custody is not threshold custody.** The current single-node Nox KMS is not presented as having
  threshold-Keyper compromise resistance.

NoxVote is a focused answer to one question: **where should a DAO's private decisions live?**

**On Nox—while the DAO itself stays exactly where it is.**
