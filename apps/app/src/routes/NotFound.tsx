import { Link } from 'react-router'
import { Eyebrow } from '@noxvote/ui'

/** Off-orbit fallback for the client-side splat route. Never a dead end —
 * every exit routes back into a real surface. */
export function NotFound() {
  return (
    <section className="notfound">
      <Eyebrow>Error 404</Eyebrow>
      <h1 className="d-lg notfound__title">This page isn’t on the orbit.</h1>
      <p className="lead muted notfound__lead">
        The link may be broken, or the ballot has moved. Nothing on-chain is lost — here are the ways
        back in.
      </p>
      <div className="notfound__actions">
        <Link className="notfound__cta" to="/">
          Back to ballots<span aria-hidden="true">→</span>
        </Link>
        <Link className="notfound__ghost" to="/install">
          Install an adapter
        </Link>
        <Link className="notfound__ghost" to="/create">
          Author a proposal
        </Link>
      </div>
    </section>
  )
}
