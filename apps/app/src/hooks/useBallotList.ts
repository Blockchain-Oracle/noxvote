import { useQuery } from '@tanstack/react-query'
import { parseEventLogs } from 'viem'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialBallotCoreAbi } from '../abi/confidentialBallotCore.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { eventsByName, getEventLogs } from '../lib/logs.ts'
import { ballotKeys } from './keys.ts'

const REGISTERED_EVENTS = eventsByName(confidentialBallotCoreAbi as never, ['BallotRegistered'])

export type RegisteredBallot = {
  core: Hex
  ballotId: Hex
  hostProposalId: Hex
  actionHash: Hex
  snapshot: number
  voteStart: number
  voteEnd: number
  privacyFloor: number
  maxReplacements: number
}

async function fetchRegistered(
  client: NonNullable<ReturnType<typeof usePublicClient>>,
  core: Hex,
): Promise<RegisteredBallot[]> {
  const logs = await getEventLogs(client, core, REGISTERED_EVENTS)
  return parseEventLogs({
    abi: confidentialBallotCoreAbi,
    eventName: 'BallotRegistered',
    logs,
  }).map((log) => ({
    core,
    ballotId: log.args.ballotId,
    hostProposalId: log.args.hostProposalId,
    actionHash: log.args.actionHash,
    snapshot: log.args.snapshot,
    voteStart: log.args.voteStart,
    voteEnd: log.args.voteEnd,
    privacyFloor: log.args.privacyFloor,
    maxReplacements: log.args.maxReplacements,
  }))
}

/** Every ballot registered on the profile's cores, newest first. On-chain
 * logs are the only source — nothing is invented for an empty chain. */
export function useBallotList() {
  const chainId = useChainId()
  const client = usePublicClient()
  const cores: Hex[] =
    profile.kind === 'sepolia'
      ? [profile.contracts.safeCore, profile.contracts.governorCore]
      : profile.kind === 'local'
        ? [profile.contracts.safeCore]
        : []
  return useQuery({
    queryKey: [...ballotKeys.core(chainId, cores[0] ?? '0x'), 'list', cores.length],
    enabled: client !== undefined && cores.length > 0,
    queryFn: async () => {
      if (!client) return []
      const perCore = await Promise.all(cores.map((core) => fetchRegistered(client, core)))
      return perCore.flat().reverse()
    },
  })
}
