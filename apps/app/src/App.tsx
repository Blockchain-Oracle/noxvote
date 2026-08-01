import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { Mark } from '@noxvote/ui'
import { profile } from './config/addresses.ts'
import { activeChain } from './config/chains.ts'
import { COPY } from './lib/copy.ts'
import { truncateHex } from './lib/format.ts'

function Shell() {
  return (
    <div className="shell">
      <header className="shell__header">
        <Mark href="/" />
        <span className="shell__net mono">{activeChain.name}</span>
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
      <footer className="shell__promise">{COPY.promise}</footer>
    </div>
  )
}

/** Foundation home: the resolved chain profile, straight from the config
 * module — real addresses or nothing. Screen batches replace this with the
 * proposal list (B1). */
function ProfileSummary() {
  if (profile.kind === 'unconfigured') return null
  const rows: Array<[string, string]> =
    profile.kind === 'sepolia'
      ? [
          ['Network', `Ethereum Sepolia (${profile.chainId})`],
          ['Safe ballot core', profile.contracts.safeCore],
          ['Governor ballot core', profile.contracts.governorCore],
          ['Factory', profile.contracts.factory],
          ['Handle Gateway', profile.nox.gatewayUrl],
          ['Finalized live ballots', '2 (Safe + Governor, both Passed)'],
        ]
      : [
          ['Network', `Local Nox stack (${profile.chainId})`],
          ['Ballot core', profile.contracts.safeCore],
          ['Handle Gateway', profile.nox.gatewayUrl],
        ]
  return (
    <section>
      <h1 className="d-lg">Confidential ballots</h1>
      <p className="lead muted">
        Wired to real deployments only. The proposal list arrives with the next build batch; the
        addresses below already resolve from the live configuration.
      </p>
      <dl className="mono">
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 16, padding: '8px 0' }}>
            <dt style={{ minWidth: 200 }} className="muted">
              {label}
            </dt>
            <dd style={{ margin: 0 }}>{value.startsWith('0x') ? truncateHex(value, 8, 6) : value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [{ index: true, element: <ProfileSummary /> }],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
