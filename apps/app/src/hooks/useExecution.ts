import { useQuery } from '@tanstack/react-query'
import { keccak256, parseEventLogs, stringToHex } from 'viem'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialGovernorAbi } from '../abi/confidentialGovernor.ts'
import { safeModuleAbi } from '../abi/safeConfidentialVotingModule.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { eventsByName, getEventLogs } from '../lib/logs.ts'
import { Result, type BallotRecordView } from '../state/chain.ts'
import type { CommittedAction, ExecutionFacts } from '../state/execution.ts'
import type { HostInfo } from './useHost.ts'

const SAFE_EVENTS = eventsByName(safeModuleAbi as never, ['SafeProposalExecuted'])
const GOVERNOR_EVENTS = eventsByName(confidentialGovernorAbi as never, [
  'ProposalCreated',
  'ProposalQueued',
  'ProposalExecuted',
])

/** Governor queue/execute arguments recovered from its own ProposalCreated
 * log — the chain is the only source; nothing is retyped by hand. */
export type GovernorProposalData = {
  targets: Hex[]
  values: bigint[]
  calldatas: Hex[]
  descriptionHash: Hex
}

export function useExecutionFacts(
  core: Hex,
  record: BallotRecordView | undefined,
  host: HostInfo | undefined,
  result: Result | undefined,
) {
  const chainId = useChainId()
  const client = usePublicClient()
  return useQuery({
    queryKey: ['execution', chainId, core, record?.hostProposalId ?? '0x'],
    enabled: client !== undefined && record !== undefined && host !== undefined,
    queryFn: async (): Promise<ExecutionFacts & { governorData?: GovernorProposalData }> => {
      if (!client || !record || !host) throw new Error('unreachable: query disabled')
      const passed = result === Result.Passed
      if (host.kind === 'safe') {
        const proposal = await client.readContract({
          address: host.address,
          abi: safeModuleAbi,
          functionName: 'proposal',
          args: [record.hostProposalId],
        })
        const executedLogs = parseEventLogs({
          abi: safeModuleAbi,
          eventName: 'SafeProposalExecuted',
          logs: await getEventLogs(client, host.address, SAFE_EVENTS),
        }).filter((log) => log.args.safeProposalId === record.hostProposalId)
        const actions = localSafeActions(record.hostProposalId)
        return {
          passed,
          hostKind: 'safe',
          executed: proposal.executed,
          executor: executedLogs[0]?.args.executor,
          executionTx: executedLogs[0]?.transactionHash,
          actions,
          actionHash: record.actionHash,
        }
      }
      if (host.kind === 'governor') {
        const proposalId = BigInt(record.hostProposalId)
        const logs = await getEventLogs(client, host.address, GOVERNOR_EVENTS)
        const created = parseEventLogs({
          abi: confidentialGovernorAbi,
          eventName: 'ProposalCreated',
          logs,
        }).find((log) => log.args.proposalId === proposalId)
        const queuedLog = parseEventLogs({
          abi: confidentialGovernorAbi,
          eventName: 'ProposalQueued',
          logs,
        }).find((log) => log.args.proposalId === proposalId)
        const executedLog = parseEventLogs({
          abi: confidentialGovernorAbi,
          eventName: 'ProposalExecuted',
          logs,
        }).find((log) => log.args.proposalId === proposalId)
        const [needsQueuing, eta] = await Promise.all([
          client.readContract({
            address: host.address,
            abi: confidentialGovernorAbi,
            functionName: 'proposalNeedsQueuing',
            args: [proposalId],
          }),
          client.readContract({
            address: host.address,
            abi: confidentialGovernorAbi,
            functionName: 'proposalEta',
            args: [proposalId],
          }),
        ])
        const actions: CommittedAction[] | null = created
          ? created.args.targets.map((to, i) => ({
              to,
              value: created.args.values[i],
              data: created.args.calldatas[i],
            }))
          : null
        return {
          passed,
          hostKind: 'governor',
          executed: executedLog !== undefined,
          executionTx: executedLog?.transactionHash,
          needsQueuing,
          queued: queuedLog !== undefined,
          eta: Number(eta),
          actions,
          actionHash: record.actionHash,
          governorData: created
            ? {
                targets: [...created.args.targets],
                values: [...created.args.values],
                calldatas: [...created.args.calldatas],
                descriptionHash: keccak256(stringToHex(created.args.description)),
              }
            : undefined,
        }
      }
      return {
        passed,
        hostKind: 'unknown',
        executed: false,
        actions: null,
        actionHash: record.actionHash,
      }
    },
  })
}

/** Organizer-provided Safe execution bundle from the local profile — the
 * module verifies it against the committed hash before anything runs. */
function localSafeActions(safeProposalId: Hex): CommittedAction[] | null {
  if (profile.kind !== 'local' || !profile.actions) return null
  const entry = profile.actions[safeProposalId.toLowerCase()]
  if (!entry) return null
  return entry.map((a) => ({ to: a.to, value: BigInt(a.value), data: a.data }))
}
