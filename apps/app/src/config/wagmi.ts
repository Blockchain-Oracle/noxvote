import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { activeChain, localNox, sepolia } from './chains.ts'

/** One injected EIP-1193 connector (SPEC R6): real signatures, real
 * transactions. The transport for the inactive chain still exists so wagmi can
 * report a connected wallet on the wrong network instead of erroring. */
export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
    [localNox.id]: http(localNox.rpcUrls.default.http[0]),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
