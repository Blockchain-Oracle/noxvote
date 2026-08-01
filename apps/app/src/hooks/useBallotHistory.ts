import { useQuery } from '@tanstack/react-query'
import { parseEventLogs } from 'viem'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import type { Hex } from '../config/addresses.ts'
import { eventsByName, getEventLogs } from '../lib/logs.ts'
import { ballotKeys } from './keys.ts'

const HISTORY_EVENTS = eventsByName(confidentialBallotCoreAbi as never, [
  'VoteRecorded',
  'TallyRequested',
  'TallyWithheld',
  'BallotFinalized',
])

export type RecordedOperation = {
  voter: Hex
  sequence: bigint
  replacement: boolean
  weight: bigint
  txHash: Hex
  blockNumber: bigint
}

export type BallotHistory = {
  operations: RecordedOperation[]
  tallyRequested: { expectedVerdictHandle: Hex; txHash: Hex } | null
  tallyWithheld: { recordedVoters: number; privacyFloor: number; txHash: Hex } | null
  finalized: { result: number; txHash: Hex } | null
}

/** The ballot's complete public event history, straight from the core's own
 * logs — the verification center's operation record and provenance chain. */
export function useBallotHistory(core: Hex, ballotId: Hex) {
  const chainId = useChainId()
  const client = usePublicClient()
  return useQuery({
    queryKey: [...ballotKeys.ballot(chainId, core, ballotId), 'history'],
    enabled: client !== undefined,
    queryFn: async (): Promise<BallotHistory> => {
      if (!client) throw new Error('unreachable: query disabled')
      const raw = await getEventLogs(client, core, HISTORY_EVENTS)
      const forBallot = <T extends { args: { ballotId?: Hex } }>(logs: T[]) =>
        logs.filter((log) => log.args.ballotId === ballotId)

      const recorded = forBallot(
        parseEventLogs({ abi: confidentialBallotCoreAbi, eventName: 'VoteRecorded', logs: raw }),
      )
      const requested = forBallot(
        parseEventLogs({ abi: confidentialBallotCoreAbi, eventName: 'TallyRequested', logs: raw }),
      )[0]
      const withheld = forBallot(
        parseEventLogs({ abi: confidentialBallotCoreAbi, eventName: 'TallyWithheld', logs: raw }),
      )[0]
      const finalized = forBallot(
        parseEventLogs({ abi: confidentialBallotCoreAbi, eventName: 'BallotFinalized', logs: raw }),
      )[0]

      return {
        operations: recorded.map((log) => ({
          voter: log.args.voter,
          sequence: log.args.sequence,
          replacement: log.args.replacement,
          weight: log.args.weight,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })),
        tallyRequested: requested
          ? {
              expectedVerdictHandle: requested.args.expectedVerdictHandle,
              txHash: requested.transactionHash,
            }
          : null,
        tallyWithheld: withheld
          ? {
              recordedVoters: withheld.args.recordedVoters,
              privacyFloor: withheld.args.privacyFloor,
              txHash: withheld.transactionHash,
            }
          : null,
        finalized: finalized
          ? { result: finalized.args.result, txHash: finalized.transactionHash }
          : null,
      }
    },
  })
}
