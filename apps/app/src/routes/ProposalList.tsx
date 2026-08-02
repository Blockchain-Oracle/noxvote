import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Eyebrow, MarkGlyph } from '@noxvote/ui'
import { FirstRun } from '../components/FirstRun.tsx'
import { QueryBoundary } from '../components/QueryBoundary.tsx'
import { LifecycleChip } from '../components/LifecycleChip.tsx'
import type { Hex } from '../config/addresses.ts'
import { useBallotList, type RegisteredBallot } from '../hooks/useBallotList.ts'
import { useDetailedState, useBallotRecord } from '../hooks/useBallot.ts'
import { useHost } from '../hooks/useHost.ts'
import { useHostExecuted } from '../hooks/useHostExecuted.ts'
import { ballotTitle, ballotTiming, lifecycleLabel } from '../lib/lifecycle.ts'
import { formatWeight, truncateHex } from '../lib/format.ts'
import { DetailedState } from '../state/chain.ts'

export function ProposalList() {
  const list = useBallotList()
  return (
    <>
      <FirstRun />
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
            {rows.map((row, i) => (
              <ProposalCard key={row.ballotId} ballot={row} index={i} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </>
  )
}

function ProposalCard({ ballot, index }: { ballot: RegisteredBallot; index: number }) {
  const record = useBallotRecord(ballot.core, ballot.ballotId)
  const detailed = useDetailedState(ballot.core, ballot.ballotId, record.data)
  const host = useHost(ballot.core)
  const executed = useHostExecuted(
    host.data,
    ballot.hostProposalId,
    detailed.data === DetailedState.Passed,
  )
  const chip = detailed.data === undefined ? null : lifecycleLabel(detailed.data)
  const live = detailed.data === DetailedState.Open
  const timing = ballotTiming(detailed.data, record.data, host.data?.timestampClock)
  return (
    <Link
      to={detailPath(ballot.core, ballot.ballotId)}
      className="pcard"
      style={{ '--i': index } as CSSProperties}
    >
      <span className="pcard__head">
        <span className="pcard__host">
          <MarkGlyph />
          <span className="host-name">{host.data ? hostLabel(host.data.kind) : '…'}</span>
          <span className="dot-sep" aria-hidden="true">
            ·
          </span>
          <span className="pcard__id mono">{truncateHex(ballot.ballotId, 10, 6)}</span>
        </span>
        <span className="pcard__chipwrap">
          {live && <i className="live-dot" aria-hidden="true" />}
          {chip && <LifecycleChip tone={chip.tone}>{chip.label}</LifecycleChip>}
        </span>
      </span>
      <span className="pcard__title">
        {ballotTitle(ballot.ballotId)}
        {executed.data && <span className="exec-tag">Executed on-chain</span>}
      </span>
      <span className="pcard__rail">
        <span className="rail-left">
          {record.data && (
            <span className="rail-fact">
              <Pips lit={record.data.recordedVoters} total={record.data.privacyFloor} />
              <span className="rail-label mono">
                {record.data.recordedVoters} / {record.data.privacyFloor} floor
              </span>
            </span>
          )}
          {record.data && (
            <>
              <span className="rail-sep" aria-hidden="true" />
              <span className="rail-fact">
                <span className="rail-label mono">weight {formatWeight(record.data.recordedWeight)}</span>
              </span>
            </>
          )}
          {timing && (
            <>
              <span className="rail-sep" aria-hidden="true" />
              <span className="rail-fact">
                <span className={`timing${timing.live ? ' timing--live' : ''}`}>
                  {timing.live && <i className="live-dot" aria-hidden="true" />}
                  {timing.text}
                </span>
              </span>
            </>
          )}
        </span>
        <span className="pcard__cta" aria-hidden="true">
          View record
          <span className="cta-arrow">→</span>
        </span>
      </span>
    </Link>
  )
}

/** Privacy-floor progress — each lit pip is a recorded wallet (DESIGN: the pips
 * are a sanctioned home for the recorded accent). Collapses to the numeric
 * label alone when the floor is too large to read as dots. */
function Pips({ lit, total }: { lit: number; total: number }) {
  if (total < 1 || total > 10) return null
  const on = Math.min(lit, total)
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`pip${i < on ? ' pip--lit' : ''}`} />
      ))}
    </span>
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
