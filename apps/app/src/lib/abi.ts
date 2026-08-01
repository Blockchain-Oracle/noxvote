import type { Abi } from 'viem'
import { getAddress } from 'viem'
import { activeChain } from '../config/chains.ts'

const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string | undefined

export type AbiResult = { abi: Abi; source: 'etherscan' | 'sourcify'; name?: string }

/**
 * Fetch a verified contract's ABI so the Create flow can offer a function
 * picker instead of raw calldata. Etherscan (one V2 key covers every chain) is
 * primary; Sourcify is the keyless fallback. Returns null when neither has a
 * verified source — the caller then falls back to pasting calldata.
 */
export async function fetchContractAbi(address: string): Promise<AbiResult | null> {
  const viaEtherscan = ETHERSCAN_KEY ? await fromEtherscan(address) : null
  if (viaEtherscan) return viaEtherscan
  return fromSourcify(address)
}

async function fromEtherscan(address: string): Promise<AbiResult | null> {
  try {
    const url = `https://api.etherscan.io/v2/api?chainid=${activeChain.id}&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as { status?: string; result?: Array<{ ABI?: string; ContractName?: string }> }
    const entry = Array.isArray(json.result) ? json.result[0] : undefined
    if (!entry?.ABI || entry.ABI === 'Contract source code not verified') return null
    return { abi: JSON.parse(entry.ABI) as Abi, source: 'etherscan', name: entry.ContractName || undefined }
  } catch {
    return null
  }
}

async function fromSourcify(address: string): Promise<AbiResult | null> {
  let checksummed: string
  try {
    checksummed = getAddress(address)
  } catch {
    return null
  }
  for (const match of ['full_match', 'partial_match']) {
    try {
      const url = `https://repo.sourcify.dev/contracts/${match}/${activeChain.id}/${checksummed}/metadata.json`
      const res = await fetch(url)
      if (!res.ok) continue
      const meta = (await res.json()) as { output?: { abi?: Abi } }
      if (meta.output?.abi) return { abi: meta.output.abi, source: 'sourcify' }
    } catch {
      /* try the next match tier */
    }
  }
  return null
}
