import { BOUNDARIES } from '../../state/install.ts'
import { COPY } from '../../lib/copy.ts'

/** Screen 1: the four public/private boundaries, explained before Install. */
export function Boundaries() {
  return (
    <section className="card">
      <h2 className="card__title">What is public, what is private</h2>
      <div className="boundaries">
        <div className="boundaries__head">
          <span className="boundaries__col-public">Public</span>
          <span className="boundaries__col-private">Private</span>
        </div>
        {BOUNDARIES.map((row) => (
          <div className="boundaries__row" key={row.public}>
            <span>{row.public}</span>
            <span>{row.private}</span>
          </div>
        ))}
      </div>
      <p className="card__note">{COPY.promise}</p>
    </section>
  )
}
