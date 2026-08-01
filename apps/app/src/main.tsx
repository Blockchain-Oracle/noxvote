import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import './app.css'
import App from './App.tsx'
import { profile } from './config/addresses.ts'
import { wagmiConfig } from './config/wagmi.ts'
import { EmptyState } from './components/QueryBoundary.tsx'

const queryClient = new QueryClient()

/** No checkpoint and no local stack → the honest unconfigured state, before
 * any provider mounts. Never invented addresses (SPEC R6). */
function Root() {
  if (profile.kind === 'unconfigured') {
    return (
      <div className="shell">
        <main className="shell__main">
          <EmptyState title="Local stack not configured" body={profile.reason} />
        </main>
      </div>
    )
  }
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
