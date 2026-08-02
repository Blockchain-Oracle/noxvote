import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router'
import { Mark } from '@noxvote/ui'
import { activeChain } from './config/chains.ts'
import { COPY } from './lib/copy.ts'
import { Create } from './routes/Create.tsx'
import { Install } from './routes/Install.tsx'
import { NotFound } from './routes/NotFound.tsx'
import { ProposalDetail } from './routes/ProposalDetail.tsx'
import { ProposalList } from './routes/ProposalList.tsx'
import { VerificationCenter } from './routes/VerificationCenter.tsx'

function Shell() {
  return (
    <div className="shell">
      <div className="shell__navbar">
        <header className="shell__header">
          <Mark href="/" />
          <nav className="shell__nav">
            <Link to="/create">Create</Link>
            <Link to="/install">Adapters</Link>
          </nav>
          <span className="shell__net mono">{activeChain.name}</span>
        </header>
      </div>
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
      { path: 'create', element: <Create /> },
      { path: 'install', element: <Install /> },
      { path: 'b/:core/:ballotId', element: <ProposalDetail /> },
      { path: 'b/:core/:ballotId/verify', element: <VerificationCenter /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
