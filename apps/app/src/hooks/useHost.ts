import { useQuery } from '@tanstack/react-query'
import { parseAbi } from 'viem'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { ballotKeys } from './keys.ts'

/** IConfidentialHost — both production hosts implement it. */
const hostAbi = parseAbi([
  'function confidentialClockMode() view returns (string)',
  'function governanceQuorum(bytes32 hostProposalId, uint48 snapshot) view returns (uint256)',
])

export type HostKind = 'safe' | 'governor' | 'unknown'

export type HostInfo = {
  address: Hex
  kind: HostKind
  /** ERC-6372 string, e.g. `mode=timestamp` or `mode=blocknumber`. */
  clockMode: string
  timestampClock: boolean
}

/** The core's host plus its clock mode — read, never guessed, so
 * opens/closes render as dates only when the host really counts in time. */
export function useHost(core: Hex) {
  const chainId = useChainId()
  const client = usePublicClient()
  return useQuery({
    queryKey: [...ballotKeys.core(chainId, core), 'host'],
    enabled: client !== undefined,
    queryFn: async (): Promise<HostInfo> => {
      if (!client) throw new Error('unreachable: query disabled')
      const address = await client.readContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'host',
      })
      const clockMode = await client.readContract({
        address,
        abi: hostAbi,
        functionName: 'confidentialClockMode',
      })
      return {
        address,
        kind: hostKind(address),
        clockMode,
        timestampClock: clockMode.includes('timestamp'),
      }
    },
  })
}

function hostKind(host: Hex): HostKind {
  if (profile.kind !== 'sepolia' && profile.kind !== 'local') return 'unknown'
  const contracts = profile.contracts
  if (host.toLowerCase() === contracts.safeModule?.toLowerCase()) return 'safe'
  if (host.toLowerCase() === contracts.governor?.toLowerCase()) return 'governor'
  return 'unknown'
}

/** The host-committed governance quorum for a proposal snapshot (distinct
 * from the privacy floor, visually and verbally — DESIGN law). */
export function useGovernanceQuorum(
  host: Hex | undefined,
  hostProposalId: Hex,
  snapshot: number,
) {
  const chainId = useChainId()
  const client = usePublicClient()
  return useQuery({
    queryKey: ['host-quorum', chainId, host ?? '0x', hostProposalId, snapshot],
    enabled: client !== undefined && host !== undefined,
    queryFn: async (): Promise<bigint> => {
      if (!client || !host) throw new Error('unreachable: query disabled')
      return client.readContract({
        address: host,
        abi: hostAbi,
        functionName: 'governanceQuorum',
        args: [hostProposalId, snapshot],
      })
    },
  })
}
