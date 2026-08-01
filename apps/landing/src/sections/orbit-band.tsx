import { Eyebrow, OrbitConstellation, RecordCard, type RecordRow } from '@noxvote/ui'

/* SIMULATED_DEMO_ONLY — the accepted demo record, visibly labeled (SPEC R8).
 * Removed the moment this band wires to real data. */
const FIXTURE_ROWS: RecordRow[] = [
  { wallet: '0x3D91…bb21', weight: '2,400', chip: { state: 'recorded', label: 'Recorded' } },
  { wallet: '0xAf02…9C77', weight: '5,110', chip: { state: 'recorded', label: 'Recorded' } },
  { wallet: '0x8E4c…1D05', weight: '1,890', chip: { state: 'recorded', label: 'Recorded' } },
  { wallet: '0xB7a1…33F0', weight: '3,050', chip: { state: 'withheld', label: 'Computing' } },
]

export function OrbitBand() {
  return (
    <section className="band" id="orbit">
      <div className="wrap">
        <div className="band__intro">
          <Eyebrow>The lifecycle</Eyebrow>
          <h2 className="d-lg">Five stages. One of them is unreadable.</h2>
          <p className="muted">
            What becomes public at each step: your wallet, your voting weight, and the time you
            acted. Your choice is not among them, at any stage.
          </p>
        </div>

        <OrbitConstellation />

        <RecordCard
          title="Fund the ZK security review"
          meta={[
            'Abu Research Safe',
            'Ethereum Sepolia (11155111)',
            '0x8f2a…91c4',
            'Fixture — demo record',
          ]}
          rows={FIXTURE_ROWS}
          floor={{ met: 3, of: 4, label: '3 of 4 recorded — privacy floor pending' }}
          note="Choices are never rendered here."
        />
      </div>
    </section>
  )
}
