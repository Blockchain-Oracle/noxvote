import type { ReactNode } from 'react'
import { COPY } from '../../lib/copy.ts'
import { formatDateTime, formatWeight } from '../../lib/format.ts'
import { CopyHash } from '../Hashes.tsx'
import type { BallotRecordView } from '../../state/chain.ts'
import type { HostInfo } from '../../hooks/useHost.ts'

/** Immutable ballot rules — visible before voting, every field from the
 * chain. Privacy floor and governance quorum are separate rows by law. */
export function RulesCard({
  record,
  host,
  quorum,
}: {
  record: BallotRecordView
  host: HostInfo | undefined
  quorum: bigint | undefined
}) {
  const clock = (value: number) =>
    host === undefined ? '—' : host.timestampClock ? formatDateTime(value) : `block ${value.toLocaleString('en-US')}`
  return (
    <section className="card">
      <h2 className="card__title">Ballot rules</h2>
      <dl className="rules">
        <Row label="Choices" value="For / Against / Abstain" />
        <Row label="Weight snapshot" value={clock(record.snapshot)} />
        <Row
          label="Governance quorum"
          value={
            quorum === undefined
              ? 'Resolving from host…'
              : `${formatWeight(quorum)} voting weight including Abstain`
          }
        />
        <Row label="Passage" value="For weight greater than Against weight" />
        <Row
          label="Privacy floor"
          value={`${record.privacyFloor} unique eligible wallets with Recorded operations; Abstain counts`}
        />
        <Row
          label="Replacements"
          value={`Up to ${record.maxReplacements}; latest accepted counts`}
        />
        <Row label="Opens" value={clock(record.voteStart)} />
        <Row label="Closes" value={clock(record.voteEnd)} />
        <Row label="Action commitment" value={<CopyHash value={record.actionHash} />} />
      </dl>
      <p className="card__note">{COPY.totalsNotDisclosed}. Only the final verdict is published.</p>
    </section>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rules__row">
      <dt>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  )
}
