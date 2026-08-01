import { APP_URL, Eyebrow, Pill } from '@noxvote/ui'

/* The orbit motif from the launch identity: concentric rings bleeding off the
 * top-right corner with a single ember satellite tracing the inner ring. The
 * headline, lead and CTAs hold the left half and never sit on an ember stroke. */
function OrbitField() {
  return (
    <svg
      className="stage__field"
      viewBox="0 0 1400 640"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="sealField" width="46" height="30" patternUnits="userSpaceOnUse">
          <rect x="0" y="12" width="26" height="7" rx="3.5" fill="var(--canvas)" opacity="0.05" />
          <rect x="32" y="12" width="10" height="7" rx="3.5" fill="var(--canvas)" opacity="0.03" />
        </pattern>
        <radialGradient id="emberGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ember)" stopOpacity="0.3" />
          <stop offset="55%" stopColor="var(--ember)" stopOpacity="0.07" />
          <stop offset="100%" stopColor="var(--ember)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1400" height="640" fill="url(#sealField)" />

      {/* soft ember bloom behind the ring */}
      <circle cx="1210" cy="118" r="360" fill="url(#emberGlow)" />

      {/* concentric orbit rings, clipped by the frame's rounded corner */}
      <g fill="none" stroke="var(--ember)">
        <circle cx="1210" cy="118" r="300" strokeWidth="1.6" opacity="0.42" />
        <circle cx="1210" cy="118" r="452" strokeWidth="1" opacity="0.16" />
      </g>

      {/* single ember satellite tracing the inner ring */}
      <g className="stage__satellite">
        <circle cx="910" cy="118" r="7" fill="var(--ember)" />
      </g>
    </svg>
  )
}

export function Hero() {
  return (
    <header className="stage" id="top">
      <div className="stage__frame on-ink">
        <OrbitField />
        <span className="stage__grain" aria-hidden="true" />
        <div className="stage__body">
          <Eyebrow className="stage__eyebrow">The privacy destination</Eyebrow>
          <h1 className="stage__title">Where private DAO lives.</h1>
          <p className="lead stage__lead">
            Confidential governance for existing Safe and OpenZeppelin Governor stacks. Individual
            choices and exact totals never become public &mdash; only the verdict is, and only when
            enough wallets took part.
          </p>
          <div className="stage__cta">
            <Pill variant="on-ink" href={APP_URL} arrow>
              Launch the app
            </Pill>
            <Pill variant="on-ink-ghost" href="#orbit">
              See how a ballot closes
            </Pill>
          </div>
          <p className="stage__evidence">Safe + Governor · Outcome-only verdicts · Live on Sepolia</p>
        </div>
      </div>
    </header>
  )
}
