import { useQuery } from '@tanstack/react-query'
import { parseAbi } from 'viem'
import { useChainId, usePublicClient } from 'wagmi'
import { confidentialGovernorAbi } from '../abi/confidentialGovernor.ts'
import { safeModuleAbi } from '../abi/safeConfidentialVotingModule.ts'
import { profile, type Hex } from '../config/addresses.ts'

/** The reads the install surfaces need from a Safe 1.5.0 proxy. */
const safeAbi = parseAbi([
  'function isModuleEnabled(address module) view returns (bool)',
  'function getThreshold() view returns (uint256)',
  'function getOwners() view returns (address[])',
])

export type SafeInstall = {
  kind: 'safe'
  module: Hex
  safe: Hex
  core: Hex
  moduleEnabled: boolean
  threshold: number
  ownerCount: number
  /** The Safe the module is immutably bound to, read from the module itself. */
  boundSafe: Hex
  /** True when the module's bound Safe matches the Safe under review. */
  bindingConsistent: boolean
}

export type GovernorInstall = {
  kind: 'governor'
  governor: Hex
  core: Hex
  timelock: Hex
  token: Hex
  version: string
  clockMode: string
}

/** The deployed Safe host's install facts, read only. `moduleEnabled` false
 * with a consistent binding is the "removed/disabled" verification state. */
export function useSafeInstall() {
  const chainId = useChainId()
  const client = usePublicClient()
  const enabled = client !== undefined && profile.kind !== 'unconfigured' && hasSafe()
  return useQuery({
    queryKey: ['install-safe', chainId],
    enabled,
    queryFn: async (): Promise<SafeInstall> => {
      if (!client || profile.kind === 'unconfigured') throw new Error('unreachable')
      const module = profile.contracts.safeModule as Hex
      const safe = profile.contracts.safe as Hex
      const [moduleEnabled, threshold, owners, boundSafe, core] = await Promise.all([
        client.readContract({ address: safe, abi: safeAbi, functionName: 'isModuleEnabled', args: [module] }),
        client.readContract({ address: safe, abi: safeAbi, functionName: 'getThreshold' }),
        client.readContract({ address: safe, abi: safeAbi, functionName: 'getOwners' }),
        client.readContract({ address: module, abi: safeModuleAbi, functionName: 'safe' }),
        client.readContract({ address: module, abi: safeModuleAbi, functionName: 'confidentialCore' }),
      ])
      return {
        kind: 'safe',
        module,
        safe,
        core,
        moduleEnabled,
        threshold: Number(threshold),
        ownerCount: owners.length,
        boundSafe,
        bindingConsistent: boundSafe.toLowerCase() === safe.toLowerCase(),
      }
    },
  })
}

export function useGovernorInstall() {
  const chainId = useChainId()
  const client = usePublicClient()
  const enabled = client !== undefined && profile.kind !== 'unconfigured' && hasGovernor()
  return useQuery({
    queryKey: ['install-governor', chainId],
    enabled,
    queryFn: async (): Promise<GovernorInstall> => {
      if (!client || profile.kind === 'unconfigured') throw new Error('unreachable')
      const governor = profile.contracts.governor as Hex
      const [core, timelock, token, version, clockMode] = await Promise.all([
        client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'confidentialCore' }),
        client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'timelock' }),
        client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'token' }),
        client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'version' }),
        client.readContract({ address: governor, abi: confidentialGovernorAbi, functionName: 'confidentialClockMode' }),
      ])
      return { kind: 'governor', governor, core, timelock, token, version, clockMode }
    },
  })
}

function hasSafe(): boolean {
  return profile.kind !== 'unconfigured' && Boolean(profile.contracts.safe && profile.contracts.safeModule)
}

function hasGovernor(): boolean {
  return profile.kind === 'sepolia' && Boolean(profile.contracts.governor)
}

export { hasSafe, hasGovernor }
