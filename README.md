<p align="center">
  <img src="https://raw.githubusercontent.com/Blockchain-Oracle/noxvote/main/assets/brand/noxvote-mark.png" width="112" alt="NoxVote orbit mark" />
</p>

<h1 align="center">NoxVote</h1>

<p align="center"><strong>Where private DAO lives.</strong></p>

<p align="center">
  Confidential governance for existing Safe and OpenZeppelin Governor stacks, powered by iExec Nox.
</p>

<p align="center">
  <a href="https://app.noxvote.xyz"><b>▶&nbsp; Launch the app</b></a>
  &nbsp;·&nbsp;
  <a href="https://docs.noxvote.xyz"><b>Documentation</b></a>
  &nbsp;·&nbsp;
  <a href="https://vimeo.com/1214870008"><b>Demo video</b></a>
  &nbsp;·&nbsp;
  <a href="https://noxvote.xyz"><b>noxvote.xyz</b></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Blockchain-Oracle/noxvote/main/assets/launch/readme-hero.png" width="960" alt="NoxVote — Where private DAO lives" />
</p>

## What is NoxVote?

Every DAO operates in public. Not every decision should. NoxVote gives sensitive governance decisions
somewhere private to happen **without asking the DAO to move** — Safe keeps its treasury, Governor
keeps its rules and Timelock. Proposals, voting power, participation, and the final verdict stay
public; individual choices and exact totals do not.

It runs on [iExec Nox](https://github.com/iExec-Nox/documentation) confidential compute: encrypted
ballots go in, one outcome-only `Passed` / `Rejected` verdict comes back, and only the exact action
committed before voting opened can execute.

> **The positioning:** Nox is the privacy destination. NoxVote is where private DAO lives.

**New here?** The full mechanism, trust boundary, integration guides, and live addresses are in the
**[documentation](https://docs.noxvote.xyz)**.

## Demo video

<p align="center">
  <a href="https://vimeo.com/1214870008">
    <img src="https://raw.githubusercontent.com/Blockchain-Oracle/noxvote/main/assets/launch/demo-thumbnail.jpg" width="720" alt="Watch the NoxVote 60-second demo" />
  </a>
</p>

<p align="center">
  <a href="https://vimeo.com/1214870008"><b>▶ Watch the 60-second demo</b></a>
</p>

## How it works

1. **Commit the decision** — the Safe or Governor registers the proposal, rules, voting-power
   strategy, privacy floor, and exact action **before** voting opens.
2. **Vote privately** — the released Nox flow seals each choice through the attested Handle Gateway;
   the wallet submits an opaque ballot on-chain. Participation is public, the choice is not.
3. **Derive one verdict** — after close, Nox tallies the encrypted handles and releases only `Passed`
   or `Rejected` — never individual choices or exact totals, and nothing below the privacy floor.
4. **Execute once** — a `Passed` verdict authorizes only the pre-committed Safe call or the standard
   Governor → Timelock path.

![NoxVote product topology](https://raw.githubusercontent.com/Blockchain-Oracle/noxvote/main/assets/architecture/product-topology.png)

Two host adapters share one confidentiality model — a **Safe** module (retrofit an existing Safe) and
a compatible **OpenZeppelin Governor** with a real `TimelockController`. The full lifecycle, both
execution diagrams, and the trust boundary live in the
**[documentation](https://docs.noxvote.xyz/docs/how-it-works)**.

## Live on Sepolia

NoxVote's production graph completed its public Ethereum Sepolia checkpoint on **2026-08-01**: **37 / 37**
transactions succeeded, both paths consumed a real released-Nox `Passed` verdict and executed once,
the full Forge suite passed **119 / 119**, and three released-stack integration runs passed **33 / 33**.

| Contract                | Sepolia                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Versioned factory       | [`0x3d1c…1675`](https://sepolia.etherscan.io/address/0x3d1c0ff97a603ca5edadc7737c0bb6d4d4fd1675) |
| Production Safe         | [`0xF15f…a31f`](https://sepolia.etherscan.io/address/0xF15f852D0669cac06c3e00E7b5E701A5Dd93a31f) |
| Safe module             | [`0x2EEf…C162`](https://sepolia.etherscan.io/address/0x2EEf405eBe209eA4261Bc77e665e535C29feC162) |
| Compatible Governor     | [`0x061C…c12d`](https://sepolia.etherscan.io/address/0x061C799DC284b0Cd0501b442b8a4e262c31Ac12d) |
| Real TimelockController | [`0x66F0…Dc3b`](https://sepolia.etherscan.io/address/0x66F0a59bA4d5f6C1E3ee4251E77D41Ce97A9Dc3b) |

**Full address list** (all twelve contracts, with explorer links):
[docs.noxvote.xyz/docs/addresses](https://docs.noxvote.xyz/docs/addresses) · **verification report:**
[`.thoughts/verification/2026-08-01-phase6-sepolia-live-verification.md`](.thoughts/verification/2026-08-01-phase6-sepolia-live-verification.md)
· **machine-readable record:** [`deployments/sepolia/phase6-live.json`](deployments/sepolia/phase6-live.json)

![NoxVote trust and evidence boundary](https://raw.githubusercontent.com/Blockchain-Oracle/noxvote/main/assets/architecture/trust-evidence-boundary.png)

## Run locally

**Requirements:** Node.js `24.x` · pnpm `10.33.0` · Foundry · Docker (for the released Nox stack).

```bash
pnpm install
pnpm apps:dev     # landing on http://localhost:5178
pnpm app:dev      # the product
pnpm docs:dev     # the docs
```

Verify the implementation:

```bash
pnpm apps:build
pnpm test:forge          # 119 Forge tests
pnpm test:integration    # boots the real released Nox Docker stack — not a mock
```

## Documentation

The product docs live at **[docs.noxvote.xyz](https://docs.noxvote.xyz)**:

- [Quick start](https://docs.noxvote.xyz/docs/quickstart) — run the full flow on the local Nox stack
- [How it works](https://docs.noxvote.xyz/docs/how-it-works) — the lifecycle and the verdict-only reveal
- [Architecture](https://docs.noxvote.xyz/docs/architecture) — the immutable contract stack
- [Integrate](https://docs.noxvote.xyz/docs/integrate/deploy) — deploy through the versioned factory
- [Verify a result](https://docs.noxvote.xyz/docs/verification) — what the proof checks
- [Deployed addresses](https://docs.noxvote.xyz/docs/addresses) — the live Sepolia graph
- [Honest limits](https://docs.noxvote.xyz/docs/limits) — what NoxVote deliberately does not promise

## Repository map

| Path                                         | Purpose                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| [`apps/landing`](apps/landing)               | Public ORBIT launch page (noxvote.xyz)                          |
| [`apps/app`](apps/app)                       | The product — propose, ballot, tally, execute, verify           |
| [`apps/docs`](apps/docs)                     | Product and trust-boundary documentation                        |
| [`src/contracts`](src/contracts)             | Confidential core, Safe module, Governor, strategies, factories |
| [`test/foundry`](test/foundry)               | Unit, negative-proof, gas, and invariant suites                 |
| [`test/integration`](test/integration)       | Released Nox Docker-stack integration harness                   |
| [`assets/architecture`](assets/architecture) | Editable Mermaid sources and rendered architecture diagrams     |
| [`assets/brand`](assets/brand)               | ORBIT identity source and review board                          |

## What NoxVote promises — and what it does not

**Confidentiality, not anonymity.** Your wallet, weight, and participation are public; your choice is
not. It uses a **TEE, not ZK or FHE** — the attested Handle Gateway sees the plaintext choice during
encryption, and that trust boundary is stated in full, never buried. Full limits:
**[docs.noxvote.xyz/docs/limits](https://docs.noxvote.xyz/docs/limits)**.

**On Nox — while the DAO itself stays exactly where it is.**
