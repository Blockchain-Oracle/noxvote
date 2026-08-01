import { useQuery } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import { ivotesSnapshotStrategyAbi } from '../abi/iVotesSnapshotStrategy.ts'
import type { Hex } from '../config/addresses.ts'
import type { BallotRecordView } from '../state/chain.ts'
import { ballotKeys } from './keys.ts'

/**
 * Public eligibility weight via the ballot's own strategy and its stored
 * config (`weightOf` is the shared IEligibilityStrategy surface). Weight zero
 * is an honest "not eligible at this snapshot". A Merkle-allowlist ballot
 * resolves above zero only with the organizer-provided proof — without one
 * the query errors and the screen says so; it never guesses.
 */
export function useEligibilityWeight(
  core: Hex,
  ballotId: Hex,
  record: BallotRecordView | undefined,
  voter: Hex | undefined,
  proof: Hex = '0x',
) {
  const chainId = useChainId()
  const client = usePublicClient()
  return useQuery({
    queryKey: ballotKeys.eligibility(chainId, core, ballotId, voter ?? '0x'),
    enabled: client !== undefined && record !== undefined && voter !== undefined,
    retry: false,
    queryFn: async (): Promise<bigint> => {
      if (!client || !record || !voter) throw new Error('unreachable: query disabled')
      const config = await client.readContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'eligibilityConfig',
        args: [ballotId],
      })
      return client.readContract({
        address: record.eligibilityStrategy,
        abi: ivotesSnapshotStrategyAbi,
        functionName: 'weightOf',
        args: [voter, record.snapshot, config, proof],
      })
    },
  })
}
