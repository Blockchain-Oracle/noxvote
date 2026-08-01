import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router'
import { Mark } from '@noxvote/ui'
import { activeChain } from './config/chains.ts'
import { COPY } from './lib/copy.ts'
import { Install } from './routes/Install.tsx'
import { ProposalDetail } from './routes/ProposalDetail.tsx'
import { ProposalList } from './routes/ProposalList.tsx'
import { VerificationCenter } from './routes/VerificationCenter.tsx'

function Shell() {
  return (
    <div className="shell">
      <header className="shell__header">
        <Mark href="/" />
        <nav className="shell__nav">
          <Link to="/install">Adapters</Link>
          <span className="shell__net mono">{activeChain.name}</span>
        </nav>
      </header>
      <main className="shell__main">
        <Outlet />
      </main>
      <footer className="shell__promise">{COPY.promise}</footer>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <ProposalList /> },
      { path: 'install', element: <Install /> },
      { path: 'b/:core/:ballotId', element: <ProposalDetail /> },
      { path: 'b/:core/:ballotId/verify', element: <VerificationCenter /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
