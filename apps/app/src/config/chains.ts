import { defineChain } from 'viem'
import { sepolia } from 'viem/chains'
import { profile } from './addresses.ts'

export { sepolia }

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
