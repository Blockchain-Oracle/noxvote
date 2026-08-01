import { Eyebrow } from '@noxvote/ui'

const TRUSTED = [
  'The Handle Gateway, which sees the input before it is sealed.',
  'The Nox TEE stack that performs the confidential computation.',
  'A single-node KMS holding the decryption key.',
  'The Gateway signer whose signature the evidence rests on.',
  'The deployed module code, which binds proposal, type, and replay.',
]

const CHECKED = [
  'That the configured Gateway signed this plaintext for the stored expected handle.',
  'That module state binds the proposal, the operation type, and replay protection.',
]

const FACTS = [
  { n: '36', l: 'Solidity source files under src/contracts' },
  { n: '119', l: 'Forge tests, full suite green' },
  { n: '960,000', l: 'Modeled calls across the stateful invariant profile' },
  { n: '<0.6s', l: 'From ballot close to verdict proof on the released local stack' },
]

export function Trust() {
  return (
    <section className="band band--lifted" id="trust">
      <div className="wrap">
        <div className="band__intro">
          <Eyebrow>Trust boundary</Eyebrow>
          <h2 className="d-lg">Who you are trusting, named.</h2>
          <p className="muted">
            A confidentiality claim is only as good as the list of parties who could break it.
            Here is ours, in full.
          </p>
        </div>
        <div className="trust">
          <div className="trust__col">
            <h3>Trusted today</h3>
            <ul className="trust__items">
              {TRUSTED.map((item, i) => (
                <li key={item}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="trust__col">
            <h3>What the proof actually checks</h3>
            <ul className="trust__items">
              {CHECKED.map((item, i) => (
                <li key={item}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="limit">
              <strong>The limitation we will not bury</strong>
              <p>
                The released Nox stack uses one KMS node holding the full private key. That is
                weaker than a threshold committee, where no single operator can decrypt alone. It
                belongs here, not in a footnote.
              </p>
            </div>
          </div>
        </div>

        <div className="facts" id="evidence">
          {FACTS.map((fact) => (
            <div key={fact.l}>
              <div className="facts__n">{fact.n}</div>
              <div className="facts__l">{fact.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
