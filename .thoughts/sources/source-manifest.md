# Source Manifest

Mirrors live under `.thoughts/raw/` and are ignored. The initial corpus was retrieved on 2026-07-29;
the Phase 6 entries below were refreshed on 2026-08-01.

## iExec Nox official sources

| Source                                              | Mirror commit                              | Use                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| https://github.com/iExec-Nox/documentation          | `e21835571131bf574376610c4be15902cd4752b9` | Current Nox documentation and network/API routing; refreshed for Phase 6                                                       |
| https://github.com/iExec-Nox/nox-protocol-contracts | `688c965dff38c1b86a1cf49ebc1263873b9d9645` | Released Solidity SDK, NoxCompute interfaces, ACL and proof verification                                                       |
| https://github.com/iExec-Nox/nox-handle-sdk         | `b1cbfade5ea51b1ce54b51f5d9ad8e49fa8c7f5e` | Handle preparation request, private/public decryption, and proof types; released input encryption occurs in the Handle Gateway |
| https://github.com/iExec-Nox/nox-hardhat-plugin     | `a9a913264b2ec8c7b71864b61efe8a03491b5ce5` | Supported local confidential-stack test workflow                                                                               |
| https://github.com/iExec-Nox/nox-kms                | `5cf23f2743033dafbe878db9342bd1da4d3341dc` | Current KMS implementation and trust topology                                                                                  |
| https://github.com/iExec-Nox/nox-runner             | `c56433e7d8f12c46e362d89f8304353c1f72c933` | Confidential operation execution semantics                                                                                     |
| https://github.com/iExec-Nox/nox-handle-gateway     | `a7379bbb38bf6731d5bf5e7aadf2c2f4d545023b` | Ciphertext/handle lifecycle and decryption gateway                                                                             |
| https://github.com/iExec-Nox/nox-product-poc        | `7024a8167f0c61a24ce569af9272b457bff8b6ce` | Official visible product-PoC collision baseline                                                                                |

## Phase 6 deployment sources and live verification

| Source                                          | Commit or live state                       | Use                                                                  |
| ----------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| https://github.com/safe-global/safe-deployments | `9f5c7a4259fdd03fd63fa5a57d3d9802cb38ad12` | Official Safe 1.5.0 canonical address and code-hash registry         |
| Ethereum Sepolia public RPC                     | Block `11395848`, checked 2026-08-01       | Chain, proxy slot, runtime code, Gateway signer, gas, and role reads |
| https://gateway-testnets.noxprotocol.dev        | HTTP 200, checked 2026-08-01               | Released Handle Gateway health and SDK endpoint                      |
| Ethereum Sepolia Nox subgraph                   | Block `11395848`, HTTP 200                 | Current handle/ACL indexing endpoint                                 |

The current Sepolia addresses and exact runtime hashes are:

| Dependency                   | Address                                      | Runtime code hash                                                    |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| NoxCompute proxy             | `0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF` | `0x9051c2db7e8a643e765dbe24abc6661bcd78bcd849f9e1f83bf5a59e95dd7438` |
| NoxCompute implementation    | `0xc9B5D2e99e45dc652b3B90bA5FA79667ACFEb819` | `0x2353cc148349b7dda236c6dc2e66735db4138a4d7498765729bc01fb121f4256` |
| Safe 1.5.0 singleton         | `0xFf51A5898e281Db6DfC7855790607438dF2ca44b` | `0xdda019cbd7c867a533a2a86e5c53434fdc50b13122b5a5ddb4a8df61b31c20f2` |
| Safe 1.5.0 proxy factory     | `0x14F2982D601c9458F93bd70B218933A6f8165e7b` | `0x967dae4cda22b0c9ef7f31b010bdc1ceb0af9904b0c3dc060b5302e4c18a4529` |
| Safe 1.5.0 MultiSendCallOnly | `0xA83c336B20401Af773B6219BA5027174338D1836` | `0xcdbdcec38d2f1c7d961b0029ff8416b7e86e9974d6f0e9c9580c7d17fcfb6663` |
| Safe compatibility handler   | `0x3EfCBb83A4A7AfcB4F68D501E2c2203a38be77f4` | `0x3c6a85bcf7b563daa624b884b4e9a1b9fa5371edde7be945d998071a48f28bbc` |

The Nox proxy implementation slot resolved to the implementation above. The current official
`nox-protocol-contracts` Sepolia Ignition artifact has the same 16,873-byte runtime as the live code.
After zeroing only the nine locations declared in that artifact's `immutableReferences`, every byte
matches. The live code's short Solidity metadata trailer is expected because the official production
profile uses `viaIR`, optimizer runs 200, and `metadata.bytecodeHash = none`.

At block `11395848`, three independent Sepolia RPC reads agreed on the live Nox Gateway signer
`0xE13191F53671957C8a48A7A3Ff15E16450a1552F`; the configured proof-expiration duration was `3600`
seconds. The Phase 6 runner pins both values and fails closed if either changes.

## Released packages checked

| Package                             | npm `latest` on 2026-07-29 |
| ----------------------------------- | -------------------------: |
| `@iexec-nox/nox-protocol-contracts` |                    `0.2.4` |
| `@iexec-nox/handle`                 |            `0.1.0-beta.13` |
| `@iexec-nox/nox-hardhat-plugin`     |                    `0.2.0` |

## Documentation corpus lookup

- Context7 library ID: `/iexec-nox/documentation`
- Context7 resolved from the official `iExec-Nox/documentation` repository.
- The official Foundry guide at the mirrored commit is a `Coming Soon` placeholder.
- The official Hardhat guide documents the real local off-chain stack for Hardhat 3, Node.js 22+
  and Docker.

## Voting collision and hackathon sources

| Source                                                            | Commit or live state                       | Use                                                                |
| ----------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| https://dorahacks.io/hackathon/wtf-hackathon/detail               | Read live 2026-07-29                       | Current challenge, rule, deliverables and judging criteria         |
| https://dorahacks.io/hackathon/wtf-hackathon/buidl                | Read live 2026-07-29                       | 13 current submissions; organizer keeps identities/details private |
| https://dorahacks.io/hackathon/vibe-coding-iexec/buidl            | Read live 2026-07-29                       | Prior VIBE corpus: 60 BUIDLs                                       |
| https://dorahacks.io/buidl/43637                                  | Read live 2026-07-29                       | `NOX Confidential Investment Club` voting claim                    |
| https://github.com/muhamedag2022/nox-confidential-investment-club | `31240f5e9fdd97c62d63519080c5a9d83506708c` | Actual Investment Club voting code and demo disclosure             |
| https://dorahacks.io/buidl/43622                                  | Read live 2026-07-29                       | `ChainEstate` governance-voting claim                              |
| https://github.com/ntfound-dev/ChainEstate-                       | `82ec9753d150f172af0826f28cebf99ce63b530c` | Actual ChainEstate governance code                                 |

## MACI

| Source                                   | Commit                                     | Use                                                     |
| ---------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| https://github.com/privacy-ethereum/maci | `919c433d09aa776a05ca2d89a0074324d6199e91` | Current v3 contracts, circuits, SDK, audit and workflow |

## Shutter and Snapshot

| Source                                             | Commit                                     | Use                                                                                |
| -------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| https://github.com/snapshot-labs/sx-monorepo       | `23e7c9f1ae17f221ef5f569c70c8681249dce965` | Current Snapshot classic Shutter UI, ingestion, release and plaintext finalization |
| https://github.com/shutter-network/rolling-shutter | `d143fffcf51f85b30375134d2d29756417f333b9` | Snapshot trigger, Keyper and bridge flow                                           |
| https://github.com/shutter-network/shutter         | `9843a061b3f7243dc5d3f59ad212fc5222cedfb8` | Shutter cryptographic/protocol reference                                           |
| https://github.com/shutter-network/shutter-api     | `c516e85a23eff6f49381109ba010512397efd468` | Current API architecture and deployment disclaimer                                 |
| https://github.com/pepae/sx-monorepo-elgamal       | `5c59aec14d12f9f1e2df4e41f6ca366735881a53` | Permanent Shielded Voting ElGamal proof of concept                                 |

## Oasis comparison

| Source                                             | Commit                                     | Use                                                                            |
| -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| https://github.com/oasisprotocol/sapphire-paratime | `046ab1e098f1d336f0dcda7149f9d2a9b30def92` | Current Sapphire confidential EVM and tooling reference                        |
| https://github.com/oasisprotocol/demo-voting       | `3c2bda75c605da79d0e790a5df828796f4641c0e` | Confidential-state re-vote, aggregate reveal and receipt limitation comparison |

## Broader private-voting systems

| Source                                                                | Commit or live state                                                    | Use                                                                                                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| https://github.com/Election-Tech-Initiative/electionguard             | `c6786d8bab5c15f33181dadf91b919541aae0ffd`                              | ElectionGuard 2.1 process, election record, cast-or-spoil, guardian and verification model                                              |
| https://github.com/benadida/helios-server                             | `c7d5e60fbf9123be13d250a2ad9dae9efd8978e3`                              | Helios encrypted ballot, tracker, public bulletin board, latest-vote and trustee tally implementation                                   |
| https://gitlab.inria.fr/belenios/belenios                             | `337887bd1862c7cd057080b530fd80941bfc3c69` (`stable`, version `3.3.0`)  | Belenios credentials, replacement ballots, public archive, homomorphic/mixnet tally and threshold trustees                              |
| https://github.com/spring-epfl/voteagain                              | `5b6be8a786c0cbd456a72c47a5be4da351d800a3`                              | VoteAgain experimental filter, deterministic padding, mixnet and re-vote mechanism                                                      |
| https://github.com/a16z/cicada                                        | `dec37d732f8ef8a91119650c416ae9bfb531a64a`                              | Time-lock homomorphic tally, ballot-validity proofs and setup/decryption limitations                                                    |
| https://github.com/semaphore-protocol/semaphore                       | `4dbc39b83a4066bf5084fd7f5d336202aad2f815` (version `4.14.3`)           | Anonymous membership, public message/scope, nullifier and group-root behavior                                                           |
| https://github.com/vocdoni/davinci                                    | `467dc62f0e82426fd6ca6a294d6673edba7762f1`                              | Current DAVINCI v2 paper, state machine, re-encryption, security assumptions and implementation status                                  |
| https://github.com/vocdoni/davinci-contracts                          | `719d9a8d2d92af5abb589ed6edab763629692071` (version `0.0.49`)           | WIP Foundry contracts for process lifecycle, state-transition proof and results proof                                                   |
| https://github.com/vocdoni/vocdoni-app                                | `1782473d07bdf39daae9752a3a558b0966a50105` (`develop`, version `2.4.0`) | Current organizer/voter UX for privacy modes, overwrite limits, census and verification surfaces; not evidence that DAVINCI is deployed |
| https://www.usenix.org/conference/usenixsecurity20/presentation/lueks | Published paper and artifacts                                           | Original VoteAgain claims and protocol description                                                                                      |
| https://orbilu.uni.lu/handle/10993/54382                              | Peer-reviewed 2023 paper                                                | Later finding that original VoteAgain requires one election authority trusted for all security properties                               |

## Governance-host references

| Source                                                     | Live state           | Use                                                                                 |
| ---------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| https://docs.openzeppelin.com/contracts/5.x/api/governance | Read live 2026-07-29 | Current Governor extension/counting/execution boundary                              |
| https://docs.safe.global/advanced/smart-account-modules    | Read live 2026-07-29 | Current Safe module enablement, execution flow, and full-authority security warning |

## Verified spike dependencies and released-tooling findings

Checked locally and through current Context7 documentation on 2026-07-30:

| Dependency                          |         Version | Spike use                                                                          |
| ----------------------------------- | --------------: | ---------------------------------------------------------------------------------- |
| Foundry / Forge                     |         `1.7.1` | Primary build and state/compatibility tests                                        |
| Hardhat                             |        `3.11.1` | Released real local Nox harness                                                    |
| `@iexec-nox/nox-hardhat-plugin`     |         `0.2.0` | Shipped local off-chain stack; explicit Compose env drops `PATH` in this workspace |
| `@iexec-nox/nox-protocol-contracts` |         `0.2.4` | Released SDK, NoxCompute, ACL, and proof validation                                |
| `@iexec-nox/handle`                 | `0.1.0-beta.13` | Real wallet inputs/proofs; owner discovery uses `getAddresses()[0]`                |
| `@safe-global/safe-smart-account`   |         `1.5.0` | Official singleton/proxy artifacts and module execution                            |
| `@openzeppelin/contracts`           |         `5.6.1` | Governor cast/state compatibility seam                                             |
| NATS Server / JetStream             |       `2.12.12` | Shipped durable-consumer redelivery and acknowledgement behavior                   |

The two tooling findings are reproduced and bounded in
[`../verification/2026-07-30-full-shape-spike-report.md`](../verification/2026-07-30-full-shape-spike-report.md).

JetStream redelivery behavior was checked on 2026-07-30 through current official NATS documentation
resolved by Context7 as `/nats-io/nats.docs`, then reproduced against the plugin-shipped real durable
consumer with an explicit negative acknowledgement.

## Additional documentation corpus lookup

- Context7 library ID: `/semaphore-protocol/semaphore`
- Context7 documentation and current repository code were both checked because retrieved examples
  did not fully reflect the maintained v4.14.3 Solidity surface.
- Context7 library ID: `/safe-fndn/safe-smart-account`; current module enablement, unrestricted module
  authority, and `execTransactionFromModule` behavior were rechecked on 2026-07-30, then exact
  `MultiSend`/`MultiSendCallOnly` semantics were read from pinned package source.
- Context7 library ID: `/websites/openzeppelin_contracts_5_x`; current Governor proposal, vote-casting,
  snapshot, queue, and timelock documentation was rechecked on 2026-07-30, then exact 5.6.1 overrides
  were read from pinned package source.
- Context7 library ID: `/iexec-nox/documentation`; released input-proof, ACL, public-decryption,
  Hardhat, and supported-network behavior was refreshed on 2026-07-30.
- Slither official repository: https://github.com/crytic/slither, release `0.11.5` was checked on
  2026-07-30 during quality-profile research. The user subsequently removed Slither from project
  requirements; it must not be run or treated as a gate.
