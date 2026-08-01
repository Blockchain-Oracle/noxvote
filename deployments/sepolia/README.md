# Phase 6 Sepolia Runbook

This directory holds the public, resumable Phase 6 deployment checkpoint. The checkpoint contains
only addresses, transaction hashes, dependency/code-hash observations, ballot IDs, verdict handles,
and public execution results. It must never contain a private key.

## Account And Funding

1. Create a dedicated Ethereum Sepolia account. Do not reuse a production, personal, or unrelated
   local wallet.
2. Copy `.env.example` to the ignored `.env` file and set `PHASE6_DEPLOYER_PRIVATE_KEY` locally. Never
   paste the key into chat or commit it.
   Set `PHASE6_SEPOLIA_RPC_URL` to a dedicated Sepolia RPC for the live run when one is available; the
   public default is suitable for read-only preflight but can lag or evict pending transactions.
3. Run `mise exec -- pnpm phase6:account`. This repeats the fail-closed live preflight and prints only
   the public deployer/voter addresses, current deployer balance, and required balance. It writes no
   deployment evidence and broadcasts nothing.
4. Fund the printed deployer address with the reported amount of Sepolia ETH. The current floor is
   `0.25` Sepolia ETH, but the dynamic requirement can be higher when gas requires it.
5. Rerun `mise exec -- pnpm phase6:account` until `sufficientlyFunded` is `true`.

## Authorized Execution

Run `mise exec -- pnpm phase6:execute`. The runner repeats the complete dependency, signer, proof
lifetime, runtime-code-hash, and reviewed creation-code checks before its first transaction. It then
deploys and proves the four-wallet/floor-four Safe and Governor paths through released Sepolia Nox.

The resumable checkpoint is `deployments/sepolia/phase6-live.json`. Keep it between retries. Each Safe
and Governor proof attempt has its own transaction namespace; if a voting window closes before all
four ballots are recorded, the incomplete attempt is preserved and a fresh proposal is created.
On-chain state checks also prevent already-recorded votes, tally requests, finalizations, queues, and
executions from being repeated after a normal resume.

Do not report Phase 6 complete unless the checkpoint status is `complete`, both exact target calls are
observed once, and the public Nox verdict proofs finalize successfully.

## Dropped Transaction Recovery

If the runner times out while waiting for a transaction hash, stop before retrying. Do not delete the
whole checkpoint.

1. Check the saved hash with the configured RPC and an independent Sepolia explorer/RPC.
2. If it mined successfully, keep the hash and retry against a synchronized RPC; the on-chain guards
   will resume from the observed state.
3. If it is confirmed dropped from every checked mempool, back up the checkpoint, remove only that
   exact key from the `transactions` object, and rerun. Preserve `runId`, `contracts`, proof attempts,
   and every other transaction hash.
4. A crash after Safe broadcast but before its hash is checkpointed is narrower: first recover the
   original transaction hash from the deployer history and add it under `deploySafe`. Re-broadcasting
   an already-mined deterministic Safe deployment will revert on the CREATE2 collision.

When transaction state is ambiguous, do not guess or wipe evidence; reconcile the hash and on-chain
state first. These are recoverable Sepolia operator cases, not permission to replace the real-Nox path
with a mock.
