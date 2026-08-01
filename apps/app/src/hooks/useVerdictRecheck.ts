import { useQuery } from '@tanstack/react-query'
import { useAccount, useWalletClient } from 'wagmi'
import { profile, type Hex } from '../config/addresses.ts'
import { createHandleClient } from '../lib/handle.ts'

export type VerdictRecheck =
  | { status: 'needs-wallet' }
  | { status: 'checking' }
  | { status: 'ready'; value: boolean }
  | { status: 'unavailable'; reason: string }

/**
 * Indexed enrichment: re-fetch the Gateway's public-decryption evidence for
 * a finalized verdict handle. When the indexer/Gateway path is down this is
 * honestly unavailable — the on-chain facts stay authoritative (the
 * partial-indexer state, exercised for real).
 */
export function useVerdictRecheck(handle: Hex | undefined, enabled: boolean): VerdictRecheck {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const canQuery =
    enabled &&
    handle !== undefined &&
    walletClient !== undefined &&
    address !== undefined &&
    profile.kind !== 'unconfigured'

  const query = useQuery({
    queryKey: ['verdict-recheck', handle],
    enabled: canQuery,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      if (!walletClient || !address || !handle || profile.kind === 'unconfigured') {
        throw new Error('unreachable: query disabled')
      }
      const client = await createHandleClient(walletClient, address, profile.nox)
      const decrypted = await client.publicDecrypt(handle)
      return Boolean(decrypted.value)
    },
  })

  if (!enabled || handle === undefined) return { status: 'unavailable', reason: 'No finalized verdict handle.' }
  if (!canQuery) return { status: 'needs-wallet' }
  if (query.isPending) return { status: 'checking' }
  if (query.isError) {
    return {
      status: 'unavailable',
      reason: 'The Gateway/indexer evidence could not be fetched. On-chain facts above remain authoritative.',
    }
  }
  return { status: 'ready', value: query.data }
}
