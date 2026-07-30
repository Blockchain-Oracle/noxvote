# Released Nox Feasibility for Confidential Voting

**Date:** 2026-07-29  
**Status:** Primary-source feasibility research; conditional prototype recommendation, not architecture approval

## Verdict

Released Nox can support a small, real, aggregate-only yes/no governance prototype. It cannot, by
itself, reproduce MACI's hidden reverse-valid command chain, receipt-freeness, or full-transition ZK
proofs. The honest hackathon promise is therefore **permanent individual-choice confidentiality with
outcome-only disclosure and public re-voting**, not “bribe-proof voting.”

The strongest bounded implementation hypothesis is:

1. public eligibility and participation;
2. encrypted boolean choices accepted through `Nox.fromExternal`;
3. an opaque latest-choice handle per voter and a deterministic public last-update rule;
4. encrypted accumulation and encrypted quorum/passage comparisons;
5. no public decryption below an independent privacy-participation floor;
6. public decryption of only the final `passed` boolean, not individual ballots or exact option totals;
7. an on-chain adapter that can execute the exact precommitted governance action after finalization.

This needs a small real Sepolia spike before architecture approval because gas, asynchronous dependency
latency, event volume, and recovery behavior have not yet been measured for a chained ballot tally.

## Released primitive boundary

The current published packages checked are:

| Package | Version |
|---|---:|
| `@iexec-nox/nox-protocol-contracts` | `0.2.4` |
| `@iexec-nox/handle` | `0.1.0-beta.13` |
| `@iexec-nox/nox-hardhat-plugin` | `0.2.0` |

`encryptInput` currently accepts `bool`, `uint16`, `uint256`, `int16`, and `int256`. The Solidity
library exposes encrypted arithmetic, comparison, and `select` operations for the released numeric
types. It does not expose an arbitrary confidential program, a private hash primitive, signature
verification, or a custom MACI command interpreter.

Consequently, Nox can express encrypted counters and a private passage decision. It cannot express the
cryptographic authentication and hidden key/nonce state machine that makes MACI re-voting more than a
public last-write-wins row.

Primary sources:

- [Nox protocol contracts at the inspected commit](https://github.com/iExec-Nox/nox-protocol-contracts/tree/688c965dff38c1b86a1cf49ebc1263873b9d9645)
- [Nox Handle SDK at the inspected commit](https://github.com/iExec-Nox/nox-handle-sdk/tree/b1cbfade5ea51b1ce54b51f5d9ad8e49fa8c7f5e)
- [Nox Solidity library reference](https://docs.noxprotocol.io/references/solidity-library)

## Input and ballot-binding boundary

The released client sends the plaintext value, type, owner address, and application contract to the
Handle Gateway. The gateway encrypts the value and returns a handle plus a 137-byte `HandleProof`.
That proof binds `(handle, owner, app, createdAt)` and the gateway signature. It does **not** bind the
proposal ID, ballot generation, option range, application nonce, or one-time use.

The voting application must therefore enforce:

- direct-caller eligibility or a separately proved credential;
- immutable proposal and election-version association;
- a one-address/credential rule;
- update ordering and replay prevention;
- allowed choice semantics; and
- the weight/snapshot source.

A `bool` ballot is the safest MVP because its allowed range is inherent. For more than two choices, the
contract must compare the encrypted value against the allowed range and prevent an invalid ballot from
affecting the accumulator.

Primary sources:

- [`encryptInput` implementation](https://github.com/iExec-Nox/nox-handle-sdk/blob/b1cbfade5ea51b1ce54b51f5d9ad8e49fa8c7f5e/src/methods/encryptInput.ts)
- [`validateInputProof` flow](https://github.com/iExec-Nox/nox-protocol-contracts/blob/688c965dff38c1b86a1cf49ebc1263873b9d9645/contracts/modules/Compute.sol)
- [Handle Gateway input flow](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/handle-gateway.md)

## Access-control law

`fromExternal` validates a user input and grants the application transient access for that transaction.
The application must explicitly persist its own access to any ballot or accumulator handle used later.
It should never grant a voter, proposer, operator, or adapter viewer/admin access to ballot handles.

Persistent admin access, viewer access, and public-decryption permission are monotonic in the released
contracts: there is no removal path. A fresh handle can isolate future use, but it does not revoke access
to an old handle. This makes ACL mistakes irreversible for the lifetime of the affected ballot handle.

The input owner is not automatically made an on-chain viewer. That is helpful for permanent ballot
privacy, but it is not sufficient for receipt-freeness: the voter still knows what was submitted, the
transaction and handle are public, and a coercer can supervise or prepare a known handle for submission.

Primary sources:

- [Nox ACL guide](https://github.com/iExec-Nox/documentation/tree/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/manage-handle-access)
- [Released ACL implementation](https://github.com/iExec-Nox/nox-protocol-contracts/blob/688c965dff38c1b86a1cf49ebc1263873b9d9645/contracts/modules/ACL.sol)

## Re-voting and receipt-freeness

Nox supports a straightforward update rule: a public identity submits a new opaque choice handle, and
the contract treats the newest accepted update as effective. An encrypted accumulator can subtract the
old choice and add the new choice, as the Oasis Sapphire demo does with confidential contract state.

That mechanism gives a **coercion-recovery window**—a voter may change an earlier choice. It does not
make compliance unverifiable in MACI's sense:

- the voter address, submission time, and handle are public;
- the winning update is selected by a public rule;
- a coercer can supervise the endpoint or prepare a known input handle for the voter;
- the released operations cannot privately verify a replacement key or encrypted voter signature; and
- last-moment coercion can remove any practical opportunity to override.

The gateway does not return a signed plaintext-to-handle receipt to the voter, which creates some
deniability, but that is a weak incidental property rather than an anti-bribery protocol. The product
must not claim MACI-equivalent receipt-freeness or bribery resistance.

## Asynchronous lifecycle

Nox contract operations emit compute events and immediately return deterministic result handles. The
Ingestor, message bus, Runner, KMS, and Gateway complete the encrypted computation later. There is no
application callback saying that a result handle is ready.

The product and contract state machine must therefore distinguish:

`OPEN → CLOSED → TALLY_REQUESTED → AWAITING_PROOF → FINALIZED`

with terminal alternatives:

`PRIVACY_THRESHOLD_NOT_MET` and `TALLY_FAILED_OR_TIMED_OUT`.

Finalization must be idempotent, bind the expected output handle, reject early or duplicate proofs, and
surface recovery rather than displaying a pending tally as zero.

Primary sources:

- [Nox Runner architecture](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/runner.md)
- [Global architecture](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/global-architecture-overview.md)

## What the public proof proves

Public decryption returns plaintext plus a gateway ECDSA signature. On-chain
`validateDecryptionProof` verifies the configured gateway signature over the handle and the hash of the
plaintext. This is useful provenance for accepting the final result. It is not:

- a SNARK of the complete operation DAG;
- a proof that every eligible ballot was included;
- an on-chain TDX attestation check;
- a proof of the exact confidential code measurement; or
- a substitute for MACI's process/tally circuits.

Correctness and confidentiality therefore trust the released Nox Gateway signer, KMS, Runner,
off-chain measurement/attestation policy, Nox admins/upgrades, and TDX hardware boundary in addition to
the application contract.

Primary source: [decryption proof validation](https://github.com/iExec-Nox/nox-protocol-contracts/blob/688c965dff38c1b86a1cf49ebc1263873b9d9645/contracts/modules/Compute.sol).

## KMS comparison

The documented MVP uses one KMS node holding the full EC private key. Threshold Shamir/DKG operation is
a future production target. This is materially weaker today than Shutter's threshold-Keyper system
against a single key compromise and a single decryption-service outage.

The pitch should say so directly. Nox's possible advantage is richer confidential policy computation
and selective output, not stronger deployed key distribution.

Primary source: [Nox KMS design](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/protocol/kms.md).

## Oasis Sapphire lesson

The official Sapphire voting demo confirms that confidential state can support re-voting by reversing
the prior encrypted choice before applying the replacement, and that aggregate release can wait until
close. It also shows the limit of that pattern: its signed request binds voter, proposal, and choice, so
it is not a receipt-free protocol. Sapphire's encrypted state, gas/access-pattern padding, relayed calls,
and explicit reveal boundary are useful adjacent lessons, not evidence that Nox inherits those features.

Primary source: [Oasis confidential voting demo](https://github.com/oasisprotocol/demo-voting/tree/3c2bda75c605da79d0e790a5df828796f4641c0e).

## Toolchain verdict

Foundry 1.7.1 with Solc 0.8.35 compiled a minimal application against the released Nox Solidity
package. Foundry is therefore viable for contract compilation, fast unit tests, fuzz/property tests,
and deployment scripts.

However, the official Foundry guide is currently only “Coming Soon.” The supported real local Nox stack
is the Hardhat 3 plugin, which starts the off-chain services and exposes encryption/decryption helpers.

Use a hybrid toolchain:

- **Foundry as the primary contract toolchain** for unit, invariant, fuzz, deployment, and verification;
- **a bounded Hardhat 3 harness** only for local Nox end-to-end integration; and
- **a real Sepolia proof** for the judged vertical.

This honors the Foundry preference without pretending that Foundry currently replaces Nox's supported
integration runner.

Primary sources:

- [official Foundry guide placeholder](https://github.com/iExec-Nox/documentation/blob/ce4262e181bc9dfbb99ae5d0e28c4ea4f4422da7/src/guides/build-confidential-smart-contracts/foundry.md)
- [released Hardhat plugin](https://github.com/iExec-Nox/nox-hardhat-plugin/tree/a9a913264b2ec8c7b71864b61efe8a03491b5ce5)

## Gate before implementation

The feasibility decision is **conditional GO** for the narrow confidential-governance promise. Before
product implementation, prove one non-mock chain:

`encryptInput → fromExternal → persist app access → encrypted update/tally → privacy gate → allow public decryption of verdict → gateway proof → on-chain finalization → exact adapter action`

If that chain fails with released packages, do not replace it with a local plaintext tally or mock proof.
