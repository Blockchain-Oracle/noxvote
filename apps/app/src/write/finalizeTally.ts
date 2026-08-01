import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { parseEventLogs } from 'viem'
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { createHandleClient } from '../lib/handle.ts'
import { ballotKeys } from '../hooks/keys.ts'
import type {
  FinalizeProgress,
  TallyRequestProgress,
  VerdictProofProgress,
} from '../state/tally.ts'

/** Permissionless close-time tally request. The receipt's own logs say which
 * way it went: TallyRequested (floor met) or TallyWithheld (terminal). */
export function useRequestTally(core: Hex, ballotId: Hex) {
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<TallyRequestProgress>({ status: 'idle' })

  async function request() {
    if (!walletClient || !publicClient) return
    try {
      setProgress({ status: 'submitting' })
      const txHash = await walletClient.writeContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'requestTally',
        args: [ballotId],
      })
      setProgress({ status: 'submitted', txHash })
      await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 180_000 })
      await queryClient.invalidateQueries({ queryKey: ballotKeys.ballot(chainId, core, ballotId) })
    } catch {
      setProgress({ status: 'idle' })
    }
  }

  return { progress, request: () => void request() }
}

const PROOF_POLL_MS = 1_000
const PROOF_POLL_WINDOW_MS = 180_000

/**
 * Poll the Handle Gateway for the public decryption of the stored expected
 * verdict handle — the browser-capable half of the integration test's
 * `publicDecrypt` loop. The deterministic request stays retryable after a
 * timeout; elapsed time shown is measured, never estimated.
 */
export function useVerdictProof(expectedVerdictHandle: Hex | undefined, enabled: boolean) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const startedAt = useRef<number | null>(null)
  const [timedOutAt, setTimedOutAt] = useState<number | null>(null)

  const query = useQuery({
    queryKey: ['verdict-proof', expectedVerdictHandle],
    enabled:
      enabled &&
      expectedVerdictHandle !== undefined &&
      walletClient !== undefined &&
      address !== undefined &&
      profile.kind !== 'unconfigured',
    retry: false,
    refetchInterval: (q) => {
      if (q.state.data) return false
      if (startedAt.current !== null && Date.now() - startedAt.current > PROOF_POLL_WINDOW_MS) {
        setTimedOutAt(Date.now())
        return false
      }
      return PROOF_POLL_MS
    },
    queryFn: async () => {
      if (!walletClient || !address || !expectedVerdictHandle || profile.kind === 'unconfigured') {
        throw new Error('unreachable: query disabled')
      }
      startedAt.current ??= Date.now()
      const handleClient = await createHandleClient(walletClient, address, profile.nox)
      const decrypted = await handleClient.publicDecrypt(expectedVerdictHandle)
      return {
        value: Boolean(decrypted.value),
        decryptionProof: decrypted.decryptionProof as Hex,
      }
    },
  })

  const progress: VerdictProofProgress = query.data
    ? { status: 'ready', decryptionProof: query.data.decryptionProof, value: query.data.value }
    : timedOutAt !== null
      ? { status: 'timed-out' }
      : query.fetchStatus === 'fetching' || query.isError
        ? { status: 'polling', startedAt: startedAt.current ?? Date.now() }
        : { status: 'idle' }

  return {
    progress,
    retryAfterTimeout() {
      startedAt.current = null
      setTimedOutAt(null)
      void query.refetch()
    },
  }
}

/** Finalize with the Gateway's decryption proof; a revert is a rejected
 * proof — the panel shows the evidence, the result stays unset. */
export function useFinalize(core: Hex, ballotId: Hex) {
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<FinalizeProgress>({ status: 'idle' })

  async function finalize(decryptionProof: Hex) {
    if (!walletClient || !publicClient) return
    try {
      setProgress({ status: 'submitting' })
      const txHash = await walletClient.writeContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'finalize',
        args: [ballotId, decryptionProof],
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 180_000 })
      const finalized = parseEventLogs({
        abi: confidentialBallotCoreAbi,
        eventName: 'BallotFinalized',
        logs: receipt.logs,
      }).some((log) => log.args.ballotId === ballotId)
      if (receipt.status !== 'success' || !finalized) {
        setProgress({ status: 'rejected', reason: 'The finalize transaction reverted.' })
        return
      }
      await queryClient.invalidateQueries({ queryKey: ballotKeys.ballot(chainId, core, ballotId) })
      setProgress({ status: 'confirmed', txHash })
    } catch (error) {
      const short = (error as { shortMessage?: string }).shortMessage
      setProgress({
        status: 'rejected',
        reason: short ?? (error instanceof Error ? error.message : String(error)),
      })
    }
  }

  return { progress, finalize: (proof: Hex) => void finalize(proof) }
}
