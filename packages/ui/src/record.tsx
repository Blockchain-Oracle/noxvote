import { useStaggerReveal } from './motion.ts'
import { Chip, Redact, type ChipState } from './primitives.tsx'

export type RecordRow = {
  wallet: string
  weight: string
  chip: { state: ChipState; label: string }
}

/**
 * The public record a ballot produces: wallets, weights, statuses — and the
 * sealed choice cell that never resolves. Rows arrive after the lifecycle
 * that produced them (staggered under normal motion).
 */
export function RecordCard({
  title,
  meta,
  rows,
  floor,
  note,
}: {
  title: string
  /** Meta strings; include a visible fixture label whenever rows are fixture data. */
  meta: string[]
  rows: RecordRow[]
  floor: { met: number; of: number; label: string }
  note: string
}) {
  const { ref, shown: visible } = useStaggerReveal<HTMLElement>(rows.length, { step: 110 })

  return (
    <figure className="record" ref={ref}>
      <div className="record__head">
        <span className="record__title">{title}</span>
        <div className="record__meta mono">
          {meta.map((item, i) => (
            <span key={item}>
              {i > 0 && <span aria-hidden="true">&middot;&nbsp;</span>}
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="record__cols">
        <span>Wallet</span>
        <span className="record__weight">Weight</span>
        <span>Choice</span>
        <span>Status</span>
      </div>
      <div>
        {rows.map((row, i) => (
          <div key={row.wallet} className={i < visible ? 'record__row is-in' : 'record__row'}>
            <span className="mono">{row.wallet}</span>
            <span className="mono record__weight">{row.weight}</span>
            <Redact />
            <span>
              <Chip state={row.chip.state}>{row.chip.label}</Chip>
            </span>
          </div>
        ))}
      </div>
      <div className="record__foot">
        <span className="record__floor">
          <span className="record__pips">
            {Array.from({ length: floor.of }, (_, i) => (
              <i key={i} className={i < floor.met ? 'is-on' : undefined} />
            ))}
          </span>
          {floor.label}
        </span>
        <span>{note}</span>
      </div>
    </figure>
  )
}
