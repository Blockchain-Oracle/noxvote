import { Link } from 'react-router'
import { Eyebrow } from '@noxvote/ui'
import { QueryBoundary } from '../components/QueryBoundary.tsx'
import { LifecycleChip } from '../components/LifecycleChip.tsx'
import type { Hex } from '../config/addresses.ts'
import { useBallotList, type RegisteredBallot } from '../hooks/useBallotList.ts'
import { useDetailedState, useBallotRecord } from '../hooks/useBallot.ts'
import { useHost } from '../hooks/useHost.ts'
import { ballotTitle, lifecycleLabel } from '../lib/lifecycle.ts'
import { truncateHex } from '../lib/format.ts'

export function ProposalList() {
  const list = useBallotList()
  return (
    <>
      <Eyebrow>Confidential outcome</Eyebrow>
      <h1 className="d-lg list__title">Proposals</h1>
      <p className="lead muted list__lead">
        Every ballot below is a live on-chain record. Participation is public; choices and exact
        totals are not.
      </p>
      <QueryBoundary
        query={list}
        skeletonLines={4}
        empty={{
          title: 'No ballots registered yet',
          body: 'This network has no confidential ballots on the configured cores. Registered ballots appear here without any indexer.',
        }}
        isEmpty={(rows) => rows.length === 0}
      >
        {(rows) => (
          <div className="list__rows">
            {rows.map((row) => (
              <ProposalRow key={row.ballotId} ballot={row} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  )
}

function ProposalRow({ ballot }: { ballot: RegisteredBallot }) {
  const detailed = useDetailedState(ballot.core, ballot.ballotId)
  const record = useBallotRecord(ballot.core, ballot.ballotId)
  const host = useHost(ballot.core)
  const chip = detailed.data !== undefined ? lifecycleLabel(detailed.data) : null
  return (
    <Link to={detailPath(ballot.core, ballot.ballotId)} className="prop-row">
      <span className="prop-row__main">
        <span className="prop-row__title">{ballotTitle(ballot.ballotId)}</span>
        <span className="prop-row__meta mono">
          {host.data ? hostLabel(host.data.kind) : '…'} · {truncateHex(ballot.ballotId, 10, 6)}
        </span>
      </span>
      <span className="prop-row__side">
        {record.data && (
          <span className="prop-row__floor mono">
            {record.data.recordedVoters} / {record.data.privacyFloor} floor
          </span>
        )}
        {chip && <LifecycleChip tone={chip.tone}>{chip.label}</LifecycleChip>}
      </span>
    </Link>
  )
}

function hostLabel(kind: 'safe' | 'governor' | 'unknown'): string {
  if (kind === 'safe') return 'Safe'
  if (kind === 'governor') return 'Governor'
  return 'Host'
}

export function detailPath(core: Hex, ballotId: Hex): string {
  return `/b/${core}/${ballotId}`
}
