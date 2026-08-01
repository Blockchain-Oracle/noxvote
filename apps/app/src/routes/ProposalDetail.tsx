import { Link, useParams } from 'react-router'
import { Eyebrow } from '@noxvote/ui'
import { ErrorState, Skeleton } from '../components/QueryBoundary.tsx'
import { LifecycleChip } from '../components/LifecycleChip.tsx'
import { ParticipationCard } from '../components/detail/ParticipationCard.tsx'
import { RulesCard } from '../components/detail/RulesCard.tsx'
import { TallyPanel } from '../components/detail/TallyPanel.tsx'
import { VoterCard } from '../components/detail/VoterCard.tsx'
import { activeChain } from '../config/chains.ts'
import type { Hex } from '../config/addresses.ts'
import {
  useBallotRecord,
  useBallotResult,
  useDetailedState,
  useExpectedVerdictHandle,
} from '../hooks/useBallot.ts'
import { useBallotLive } from '../hooks/useBallotLive.ts'
import { useGovernanceQuorum, useHost } from '../hooks/useHost.ts'
import { ballotTitle, lifecycleLabel } from '../lib/lifecycle.ts'
import { formatDateTime, formatRemaining, truncateHex } from '../lib/format.ts'
import { DetailedState } from '../state/chain.ts'
import { tallyState } from '../state/tally.ts'

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

  const chip = lifecycleLabel(detailed.data)
  const tally = tallyState({
    loading: verdictHandle.isPending || result.isPending,
    detailed: detailed.data,
    record: record.data,
    expectedVerdictHandle: verdictHandle.data,
    result: result.data,
    request: { status: 'idle' },
    proof: { status: 'idle' },
    finalize: { status: 'idle' },
  })

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
        </p>
      </header>
      <div className="detail__grid">
        <RulesCard record={record.data} host={host.data} quorum={quorum.data} />
        <div className="detail__col">
          <ParticipationCard record={record.data} />
          <VoterCard core={core} ballotId={ballotId} record={record.data} detailed={detailed.data} />
        </div>
      </div>
      <TallyPanel state={tally} host={host.data} />
    </>
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
