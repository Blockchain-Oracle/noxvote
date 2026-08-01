import { Link, useParams } from 'react-router'
import { Eyebrow } from '@noxvote/ui'
import { ErrorState, Skeleton } from '../components/QueryBoundary.tsx'
import { LifecycleChip } from '../components/LifecycleChip.tsx'
import { ExecutionPanel } from '../components/detail/ExecutionPanel.tsx'
import { ParticipationCard } from '../components/detail/ParticipationCard.tsx'
import { RulesCard } from '../components/detail/RulesCard.tsx'
import { TallyFlow } from '../components/detail/TallyFlow.tsx'
import { VoteFlow } from '../components/vote/VoteFlow.tsx'
import { activeChain } from '../config/chains.ts'
import type { Hex } from '../config/addresses.ts'
import {
  useBallotRecord,
  useBallotResult,
  useDetailedState,
  useExpectedVerdictHandle,
} from '../hooks/useBallot.ts'
import { GuaranteeOverlay } from '../components/GuaranteeOverlay.tsx'
import { useBallotLive } from '../hooks/useBallotLive.ts'
import { useExecutionFacts } from '../hooks/useExecution.ts'
import { useGovernanceQuorum, useHost } from '../hooks/useHost.ts'
import { useHostExecuted } from '../hooks/useHostExecuted.ts'
import { ballotTitle, lifecycleLabel } from '../lib/lifecycle.ts'
import { LIFECYCLE_LABELS } from '../lib/copy.ts'
import { formatDateTime, formatRemaining, truncateHex } from '../lib/format.ts'
import { useState } from 'react'
import { DetailedState } from '../state/chain.ts'
import { executionState } from '../state/execution.ts'
import { useExecuteHost } from '../write/execute.ts'

export function ProposalDetail() {
  const params = useParams()
  const core = params.core as Hex
  const ballotId = params.ballotId as Hex

  const record = useBallotRecord(core, ballotId)
  const detailed = useDetailedState(core, ballotId, record.data)
  const result = useBallotResult(core, ballotId)
  const verdictHandle = useExpectedVerdictHandle(core, ballotId)
  const host = useHost(core)
  const quorum = useGovernanceQuorum(
    host.data?.address,
    record.data?.hostProposalId ?? '0x',
    record.data?.snapshot ?? 0,
  )
  const executed = useHostExecuted(
    host.data,
    record.data?.hostProposalId,
    detailed.data === DetailedState.Passed,
  )
  const [guaranteeOpen, setGuaranteeOpen] = useState(false)
  useBallotLive(core, ballotId)

  if (record.isError || detailed.isError) {
    const error = record.error ?? detailed.error
    return (
      <ErrorState
        message={
          (error as { shortMessage?: string })?.shortMessage ??
          'This ballot could not be read on the selected network.'
        }
        onRetry={() => {
          void record.refetch()
          void detailed.refetch()
        }}
      />
    )
  }
  if (record.isPending || detailed.isPending || record.data === undefined) {
    return <Skeleton lines={6} />
  }
  if (detailed.data === DetailedState.Uninitialized) {
    return (
      <ErrorState message="This ballot is not registered on the selected network. Check the link's network and ballot id." />
    )
  }

  const chip = executed.data
    ? { label: LIFECYCLE_LABELS.executed, tone: 'neutral' as const }
    : lifecycleLabel(detailed.data)

  return (
    <>
      <p className="detail__back">
        <Link to="/">&larr; All proposals</Link>
      </p>
      <header className="detail__head">
        <Eyebrow>Confidential outcome</Eyebrow>
        <h1 className="d-lg">{ballotTitle(ballotId)}</h1>
        <p className="detail__meta mono">
          {activeChain.name} · ballot {truncateHex(ballotId, 10, 6)} · proposal{' '}
          {truncateHex(record.data.hostProposalId, 10, 6)}
        </p>
        <p className="detail__status">
          <LifecycleChip tone={chip.tone}>{chip.label}</LifecycleChip>
          <StatusLine detailed={detailed.data} record={record.data} timestampClock={host.data?.timestampClock} />
          <Link className="detail__verify" to={`/b/${core}/${ballotId}/verify`}>
            Verification center
          </Link>
          <button
            type="button"
            className="detail__verify detail__guarantee"
            onClick={() => setGuaranteeOpen(true)}
          >
            What is guaranteed?
          </button>
        </p>
      </header>
      <GuaranteeOverlay
        open={guaranteeOpen}
        onClose={() => setGuaranteeOpen(false)}
        verifyPath={`/b/${core}/${ballotId}/verify`}
        core={core}
      />
      <div className="detail__grid">
        <RulesCard record={record.data} host={host.data} quorum={quorum.data} />
        <div className="detail__col">
          <ParticipationCard record={record.data} />
          <VoteFlow
            core={core}
            ballotId={ballotId}
            record={record.data}
            detailed={detailed.data}
            timestampClock={host.data?.timestampClock}
          />
        </div>
      </div>
      <TallyFlow
        core={core}
        ballotId={ballotId}
        record={record.data}
        detailed={detailed.data}
        result={result.data}
        expectedVerdictHandle={verdictHandle.data}
        loading={verdictHandle.isPending || result.isPending}
        host={host.data}
      />
      <HostExecution core={core} recordData={record.data} hostData={host.data} resultData={result.data} />
    </>
  )
}

function HostExecution({
  core,
  recordData,
  hostData,
  resultData,
}: {
  core: Hex
  recordData: NonNullable<ReturnType<typeof useBallotRecord>['data']>
  hostData: ReturnType<typeof useHost>['data']
  resultData: ReturnType<typeof useBallotResult>['data']
}) {
  const facts = useExecutionFacts(core, recordData, hostData, resultData)
  const executor = useExecuteHost(hostData?.address)
  const state = executionState(facts.data, executor.progress)
  const data = facts.data
  return (
    <ExecutionPanel
      state={state}
      onQueue={
        data?.governorData ? () => executor.queueGovernor(data.governorData!) : undefined
      }
      onExecute={
        data?.hostKind === 'safe' && data.actions
          ? () => executor.executeSafe(recordData.hostProposalId, data.actions!)
          : data?.governorData
            ? () => executor.executeGovernor(data.governorData!)
            : undefined
      }
    />
  )
}

function StatusLine({
  detailed,
  record,
  timestampClock,
}: {
  detailed: DetailedState
  record: { voteStart: number; voteEnd: number }
  timestampClock: boolean | undefined
}) {
  if (timestampClock === undefined) return null
  if (!timestampClock) {
    if (detailed === DetailedState.Scheduled)
      return <span className="mono muted">opens at block {record.voteStart.toLocaleString('en-US')}</span>
    if (detailed === DetailedState.Open)
      return <span className="mono muted">closes at block {record.voteEnd.toLocaleString('en-US')}</span>
    return null
  }
  if (detailed === DetailedState.Scheduled)
    return <span className="mono muted">opens {formatDateTime(record.voteStart)}</span>
  if (detailed === DetailedState.Open)
    return <span className="mono muted">{formatRemaining(record.voteEnd * 1000 - Date.now())}</span>
  return null
}
