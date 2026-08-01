import { useQuery } from '@tanstack/react-query'
import { useChainId, usePublicClient } from 'wagmi'
import { noxAclAbi } from '../abi/noxAcl.ts'
import { profile, type Hex } from '../config/addresses.ts'
import { ZERO_HANDLE } from '../state/chain.ts'
import { aclKeys } from './keys.ts'

/**
 * Verification-center ACL facts, straight from NoxCompute: whether a handle
 * became publicly decryptable (only the expected verdict handle ever should)
 * and whether it stays readable by the core alone.
 */
export function useHandleAcl(handle: Hex | undefined, core: Hex) {
  const chainId = useChainId()
  const client = usePublicClient()
  const compute = profile.kind === 'unconfigured' ? undefined : profile.nox.computeAddress
  return useQuery({
    queryKey: aclKeys.handle(chainId, compute ?? '0x', handle ?? ZERO_HANDLE),
    enabled:
      client !== undefined &&
      compute !== undefined &&
      handle !== undefined &&
      handle !== ZERO_HANDLE,
    queryFn: async () => {
      if (!client || !compute || !handle) throw new Error('unreachable: query disabled')
      const [publiclyDecryptable, coreAllowed] = await Promise.all([
        client.readContract({
          address: compute,
          abi: noxAclAbi,
          functionName: 'isPubliclyDecryptable',
          args: [handle],
        }),
        client.readContract({
          address: compute,
          abi: noxAclAbi,
          functionName: 'isAllowed',
          args: [handle, core],
        }),
      ])
      return { publiclyDecryptable, coreAllowed }
    },
  })
}
