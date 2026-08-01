import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { BaseError, ContractFunctionRevertedError, parseEventLogs } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { confidentialGovernorAbi } from '../abi/confidentialGovernor.ts'
import type { Hex } from '../config/addresses.ts'
import { draftToArgs, type ProposalDraft } from '../state/proposalForm.ts'

export type PublishProgress =
  | { status: 'idle' }
  | { status: 'publishing' }
  | { status: 'rejected'; reason: string }
  | { status: 'failed'; reason: string }
  | { status: 'published'; proposalId: bigint; txHash: Hex }

/**
 * The Governor `proposeConfidential` write. Caller-open, so the app submits it
 * directly. Simulate-first surfaces a below-threshold or disabled-route
 * rejection decoded, before any wallet opens.
 */
export function useProposeConfidential(governor: Hex | undefined) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<PublishProgress>({ status: 'idle' })

  async function publish(draft: ProposalDraft) {
    if (!walletClient || !publicClient || !governor) return
    const { targets, values, calldatas, description, privacyFloor } = draftToArgs(draft)
    try {
      setProgress({ status: 'publishing' })
      const { request } = await publicClient.simulateContract({
        account: walletClient.account,
        address: governor,
        abi: confidentialGovernorAbi,
        functionName: 'proposeConfidential',
        args: [targets, values, calldatas, description, privacyFloor],
      })
      const txHash = await walletClient.writeContract(request)
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 180_000 })
      const created = parseEventLogs({
        abi: confidentialGovernorAbi,
        eventName: 'ProposalCreated',
        logs: receipt.logs,
      })[0]
      if (receipt.status !== 'success' || !created) {
        setProgress({ status: 'failed', reason: 'The proposal transaction reverted.' })
        return
      }
      await queryClient.invalidateQueries()
      setProgress({ status: 'published', proposalId: created.args.proposalId, txHash })
    } catch (error) {
      setProgress(describe(error))
    }
  }

  return { progress, reset: () => setProgress({ status: 'idle' }), publish: (d: ProposalDraft) => void publish(d) }
}

function describe(error: unknown): PublishProgress {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof ContractFunctionRevertedError)) {
      const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
      const name =
        revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined
      return { status: 'rejected', reason: name ? `Rejected: ${name}` : error.shortMessage }
    }
    if (/rejected|denied|user/i.test(error.shortMessage)) {
      return { status: 'rejected', reason: 'You rejected the transaction in your wallet.' }
    }
    return { status: 'failed', reason: error.shortMessage }
  }
  return { status: 'failed', reason: error instanceof Error ? error.message : String(error) }
}
