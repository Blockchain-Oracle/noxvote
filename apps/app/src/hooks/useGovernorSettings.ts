import { useQuery } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialGovernorAbi } from '../abi/confidentialGovernor.ts'
import { profile, type Hex } from '../config/addresses.ts'

export type GovernorSettings = {
  governor: Hex
  votingDelay: bigint
  votingPeriod: bigint
  proposalThreshold: bigint
  maxReplacements: number
  clockMode: string
}

/** The Governor's immutable proposal rules — read-only inputs to the author's
 * config panel (snapshot timing, replacement ceiling, threshold, clock). */
export function useGovernorSettings() {
  const chainId = useChainId()
  const client = usePublicClient()
  const governor = profile.kind === 'sepolia' ? (profile.contracts.governor as Hex) : undefined
  return useQuery({
    queryKey: ['governor-settings', chainId, governor ?? '0x'],
    enabled: client !== undefined && governor !== undefined,
    queryFn: async (): Promise<GovernorSettings> => {
      if (!client || !governor) throw new Error('unreachable')
      const [votingDelay, votingPeriod, proposalThreshold, maxReplacements, clockMode] =
        await Promise.all([
          client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'votingDelay' }),
          client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'votingPeriod' }),
          client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'proposalThreshold' }),
          client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'MAX_REPLACEMENTS' }),
          client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'confidentialClockMode' }),
        ])
      return {
        governor,
        votingDelay,
        votingPeriod,
        proposalThreshold,
        maxReplacements: Number(maxReplacements),
        clockMode,
      }
    },
  })
}
