import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { BaseError, ContractFunctionRevertedError } from 'viem'
import { usePublicClient, useWalletClient } from 'wagmi'
import { confidentialGovernorAbi } from '../abi/confidentialGovernor.ts'
import { safeModuleAbi } from '../abi/safeConfidentialVotingModule.ts'
import type { Hex } from '../config/addresses.ts'
import type { CommittedAction, ExecutionProgress } from '../state/execution.ts'
import type { GovernorProposalData } from '../hooks/useExecution.ts'

/**
 * Host execution writes. Everything simulates first, so an action bundle
 * that does not match the on-chain commitment is blocked with the decoded
 * core error before any wallet opens — the mismatch state, not a failed tx.
 */
export function useExecuteHost(host: Hex | undefined) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<ExecutionProgress>({ status: 'idle' })

  async function submit(
    build: () => Parameters<NonNullable<typeof publicClient>['simulateContract']>[0],
  ) {
    if (!walletClient || !publicClient || !host) return
    try {
      setProgress({ status: 'submitting' })
      const { request } = await publicClient.simulateContract({
        ...build(),
        account: walletClient.account,
      })
      const txHash = await walletClient.writeContract(request)
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 180_000,
      })
      if (receipt.status !== 'success') {
        setProgress({ status: 'failed', reason: 'The transaction reverted on-chain.' })
        return
      }
      await queryClient.invalidateQueries()
      setProgress({ status: 'confirmed', txHash })
    } catch (error) {
      setProgress(describeExecutionError(error))
    }
  }

  return {
    progress,
    reset: () => setProgress({ status: 'idle' }),
    executeSafe(safeProposalId: Hex, actions: CommittedAction[]) {
      void submit(() => ({
        address: host as Hex,
        abi: safeModuleAbi,
        functionName: 'execute',
        args: [safeProposalId, actions],
      }))
    },
    queueGovernor(data: GovernorProposalData) {
      void submit(() => ({
        address: host as Hex,
        abi: confidentialGovernorAbi,
        functionName: 'queue',
        args: [data.targets, data.values, data.calldatas, data.descriptionHash],
      }))
    },
    executeGovernor(data: GovernorProposalData) {
      void submit(() => ({
        address: host as Hex,
        abi: confidentialGovernorAbi,
        functionName: 'execute',
        args: [data.targets, data.values, data.calldatas, data.descriptionHash],
      }))
    },
  }
}

const MISMATCH_HINT = /hash|action|mismatch|commit/i

function describeExecutionError(error: unknown): ExecutionProgress {
  if (error instanceof BaseError) {
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
      const name = revert.data.errorName
      if (MISMATCH_HINT.test(name)) {
        return { status: 'mismatch', detail: `Blocked before submission: ${name}` }
      }
      return { status: 'failed', reason: `Rejected by the host: ${name}` }
    }
    return { status: 'failed', reason: error.shortMessage }
  }
  return { status: 'failed', reason: error instanceof Error ? error.message : String(error) }
}
