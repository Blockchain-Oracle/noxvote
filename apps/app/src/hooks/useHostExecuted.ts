import { useQuery } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialGovernorAbi } from '../abi/confidentialGovernor.ts'
import { safeModuleAbi } from '../abi/safeConfidentialVotingModule.ts'
import type { Hex } from '../config/addresses.ts'
import type { HostInfo } from './useHost.ts'

/** The Governor's detailed-state enum value for Executed (its enum extends
 * the core's with Queued=8, Executed=9, Canceled=10). */
const GOVERNOR_EXECUTED = 9

/** One cheap read answering "did the host execute this proposal?" — powers
 * the list's Executed lifecycle label without a per-row log scan. */
export function useHostExecuted(
  host: HostInfo | undefined,
  hostProposalId: Hex | undefined,
  enabled: boolean,
) {
  const chainId = useChainId()
  const client = usePublicClient()
  return useQuery({
    queryKey: ['host-executed', chainId, host?.address ?? '0x', hostProposalId ?? '0x'],
    enabled: enabled && client !== undefined && host !== undefined && hostProposalId !== undefined,
    queryFn: async (): Promise<boolean> => {
      if (!client || !host || !hostProposalId) throw new Error('unreachable: query disabled')
      if (host.kind === 'safe') {
        const proposal = await client.readContract({
          address: host.address,
          abi: safeModuleAbi,
          functionName: 'proposal',
          args: [hostProposalId],
        })
        return proposal.executed
      }
      if (host.kind === 'governor') {
        const state = await client.readContract({
          address: host.address,
          abi: confidentialGovernorAbi,
          functionName: 'confidentialState',
          args: [BigInt(hostProposalId)],
        })
        return Number(state) === GOVERNOR_EXECUTED
      }
      return false
    },
  })
}
