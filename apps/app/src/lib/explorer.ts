import { activeChain } from '../config/chains.ts'

/**
 * The active chain's block explorer, read from viem's own chain metadata (never
 * hardcoded). Sepolia carries Etherscan; the local Nox chain carries none, so
 * every builder returns `undefined` there and callers fall back to copy.
 */
const explorer = (
  activeChain as { blockExplorers?: { default?: { name: string; url: string } } }
).blockExplorers?.default

export const explorerName = explorer?.name

export function txUrl(hash: string): string | undefined {
  return explorer ? `${explorer.url}/tx/${hash}` : undefined
}

export function addressUrl(address: string): string | undefined {
  return explorer ? `${explorer.url}/address/${address}` : undefined
}
