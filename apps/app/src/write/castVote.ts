import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { parseEventLogs } from 'viem'
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { createHandleClient } from '../lib/handle.ts'
import { ballotKeys } from '../hooks/keys.ts'

/** Canonical encrypted ballot values (integration-test truth, uint16). Every
 * other representable value is normalized to Abstain by the core. */
export const CHOICE = { against: 0n, for: 1n, abstain: 65_535n } as const
export type ChoiceName = keyof typeof CHOICE

export type CastVoteParams = {
  core: Hex
  ballotId: Hex
  /** 1 for the first cast; previous sequence + 1 for a replacement. */
  sequence: bigint
  /** ABI-encoded (weight, proof) on first cast; `0x` on replacement. */
  eligibilityProof: Hex
}

export type CastStage = 'preparing' | 'wallet' | 'submitting' | 'computing'

export type CastState =
  | { stage: 'idle' }
  | { stage: 'preparing' }
  | { stage: 'wallet' }
  | { stage: 'submitting'; txHash: Hex }
  | { stage: 'computing'; txHash: Hex }
  | { stage: 'recorded'; txHash: Hex; sequence: bigint }
  | { stage: 'failed'; at: CastStage; message: string }

/**
 * The five-stage ballot overlay, each stage bound to a real awaitable:
 * Gateway encryption → wallet signature → transaction inclusion → the chain's
 * own VoteRecorded + receipt re-read → Recorded. Never optimistic. Retry
 * resumes from the last completed checkpoint — after a transaction exists it
 * only ever re-polls, it never re-submits a spent sequence.
 */
export function useCastVote(params: CastVoteParams) {
  const { core, ballotId, sequence, eligibilityProof } = params
  const chainId = useChainId()
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()

  const [state, setState] = useState<CastState>({ stage: 'idle' })
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const checkpoint = useRef<{ encrypted?: { handle: Hex; handleProof: Hex }; txHash?: Hex }>({})
  const chosen = useRef<bigint | null>(null)

  async function run(choice: bigint) {
    if (!walletClient || !publicClient || !address || profile.kind === 'unconfigured') {
      setState({ stage: 'failed', at: 'preparing', message: 'Connect a wallet first.' })
      return
    }
    chosen.current = choice
    try {
      if (!checkpoint.current.encrypted) {
        setState({ stage: 'preparing' })
        const handleClient = await createHandleClient(walletClient, address, profile.nox)
        const encrypted = await handleClient.encryptInput(choice, 'uint16', core)
        checkpoint.current.encrypted = {
          handle: encrypted.handle as Hex,
          handleProof: encrypted.handleProof as Hex,
        }
      }
    } catch (error) {
      setState({ stage: 'failed', at: 'preparing', message: describe(error) })
      return
    }

    try {
      if (!checkpoint.current.txHash) {
        setState({ stage: 'wallet' })
        const { handle, handleProof } = checkpoint.current.encrypted
        checkpoint.current.txHash = await walletClient.writeContract({
          address: core,
          abi: confidentialBallotCoreAbi,
          functionName: 'castVote',
          args: [ballotId, sequence, handle, handleProof, eligibilityProof],
        })
      }
    } catch (error) {
      // A rejected signature spends nothing: clear so retry re-opens the wallet.
      setState({ stage: 'failed', at: 'wallet', message: describe(error) })
      return
    }

    const txHash = checkpoint.current.txHash
    try {
      setState({ stage: 'submitting', txHash })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 180_000 })
      if (receipt.status !== 'success') {
        setState({ stage: 'failed', at: 'submitting', message: 'The transaction reverted on-chain.' })
        return
      }
      setState({ stage: 'computing', txHash })
      const recorded = parseEventLogs({
        abi: confidentialBallotCoreAbi,
        eventName: 'VoteRecorded',
        logs: receipt.logs,
      }).some((log) => log.args.ballotId === ballotId && log.args.voter === address)
      if (!recorded) {
        setState({
          stage: 'failed',
          at: 'computing',
          message: 'The transaction confirmed but no VoteRecorded event matches this ballot.',
        })
        return
      }
      await queryClient.invalidateQueries({ queryKey: ballotKeys.ballot(chainId, core, ballotId) })
      setState({ stage: 'recorded', txHash, sequence })
    } catch (error) {
      setState({ stage: 'failed', at: 'submitting', message: describe(error) })
    }
  }

  return {
    state,
    startedAt,
    start(choice: bigint) {
      checkpoint.current = {}
      setStartedAt(Date.now())
      void run(choice)
    },
    retry() {
      if (chosen.current === null) return
      void run(chosen.current)
    },
    reset() {
      checkpoint.current = {}
      chosen.current = null
      setStartedAt(null)
      setState({ stage: 'idle' })
    },
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const short = (error as { shortMessage?: string }).shortMessage
    return short ?? error.message
  }
  return String(error)
}
