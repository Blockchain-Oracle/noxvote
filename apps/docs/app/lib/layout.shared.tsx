import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

const APP_URL = 'https://app.noxvote.xyz'
const LANDING_URL = 'https://noxvote.xyz'

function OrbitMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden style={{ flex: 'none' }}>
      <circle cx="11" cy="13" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18.8" cy="6.2" r="3.1" fill="#c04a1e" />
    </svg>
  )
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <OrbitMark />
          <span style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>NoxVote</span>
        </>
      ),
    },
    links: [
      { text: 'Launch app', url: APP_URL, external: true },
      { text: 'noxvote.xyz', url: LANDING_URL, external: true },
    ],
    themeSwitch: { enabled: false },
  }
}
