import { Eyebrow } from '@noxvote/ui'

const DENIALS = [
  {
    term: 'Client-side encryption',
    body: 'The Handle Gateway prepares the input and sees it. Nothing is encrypted in your browser, and we do not say it is.',
  },
  {
    term: 'Anonymity',
    body: 'Your wallet, your weight, and the time you acted are all on-chain and linkable. Only the choice is withheld.',
  },
  {
    term: 'Receipt-freeness',
    body: 'Nothing here stops you from proving to someone else how you voted, if you decide to.',
  },
  {
    term: 'Bribe resistance',
    body: 'Replacement voting raises the cost of buying a vote, because the last accepted operation is the one that counts. It does not eliminate it.',
  },
  {
    term: 'A full tally proof',
    body: 'The evidence shows the configured Gateway signed a plaintext for the stored expected handle. That is a signature, not a proof of the computation.',
  },
]

export function Limits() {
  return (
    <section className="band">
      <div className="wrap">
        <div className="band__intro">
          <Eyebrow>Stated limits</Eyebrow>
          <h2 className="d-lg">What this does not promise.</h2>
          <p className="muted">
            Several of these are achievable, and some are ahead of us. None of them are what the
            module does today, so none of them are claimed today.
          </p>
        </div>
        <div className="deny">
          {DENIALS.map((item) => (
            <div key={item.term} className="deny__row">
              <div className="deny__term">{item.term}</div>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
