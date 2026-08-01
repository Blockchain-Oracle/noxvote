import { fallback, http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import {
  activeChain,
  localNox,
  sepolia,
  sepoliaFallbackHttpUrl,
  sepoliaPrimaryHttpUrl,
} from './chains.ts'

/** Two archive-capable nodes; viem promotes the fallback on failure. Both
 * batch JSON-RPC calls so the read burst collapses into few HTTP POSTs. */
const sepoliaTransport = fallback([
  http(sepoliaPrimaryHttpUrl, { batch: true }),
  http(sepoliaFallbackHttpUrl, { batch: true }),
])

/** One injected EIP-1193 connector (SPEC R6): real signatures, real
 * transactions. The transport for the inactive chain still exists so wagmi can
 * report a connected wallet on the wrong network instead of erroring. */
export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [injected()],
  batch: { multicall: true },
  transports: {
    [sepolia.id]: sepoliaTransport,
    [localNox.id]: http(localNox.rpcUrls.default.http[0]),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
