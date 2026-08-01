import { APP_URL, DOCS_URL, Pill } from '@noxvote/ui'

export function Cta() {
  return (
    <section className="cta">
      <div className="cta__panel on-ink">
        <h2 className="d-lg">Read the mechanism before you believe the claim.</h2>
        <div className="cta__actions">
          <Pill variant="on-ink" href={APP_URL} arrow>
            Launch the app
          </Pill>
          <Pill variant="on-ink-ghost" href={DOCS_URL}>
            Read the docs
          </Pill>
        </div>
        <p className="cta__note">
          Hosts: Safe 1.5.0 with MultiSendCallOnly &middot; OpenZeppelin Governor 5.6.1 with
          TimelockController
        </p>
      </div>
    </section>
  )
}
