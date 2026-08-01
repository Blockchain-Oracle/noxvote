import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { Mark } from '@noxvote/ui'
import { activeChain } from './config/chains.ts'
import { COPY } from './lib/copy.ts'
import { ProposalDetail } from './routes/ProposalDetail.tsx'
import { ProposalList } from './routes/ProposalList.tsx'

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

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <ProposalList /> },
      { path: 'b/:core/:ballotId', element: <ProposalDetail /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
