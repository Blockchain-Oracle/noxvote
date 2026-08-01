import { useQuery } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import type { Hex } from '../config/addresses.ts'
import {
  isTerminal,
  type BallotRecordView,
  type BallotReceiptView,
  type DetailedState,
  type Result,
} from '../state/chain.ts'
import { ballotKeys } from './keys.ts'

/** One hook per domain read (plan convention). All of them read the core
 * directly over RPC; the released subgraph only ever enriches, never replaces,
 * these values. */

function useCoreRead() {
  const chainId = useChainId()
  const client = usePublicClient()
  if (!client) throw new Error('wagmi public client missing — providers not mounted')
  return { chainId, client }
}

export function useBallotRecord(core: Hex, ballotId: Hex) {
  const { chainId, client } = useCoreRead()
  return useQuery({
    queryKey: ballotKeys.record(chainId, core, ballotId),
    queryFn: async (): Promise<BallotRecordView> =>
      client.readContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'ballot',
        args: [ballotId],
      }),
  })
}

/**
 * Scheduled → Open → Closed are host-clock transitions no event announces, so
 * this read polls while the ballot is live. When the host clock is plainly a
 * unix timestamp the interval tightens around the next boundary; block-mode
 * hosts poll at the network's cadence. Terminal states stop polling. A revert
 * (e.g. the host's clock mode changed after registration) surfaces as the
 * query's error state — screens render it, nothing crashes.
 */
export function useDetailedState(core: Hex, ballotId: Hex, record?: BallotRecordView) {
  const { chainId, client } = useCoreRead()
  return useQuery({
    queryKey: ballotKeys.detailed(chainId, core, ballotId),
    queryFn: async (): Promise<DetailedState> =>
      (await client.readContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'detailedState',
        args: [ballotId],
      })) as DetailedState,
    refetchInterval: (query) => {
      const state = query.state.data
      if (state !== undefined && isTerminal(state)) return false
      return boundaryAwareInterval(record)
    },
  })
}

const TIMESTAMP_CLOCK_FLOOR = 1_000_000_000 // any live unix-seconds clock exceeds this
const BLOCK_CADENCE_MS = 12_000

function boundaryAwareInterval(record: BallotRecordView | undefined): number {
  if (!record || record.voteStart < TIMESTAMP_CLOCK_FLOOR) return BLOCK_CADENCE_MS
  const now = Date.now() / 1000
  const nextBoundary = now < record.voteStart ? record.voteStart : record.voteEnd
  const untilBoundaryMs = (nextBoundary - now) * 1000
  if (untilBoundaryMs <= 0) return BLOCK_CADENCE_MS
  return Math.min(60_000, Math.max(3_000, untilBoundaryMs))
}

export function useBallotResult(core: Hex, ballotId: Hex) {
  const { chainId, client } = useCoreRead()
  return useQuery({
    queryKey: ballotKeys.result(chainId, core, ballotId),
    queryFn: async (): Promise<Result> =>
      (await client.readContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'result',
        args: [ballotId],
      })) as Result,
  })
}

export function useExpectedVerdictHandle(core: Hex, ballotId: Hex) {
  const { chainId, client } = useCoreRead()
  return useQuery({
    queryKey: ballotKeys.verdictHandle(chainId, core, ballotId),
    queryFn: async (): Promise<Hex> =>
      client.readContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'expectedVerdictHandle',
        args: [ballotId],
      }),
  })
}

export function useReceipt(core: Hex, ballotId: Hex, voter: Hex | undefined) {
  const { chainId, client } = useCoreRead()
  return useQuery({
    queryKey: ballotKeys.receipt(chainId, core, ballotId, voter ?? '0x'),
    enabled: voter !== undefined,
    queryFn: async (): Promise<BallotReceiptView> =>
      client.readContract({
        address: core,
        abi: confidentialBallotCoreAbi,
        functionName: 'receipt',
        args: [ballotId, voter as Hex],
      }),
  })
}
