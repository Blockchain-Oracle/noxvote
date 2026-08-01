import { Eyebrow } from '@noxvote/ui'

const PROBLEMS = [
  {
    n: '01',
    title: 'Momentum',
    body: 'Early totals tell later voters which side is already winning. Agreement gets cheaper than judgement.',
  },
  {
    n: '02',
    title: 'Timing power',
    body: 'A large holder who waits until the final block votes with strictly more information than everyone who went first.',
  },
  {
    n: '03',
    title: 'Exposure',
    body: 'A choice attached to a wallet is a choice attached to a person, an employer, and a counterparty who can read it forever.',
  },
]

export function Problem() {
  return (
    <section className="band problem">
      <span className="watermark" aria-hidden="true">
        Tally
      </span>
      <div className="wrap">
        <div className="band__intro">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="d-lg">A public tally changes the vote it is counting.</h2>
          <p className="muted">
            Every open governance forum publishes running totals while voting is still open. That is
            not a neutral act. The count stops measuring preference and starts producing it.
          </p>
        </div>
        <ul className="trio">
          {PROBLEMS.map((item) => (
            <li key={item.n}>
              <span className="trio__n">{item.n}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
