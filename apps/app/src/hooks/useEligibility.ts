import { useQuery } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'
import { ivotesSnapshotStrategyAbi } from '../abi/iVotesSnapshotStrategy.ts'
import type { Hex } from '../config/addresses.ts'
import type { BallotRecordView } from '../state/chain.ts'
import { ballotKeys } from './keys.ts'

/**
 * Public eligibility weight via the ballot's own strategy (`weightOf` is the
 * shared IEligibilityStrategy surface; both production strategies implement
 * it). Weight zero is an honest "not eligible at this snapshot"; a Merkle
 * ballot additionally needs the caller-supplied proof to resolve above zero.
 */
export function useEligibilityWeight(
  core: Hex,
  ballotId: Hex,
  record: BallotRecordView | undefined,
  voter: Hex | undefined,
  eligibilityData?: { config: Hex; proof: Hex },
) {
  const chainId = useChainId()
  const client = usePublicClient()
  return useQuery({
    queryKey: ballotKeys.eligibility(chainId, core, ballotId, voter ?? '0x'),
    enabled: client !== undefined && record !== undefined && voter !== undefined,
    queryFn: async (): Promise<bigint> => {
      if (!client || !record || !voter) return 0n
      return client.readContract({
        address: record.eligibilityStrategy,
        abi: ivotesSnapshotStrategyAbi,
        functionName: 'weightOf',
        args: [voter, record.snapshot, eligibilityData?.config ?? '0x', eligibilityData?.proof ?? '0x'],
      })
    },
  })
}
