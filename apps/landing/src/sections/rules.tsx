import { Eyebrow } from '@noxvote/ui'

/* SIMULATED_DEMO_ONLY — example commitment, visibly labeled (SPEC R8).
 * Values are consistent with the judged demo configuration: privacy floor
 * four, at most two replacements, quorum over the fixture weights. */
const RULES: Array<[string, string]> = [
  ['Choices', 'For / Against / Abstain'],
  ['Weight snapshot', 'NOX Votes at block 7,482,119'],
  ['Governance quorum', '10,000 weight, incl. Abstain'],
  ['Passage', 'For weight above Against weight'],
  ['Privacy floor', '4 unique recorded wallets'],
  ['Replacements', 'Up to 2, latest accepted counts'],
  ['Window', '29 Jul 2026, 18:00–19:00 WAT'],
  ['Committed action', '1,000 USDC to 0xD0c3…3e91'],
  ['Calldata hash', '0x2a11…f08d'],
]

export function Rules() {
  return (
    <section className="band band--lifted" id="rules">
      <div className="wrap rules">
        <div>
          <Eyebrow>Committed rules</Eyebrow>
          <h2 className="d-lg">Fixed when the record opens. Unchangeable afterwards.</h2>
          <p className="rules__note">
            The <strong>privacy floor</strong> and the <strong>governance quorum</strong> are
            different rules and are never merged. The floor decides whether any result may be
            disclosed at all. The quorum decides whether the proposal passes.
          </p>
        </div>
        <dl className="rules__panel">
          {RULES.map(([term, value]) => (
            <div key={term} className="rules__row">
              <dt>{term}</dt>
              <dd className="mono">{value}</dd>
            </div>
          ))}
          <div className="rules__fixture mono">Fixture — example commitment, not a live ballot.</div>
        </dl>
      </div>
    </section>
  )
}
