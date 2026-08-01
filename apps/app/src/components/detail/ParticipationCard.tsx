import { RedactedResult } from '../QueryBoundary.tsx'
import { formatWeight } from '../../lib/format.ts'
import type { BallotRecordView } from '../../state/chain.ts'

/**
 * Public participation only: unique recorded wallets against the privacy
 * floor (each lit pip is a recorded wallet), recorded weight, and the sealed
 * running result. Never a percentage, never an option split.
 */
export function ParticipationCard({ record }: { record: BallotRecordView }) {
  const met = Math.min(record.recordedVoters, record.privacyFloor)
  return (
    <section className="card">
      <h2 className="card__title">Participation</h2>
      <dl className="rules">
        <div className="rules__row">
          <dt>Recorded participants</dt>
          <dd className="mono">{record.recordedVoters} unique wallets</dd>
        </div>
        <div className="rules__row">
          <dt>Recorded weight</dt>
          <dd className="mono">{formatWeight(record.recordedWeight)}</dd>
        </div>
      </dl>
      <div className="record__floor participation__floor">
        <span className="record__pips">
          {Array.from({ length: record.privacyFloor }, (_, i) => (
            <i key={i} className={i < met ? 'is-on' : undefined} />
          ))}
        </span>
        Privacy floor {record.recordedVoters >= record.privacyFloor ? 'met' : 'not met'}:{' '}
        {record.recordedVoters} / {record.privacyFloor}
      </div>
      <RedactedResult />
    </section>
  )
}
