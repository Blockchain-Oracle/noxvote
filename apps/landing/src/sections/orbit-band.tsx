import { DOCS_URL, Eyebrow, OrbitConstellation } from '@noxvote/ui'

export function OrbitBand() {
  return (
    <section className="band" id="orbit">
      <div className="wrap">
        <div className="band__intro">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="d-lg">Public wallets. Sealed choices. One verdict.</h2>
          <p className="muted">
            Vote from the Safe or Governor you already run — only the verdict ever goes public.
          </p>
        </div>

        <OrbitConstellation />

        <p className="band__more">
          The full mechanism, trust boundary, and integration guides live in the{' '}
          <a href={DOCS_URL}>documentation</a>.
        </p>
      </div>
    </section>
  )
}
