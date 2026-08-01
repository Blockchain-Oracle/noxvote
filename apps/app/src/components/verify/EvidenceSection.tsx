import type { ReactNode } from 'react'
import type { Provenance } from '../../state/verification.ts'

/** One evidence section: a titled card whose every value declares where it
 * came from. Mismatches restyle the whole section — prominently. */
export function EvidenceSection({
  title,
  provenance,
  mismatch,
  children,
}: {
  title: string
  provenance: Provenance
  mismatch?: string
  children: ReactNode
}) {
  return (
    <section className={mismatch ? 'card evidence evidence--mismatch' : 'card evidence'}>
      <div className="evidence__head">
        <h2 className="card__title">{title}</h2>
        <span className={`evidence__prov evidence__prov--${provenance} mono`}>
          {provenance === 'onchain' ? 'on-chain' : 'indexed'}
        </span>
      </div>
      {mismatch && <p className="evidence__mismatch">{mismatch}</p>}
      {children}
    </section>
  )
}

export function EvidenceRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="rules__row">
      <dt>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  )
}
