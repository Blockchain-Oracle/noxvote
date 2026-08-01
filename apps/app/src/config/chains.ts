import { defineChain } from 'viem'
import { sepolia } from 'viem/chains'
import { profile } from './addresses.ts'

export { sepolia }

/**
 * The Sepolia read endpoints. Discovery, history, and execution all rely on
 * `eth_getLogs` over the deployment-to-latest range, so both endpoints are
 * chosen for that: keyless, CORS-enabled, archive-capable, and free of the
 * narrow-range caps that gate other public nodes (Alchemy's free tier limits
 * getLogs to 10 blocks; publicnode refuses archive ranges). A private
 * VITE_SEPOLIA_RPC_URL, when set, replaces the primary — point it at a paid
 * managed endpoint for production.
 */
export const sepoliaPrimaryHttpUrl = import.meta.env.VITE_SEPOLIA_RPC_URL ?? 'https://sepolia.drpc.org'
export const sepoliaFallbackHttpUrl = 'https://sepolia.gateway.tenderly.co'

/** The Docker-backed Hardhat + released Nox stack (integration-test parity). */
export const localNox = defineChain({
  id: profile.kind === 'local' ? profile.chainId : 31337,
  name: 'Local Nox stack',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [profile.kind === 'local' ? profile.rpcUrl : 'http://127.0.0.1:8545'],
    },
  },
})

export const activeChain = profile.kind === 'local' ? localNox : sepolia
