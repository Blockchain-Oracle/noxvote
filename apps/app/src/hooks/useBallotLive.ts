import { useQueryClient } from '@tanstack/react-query'
import { useChainId, useWatchContractEvent } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import type { Hex } from '../config/addresses.ts'
import { ballotKeys } from './keys.ts'

const LIVE_EVENTS = ['VoteRecorded', 'TallyRequested', 'TallyWithheld', 'BallotFinalized'] as const

/**
 * Event-driven invalidation: any lifecycle event for this ballot refetches its
 * whole query subtree. Mount once per ballot-scoped screen.
 */
export function useBallotLive(core: Hex, ballotId: Hex) {
  const chainId = useChainId()
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ballotKeys.ballot(chainId, core, ballotId) })
  }
  for (const eventName of LIVE_EVENTS) {
    // Static list — hook order is stable across renders.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useWatchContractEvent({
      address: core,
      abi: confidentialBallotCoreAbi,
      eventName,
      args: { ballotId },
      onLogs: invalidate,
    })
  }
}
