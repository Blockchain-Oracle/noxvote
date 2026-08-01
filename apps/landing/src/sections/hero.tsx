import { APP_URL, Eyebrow, Pill } from '@noxvote/ui'

/* Arcs sweep the right half only; the headline, lead and CTAs occupy the
 * left and must never sit on top of an ember stroke. */
function SealField() {
  return (
    <svg
      className="stage__field"
      viewBox="0 0 1400 640"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="sealField" width="46" height="30" patternUnits="userSpaceOnUse">
          <rect x="0" y="12" width="26" height="7" rx="3.5" fill="#f3f0ee" opacity="0.075" />
          <rect x="32" y="12" width="10" height="7" rx="3.5" fill="#f3f0ee" opacity="0.042" />
        </pattern>
      </defs>
      <rect width="1400" height="640" fill="url(#sealField)" />
      <g fill="none" stroke="var(--ember)" strokeWidth="1.5" strokeLinecap="round" opacity="0.62">
        <path d="M 780 250 Q 1020 170 1230 262 T 1460 214" />
        <path d="M 842 432 Q 1082 352 1282 442 T 1460 396" />
      </g>
      <circle cx="1230" cy="262" r="5.5" fill="var(--ember)" opacity="0.9" />
      <circle cx="1282" cy="442" r="4.5" fill="var(--ember)" opacity="0.9" />
    </svg>
  )
}

export function Hero() {
  return (
    <header className="stage" id="top">
      <div className="stage__frame on-ink">
        <SealField />
        <div className="stage__body">
          <Eyebrow className="stage__eyebrow">Confidential governance module</Eyebrow>
          <h1 className="d-xl">Your wallet and participation are public; your choice is private.</h1>
          <p className="lead stage__lead">
            A host-neutral confidential ballot core for Safe and OpenZeppelin Governor. Individual
            choices and exact totals never become public. Only the verdict is published &mdash; and
            only when enough wallets took part.
          </p>
          <div className="stage__cta">
            <Pill variant="on-ink" href={APP_URL} arrow>
              Launch the app
            </Pill>
            <Pill variant="on-ink-ghost" href="#orbit">
              See how a ballot closes
            </Pill>
          </div>
          <p className="stage__status">
            Runs on Safe 1.5.0 and OpenZeppelin Governor 5.6.1 through the released Nox stack.
          </p>
        </div>
      </div>
    </header>
  )
}
